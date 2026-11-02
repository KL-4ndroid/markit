-- ISOLATED ONLY. Install after engine + operational. Never a production migration.
BEGIN;
DO $$BEGIN IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'Disposable DB required';END IF;END$$;
CREATE SCHEMA deletion_upload_private;
REVOKE ALL ON SCHEMA deletion_upload_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE deletion_upload_private.attempts(
 id uuid PRIMARY KEY,token_hash text NOT NULL,actor_id uuid,owner_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'open' CHECK(state IN('open','settled','uncertain')),
 deadline timestamptz NOT NULL DEFAULT clock_timestamp()+interval '5 minutes',
 kind text CHECK(kind IN('product','sale')),entity_id uuid,keys text[] NOT NULL DEFAULT '{}',write_keys text[] NOT NULL DEFAULT '{}',
 issued_keys text[] NOT NULL DEFAULT '{}',claim_hash text,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON deletion_upload_private.attempts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION deletion_upload_private.lock_pair(a uuid,b uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE x uuid;BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'upload_barrier_requires_read_committed' USING ERRCODE='40001';END IF;
 FOR x IN SELECT DISTINCT v FROM unnest(ARRAY[a,b])v WHERE v IS NOT NULL ORDER BY v LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended('deletion-upload:'||x::text,0));
 END LOOP;
END$$;
CREATE FUNCTION deletion_upload_private.claim_hash(kind text,r jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT encode(extensions.digest(jsonb_build_array(kind,r->'id',r->'owner_id',r->'product_id',r->'status',r->'pending_photo_id',r->'pending_version',r->'version',r->'upload_attempt_id',r->'upload_lease_expires_at')::text,'sha256'),'hex');
$$;
CREATE FUNCTION deletion_upload_private.key_owned(k text,owner uuid) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT k IS NOT NULL AND length(k)<=1024 AND k !~ '[[:space:]%?#\\]' AND position('..' IN k)=0 AND position('//' IN k)=0
 AND (k ~ ('^product-cover-photos/'||owner::text||'/[a-f0-9-]{36}/[a-f0-9-]{36}/v[1-9][0-9]*/(display|thumbnail)\.(webp|jpg|jpeg)$')
 OR k ~ ('^sales-evidence(-thumbs)?/7d/'||owner::text||'/[A-Za-z0-9_./-]+\.(webp|jpg|jpeg)$'));
$$;
CREATE FUNCTION public.bff_begin_deletion_upload(p_id uuid,p_token uuid,p_actor uuid,p_owner uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN
 IF p_id IS NULL OR p_token IS NULL OR p_actor IS NULL OR p_owner IS NULL THEN RAISE EXCEPTION 'upload_identity_required' USING ERRCODE='22023';END IF;
 PERFORM deletion_upload_private.lock_pair(p_actor,p_owner);
 IF NOT deletion_engine_private.actor_enabled(p_actor) OR NOT deletion_engine_private.actor_enabled(p_owner) THEN RAISE EXCEPTION 'upload_actor_frozen' USING ERRCODE='55000';END IF;
 INSERT INTO deletion_upload_private.attempts(id,token_hash,actor_id,owner_id) VALUES(p_id,encode(extensions.digest(p_token::text,'sha256'),'hex'),p_actor,p_owner);
END$$;
CREATE FUNCTION public.bff_bind_deletion_upload(p_id uuid,p_token uuid,p_kind text,p_entity uuid,p_keys text[],p_write_keys text[],p_expected jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;r jsonb;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,'sha256'),'hex') OR a.state<>'open' OR a.kind IS NOT NULL
  THEN RAISE EXCEPTION 'upload_attempt_conflict' USING ERRCODE='55000';END IF;
 IF p_kind NOT IN('product','sale') OR p_kind IS NULL OR p_expected IS NULL OR jsonb_typeof(p_expected)<>'object'
  OR (p_kind='product' AND (p_expected->>'photoId' IS NULL OR p_expected->>'version' IS NULL))
  OR (p_kind='sale' AND p_expected->>'attemptId' IS NULL)
  OR coalesce(cardinality(p_keys),0) NOT BETWEEN 1 AND 8
  OR coalesce(cardinality(p_write_keys),0)<>2 OR NOT p_write_keys<@p_keys
  OR EXISTS(SELECT 1 FROM unnest(p_keys)k WHERE NOT deletion_upload_private.key_owned(k,a.owner_id))
  THEN RAISE EXCEPTION 'upload_key_scope' USING ERRCODE='22023';END IF;
 IF p_kind='product' THEN
  SELECT to_jsonb(p) INTO r FROM public.product_cover_photos p WHERE product_id=p_entity AND owner_id=a.owner_id AND deleted_at IS NULL;
  IF r IS NULL OR coalesce(r->>'pending_photo_id',r->>'id') IS DISTINCT FROM p_expected->>'photoId'
   OR coalesce(r->>'pending_version',r->>'version') IS DISTINCT FROM p_expected->>'version' THEN RAISE EXCEPTION 'upload_claim_mismatch' USING ERRCODE='55000';END IF;
 ELSE
  SELECT to_jsonb(p) INTO r FROM public.sale_photo_evidence p WHERE id=p_entity AND owner_id=a.owner_id;
  IF r IS NULL OR r->>'upload_attempt_id' IS DISTINCT FROM p_expected->>'attemptId' THEN RAISE EXCEPTION 'upload_claim_mismatch' USING ERRCODE='55000';END IF;
 END IF;
 IF r->>'upload_lease_expires_at' IS NULL THEN RAISE EXCEPTION 'upload_claim_lease_required' USING ERRCODE='55000';END IF;
 UPDATE deletion_upload_private.attempts SET kind=p_kind,entity_id=p_entity,keys=p_keys,write_keys=p_write_keys,claim_hash=deletion_upload_private.claim_hash(p_kind,r) WHERE id=p_id;
END$$;
CREATE FUNCTION public.bff_authorize_deletion_upload(p_id uuid,p_token uuid,p_key text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,'sha256'),'hex') OR a.state<>'open' OR a.kind IS NULL
  OR a.deadline<=clock_timestamp() OR NOT deletion_engine_private.actor_enabled(a.actor_id) OR NOT deletion_engine_private.actor_enabled(a.owner_id)
  THEN RAISE EXCEPTION 'upload_write_fenced' USING ERRCODE='55000';END IF;
 IF p_key IS NOT NULL THEN
  IF NOT p_key=ANY(a.write_keys) OR p_key=ANY(a.issued_keys) THEN RAISE EXCEPTION 'upload_ticket_conflict' USING ERRCODE='55000';END IF;
  IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts other WHERE other.id<>p_id AND other.state<>'settled' AND p_key=ANY(other.write_keys))
   THEN RAISE EXCEPTION 'upload_key_busy' USING ERRCODE='55P03';END IF;
  UPDATE deletion_upload_private.attempts SET issued_keys=array_append(issued_keys,p_key) WHERE id=p_id;
 END IF;
END$$;
CREATE FUNCTION public.bff_finish_deletion_upload(p_id uuid,p_token uuid,p_state text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,'sha256'),'hex') OR p_state NOT IN('settled','uncertain') OR p_state IS NULL
  OR (a.state<>'open' AND a.state<>p_state) THEN RAISE EXCEPTION 'upload_finish_conflict' USING ERRCODE='55000';END IF;
 UPDATE deletion_upload_private.attempts SET state=p_state WHERE id=p_id;
END$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.upload_tracking_enabled() RETURNS boolean LANGUAGE sql SET search_path='' AS $$SELECT true$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.lock_upload_actor(actor uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$SELECT deletion_upload_private.lock_pair(actor,actor)$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.assert_uploads_quiescent(actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE r record;h text;BEGIN
 IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts WHERE (actor_id=actor OR owner_id=actor) AND (state='uncertain' OR (state='open' AND deadline<=clock_timestamp())))
  THEN RAISE EXCEPTION 'upload_outcome_requires_review' USING ERRCODE='55000';END IF;
 IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts WHERE (actor_id=actor OR owner_id=actor) AND state='open')
  THEN RAISE EXCEPTION 'uploads_still_open' USING ERRCODE='55P03';END IF;
 -- An untracked product lease cannot safely be attributed to a staff member.
 -- Conservatively hold rather than guessing that an expired legacy lease stopped I/O.
 FOR r IN SELECT 'product'::text k,to_jsonb(p) j FROM public.product_cover_photos p WHERE upload_lease_expires_at IS NOT NULL OR status='uploading'
  UNION ALL SELECT 'sale',to_jsonb(p) FROM public.sale_photo_evidence p WHERE upload_lease_expires_at IS NOT NULL OR status='uploading' LOOP
  h:=deletion_upload_private.claim_hash(r.k,r.j);
  IF NOT EXISTS(SELECT 1 FROM deletion_upload_private.attempts a WHERE a.kind=r.k AND a.claim_hash=h) THEN
   IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts a WHERE a.owner_id=(r.j->>'owner_id')::uuid AND a.kind IS NULL AND a.state='open' AND a.deadline>clock_timestamp())
    THEN RAISE EXCEPTION 'upload_binding_pending' USING ERRCODE='55P03';END IF;
   RAISE EXCEPTION 'legacy_upload_requires_review' USING ERRCODE='55000';
  END IF;
 END LOOP;
END$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.extra_upload_keys(actor uuid) RETURNS TABLE(object_key text)
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$SELECT DISTINCT unnest(keys) FROM deletion_upload_private.attempts WHERE owner_id=actor$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.detach_upload_actor(actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$BEGIN
 PERFORM deletion_engine_private.assert_uploads_quiescent(actor);
 DELETE FROM deletion_upload_private.attempts WHERE owner_id=actor;
 UPDATE deletion_upload_private.attempts SET actor_id=NULL WHERE actor_id=actor;
END$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA deletion_upload_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_begin_deletion_upload(uuid,uuid,uuid,uuid),public.bff_bind_deletion_upload(uuid,uuid,text,uuid,text[],text[],jsonb),
 public.bff_authorize_deletion_upload(uuid,uuid,text),public.bff_finish_deletion_upload(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_begin_deletion_upload(uuid,uuid,uuid,uuid),public.bff_bind_deletion_upload(uuid,uuid,text,uuid,text[],text[],jsonb),
 public.bff_authorize_deletion_upload(uuid,uuid,text),public.bff_finish_deletion_upload(uuid,uuid,text) TO service_role;
ROLLBACK;
