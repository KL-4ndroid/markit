-- ISOLATED ADAPTER ONLY. Not a production migration. Explicit ROLLBACK.
BEGIN;
DO $$ BEGIN
  IF current_database() <> 'deletion_engine_test' THEN
    RAISE EXCEPTION 'Disposable deletion_engine_test database required';
  END IF;
END $$;
CREATE SCHEMA deletion_engine_private;
REVOKE ALL ON SCHEMA deletion_engine_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE deletion_engine_private.frozen (
  actor_hash text PRIMARY KEY, request_id uuid NOT NULL,
  purge_after timestamptz NOT NULL DEFAULT clock_timestamp()+interval '180 days'
);
CREATE TABLE deletion_engine_private.objects (
  request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id),
  object_key text NOT NULL, deleted boolean NOT NULL DEFAULT false, absent boolean NOT NULL DEFAULT false,
  PRIMARY KEY(request_id,object_key)
);
CREATE TABLE deletion_engine_private.receipts (
  request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id), step text NOT NULL,
  affected_count integer NOT NULL, evidence_hash text NOT NULL,
  PRIMARY KEY(request_id,step)
);
REVOKE ALL ON ALL TABLES IN SCHEMA deletion_engine_private FROM PUBLIC, anon, authenticated, service_role;

-- Literal contract: never learn an arbitrary deployed schema and silently approve it.
CREATE FUNCTION deletion_engine_private.assert_catalog() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE bad boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','m','v','f')
      AND c.relname NOT IN ('profiles','markets','products','events','staff_relationships',
        'staff_invitations','market_members','user_settings','subscription_accounts',
        'product_cover_photos','sale_photo_evidence','account_deletion_requests',
        'account_deletion_cleanup_steps','account_deletion_transition_audit')
  ) INTO bad;
  IF bad THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='engine_unreviewed_table'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM (VALUES
      ('profiles','display_name,email,id'), ('markets','id,name,owner_id'),
      ('products','id,name,owner_id'), ('events','actor_id,id,market_id,metadata,payload'),
      ('staff_relationships','id,owner_id,staff_email,staff_id,status'),
      ('staff_invitations','id,owner_id,token'), ('market_members','market_id,user_id'),
      ('user_settings','settings,user_id'), ('subscription_accounts','billing_status,owner_id,plan_code'),
      ('product_cover_photos','display_object_key,id,owner_id,thumbnail_object_key'),
      ('sale_photo_evidence','captured_by_staff_id,id,owner_id,r2_object_key,r2_thumbnail_key')
    ) AS expected(t,cols)
    WHERE expected.cols IS DISTINCT FROM (
      SELECT string_agg(a.attname,',' ORDER BY a.attname)
      FROM pg_catalog.pg_attribute a WHERE a.attrelid=pg_catalog.to_regclass('public.'||expected.t)
        AND a.attnum>0 AND NOT a.attisdropped
    )
  ) INTO bad;
  IF bad THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='engine_unreviewed_columns'; END IF;
END $$;

CREATE FUNCTION deletion_engine_private.actor_enabled(actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM deletion_engine_private.frozen f
    WHERE f.actor_hash=encode(extensions.digest(actor::text,'sha256'),'hex'));
$$;
CREATE FUNCTION deletion_engine_private.record_enabled(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM deletion_engine_private.frozen f
    WHERE f.actor_hash IN (
      encode(extensions.digest(r->>'owner_id','sha256'),'hex'),
      encode(extensions.digest(r->>'user_id','sha256'),'hex'),
      encode(extensions.digest(r->>'staff_id','sha256'),'hex'),
      encode(extensions.digest(r->>'actor_id','sha256'),'hex'),
      encode(extensions.digest(r->>'id','sha256'),'hex')))
    AND NOT EXISTS (SELECT 1 FROM public.markets m JOIN deletion_engine_private.frozen f
      ON f.actor_hash=encode(extensions.digest(m.owner_id::text,'sha256'),'hex')
      WHERE m.id::text=r->>'market_id');
$$;
-- This helper grants only a boolean; private rows remain inaccessible.
GRANT USAGE ON SCHEMA deletion_engine_private TO authenticated;
REVOKE ALL ON FUNCTION deletion_engine_private.actor_enabled(uuid), deletion_engine_private.record_enabled(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deletion_engine_private.actor_enabled(uuid), deletion_engine_private.record_enabled(jsonb) TO authenticated;

CREATE FUNCTION deletion_engine_private.write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE valid_worker boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.account_deletion_requests r
    WHERE r.id::text=current_setting('deletion_engine.request',true) AND r.status='processing'
      AND r.lease_token_hash=encode(extensions.digest(current_setting('deletion_engine.lease',true),'sha256'),'hex')
      AND r.lease_expires_at>clock_timestamp()) INTO valid_worker;
  IF NOT valid_worker AND (
    NOT deletion_engine_private.actor_enabled(auth.uid())
    OR (TG_OP<>'INSERT' AND NOT deletion_engine_private.record_enabled(to_jsonb(OLD)))
    OR (TG_OP<>'DELETE' AND NOT deletion_engine_private.record_enabled(to_jsonb(NEW)))
  ) THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='engine_access_frozen'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','markets','products','events','staff_relationships','staff_invitations',
    'market_members','user_settings','subscription_accounts','product_cover_photos','sale_photo_evidence'] LOOP
    EXECUTE format('CREATE TRIGGER deletion_engine_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION deletion_engine_private.write_fence()',t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY deletion_engine_read_fence ON public.%I AS RESTRICTIVE TO authenticated USING (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I))) WITH CHECK (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I)))',t,t,t);
  END LOOP;
END $$;

-- Known structured attribution. UUID/email occurrences in strings are removed recursively;
-- this is not a claim that arbitrary free text can be universally anonymized.
CREATE FUNCTION deletion_engine_private.redact(v jsonb, actor text, email text, name text) RETURNS jsonb
LANGUAGE plpgsql SET search_path='' AS $$
DECLARE result jsonb; pair record; s text;
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;
  IF jsonb_typeof(v)='object' THEN
    result:='{}';
    FOR pair IN SELECT * FROM jsonb_each(v) LOOP
      IF position(actor IN pair.key)>0 OR (email IS NOT NULL AND position(email IN pair.key)>0) THEN CONTINUE; END IF;
      IF pair.key ~* '^(actor|staff|member)_?name$' AND name IS NOT NULL AND pair.value=to_jsonb(name) THEN
        result:=result||jsonb_build_object(pair.key,'[deleted member]');
      ELSE result:=result||jsonb_build_object(pair.key,deletion_engine_private.redact(pair.value,actor,email,name)); END IF;
    END LOOP; RETURN result;
  ELSIF jsonb_typeof(v)='array' THEN
    SELECT coalesce(jsonb_agg(deletion_engine_private.redact(value,actor,email,name)),'[]') INTO result FROM jsonb_array_elements(v);
    RETURN result;
  ELSIF jsonb_typeof(v)='string' THEN
    IF v#>>'{}'=actor THEN RETURN 'null'::jsonb; END IF;
    s:=replace(v#>>'{}',actor,'[deleted member]');
    IF email IS NOT NULL AND length(email)>0 THEN s:=replace(s,email,'[deleted member]'); END IF;
    RETURN to_jsonb(s);
  END IF;
  RETURN v;
END $$;

-- Versioned extension ports; baseline remains usable for its original tiny contract.
CREATE FUNCTION deletion_engine_private.upload_tracking_enabled() RETURNS boolean LANGUAGE sql SET search_path='' AS $$SELECT false$$;
CREATE FUNCTION deletion_engine_private.lock_upload_actor(actor uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$BEGIN RETURN;END$$;
CREATE FUNCTION deletion_engine_private.assert_uploads_quiescent(actor uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$BEGIN RETURN;END$$;
CREATE FUNCTION deletion_engine_private.extra_upload_keys(actor uuid) RETURNS TABLE(object_key text) LANGUAGE sql SET search_path='' AS $$SELECT NULL::text WHERE false$$;
CREATE FUNCTION deletion_engine_private.detach_upload_actor(actor uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$BEGIN RETURN;END$$;
REVOKE ALL ON FUNCTION deletion_engine_private.upload_tracking_enabled(),deletion_engine_private.lock_upload_actor(uuid),
 deletion_engine_private.assert_uploads_quiescent(uuid),deletion_engine_private.extra_upload_keys(uuid),deletion_engine_private.detach_upload_actor(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION deletion_engine_private.prepare_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION deletion_engine_private.before_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION deletion_engine_private.after_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SET search_path='' AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION deletion_engine_private.billing_ready(actor uuid) RETURNS boolean
LANGUAGE sql SET search_path='' AS $$ SELECT false $$;
CREATE FUNCTION deletion_engine_private.detach_billing(actor uuid) RETURNS integer
LANGUAGE sql SET search_path='' AS $$ SELECT 0 $$;
REVOKE ALL ON FUNCTION deletion_engine_private.prepare_step(uuid,text,text),
  deletion_engine_private.before_step(uuid,text,text),deletion_engine_private.after_step(uuid,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION deletion_engine_private.billing_ready(uuid),deletion_engine_private.detach_billing(uuid)
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.bff_account_deletion_engine(
  p_request_id uuid,p_lease_token text,p_step text,p_kind text,p_action text,p_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.account_deletion_requests%ROWTYPE; steps text[]; next_step text;
  actor uuid; email text; name text; n integer:=0; x integer; rec record; result jsonb;
BEGIN
  IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_local_only'; END IF;
  SELECT * INTO r FROM public.account_deletion_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR r.status<>'processing' OR r.account_kind<>p_kind OR r.active_actor_id IS NULL
    OR r.identity_confirmed_at IS NULL OR r.preflight_resolution IS NULL
    OR r.lease_expires_at<=clock_timestamp() OR r.lease_expires_at IS NULL
    OR r.lease_expires_at>clock_timestamp()+interval '5 minutes'
    OR r.lease_token_hash IS DISTINCT FROM encode(extensions.digest(p_lease_token,'sha256'),'hex')
  THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_lease_lost'; END IF;
  steps:=CASE p_kind WHEN 'owner' THEN ARRAY['access_frozen','staff_access_revoked','object_manifest_built',
    'r2_objects_deleted','r2_absence_verified','billing_identity_detached','operational_data_cleaned',
    'profile_deleted','auth_user_deleted','sessions_revoked'] ELSE ARRAY['access_frozen','staff_access_revoked',
    'staff_attribution_anonymized','operational_data_cleaned','profile_deleted','auth_user_deleted','sessions_revoked'] END;
  SELECT s INTO next_step FROM unnest(steps) WITH ORDINALITY AS u(s,o)
    WHERE NOT EXISTS (SELECT 1 FROM public.account_deletion_cleanup_steps c
      WHERE c.request_id=p_request_id AND c.step_code=s AND c.status='completed') ORDER BY o LIMIT 1;
  IF next_step IS DISTINCT FROM p_step THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_step_order'; END IF;
  PERFORM deletion_engine_private.assert_catalog();
  actor:=r.active_actor_id;
  PERFORM deletion_engine_private.lock_upload_actor(actor);
  IF p_step NOT IN('access_frozen','staff_access_revoked') THEN PERFORM deletion_engine_private.assert_uploads_quiescent(actor);END IF;
  PERFORM deletion_engine_private.prepare_step(actor,p_kind,p_step);
  PERFORM set_config('deletion_engine.request',p_request_id::text,true);
  PERFORM set_config('deletion_engine.lease',p_lease_token,true);
  PERFORM set_config('deletion_engine.step',p_step,true);
  IF p_action='context' THEN
    SELECT jsonb_build_object('actorId',actor,'totalObjects',count(*),'objects',coalesce((
      SELECT jsonb_agg(to_jsonb(o)) FROM (SELECT object_key AS key,deleted,absent
        FROM deletion_engine_private.objects WHERE request_id=p_request_id
          AND CASE p_step WHEN 'r2_objects_deleted' THEN NOT deleted WHEN 'r2_absence_verified' THEN NOT absent ELSE false END
        ORDER BY object_key LIMIT 20) o),'[]')) INTO result
    FROM deletion_engine_private.objects WHERE request_id=p_request_id;
    RETURN result;
  ELSIF p_action='ack_object' THEN
    IF p_step='r2_objects_deleted' THEN
      UPDATE deletion_engine_private.objects SET deleted=true WHERE request_id=p_request_id AND object_key=p_key;
    ELSIF p_step='r2_absence_verified' THEN
      UPDATE deletion_engine_private.objects SET absent=true WHERE request_id=p_request_id AND object_key=p_key AND deleted;
    ELSE RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_object_step'; END IF;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_object_scope'; END IF;
    RETURN '{}';
  END IF;
  SELECT jsonb_build_object('affectedCount',affected_count,'evidenceHash',evidence_hash) INTO result
    FROM deletion_engine_private.receipts WHERE request_id=p_request_id AND step=p_step;
  IF result IS NOT NULL AND NOT (p_step='access_frozen' AND p_action='complete_external') THEN RETURN result; END IF;
  IF p_action='execute' THEN
    PERFORM deletion_engine_private.before_step(actor,p_kind,p_step);
    CASE p_step
    WHEN 'access_frozen' THEN
      IF EXISTS(SELECT 1 FROM public.subscription_accounts WHERE owner_id=actor AND billing_status<>'none')
        AND NOT deletion_engine_private.billing_ready(actor) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_billing_migration_required'; END IF;
      IF p_kind='staff' AND (EXISTS(SELECT 1 FROM public.markets WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.products WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.product_cover_photos WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.sale_photo_evidence WHERE owner_id=actor)) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_staff_owns_workspace'; END IF;
      INSERT INTO deletion_engine_private.frozen(actor_hash,request_id)
        VALUES(encode(extensions.digest(actor::text,'sha256'),'hex'),p_request_id) ON CONFLICT DO NOTHING;
      n:=1;
    WHEN 'staff_access_revoked' THEN
      DELETE FROM public.market_members WHERE user_id=actor OR (p_kind='owner' AND market_id IN (SELECT id FROM public.markets WHERE owner_id=actor));
      GET DIAGNOSTICS n=ROW_COUNT;
      DELETE FROM public.staff_relationships WHERE staff_id=actor OR (p_kind='owner' AND owner_id=actor);
      GET DIAGNOSTICS x=ROW_COUNT; n:=n+x;
      DELETE FROM public.staff_invitations WHERE owner_id=actor;
      GET DIAGNOSTICS x=ROW_COUNT; n:=n+x;
    WHEN 'object_manifest_built' THEN
      INSERT INTO deletion_engine_private.objects(request_id,object_key)
        SELECT p_request_id,k FROM (
          SELECT display_object_key k FROM public.product_cover_photos WHERE owner_id=actor
          UNION SELECT thumbnail_object_key FROM public.product_cover_photos WHERE owner_id=actor
          UNION SELECT r2_object_key FROM public.sale_photo_evidence WHERE owner_id=actor
          UNION SELECT r2_thumbnail_key FROM public.sale_photo_evidence WHERE owner_id=actor
          UNION SELECT object_key FROM deletion_engine_private.extra_upload_keys(actor)) keys
        WHERE k IS NOT NULL ON CONFLICT DO NOTHING;
      SELECT count(*) INTO n FROM deletion_engine_private.objects WHERE request_id=p_request_id;
      IF n>1000 THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_manifest_limit'; END IF;
    WHEN 'billing_identity_detached' THEN
      n:=deletion_engine_private.detach_billing(actor);
      IF EXISTS(SELECT 1 FROM public.subscription_accounts WHERE owner_id=actor AND billing_status<>'none')
        AND NOT deletion_engine_private.billing_ready(actor) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_billing_migration_required'; END IF;
    WHEN 'staff_attribution_anonymized','operational_data_cleaned' THEN
      SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE id=actor;
      UPDATE public.events SET actor_id=CASE WHEN actor_id=actor THEN NULL ELSE actor_id END,
        payload=deletion_engine_private.redact(payload,actor::text,email,name),
        metadata=coalesce(deletion_engine_private.redact(metadata,actor::text,email,name),'{}')
          ||CASE WHEN actor_id=actor THEN '{"deletedActor":true}'::jsonb ELSE '{}'::jsonb END
        WHERE actor_id=actor OR position(actor::text IN payload::text)>0 OR position(actor::text IN metadata::text)>0
          OR (email IS NOT NULL AND length(email)>0 AND (position(email IN payload::text)>0 OR position(email IN metadata::text)>0));
      GET DIAGNOSTICS n=ROW_COUNT;
      UPDATE public.sale_photo_evidence SET captured_by_staff_id=NULL WHERE captured_by_staff_id=actor;
      IF p_step='operational_data_cleaned' THEN
        IF p_kind='owner' THEN
          DELETE FROM public.product_cover_photos WHERE owner_id=actor;
          DELETE FROM public.sale_photo_evidence WHERE owner_id=actor;
          DELETE FROM public.events WHERE market_id IN (SELECT id FROM public.markets WHERE owner_id=actor);
          DELETE FROM public.products WHERE owner_id=actor;
          DELETE FROM public.markets WHERE owner_id=actor;
        ELSIF EXISTS(SELECT 1 FROM public.markets WHERE owner_id=actor)
          OR EXISTS(SELECT 1 FROM public.products WHERE owner_id=actor)
          OR EXISTS(SELECT 1 FROM public.product_cover_photos WHERE owner_id=actor)
          OR EXISTS(SELECT 1 FROM public.sale_photo_evidence WHERE owner_id=actor) THEN
          RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_staff_owns_workspace';
        END IF;
        DELETE FROM public.user_settings WHERE user_id=actor;
        DELETE FROM public.subscription_accounts WHERE owner_id=actor;
      END IF;
    WHEN 'profile_deleted' THEN
        PERFORM deletion_engine_private.detach_upload_actor(actor);
      IF EXISTS(SELECT 1 FROM public.markets WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.events WHERE actor_id=actor)
        OR EXISTS(SELECT 1 FROM public.staff_relationships WHERE owner_id=actor OR staff_id=actor)
        THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_data_remaining'; END IF;
      DELETE FROM public.profiles WHERE id=actor; GET DIAGNOSTICS n=ROW_COUNT;
    ELSE RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_not_database_step';
    END CASE;
    PERFORM deletion_engine_private.after_step(actor,p_kind,p_step);
  ELSIF p_action='complete_external' THEN
    CASE p_step
    WHEN 'access_frozen' THEN n:=1;
    WHEN 'r2_objects_deleted','r2_absence_verified' THEN
      IF EXISTS(SELECT 1 FROM deletion_engine_private.objects WHERE request_id=p_request_id
        AND (NOT deleted OR (p_step='r2_absence_verified' AND NOT absent))) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_objects_incomplete'; END IF;
      SELECT count(*) INTO n FROM deletion_engine_private.objects WHERE request_id=p_request_id;
    WHEN 'auth_user_deleted','sessions_revoked' THEN
      IF EXISTS(SELECT 1 FROM auth.users WHERE id=actor) OR EXISTS(SELECT 1 FROM auth.sessions WHERE user_id=actor) THEN
        RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_auth_remaining'; END IF;
      IF p_step='sessions_revoked' THEN DELETE FROM deletion_engine_private.objects WHERE request_id=p_request_id; END IF;
    ELSE RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_not_external_step';
    END CASE;
  ELSE RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_action_invalid'; END IF;
  INSERT INTO deletion_engine_private.receipts VALUES(p_request_id,p_step,n,
    encode(extensions.digest('deletion-engine-v1:'||p_request_id::text||':'||p_step||':'||n::text,'sha256'),'hex'))
    ON CONFLICT(request_id,step) DO NOTHING;
  SELECT jsonb_build_object('affectedCount',affected_count,'evidenceHash',evidence_hash) INTO result
    FROM deletion_engine_private.receipts WHERE request_id=p_request_id AND step=p_step;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION deletion_engine_private.assert_catalog(), deletion_engine_private.write_fence(),
  deletion_engine_private.redact(jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_account_deletion_engine(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_account_deletion_engine(uuid,text,text,text,text,text) TO service_role;
ROLLBACK;
