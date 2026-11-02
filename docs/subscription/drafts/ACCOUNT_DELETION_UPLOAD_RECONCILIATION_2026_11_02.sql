-- ISOLATED ONLY. Install after upload barrier, before access manifest capture.
-- No production drain attestor exists. This is NOT a production migration.
BEGIN;
DO $$BEGIN IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'Disposable DB required';END IF;END$$;
CREATE TABLE deletion_upload_private.reviews(
 attempt_id uuid PRIMARY KEY REFERENCES deletion_upload_private.attempts(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id),
 input_hash text NOT NULL,source_hash text NOT NULL,drain_hash text NOT NULL,reviewer_hash text NOT NULL,
 observation_hash text NOT NULL,present_count integer NOT NULL,absent_count integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON deletion_upload_private.reviews FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION deletion_upload_private.review_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$BEGIN
 RAISE EXCEPTION 'upload_review_immutable' USING ERRCODE='55000';
END$$;
CREATE TRIGGER upload_review_immutable BEFORE UPDATE ON deletion_upload_private.reviews FOR EACH ROW EXECUTE FUNCTION deletion_upload_private.review_immutable();
-- Prior fixture-only mode. The terminal-PUT installation replaces this hook with
-- receipt validation; production must never install this no-op as a drain attestor.
CREATE FUNCTION deletion_upload_private.validate_drain_evidence(a uuid,s text,h text) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$BEGIN RETURN;END$$;
REVOKE ALL ON FUNCTION deletion_upload_private.validate_drain_evidence(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.bff_reconcile_deletion_upload(p_request uuid,p_token text,p_id uuid,p_action text,p_evidence jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.account_deletion_requests%ROWTYPE;a deletion_upload_private.attempts%ROWTYPE;
 saved deletion_upload_private.reviews%ROWTYPE;m jsonb;source text;input_hash text;obs jsonb;item jsonb;seen text[]:='{}';
 present_n integer:=0;absent_n integer:=0;frozen_request uuid;wanted text[];
BEGIN
 IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'upload_review_local_only' USING ERRCODE='55000';END IF;
 SELECT * INTO r FROM public.account_deletion_requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND OR r.status<>'processing' OR r.active_actor_id IS NULL OR r.identity_confirmed_at IS NULL OR r.preflight_resolution IS NULL
  OR r.lease_expires_at IS NULL OR r.lease_expires_at<=clock_timestamp() OR r.lease_expires_at>clock_timestamp()+interval '5 minutes'
  OR r.lease_token_hash IS DISTINCT FROM encode(extensions.digest(p_token,'sha256'),'hex')
  THEN RAISE EXCEPTION 'upload_review_lease_lost' USING ERRCODE='55000';END IF;
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 IF NOT FOUND OR r.active_actor_id NOT IN(a.actor_id,a.owner_id) OR a.actor_id IS NULL
  THEN RAISE EXCEPTION 'upload_review_scope' USING ERRCODE='55000';END IF;
 -- Same request -> sorted actor/owner -> attempt lock order as the engine.
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.actor_id IS NULL OR r.active_actor_id NOT IN(a.actor_id,a.owner_id)
  THEN RAISE EXCEPTION 'upload_review_scope' USING ERRCODE='55000';END IF;
 IF r.lease_expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'upload_review_lease_lost' USING ERRCODE='55000';END IF;
 SELECT request_id INTO frozen_request FROM deletion_engine_private.frozen
  WHERE actor_hash=encode(extensions.digest(r.active_actor_id::text,'sha256'),'hex');
 IF frozen_request IS DISTINCT FROM p_request THEN RAISE EXCEPTION 'upload_review_not_frozen' USING ERRCODE='55000';END IF;
 PERFORM deletion_engine_private.assert_catalog();
 IF p_action IS NULL OR p_action NOT IN('inspect','commit') THEN RAISE EXCEPTION 'upload_review_action' USING ERRCODE='22023';END IF;
 input_hash:=encode(extensions.digest(p_evidence::text,'sha256'),'hex');
 SELECT * INTO saved FROM deletion_upload_private.reviews WHERE attempt_id=p_id;
 IF FOUND THEN
  IF saved.request_id<>p_request OR (p_action='commit' AND saved.input_hash IS DISTINCT FROM input_hash)
   THEN RAISE EXCEPTION 'upload_review_replay_conflict' USING ERRCODE='55000';END IF;
  RETURN jsonb_build_object('outcome','reconciled','evidenceHash',saved.input_hash);
 END IF;
 -- Only recover at the first blocked post-freeze step, never after cleanup advances.
 IF NOT EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE request_id=p_request AND step_code='access_frozen' AND status='completed')
  OR NOT EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE request_id=p_request AND step_code='staff_access_revoked' AND status='completed')
  OR EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE request_id=p_request AND status='completed' AND step_code NOT IN('access_frozen','staff_access_revoked'))
  THEN RAISE EXCEPTION 'upload_review_step_order' USING ERRCODE='55000';END IF;
 IF a.kind IS NULL OR a.entity_id IS NULL OR a.claim_hash IS NULL OR cardinality(a.keys) NOT BETWEEN 1 AND 8
  OR EXISTS(SELECT 1 FROM unnest(a.keys)k WHERE NOT deletion_upload_private.key_owned(k,a.owner_id))
  THEN RAISE EXCEPTION 'upload_review_unbound_or_legacy' USING ERRCODE='55000';END IF;
 -- Existing replay bindings may repeat the current keys as previous keys.
 -- Inspect each exact key once without rewriting the original ledger/source hash.
 SELECT array_agg(k ORDER BY k) INTO wanted FROM (SELECT DISTINCT unnest(a.keys)k)s;
 IF a.state NOT IN('open','uncertain') OR (a.state='open' AND a.deadline>clock_timestamp())
  THEN RAISE EXCEPTION 'upload_review_not_required_or_inflight' USING ERRCODE='55P03';END IF;
 IF a.kind='product' THEN
  SELECT to_jsonb(p) INTO m FROM public.product_cover_photos p WHERE product_id=a.entity_id AND owner_id=a.owner_id AND deleted_at IS NULL FOR UPDATE;
 ELSE
  SELECT to_jsonb(p) INTO m FROM public.sale_photo_evidence p WHERE id=a.entity_id AND owner_id=a.owner_id FOR UPDATE;
 END IF;
 -- Original pending claim, terminal metadata with scoped keys, or absent metadata only.
 -- A newer/different pending claim must be separately reviewed; never rewrite it.
 IF m IS NOT NULL AND deletion_upload_private.claim_hash(a.kind,m) IS DISTINCT FROM a.claim_hash THEN
  IF coalesce(m->>'status','') NOT IN('uploaded','upload_failed') OR m->>'upload_lease_expires_at' IS NOT NULL
   OR (a.kind='product' AND (m->>'pending_photo_id' IS NOT NULL OR m->>'pending_version' IS NOT NULL))
   THEN RAISE EXCEPTION 'upload_review_metadata_changed_claim' USING ERRCODE='55000';END IF;
  IF EXISTS(SELECT 1 FROM unnest(CASE a.kind WHEN 'product' THEN ARRAY[m->>'display_object_key',m->>'thumbnail_object_key']
     ELSE ARRAY[m->>'r2_object_key',m->>'r2_thumbnail_key'] END)k
    WHERE (k IS NULL AND m->>'status'='uploaded') OR (k IS NOT NULL AND NOT k=ANY(a.keys)))
   THEN RAISE EXCEPTION 'upload_review_metadata_key_scope' USING ERRCODE='55000';END IF;
 END IF;
 source:=encode(extensions.digest(jsonb_build_array(to_jsonb(a)-'token_hash',m)::text,'sha256'),'hex');
 IF p_action='inspect' THEN RETURN jsonb_build_object('outcome','review_required','attemptId',a.id,'actorId',a.actor_id,'ownerId',a.owner_id,
  'sourceHash',source,'keys',to_jsonb(wanted),'issuedKeys',to_jsonb(a.issued_keys));END IF;
 IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>'object' OR p_evidence->>'sourceHash' IS DISTINCT FROM source
  OR coalesce(p_evidence->>'drainHash','') !~ '^[a-f0-9]{64}$' OR coalesce(p_evidence->>'reviewerHash','') !~ '^[a-f0-9]{64}$'
  OR p_evidence->>'expiresAt' IS NULL OR (p_evidence->>'expiresAt')::timestamptz<=clock_timestamp()
  OR (p_evidence->>'expiresAt')::timestamptz>clock_timestamp()+interval '2 minutes'
  OR coalesce(jsonb_typeof(p_evidence->'observations'),'')<>'array'
  THEN RAISE EXCEPTION 'upload_review_evidence_stale' USING ERRCODE='55000';END IF;
 obs:=p_evidence->'observations';
 IF jsonb_array_length(obs)<>cardinality(wanted) THEN RAISE EXCEPTION 'upload_review_keys_incomplete' USING ERRCODE='22023';END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(obs) LOOP
  IF coalesce(jsonb_typeof(item),'')<>'object' OR item->>'key' IS NULL OR NOT (item->>'key')=ANY(a.keys)
   OR (item->>'key')=ANY(seen) OR item->>'state' IS NULL OR item->>'state' NOT IN('present','absent')
   THEN RAISE EXCEPTION 'upload_review_observation_invalid' USING ERRCODE='22023';END IF;
  seen:=array_append(seen,item->>'key');
  IF item->>'state'='present' THEN present_n:=present_n+1;ELSE absent_n:=absent_n+1;END IF;
 END LOOP;
 IF r.lease_expires_at<=clock_timestamp() OR (p_evidence->>'expiresAt')::timestamptz<=clock_timestamp()
  THEN RAISE EXCEPTION 'upload_review_evidence_expired_while_waiting' USING ERRCODE='55000';END IF;
 PERFORM deletion_upload_private.validate_drain_evidence(p_id,source,p_evidence->>'drainHash');
 -- No object/metadata writes. Preserve every registered key for the normal manifest.
 INSERT INTO deletion_upload_private.reviews(attempt_id,request_id,input_hash,source_hash,drain_hash,reviewer_hash,observation_hash,present_count,absent_count)
 VALUES(p_id,p_request,input_hash,source,p_evidence->>'drainHash',p_evidence->>'reviewerHash',encode(extensions.digest(obs::text,'sha256'),'hex'),present_n,absent_n);
 UPDATE deletion_upload_private.attempts SET state='settled' WHERE id=p_id;
 RETURN jsonb_build_object('outcome','reconciled','evidenceHash',input_hash);
END$$;
REVOKE ALL ON FUNCTION deletion_upload_private.review_immutable() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_reconcile_deletion_upload(uuid,text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_reconcile_deletion_upload(uuid,text,uuid,text,jsonb) TO service_role;
ROLLBACK;
