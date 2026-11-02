-- GENERATED candidate 096. NOT approved for remote execution; not in automatic migrations.
-- Requires 071 + deployed 095, exact catalog/ACL baseline, DBA target acknowledgement.
-- Installs no R2 target, billing key, worker route, schedule, or enabled runtime.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';
SELECT pg_advisory_xact_lock(hashtextextended('feria:account-deletion:migration:096',0));
DO $candidate_migration$
DECLARE installed record;schema_now text;payload constant text:='CREATE OR REPLACE FUNCTION public.bff_read_account_deletion_request(p_actor_id uuid)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = '''' AS $$
  SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at,
    CASE WHEN r.status = ''failed_retryable'' THEN r.lease_expires_at ELSE NULL END
  FROM public.account_deletion_requests r
  WHERE r.active_actor_id = p_actor_id
  ORDER BY r.requested_at DESC, r.id DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.bff_confirm_account_deletion_request(
  p_actor_id uuid, p_request_id uuid, p_expected_status text)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '''' AS $$
DECLARE v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.account_deletion_requests r
    WHERE r.id = p_request_id AND r.active_actor_id = p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = ''P0002'', MESSAGE = ''account_deletion_not_found''; END IF;
  IF p_expected_status IS DISTINCT FROM ''requested'' OR v_row.status NOT IN (''requested'', ''identity_confirmed'')
    OR v_row.lease_token_hash IS NOT NULL OR v_row.lease_expires_at IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.account_deletion_cleanup_steps s WHERE s.request_id = v_row.id AND s.status <> ''pending'')
  THEN RAISE EXCEPTION USING ERRCODE = ''55000'', MESSAGE = ''account_deletion_conflict''; END IF;
  IF v_row.status = ''requested'' THEN
    UPDATE public.account_deletion_requests r SET status = ''identity_confirmed'', identity_confirmed_at = pg_catalog.clock_timestamp()
      WHERE r.id = p_request_id;
  END IF;
  RETURN QUERY SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at, NULL::timestamptz
    FROM public.account_deletion_requests r WHERE r.id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_cancel_account_deletion_request(
  p_actor_id uuid, p_request_id uuid, p_expected_status text)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '''' AS $$
DECLARE v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.account_deletion_requests r
    WHERE r.id = p_request_id AND r.active_actor_id = p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = ''P0002'', MESSAGE = ''account_deletion_not_found''; END IF;
  IF p_expected_status IS NULL OR p_expected_status NOT IN (''requested'', ''identity_confirmed'')
    OR v_row.lease_token_hash IS NOT NULL OR v_row.lease_expires_at IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.account_deletion_cleanup_steps s WHERE s.request_id = v_row.id AND s.status <> ''pending'')
    OR (v_row.status <> ''cancelled'' AND v_row.status IS DISTINCT FROM p_expected_status)
  THEN RAISE EXCEPTION USING ERRCODE = ''55000'', MESSAGE = ''account_deletion_conflict''; END IF;
  IF v_row.status <> ''cancelled'' THEN
    UPDATE public.account_deletion_requests r SET status = ''cancelled'', cancelled_at = pg_catalog.clock_timestamp(), safe_error_code = NULL
      WHERE r.id = p_request_id;
  END IF;
  RETURN QUERY SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at, NULL::timestamptz
    FROM public.account_deletion_requests r WHERE r.id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bff_confirm_account_deletion_request(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_cancel_account_deletion_request(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_confirm_account_deletion_request(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_cancel_account_deletion_request(uuid, uuid, text) TO service_role;

CREATE SCHEMA deletion_engine_private;
REVOKE ALL ON SCHEMA deletion_engine_private FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE deletion_engine_private.frozen (
  actor_hash text PRIMARY KEY, request_id uuid NOT NULL,
  purge_after timestamptz NOT NULL DEFAULT clock_timestamp()+interval ''180 days''
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE bad boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=''public'' AND c.relkind IN (''r'',''p'',''m'',''v'',''f'')
      AND c.relname NOT IN (''profiles'',''markets'',''products'',''events'',''staff_relationships'',
        ''staff_invitations'',''market_members'',''user_settings'',''subscription_accounts'',
        ''product_cover_photos'',''sale_photo_evidence'',''account_deletion_requests'',
        ''account_deletion_cleanup_steps'',''account_deletion_transition_audit'')
  ) INTO bad;
  IF bad THEN RAISE EXCEPTION USING ERRCODE=''55000'', MESSAGE=''engine_unreviewed_table''; END IF;
  SELECT EXISTS (
    SELECT 1 FROM (VALUES
      (''profiles'',''display_name,email,id''), (''markets'',''id,name,owner_id''),
      (''products'',''id,name,owner_id''), (''events'',''actor_id,id,market_id,metadata,payload''),
      (''staff_relationships'',''id,owner_id,staff_email,staff_id,status''),
      (''staff_invitations'',''id,owner_id,token''), (''market_members'',''market_id,user_id''),
      (''user_settings'',''settings,user_id''), (''subscription_accounts'',''billing_status,owner_id,plan_code''),
      (''product_cover_photos'',''display_object_key,id,owner_id,thumbnail_object_key''),
      (''sale_photo_evidence'',''captured_by_staff_id,id,owner_id,r2_object_key,r2_thumbnail_key'')
    ) AS expected(t,cols)
    WHERE expected.cols IS DISTINCT FROM (
      SELECT string_agg(a.attname,'','' ORDER BY a.attname)
      FROM pg_catalog.pg_attribute a WHERE a.attrelid=pg_catalog.to_regclass(''public.''||expected.t)
        AND a.attnum>0 AND NOT a.attisdropped
    )
  ) INTO bad;
  IF bad THEN RAISE EXCEPTION USING ERRCODE=''55000'', MESSAGE=''engine_unreviewed_columns''; END IF;
END $$;

CREATE FUNCTION deletion_engine_private.actor_enabled(actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM deletion_engine_private.frozen f
    WHERE f.actor_hash=encode(extensions.digest(actor::text,''sha256''),''hex''));
$$;
CREATE FUNCTION deletion_engine_private.record_enabled(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM deletion_engine_private.frozen f
    WHERE f.actor_hash IN (
      encode(extensions.digest(r->>''owner_id'',''sha256''),''hex''),
      encode(extensions.digest(r->>''user_id'',''sha256''),''hex''),
      encode(extensions.digest(r->>''staff_id'',''sha256''),''hex''),
      encode(extensions.digest(r->>''actor_id'',''sha256''),''hex''),
      encode(extensions.digest(r->>''id'',''sha256''),''hex'')))
    AND NOT EXISTS (SELECT 1 FROM public.markets m JOIN deletion_engine_private.frozen f
      ON f.actor_hash=encode(extensions.digest(m.owner_id::text,''sha256''),''hex'')
      WHERE m.id::text=r->>''market_id'');
$$;
-- This helper grants only a boolean; private rows remain inaccessible.
GRANT USAGE ON SCHEMA deletion_engine_private TO authenticated;
REVOKE ALL ON FUNCTION deletion_engine_private.actor_enabled(uuid), deletion_engine_private.record_enabled(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION deletion_engine_private.actor_enabled(uuid), deletion_engine_private.record_enabled(jsonb) TO authenticated;

CREATE FUNCTION deletion_engine_private.write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE valid_worker boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.account_deletion_requests r
    WHERE r.id::text=current_setting(''deletion_engine.request'',true) AND r.status=''processing''
      AND r.lease_token_hash=encode(extensions.digest(current_setting(''deletion_engine.lease'',true),''sha256''),''hex'')
      AND r.lease_expires_at>clock_timestamp()) INTO valid_worker;
  IF NOT valid_worker AND (
    NOT deletion_engine_private.actor_enabled(auth.uid())
    OR (TG_OP<>''INSERT'' AND NOT deletion_engine_private.record_enabled(to_jsonb(OLD)))
    OR (TG_OP<>''DELETE'' AND NOT deletion_engine_private.record_enabled(to_jsonb(NEW)))
  ) THEN RAISE EXCEPTION USING ERRCODE=''55000'', MESSAGE=''engine_access_frozen''; END IF;
  IF TG_OP=''DELETE'' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[''profiles'',''markets'',''products'',''events'',''staff_relationships'',''staff_invitations'',
    ''market_members'',''user_settings'',''subscription_accounts'',''product_cover_photos'',''sale_photo_evidence''] LOOP
    EXECUTE format(''CREATE TRIGGER deletion_engine_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION deletion_engine_private.write_fence()'',t);
    EXECUTE format(''ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY'',t);
    EXECUTE format(''CREATE POLICY deletion_engine_read_fence ON public.%I AS RESTRICTIVE TO authenticated USING (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I))) WITH CHECK (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I)))'',t,t,t);
  END LOOP;
END $$;

-- Known structured attribution. UUID/email occurrences in strings are removed recursively;
-- this is not a claim that arbitrary free text can be universally anonymized.
CREATE FUNCTION deletion_engine_private.redact(v jsonb, actor text, email text, name text) RETURNS jsonb
LANGUAGE plpgsql SET search_path='''' AS $$
DECLARE result jsonb; pair record; s text;
BEGIN
  IF v IS NULL THEN RETURN NULL; END IF;
  IF jsonb_typeof(v)=''object'' THEN
    result:=''{}'';
    FOR pair IN SELECT * FROM jsonb_each(v) LOOP
      IF position(actor IN pair.key)>0 OR (email IS NOT NULL AND position(email IN pair.key)>0) THEN CONTINUE; END IF;
      IF pair.key ~* ''^(actor|staff|member)_?name$'' AND name IS NOT NULL AND pair.value=to_jsonb(name) THEN
        result:=result||jsonb_build_object(pair.key,''[deleted member]'');
      ELSE result:=result||jsonb_build_object(pair.key,deletion_engine_private.redact(pair.value,actor,email,name)); END IF;
    END LOOP; RETURN result;
  ELSIF jsonb_typeof(v)=''array'' THEN
    SELECT coalesce(jsonb_agg(deletion_engine_private.redact(value,actor,email,name)),''[]'') INTO result FROM jsonb_array_elements(v);
    RETURN result;
  ELSIF jsonb_typeof(v)=''string'' THEN
    IF v#>>''{}''=actor THEN RETURN ''null''::jsonb; END IF;
    s:=replace(v#>>''{}'',actor,''[deleted member]'');
    IF email IS NOT NULL AND length(email)>0 THEN s:=replace(s,email,''[deleted member]''); END IF;
    RETURN to_jsonb(s);
  END IF;
  RETURN v;
END $$;

-- Versioned extension ports; baseline remains usable for its original tiny contract.
CREATE FUNCTION deletion_engine_private.upload_tracking_enabled() RETURNS boolean LANGUAGE sql SET search_path='''' AS $$SELECT false$$;
CREATE FUNCTION deletion_engine_private.lock_upload_actor(actor uuid) RETURNS void LANGUAGE plpgsql SET search_path='''' AS $$BEGIN RETURN;END$$;
CREATE FUNCTION deletion_engine_private.assert_uploads_quiescent(actor uuid) RETURNS void LANGUAGE plpgsql SET search_path='''' AS $$BEGIN RETURN;END$$;
CREATE FUNCTION deletion_engine_private.extra_upload_keys(actor uuid) RETURNS TABLE(object_key text) LANGUAGE sql SET search_path='''' AS $$SELECT NULL::text WHERE false$$;
CREATE FUNCTION deletion_engine_private.detach_upload_actor(actor uuid) RETURNS void LANGUAGE plpgsql SET search_path='''' AS $$BEGIN RETURN;END$$;
REVOKE ALL ON FUNCTION deletion_engine_private.upload_tracking_enabled(),deletion_engine_private.lock_upload_actor(uuid),
 deletion_engine_private.assert_uploads_quiescent(uuid),deletion_engine_private.extra_upload_keys(uuid),deletion_engine_private.detach_upload_actor(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION deletion_engine_private.prepare_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SET search_path='''' AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION deletion_engine_private.before_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SET search_path='''' AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION deletion_engine_private.after_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SET search_path='''' AS $$ BEGIN RETURN; END $$;
CREATE FUNCTION deletion_engine_private.billing_ready(actor uuid) RETURNS boolean
LANGUAGE sql SET search_path='''' AS $$ SELECT false $$;
CREATE FUNCTION deletion_engine_private.detach_billing(actor uuid) RETURNS integer
LANGUAGE sql SET search_path='''' AS $$ SELECT 0 $$;
REVOKE ALL ON FUNCTION deletion_engine_private.prepare_step(uuid,text,text),
  deletion_engine_private.before_step(uuid,text,text),deletion_engine_private.after_step(uuid,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION deletion_engine_private.billing_ready(uuid),deletion_engine_private.detach_billing(uuid)
  FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.bff_account_deletion_engine(
  p_request_id uuid,p_lease_token text,p_step text,p_kind text,p_action text,p_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE r public.account_deletion_requests%ROWTYPE; steps text[]; next_step text;
  actor uuid; email text; name text; n integer:=0; x integer; rec record; result jsonb;
BEGIN
  IF NOT deletion_release_private.runtime_allowed() THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_local_only''; END IF;
  SELECT * INTO r FROM public.account_deletion_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR r.status<>''processing'' OR r.account_kind<>p_kind OR r.active_actor_id IS NULL
    OR r.identity_confirmed_at IS NULL OR r.preflight_resolution IS NULL
    OR r.lease_expires_at<=clock_timestamp() OR r.lease_expires_at IS NULL
    OR r.lease_expires_at>clock_timestamp()+interval ''5 minutes''
    OR r.lease_token_hash IS DISTINCT FROM encode(extensions.digest(p_lease_token,''sha256''),''hex'')
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_lease_lost''; END IF;
  steps:=CASE p_kind WHEN ''owner'' THEN ARRAY[''access_frozen'',''staff_access_revoked'',''object_manifest_built'',
    ''r2_objects_deleted'',''r2_absence_verified'',''billing_identity_detached'',''operational_data_cleaned'',
    ''profile_deleted'',''auth_user_deleted'',''sessions_revoked''] ELSE ARRAY[''access_frozen'',''staff_access_revoked'',
    ''staff_attribution_anonymized'',''operational_data_cleaned'',''profile_deleted'',''auth_user_deleted'',''sessions_revoked''] END;
  SELECT s INTO next_step FROM unnest(steps) WITH ORDINALITY AS u(s,o)
    WHERE NOT EXISTS (SELECT 1 FROM public.account_deletion_cleanup_steps c
      WHERE c.request_id=p_request_id AND c.step_code=s AND c.status=''completed'') ORDER BY o LIMIT 1;
  IF next_step IS DISTINCT FROM p_step THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_step_order''; END IF;
  PERFORM deletion_engine_private.assert_catalog();
  actor:=r.active_actor_id;
  PERFORM deletion_engine_private.lock_upload_actor(actor);
  IF p_step NOT IN(''access_frozen'',''staff_access_revoked'') THEN PERFORM deletion_engine_private.assert_uploads_quiescent(actor);END IF;
  PERFORM deletion_engine_private.prepare_step(actor,p_kind,p_step);
  PERFORM set_config(''deletion_engine.request'',p_request_id::text,true);
  PERFORM set_config(''deletion_engine.lease'',p_lease_token,true);
  PERFORM set_config(''deletion_engine.step'',p_step,true);
  IF p_action=''context'' THEN
    SELECT jsonb_build_object(''actorId'',actor,''totalObjects'',count(*),''objects'',coalesce((
      SELECT jsonb_agg(to_jsonb(o)) FROM (SELECT object_key AS key,deleted,absent
        FROM deletion_engine_private.objects WHERE request_id=p_request_id
          AND CASE p_step WHEN ''r2_objects_deleted'' THEN NOT deleted WHEN ''r2_absence_verified'' THEN NOT absent ELSE false END
        ORDER BY object_key LIMIT 20) o),''[]'')) INTO result
    FROM deletion_engine_private.objects WHERE request_id=p_request_id;
    RETURN result;
  ELSIF p_action=''ack_object'' THEN
    IF p_step=''r2_objects_deleted'' THEN
      UPDATE deletion_engine_private.objects SET deleted=true WHERE request_id=p_request_id AND object_key=p_key;
    ELSIF p_step=''r2_absence_verified'' THEN
      UPDATE deletion_engine_private.objects SET absent=true WHERE request_id=p_request_id AND object_key=p_key AND deleted;
    ELSE RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_object_step''; END IF;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_object_scope''; END IF;
    RETURN ''{}'';
  END IF;
  SELECT jsonb_build_object(''affectedCount'',affected_count,''evidenceHash'',evidence_hash) INTO result
    FROM deletion_engine_private.receipts WHERE request_id=p_request_id AND step=p_step;
  IF result IS NOT NULL AND NOT (p_step=''access_frozen'' AND p_action=''complete_external'') THEN RETURN result; END IF;
  IF p_action=''execute'' THEN
    PERFORM deletion_engine_private.before_step(actor,p_kind,p_step);
    CASE p_step
    WHEN ''access_frozen'' THEN
      IF EXISTS(SELECT 1 FROM public.subscription_accounts WHERE owner_id=actor AND billing_status<>''none'')
        AND NOT deletion_engine_private.billing_ready(actor) THEN
        RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_billing_migration_required''; END IF;
      IF p_kind=''staff'' AND (EXISTS(SELECT 1 FROM public.markets WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.products WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.product_cover_photos WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.sale_photo_evidence WHERE owner_id=actor)) THEN
        RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_staff_owns_workspace''; END IF;
      INSERT INTO deletion_engine_private.frozen(actor_hash,request_id)
        VALUES(encode(extensions.digest(actor::text,''sha256''),''hex''),p_request_id) ON CONFLICT DO NOTHING;
      n:=1;
    WHEN ''staff_access_revoked'' THEN
      DELETE FROM public.market_members WHERE user_id=actor OR (p_kind=''owner'' AND market_id IN (SELECT id FROM public.markets WHERE owner_id=actor));
      GET DIAGNOSTICS n=ROW_COUNT;
      DELETE FROM public.staff_relationships WHERE staff_id=actor OR (p_kind=''owner'' AND owner_id=actor);
      GET DIAGNOSTICS x=ROW_COUNT; n:=n+x;
      DELETE FROM public.staff_invitations WHERE owner_id=actor;
      GET DIAGNOSTICS x=ROW_COUNT; n:=n+x;
    WHEN ''object_manifest_built'' THEN
      INSERT INTO deletion_engine_private.objects(request_id,object_key)
        SELECT p_request_id,k FROM (
          SELECT display_object_key k FROM public.product_cover_photos WHERE owner_id=actor
          UNION SELECT thumbnail_object_key FROM public.product_cover_photos WHERE owner_id=actor
          UNION SELECT r2_object_key FROM public.sale_photo_evidence WHERE owner_id=actor
          UNION SELECT r2_thumbnail_key FROM public.sale_photo_evidence WHERE owner_id=actor
          UNION SELECT object_key FROM deletion_engine_private.extra_upload_keys(actor)) keys
        WHERE k IS NOT NULL ON CONFLICT DO NOTHING;
      SELECT count(*) INTO n FROM deletion_engine_private.objects WHERE request_id=p_request_id;
      IF n>1000 THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_manifest_limit''; END IF;
    WHEN ''billing_identity_detached'' THEN
      n:=deletion_engine_private.detach_billing(actor);
      IF EXISTS(SELECT 1 FROM public.subscription_accounts WHERE owner_id=actor AND billing_status<>''none'')
        AND NOT deletion_engine_private.billing_ready(actor) THEN
        RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_billing_migration_required''; END IF;
    WHEN ''staff_attribution_anonymized'',''operational_data_cleaned'' THEN
      SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE id=actor;
      UPDATE public.events SET actor_id=CASE WHEN actor_id=actor THEN NULL ELSE actor_id END,
        payload=deletion_engine_private.redact(payload,actor::text,email,name),
        metadata=coalesce(deletion_engine_private.redact(metadata,actor::text,email,name),''{}'')
          ||CASE WHEN actor_id=actor THEN ''{"deletedActor":true}''::jsonb ELSE ''{}''::jsonb END
        WHERE actor_id=actor OR position(actor::text IN payload::text)>0 OR position(actor::text IN metadata::text)>0
          OR (email IS NOT NULL AND length(email)>0 AND (position(email IN payload::text)>0 OR position(email IN metadata::text)>0));
      GET DIAGNOSTICS n=ROW_COUNT;
      UPDATE public.sale_photo_evidence SET captured_by_staff_id=NULL WHERE captured_by_staff_id=actor;
      IF p_step=''operational_data_cleaned'' THEN
        IF p_kind=''owner'' THEN
          DELETE FROM public.product_cover_photos WHERE owner_id=actor;
          DELETE FROM public.sale_photo_evidence WHERE owner_id=actor;
          DELETE FROM public.events WHERE market_id IN (SELECT id FROM public.markets WHERE owner_id=actor);
          DELETE FROM public.products WHERE owner_id=actor;
          DELETE FROM public.markets WHERE owner_id=actor;
        ELSIF EXISTS(SELECT 1 FROM public.markets WHERE owner_id=actor)
          OR EXISTS(SELECT 1 FROM public.products WHERE owner_id=actor)
          OR EXISTS(SELECT 1 FROM public.product_cover_photos WHERE owner_id=actor)
          OR EXISTS(SELECT 1 FROM public.sale_photo_evidence WHERE owner_id=actor) THEN
          RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_staff_owns_workspace'';
        END IF;
        DELETE FROM public.user_settings WHERE user_id=actor;
        DELETE FROM public.subscription_accounts WHERE owner_id=actor;
      END IF;
    WHEN ''profile_deleted'' THEN
        PERFORM deletion_engine_private.detach_upload_actor(actor);
      IF EXISTS(SELECT 1 FROM public.markets WHERE owner_id=actor)
        OR EXISTS(SELECT 1 FROM public.events WHERE actor_id=actor)
        OR EXISTS(SELECT 1 FROM public.staff_relationships WHERE owner_id=actor OR staff_id=actor)
        THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_data_remaining''; END IF;
      DELETE FROM public.profiles WHERE id=actor; GET DIAGNOSTICS n=ROW_COUNT;
    ELSE RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_not_database_step'';
    END CASE;
    PERFORM deletion_engine_private.after_step(actor,p_kind,p_step);
  ELSIF p_action=''complete_external'' THEN
    CASE p_step
    WHEN ''access_frozen'' THEN n:=1;
    WHEN ''r2_objects_deleted'',''r2_absence_verified'' THEN
      IF EXISTS(SELECT 1 FROM deletion_engine_private.objects WHERE request_id=p_request_id
        AND (NOT deleted OR (p_step=''r2_absence_verified'' AND NOT absent))) THEN
        RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_objects_incomplete''; END IF;
      SELECT count(*) INTO n FROM deletion_engine_private.objects WHERE request_id=p_request_id;
    WHEN ''auth_user_deleted'',''sessions_revoked'' THEN
      IF EXISTS(SELECT 1 FROM auth.users WHERE id=actor) OR EXISTS(SELECT 1 FROM auth.sessions WHERE user_id=actor) THEN
        RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_auth_remaining''; END IF;
      IF p_step=''sessions_revoked'' THEN DELETE FROM deletion_engine_private.objects WHERE request_id=p_request_id; END IF;
    ELSE RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_not_external_step'';
    END CASE;
  ELSE RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_action_invalid''; END IF;
  INSERT INTO deletion_engine_private.receipts VALUES(p_request_id,p_step,n,
    encode(extensions.digest(''deletion-engine-v1:''||p_request_id::text||'':''||p_step||'':''||n::text,''sha256''),''hex''))
    ON CONFLICT(request_id,step) DO NOTHING;
  SELECT jsonb_build_object(''affectedCount'',affected_count,''evidenceHash'',evidence_hash) INTO result
    FROM deletion_engine_private.receipts WHERE request_id=p_request_id AND step=p_step;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION deletion_engine_private.assert_catalog(), deletion_engine_private.write_fence(),
  deletion_engine_private.redact(jsonb,text,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_account_deletion_engine(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_account_deletion_engine(uuid,text,text,text,text,text) TO service_role;
CREATE TABLE deletion_engine_private.approved_columns(table_name text,column_name text,type_name text,nullable boolean,PRIMARY KEY(table_name,column_name));
    REVOKE ALL ON deletion_engine_private.approved_columns FROM PUBLIC,anon,authenticated,service_role;
    INSERT INTO deletion_engine_private.approved_columns VALUES (''account_deletion_cleanup_steps'',''request_id'',''uuid'',false),(''account_deletion_cleanup_steps'',''step_code'',''text'',false),(''account_deletion_cleanup_steps'',''status'',''text'',false),(''account_deletion_cleanup_steps'',''affected_count'',''integer'',false),(''account_deletion_cleanup_steps'',''evidence_hash'',''text'',true),(''account_deletion_cleanup_steps'',''safe_error_code'',''text'',true),(''account_deletion_cleanup_steps'',''attempt_count'',''integer'',false),(''account_deletion_cleanup_steps'',''updated_at'',''timestamp with time zone'',false),(''account_deletion_cleanup_steps'',''completed_at'',''timestamp with time zone'',true),(''account_deletion_requests'',''id'',''uuid'',false),(''account_deletion_requests'',''active_actor_id'',''uuid'',true),(''account_deletion_requests'',''subject_ref_hash'',''text'',false),(''account_deletion_requests'',''idempotency_hash'',''text'',false),(''account_deletion_requests'',''account_kind'',''text'',false),(''account_deletion_requests'',''status'',''text'',false),(''account_deletion_requests'',''preflight_resolution'',''text'',false),(''account_deletion_requests'',''policy_revision'',''text'',false),(''account_deletion_requests'',''safe_error_code'',''text'',true),(''account_deletion_requests'',''retry_count'',''integer'',false),(''account_deletion_requests'',''lease_token_hash'',''text'',true),(''account_deletion_requests'',''lease_expires_at'',''timestamp with time zone'',true),(''account_deletion_requests'',''requested_at'',''timestamp with time zone'',false),(''account_deletion_requests'',''identity_confirmed_at'',''timestamp with time zone'',true),(''account_deletion_requests'',''processing_started_at'',''timestamp with time zone'',true),(''account_deletion_requests'',''completed_at'',''timestamp with time zone'',true),(''account_deletion_requests'',''cancelled_at'',''timestamp with time zone'',true),(''account_deletion_requests'',''updated_at'',''timestamp with time zone'',false),(''account_deletion_transition_audit'',''id'',''bigint'',false),(''account_deletion_transition_audit'',''request_id'',''uuid'',false),(''account_deletion_transition_audit'',''from_status'',''text'',true),(''account_deletion_transition_audit'',''to_status'',''text'',false),(''account_deletion_transition_audit'',''reason_code'',''text'',false),(''account_deletion_transition_audit'',''evidence_hash'',''text'',false),(''account_deletion_transition_audit'',''occurred_at'',''timestamp with time zone'',false),(''account_entitlements'',''owner_id'',''uuid'',false),(''account_entitlements'',''product_cover_photo_enabled'',''boolean'',false),(''account_entitlements'',''source'',''text'',false),(''account_entitlements'',''updated_at'',''timestamp with time zone'',false),(''billing_customer_links'',''id'',''uuid'',false),(''billing_customer_links'',''owner_id'',''uuid'',false),(''billing_customer_links'',''billing_origin'',''text'',false),(''billing_customer_links'',''provider_environment'',''text'',false),(''billing_customer_links'',''provider_customer_ref'',''text'',false),(''billing_customer_links'',''created_at'',''timestamp with time zone'',false),(''billing_event_inbox'',''id'',''uuid'',false),(''billing_event_inbox'',''billing_origin'',''text'',false),(''billing_event_inbox'',''provider_environment'',''text'',false),(''billing_event_inbox'',''provider_event_ref'',''text'',false),(''billing_event_inbox'',''payload_hash'',''text'',false),(''billing_event_inbox'',''verification_status'',''text'',false),(''billing_event_inbox'',''event_kind'',''text'',false),(''billing_event_inbox'',''provider_occurred_at'',''timestamp with time zone'',true),(''billing_event_inbox'',''received_at'',''timestamp with time zone'',false),(''billing_event_inbox'',''processing_status'',''text'',false),(''billing_event_inbox'',''attempt_count'',''integer'',false),(''billing_event_inbox'',''next_attempt_at'',''timestamp with time zone'',true),(''billing_event_inbox'',''last_safe_error_code'',''text'',true),(''billing_event_inbox'',''processed_at'',''timestamp with time zone'',true),(''billing_event_inbox'',''raw_payload_ciphertext_ref'',''text'',true),(''billing_event_inbox'',''created_at'',''timestamp with time zone'',false),(''billing_event_inbox'',''updated_at'',''timestamp with time zone'',false),(''billing_reconciliation_runs'',''id'',''uuid'',false),(''billing_reconciliation_runs'',''owner_id'',''uuid'',false),(''billing_reconciliation_runs'',''billing_origin'',''text'',false),(''billing_reconciliation_runs'',''provider_environment'',''text'',false),(''billing_reconciliation_runs'',''trigger_kind'',''text'',false),(''billing_reconciliation_runs'',''trigger_event_inbox_id'',''uuid'',true),(''billing_reconciliation_runs'',''provider_snapshot_ref'',''text'',true),(''billing_reconciliation_runs'',''provider_observed_at'',''timestamp with time zone'',true),(''billing_reconciliation_runs'',''status'',''text'',false),(''billing_reconciliation_runs'',''before_projection_hash'',''text'',true),(''billing_reconciliation_runs'',''after_projection_hash'',''text'',true),(''billing_reconciliation_runs'',''decision_code'',''text'',true),(''billing_reconciliation_runs'',''safe_error_code'',''text'',true),(''billing_reconciliation_runs'',''started_at'',''timestamp with time zone'',false),(''billing_reconciliation_runs'',''completed_at'',''timestamp with time zone'',true),(''billing_reconciliation_runs'',''created_at'',''timestamp with time zone'',false),(''billing_reconciliation_runs'',''updated_at'',''timestamp with time zone'',false),(''billing_storefront_price_mappings'',''id'',''uuid'',false),(''billing_storefront_price_mappings'',''price_version_id'',''text'',false),(''billing_storefront_price_mappings'',''billing_origin'',''text'',false),(''billing_storefront_price_mappings'',''provider_environment'',''text'',false),(''billing_storefront_price_mappings'',''mapping_mode'',''text'',false),(''billing_storefront_price_mappings'',''provider_product_ref'',''text'',true),(''billing_storefront_price_mappings'',''provider_price_ref'',''text'',true),(''billing_storefront_price_mappings'',''mapping_status'',''text'',false),(''billing_storefront_price_mappings'',''verified_at'',''timestamp with time zone'',true),(''billing_storefront_price_mappings'',''evidence_reference'',''text'',true),(''billing_storefront_price_mappings'',''activated_at'',''timestamp with time zone'',true),(''billing_storefront_price_mappings'',''retired_at'',''timestamp with time zone'',true),(''billing_storefront_price_mappings'',''created_at'',''timestamp with time zone'',false),(''billing_storefront_price_mappings'',''updated_at'',''timestamp with time zone'',false),(''billing_subscriptions'',''id'',''uuid'',false),(''billing_subscriptions'',''billing_customer_link_id'',''uuid'',false),(''billing_subscriptions'',''owner_id'',''uuid'',false),(''billing_subscriptions'',''billing_origin'',''text'',false),(''billing_subscriptions'',''provider_environment'',''text'',false),(''billing_subscriptions'',''provider_subscription_ref'',''text'',false),(''billing_subscriptions'',''provider_product_ref'',''text'',true),(''billing_subscriptions'',''provider_price_ref'',''text'',true),(''billing_subscriptions'',''normalized_plan_code'',''text'',false),(''billing_subscriptions'',''normalized_cadence'',''text'',false),(''billing_subscriptions'',''normalized_billing_status'',''text'',false),(''billing_subscriptions'',''cancel_at_period_end'',''boolean'',false),(''billing_subscriptions'',''current_period_starts_at'',''timestamp with time zone'',true),(''billing_subscriptions'',''current_period_ends_at'',''timestamp with time zone'',true),(''billing_subscriptions'',''provider_observed_at'',''timestamp with time zone'',false),(''billing_subscriptions'',''provider_sequence'',''text'',true),(''billing_subscriptions'',''snapshot_hash'',''text'',false),(''billing_subscriptions'',''last_reconciled_at'',''timestamp with time zone'',false),(''billing_subscriptions'',''created_at'',''timestamp with time zone'',false),(''billing_subscriptions'',''updated_at'',''timestamp with time zone'',false),(''billing_transactions'',''id'',''uuid'',false),(''billing_transactions'',''owner_id'',''uuid'',false),(''billing_transactions'',''billing_subscription_id'',''uuid'',true),(''billing_transactions'',''billing_origin'',''text'',false),(''billing_transactions'',''provider_environment'',''text'',false),(''billing_transactions'',''provider_transaction_ref'',''text'',false),(''billing_transactions'',''provider_parent_transaction_ref'',''text'',true),(''billing_transactions'',''transaction_kind'',''text'',false),(''billing_transactions'',''transaction_status'',''text'',false),(''billing_transactions'',''currency'',''text'',false),(''billing_transactions'',''amount_minor'',''bigint'',false),(''billing_transactions'',''provider_effective_at'',''timestamp with time zone'',false),(''billing_transactions'',''settled_at'',''timestamp with time zone'',true),(''billing_transactions'',''provider_observed_at'',''timestamp with time zone'',false),(''billing_transactions'',''snapshot_hash'',''text'',false),(''billing_transactions'',''created_at'',''timestamp with time zone'',false),(''events'',''id'',''uuid'',false),(''events'',''type'',''text'',false),(''events'',''payload'',''jsonb'',false),(''events'',''actor_id'',''uuid'',true),(''events'',''market_id'',''uuid'',true),(''events'',''timestamp'',''timestamp with time zone'',true),(''events'',''metadata'',''jsonb'',true),(''events'',''sync_status'',''sync_status'',true),(''events'',''created_at'',''timestamp with time zone'',false),(''events_archive'',''id'',''uuid'',false),(''events_archive'',''type'',''text'',false),(''events_archive'',''payload'',''jsonb'',false),(''events_archive'',''actor_id'',''uuid'',true),(''events_archive'',''market_id'',''uuid'',true),(''events_archive'',''timestamp'',''timestamp with time zone'',false),(''events_archive'',''metadata'',''jsonb'',true),(''events_archive'',''archived_at'',''timestamp with time zone'',true),(''events_archive'',''archived_by'',''uuid'',true),(''market_cash_records'',''market_id'',''uuid'',false),(''market_cash_records'',''business_date'',''date'',false),(''market_cash_records'',''owner_id'',''uuid'',false),(''market_cash_records'',''data'',''jsonb'',false),(''market_cash_records'',''revision'',''integer'',false),(''market_cash_records'',''mutation_id'',''uuid'',false),(''market_cash_records'',''updated_at'',''timestamp with time zone'',false),(''market_financial_review_receipts'',''owner_id'',''uuid'',false),(''market_financial_review_receipts'',''mutation_id'',''uuid'',false),(''market_financial_review_receipts'',''request'',''jsonb'',false),(''market_financial_review_receipts'',''response'',''jsonb'',false),(''market_financial_review_receipts'',''created_at'',''timestamp with time zone'',false),(''market_financial_reviews'',''owner_id'',''uuid'',false),(''market_financial_reviews'',''market_id'',''uuid'',false),(''market_financial_reviews'',''review_key'',''text'',false),(''market_financial_reviews'',''mode'',''text'',false),(''market_financial_reviews'',''amount'',''numeric(12,2)'',true),(''market_financial_reviews'',''observed'',''jsonb'',false),(''market_financial_reviews'',''source_key'',''text'',false),(''market_financial_reviews'',''revision'',''integer'',false),(''market_financial_reviews'',''mutation_id'',''uuid'',false),(''market_financial_reviews'',''updated_at'',''timestamp with time zone'',false),(''market_invitations'',''id'',''uuid'',false),(''market_invitations'',''code'',''text'',false),(''market_invitations'',''market_id'',''uuid'',false),(''market_invitations'',''created_by'',''uuid'',false),(''market_invitations'',''is_used'',''boolean'',true),(''market_invitations'',''used_by'',''uuid'',true),(''market_invitations'',''used_at'',''timestamp with time zone'',true),(''market_invitations'',''expires_at'',''timestamp with time zone'',true),(''market_invitations'',''created_at'',''timestamp with time zone'',true),(''market_journals'',''id'',''uuid'',false),(''market_journals'',''owner_id'',''uuid'',false),(''market_journals'',''market_id'',''uuid'',false),(''market_journals'',''author_id'',''uuid'',false),(''market_journals'',''business_date'',''date'',true),(''market_journals'',''body'',''text'',false),(''market_journals'',''revision'',''integer'',false),(''market_journals'',''mutation_id'',''uuid'',false),(''market_journals'',''created_at'',''timestamp with time zone'',false),(''market_journals'',''updated_at'',''timestamp with time zone'',false),(''market_journals'',''deleted_at'',''timestamp with time zone'',true),(''market_members'',''market_id'',''uuid'',false),(''market_members'',''user_id'',''uuid'',false),(''market_members'',''joined_at'',''timestamp with time zone'',true),(''market_members'',''role'',''text'',false),(''markets'',''id'',''uuid'',false),(''markets'',''owner_id'',''uuid'',false),(''markets'',''name'',''text'',false),(''markets'',''location'',''text'',false),(''markets'',''start_date'',''date'',false),(''markets'',''end_date'',''date'',false),(''markets'',''status'',''text'',false),(''markets'',''early_entry_enabled'',''boolean'',true),(''markets'',''early_entry_time'',''time without time zone'',true),(''markets'',''check_in_time'',''time without time zone'',true),(''markets'',''operating_start_time'',''time without time zone'',true),(''markets'',''operating_end_time'',''time without time zone'',true),(''markets'',''registration_fee'',''numeric(10,2)'',true),(''markets'',''booth_cost'',''numeric(10,2)'',true),(''markets'',''deposit'',''numeric(10,2)'',true),(''markets'',''table_rental'',''numeric(10,2)'',true),(''markets'',''chair_rental'',''numeric(10,2)'',true),(''markets'',''umbrella_rental'',''numeric(10,2)'',true),(''markets'',''tablecloth_rental'',''numeric(10,2)'',true),(''markets'',''commission_rate'',''numeric(5,2)'',true),(''markets'',''table_free'',''boolean'',true),(''markets'',''chair_free'',''boolean'',true),(''markets'',''umbrella_free'',''boolean'',true),(''markets'',''tablecloth_free'',''boolean'',true),(''markets'',''total_revenue'',''numeric(10,2)'',true),(''markets'',''total_profit'',''numeric(10,2)'',true),(''markets'',''total_interactions'',''integer'',true),(''markets'',''total_deals'',''integer'',true),(''markets'',''notes'',''text'',true),(''markets'',''created_at'',''timestamp with time zone'',true),(''markets'',''updated_at'',''timestamp with time zone'',true),(''markets'',''is_collaborative'',''boolean'',true),(''markets'',''operation_phase'',''text'',true),(''markets'',''is_deleted'',''boolean'',true),(''markets'',''sync_status'',''sync_status'',true),(''markets'',''sales_photo_evidence_required'',''boolean'',false),(''markets'',''operation_session_date'',''date'',true),(''markets'',''venue_id'',''uuid'',true),(''markets'',''schedule_id'',''uuid'',true),(''markets'',''session_origin'',''text'',true),(''markets'',''schedule_occurrence_key'',''text'',true),(''markets'',''schedule_revision'',''integer'',true),(''markets'',''schedule_occurrence_state'',''text'',true),(''markets'',''is_schedule_override'',''boolean'',false),(''markets'',''region_code'',''text'',true),(''markets'',''payment_deadline'',''jsonb'',true),(''operation_schedules'',''id'',''uuid'',false),(''operation_schedules'',''owner_id'',''uuid'',false),(''operation_schedules'',''venue_id'',''uuid'',false),(''operation_schedules'',''name'',''text'',true),(''operation_schedules'',''timezone'',''text'',false),(''operation_schedules'',''recurrence'',''jsonb'',false),(''operation_schedules'',''start_time'',''time without time zone'',false),(''operation_schedules'',''end_time'',''time without time zone'',false),(''operation_schedules'',''ends_next_day'',''boolean'',false),(''operation_schedules'',''defaults'',''jsonb'',false),(''operation_schedules'',''status'',''text'',false),(''operation_schedules'',''revision'',''integer'',false),(''operation_schedules'',''created_at'',''timestamp with time zone'',false),(''operation_schedules'',''updated_at'',''timestamp with time zone'',false),(''owner_workflow_receipts'',''id'',''uuid'',false),(''owner_workflow_receipts'',''owner_id'',''uuid'',false),(''owner_workflow_receipts'',''kind'',''text'',false),(''owner_workflow_receipts'',''request'',''jsonb'',false),(''owner_workflow_receipts'',''result'',''jsonb'',false),(''owner_workflow_receipts'',''created_at'',''timestamp with time zone'',false),(''pending_operations'',''operation_id'',''text'',false),(''pending_operations'',''operation_type'',''text'',false),(''pending_operations'',''entity_type'',''text'',false),(''pending_operations'',''entity_id'',''text'',false),(''pending_operations'',''market_id'',''uuid'',false),(''pending_operations'',''payload'',''jsonb'',false),(''pending_operations'',''idempotency_key'',''text'',false),(''pending_operations'',''actor_id'',''uuid'',false),(''pending_operations'',''role_snapshot'',''jsonb'',false),(''pending_operations'',''status'',''text'',false),(''pending_operations'',''retry_count'',''integer'',false),(''pending_operations'',''last_error_code'',''text'',true),(''pending_operations'',''last_error_message'',''text'',true),(''pending_operations'',''created_at'',''timestamp with time zone'',false),(''pending_operations'',''updated_at'',''timestamp with time zone'',false),(''preparation_template_applications'',''id'',''uuid'',false),(''preparation_template_applications'',''owner_id'',''uuid'',false),(''preparation_template_applications'',''market_id'',''uuid'',false),(''preparation_template_applications'',''actor_id'',''uuid'',true),(''preparation_template_applications'',''template_id'',''uuid'',false),(''preparation_template_applications'',''request'',''jsonb'',false),(''preparation_template_applications'',''result'',''jsonb'',false),(''preparation_template_applications'',''created_at'',''timestamp with time zone'',false),(''preparation_templates'',''id'',''uuid'',false),(''preparation_templates'',''owner_id'',''uuid'',false),(''preparation_templates'',''name'',''text'',false),(''preparation_templates'',''items'',''jsonb'',false),(''preparation_templates'',''revision'',''integer'',false),(''preparation_templates'',''mutation_id'',''uuid'',false),(''preparation_templates'',''archived'',''boolean'',false),(''preparation_templates'',''updated_at'',''timestamp with time zone'',false),(''product_cover_photos'',''id'',''uuid'',false),(''product_cover_photos'',''owner_id'',''uuid'',false),(''product_cover_photos'',''product_id'',''uuid'',false),(''product_cover_photos'',''status'',''text'',false),(''product_cover_photos'',''display_object_key'',''text'',true),(''product_cover_photos'',''thumbnail_object_key'',''text'',true),(''product_cover_photos'',''display_content_hash'',''text'',true),(''product_cover_photos'',''thumbnail_content_hash'',''text'',true),(''product_cover_photos'',''display_mime_type'',''text'',true),(''product_cover_photos'',''thumbnail_mime_type'',''text'',true),(''product_cover_photos'',''display_size_bytes'',''integer'',true),(''product_cover_photos'',''thumbnail_size_bytes'',''integer'',true),(''product_cover_photos'',''width'',''integer'',true),(''product_cover_photos'',''height'',''integer'',true),(''product_cover_photos'',''version'',''bigint'',false),(''product_cover_photos'',''pending_photo_id'',''uuid'',true),(''product_cover_photos'',''pending_version'',''bigint'',true),(''product_cover_photos'',''upload_lease_expires_at'',''timestamp with time zone'',true),(''product_cover_photos'',''last_error_code'',''text'',true),(''product_cover_photos'',''created_at'',''timestamp with time zone'',false),(''product_cover_photos'',''updated_at'',''timestamp with time zone'',false),(''product_cover_photos'',''deleted_at'',''timestamp with time zone'',true),(''products'',''id'',''uuid'',false),(''products'',''market_id'',''uuid'',true),(''products'',''name'',''text'',false),(''products'',''category'',''text'',false),(''products'',''price'',''numeric(10,2)'',false),(''products'',''cost'',''numeric(10,2)'',true),(''products'',''icon_name'',''text'',true),(''products'',''color_code'',''text'',true),(''products'',''stock'',''integer'',true),(''products'',''unlimited_stock'',''boolean'',true),(''products'',''is_active'',''boolean'',true),(''products'',''total_sold'',''integer'',true),(''products'',''description'',''text'',true),(''products'',''created_at'',''timestamp with time zone'',true),(''products'',''updated_at'',''timestamp with time zone'',true),(''products'',''owner_id'',''uuid'',false),(''products'',''is_shared'',''boolean'',true),(''profiles'',''id'',''uuid'',false),(''profiles'',''email'',''text'',false),(''profiles'',''display_name'',''text'',true),(''profiles'',''avatar_url'',''text'',true),(''profiles'',''created_at'',''timestamp with time zone'',true),(''profiles'',''updated_at'',''timestamp with time zone'',true),(''sale_photo_evidence'',''id'',''uuid'',false),(''sale_photo_evidence'',''owner_id'',''uuid'',false),(''sale_photo_evidence'',''market_id'',''uuid'',false),(''sale_photo_evidence'',''sale_id'',''uuid'',false),(''sale_photo_evidence'',''captured_by_staff_id'',''uuid'',true),(''sale_photo_evidence'',''status'',''text'',false),(''sale_photo_evidence'',''r2_object_key'',''text'',true),(''sale_photo_evidence'',''r2_thumbnail_key'',''text'',true),(''sale_photo_evidence'',''mime_type'',''text'',true),(''sale_photo_evidence'',''width'',''integer'',true),(''sale_photo_evidence'',''height'',''integer'',true),(''sale_photo_evidence'',''file_size_bytes'',''integer'',true),(''sale_photo_evidence'',''content_hash'',''text'',true),(''sale_photo_evidence'',''skipped_reason'',''text'',true),(''sale_photo_evidence'',''failure_reason'',''text'',true),(''sale_photo_evidence'',''sale_completed_at'',''timestamp with time zone'',false),(''sale_photo_evidence'',''captured_at'',''timestamp with time zone'',true),(''sale_photo_evidence'',''uploaded_at'',''timestamp with time zone'',true),(''sale_photo_evidence'',''expires_at'',''timestamp with time zone'',true),(''sale_photo_evidence'',''waived_by_owner_id'',''uuid'',true),(''sale_photo_evidence'',''waived_reason'',''text'',true),(''sale_photo_evidence'',''waived_at'',''timestamp with time zone'',true),(''sale_photo_evidence'',''created_at'',''timestamp with time zone'',false),(''sale_photo_evidence'',''updated_at'',''timestamp with time zone'',false),(''sale_photo_evidence'',''deleted_at'',''timestamp with time zone'',true),(''sale_photo_evidence'',''upload_attempt_id'',''uuid'',true),(''sale_photo_evidence'',''upload_lease_expires_at'',''timestamp with time zone'',true),(''snapshots'',''id'',''uuid'',false),(''snapshots'',''user_id'',''uuid'',false),(''snapshots'',''snapshot_at'',''timestamp with time zone'',false),(''snapshots'',''version'',''integer'',false),(''snapshots'',''data'',''jsonb'',false),(''snapshots'',''event_count'',''integer'',false),(''snapshots'',''last_event_id'',''uuid'',false),(''snapshots'',''data_size_bytes'',''integer'',true),(''snapshots'',''compressed_size_bytes'',''integer'',true),(''snapshots'',''compression_ratio'',''numeric(5,2)'',true),(''snapshots'',''created_at'',''timestamp with time zone'',true),(''staff_invitations'',''id'',''uuid'',false),(''staff_invitations'',''owner_id'',''uuid'',false),(''staff_invitations'',''token'',''text'',false),(''staff_invitations'',''expires_at'',''timestamp with time zone'',false),(''staff_invitations'',''created_at'',''timestamp with time zone'',true),(''staff_relationships'',''id'',''uuid'',false),(''staff_relationships'',''owner_id'',''uuid'',false),(''staff_relationships'',''staff_id'',''uuid'',false),(''staff_relationships'',''staff_email'',''text'',false),(''staff_relationships'',''invited_at'',''timestamp with time zone'',true),(''staff_relationships'',''accepted_at'',''timestamp with time zone'',true),(''staff_relationships'',''status'',''text'',false),(''staff_relationships'',''permissions'',''jsonb'',true),(''staff_relationships'',''created_at'',''timestamp with time zone'',true),(''staff_relationships'',''updated_at'',''timestamp with time zone'',true),(''staff_relationships'',''role'',''text'',false),(''subscription_accounts'',''owner_id'',''uuid'',false),(''subscription_accounts'',''plan_code'',''text'',false),(''subscription_accounts'',''plan_source'',''text'',false),(''subscription_accounts'',''billing_status'',''text'',false),(''subscription_accounts'',''entitlement_status'',''text'',false),(''subscription_accounts'',''entitlement_ends_at'',''timestamp with time zone'',true),(''subscription_accounts'',''created_at'',''timestamp with time zone'',false),(''subscription_accounts'',''updated_at'',''timestamp with time zone'',false),(''subscription_price_assignments'',''id'',''uuid'',false),(''subscription_price_assignments'',''owner_id'',''uuid'',false),(''subscription_price_assignments'',''storefront_price_mapping_id'',''uuid'',false),(''subscription_price_assignments'',''price_version_id'',''text'',false),(''subscription_price_assignments'',''assigned_plan_code'',''text'',false),(''subscription_price_assignments'',''assigned_cadence'',''text'',false),(''subscription_price_assignments'',''assigned_currency'',''text'',false),(''subscription_price_assignments'',''assigned_amount_minor'',''bigint'',false),(''subscription_price_assignments'',''price_policy'',''text'',false),(''subscription_price_assignments'',''founder_offer_code'',''text'',true),(''subscription_price_assignments'',''founder_lock_status'',''text'',true),(''subscription_price_assignments'',''assignment_source'',''text'',false),(''subscription_price_assignments'',''source_reference'',''text'',false),(''subscription_price_assignments'',''continuity_started_at'',''timestamp with time zone'',false),(''subscription_price_assignments'',''assigned_at'',''timestamp with time zone'',false),(''subscription_price_assignments'',''dormant_at'',''timestamp with time zone'',true),(''subscription_price_assignments'',''forfeited_at'',''timestamp with time zone'',true),(''subscription_price_assignments'',''forfeiture_reason'',''text'',true),(''subscription_price_assignments'',''superseded_at'',''timestamp with time zone'',true),(''subscription_price_assignments'',''last_transition_at'',''timestamp with time zone'',false),(''subscription_price_assignments'',''last_transition_reason'',''text'',false),(''subscription_price_assignments'',''last_transition_evidence_reference'',''text'',false),(''subscription_price_assignments'',''assignment_revision'',''bigint'',false),(''subscription_price_assignments'',''created_at'',''timestamp with time zone'',false),(''subscription_price_assignments'',''updated_at'',''timestamp with time zone'',false),(''subscription_price_versions'',''id'',''text'',false),(''subscription_price_versions'',''plan_code'',''text'',false),(''subscription_price_versions'',''cadence'',''text'',false),(''subscription_price_versions'',''currency'',''text'',false),(''subscription_price_versions'',''amount_minor'',''bigint'',false),(''subscription_price_versions'',''price_policy'',''text'',false),(''subscription_price_versions'',''offer_code'',''text'',true),(''subscription_price_versions'',''commercial_status'',''text'',false),(''subscription_price_versions'',''effective_at'',''timestamp with time zone'',true),(''subscription_price_versions'',''retired_at'',''timestamp with time zone'',true),(''subscription_price_versions'',''created_at'',''timestamp with time zone'',false),(''subscription_price_versions'',''updated_at'',''timestamp with time zone'',false),(''subscription_read_guard_settings'',''singleton'',''boolean'',false),(''subscription_read_guard_settings'',''enforce_all'',''boolean'',false),(''subscription_test_switch_audit'',''id'',''bigint'',false),(''subscription_test_switch_audit'',''owner_id'',''uuid'',false),(''subscription_test_switch_audit'',''plan_code'',''text'',true),(''subscription_test_switch_audit'',''expires_at'',''timestamp with time zone'',true),(''subscription_test_switch_audit'',''changed_at'',''timestamp with time zone'',false),(''subscription_write_guard_owners'',''owner_id'',''uuid'',false),(''subscription_write_guard_owners'',''enabled'',''boolean'',false),(''subscription_write_guard_owners'',''allow_test_switch'',''boolean'',false),(''subscription_write_guard_owners'',''test_plan_code'',''text'',true),(''subscription_write_guard_owners'',''test_expires_at'',''timestamp with time zone'',true),(''subscription_write_guard_owners'',''updated_at'',''timestamp with time zone'',false),(''subscription_write_guard_settings'',''singleton'',''boolean'',false),(''subscription_write_guard_settings'',''enforce_all'',''boolean'',false),(''user_settings'',''user_id'',''uuid'',false),(''user_settings'',''quick_action_buttons'',''jsonb'',true),(''user_settings'',''theme'',''text'',true),(''user_settings'',''language'',''text'',true),(''user_settings'',''created_at'',''timestamp with time zone'',true),(''user_settings'',''updated_at'',''timestamp with time zone'',true),(''user_settings'',''brand_name'',''text'',true),(''user_settings'',''default_sales_photo_evidence_required'',''boolean'',false),(''venues'',''id'',''uuid'',false),(''venues'',''owner_id'',''uuid'',false),(''venues'',''name'',''text'',false),(''venues'',''address'',''text'',true),(''venues'',''location_note'',''text'',true),(''venues'',''status'',''text'',false),(''venues'',''is_deleted'',''boolean'',false),(''venues'',''created_at'',''timestamp with time zone'',false),(''venues'',''updated_at'',''timestamp with time zone'',false),(''venues'',''region_code'',''text'',true);


ALTER TABLE public.events ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.events_archive ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.preparation_template_applications ALTER COLUMN actor_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION deletion_engine_private.assert_catalog() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname=''public'' AND c.relkind IN (''r'',''p'',''f'') AND NOT EXISTS (
      SELECT 1 FROM deletion_engine_private.approved_columns a WHERE a.table_name=c.relname)
  ) OR EXISTS (
    SELECT 1 FROM deletion_engine_private.approved_columns e FULL JOIN (
      SELECT c.relname AS table_name,a.attname AS column_name,pg_catalog.regexp_replace(pg_catalog.format_type(a.atttypid,a.atttypmod),''^public\.'','''') AS type_name,
        NOT a.attnotnull AS nullable FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
        WHERE n.nspname=''public'' AND c.relkind IN (''r'',''p'',''f'') AND a.attnum>0 AND NOT a.attisdropped
    ) live USING(table_name,column_name)
    WHERE e.type_name IS DISTINCT FROM live.type_name OR e.nullable IS DISTINCT FROM live.nullable
  ) THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_unreviewed_catalog''; END IF;
END $$;

CREATE OR REPLACE FUNCTION deletion_engine_private.prepare_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE t text; has_rows boolean;
BEGIN
  IF step<>''access_frozen'' THEN RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.pending_operations po WHERE po.status<>''synced''
    AND (po.actor_id=actor OR (kind=''owner'' AND po.market_id IN(SELECT id FROM public.markets WHERE owner_id=actor))))
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_cloud_pending_unresolved''; END IF;
  IF NOT deletion_engine_private.upload_tracking_enabled() AND (EXISTS(SELECT 1 FROM public.product_cover_photos WHERE owner_id=actor AND upload_lease_expires_at>clock_timestamp())
    OR EXISTS(SELECT 1 FROM public.sale_photo_evidence WHERE owner_id=actor AND upload_lease_expires_at>clock_timestamp()))
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_upload_in_flight''; END IF;
  FOREACH t IN ARRAY ARRAY[''billing_customer_links'',''billing_subscriptions'',''billing_transactions'',
    ''billing_reconciliation_runs'',''subscription_price_assignments''] LOOP
    EXECUTE format(''SELECT EXISTS(SELECT 1 FROM public.%I WHERE owner_id=$1)'',t) INTO has_rows USING actor;
    IF has_rows AND NOT deletion_engine_private.billing_ready(actor) THEN
      RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_billing_detachment_required''; END IF;
  END LOOP;
  IF kind=''staff'' THEN
    FOREACH t IN ARRAY ARRAY[''venues'',''operation_schedules'',''preparation_templates'',''market_journals'',
      ''market_cash_records'',''market_financial_reviews'',''market_financial_review_receipts'',''owner_workflow_receipts''] LOOP
      EXECUTE format(''SELECT EXISTS(SELECT 1 FROM public.%I WHERE owner_id=$1)'',t) INTO has_rows USING actor;
      IF has_rows THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_staff_owns_workspace''; END IF;
    END LOOP;
  END IF;
  IF EXISTS(SELECT 1 FROM public.markets WHERE owner_id<>actor AND (
    venue_id IN(SELECT id FROM public.venues WHERE owner_id=actor)
    OR schedule_id IN(SELECT id FROM public.operation_schedules WHERE owner_id=actor)))
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_foreign_workspace_reference''; END IF;
END $$;

-- The two deployed event triggers retain their normal authorization rules. A
-- narrow early-return branch (generated from captured definitions by the test
-- installer) calls this helper only for a current, ordered engine operation.
CREATE FUNCTION deletion_engine_private.authorize_event_change(old_row jsonb,new_row jsonb,op text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE r public.account_deletion_requests%ROWTYPE; step text; email text; name text;
BEGIN
  SELECT * INTO r FROM public.account_deletion_requests WHERE id::text=current_setting(''deletion_engine.request'',true)
    AND status=''processing'' AND lease_expires_at>clock_timestamp()
    AND lease_token_hash=encode(extensions.digest(current_setting(''deletion_engine.lease'',true),''sha256''),''hex'');
  IF NOT FOUND THEN RETURN false; END IF;
  step:=current_setting(''deletion_engine.step'',true);
  IF step NOT IN (''operational_data_cleaned'',''staff_attribution_anonymized'') THEN RETURN false; END IF;
  IF op=''DELETE'' THEN
    RETURN step=''operational_data_cleaned'' AND r.account_kind=''owner'' AND (
      old_row->>''market_id'' IN (SELECT id::text FROM public.markets WHERE owner_id=r.active_actor_id)
      OR (old_row->>''market_id'' IS NULL AND old_row->>''actor_id''=r.active_actor_id::text)
      OR (old_row->>''market_id'' IS NULL AND coalesce(old_row#>>''{payload,marketId}'',old_row#>>''{payload,market_id}'') IN
        (SELECT id::text FROM public.markets WHERE owner_id=r.active_actor_id)));
  END IF;
  IF op<>''UPDATE'' OR new_row-''actor_id''-''payload''-''metadata'' IS DISTINCT FROM old_row-''actor_id''-''payload''-''metadata'' THEN RETURN false; END IF;
  SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE id=r.active_actor_id;
  RETURN new_row->''actor_id'' IS NOT DISTINCT FROM CASE WHEN old_row->>''actor_id''=r.active_actor_id::text THEN ''null''::jsonb ELSE old_row->''actor_id'' END
    AND new_row->''payload'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_row->''payload'',r.active_actor_id::text,email,name)
    AND new_row->''metadata'' IS NOT DISTINCT FROM (
      coalesce(deletion_engine_private.redact(NULLIF(old_row->''metadata'',''null''::jsonb),r.active_actor_id::text,email,name),''{}'')
        ||CASE WHEN old_row->>''actor_id''=r.active_actor_id::text THEN ''{"deletedActor":true}''::jsonb ELSE ''{}''::jsonb END);
END $$;
REVOKE ALL ON FUNCTION deletion_engine_private.authorize_event_change(jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION deletion_engine_private.before_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE email text; name text;
BEGIN
  PERFORM set_config(''deletion_engine.step'',step,true);
  IF step=''staff_access_revoked'' THEN
    DELETE FROM public.market_invitations WHERE created_by=actor OR used_by=actor
      OR (kind=''owner'' AND market_id IN(SELECT id FROM public.markets WHERE owner_id=actor));
  ELSIF step IN (''staff_attribution_anonymized'',''operational_data_cleaned'') THEN
    SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE id=actor;
    -- Snapshots are derived caches, not the source of owner transaction history.
    DELETE FROM public.snapshots WHERE user_id=actor OR position(actor::text IN data::text)>0
      OR (email IS NOT NULL AND position(email IN data::text)>0);
    IF step=''operational_data_cleaned'' AND kind=''owner'' THEN
      -- Capture/delete owner-global events BEFORE their actor is anonymized.
      DELETE FROM public.events WHERE market_id IS NULL AND (actor_id=actor OR
        coalesce(payload->>''marketId'',payload->>''market_id'') IN(SELECT id::text FROM public.markets WHERE owner_id=actor));
      DELETE FROM public.events_archive WHERE (market_id IS NULL AND actor_id=actor)
        OR market_id IN(SELECT id FROM public.markets WHERE owner_id=actor)
        OR coalesce(payload->>''marketId'',payload->>''market_id'') IN(SELECT id::text FROM public.markets WHERE owner_id=actor);
    END IF;
    UPDATE public.events_archive SET
      actor_id=CASE WHEN actor_id=actor THEN NULL ELSE actor_id END,
      archived_by=CASE WHEN archived_by=actor THEN NULL ELSE archived_by END,
      payload=deletion_engine_private.redact(payload,actor::text,email,name),
      metadata=deletion_engine_private.redact(metadata,actor::text,email,name)
      WHERE actor_id=actor OR archived_by=actor OR position(actor::text IN payload::text)>0
        OR position(actor::text IN metadata::text)>0
        OR (email IS NOT NULL AND (position(email IN payload::text)>0 OR position(email IN metadata::text)>0));
    UPDATE public.preparation_template_applications SET
      actor_id=CASE WHEN actor_id=actor THEN NULL ELSE actor_id END,
      request=deletion_engine_private.redact(request,actor::text,email,name),
      result=deletion_engine_private.redact(result,actor::text,email,name)
      WHERE actor_id=actor OR position(actor::text IN request::text)>0 OR position(actor::text IN result::text)>0;
    UPDATE public.owner_workflow_receipts SET request=deletion_engine_private.redact(request,actor::text,email,name),
      result=deletion_engine_private.redact(result,actor::text,email,name)
      WHERE position(actor::text IN request::text)>0 OR position(actor::text IN result::text)>0;
    IF step=''operational_data_cleaned'' THEN
      DELETE FROM public.pending_operations WHERE status=''synced'' AND (actor_id=actor
        OR (kind=''owner'' AND market_id IN(SELECT id FROM public.markets WHERE owner_id=actor)));
      IF kind=''owner'' THEN
        DELETE FROM public.market_journals WHERE owner_id=actor;
        DELETE FROM public.market_cash_records WHERE owner_id=actor;
        DELETE FROM public.market_financial_reviews WHERE owner_id=actor;
        DELETE FROM public.market_financial_review_receipts WHERE owner_id=actor;
        DELETE FROM public.preparation_template_applications WHERE owner_id=actor;
        DELETE FROM public.preparation_templates WHERE owner_id=actor;
        DELETE FROM public.owner_workflow_receipts WHERE owner_id=actor;
        DELETE FROM public.subscription_test_switch_audit WHERE owner_id=actor;
        DELETE FROM public.subscription_write_guard_owners WHERE owner_id=actor;
        DELETE FROM public.account_entitlements WHERE owner_id=actor;
        -- Shared product belongs to its own brand, even if attached to this market.
        UPDATE public.products SET market_id=NULL WHERE owner_id<>actor AND market_id IN(SELECT id FROM public.markets WHERE owner_id=actor);
      END IF;
    END IF;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION deletion_engine_private.after_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
BEGIN
  IF step=''operational_data_cleaned'' AND kind=''owner'' THEN
    DELETE FROM public.operation_schedules WHERE owner_id=actor;
    DELETE FROM public.venues WHERE owner_id=actor;
  END IF;
END $$;
-- Extra owner data gets the same immediate row fence. Views and all SECURITY
-- DEFINER reads require their own release audit; no claim of production coverage.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[''events_archive'',''market_cash_records'',''market_financial_review_receipts'',''market_financial_reviews'',
    ''market_invitations'',''market_journals'',''operation_schedules'',''owner_workflow_receipts'',''pending_operations'',
    ''preparation_template_applications'',''preparation_templates'',''snapshots'',''subscription_test_switch_audit'',
    ''subscription_write_guard_owners'',''account_entitlements'',''venues''] LOOP
    EXECUTE format(''CREATE TRIGGER deletion_engine_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION deletion_engine_private.write_fence()'',t);
    EXECUTE format(''ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY'',t);
    EXECUTE format(''CREATE POLICY deletion_engine_read_fence ON public.%I AS RESTRICTIVE TO authenticated USING (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I))) WITH CHECK (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I)))'',t,t,t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION deletion_engine_private.prepare_step(uuid,text,text),
  deletion_engine_private.before_step(uuid,text,text),deletion_engine_private.after_step(uuid,text,text)
  FROM PUBLIC,anon,authenticated,service_role;

CREATE SCHEMA deletion_billing_private;
REVOKE ALL ON SCHEMA deletion_billing_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE deletion_billing_private.keys(
  version text PRIMARY KEY CHECK(version ~ ''^[a-z0-9_-]{1,32}$''),
  material bytea NOT NULL CHECK(octet_length(material)>=32)
);
CREATE TABLE deletion_billing_private.subjects(
  id uuid PRIMARY KEY,request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id),
  key_version text NOT NULL REFERENCES deletion_billing_private.keys(version),
  detached_at timestamptz NOT NULL,retain_until timestamptz NOT NULL,
  classification_hash text NOT NULL CHECK(classification_hash ~ ''^[0-9a-f]{64}$''),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  provider_review_pending boolean NOT NULL, CHECK(retain_until>detached_at)
);
CREATE TABLE deletion_billing_private.plans(
  request_id uuid PRIMARY KEY REFERENCES public.account_deletion_requests(id),
  subject_id uuid NOT NULL UNIQUE REFERENCES deletion_billing_private.subjects(id),
  source_hash text NOT NULL,reference_proof_hash text,ready boolean NOT NULL DEFAULT false,
  candidate jsonb,detached boolean NOT NULL DEFAULT false,detached_count integer,
  CHECK(NOT ready OR (candidate IS NOT NULL AND jsonb_typeof(candidate)=''array''))
);
CREATE TABLE deletion_billing_private.records(
  subject_id uuid NOT NULL REFERENCES deletion_billing_private.subjects(id),
  source_table text NOT NULL,record_ref text NOT NULL CHECK(record_ref ~ ''^[0-9a-f]{64}$''),
  evidence jsonb NOT NULL,evidence_hash text NOT NULL CHECK(evidence_hash ~ ''^[0-9a-f]{64}$''),
  PRIMARY KEY(subject_id,source_table,record_ref)
);
CREATE TABLE deletion_billing_private.bindings(
  key_version text NOT NULL REFERENCES deletion_billing_private.keys(version),
  origin text NOT NULL,environment text NOT NULL,kind text NOT NULL,fingerprint text NOT NULL,
  subject_id uuid NOT NULL REFERENCES deletion_billing_private.subjects(id),
  PRIMARY KEY(key_version,origin,environment,kind,fingerprint)
);
CREATE TABLE deletion_billing_private.contexts(
  backend integer NOT NULL,transaction_id bigint NOT NULL,purpose text NOT NULL,
  subject_id uuid NOT NULL,request_id uuid,PRIMARY KEY(backend,transaction_id)
);
CREATE TABLE deletion_billing_private.holds(
  id uuid PRIMARY KEY,subject_id uuid NOT NULL REFERENCES deletion_billing_private.subjects(id),
  evidence_hash text NOT NULL CHECK(evidence_hash ~ ''^[0-9a-f]{64}$''),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),released_at timestamptz
);
CREATE TABLE deletion_billing_private.purge_receipts(
  operation_id uuid PRIMARY KEY,subject_id uuid NOT NULL,expected_revision integer NOT NULL,
  affected_count integer NOT NULL,purged_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE deletion_billing_private.reviews(
  id uuid PRIMARY KEY,subject_id uuid NOT NULL REFERENCES deletion_billing_private.subjects(id),
  revision integer NOT NULL,evidence_hash text NOT NULL CHECK(evidence_hash ~ ''^[0-9a-f]{64}$''),
  previous_deadline timestamptz NOT NULL,new_deadline timestamptz NOT NULL,
  reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(subject_id,revision)
);
CREATE TABLE deletion_billing_private.reference_clearances(
  request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id),source_table text NOT NULL,source_id uuid NOT NULL,
  field_name text NOT NULL,key_version text NOT NULL REFERENCES deletion_billing_private.keys(version),reference_hash text NOT NULL,
  disposition text NOT NULL CHECK(disposition IN(''provider_identifier'',''blob_absence_verified'')),
  evidence_hash text NOT NULL CHECK(evidence_hash ~ ''^[a-f0-9]{64}$''),
  PRIMARY KEY(request_id,source_table,source_id,field_name)
);
REVOKE ALL ON ALL TABLES IN SCHEMA deletion_billing_private FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION deletion_billing_private.fingerprint(version text,purpose text,value text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT encode(extensions.hmac(convert_to(''[''||to_json(''billing-detachment-v1''::text)::text||'',''||to_json(version)::text||'',''||to_json(purpose)::text||'',''||to_json(value)::text||'']'',''UTF8''),material,''sha256''),''hex'')
  FROM deletion_billing_private.keys WHERE keys.version=$1;
$$;
CREATE FUNCTION deletion_billing_private.source_rows(actor uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(''table'',t,''row'',r) ORDER BY t,r->>''id''),''[]'') FROM(
    SELECT ''billing_customer_links'' t,to_jsonb(x) r FROM public.billing_customer_links x WHERE owner_id=actor
    UNION ALL SELECT ''billing_subscriptions'',to_jsonb(x) FROM public.billing_subscriptions x WHERE owner_id=actor
    UNION ALL SELECT ''billing_transactions'',to_jsonb(x) FROM public.billing_transactions x WHERE owner_id=actor
    UNION ALL SELECT ''billing_reconciliation_runs'',to_jsonb(x) FROM public.billing_reconciliation_runs x WHERE owner_id=actor
    UNION ALL SELECT ''subscription_price_assignments'',to_jsonb(x) FROM public.subscription_price_assignments x WHERE owner_id=actor
    UNION ALL SELECT ''billing_event_inbox'',to_jsonb(x)||jsonb_build_object(''owner_id'',actor) FROM public.billing_event_inbox x
      WHERE EXISTS(SELECT 1 FROM public.billing_reconciliation_runs br WHERE br.owner_id=actor AND br.trigger_event_inbox_id=x.id)
  ) rows;
$$;
CREATE FUNCTION deletion_billing_private.source_hash(actor uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT encode(extensions.digest(deletion_billing_private.source_rows(actor)::text,''sha256''),''hex'');
$$;
CREATE FUNCTION deletion_billing_private.lock_sources() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
  LOCK TABLE public.billing_customer_links,public.billing_subscriptions,public.billing_transactions,
    public.billing_reconciliation_runs,public.subscription_price_assignments,public.billing_event_inbox
    IN SHARE ROW EXCLUSIVE MODE;
END$$;
CREATE FUNCTION deletion_billing_private.check_lease(req uuid,token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE r public.account_deletion_requests%ROWTYPE;BEGIN
  IF NOT deletion_release_private.runtime_allowed() THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_local_only'';END IF;
  SELECT * INTO r FROM public.account_deletion_requests WHERE id=req FOR UPDATE;
  IF NOT FOUND OR token IS NULL OR r.lease_token_hash IS NULL OR r.lease_expires_at IS NULL
    OR r.status<>''processing'' OR r.account_kind<>''owner'' OR r.active_actor_id IS NULL
    OR r.identity_confirmed_at IS NULL OR r.lease_expires_at<=clock_timestamp()
    OR r.lease_expires_at>clock_timestamp()+interval ''5 minutes''
    OR r.lease_token_hash IS DISTINCT FROM encode(extensions.digest(token,''sha256''),''hex'')
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_lease_invalid'';END IF;
  IF EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE request_id=req
    AND step_code=''billing_identity_detached'' AND status=''completed'')
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_already_acknowledged'';END IF;
  RETURN r.active_actor_id;
END$$;
CREATE FUNCTION deletion_billing_private.check_inbox(actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
  IF EXISTS(SELECT 1 FROM public.billing_event_inbox i WHERE (
    SELECT count(DISTINCT br.owner_id) FROM public.billing_reconciliation_runs br WHERE br.trigger_event_inbox_id=i.id)<>1)
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_inbox_unclassified'';END IF;
  IF EXISTS(SELECT 1 FROM public.billing_event_inbox i WHERE i.raw_payload_ciphertext_ref IS NOT NULL
    AND EXISTS(SELECT 1 FROM public.billing_reconciliation_runs br WHERE br.owner_id=actor AND br.trigger_event_inbox_id=i.id)
    AND NOT EXISTS(SELECT 1 FROM deletion_billing_private.reference_clearances c JOIN public.account_deletion_requests r ON r.id=c.request_id
      WHERE r.active_actor_id=actor AND c.source_table=''billing_event_inbox'' AND c.source_id=i.id
        AND c.field_name=''raw_payload_ciphertext_ref'' AND c.disposition=''blob_absence_verified''
        AND c.reference_hash=deletion_billing_private.fingerprint(c.key_version,''external-ref:billing_event_inbox:raw_payload_ciphertext_ref'',i.raw_payload_ciphertext_ref)))
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_raw_payload_cleanup_required'';END IF;
  IF EXISTS(SELECT 1 FROM public.billing_reconciliation_runs br WHERE owner_id=actor AND provider_snapshot_ref IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM deletion_billing_private.reference_clearances c JOIN public.account_deletion_requests r ON r.id=c.request_id
      WHERE r.active_actor_id=actor AND c.source_table=''billing_reconciliation_runs'' AND c.source_id=br.id
        AND c.field_name=''provider_snapshot_ref''
        AND c.reference_hash=deletion_billing_private.fingerprint(c.key_version,''external-ref:billing_reconciliation_runs:provider_snapshot_ref'',br.provider_snapshot_ref)))
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_raw_snapshot_cleanup_required'';END IF;
END$$;
CREATE FUNCTION public.bff_clear_billing_reference(req uuid,token text,t text,row_id uuid,f text,disposition text,key_version text,evidence_hash text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE actor uuid;ref text;BEGIN
  actor:=deletion_billing_private.check_lease(req,token);
  IF evidence_hash IS NULL OR evidence_hash !~ ''^[a-f0-9]{64}$'' OR disposition IS NULL
    OR disposition NOT IN(''provider_identifier'',''blob_absence_verified'')
    OR NOT EXISTS(SELECT 1 FROM deletion_billing_private.keys k WHERE k.version=key_version)
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_reference_proof_invalid'';END IF;
  IF t=''billing_reconciliation_runs'' AND f=''provider_snapshot_ref'' THEN
    SELECT provider_snapshot_ref INTO ref FROM public.billing_reconciliation_runs WHERE id=row_id AND owner_id=actor;
  ELSIF t=''billing_event_inbox'' AND f=''raw_payload_ciphertext_ref'' AND disposition=''blob_absence_verified'' THEN
    SELECT raw_payload_ciphertext_ref INTO ref FROM public.billing_event_inbox i WHERE i.id=row_id
      AND EXISTS(SELECT 1 FROM public.billing_reconciliation_runs br WHERE br.owner_id=actor AND br.trigger_event_inbox_id=i.id)
      AND NOT EXISTS(SELECT 1 FROM public.billing_reconciliation_runs br WHERE br.owner_id<>actor AND br.trigger_event_inbox_id=i.id);
  ELSE RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_reference_scope'';END IF;
  IF ref IS NULL THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_reference_missing'';END IF;
  INSERT INTO deletion_billing_private.reference_clearances VALUES(req,t,row_id,f,key_version,
    deletion_billing_private.fingerprint(key_version,''external-ref:''||t||'':''||f,ref),disposition,evidence_hash)
    ON CONFLICT(request_id,source_table,source_id,field_name) DO UPDATE SET key_version=EXCLUDED.key_version,
      reference_hash=EXCLUDED.reference_hash,disposition=EXCLUDED.disposition,evidence_hash=EXCLUDED.evidence_hash;
END$$;
CREATE FUNCTION deletion_billing_private.iso(value text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path='''' AS $$ SELECT CASE WHEN value IS NULL THEN NULL ELSE to_char(value::timestamptz AT TIME ZONE ''UTC'',''YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'') END $$;

-- Independent persistence validation of the shared minimizer. No caller can
-- substitute financial facts, leak an extra field, or choose arbitrary refs.
CREATE FUNCTION deletion_billing_private.expected(table_name text,row_data jsonb,subject uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='''' AS $$
DECLARE s deletion_billing_private.subjects%ROWTYPE; fields text[];dates text[];f text;
  facts jsonb:=''{}'';refs jsonb:=''{}'';purpose text;target text;origin text;environment text;
BEGIN
  SELECT * INTO STRICT s FROM deletion_billing_private.subjects WHERE id=subject;
  origin:=row_data->>''billing_origin'';environment:=row_data->>''provider_environment'';
  IF table_name<>''subscription_price_assignments'' THEN
    facts:=jsonb_build_object(''billing_origin'',origin,''provider_environment'',environment);
  END IF;
  CASE table_name
    WHEN ''billing_customer_links'' THEN fields:=ARRAY[''created_at''];
    WHEN ''billing_subscriptions'' THEN fields:=ARRAY[''normalized_plan_code'',''normalized_cadence'',''normalized_billing_status'',''cancel_at_period_end'',''current_period_starts_at'',''current_period_ends_at'',''provider_observed_at''];
    WHEN ''billing_transactions'' THEN fields:=ARRAY[''transaction_kind'',''transaction_status'',''currency'',''amount_minor'',''provider_effective_at'',''settled_at'',''provider_observed_at''];
    WHEN ''billing_reconciliation_runs'' THEN fields:=ARRAY[''trigger_kind'',''status'',''started_at'',''completed_at''];
    WHEN ''subscription_price_assignments'' THEN fields:=ARRAY[''assigned_plan_code'',''assigned_cadence'',''assigned_currency'',''assigned_amount_minor'',''price_policy'',''assigned_at'',''continuity_started_at'',''dormant_at'',''forfeited_at'',''superseded_at''];
    WHEN ''billing_event_inbox'' THEN fields:=ARRAY[''verification_status'',''event_kind'',''processing_status'',''provider_occurred_at'',''received_at''];
    ELSE RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_source_unclassified'';
  END CASE;
  dates:=ARRAY[''created_at'',''current_period_starts_at'',''current_period_ends_at'',''provider_observed_at'',''provider_effective_at'',''settled_at'',''started_at'',''completed_at'',''assigned_at'',''continuity_started_at'',''dormant_at'',''forfeited_at'',''superseded_at'',''provider_occurred_at'',''received_at''];
  FOREACH f IN ARRAY fields LOOP
    IF f=ANY(dates) THEN facts:=facts||jsonb_build_object(f,deletion_billing_private.iso(row_data->>f));
    ELSE facts:=facts||jsonb_build_object(f,row_data->f);END IF;
  END LOOP;
  FOR f,purpose IN SELECT * FROM (VALUES
    (''provider_customer_ref'',''customer''),(''provider_subscription_ref'',''subscription''),
    (''provider_transaction_ref'',''transaction''),(''provider_parent_transaction_ref'',''transaction''),(''provider_event_ref'',''event'')
  ) p(field,kind) LOOP
    IF row_data->>f IS NOT NULL THEN refs:=refs||jsonb_build_object(f,deletion_billing_private.fingerprint(s.key_version,''provider:''||origin||'':''||environment||'':''||purpose,row_data->>f));END IF;
  END LOOP;
  FOR f,target IN SELECT * FROM (VALUES (''billing_customer_link_id'',''billing_customer_links''),
    (''billing_subscription_id'',''billing_subscriptions''),(''trigger_event_inbox_id'',''billing_event_inbox'')) p(field,t) LOOP
    IF row_data->>f IS NOT NULL THEN refs:=refs||jsonb_build_object(f,deletion_billing_private.fingerprint(s.key_version,''record:''||target,row_data->>f));END IF;
  END LOOP;
  IF table_name=''subscription_price_assignments'' AND row_data->>''source_reference'' IS NOT NULL THEN
    refs:=refs||jsonb_build_object(''source_reference'',deletion_billing_private.fingerprint(s.key_version,''assignment-evidence'',row_data->>''source_reference''));
  END IF;
  RETURN jsonb_build_object(''billingSubjectId'',s.id,''sourceTable'',table_name,
    ''recordRef'',deletion_billing_private.fingerprint(s.key_version,''record:''||table_name,row_data->>''id''),
    ''detachedAt'',deletion_billing_private.iso(s.detached_at::text),''retainUntil'',deletion_billing_private.iso(s.retain_until::text),
    ''keyVersion'',s.key_version,''facts'',facts,''refs'',refs);
END$$;

CREATE FUNCTION public.bff_prepare_billing_detachment(req uuid,token text,until_at timestamptz,key_version text,classification_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE actor uuid;s deletion_billing_private.subjects%ROWTYPE;p deletion_billing_private.plans%ROWTYPE;rows jsonb;pending boolean;
BEGIN
  actor:=deletion_billing_private.check_lease(req,token);PERFORM deletion_billing_private.lock_sources();
  PERFORM deletion_billing_private.check_inbox(actor);
  IF until_at IS NULL OR classification_hash IS NULL OR key_version IS NULL
    OR until_at<=clock_timestamp() OR until_at>clock_timestamp()+interval ''5 years''
    OR classification_hash !~ ''^[a-f0-9]{64}$'' OR NOT EXISTS(SELECT 1 FROM deletion_billing_private.keys k WHERE k.version=key_version)
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_retention_not_reviewed'';END IF;
  SELECT * INTO p FROM deletion_billing_private.plans WHERE request_id=req FOR UPDATE;
  IF FOUND AND p.detached THEN RETURN jsonb_build_object(''outcome'',''already_detached'');END IF;
  rows:=deletion_billing_private.source_rows(actor);
  IF jsonb_array_length(rows)>1000 THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_batch_limit'';END IF;
  IF rows=''[]''::jsonb THEN
    IF EXISTS(SELECT 1 FROM public.subscription_accounts WHERE owner_id=actor AND billing_status<>''none'')
      THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_activity_unclassified'';END IF;
    RETURN jsonb_build_object(''outcome'',''not_required'');
  END IF;
  pending:=EXISTS(SELECT 1 FROM public.billing_subscriptions WHERE owner_id=actor AND normalized_billing_status NOT IN(''cancelled'',''expired'',''refunded''))
    OR EXISTS(SELECT 1 FROM public.billing_reconciliation_runs WHERE owner_id=actor AND status=''running'')
    OR EXISTS(SELECT 1 FROM public.billing_event_inbox i WHERE processing_status NOT IN(''processed'',''ignored'',''terminal_failed'')
      AND EXISTS(SELECT 1 FROM public.billing_reconciliation_runs br WHERE br.owner_id=actor AND br.trigger_event_inbox_id=i.id));
  IF p.request_id IS NULL THEN
    INSERT INTO deletion_billing_private.subjects VALUES(gen_random_uuid(),req,key_version,clock_timestamp(),until_at,classification_hash,1,pending) RETURNING * INTO s;
    INSERT INTO deletion_billing_private.plans(request_id,subject_id,source_hash) VALUES(req,s.id,deletion_billing_private.source_hash(actor)) RETURNING * INTO p;
  ELSE
    SELECT * INTO s FROM deletion_billing_private.subjects WHERE id=p.subject_id FOR UPDATE;
    IF s.key_version<>key_version OR s.retain_until<>until_at OR s.classification_hash<>classification_hash
      THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_plan_policy_changed'';END IF;
    IF pending AND NOT s.provider_review_pending THEN
      INSERT INTO deletion_billing_private.contexts VALUES(pg_backend_pid(),txid_current(),''risk_escalation'',s.id,req);
      UPDATE deletion_billing_private.subjects SET provider_review_pending=true,revision=revision+1 WHERE id=s.id RETURNING * INTO s;
      DELETE FROM deletion_billing_private.contexts WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
    END IF;
    UPDATE deletion_billing_private.plans SET source_hash=deletion_billing_private.source_hash(actor),ready=false,candidate=NULL WHERE request_id=req RETURNING * INTO p;
  END IF;
  RETURN jsonb_build_object(''outcome'',''prepared'',''actorId'',actor,''subjectId'',s.id,''keyVersion'',s.key_version,
    ''detachedAt'',deletion_billing_private.iso(s.detached_at::text),''retainUntil'',deletion_billing_private.iso(s.retain_until::text),
    ''sourceHash'',p.source_hash,''externalReferencesCleared'',true,''sources'',rows);
END$$;
CREATE FUNCTION public.bff_stage_billing_detachment(req uuid,token text,source_hash text,records jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE actor uuid;p deletion_billing_private.plans%ROWTYPE;row jsonb;candidate jsonb;expected jsonb;seen text[]:=''{}'';k text;
BEGIN
  actor:=deletion_billing_private.check_lease(req,token);PERFORM deletion_billing_private.lock_sources();
  PERFORM deletion_billing_private.check_inbox(actor);
  SELECT * INTO STRICT p FROM deletion_billing_private.plans WHERE request_id=req FOR UPDATE;
  IF p.detached OR p.source_hash IS DISTINCT FROM source_hash OR deletion_billing_private.source_hash(actor) IS DISTINCT FROM source_hash
    OR records IS NULL OR jsonb_typeof(records) IS DISTINCT FROM ''array'' OR jsonb_array_length(records)>1000
    OR jsonb_array_length(records)<>jsonb_array_length(deletion_billing_private.source_rows(actor))
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_source_changed'';END IF;
  FOR row IN SELECT value FROM jsonb_array_elements(deletion_billing_private.source_rows(actor)) LOOP
    expected:=deletion_billing_private.expected(row->>''table'',row->''row'',p.subject_id);
    SELECT value INTO candidate FROM jsonb_array_elements(records) WHERE value->>''sourceTable''=expected->>''sourceTable'' AND value->>''recordRef''=expected->>''recordRef'';
    k:=expected->>''sourceTable''||'':''||(expected->>''recordRef'');
    IF NOT FOUND OR candidate IS DISTINCT FROM expected OR k=ANY(seen)
      THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_evidence_mismatch'';END IF;
    seen:=array_append(seen,k);
  END LOOP;
  UPDATE deletion_billing_private.plans SET ready=true,candidate=records WHERE request_id=req;
  RETURN jsonb_build_object(''outcome'',''staged'',''count'',jsonb_array_length(records));
END$$;

CREATE OR REPLACE FUNCTION deletion_engine_private.billing_ready(actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT EXISTS(SELECT 1 FROM deletion_billing_private.plans p
    JOIN deletion_billing_private.subjects s ON s.id=p.subject_id JOIN public.account_deletion_requests r ON r.id=p.request_id
    WHERE r.active_actor_id=actor AND p.ready AND (p.detached OR (s.retain_until>clock_timestamp() AND p.source_hash=deletion_billing_private.source_hash(actor))));
$$;
CREATE FUNCTION deletion_billing_private.authorize_delete(t text,old_row jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT EXISTS(SELECT 1 FROM deletion_billing_private.contexts c
    JOIN deletion_billing_private.subjects s ON s.id=c.subject_id
    JOIN public.account_deletion_requests r ON r.id=c.request_id
    JOIN deletion_billing_private.records e ON e.subject_id=s.id AND e.source_table=t
      AND e.record_ref=deletion_billing_private.fingerprint(s.key_version,''record:''||t,old_row->>''id'')
    WHERE c.backend=pg_backend_pid() AND c.transaction_id=txid_current() AND c.purpose=''detach''
      AND r.status=''processing'' AND r.lease_expires_at>clock_timestamp()
      AND r.lease_token_hash=encode(extensions.digest(current_setting(''deletion_engine.lease'',true),''sha256''),''hex'')
      AND current_setting(''deletion_engine.step'',true)=''billing_identity_detached''
      AND (t=''billing_event_inbox'' OR old_row->>''owner_id''=r.active_actor_id::text));
$$;
CREATE FUNCTION deletion_billing_private.source_boundary() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE f text;v_kind text;k record;row_data jsonb;
BEGIN
  IF TG_OP=''DELETE'' THEN
    IF deletion_billing_private.authorize_delete(TG_TABLE_NAME,to_jsonb(OLD)) THEN RETURN OLD;END IF;
    RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_delete_not_authorized'';
  END IF;
  row_data:=to_jsonb(NEW);
  IF NOT deletion_engine_private.record_enabled(row_data) THEN
    RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_owner_frozen'';END IF;
  FOR f,v_kind IN SELECT * FROM(VALUES(''provider_customer_ref'',''customer''),(''provider_subscription_ref'',''subscription''),
    (''provider_transaction_ref'',''transaction''),(''provider_parent_transaction_ref'',''transaction''),(''provider_event_ref'',''event''))p(field,k) LOOP
    IF row_data->>f IS NOT NULL THEN
      FOR k IN SELECT version FROM deletion_billing_private.keys LOOP
        IF EXISTS(SELECT 1 FROM deletion_billing_private.bindings b WHERE b.key_version=k.version
          AND b.origin=row_data->>''billing_origin'' AND b.environment=row_data->>''provider_environment'' AND b.kind=v_kind
          AND b.fingerprint=deletion_billing_private.fingerprint(k.version,''provider:''||b.origin||'':''||b.environment||'':''||v_kind,row_data->>f))
        THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_binding_retired'';END IF;
      END LOOP;
    END IF;
  END LOOP;
  RETURN NEW;
END$$;
DO $$DECLARE t text;BEGIN
  FOREACH t IN ARRAY ARRAY[''billing_customer_links'',''billing_subscriptions'',''billing_transactions'',''billing_reconciliation_runs'',''subscription_price_assignments'',''billing_event_inbox''] LOOP
    EXECUTE format(''CREATE TRIGGER a00_billing_detachment_boundary BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.source_boundary()'',t);
  END LOOP;
END$$;

CREATE OR REPLACE FUNCTION deletion_engine_private.detach_billing(actor uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE p deletion_billing_private.plans%ROWTYPE;s deletion_billing_private.subjects%ROWTYPE;
  item jsonb;pair record;v_kind text;inbox_ids uuid[];n integer:=0;
BEGIN
  SELECT p0.* INTO p FROM deletion_billing_private.plans p0 JOIN public.account_deletion_requests r ON r.id=p0.request_id WHERE r.active_actor_id=actor FOR UPDATE OF p0;
  IF NOT FOUND THEN
    IF deletion_billing_private.source_rows(actor)<>''[]''::jsonb THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_plan_required'';END IF;
    RETURN 0;
  END IF;
  IF p.detached THEN RETURN p.detached_count;END IF;
  SELECT * INTO STRICT s FROM deletion_billing_private.subjects WHERE id=p.subject_id FOR UPDATE;
  PERFORM deletion_billing_private.lock_sources();PERFORM deletion_billing_private.check_inbox(actor);
  IF NOT p.ready OR p.source_hash<>deletion_billing_private.source_hash(actor) OR s.retain_until<=clock_timestamp()
    OR current_setting(''deletion_engine.step'',true)<>''billing_identity_detached''
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_stage_stale'';END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p.candidate) LOOP
    INSERT INTO deletion_billing_private.records VALUES(s.id,item->>''sourceTable'',item->>''recordRef'',item,encode(extensions.digest(item::text,''sha256''),''hex''));
    FOR pair IN SELECT * FROM jsonb_each_text(item->''refs'') LOOP
      v_kind:=CASE pair.key WHEN ''provider_customer_ref'' THEN ''customer'' WHEN ''provider_subscription_ref'' THEN ''subscription''
        WHEN ''provider_transaction_ref'' THEN ''transaction'' WHEN ''provider_parent_transaction_ref'' THEN ''transaction'' WHEN ''provider_event_ref'' THEN ''event'' END;
      IF v_kind IS NOT NULL THEN
        IF EXISTS(SELECT 1 FROM deletion_billing_private.bindings WHERE key_version=s.key_version AND origin=item#>>''{facts,billing_origin}''
          AND environment=item#>>''{facts,provider_environment}'' AND bindings.kind=v_kind AND fingerprint=pair.value AND subject_id<>s.id)
        THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_cross_subject_binding'';END IF;
        INSERT INTO deletion_billing_private.bindings VALUES(s.key_version,item#>>''{facts,billing_origin}'',item#>>''{facts,provider_environment}'',v_kind,pair.value,s.id) ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
    n:=n+1;
  END LOOP;
  SELECT array_agg(i.id) INTO inbox_ids FROM public.billing_event_inbox i WHERE EXISTS(SELECT 1 FROM public.billing_reconciliation_runs br WHERE br.owner_id=actor AND br.trigger_event_inbox_id=i.id);
  INSERT INTO deletion_billing_private.contexts VALUES(pg_backend_pid(),txid_current(),''detach'',s.id,p.request_id);
  DELETE FROM public.billing_transactions WHERE owner_id=actor;
  DELETE FROM public.billing_reconciliation_runs WHERE owner_id=actor;
  DELETE FROM public.subscription_price_assignments WHERE owner_id=actor;
  DELETE FROM public.billing_subscriptions WHERE owner_id=actor;
  DELETE FROM public.billing_customer_links WHERE owner_id=actor;
  DELETE FROM public.billing_event_inbox WHERE id=ANY(coalesce(inbox_ids,''{}''::uuid[]));
  IF deletion_billing_private.source_rows(actor)<>''[]''::jsonb THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_source_remaining'';END IF;
  DELETE FROM deletion_billing_private.contexts WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
  UPDATE deletion_billing_private.plans SET detached=true,detached_count=n,reference_proof_hash=(
    SELECT encode(extensions.digest(coalesce(jsonb_agg(jsonb_build_object(''table'',c.source_table,''record'',
      deletion_billing_private.fingerprint(c.key_version,''record:''||c.source_table,c.source_id::text),
      ''ref'',c.reference_hash,''disposition'',c.disposition,''evidence'',c.evidence_hash) ORDER BY c.source_table,c.source_id),''[]'')::text,''sha256''),''hex'')
    FROM deletion_billing_private.reference_clearances c WHERE c.request_id=p.request_id
  ) WHERE request_id=p.request_id;
  DELETE FROM deletion_billing_private.reference_clearances WHERE request_id=p.request_id;
  RETURN n;
END$$;

CREATE FUNCTION deletion_billing_private.protect_retained() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE subject uuid;
BEGIN
  subject:=CASE TG_TABLE_NAME WHEN ''subjects'' THEN (to_jsonb(OLD)->>''id'')::uuid ELSE (to_jsonb(OLD)->>''subject_id'')::uuid END;
  IF TG_OP=''DELETE'' AND EXISTS(SELECT 1 FROM deletion_billing_private.contexts c WHERE c.backend=pg_backend_pid()
    AND c.transaction_id=txid_current() AND c.purpose=''purge'' AND c.subject_id=subject) THEN RETURN OLD;END IF;
  RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_retained_immutable'';
END$$;
CREATE TRIGGER protect_records BEFORE UPDATE OR DELETE ON deletion_billing_private.records FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.protect_retained();
CREATE TRIGGER protect_bindings BEFORE UPDATE OR DELETE ON deletion_billing_private.bindings FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.protect_retained();
-- Subject changes go through explicit review operations; purge is the only delete.
CREATE TRIGGER protect_subject_delete BEFORE DELETE ON deletion_billing_private.subjects FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.protect_retained();
CREATE TRIGGER protect_reviews BEFORE UPDATE OR DELETE ON deletion_billing_private.reviews FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.protect_retained();
CREATE FUNCTION deletion_billing_private.protect_subject_update() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
  IF EXISTS(SELECT 1 FROM deletion_billing_private.contexts WHERE backend=pg_backend_pid() AND transaction_id=txid_current()
    AND purpose=''risk_escalation'' AND subject_id=OLD.id)
    AND NOT OLD.provider_review_pending AND NEW.provider_review_pending AND NEW.revision=OLD.revision+1
    AND to_jsonb(NEW)-''revision''-''provider_review_pending'' IS NOT DISTINCT FROM to_jsonb(OLD)-''revision''-''provider_review_pending''
  THEN RETURN NEW;END IF;
  IF NOT EXISTS(SELECT 1 FROM deletion_billing_private.contexts WHERE backend=pg_backend_pid()
      AND transaction_id=txid_current() AND purpose=''review'' AND subject_id=OLD.id)
    OR to_jsonb(NEW)-''revision''-''retain_until''-''provider_review_pending'' IS DISTINCT FROM to_jsonb(OLD)-''revision''-''retain_until''-''provider_review_pending''
    OR NEW.revision<>OLD.revision+1 OR NEW.retain_until<OLD.retain_until OR NEW.provider_review_pending
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_subject_review_required'';END IF;
  RETURN NEW;
END$$;
CREATE TRIGGER protect_subject_update BEFORE UPDATE ON deletion_billing_private.subjects FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.protect_subject_update();
CREATE FUNCTION deletion_billing_private.protect_key() RETURNS trigger
LANGUAGE plpgsql SET search_path='''' AS $$BEGIN
  IF TG_OP=''UPDATE'' THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_key_version_immutable'';END IF;
  RETURN OLD;
END$$;
CREATE TRIGGER protect_key BEFORE UPDATE OR DELETE ON deletion_billing_private.keys FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.protect_key();
CREATE FUNCTION deletion_billing_private.protect_receipt() RETURNS trigger
LANGUAGE plpgsql SET search_path='''' AS $$BEGIN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_purge_receipt_immutable'';END$$;
CREATE TRIGGER protect_receipt BEFORE UPDATE OR DELETE ON deletion_billing_private.purge_receipts FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.protect_receipt();
CREATE FUNCTION deletion_billing_private.hold_lock() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
  PERFORM 1 FROM deletion_billing_private.subjects WHERE id=NEW.subject_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_subject_missing'';END IF;
  RETURN NEW;
END$$;
CREATE TRIGGER serialize_hold BEFORE INSERT OR UPDATE ON deletion_billing_private.holds FOR EACH ROW EXECUTE FUNCTION deletion_billing_private.hold_lock();

-- Records a prior verified closure/review. It does NOT call a provider or cancel a store subscription.
CREATE FUNCTION public.bff_review_detached_billing(subject uuid,expected_revision integer,operation uuid,new_deadline timestamptz,evidence_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE s deletion_billing_private.subjects%ROWTYPE;prior deletion_billing_private.reviews%ROWTYPE;
BEGIN
  IF NOT deletion_release_private.runtime_allowed() OR operation IS NULL OR expected_revision IS NULL OR evidence_hash IS NULL
    OR evidence_hash !~ ''^[a-f0-9]{64}$'' OR new_deadline IS NULL THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_review_invalid'';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(operation::text,8));
  SELECT * INTO prior FROM deletion_billing_private.reviews WHERE id=operation;
  IF FOUND THEN
    IF prior.subject_id IS DISTINCT FROM subject OR prior.revision IS DISTINCT FROM expected_revision+1
      OR prior.new_deadline IS DISTINCT FROM new_deadline OR prior.evidence_hash IS DISTINCT FROM evidence_hash
    THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_review_replay_conflict'';END IF;
    RETURN jsonb_build_object(''outcome'',''reviewed'',''revision'',prior.revision);
  END IF;
  SELECT * INTO s FROM deletion_billing_private.subjects WHERE id=subject FOR UPDATE;
  IF NOT FOUND OR s.revision IS DISTINCT FROM expected_revision OR new_deadline<s.retain_until
    OR new_deadline>clock_timestamp()+interval ''5 years''
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_review_conflict'';END IF;
  INSERT INTO deletion_billing_private.contexts VALUES(pg_backend_pid(),txid_current(),''review'',subject,s.request_id);
  UPDATE deletion_billing_private.subjects SET revision=revision+1,provider_review_pending=false,retain_until=new_deadline WHERE id=subject;
  DELETE FROM deletion_billing_private.contexts WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
  INSERT INTO deletion_billing_private.reviews(id,subject_id,revision,evidence_hash,previous_deadline,new_deadline)
    VALUES(operation,subject,s.revision+1,evidence_hash,s.retain_until,new_deadline);
  RETURN jsonb_build_object(''outcome'',''reviewed'',''revision'',s.revision+1);
END$$;

CREATE FUNCTION public.bff_purge_detached_billing(subject uuid,expected_revision integer,operation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE s deletion_billing_private.subjects%ROWTYPE;receipt deletion_billing_private.purge_receipts%ROWTYPE;n integer;
BEGIN
  IF NOT deletion_release_private.runtime_allowed() THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_local_only'';END IF;
  IF operation IS NULL OR expected_revision IS NULL OR expected_revision<1 THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_purge_input_invalid'';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(operation::text,7));
  SELECT * INTO receipt FROM deletion_billing_private.purge_receipts WHERE operation_id=operation;
  IF FOUND THEN
    IF receipt.subject_id IS DISTINCT FROM subject OR receipt.expected_revision IS DISTINCT FROM expected_revision THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_purge_idempotency_conflict'';END IF;
    RETURN jsonb_build_object(''outcome'',''purged'',''count'',receipt.affected_count);
  END IF;
  SELECT * INTO s FROM deletion_billing_private.subjects WHERE id=subject FOR UPDATE;
  IF NOT FOUND OR s.revision<>expected_revision THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''billing_subject_conflict'';END IF;
  IF s.retain_until>clock_timestamp() THEN RETURN jsonb_build_object(''outcome'',''not_due'');END IF;
  IF s.provider_review_pending OR EXISTS(SELECT 1 FROM deletion_billing_private.holds WHERE subject_id=subject AND released_at IS NULL)
    OR NOT EXISTS(SELECT 1 FROM public.account_deletion_requests WHERE id=s.request_id AND status=''completed'' AND active_actor_id IS NULL)
  THEN RETURN jsonb_build_object(''outcome'',''held'');END IF;
  INSERT INTO deletion_billing_private.contexts VALUES(pg_backend_pid(),txid_current(),''purge'',subject,s.request_id);
  DELETE FROM deletion_billing_private.records WHERE subject_id=subject;GET DIAGNOSTICS n=ROW_COUNT;
  DELETE FROM deletion_billing_private.bindings WHERE subject_id=subject;
  DELETE FROM deletion_billing_private.holds WHERE subject_id=subject;
  DELETE FROM deletion_billing_private.reviews WHERE subject_id=subject;
  DELETE FROM deletion_billing_private.plans WHERE subject_id=subject;
  DELETE FROM deletion_billing_private.subjects WHERE id=subject;
  DELETE FROM deletion_billing_private.contexts WHERE backend=pg_backend_pid() AND transaction_id=txid_current();
  INSERT INTO deletion_billing_private.purge_receipts(operation_id,subject_id,expected_revision,affected_count) VALUES(operation,subject,expected_revision,n);
  RETURN jsonb_build_object(''outcome'',''purged'',''count'',n);
END$$;
CREATE FUNCTION public.bff_check_retired_billing_binding(origin text,environment text,kind text,provider_ref text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
  SELECT jsonb_build_object(''outcome'',CASE WHEN EXISTS(SELECT 1 FROM deletion_billing_private.bindings b
    WHERE b.origin=$1 AND b.environment=$2 AND b.kind=$3
      AND b.fingerprint=deletion_billing_private.fingerprint(b.key_version,''provider:''||$1||'':''||$2||'':''||$3,$4))
    THEN ''retired'' ELSE ''unknown_requires_review'' END,''automaticBindingAllowed'',false);
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA deletion_billing_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_prepare_billing_detachment(uuid,text,timestamptz,text,text),
  public.bff_stage_billing_detachment(uuid,text,text,jsonb),public.bff_purge_detached_billing(uuid,integer,uuid),
  public.bff_check_retired_billing_binding(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_prepare_billing_detachment(uuid,text,timestamptz,text,text),
  public.bff_stage_billing_detachment(uuid,text,text,jsonb),public.bff_purge_detached_billing(uuid,integer,uuid),
  public.bff_check_retired_billing_binding(text,text,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.bff_review_detached_billing(uuid,integer,uuid,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_review_detached_billing(uuid,integer,uuid,timestamptz,text) TO service_role;
REVOKE ALL ON FUNCTION public.bff_clear_billing_reference(uuid,text,text,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_clear_billing_reference(uuid,text,text,uuid,text,text,text,text) TO service_role;

CREATE FUNCTION deletion_engine_private.worker_matches(actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
 SELECT EXISTS(SELECT 1 FROM public.account_deletion_requests r WHERE r.active_actor_id=actor
  AND r.id::text=current_setting(''deletion_engine.request'',true) AND r.status=''processing''
  AND r.identity_confirmed_at IS NOT NULL AND r.preflight_resolution IS NOT NULL
  AND r.lease_expires_at>clock_timestamp() AND r.lease_expires_at<=clock_timestamp()+interval ''5 minutes''
  AND r.lease_token_hash=encode(extensions.digest(current_setting(''deletion_engine.lease'',true),''sha256''),''hex'')
  AND current_setting(''deletion_engine.step'',true)=(
    SELECT code FROM unnest(CASE r.account_kind WHEN ''owner'' THEN ARRAY[''access_frozen'',''staff_access_revoked'',''object_manifest_built'',
      ''r2_objects_deleted'',''r2_absence_verified'',''billing_identity_detached'',''operational_data_cleaned'',''profile_deleted'',''auth_user_deleted'',''sessions_revoked'']
    ELSE ARRAY[''access_frozen'',''staff_access_revoked'',''staff_attribution_anonymized'',''operational_data_cleaned'',''profile_deleted'',''auth_user_deleted'',''sessions_revoked''] END)
      WITH ORDINALITY AS u(code,ord) WHERE NOT EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps s
        WHERE s.request_id=r.id AND s.step_code=code AND s.status=''completed'') ORDER BY ord LIMIT 1));
$$;
CREATE FUNCTION deletion_engine_private.identity_allowed(actor uuid,worker boolean DEFAULT true) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
 SELECT actor IS NULL OR NOT EXISTS(SELECT 1 FROM deletion_engine_private.frozen WHERE actor_hash=encode(extensions.digest(actor::text,''sha256''),''hex''))
   OR (worker AND deletion_engine_private.worker_matches(actor));
$$;
CREATE FUNCTION deletion_engine_private.reference_allowed(kind text,value jsonb,allow_worker boolean DEFAULT true) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='''' AS $$
#variable_conflict use_variable
DECLARE id uuid;owner uuid;staff uuid;item jsonb;k text;v jsonb;name text;
BEGIN
 IF value IS NULL OR value=''null''::jsonb OR kind=''none'' THEN RETURN true;END IF;
 IF jsonb_typeof(value)=''array'' THEN
  FOR item IN SELECT x FROM jsonb_array_elements(value)x LOOP IF NOT deletion_engine_private.reference_allowed(kind,item,allow_worker) THEN RETURN false;END IF;END LOOP;RETURN true;
 END IF;
 IF kind=''json'' THEN
  IF jsonb_typeof(value)<>''object'' THEN RETURN true;END IF;
  FOR k,v IN SELECT * FROM jsonb_each(value) LOOP
   name:=CASE k WHEN ''ownerId'' THEN ''identity'' WHEN ''owner_id'' THEN ''identity''
    WHEN ''marketId'' THEN ''market'' WHEN ''market_id'' THEN ''market'' WHEN ''productId'' THEN ''product'' WHEN ''product_id'' THEN ''product''
    WHEN ''venueId'' THEN ''venue'' WHEN ''venue_id'' THEN ''venue'' WHEN ''scheduleId'' THEN ''schedule'' WHEN ''schedule_id'' THEN ''schedule''
    WHEN ''journalId'' THEN ''journal'' WHEN ''templateId'' THEN ''template'' ELSE ''json'' END;
   IF NOT deletion_engine_private.reference_allowed(name,v,allow_worker) THEN RETURN false;END IF;
  END LOOP;RETURN true;
 END IF;
 IF jsonb_typeof(value)<>''string'' THEN RETURN true;END IF;
 IF kind=''token'' THEN
  IF EXISTS(SELECT 1 FROM public.staff_invitations si WHERE si.token=value#>>''{}'' AND NOT deletion_engine_private.identity_allowed(si.owner_id)) THEN RETURN false;END IF;
  IF EXISTS(SELECT 1 FROM public.market_invitations i JOIN public.markets m ON m.id=i.market_id WHERE i.code=value#>>''{}'' AND NOT deletion_engine_private.identity_allowed(m.owner_id)) THEN RETURN false;END IF;
  RETURN true;
 END IF;
 IF kind=''operation'' THEN
  RETURN NOT EXISTS(SELECT 1 FROM public.pending_operations p JOIN public.markets m ON m.id=p.market_id WHERE p.operation_id=value#>>''{}''
    AND (NOT deletion_engine_private.identity_allowed(m.owner_id) OR NOT deletion_engine_private.identity_allowed(p.actor_id)));
 END IF;
 IF value#>>''{}'' !~* ''^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'' THEN RETURN true;END IF;
 id:=(value#>>''{}'')::uuid;
 CASE kind
  WHEN ''identity'' THEN RETURN deletion_engine_private.identity_allowed(id,allow_worker);
  WHEN ''market'' THEN SELECT owner_id INTO owner FROM public.markets WHERE markets.id=id;
  WHEN ''product'' THEN SELECT owner_id INTO owner FROM public.products WHERE products.id=id;
  WHEN ''event'' THEN
    SELECT coalesce(m.owner_id,p.owner_id,e.actor_id) INTO owner FROM public.events e LEFT JOIN public.markets m ON m.id=e.market_id
     LEFT JOIN public.products p ON p.id::text=coalesce(e.payload->>''productId'',e.payload->>''product_id'') WHERE e.id=id;
  WHEN ''photo'' THEN
    SELECT owner_id INTO owner FROM public.sale_photo_evidence WHERE sale_photo_evidence.id=id;
    IF NOT FOUND THEN SELECT owner_id INTO owner FROM public.product_cover_photos WHERE product_cover_photos.id=id;END IF;
  WHEN ''journal'' THEN SELECT owner_id INTO owner FROM public.market_journals WHERE market_journals.id=id;
  WHEN ''template'' THEN SELECT owner_id INTO owner FROM public.preparation_templates WHERE preparation_templates.id=id;
  WHEN ''venue'' THEN SELECT owner_id INTO owner FROM public.venues WHERE venues.id=id;
  WHEN ''schedule'' THEN SELECT owner_id INTO owner FROM public.operation_schedules WHERE operation_schedules.id=id;
  WHEN ''relationship'' THEN SELECT owner_id,staff_id INTO owner,staff FROM public.staff_relationships WHERE staff_relationships.id=id;
  WHEN ''invitation'' THEN SELECT owner_id INTO owner FROM public.staff_invitations WHERE staff_invitations.id=id;
  ELSE RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''deletion_reference_unclassified'';
 END CASE;
 RETURN deletion_engine_private.identity_allowed(owner,allow_worker) AND deletion_engine_private.identity_allowed(staff,allow_worker);
END$$;
CREATE FUNCTION deletion_engine_private.rpc_allowed(args jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='''' AS $$DECLARE a jsonb;BEGIN
 IF NOT deletion_engine_private.identity_allowed(auth.uid(),false) THEN RETURN false;END IF;
 FOR a IN SELECT x FROM jsonb_array_elements(args)x LOOP
  IF NOT deletion_engine_private.reference_allowed(a->>''kind'',a->''value'') THEN RETURN false;END IF;
 END LOOP;RETURN true;
END$$;
CREATE FUNCTION deletion_engine_private.assert_rpc(args jsonb) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='''' AS $$BEGIN
 IF NOT deletion_engine_private.rpc_allowed(args) THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''account_deletion_access_frozen'';END IF;
END$$;

-- Preserve the original staff masks and definer view semantics. Force explicit
-- owner/caller filtering instead of breaking staff access by assuming invoker RLS.
CREATE FUNCTION deletion_engine_private.visible_row(r jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='''' AS $$
#variable_conflict use_variable
DECLARE owner uuid;id text;BEGIN
 IF NOT deletion_engine_private.identity_allowed(auth.uid(),false) THEN RETURN false;END IF;
 IF r->>''relationship_owner_id'' IS NOT NULL THEN owner:=(r->>''relationship_owner_id'')::uuid;
 ELSIF r->>''owner_id'' IS NOT NULL THEN owner:=(r->>''owner_id'')::uuid;
 ELSIF r->>''market_id'' IS NOT NULL THEN SELECT owner_id INTO owner FROM public.markets WHERE markets.id=(r->>''market_id'')::uuid;
 ELSE
  id:=coalesce(r#>>''{payload,productId}'',r#>>''{payload,product_id}'');
  SELECT owner_id INTO owner FROM public.products WHERE products.id::text=id;
  IF owner IS NULL AND r->>''actor_id'' IS NOT NULL THEN owner:=(r->>''actor_id'')::uuid;END IF;
 END IF;
 RETURN deletion_engine_private.identity_allowed(owner,false);
END$$;

CREATE FUNCTION deletion_engine_private.worker_row(t text,old_r jsonb,new_r jsonb,op text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='''' AS $$DECLARE actor uuid;step text;owner uuid;email text;name text;BEGIN
 SELECT active_actor_id INTO actor FROM public.account_deletion_requests WHERE id::text=current_setting(''deletion_engine.request'',true);
 IF NOT deletion_engine_private.worker_matches(actor) THEN RETURN false;END IF;
 step:=current_setting(''deletion_engine.step'',true);
 owner:=nullif(old_r->>''owner_id'','''')::uuid;
 IF owner IS NOT NULL AND owner<>actor AND NOT deletion_engine_private.identity_allowed(owner,false) THEN RETURN false;END IF;
 SELECT owner_id INTO owner FROM public.markets WHERE id::text=old_r->>''market_id'';
 IF owner IS NOT NULL AND owner<>actor AND NOT deletion_engine_private.identity_allowed(owner,false) THEN RETURN false;END IF;
 IF op=''DELETE'' AND ((step=''staff_access_revoked'' AND t IN(''staff_relationships'',''staff_invitations'',''market_members'',''market_invitations''))
   OR (step=''profile_deleted'' AND t=''profiles'') OR (step=''operational_data_cleaned'' AND t<>''profiles'')
   OR (step=''staff_attribution_anonymized'' AND t=''snapshots'')) THEN
  IF old_r->>''owner_id''=actor::text OR old_r->>''user_id''=actor::text OR (t=''profiles'' AND old_r->>''id''=actor::text)
    OR (t=''staff_relationships'' AND old_r->>''staff_id''=actor::text) THEN RETURN true;END IF;
  IF t=''events'' AND deletion_engine_private.authorize_event_change(old_r,NULL,''DELETE'') THEN RETURN true;END IF;
  IF old_r->>''market_id'' IN(SELECT id::text FROM public.markets WHERE owner_id=actor) THEN RETURN true;END IF;
 END IF;
 IF op=''UPDATE'' AND step IN(''staff_attribution_anonymized'',''operational_data_cleaned'') THEN
  IF t=''events'' AND deletion_engine_private.authorize_event_change(old_r,new_r,op) THEN RETURN true;END IF;
  SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE p.id=actor;
  IF t=''events_archive'' AND new_r-''actor_id''-''archived_by''-''payload''-''metadata'' IS NOT DISTINCT FROM old_r-''actor_id''-''archived_by''-''payload''-''metadata''
   AND new_r->''actor_id'' IS NOT DISTINCT FROM (CASE WHEN old_r->>''actor_id''=actor::text THEN ''null''::jsonb ELSE old_r->''actor_id'' END)
   AND new_r->''archived_by'' IS NOT DISTINCT FROM (CASE WHEN old_r->>''archived_by''=actor::text THEN ''null''::jsonb ELSE old_r->''archived_by'' END)
   AND new_r->''payload'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->''payload'',actor::text,email,name)
   AND new_r->''metadata'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->''metadata'',actor::text,email,name) THEN RETURN true;END IF;
  IF t=''preparation_template_applications'' AND new_r-''actor_id''-''request''-''result'' IS NOT DISTINCT FROM old_r-''actor_id''-''request''-''result''
   AND new_r->''actor_id'' IS NOT DISTINCT FROM (CASE WHEN old_r->>''actor_id''=actor::text THEN ''null''::jsonb ELSE old_r->''actor_id'' END)
   AND new_r->''request'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->''request'',actor::text,email,name)
   AND new_r->''result'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->''result'',actor::text,email,name) THEN RETURN true;END IF;
  IF t=''owner_workflow_receipts'' AND new_r-''request''-''result'' IS NOT DISTINCT FROM old_r-''request''-''result''
   AND new_r->''request'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->''request'',actor::text,email,name)
   AND new_r->''result'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->''result'',actor::text,email,name) THEN RETURN true;END IF;
  IF t=''sale_photo_evidence'' AND old_r->>''captured_by_staff_id''=actor::text AND new_r->''captured_by_staff_id''=''null''::jsonb
    AND old_r-''captured_by_staff_id''-''updated_at'' IS NOT DISTINCT FROM new_r-''captured_by_staff_id''-''updated_at'' THEN RETURN true;END IF;
  IF t=''products'' AND step=''operational_data_cleaned'' AND new_r->''market_id''=''null''::jsonb
    AND old_r-''market_id''-''updated_at'' IS NOT DISTINCT FROM new_r-''market_id''-''updated_at''
    AND old_r->>''market_id'' IN(SELECT id::text FROM public.markets WHERE owner_id=actor) THEN RETURN true;END IF;
 END IF;
 RETURN false;
END$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE r jsonb;k text;BEGIN
 IF NOT deletion_engine_private.identity_allowed(auth.uid(),false) THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''account_deletion_access_frozen'';END IF;
 IF deletion_engine_private.worker_row(TG_TABLE_NAME,CASE WHEN TG_OP=''INSERT'' THEN NULL ELSE to_jsonb(OLD) END,
   CASE WHEN TG_OP=''DELETE'' THEN NULL ELSE to_jsonb(NEW) END,TG_OP) THEN IF TG_OP=''DELETE'' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 FOR r IN SELECT x FROM jsonb_array_elements(CASE TG_OP WHEN ''INSERT'' THEN jsonb_build_array(to_jsonb(NEW)) WHEN ''DELETE'' THEN jsonb_build_array(to_jsonb(OLD)) ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END)x LOOP
  FOREACH k IN ARRAY ARRAY[''owner_id'',''user_id'',''staff_id''] LOOP
   IF NOT deletion_engine_private.reference_allowed(''identity'',r->k,false) THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''account_deletion_access_frozen'';END IF;
  END LOOP;
  IF NOT deletion_engine_private.reference_allowed(''market'',r->''market_id'',false) THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''account_deletion_access_frozen'';END IF;
  IF TG_TABLE_NAME IN(''events'',''events_archive'') AND NOT deletion_engine_private.reference_allowed(''json'',r->''payload'',false)
   THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''account_deletion_access_frozen'';END IF;
  IF TG_TABLE_NAME=''profiles'' AND NOT deletion_engine_private.reference_allowed(''identity'',r->''id'',false) THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''account_deletion_access_frozen'';END IF;
 END LOOP;
 IF TG_OP=''INSERT'' OR (TG_OP=''UPDATE'' AND to_jsonb(NEW)->''actor_id'' IS DISTINCT FROM to_jsonb(OLD)->''actor_id'') THEN
  IF NOT deletion_engine_private.reference_allowed(''identity'',to_jsonb(NEW)->''actor_id'',false) THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''account_deletion_access_frozen'';END IF;
 END IF;
 IF TG_OP=''DELETE'' THEN RETURN OLD;END IF;RETURN NEW;
END$$;
-- Read RLS may retain other brands'' historical sales; actor is authorship, not ownership.
CREATE OR REPLACE FUNCTION deletion_engine_private.record_enabled(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $$
 SELECT deletion_engine_private.visible_row(r)
  AND deletion_engine_private.identity_allowed(nullif(r->>''user_id'','''')::uuid,false)
  AND deletion_engine_private.identity_allowed(nullif(r->>''staff_id'','''')::uuid,false)
  AND (r ? ''owner_id'' OR r ? ''market_id'' OR r ? ''actor_id'' OR deletion_engine_private.identity_allowed(nullif(r->>''id'','''')::uuid,false));
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA deletion_engine_private FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA deletion_engine_private TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION deletion_engine_private.rpc_allowed(jsonb),deletion_engine_private.assert_rpc(jsonb),
 deletion_engine_private.visible_row(jsonb),deletion_engine_private.actor_enabled(uuid),deletion_engine_private.record_enabled(jsonb)
 TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION deletion_engine_private.authorize_event_change(old_row jsonb,new_row jsonb,op text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $access_fence$ BEGIN
  IF NOT deletion_engine_private.worker_matches((SELECT active_actor_id FROM public.account_deletion_requests
   WHERE id::text=current_setting(''deletion_engine.request'',true))) THEN RETURN false;END IF;
  DECLARE r public.account_deletion_requests%ROWTYPE; step text; email text; name text;
BEGIN
  SELECT * INTO r FROM public.account_deletion_requests WHERE id::text=current_setting(''deletion_engine.request'',true)
    AND status=''processing'' AND lease_expires_at>clock_timestamp()
    AND lease_token_hash=encode(extensions.digest(current_setting(''deletion_engine.lease'',true),''sha256''),''hex'');
  IF NOT FOUND THEN RETURN false; END IF;
  step:=current_setting(''deletion_engine.step'',true);
  IF step NOT IN (''operational_data_cleaned'',''staff_attribution_anonymized'') THEN RETURN false; END IF;
  IF op=''DELETE'' THEN
    RETURN step=''operational_data_cleaned'' AND r.account_kind=''owner'' AND (
      old_row->>''market_id'' IN (SELECT id::text FROM public.markets WHERE owner_id=r.active_actor_id)
      OR (old_row->>''market_id'' IS NULL AND old_row->>''actor_id''=r.active_actor_id::text)
      OR (old_row->>''market_id'' IS NULL AND coalesce(old_row#>>''{payload,marketId}'',old_row#>>''{payload,market_id}'') IN
        (SELECT id::text FROM public.markets WHERE owner_id=r.active_actor_id)));
  END IF;
  IF op<>''UPDATE'' OR new_row-''actor_id''-''payload''-''metadata'' IS DISTINCT FROM old_row-''actor_id''-''payload''-''metadata'' THEN RETURN false; END IF;
  SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE id=r.active_actor_id;
  RETURN new_row->''actor_id'' IS NOT DISTINCT FROM CASE WHEN old_row->>''actor_id''=r.active_actor_id::text THEN ''null''::jsonb ELSE old_row->''actor_id'' END
    AND new_row->''payload'' IS NOT DISTINCT FROM deletion_engine_private.redact(old_row->''payload'',r.active_actor_id::text,email,name)
    AND new_row->''metadata'' IS NOT DISTINCT FROM (
      coalesce(deletion_engine_private.redact(NULLIF(old_row->''metadata'',''null''::jsonb),r.active_actor_id::text,email,name),''{}'')
        ||CASE WHEN old_row->>''actor_id''=r.active_actor_id::text THEN ''{"deletedActor":true}''::jsonb ELSE ''{}''::jsonb END);
END;
 END;$access_fence$;
CREATE OR REPLACE FUNCTION public.accept_invitation_and_bind(p_token text, p_staff_id uuid)
 RETURNS TABLE(success boolean, message text, relationship_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''token'',''value'',to_jsonb("p_token")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_staff_id"))));
DECLARE
  v_owner_id uuid;
  v_expires_at timestamptz;
  v_relationship_id uuid;
  v_staff_id uuid := auth.uid();
  v_staff_email text;
BEGIN
  IF v_staff_id IS NULL THEN
    RETURN QUERY SELECT false, ''Authentication required''::text, NULL::uuid;
    RETURN;
  END IF;
  IF p_staff_id IS NOT NULL AND p_staff_id <> v_staff_id THEN
    RETURN QUERY SELECT false, ''Authenticated user does not match staff id''::text, NULL::uuid;
    RETURN;
  END IF;
  IF p_token IS NULL OR pg_catalog.length(pg_catalog.btrim(p_token)) < 16 THEN
    RETURN QUERY SELECT false, ''Invalid invitation token''::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM public.staff_invitations AS si
  WHERE si.token = p_token
  FOR UPDATE;

  IF NOT FOUND OR v_expires_at < pg_catalog.now() THEN
    RETURN QUERY SELECT false, ''Invalid or expired invitation token''::text, NULL::uuid;
    RETURN;
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RETURN QUERY SELECT false, ''The owner does not have an active Team subscription''::text, NULL::uuid;
    RETURN;
  END IF;
  IF v_owner_id = v_staff_id THEN
    RETURN QUERY SELECT false, ''Owner cannot accept their own invitation''::text, NULL::uuid;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.staff_relationships
    WHERE staff_id = v_staff_id
      AND status IN (''pending'', ''active'', ''suspended_by_plan'')
  ) THEN
    RETURN QUERY SELECT false, ''This user is already bound to an owner''::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT u.email INTO v_staff_email
  FROM auth.users AS u
  WHERE u.id = v_staff_id;

  INSERT INTO public.staff_relationships (
    owner_id, staff_id, staff_email, status, accepted_at, role, permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_staff_email,
    ''active'',
    pg_catalog.now(),
    ''viewer'',
    ''{"can_view": true, "can_edit": false, "infoLevel": 0}''::jsonb
  )
  ON CONFLICT (owner_id, staff_id)
  DO UPDATE SET
    staff_email = EXCLUDED.staff_email,
    status = ''active'',
    accepted_at = pg_catalog.now(),
    role = ''viewer'',
    permissions = EXCLUDED.permissions
  WHERE public.staff_relationships.status = ''revoked''
  RETURNING id INTO v_relationship_id;

  IF v_relationship_id IS NULL THEN
    RETURN QUERY SELECT false, ''Retained relationship requires owner restoration''::text, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.market_members (market_id, user_id, role, joined_at)
  SELECT m.id, v_staff_id, ''staff'', pg_catalog.now()
  FROM public.markets AS m
  WHERE m.owner_id = v_owner_id
    AND m.status IN (''ongoing'', ''registered'', ''accepted'', ''paid'')
  ON CONFLICT DO NOTHING;

  DELETE FROM public.staff_invitations WHERE token = p_token;
  RETURN QUERY SELECT true, ''Invitation accepted''::text, v_relationship_id;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.accept_staff_email_invitation(p_relationship_id uuid)
 RETURNS staff_relationships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''relationship'',''value'',to_jsonb("p_relationship_id"))));
DECLARE
  v_staff_id uuid := auth.uid();
  v_owner_id uuid;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;

  SELECT owner_id
  INTO v_owner_id
  FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND staff_id = v_staff_id
    AND status = ''pending''
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Pending staff invitation not found.'' USING ERRCODE = ''P0002'';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION ''The owner does not have an active Team subscription.'' USING ERRCODE = ''42501'';
  END IF;

  UPDATE public.staff_relationships
  SET status = ''active'', accepted_at = pg_catalog.now()
  WHERE id = p_relationship_id
  RETURNING * INTO v_record;

  INSERT INTO public.market_members (market_id, user_id, role, joined_at)
  SELECT m.id, v_staff_id, ''staff'', pg_catalog.now()
  FROM public.markets AS m
  WHERE m.owner_id = v_owner_id
    AND m.status IN (''ongoing'', ''registered'', ''accepted'', ''paid'')
  ON CONFLICT DO NOTHING;

  RETURN v_record;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.apply_journal_checklist(p_request_id uuid, p_journal_id uuid, p_revision integer, p_market_id uuid, p_texts jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''journal'',''value'',to_jsonb("p_journal_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_texts"))));
DECLARE actor UUID:=auth.uid(); journal public.market_journals%ROWTYPE; target public.markets%ROWTYPE;
  receipt public.owner_workflow_receipts%ROWTYPE; request JSONB; result JSONB; line JSONB; text_value TEXT;
  keys TEXT[]:=''{}''; existing TEXT[]; item_id UUID; saved public.events%ROWTYPE; added JSONB:=''[]''; skipped INTEGER:=0; idx INTEGER:=0;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  IF p_request_id IS NULL OR p_journal_id IS NULL OR p_market_id IS NULL OR p_revision IS NULL OR p_revision<1
    OR jsonb_typeof(p_texts) IS DISTINCT FROM ''array'' OR jsonb_array_length(p_texts) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION ''FOLLOWUP_INPUT'' USING ERRCODE=''22023''; END IF;
  FOR line IN SELECT value FROM jsonb_array_elements(p_texts) LOOP
    text_value:=line#>>''{}'';
    IF jsonb_typeof(line)<>''string'' OR char_length(text_value) NOT BETWEEN 1 AND 200 OR text_value ~ E''[\\r\\n]''
      OR text_value !~ ''[^[:space:]]'' THEN RAISE EXCEPTION ''FOLLOWUP_INPUT'' USING ERRCODE=''22023''; END IF;
    text_value:=btrim(regexp_replace(text_value,E''[ \\t]+'','' '',''g''));
    IF text_value=ANY(keys) THEN RAISE EXCEPTION ''FOLLOWUP_INPUT'' USING ERRCODE=''22023''; END IF;
    keys:=array_append(keys,text_value);
  END LOOP;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::TEXT,81));
  SELECT * INTO journal FROM public.market_journals WHERE id=p_journal_id;
  IF NOT FOUND OR journal.owner_id<>actor OR journal.author_id<>actor OR journal.deleted_at IS NOT NULL THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  PERFORM id FROM public.markets WHERE id IN(journal.market_id,p_market_id) ORDER BY id FOR UPDATE;
  IF NOT EXISTS(SELECT 1 FROM public.markets WHERE id=journal.market_id AND owner_id=actor AND NOT COALESCE(is_deleted,FALSE)) THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  SELECT * INTO target FROM public.markets WHERE id=p_market_id AND owner_id=actor AND NOT COALESCE(is_deleted,FALSE);
  IF NOT FOUND OR target.id=journal.market_id THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  request:=jsonb_build_object(''journalId'',p_journal_id,''revision'',p_revision,''marketId'',p_market_id,''texts'',p_texts);
  SELECT * INTO receipt FROM public.owner_workflow_receipts WHERE id=p_request_id;
  IF FOUND THEN
    IF receipt.owner_id<>actor OR receipt.kind<>''journal_tasks'' OR receipt.request<>request THEN RAISE EXCEPTION ''FOLLOWUP_CONFLICT''; END IF;
    RETURN receipt.result;
  END IF;
  SELECT * INTO journal FROM public.market_journals WHERE id=p_journal_id FOR SHARE;
  IF NOT FOUND OR journal.owner_id<>actor OR journal.author_id<>actor OR journal.deleted_at IS NOT NULL OR journal.revision<>p_revision THEN RAISE EXCEPTION ''FOLLOWUP_CONFLICT''; END IF;
  IF target.end_date < (clock_timestamp() AT TIME ZONE ''Asia/Taipei'')::DATE
    OR target.status IN(''completed'',''cancelled'',''postponed'')
    OR COALESCE(target.schedule_occurrence_state,''scheduled'')<>''scheduled'' THEN RAISE EXCEPTION ''FOLLOWUP_TARGET''; END IF;
  WITH checklist AS (
    SELECT * FROM public.events WHERE (market_id=p_market_id OR (market_id IS NULL AND COALESCE(payload->>''market_id'',payload->>''marketId'')=p_market_id::TEXT)) AND type IN(''checklist_item_created'',''checklist_item_updated'',''checklist_item_deleted'') AND payload->>''itemId'' IS NOT NULL
  ), last_kind AS (
    SELECT DISTINCT ON(payload->>''itemId'') payload->>''itemId'' item_id,type FROM checklist ORDER BY payload->>''itemId'',timestamp DESC,id DESC
  ), last_text AS (
    SELECT DISTINCT ON(payload->>''itemId'') payload->>''itemId'' item_id,payload->>''text'' text FROM checklist WHERE jsonb_typeof(payload->''text'')=''string'' ORDER BY payload->>''itemId'',timestamp DESC,id DESC
  ) SELECT COALESCE(array_agg(btrim(regexp_replace(t.text,E''[ \\t\\r\\n]+'','' '',''g''))),''{}'') INTO existing
    FROM last_kind k JOIN last_text t USING(item_id) WHERE k.type<>''checklist_item_deleted'';
  FOREACH text_value IN ARRAY keys LOOP
    idx:=idx+1;
    IF text_value=ANY(existing) THEN skipped:=skipped+1; CONTINUE; END IF;
    item_id:=md5(p_request_id::TEXT||'':item:''||idx)::UUID;
    -- Only confirmed task text enters shared events: no journal text, ID or body snapshot in metadata.
    INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp) VALUES(
      md5(p_request_id::TEXT||'':event:''||idx)::UUID,''checklist_item_created'',
      jsonb_build_object(''market_id'',p_market_id,''itemId'',item_id,''text'',text_value,''completed'',FALSE),actor,p_market_id,clock_timestamp()
    ) RETURNING * INTO saved;
    added:=added||jsonb_build_array(to_jsonb(saved)); existing:=array_append(existing,text_value);
  END LOOP;
  result:=jsonb_build_object(''appliedCount'',jsonb_array_length(added),''skippedCount'',skipped,''events'',added);
  INSERT INTO public.owner_workflow_receipts(id,owner_id,kind,request,result) VALUES(p_request_id,actor,''journal_tasks'',request,result);
  RETURN result;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.apply_preparation_template(p_application_id uuid, p_market_id uuid, p_template_id uuid, p_revision integer, p_item_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''template'',''value'',to_jsonb("p_template_id"))));
DECLARE v_market public.markets%ROWTYPE; v_template public.preparation_templates%ROWTYPE;
  v_receipt public.preparation_template_applications%ROWTYPE; v_request JSONB; v_result JSONB;
  v_item JSONB; v_event public.events%ROWTYPE; v_events JSONB:=''[]''; v_count INTEGER:=0; v_skip INTEGER:=0;
  v_key TEXT; v_item_id UUID; v_existing TEXT[];
BEGIN
  IF p_application_id IS NULL OR p_market_id IS NULL OR p_template_id IS NULL OR p_revision IS NULL
    OR p_item_ids IS NULL OR cardinality(p_item_ids) NOT BETWEEN 1 AND 50 OR array_position(p_item_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION ''TEMPLATE_INPUT'' USING ERRCODE=''22023'';
  END IF;
  -- All apply calls for one market are serialized; the whole event batch and receipt commit together.
  SELECT * INTO v_market FROM public.markets WHERE id=p_market_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_market.is_deleted,FALSE) OR NOT public.can_manage_preparation_templates(v_market.owner_id) THEN
    RAISE EXCEPTION ''TEMPLATE_SCOPE'' USING ERRCODE=''42501''; END IF;
  v_request:=jsonb_build_object(''marketId'',p_market_id,''templateId'',p_template_id,''revision'',p_revision,''itemIds'',to_jsonb(p_item_ids));
  SELECT * INTO v_receipt FROM public.preparation_template_applications WHERE id=p_application_id;
  IF FOUND THEN
    IF v_receipt.actor_id<>auth.uid() OR v_receipt.request<>v_request THEN RAISE EXCEPTION ''TEMPLATE_CONFLICT''; END IF;
    RETURN v_receipt.result;
  END IF;
  SELECT * INTO v_template FROM public.preparation_templates WHERE id=p_template_id FOR SHARE;
  IF NOT FOUND OR v_template.owner_id<>v_market.owner_id OR v_template.archived OR v_template.revision<>p_revision THEN
    RAISE EXCEPTION ''TEMPLATE_CONFLICT''; END IF;
  IF cardinality(p_item_ids)<>(SELECT count(DISTINCT x) FROM unnest(p_item_ids) x)
    OR EXISTS(SELECT 1 FROM unnest(p_item_ids) x WHERE NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(v_template.items) i WHERE (i->>''id'')::UUID=x
    )) THEN RAISE EXCEPTION ''TEMPLATE_INPUT'' USING ERRCODE=''22023''; END IF;
  -- Reconstruct active item text without changing completed flags, edits or deletions.
  WITH checklist AS (
    SELECT * FROM public.events e WHERE e.market_id=p_market_id
      AND e.type IN (''checklist_item_created'',''checklist_item_updated'',''checklist_item_deleted'')
      AND e.payload->>''itemId'' IS NOT NULL
  ), last_kind AS (
    SELECT DISTINCT ON(payload->>''itemId'') payload->>''itemId'' AS item_id,type FROM checklist ORDER BY payload->>''itemId'',timestamp DESC,id DESC
  ), last_text AS (
    SELECT DISTINCT ON(payload->>''itemId'') payload->>''itemId'' AS item_id,payload->>''text'' AS text FROM checklist
      WHERE jsonb_typeof(payload->''text'')=''string'' ORDER BY payload->>''itemId'',timestamp DESC,id DESC
  ) SELECT COALESCE(array_agg(btrim(regexp_replace(t.text,E''[ \\t\\r\\n]+'','' '',''g''))),''{}'') INTO v_existing
    FROM last_kind k JOIN last_text t ON t.item_id=k.item_id WHERE k.type<>''checklist_item_deleted'';
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_template.items) WHERE (value->>''id'')::UUID=ANY(p_item_ids) LOOP
    v_key:=btrim(regexp_replace(v_item->>''text'',E''[ \\t\\r\\n]+'','' '',''g''));
    IF v_key=ANY(v_existing) THEN v_skip:=v_skip+1; CONTINUE; END IF;
    v_item_id:=gen_random_uuid();
    INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp,metadata) VALUES(
      gen_random_uuid(),''checklist_item_created'',jsonb_build_object(''market_id'',p_market_id,''itemId'',v_item_id,''text'',v_item->>''text'',''completed'',FALSE),
      auth.uid(),p_market_id,clock_timestamp(),jsonb_build_object(''source'',''preparation_template'',''templateId'',p_template_id,''templateRevision'',p_revision,''applicationId'',p_application_id)
    ) RETURNING * INTO v_event;
    v_events:=v_events||jsonb_build_array(to_jsonb(v_event)); v_count:=v_count+1;
    v_existing:=array_append(v_existing,v_key);
  END LOOP;
  v_result:=jsonb_build_object(''appliedCount'',v_count,''skippedCount'',v_skip,''events'',v_events);
  INSERT INTO public.preparation_template_applications(id,owner_id,market_id,actor_id,template_id,request,result)
    VALUES(p_application_id,v_market.owner_id,p_market_id,auth.uid(),p_template_id,v_request,v_result);
  RETURN v_result;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.apply_venue_region_change(p_request_id uuid, p_preview jsonb, p_region_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_preview"))));
DECLARE actor UUID:=auth.uid(); v_venue_id UUID; current_preview JSONB; request JSONB; receipt public.owner_workflow_receipts%ROWTYPE;
  row JSONB; saved public.events%ROWTYPE; added JSONB:=''[]''; updated_count INTEGER:=0; protected_count INTEGER:=0; result JSONB;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  IF p_request_id IS NULL OR jsonb_typeof(p_preview) IS DISTINCT FROM ''object''
    OR NOT public.market_region_code_is_valid(p_region_code) THEN RAISE EXCEPTION ''FOLLOWUP_INPUT'' USING ERRCODE=''22023''; END IF;
  v_venue_id:=(p_preview->>''venueId'')::UUID;
  PERFORM 1 FROM public.venues v WHERE v.id=v_venue_id AND v.owner_id=actor AND v.status=''active'' AND NOT COALESCE(v.is_deleted,FALSE) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::TEXT,81));
  request:=jsonb_build_object(''preview'',p_preview,''regionCode'',p_region_code);
  SELECT * INTO receipt FROM public.owner_workflow_receipts WHERE id=p_request_id;
  IF FOUND THEN
    IF receipt.owner_id<>actor OR receipt.kind<>''venue_regions'' OR receipt.request<>request THEN RAISE EXCEPTION ''FOLLOWUP_CONFLICT''; END IF;
    RETURN receipt.result;
  END IF;
  PERFORM s.id FROM public.operation_schedules s WHERE s.venue_id=v_venue_id AND s.owner_id=actor ORDER BY s.id FOR UPDATE;
  PERFORM m.id FROM public.markets m WHERE m.venue_id=v_venue_id AND m.owner_id=actor ORDER BY m.id FOR UPDATE;
  current_preview:=public.preview_venue_region_change(v_venue_id);
  IF current_preview IS DISTINCT FROM p_preview THEN RAISE EXCEPTION ''FOLLOWUP_CONFLICT''; END IF;
  IF (current_preview->>''regionCode'') IS DISTINCT FROM p_region_code THEN
    INSERT INTO public.events(id,type,payload,actor_id,timestamp) VALUES(md5(p_request_id::TEXT||'':venue'')::UUID,''venue_updated'',
      jsonb_build_object(''venueId'',v_venue_id,''updates'',jsonb_build_object(''regionCode'',p_region_code)),actor,clock_timestamp()) RETURNING * INTO saved;
    added:=added||jsonb_build_array(to_jsonb(saved));
  END IF;
  FOR row IN SELECT value FROM jsonb_array_elements(current_preview->''markets'') LOOP
    IF NOT (row->>''eligible'')::BOOLEAN THEN protected_count:=protected_count+1; CONTINUE; END IF;
    IF (row->>''regionCode'') IS NOT DISTINCT FROM p_region_code THEN CONTINUE; END IF;
    INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp) VALUES(md5(p_request_id::TEXT||'':''||(row->>''id''))::UUID,''market_updated'',
      jsonb_build_object(''market_id'',row->>''id'',''updates'',jsonb_build_object(''regionCode'',p_region_code)),actor,(row->>''id'')::UUID,clock_timestamp()) RETURNING * INTO saved;
    added:=added||jsonb_build_array(to_jsonb(saved)); updated_count:=updated_count+1;
  END LOOP;
  result:=jsonb_build_object(''updatedCount'',updated_count,''protectedCount'',protected_count,''events'',added);
  INSERT INTO public.owner_workflow_receipts(id,owner_id,kind,request,result) VALUES(p_request_id,actor,''venue_regions'',request,result);
  RETURN result;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.auto_add_staff_to_new_market()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  -- 當新市集創建時，自動將該老闆的所有員工添加到 market_members
  INSERT INTO market_members (market_id, user_id, role)
  SELECT 
    NEW.id,           -- 新市集的 ID
    sr.staff_id,      -- 員工的 ID
    ''staff''           -- 角色為 staff
  FROM staff_relationships sr
  WHERE sr.owner_id = NEW.owner_id
    AND sr.status = ''active''
  ON CONFLICT (market_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.backfill_market_regions(p_batch_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_items"))));
DECLARE actor UUID:=auth.uid(); item JSONB; target public.markets%ROWTYPE; event_id UUID;
  body JSONB; saved public.events%ROWTYPE; matched INTEGER:=0; ids UUID[]; result JSONB;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION ''REGION_SCOPE'' USING ERRCODE=''42501''; END IF;
  IF p_batch_id IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM ''array'' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION ''REGION_INPUT'' USING ERRCODE=''22023''; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(item)<>''object'' OR item-''id''-''regionCode''-''expectedUpdatedAt''<>''{}''::JSONB
      OR jsonb_typeof(item->''id'') IS DISTINCT FROM ''string''
      OR jsonb_typeof(item->''regionCode'') IS DISTINCT FROM ''string''
      OR jsonb_typeof(item->''expectedUpdatedAt'') IS DISTINCT FROM ''string''
      OR NOT public.market_region_code_is_valid(item->>''regionCode'') THEN RAISE EXCEPTION ''REGION_INPUT'' USING ERRCODE=''22023''; END IF;
    ids:=array_append(ids,(item->>''id'')::UUID);
    PERFORM (item->>''expectedUpdatedAt'')::TIMESTAMPTZ;
  END LOOP;
  IF cardinality(ids)<>(SELECT count(DISTINCT id) FROM unnest(ids) id) THEN RAISE EXCEPTION ''REGION_INPUT'' USING ERRCODE=''22023''; END IF;
  -- Same lock order across batches. Ordinary event projection takes these market locks too.
  PERFORM id FROM public.markets WHERE id=ANY(ids) ORDER BY id FOR UPDATE;
  IF (SELECT count(*) FROM public.markets WHERE id=ANY(ids) AND owner_id=actor AND NOT COALESCE(is_deleted,FALSE))<>cardinality(ids) THEN RAISE EXCEPTION ''REGION_SCOPE'' USING ERRCODE=''42501''; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO target FROM public.markets WHERE id=(item->>''id'')::UUID;
    event_id:=md5(p_batch_id::TEXT||'':''||target.id::TEXT)::UUID;
    body:=jsonb_build_object(''market_id'',target.id,''updates'',jsonb_build_object(''regionCode'',item->>''regionCode''),
      ''regionBackfill'',jsonb_build_object(''batchId'',p_batch_id,''previousRegionCode'',NULL,''expectedUpdatedAt'',item->>''expectedUpdatedAt''));
    -- A single scheduled occurrence becomes an override, never a Venue/default rewrite.
    IF target.session_origin=''schedule'' THEN body:=jsonb_set(body,''{updates,isScheduleOverride}'',''true''::JSONB); END IF;
    SELECT * INTO saved FROM public.events WHERE id=event_id;
    IF FOUND THEN
      IF saved.actor_id IS DISTINCT FROM actor OR saved.type<>''market_updated'' OR saved.market_id IS DISTINCT FROM target.id OR saved.payload IS DISTINCT FROM body THEN RAISE EXCEPTION ''REGION_BATCH_CONFLICT''; END IF;
      matched:=matched+1;
    ELSIF target.region_code IS NOT NULL OR target.updated_at IS DISTINCT FROM (item->>''expectedUpdatedAt'')::TIMESTAMPTZ THEN RAISE EXCEPTION ''REGION_CONFLICT''; END IF;
  END LOOP;
  IF matched NOT IN(0,cardinality(ids)) THEN RAISE EXCEPTION ''REGION_BATCH_CONFLICT''; END IF;
  IF matched=0 THEN
    FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>''id'' LOOP
      SELECT * INTO target FROM public.markets WHERE id=(item->>''id'')::UUID;
      event_id:=md5(p_batch_id::TEXT||'':''||target.id::TEXT)::UUID;
      body:=jsonb_build_object(''market_id'',target.id,''updates'',jsonb_build_object(''regionCode'',item->>''regionCode''),
        ''regionBackfill'',jsonb_build_object(''batchId'',p_batch_id,''previousRegionCode'',NULL,''expectedUpdatedAt'',item->>''expectedUpdatedAt''));
      IF target.session_origin=''schedule'' THEN body:=jsonb_set(body,''{updates,isScheduleOverride}'',''true''::JSONB); END IF;
      INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp) VALUES(event_id,''market_updated'',body,actor,target.id,clock_timestamp());
    END LOOP;
  END IF;
  SELECT jsonb_agg(jsonb_build_object(''id'',id,''ownerId'',owner_id,''regionCode'',region_code,''updatedAt'',updated_at,''isScheduleOverride'',is_schedule_override) ORDER BY id)
    INTO result FROM public.markets WHERE id=ANY(ids) AND owner_id=actor;
  RETURN result;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.bff_claim_sale_photo_evidence_upload(p_actor_id uuid, p_owner_id uuid, p_market_id uuid, p_sale_id uuid, p_expected_evidence_id uuid, p_attempt_id uuid, p_captured_at timestamp with time zone)
 RETURNS sale_photo_evidence
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''event'',''value'',to_jsonb("p_sale_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_expected_evidence_id"))));
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
  v_event_completed_at TIMESTAMPTZ;
  v_existing_found BOOLEAN := FALSE;
  v_is_owner BOOLEAN := FALSE;
  v_is_active_staff BOOLEAN := FALSE;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_actor_id IS NULL
    OR p_owner_id IS NULL
    OR p_market_id IS NULL
    OR p_sale_id IS NULL
    OR p_attempt_id IS NULL
    OR p_captured_at IS NULL
  THEN
    RAISE EXCEPTION ''Invalid sales photo evidence claim input.''
      USING ERRCODE = ''22023'';
  END IF;

  -- Serialize one active claim per sale, including the no-row-yet case.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_sale_id::TEXT, 0)
  );

  SELECT e.timestamp
  INTO v_event_completed_at
  FROM public.events AS e
  INNER JOIN public.markets AS m
    ON m.id = e.market_id
  WHERE e.id = p_sale_id
    AND e.market_id = p_market_id
    AND e.type = ''deal_closed''
    AND m.id = p_market_id
    AND m.owner_id = p_owner_id
  FOR SHARE OF e, m;

  IF NOT FOUND OR v_event_completed_at IS NULL THEN
    RAISE EXCEPTION ''Sales photo evidence sale scope is invalid.''
      USING ERRCODE = ''22023'';
  END IF;

  v_is_owner := p_actor_id = p_owner_id;
  IF NOT v_is_owner THEN
    SELECT TRUE
    INTO v_is_active_staff
    FROM public.staff_relationships AS sr
    WHERE sr.owner_id = p_owner_id
      AND sr.staff_id = p_actor_id
      AND sr.status = ''active''
    FOR SHARE;
    v_is_active_staff := FOUND;
  END IF;

  IF NOT v_is_owner AND NOT v_is_active_staff THEN
    RAISE EXCEPTION ''Sales photo evidence actor is not authorized.''
      USING ERRCODE = ''42501'';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
  FOR UPDATE;
  v_existing_found := FOUND;
  v_now := pg_catalog.clock_timestamp();

  IF v_existing_found THEN
    IF p_expected_evidence_id IS NOT NULL
      AND v_evidence.id <> p_expected_evidence_id
    THEN
      RAISE EXCEPTION ''Sales photo evidence claim identity changed.''
        USING ERRCODE = ''40001'';
    END IF;

    IF NOT v_is_owner
      AND v_evidence.captured_by_staff_id IS DISTINCT FROM p_actor_id
    THEN
      RAISE EXCEPTION ''Sales photo evidence row belongs to another actor.''
        USING ERRCODE = ''42501'';
    END IF;

    IF v_evidence.status = ''uploading'' THEN
      IF v_evidence.upload_lease_expires_at IS NOT NULL
        AND v_evidence.upload_lease_expires_at > v_now
        AND v_evidence.upload_attempt_id IS DISTINCT FROM p_attempt_id
      THEN
        RAISE EXCEPTION ''Sales photo evidence upload lease is still active.''
          USING ERRCODE = ''55000'';
      END IF;
    ELSIF v_evidence.status NOT IN (
        ''pending_capture'',
        ''capture_skipped'',
        ''captured_local'',
        ''upload_failed''
      ) THEN
      RAISE EXCEPTION ''Sales photo evidence row is not uploadable.''
        USING ERRCODE = ''55000'';
    END IF;

    UPDATE public.sale_photo_evidence AS spe
    SET status = ''uploading'',
        captured_by_staff_id = CASE WHEN v_is_owner THEN NULL ELSE p_actor_id END,
        captured_at = p_captured_at,
        failure_reason = NULL,
        upload_attempt_id = p_attempt_id,
        upload_lease_expires_at = v_now + INTERVAL ''2 minutes''
    WHERE spe.id = v_evidence.id
      AND spe.owner_id = p_owner_id
      AND spe.market_id = p_market_id
      AND spe.sale_id = p_sale_id
      AND spe.deleted_at IS NULL
    RETURNING spe.* INTO v_evidence;
  ELSE
    IF p_expected_evidence_id IS NOT NULL THEN
      RAISE EXCEPTION ''Expected sales photo evidence row was not found.''
        USING ERRCODE = ''40001'';
    END IF;

    INSERT INTO public.sale_photo_evidence (
      owner_id,
      market_id,
      sale_id,
      captured_by_staff_id,
      status,
      sale_completed_at,
      captured_at,
      upload_attempt_id,
      upload_lease_expires_at
    )
    VALUES (
      p_owner_id,
      p_market_id,
      p_sale_id,
      CASE WHEN v_is_owner THEN NULL ELSE p_actor_id END,
      ''uploading'',
      v_event_completed_at,
      p_captured_at,
      p_attempt_id,
      v_now + INTERVAL ''2 minutes''
    )
    RETURNING * INTO v_evidence;
  END IF;

  RETURN v_evidence;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.bff_finalize_sale_photo_evidence_delete(p_actor_id uuid, p_evidence_id uuid, p_expected_image_object_key text, p_expected_thumbnail_object_key text)
 RETURNS sale_photo_evidence
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_evidence_id"))));
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL
    OR p_evidence_id IS NULL
    OR p_expected_image_object_key IS NULL
    OR p_expected_thumbnail_object_key IS NULL
  THEN
    RAISE EXCEPTION ''Sales photo evidence delete finalize scope is invalid.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence row was not found.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_evidence.owner_id <> p_actor_id THEN
    RAISE EXCEPTION ''Only the market owner may delete sales photo evidence.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_evidence.deleted_at IS NOT NULL THEN
    RETURN v_evidence;
  END IF;

  IF v_evidence.status <> ''uploaded''
    OR v_evidence.r2_object_key IS DISTINCT FROM p_expected_image_object_key
    OR v_evidence.r2_thumbnail_key IS DISTINCT FROM p_expected_thumbnail_object_key
  THEN
    RAISE EXCEPTION ''Sales photo evidence row changed before delete finalize.''
      USING ERRCODE = ''40001'';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET deleted_at = pg_catalog.clock_timestamp()
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_actor_id
    AND spe.deleted_at IS NULL
    AND spe.status = ''uploaded''
    AND spe.r2_object_key = p_expected_image_object_key
    AND spe.r2_thumbnail_key = p_expected_thumbnail_object_key
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence delete finalize lost its state guard.''
      USING ERRCODE = ''40001'';
  END IF;

  RETURN v_evidence;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.bff_finalize_sale_photo_evidence_expiration(p_evidence_id uuid, p_expected_image_object_key text, p_expected_thumbnail_object_key text)
 RETURNS sale_photo_evidence
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_evidence_id"))));
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
BEGIN
  IF p_evidence_id IS NULL
    OR p_expected_image_object_key IS NULL
    OR p_expected_thumbnail_object_key IS NULL
  THEN
    RAISE EXCEPTION ''Sales photo evidence expiration scope is invalid.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
  FOR UPDATE;

  IF NOT FOUND OR v_evidence.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION ''Sales photo evidence row was not found.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_evidence.status = ''expired'' THEN
    RETURN v_evidence;
  END IF;

  IF v_evidence.status <> ''uploaded''
    OR v_evidence.expires_at IS NULL
    OR v_evidence.expires_at > pg_catalog.clock_timestamp()
    OR v_evidence.r2_object_key IS DISTINCT FROM p_expected_image_object_key
    OR v_evidence.r2_thumbnail_key IS DISTINCT FROM p_expected_thumbnail_object_key
  THEN
    RAISE EXCEPTION ''Sales photo evidence row changed before expiration finalize.''
      USING ERRCODE = ''40001'';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET
    status = ''expired'',
    r2_object_key = NULL,
    r2_thumbnail_key = NULL
  WHERE spe.id = p_evidence_id
    AND spe.deleted_at IS NULL
    AND spe.status = ''uploaded''
    AND spe.expires_at <= pg_catalog.clock_timestamp()
    AND spe.r2_object_key = p_expected_image_object_key
    AND spe.r2_thumbnail_key = p_expected_thumbnail_object_key
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence expiration finalize lost its state guard.''
      USING ERRCODE = ''40001'';
  END IF;

  RETURN v_evidence;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.bff_finalize_sale_photo_evidence_upload(p_actor_id uuid, p_evidence_id uuid, p_owner_id uuid, p_market_id uuid, p_sale_id uuid, p_attempt_id uuid, p_image_object_key text, p_thumbnail_object_key text, p_mime_type text, p_width integer, p_height integer, p_file_size_bytes integer, p_captured_at timestamp with time zone, p_uploaded_at timestamp with time zone, p_expires_at timestamp with time zone)
 RETURNS sale_photo_evidence
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_evidence_id")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''event'',''value'',to_jsonb("p_sale_id"))));
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
  v_is_owner BOOLEAN := FALSE;
  v_is_active_staff BOOLEAN := FALSE;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_actor_id IS NULL
    OR p_evidence_id IS NULL
    OR p_owner_id IS NULL
    OR p_market_id IS NULL
    OR p_sale_id IS NULL
    OR p_attempt_id IS NULL
    OR p_captured_at IS NULL
    OR p_uploaded_at IS NULL
    OR p_expires_at IS NULL
    OR p_expires_at <= p_uploaded_at
    OR p_mime_type IS NULL
    OR p_mime_type NOT IN (''image/webp'', ''image/jpeg'')
    OR p_width IS NULL OR p_width <= 0
    OR p_height IS NULL OR p_height <= 0
    OR p_file_size_bytes IS NULL
    OR p_file_size_bytes < 0
    OR p_file_size_bytes > 1000000
    OR p_image_object_key IS NULL OR p_image_object_key = ''''
    OR p_thumbnail_object_key IS NULL OR p_thumbnail_object_key = ''''
  THEN
    RAISE EXCEPTION ''Invalid sales photo evidence finalize input.''
      USING ERRCODE = ''22023'';
  END IF;

  PERFORM 1
  FROM public.events AS e
  INNER JOIN public.markets AS m
    ON m.id = e.market_id
  WHERE e.id = p_sale_id
    AND e.market_id = p_market_id
    AND e.type = ''deal_closed''
    AND m.id = p_market_id
    AND m.owner_id = p_owner_id
  FOR SHARE OF e, m;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence sale scope is invalid.''
      USING ERRCODE = ''22023'';
  END IF;

  v_is_owner := p_actor_id = p_owner_id;
  IF NOT v_is_owner THEN
    SELECT TRUE
    INTO v_is_active_staff
    FROM public.staff_relationships AS sr
    WHERE sr.owner_id = p_owner_id
      AND sr.staff_id = p_actor_id
      AND sr.status = ''active''
    FOR SHARE;
    v_is_active_staff := FOUND;
  END IF;

  IF NOT v_is_owner AND NOT v_is_active_staff THEN
    RAISE EXCEPTION ''Sales photo evidence actor is not authorized.''
      USING ERRCODE = ''42501'';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence row was not found.''
      USING ERRCODE = ''22023'';
  END IF;

  v_now := pg_catalog.clock_timestamp();

  IF NOT v_is_owner
    AND v_evidence.captured_by_staff_id IS DISTINCT FROM p_actor_id
  THEN
    RAISE EXCEPTION ''Sales photo evidence row belongs to another actor.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_evidence.upload_attempt_id IS DISTINCT FROM p_attempt_id THEN
    RAISE EXCEPTION ''Sales photo evidence upload attempt changed.''
      USING ERRCODE = ''40001'';
  END IF;

  IF v_evidence.status = ''uploaded'' THEN
    IF v_evidence.r2_object_key = p_image_object_key
      AND v_evidence.r2_thumbnail_key = p_thumbnail_object_key
      AND v_evidence.mime_type = p_mime_type
      AND v_evidence.width = p_width
      AND v_evidence.height = p_height
      AND v_evidence.file_size_bytes = p_file_size_bytes
      AND v_evidence.captured_at = p_captured_at
      AND v_evidence.uploaded_at = p_uploaded_at
      AND v_evidence.expires_at = p_expires_at
    THEN
      RETURN v_evidence;
    END IF;

    RAISE EXCEPTION ''Uploaded sales photo evidence does not match retry input.''
      USING ERRCODE = ''55000'';
  END IF;

  IF v_evidence.status <> ''uploading'' THEN
    RAISE EXCEPTION ''Sales photo evidence row is not awaiting finalize.''
      USING ERRCODE = ''55000'';
  END IF;

  IF v_evidence.upload_lease_expires_at IS NULL
    OR v_evidence.upload_lease_expires_at <= v_now
  THEN
    RAISE EXCEPTION ''Sales photo evidence upload lease expired before finalize.''
      USING ERRCODE = ''55000'';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET status = ''uploaded'',
      r2_object_key = p_image_object_key,
      r2_thumbnail_key = p_thumbnail_object_key,
      mime_type = p_mime_type,
      width = p_width,
      height = p_height,
      file_size_bytes = p_file_size_bytes,
      captured_at = p_captured_at,
      uploaded_at = p_uploaded_at,
      expires_at = p_expires_at,
      failure_reason = NULL,
      upload_lease_expires_at = NULL
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
    AND spe.status = ''uploading''
    AND spe.upload_attempt_id = p_attempt_id
    AND spe.upload_lease_expires_at > v_now
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence finalize lost its state guard.''
      USING ERRCODE = ''40001'';
  END IF;

  RETURN v_evidence;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.bff_list_expired_sale_photo_evidence(p_limit integer DEFAULT 25)
 RETURNS TABLE(id uuid, owner_id uuid, market_id uuid, sale_id uuid, r2_object_key text, r2_thumbnail_key text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION ''Sales photo evidence expiration limit is invalid.''
      USING ERRCODE = ''22023'';
  END IF;

  RETURN QUERY
  SELECT
    spe.id,
    spe.owner_id,
    spe.market_id,
    spe.sale_id,
    spe.r2_object_key,
    spe.r2_thumbnail_key,
    spe.expires_at
  FROM public.sale_photo_evidence AS spe
  WHERE spe.deleted_at IS NULL AND deletion_engine_private.identity_allowed(spe.owner_id,false)
    AND spe.status = ''uploaded''
    AND spe.expires_at IS NOT NULL
    AND spe.expires_at <= pg_catalog.clock_timestamp()
    AND spe.r2_object_key IS NOT NULL
    AND spe.r2_thumbnail_key IS NOT NULL
  ORDER BY spe.expires_at ASC, spe.id ASC
  LIMIT p_limit;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(p_actor_id uuid, p_evidence_id uuid, p_owner_id uuid, p_market_id uuid, p_sale_id uuid, p_attempt_id uuid, p_failure_reason text)
 RETURNS sale_photo_evidence
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_evidence_id")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''event'',''value'',to_jsonb("p_sale_id"))));
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
  v_actor_matches_row BOOLEAN := FALSE;
BEGIN
  IF p_actor_id IS NULL
    OR p_evidence_id IS NULL
    OR p_owner_id IS NULL
    OR p_market_id IS NULL
    OR p_sale_id IS NULL
    OR p_attempt_id IS NULL
    OR p_failure_reason IS NULL
    OR p_failure_reason NOT IN (
      ''r2_image_upload_failed'',
      ''r2_thumbnail_upload_failed'',
      ''metadata_finalize_failed''
    )
  THEN
    RAISE EXCEPTION ''Invalid sales photo evidence failure input.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence row was not found.''
      USING ERRCODE = ''22023'';
  END IF;

  -- Failure cleanup may finish an already-authorized in-flight upload after a
  -- staff relationship is revoked. It can only downgrade that actor''s own row.
  v_actor_matches_row := p_actor_id = p_owner_id
    OR v_evidence.captured_by_staff_id = p_actor_id;

  IF NOT v_actor_matches_row THEN
    RAISE EXCEPTION ''Sales photo evidence actor cannot mark this row failed.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_evidence.upload_attempt_id IS DISTINCT FROM p_attempt_id THEN
    RAISE EXCEPTION ''Sales photo evidence upload attempt changed.''
      USING ERRCODE = ''40001'';
  END IF;

  IF v_evidence.status = ''upload_failed'' THEN
    RETURN v_evidence;
  END IF;

  IF v_evidence.status <> ''uploading'' THEN
    RAISE EXCEPTION ''Sales photo evidence row cannot transition to upload_failed.''
      USING ERRCODE = ''55000'';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET status = ''upload_failed'',
      failure_reason = p_failure_reason,
      upload_lease_expires_at = NULL
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
    AND spe.status = ''uploading''
    AND spe.upload_attempt_id = p_attempt_id
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Sales photo evidence failure update lost its state guard.''
      USING ERRCODE = ''40001'';
  END IF;

  RETURN v_evidence;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.bff_prepare_sale_photo_evidence_delete(p_actor_id uuid, p_evidence_id uuid)
 RETURNS sale_photo_evidence
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_evidence_id"))));
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_evidence_id IS NULL THEN
    RAISE EXCEPTION ''Sales photo evidence delete scope is invalid.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
  FOR UPDATE;

  IF NOT FOUND OR v_evidence.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION ''Sales photo evidence row was not found.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_evidence.owner_id <> p_actor_id THEN
    RAISE EXCEPTION ''Only the market owner may delete sales photo evidence.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_evidence.status <> ''uploaded''
    OR v_evidence.r2_object_key IS NULL
    OR v_evidence.r2_thumbnail_key IS NULL
  THEN
    RAISE EXCEPTION ''Sales photo evidence row is not deletable.''
      USING ERRCODE = ''55000'';
  END IF;

  RETURN v_evidence;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.can_current_staff_read_relationship(p_owner_id uuid, p_status text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")))) THEN RETURN false;END IF;
RETURN (SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.staff_relationships AS sr
      WHERE sr.owner_id = p_owner_id
        AND sr.staff_id = auth.uid()
        AND sr.status = p_status
    )
    AND (
      p_status <> ''active''
      OR public.has_authoritative_team_entitlement(p_owner_id)
    ));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.can_manage_preparation_templates(p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner")))) THEN RETURN false;END IF;
RETURN (SELECT auth.uid() IS NOT NULL AND (auth.uid() = p_owner OR (
    public.has_authoritative_team_entitlement(p_owner) AND EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id=p_owner
        AND sr.staff_id=auth.uid() AND sr.status=''active'' AND sr.role=''manager''
    )
  )));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.can_manage_recurring_operations()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array()) THEN RETURN false;END IF;
RETURN (SELECT auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.staff_relationships sr
      WHERE sr.staff_id = auth.uid()
        AND sr.status = ''active''
    ));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.check_subscription_read_for_actor(p_actor uuid, p_owner uuid, p_feature text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner"))));
DECLARE v_min integer; v_level integer;
BEGIN
 v_min:=CASE WHEN p_feature IN (''sales'',''products'',''cash'',''product_photo'') THEN 1 WHEN p_feature IN (''sales_photo'',''advanced'') THEN 2 ELSE NULL END;
 IF p_actor IS NULL OR p_owner IS NULL OR v_min IS NULL THEN RETURN jsonb_build_object(''enabled'',true,''allowed'',false,''reason'',''invalid_scope''); END IF;
 IF p_actor<>p_owner AND (NOT public.has_authoritative_team_entitlement(p_owner) OR NOT EXISTS(
  SELECT 1 FROM public.staff_relationships WHERE owner_id=p_owner AND staff_id=p_actor AND status=''active''
   AND role IN (''viewer'',''operator'',''manager'') AND permissions->>''can_view''=''true'')) THEN
  RETURN jsonb_build_object(''enabled'',true,''allowed'',false,''reason'',''role_forbidden''); END IF;
 IF NOT public.subscription_read_guard_active(p_owner) THEN RETURN jsonb_build_object(''enabled'',false,''allowed'',true,''reason'',''pilot_not_enabled''); END IF;
 v_level:=CASE public.subscription_effective_plan(p_owner) WHEN ''team'' THEN 2 WHEN ''pro'' THEN 1 ELSE 0 END;
 RETURN jsonb_build_object(''enabled'',true,''allowed'',v_level>=v_min,''reason'',CASE WHEN v_level>=v_min THEN ''allowed'' ELSE ''plan_required'' END);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.check_subscription_write_access(p_owner_id uuid, p_feature text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id"))));
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION ''AUTH_REQUIRED'' USING ERRCODE=''42501''; END IF;
 RETURN public.check_subscription_write_for_actor(auth.uid(),p_owner_id,p_feature);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.check_subscription_write_for_actor(p_actor uuid, p_owner uuid, p_feature text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner"))));
DECLARE v_min INTEGER; v_role TEXT; v_level INTEGER;
BEGIN
 IF p_feature IS NULL OR p_feature NOT IN (''sales'',''products'',''cash'',''product_photo'',''sales_photo'',''field_notes'') OR p_actor IS NULL OR p_owner IS NULL THEN
   RETURN jsonb_build_object(''allowed'',FALSE,''reason'',''invalid_scope'',''enabled'',TRUE); END IF;
 v_min:=CASE WHEN p_feature IN (''sales_photo'',''field_notes'') THEN 2 ELSE 1 END;
 IF p_actor<>p_owner THEN
   SELECT role INTO v_role FROM public.staff_relationships WHERE owner_id=p_owner AND staff_id=p_actor AND status=''active'';
   IF NOT public.has_authoritative_team_entitlement(p_owner) OR v_role NOT IN (''manager'',''operator'') OR v_role IS NULL
     OR p_feature=''cash'' OR (p_feature IN (''products'',''product_photo'') AND v_role<>''manager'') THEN
     RETURN jsonb_build_object(''allowed'',FALSE,''reason'',''role_forbidden'',''enabled'',TRUE); END IF;
 END IF;
 IF NOT public.subscription_write_guard_active(p_owner) THEN
   RETURN jsonb_build_object(''allowed'',TRUE,''reason'',''pilot_not_enabled'',''enabled'',FALSE); END IF;
 v_level:=CASE public.subscription_effective_plan(p_owner) WHEN ''team'' THEN 2 WHEN ''pro'' THEN 1 ELSE 0 END;
 RETURN jsonb_build_object(''allowed'',v_level>=v_min,''reason'',CASE WHEN v_level>=v_min THEN ''allowed'' ELSE ''plan_required'' END,''enabled'',TRUE);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.check_user_market_permission(p_market_id uuid, p_required_role text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")))) THEN RETURN false;END IF;
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 查詢用戶角色
  SELECT role INTO v_user_role
  FROM market_members
  WHERE market_id = p_market_id
    AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- 如果需要特定角色
  IF p_required_role IS NOT NULL THEN
    RETURN v_user_role = p_required_role;
  END IF;
  
  RETURN TRUE;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.claim_product_cover_photo_upload(p_actor_id uuid, p_product_id uuid, p_photo_id uuid, p_version bigint, p_requested_bytes integer, p_max_account_bytes bigint)
 RETURNS product_cover_photos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''product'',''value'',to_jsonb("p_product_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_photo_id"))));
DECLARE
  v_product public.products%ROWTYPE;
  v_row public.product_cover_photos%ROWTYPE;
  v_allowed boolean := false;
  v_used_bytes bigint := 0;
BEGIN
  SELECT * INTO v_product FROM public.products
  WHERE id = p_product_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION ''product_not_found''; END IF;

  v_allowed := v_product.owner_id = p_actor_id OR EXISTS (
    SELECT 1 FROM public.staff_relationships sr
    WHERE sr.owner_id = v_product.owner_id AND sr.staff_id = p_actor_id
      AND sr.status = ''active'' AND sr.role = ''manager''
  );
  IF NOT v_allowed THEN RAISE EXCEPTION ''permission_denied''; END IF;
  -- FERIA_PRODUCT_PHOTO_AUTH_V1
  IF NOT public.product_cover_photo_write_allowed(p_actor_id,v_product.owner_id) THEN
    RAISE EXCEPTION ''paid_entitlement_required'';
  END IF;

  IF p_requested_bytes NOT BETWEEN 2 AND 750000 OR p_max_account_bytes < 750000 THEN
    RAISE EXCEPTION ''invalid_storage_limit'';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_product.owner_id::text, 0));
  SELECT COALESCE(SUM(COALESCE(display_size_bytes, 0) + COALESCE(thumbnail_size_bytes, 0)), 0)
    INTO v_used_bytes
  FROM public.product_cover_photos
  WHERE owner_id = v_product.owner_id AND product_id <> p_product_id
    AND status = ''uploaded'' AND deleted_at IS NULL;
  IF v_used_bytes + p_requested_bytes > p_max_account_bytes THEN
    RAISE EXCEPTION ''storage_quota_exceeded'';
  END IF;

  INSERT INTO public.product_cover_photos(id, owner_id, product_id, status, version, upload_lease_expires_at)
  VALUES (p_photo_id, v_product.owner_id, p_product_id, ''uploading'', p_version, pg_catalog.clock_timestamp() + interval ''10 minutes'')
  ON CONFLICT (product_id) WHERE deleted_at IS NULL DO UPDATE SET
    status = CASE WHEN product_cover_photos.status = ''uploaded'' THEN ''uploaded'' ELSE ''uploading'' END,
    pending_photo_id = CASE WHEN product_cover_photos.status = ''uploaded'' THEN p_photo_id ELSE NULL END,
    pending_version = CASE WHEN product_cover_photos.status = ''uploaded'' THEN p_version ELSE NULL END,
    id = CASE WHEN product_cover_photos.status = ''uploaded'' THEN product_cover_photos.id ELSE p_photo_id END,
    version = CASE WHEN product_cover_photos.status = ''uploaded'' THEN product_cover_photos.version ELSE p_version END,
    upload_lease_expires_at = pg_catalog.clock_timestamp() + interval ''10 minutes'',
    last_error_code = NULL, updated_at = pg_catalog.clock_timestamp()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.claim_product_cover_photo_upload(p_actor_id uuid, p_product_id uuid, p_photo_id uuid, p_version bigint, p_requested_bytes integer, p_max_account_bytes bigint, p_require_entitlement boolean)
 RETURNS product_cover_photos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''product'',''value'',to_jsonb("p_product_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_photo_id"))));
BEGIN
          -- FERIA_PHOTO_VERSION_COMPAT_V2
          -- The current server performs entitlement checks before calling false.
          -- An older deployed base has no entitlement switch: true/null deny.
          IF p_require_entitlement IS DISTINCT FROM false THEN
            RAISE EXCEPTION ''paid_entitlement_required'';
          END IF;
          RETURN public.claim_product_cover_photo_upload(p_actor_id, p_product_id, p_photo_id, p_version, p_requested_bytes, p_max_account_bytes);
        END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE n integer;BEGIN
  DELETE FROM public.staff_invitations WHERE expires_at<now()
    AND deletion_engine_private.identity_allowed(owner_id,false)
    AND (owner_id=auth.uid() OR auth.role()=''service_role'');GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.cleanup_old_snapshots(p_user_id uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_user_id"))));
  IF auth.role() IS DISTINCT FROM ''service_role'' AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''snapshot_owner_scope'';END IF;
DECLARE n integer;BEGIN
  WITH kept AS(SELECT id FROM public.snapshots WHERE user_id=p_user_id ORDER BY snapshot_at DESC LIMIT 2)
  DELETE FROM public.snapshots WHERE user_id=p_user_id AND id NOT IN(SELECT id FROM kept);
  GET DIAGNOSTICS n=ROW_COUNT;RETURN n;END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.create_staff_invitation()
 RETURNS staff_invitations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_owner_id uuid := auth.uid();
  v_record public.staff_invitations%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION ''An active Team subscription is required.'' USING ERRCODE = ''42501'';
  END IF;

  INSERT INTO public.staff_invitations (owner_id, token, expires_at)
  VALUES (
    v_owner_id,
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, ''-'', ''''),
    pg_catalog.now() + interval ''3 days''
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.current_user_market_ids()
 RETURNS TABLE(market_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
RETURN QUERY SELECT mm.market_id
  FROM public.market_members AS mm
  JOIN public.markets AS m ON m.id = mm.market_id
  WHERE mm.user_id = auth.uid()
    AND (
      mm.role = ''owner''
      OR (
        mm.role = ''staff''
        AND public.has_authoritative_team_entitlement(m.owner_id)
        AND EXISTS (
          SELECT 1
          FROM public.staff_relationships AS sr
          WHERE sr.owner_id = m.owner_id
            AND sr.staff_id = auth.uid()
            AND sr.status = ''active''
        )
      )
    );
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.current_user_owned_market_ids()
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
RETURN QUERY SELECT id
  FROM public.markets
  WHERE owner_id = auth.uid();
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.deal_projection_delta(event_id uuid, market uuid, event_type text, event_payload jsonb)
 RETURNS TABLE(revenue numeric, cost numeric, deal_count numeric, items jsonb, direction integer, stock_direction integer)
 LANGUAGE plpgsql
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''event'',''value'',to_jsonb("event_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("market")),jsonb_build_object(''kind'',''json'',''value'',to_jsonb("event_payload"))));
DECLARE
  source_payload JSONB;
  target_id TEXT;
  backfill BOOLEAN;
  manual BOOLEAN;
  event_tx XID;
  event_command CID;
  source_tx XID;
  source_command CID;
BEGIN
  PERFORM 1 FROM public.markets WHERE id = market FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT e.xmin, e.cmin INTO event_tx, event_command FROM public.events e WHERE e.id = event_id;

  IF event_type = ''deal_closed'' THEN
    target_id := event_id::TEXT;
    source_payload := event_payload;
    direction := 1;
  ELSIF event_type = ''deal_deleted'' THEN
    target_id := COALESCE(event_payload->>''eventId'', event_payload->>''event_id'');
    SELECT e.payload, e.xmin, e.cmin INTO source_payload, source_tx, source_command FROM public.events e
      WHERE e.id::TEXT = target_id AND e.market_id = market AND e.type = ''deal_closed'';
    IF NOT FOUND THEN RETURN; END IF;
    -- AFTER ROW triggers see every row inserted by the same SQL command.
    -- An original and its tombstone in one batch cancel without either delta.
    -- Compare current insertion MVCC identity, never wall-clock timestamps.
    IF source_tx = event_tx AND source_command = event_command THEN RETURN; END IF;
    direction := -1;
  ELSE RETURN;
  END IF;

  -- Duplicate deletion events and delete-before-original delivery are no-ops.
  -- Never trust deletion-supplied amounts, quantities or a cross-market target.
  IF EXISTS (SELECT 1 FROM public.events e WHERE e.market_id = market
    AND e.type = ''deal_deleted'' AND e.id <> event_id
    -- For duplicate tombstones in one batch, exactly the lowest UUID wins.
    AND NOT (event_type = ''deal_deleted'' AND e.xmin = event_tx AND e.cmin = event_command AND e.id > event_id)
    AND COALESCE(e.payload->>''eventId'', e.payload->>''event_id'') = target_id) THEN RETURN; END IF;

  SELECT t.revenue, t.cost, t.deal_count INTO revenue, cost, deal_count
    FROM public.deal_projection_totals(source_payload) t;
  manual := COALESCE(source_payload->''isManualEntry'' = ''true''::JSONB, FALSE)
    OR COALESCE(source_payload->''is_manual_entry'' = ''true''::JSONB, FALSE);
  backfill := COALESCE(source_payload->''isBackfill'' = ''true''::JSONB, FALSE)
    OR COALESCE(source_payload->''is_backfill'' = ''true''::JSONB, FALSE);
  items := CASE WHEN NOT manual AND jsonb_typeof(source_payload->''items'') = ''array''
    THEN source_payload->''items'' ELSE ''[]''::JSONB END;
  stock_direction := CASE
    WHEN manual OR backfill THEN 0
    WHEN direction = 1 THEN -1
    -- Unknown legacy backfill mode must never increase inventory on deletion.
    WHEN jsonb_typeof(source_payload->''isBackfill'') = ''boolean''
      OR jsonb_typeof(source_payload->''is_backfill'') = ''boolean'' THEN 1
    ELSE 0 END;
  RETURN NEXT;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.decline_staff_email_invitation(p_relationship_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''relationship'',''value'',to_jsonb("p_relationship_id"))));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;

  DELETE FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND staff_id = auth.uid()
    AND status = ''pending'';

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Pending staff invitation not found.'' USING ERRCODE = ''P0002'';
  END IF;
  RETURN true;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.delete_current_user_app_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''legacy_account_delete_disabled'';
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := ''{}''::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required'';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = v_user_id;

  DELETE FROM staff_invitations
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''staff_invitations'', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = v_user_id
     OR staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''staff_relationships'', v_count);

  DELETE FROM market_members
  WHERE user_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''market_members'', v_count);

  DELETE FROM events
  WHERE actor_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''events'', v_count);

  DELETE FROM products
  WHERE owner_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''products'', v_count);

  DELETE FROM snapshots
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''snapshots'', v_count);

  DELETE FROM user_settings
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''user_settings'', v_count);

  DELETE FROM events_archive
  WHERE actor_id = v_user_id
     OR archived_by = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''events_archive'', v_count);

  DELETE FROM markets
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''markets'', v_count);

  RETURN v_result || jsonb_build_object(''user_id'', v_user_id);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.delete_product_cover_photo(p_actor_id uuid, p_product_id uuid)
 RETURNS product_cover_photos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''product'',''value'',to_jsonb("p_product_id"))));
DECLARE v_row public.product_cover_photos%ROWTYPE;
BEGIN
  UPDATE public.product_cover_photos p SET status = ''deleting'', deleted_at = pg_catalog.clock_timestamp(),
    updated_at = pg_catalog.clock_timestamp()
  WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
    AND (p.owner_id = p_actor_id OR EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id = p.owner_id
      AND sr.staff_id = p_actor_id AND sr.status = ''active'' AND sr.role = ''manager''
    ))
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION ''cover_photo_not_found''; END IF;
  RETURN v_row;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.delete_revoked_staff_relationship(p_relationship_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''relationship'',''value'',to_jsonb("p_relationship_id"))));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;

  DELETE FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND owner_id = auth.uid()
    AND status = ''revoked'';

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Revoked staff relationship not found.'' USING ERRCODE = ''P0002'';
  END IF;
  RETURN true;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.delete_staff_invitation(p_invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''invitation'',''value'',to_jsonb("p_invitation_id"))));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;

  DELETE FROM public.staff_invitations
  WHERE id = p_invitation_id AND owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Invitation not found.'' USING ERRCODE = ''P0002'';
  END IF;
  RETURN true;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.drain_checklist_toggle_pending_operation(p_operation_id text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''operation'',''value'',to_jsonb("p_operation_id"))));
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''''));
  v_operation public.pending_operations%ROWTYPE;
  v_payload JSONB;
  v_item_id TEXT;
  v_event_id UUID;
  v_inserted_event_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_staff_role TEXT;
  v_existing_event RECORD;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_operation_id = '''' THEN
    RAISE EXCEPTION ''operation_id is required.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT *
  INTO v_operation
  FROM public.pending_operations po
  WHERE po.operation_id = v_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Pending operation not found.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_operation.actor_id <> v_actor_id THEN
    RAISE EXCEPTION ''Not authorized to drain this pending operation.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_operation.status IN (
    ''synced'',
    ''processing'',
    ''blocked_permission'',
    ''failed_permanent''
  ) THEN
    RETURN v_operation.status;
  END IF;

  IF v_operation.status NOT IN (''pending'', ''failed_retryable'') THEN
    RETURN v_operation.status;
  END IF;

  UPDATE public.pending_operations
  SET
    status = ''processing'',
    last_error_code = NULL,
    last_error_message = NULL
  WHERE operation_id = v_operation_id;

  BEGIN
    IF v_operation_id !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN
      UPDATE public.pending_operations
      SET
        status = ''failed_permanent'',
        last_error_code = ''invalid_operation_id'',
        last_error_message = ''operation_id must be a UUID to become an event id''
      WHERE operation_id = v_operation_id;
      RETURN ''failed_permanent'';
    END IF;

    v_event_id := v_operation_id::UUID;

    IF v_operation.operation_type <> ''checklist_item_toggle''
      OR v_operation.entity_type <> ''checklist_item''
    THEN
      UPDATE public.pending_operations
      SET
        status = ''failed_permanent'',
        last_error_code = ''unsupported_operation'',
        last_error_message = ''Only checklist_item_toggle can be drained by this RPC''
      WHERE operation_id = v_operation_id;
      RETURN ''failed_permanent'';
    END IF;

    v_payload := v_operation.payload;

    IF jsonb_typeof(v_payload) <> ''object''
      OR v_payload->>''market_id'' IS DISTINCT FROM v_operation.market_id::TEXT
      OR jsonb_typeof(v_payload->''completed'') <> ''boolean''
      OR v_payload ? ''text''
    THEN
      UPDATE public.pending_operations
      SET
        status = ''failed_permanent'',
        last_error_code = ''invalid_payload'',
        last_error_message = ''Checklist toggle payload must be completed-only and market-scoped''
      WHERE operation_id = v_operation_id;
      RETURN ''failed_permanent'';
    END IF;

    v_item_id := trim(COALESCE(v_payload->>''itemId'', ''''));

    IF v_item_id = ''''
      OR v_operation.entity_id <> v_item_id
    THEN
      UPDATE public.pending_operations
      SET
        status = ''failed_permanent'',
        last_error_code = ''invalid_entity'',
        last_error_message = ''Checklist toggle entity_id must match payload.itemId''
      WHERE operation_id = v_operation_id;
      RETURN ''failed_permanent'';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.markets m
      WHERE m.id = v_operation.market_id
        AND m.owner_id = v_operation.actor_id
    )
    INTO v_is_authorized;

    IF NOT v_is_authorized THEN
      SELECT sr.role
      INTO v_staff_role
      FROM public.markets m
      JOIN public.staff_relationships sr
        ON sr.owner_id = m.owner_id
      WHERE m.id = v_operation.market_id
        AND sr.staff_id = v_operation.actor_id
        AND sr.status = ''active''
      LIMIT 1;

      IF v_staff_role IS NULL OR v_staff_role NOT IN (''operator'', ''manager'') THEN
        UPDATE public.pending_operations
        SET
          status = ''blocked_permission'',
          last_error_code = ''permission_denied'',
          last_error_message = ''Actor no longer has checklist toggle permission''
        WHERE operation_id = v_operation_id;
        RETURN ''blocked_permission'';
      END IF;
    END IF;

    SELECT
      e.type,
      e.payload,
      e.actor_id,
      e.market_id
    INTO v_existing_event
    FROM public.events e
    WHERE e.id = v_event_id;

    IF FOUND THEN
      IF v_existing_event.type = ''checklist_item_updated''
        AND v_existing_event.payload = v_payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = ''synced'',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;
        RETURN v_event_id::TEXT;
      END IF;

      UPDATE public.pending_operations
      SET
        status = ''failed_permanent'',
        last_error_code = ''event_id_collision'',
        last_error_message = ''A different event already uses this operation_id''
      WHERE operation_id = v_operation_id;
      RETURN ''failed_permanent'';
    END IF;

    INSERT INTO public.events (
      id,
      type,
      payload,
      actor_id,
      market_id,
      timestamp,
      metadata
    )
    VALUES (
      v_event_id,
      ''checklist_item_updated'',
      v_payload,
      v_operation.actor_id,
      v_operation.market_id,
      v_operation.created_at,
      jsonb_build_object(
        ''source'', ''pending_operations'',
        ''pendingOperationId'', v_operation.operation_id,
        ''idempotencyKey'', v_operation.idempotency_key,
        ''drainedAt'', NOW()
      )
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_inserted_event_id;

    IF v_inserted_event_id IS NULL THEN
      SELECT
        e.type,
        e.payload,
        e.actor_id,
        e.market_id
      INTO v_existing_event
      FROM public.events e
      WHERE e.id = v_event_id;

      IF FOUND
        AND v_existing_event.type = ''checklist_item_updated''
        AND v_existing_event.payload = v_payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = ''synced'',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;
        RETURN v_event_id::TEXT;
      END IF;

      UPDATE public.pending_operations
      SET
        status = ''failed_permanent'',
        last_error_code = ''event_id_collision'',
        last_error_message = ''A different event already uses this operation_id''
      WHERE operation_id = v_operation_id;
      RETURN ''failed_permanent'';
    END IF;

    UPDATE public.pending_operations
    SET
      status = ''synced'',
      last_error_code = NULL,
      last_error_message = NULL
    WHERE operation_id = v_operation_id;

    RETURN v_event_id::TEXT;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.pending_operations
    SET
      status = ''failed_retryable'',
      retry_count = retry_count + 1,
      last_error_code = SQLSTATE,
      last_error_message = SQLERRM
    WHERE operation_id = v_operation_id;

    RETURN ''failed_retryable'';
  END;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_billing_event_inbox_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF TG_OP = ''INSERT'' THEN
    IF NOT (
      (
        NEW.verification_status IN (''pending'', ''verified'')
        AND NEW.processing_status = ''pending''
        AND NEW.attempt_count = 0
      )
      OR (
        NEW.verification_status = ''rejected''
        AND NEW.processing_status = ''ignored''
        AND NEW.attempt_count = 0
      )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_event_invalid_initial_state'';
    END IF;

    NEW.updated_at := pg_catalog.clock_timestamp();
    RETURN NEW;
  END IF;

  IF ROW(
    NEW.id,
    NEW.billing_origin,
    NEW.provider_environment,
    NEW.provider_event_ref,
    NEW.payload_hash,
    NEW.event_kind,
    NEW.provider_occurred_at,
    NEW.received_at,
    NEW.raw_payload_ciphertext_ref,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.billing_origin,
    OLD.provider_environment,
    OLD.provider_event_ref,
    OLD.payload_hash,
    OLD.event_kind,
    OLD.provider_occurred_at,
    OLD.received_at,
    OLD.raw_payload_ciphertext_ref,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_event_identity_immutable'';
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
    AND NOT (
      OLD.verification_status = ''pending''
      AND NEW.verification_status IN (''verified'', ''rejected'')
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_event_invalid_verification_transition'';
  END IF;

  IF NEW.processing_status IS DISTINCT FROM OLD.processing_status THEN
    IF NOT (
      (OLD.processing_status = ''pending''
        AND NEW.processing_status IN (''processing'', ''ignored'', ''terminal_failed''))
      OR (OLD.processing_status = ''processing''
        AND NEW.processing_status IN (''processed'', ''retryable_failed'', ''terminal_failed''))
      OR (OLD.processing_status = ''retryable_failed''
        AND NEW.processing_status IN (''processing'', ''terminal_failed''))
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_event_invalid_processing_transition'';
    END IF;
  ELSIF NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_event_noop_update'';
  END IF;

  IF NEW.processing_status = ''processing'' THEN
    IF NEW.attempt_count <> OLD.attempt_count + 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_event_attempt_increment_required'';
    END IF;
  ELSIF NEW.attempt_count <> OLD.attempt_count THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_event_attempt_change_forbidden'';
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_billing_reconciliation_run_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_event public.billing_event_inbox%ROWTYPE;
BEGIN
  IF NEW.trigger_event_inbox_id IS NOT NULL THEN
    SELECT *
    INTO v_event
    FROM public.billing_event_inbox AS bei
    WHERE bei.id = NEW.trigger_event_inbox_id;

    IF NOT FOUND
      OR v_event.verification_status <> ''verified''
      OR ROW(v_event.billing_origin, v_event.provider_environment)
        IS DISTINCT FROM ROW(NEW.billing_origin, NEW.provider_environment) THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_reconciliation_event_identity_mismatch'';
    END IF;
  END IF;

  IF TG_OP = ''INSERT'' THEN
    IF NEW.status <> ''running'' THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_reconciliation_invalid_initial_state'';
    END IF;

    NEW.updated_at := pg_catalog.clock_timestamp();
    RETURN NEW;
  END IF;

  IF ROW(
    NEW.id,
    NEW.owner_id,
    NEW.billing_origin,
    NEW.provider_environment,
    NEW.trigger_kind,
    NEW.trigger_event_inbox_id,
    NEW.started_at,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.owner_id,
    OLD.billing_origin,
    OLD.provider_environment,
    OLD.trigger_kind,
    OLD.trigger_event_inbox_id,
    OLD.started_at,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_reconciliation_identity_immutable'';
  END IF;

  IF OLD.status <> ''running''
    OR NEW.status NOT IN (''succeeded'', ''no_change'', ''failed'') THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_reconciliation_invalid_transition'';
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_billing_storefront_mapping_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_price_status TEXT;
BEGIN
  IF TG_OP = ''UPDATE'' AND ROW(
    NEW.id,
    NEW.price_version_id,
    NEW.billing_origin,
    NEW.provider_environment,
    NEW.mapping_mode,
    NEW.provider_product_ref,
    NEW.provider_price_ref,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.price_version_id,
    OLD.billing_origin,
    OLD.provider_environment,
    OLD.mapping_mode,
    OLD.provider_product_ref,
    OLD.provider_price_ref,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_storefront_mapping_immutable_fields'';
  END IF;

  IF TG_OP = ''UPDATE'' THEN
    IF OLD.mapping_status = ''candidate'' THEN
      IF NEW.mapping_status NOT IN (''candidate'', ''active'', ''retired'') THEN
        RAISE EXCEPTION USING
          ERRCODE = ''23514'',
          MESSAGE = ''billing_storefront_mapping_invalid_transition'';
      END IF;
    ELSIF OLD.mapping_status = ''active'' THEN
      IF NEW.mapping_status NOT IN (''active'', ''retired'')
        OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
        OR NEW.evidence_reference IS DISTINCT FROM OLD.evidence_reference
        OR NEW.activated_at IS DISTINCT FROM OLD.activated_at THEN
        RAISE EXCEPTION USING
          ERRCODE = ''23514'',
          MESSAGE = ''billing_storefront_mapping_invalid_transition'';
      END IF;
    ELSE
      IF ROW(
        NEW.mapping_status,
        NEW.verified_at,
        NEW.evidence_reference,
        NEW.activated_at,
        NEW.retired_at
      ) IS DISTINCT FROM ROW(
        OLD.mapping_status,
        OLD.verified_at,
        OLD.evidence_reference,
        OLD.activated_at,
        OLD.retired_at
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = ''23514'',
          MESSAGE = ''billing_storefront_mapping_retired'';
      END IF;
    END IF;
  END IF;

  IF NEW.mapping_status = ''active'' THEN
    SELECT spv.commercial_status
    INTO v_price_status
    FROM public.subscription_price_versions AS spv
    WHERE spv.id = NEW.price_version_id;

    IF v_price_status IS DISTINCT FROM ''active'' THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_storefront_mapping_price_not_active'';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_billing_subscription_snapshot_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_customer public.billing_customer_links%ROWTYPE;
BEGIN
  SELECT *
  INTO v_customer
  FROM public.billing_customer_links AS bcl
  WHERE bcl.id = NEW.billing_customer_link_id;

  IF NOT FOUND
    OR ROW(
      v_customer.owner_id,
      v_customer.billing_origin,
      v_customer.provider_environment
    ) IS DISTINCT FROM ROW(
      NEW.owner_id,
      NEW.billing_origin,
      NEW.provider_environment
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_subscription_customer_identity_mismatch'';
  END IF;

  IF TG_OP = ''UPDATE'' THEN
    IF ROW(
      NEW.id,
      NEW.billing_customer_link_id,
      NEW.owner_id,
      NEW.billing_origin,
      NEW.provider_environment,
      NEW.provider_subscription_ref,
      NEW.created_at
    ) IS DISTINCT FROM ROW(
      OLD.id,
      OLD.billing_customer_link_id,
      OLD.owner_id,
      OLD.billing_origin,
      OLD.provider_environment,
      OLD.provider_subscription_ref,
      OLD.created_at
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_subscription_identity_immutable'';
    END IF;

    IF NEW.provider_observed_at <= OLD.provider_observed_at THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_subscription_stale_snapshot'';
    END IF;

    IF OLD.provider_sequence IS NOT NULL
      AND NEW.provider_sequence IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_subscription_sequence_cleared'';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_billing_transaction_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_subscription public.billing_subscriptions%ROWTYPE;
BEGIN
       IF TG_OP=''DELETE''THEN IF deletion_billing_private.authorize_delete(TG_TABLE_NAME,to_jsonb(OLD))THEN RETURN OLD;END IF;END IF;
  IF TG_OP <> ''INSERT'' THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''billing_transaction_append_only'';
  END IF;

  IF NEW.billing_subscription_id IS NOT NULL THEN
    SELECT *
    INTO v_subscription
    FROM public.billing_subscriptions AS bs
    WHERE bs.id = NEW.billing_subscription_id;

    IF NOT FOUND
      OR ROW(
        v_subscription.owner_id,
        v_subscription.billing_origin,
        v_subscription.provider_environment
      ) IS DISTINCT FROM ROW(
        NEW.owner_id,
        NEW.billing_origin,
        NEW.provider_environment
      ) THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''billing_transaction_subscription_identity_mismatch'';
    END IF;
  END IF;

  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_event_actor_authorization()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  actor UUID := auth.uid(); target_market UUID; alias_market UUID;
  target_product UUID; alias_product UUID; target_owner UUID; market_owner UUID;
  staff_role TEXT; key TEXT; updates JSONB;
  source_event public.events%ROWTYPE; reference_id UUID; item JSONB;
BEGIN
       IF TG_OP IN(''UPDATE'',''DELETE'')AND deletion_engine_private.authorize_event_change(to_jsonb(OLD),CASE WHEN TG_OP=''UPDATE''THEN to_jsonb(NEW)ELSE NULL END,TG_OP)THEN
        IF TG_OP=''DELETE''THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
  IF auth.role() = ''service_role'' THEN
    IF TG_OP = ''DELETE'' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;
  IF actor IS NULL OR auth.role() IS DISTINCT FROM ''authenticated'' THEN
    RAISE EXCEPTION ''EVENT_AUTH_IDENTITY'' USING ERRCODE=''42501'';
  END IF;
  IF TG_OP = ''DELETE'' THEN RAISE EXCEPTION ''EVENT_AUTH_IMMUTABLE'' USING ERRCODE=''42501''; END IF;
  IF NEW.actor_id IS DISTINCT FROM actor THEN RAISE EXCEPTION ''EVENT_AUTH_ACTOR'' USING ERRCODE=''42501''; END IF;
  IF TG_OP = ''UPDATE'' THEN
    IF OLD.actor_id IS DISTINCT FROM actor OR
       (to_jsonb(NEW) - ''metadata'' - ''sync_status'') IS DISTINCT FROM
       (to_jsonb(OLD) - ''metadata'' - ''sync_status'') THEN
      RAISE EXCEPTION ''EVENT_AUTH_IMMUTABLE'' USING ERRCODE=''42501'';
    END IF;
    RETURN NEW;
  END IF;
  IF jsonb_typeof(NEW.payload) IS DISTINCT FROM ''object'' THEN
    RAISE EXCEPTION ''EVENT_AUTH_PAYLOAD'' USING ERRCODE=''22023'';
  END IF;
  target_market := NEW.market_id;
  FOREACH key IN ARRAY ARRAY[''market_id'',''marketId''] LOOP
    alias_market := NULLIF(NEW.payload->>key,'''')::UUID;
    IF alias_market IS NOT NULL THEN
      IF target_market IS NOT NULL AND alias_market <> target_market THEN
        RAISE EXCEPTION ''EVENT_AUTH_MARKET_ALIAS'' USING ERRCODE=''42501'';
      END IF;
      target_market := alias_market;
    END IF;
  END LOOP;
  IF target_market IS NOT NULL THEN
    SELECT owner_id INTO market_owner FROM public.markets WHERE id=target_market;
  END IF;
  IF NEW.type IN (''venue_created'',''venue_updated'',''venue_archived'',
      ''operation_schedule_created'',''operation_schedule_updated'',''operation_schedule_paused'',
      ''operation_schedule_resumed'',''operation_schedule_archived'',''settings_updated'') THEN
    IF NOT public.can_manage_recurring_operations() OR
       (target_market IS NOT NULL AND market_owner IS DISTINCT FROM actor) THEN
      RAISE EXCEPTION ''EVENT_AUTH_OWNER_ONLY'' USING ERRCODE=''42501'';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.type = ''market_created'' THEN
    IF NOT public.can_manage_recurring_operations() OR NEW.market_id IS NULL OR
       (market_owner IS NOT NULL AND market_owner <> actor) THEN
      RAISE EXCEPTION ''EVENT_AUTH_OWNER_ONLY'' USING ERRCODE=''42501'';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.type IN (''product_created'',''product_updated'',''product_deleted'') THEN
    target_product := NULLIF(NEW.payload->>''productId'','''')::UUID;
    alias_product := NULLIF(NEW.payload->>''product_id'','''')::UUID;
    IF target_product IS NULL OR (alias_product IS NOT NULL AND alias_product <> target_product) THEN
      RAISE EXCEPTION ''EVENT_AUTH_PRODUCT_ALIAS'' USING ERRCODE=''42501'';
    END IF;
    SELECT owner_id INTO target_owner FROM public.products WHERE id=target_product;
    IF NEW.type=''product_created'' THEN
      IF NOT public.can_manage_recurring_operations() OR
         (target_owner IS NOT NULL AND target_owner <> actor) OR
         (target_market IS NOT NULL AND market_owner IS DISTINCT FROM actor) THEN
        RAISE EXCEPTION ''EVENT_AUTH_OWNER_ONLY'' USING ERRCODE=''42501'';
      END IF;
      RETURN NEW;
    END IF;
    IF target_owner IS NULL OR (target_market IS NOT NULL AND market_owner IS DISTINCT FROM target_owner) THEN
      RAISE EXCEPTION ''EVENT_AUTH_SCOPE'' USING ERRCODE=''42501'';
    END IF;
  ELSE
    IF NEW.type NOT IN (''market_updated'',''market_status_changed'',''market_started'',''market_ended'',''market_deleted'',
       ''deal_closed'',''deal_deleted'',''interaction_recorded'',''interaction_deleted'',
       ''field_note_created'',''field_note_updated'',''field_note_deleted'',
       ''checklist_item_created'',''checklist_item_updated'',''checklist_item_deleted'') THEN
      RAISE EXCEPTION ''EVENT_AUTH_UNSUPPORTED'' USING ERRCODE=''42501'';
    END IF;
    target_owner := market_owner;
    IF target_market IS NULL OR target_owner IS NULL THEN RAISE EXCEPTION ''EVENT_AUTH_SCOPE'' USING ERRCODE=''42501''; END IF;
    IF NEW.type IN (''market_status_changed'',''market_started'',''market_ended'',
       ''deal_closed'',''deal_deleted'',''interaction_recorded'') AND NEW.market_id IS NULL THEN
      RAISE EXCEPTION ''EVENT_AUTH_SCOPE'' USING ERRCODE=''42501'';
    END IF;
  END IF;
  IF NEW.type=''deal_closed'' AND NEW.payload ? ''items'' THEN
    IF jsonb_typeof(NEW.payload->''items'') IS DISTINCT FROM ''array'' THEN RAISE EXCEPTION ''EVENT_AUTH_ITEMS'' USING ERRCODE=''22023''; END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(NEW.payload->''items'') LOOP
      target_product := NULLIF(COALESCE(item->>''productId'',item->>''product_id''),'''')::UUID;
      alias_product := NULLIF(item->>''product_id'','''')::UUID;
      IF target_product IS NULL OR (alias_product IS NOT NULL AND alias_product<>target_product) OR
         NOT EXISTS(SELECT 1 FROM public.products WHERE id=target_product AND owner_id=target_owner) THEN
        RAISE EXCEPTION ''EVENT_AUTH_PRODUCT_SCOPE'' USING ERRCODE=''42501'';
      END IF;
    END LOOP;
  END IF;
  IF NEW.type IN (''deal_deleted'',''interaction_deleted'') THEN
    reference_id := NULLIF(COALESCE(NEW.payload->>''eventId'',NEW.payload->>''event_id''),'''')::UUID;
    IF reference_id IS NULL OR (NEW.payload ? ''event_id'' AND
        NULLIF(NEW.payload->>''event_id'','''')::UUID IS DISTINCT FROM reference_id) THEN
      RAISE EXCEPTION ''EVENT_AUTH_REFERENCE'' USING ERRCODE=''42501'';
    END IF;
    SELECT * INTO source_event FROM public.events WHERE id=reference_id;
    IF FOUND AND (source_event.market_id IS DISTINCT FROM target_market OR
        source_event.type IS DISTINCT FROM CASE NEW.type WHEN ''deal_deleted'' THEN ''deal_closed'' ELSE ''interaction_recorded'' END) THEN
      RAISE EXCEPTION ''EVENT_AUTH_REFERENCE'' USING ERRCODE=''42501'';
    END IF;
  END IF;
  IF target_owner=actor THEN RETURN NEW; END IF;
  SELECT role INTO staff_role FROM public.staff_relationships
    WHERE owner_id=target_owner AND staff_id=actor AND status=''active'' FOR SHARE;
  IF staff_role IS NULL OR staff_role NOT IN (''operator'',''manager'') OR
     NOT public.has_authoritative_team_entitlement(target_owner) THEN
    RAISE EXCEPTION ''EVENT_AUTH_ROLE'' USING ERRCODE=''42501'';
  END IF;
  CASE NEW.type
    WHEN ''deal_closed'' THEN NULL;
    WHEN ''interaction_recorded'' THEN
      IF ''field_note''=ANY(ARRAY[NEW.payload->>''type'',NEW.payload->>''interactionType'',NEW.payload->>''interaction_type'']) AND staff_role<>''manager'' THEN RAISE EXCEPTION ''EVENT_AUTH_ROLE'' USING ERRCODE=''42501''; END IF;
    WHEN ''deal_deleted'',''interaction_deleted'' THEN
      IF source_event.id IS NULL OR source_event.actor_id IS DISTINCT FROM actor OR
 (staff_role<>''manager'' AND ''field_note''=ANY(ARRAY[source_event.payload->>''type'',source_event.payload->>''interactionType'',source_event.payload->>''interaction_type''])) OR
         (source_event.timestamp AT TIME ZONE ''Asia/Taipei'')::DATE IS DISTINCT FROM (now() AT TIME ZONE ''Asia/Taipei'')::DATE OR
         (source_event.created_at AT TIME ZONE ''Asia/Taipei'')::DATE IS DISTINCT FROM (now() AT TIME ZONE ''Asia/Taipei'')::DATE THEN
        RAISE EXCEPTION ''EVENT_AUTH_OWN_TODAY'' USING ERRCODE=''42501'';
      END IF;
    WHEN ''market_updated'',''product_updated'' THEN
      updates := NEW.payload->''updates'';
      IF staff_role<>''manager'' OR jsonb_typeof(updates) IS DISTINCT FROM ''object'' THEN RAISE EXCEPTION ''EVENT_AUTH_ROLE'' USING ERRCODE=''42501''; END IF;
      FOR key IN SELECT jsonb_object_keys(updates) LOOP
        IF (NEW.type=''market_updated'' AND key NOT IN (''dates'',''startDate'',''endDate'',''start_date'',''end_date'',
            ''earlyEntryEnabled'',''early_entry_enabled'',''earlyEntryTime'',''early_entry_time'',
            ''checkInTime'',''check_in_time'',''operatingStartTime'',''operating_start_time'',
            ''operatingEndTime'',''operating_end_time'',''notes'')) OR
           (NEW.type=''product_updated'' AND key NOT IN (''price'',''stock'',''unlimitedStock'',''unlimited_stock'',''description'',''isActive'',''is_active'')) THEN
          RAISE EXCEPTION ''EVENT_AUTH_FIELD'' USING ERRCODE=''42501'';
        END IF;
      END LOOP;
    WHEN ''checklist_item_updated'' THEN
      IF staff_role=''operator'' AND (jsonb_typeof(NEW.payload->''completed'') IS DISTINCT FROM ''boolean'' OR
          (NEW.payload - ARRAY[''market_id'',''marketId'',''itemId'',''completed'']) <> ''{}''::JSONB) THEN
        RAISE EXCEPTION ''EVENT_AUTH_FIELD'' USING ERRCODE=''42501'';
      END IF;
    WHEN ''checklist_item_created'',''checklist_item_deleted'',''field_note_created'',''field_note_updated'',''field_note_deleted'' THEN
      IF staff_role<>''manager'' THEN RAISE EXCEPTION ''EVENT_AUTH_ROLE'' USING ERRCODE=''42501''; END IF;
    ELSE RAISE EXCEPTION ''EVENT_AUTH_OWNER_ONLY'' USING ERRCODE=''42501'';
  END CASE;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_subscription_event_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE v_event JSONB:=CASE WHEN TG_OP=''DELETE'' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 v_type TEXT; v_owner UUID; v_market UUID; v_product UUID; v_min INTEGER:=0; v_key TEXT; v_cloud_key TEXT; v_current JSONB; v_updates JSONB;
BEGIN
       IF TG_OP IN(''UPDATE'',''DELETE'')AND deletion_engine_private.authorize_event_change(to_jsonb(OLD),CASE WHEN TG_OP=''UPDATE''THEN to_jsonb(NEW)ELSE NULL END,TG_OP)THEN
        IF TG_OP=''DELETE''THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 -- Trusted service cleanup (e.g. account deletion) must remain possible.
 IF TG_OP=''DELETE'' AND auth.role()=''service_role'' THEN RETURN OLD; END IF;
 v_type:=v_event->>''type'';
 -- Metadata-only acknowledgements stay possible after a downgrade.
 -- For enrolled owners semantic changes must be expressed as new events.
 IF TG_OP=''UPDATE'' AND NEW.type IS NOT DISTINCT FROM OLD.type AND NEW.payload IS NOT DISTINCT FROM OLD.payload
   AND NEW.actor_id IS NOT DISTINCT FROM OLD.actor_id AND NEW.market_id IS NOT DISTINCT FROM OLD.market_id THEN RETURN NEW; END IF;
 IF TG_OP=''UPDATE'' THEN
   v_market:=COALESCE(OLD.market_id,(OLD.payload->>''market_id'')::UUID,(OLD.payload->>''marketId'')::UUID);
   IF v_market IS NOT NULL THEN SELECT m.owner_id INTO v_owner FROM public.markets m WHERE m.id=v_market;
   ELSIF OLD.type IN (''product_updated'',''product_deleted'') THEN
     SELECT p.owner_id INTO v_owner FROM public.products p WHERE p.id=COALESCE((OLD.payload->>''productId'')::UUID,(OLD.payload->>''product_id'')::UUID);
   ELSE v_owner:=OLD.actor_id; END IF;
   IF public.subscription_write_guard_active(v_owner) THEN RAISE EXCEPTION ''EVENT_IMMUTABLE'' USING ERRCODE=''42501''; END IF;
 END IF;
 v_owner:=NULL;
 IF v_type IN (''deal_closed'',''deal_deleted'',''interaction_recorded'',''interaction_deleted'',''product_created'',''product_updated'',''product_deleted'') THEN v_min:=1;
 ELSIF v_type IN (''field_note_created'',''field_note_updated'',''field_note_deleted'') THEN v_min:=2;
 ELSIF v_type=''market_updated'' THEN v_min:=0;
 ELSE IF TG_OP=''DELETE'' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 v_market:=COALESCE((v_event->>''market_id'')::UUID,(v_event#>>''{payload,market_id}'')::UUID,(v_event#>>''{payload,marketId}'')::UUID);
 IF v_market IS NOT NULL THEN
   SELECT m.owner_id,to_jsonb(m) INTO v_owner,v_current FROM public.markets m WHERE m.id=v_market;
 ELSIF v_type IN (''product_updated'',''product_deleted'') THEN
   v_product:=COALESCE((v_event#>>''{payload,productId}'')::UUID,(v_event#>>''{payload,product_id}'')::UUID);
   SELECT p.owner_id INTO v_owner FROM public.products p WHERE p.id=v_product;
 ELSE v_owner:=(v_event->>''actor_id'')::UUID; END IF;
 IF v_type=''market_updated'' THEN
   v_updates:=v_event#>''{payload,updates}'';
   FOREACH v_key IN ARRAY ARRAY[''total_revenue'',''total_profit'',''total_deals'',''total_interactions'',''totalRevenue'',''totalProfit'',''totalDeals'',''totalInteractions''] LOOP
     v_cloud_key:=CASE v_key WHEN ''totalRevenue'' THEN ''total_revenue'' WHEN ''totalProfit'' THEN ''total_profit'' WHEN ''totalDeals'' THEN ''total_deals'' WHEN ''totalInteractions'' THEN ''total_interactions'' ELSE v_key END;
     IF v_updates ? v_key AND COALESCE((v_updates->>v_key)::NUMERIC,0) IS DISTINCT FROM COALESCE((v_current->>v_cloud_key)::NUMERIC,0) THEN v_min:=1; END IF;
   END LOOP;
   IF v_min=0 THEN IF TG_OP=''DELETE'' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 END IF;
 PERFORM public.subscription_require_tier(v_owner,v_min);
 IF TG_OP=''DELETE'' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_subscription_market_summary()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE v_key TEXT; v_new JSONB:=to_jsonb(NEW); v_old JSONB:=CASE WHEN TG_OP=''INSERT'' THEN ''{}''::JSONB ELSE to_jsonb(OLD) END;
BEGIN
 FOREACH v_key IN ARRAY ARRAY[''total_revenue'',''total_profit'',''total_deals'',''total_interactions''] LOOP
   IF COALESCE((v_new->>v_key)::NUMERIC,0) IS DISTINCT FROM COALESCE((v_old->>v_key)::NUMERIC,0) THEN
     PERFORM public.subscription_require_tier(NEW.owner_id,1); EXIT; END IF;
 END LOOP;
 RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_subscription_price_assignment_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_price public.subscription_price_versions%ROWTYPE;
  v_mapping public.billing_storefront_price_mappings%ROWTYPE;
  v_mutable_changed BOOLEAN;
BEGIN
  SELECT *
  INTO v_price
  FROM public.subscription_price_versions AS spv
  WHERE spv.id = NEW.price_version_id;

  IF NOT FOUND OR v_price.commercial_status <> ''active'' THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''subscription_price_assignment_price_not_active'';
  END IF;

  SELECT *
  INTO v_mapping
  FROM public.billing_storefront_price_mappings AS bspm
  WHERE bspm.id = NEW.storefront_price_mapping_id;

  IF NOT FOUND
    OR v_mapping.mapping_status <> ''active''
    OR v_mapping.price_version_id <> NEW.price_version_id THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''subscription_price_assignment_mapping_not_active'';
  END IF;

  IF ROW(
    NEW.assigned_plan_code,
    NEW.assigned_cadence,
    NEW.assigned_currency,
    NEW.assigned_amount_minor,
    NEW.price_policy,
    NEW.founder_offer_code
  ) IS DISTINCT FROM ROW(
    v_price.plan_code,
    v_price.cadence,
    v_price.currency,
    v_price.amount_minor,
    v_price.price_policy,
    v_price.offer_code
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''subscription_price_assignment_catalog_mismatch'';
  END IF;

  IF TG_OP = ''INSERT''
    AND NEW.price_policy = ''founder_locked''
    AND NEW.assignment_source = ''billing''
    AND NEW.founder_lock_status <> ''active'' THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''subscription_price_assignment_invalid_initial_founder_state'';
  END IF;

  IF TG_OP = ''UPDATE'' THEN
    IF ROW(
      NEW.id,
      NEW.owner_id,
      NEW.storefront_price_mapping_id,
      NEW.price_version_id,
      NEW.assigned_plan_code,
      NEW.assigned_cadence,
      NEW.assigned_currency,
      NEW.assigned_amount_minor,
      NEW.price_policy,
      NEW.founder_offer_code,
      NEW.assignment_source,
      NEW.source_reference,
      NEW.continuity_started_at,
      NEW.assigned_at,
      NEW.created_at
    ) IS DISTINCT FROM ROW(
      OLD.id,
      OLD.owner_id,
      OLD.storefront_price_mapping_id,
      OLD.price_version_id,
      OLD.assigned_plan_code,
      OLD.assigned_cadence,
      OLD.assigned_currency,
      OLD.assigned_amount_minor,
      OLD.price_policy,
      OLD.founder_offer_code,
      OLD.assignment_source,
      OLD.source_reference,
      OLD.continuity_started_at,
      OLD.assigned_at,
      OLD.created_at
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_assignment_immutable_fields'';
    END IF;

    IF OLD.superseded_at IS NOT NULL
      AND NEW.superseded_at IS DISTINCT FROM OLD.superseded_at THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_assignment_superseded'';
    END IF;

    IF OLD.price_policy = ''founder_locked''
      AND NEW.founder_lock_status IS DISTINCT FROM OLD.founder_lock_status THEN
      IF NOT (
        (OLD.founder_lock_status = ''active''
          AND NEW.founder_lock_status IN (''grace'', ''dormant'', ''forfeited''))
        OR (OLD.founder_lock_status = ''grace''
          AND NEW.founder_lock_status IN (''active'', ''dormant'', ''forfeited''))
        OR (OLD.founder_lock_status = ''dormant''
          AND NEW.founder_lock_status IN (''active'', ''forfeited''))
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = ''23514'',
          MESSAGE = ''subscription_price_assignment_invalid_lock_transition'';
      END IF;

      IF NEW.founder_lock_status = ''dormant''
        AND (
          NEW.dormant_at IS NULL
          OR (OLD.dormant_at IS NOT NULL AND NEW.dormant_at <= OLD.dormant_at)
        ) THEN
        RAISE EXCEPTION USING
          ERRCODE = ''23514'',
          MESSAGE = ''subscription_price_assignment_dormant_timestamp_required'';
      END IF;

      IF OLD.founder_lock_status = ''dormant''
        AND NEW.founder_lock_status = ''active''
        AND NEW.dormant_at IS DISTINCT FROM OLD.dormant_at THEN
        RAISE EXCEPTION USING
          ERRCODE = ''23514'',
          MESSAGE = ''subscription_price_assignment_dormant_history_immutable'';
      END IF;
    ELSIF OLD.price_policy = ''founder_locked''
      AND NEW.dormant_at IS DISTINCT FROM OLD.dormant_at THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_assignment_dormant_transition_required'';
    END IF;

    v_mutable_changed := ROW(
      NEW.founder_lock_status,
      NEW.dormant_at,
      NEW.forfeited_at,
      NEW.forfeiture_reason,
      NEW.superseded_at
    ) IS DISTINCT FROM ROW(
      OLD.founder_lock_status,
      OLD.dormant_at,
      OLD.forfeited_at,
      OLD.forfeiture_reason,
      OLD.superseded_at
    );

    IF NOT v_mutable_changed THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_assignment_noop_update'';
    END IF;

    IF NEW.last_transition_at <= OLD.last_transition_at
      OR NEW.last_transition_reason IS NOT DISTINCT FROM OLD.last_transition_reason
      OR NEW.last_transition_evidence_reference
        IS NOT DISTINCT FROM OLD.last_transition_evidence_reference THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_assignment_transition_evidence_required'';
    END IF;

    NEW.assignment_revision := OLD.assignment_revision + 1;
  ELSE
    NEW.assignment_revision := 1;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_subscription_price_version_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF ROW(
    NEW.id,
    NEW.plan_code,
    NEW.cadence,
    NEW.currency,
    NEW.amount_minor,
    NEW.price_policy,
    NEW.offer_code,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.plan_code,
    OLD.cadence,
    OLD.currency,
    OLD.amount_minor,
    OLD.price_policy,
    OLD.offer_code,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = ''23514'',
      MESSAGE = ''subscription_price_version_immutable_fields'';
  END IF;

  IF OLD.commercial_status = ''candidate'' THEN
    IF NEW.commercial_status NOT IN (''candidate'', ''active'', ''retired'') THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_version_invalid_transition'';
    END IF;
  ELSIF OLD.commercial_status = ''active'' THEN
    IF NEW.commercial_status NOT IN (''active'', ''retired'')
      OR NEW.effective_at IS DISTINCT FROM OLD.effective_at THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_version_invalid_transition'';
    END IF;
  ELSE
    IF ROW(NEW.commercial_status, NEW.effective_at, NEW.retired_at)
      IS DISTINCT FROM ROW(OLD.commercial_status, OLD.effective_at, OLD.retired_at) THEN
      RAISE EXCEPTION USING
        ERRCODE = ''23514'',
        MESSAGE = ''subscription_price_version_retired'';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enforce_subscription_row_write()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
  IF deletion_engine_private.worker_row(TG_TABLE_NAME,CASE WHEN TG_OP=''INSERT'' THEN NULL ELSE to_jsonb(OLD) END,CASE WHEN TG_OP=''DELETE'' THEN NULL ELSE to_jsonb(NEW) END,TG_OP) THEN IF TG_OP=''DELETE'' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
DECLARE v_row JSONB:=CASE WHEN TG_OP=''DELETE'' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END; v_owner UUID; v_entity_owner UUID; v_min INTEGER:=TG_ARGV[0]::INTEGER;
BEGIN
 IF TG_OP=''DELETE'' AND auth.role()=''service_role'' THEN RETURN OLD; END IF;
 v_owner:=(v_row->>''owner_id'')::UUID;
 IF v_row->>''market_id'' IS NOT NULL THEN
   SELECT m.owner_id INTO v_entity_owner FROM public.markets m WHERE m.id=(v_row->>''market_id'')::UUID;
 ELSIF TG_TABLE_NAME=''product_cover_photos'' THEN
   SELECT p.owner_id INTO v_entity_owner FROM public.products p WHERE p.id=(v_row->>''product_id'')::UUID;
 ELSE v_entity_owner:=v_owner; END IF;
 IF v_owner IS NOT NULL AND v_entity_owner IS DISTINCT FROM v_owner THEN RAISE EXCEPTION ''SUBSCRIPTION_SCOPE'' USING ERRCODE=''42501''; END IF;
 v_owner:=v_entity_owner;
 IF TG_OP=''UPDATE'' AND v_row->>''owner_id'' IS DISTINCT FROM to_jsonb(OLD)->>''owner_id'' THEN
   RAISE EXCEPTION ''SUBSCRIPTION_SCOPE'' USING ERRCODE=''42501''; END IF;
 -- Failure/deletion/expiry compensation does not create a usable paid photo.
 IF TG_TABLE_NAME IN (''product_cover_photos'',''sale_photo_evidence'') AND TG_OP=''UPDATE''
   AND v_row->>''status'' IN (''upload_failed'',''deleting'',''expired'',''waived_by_owner'') THEN RETURN NEW; END IF;
 PERFORM public.subscription_require_tier(v_owner,v_min);
 IF TG_OP=''DELETE'' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.enqueue_checklist_toggle_pending_operation(p_operation_id text, p_market_id uuid, p_item_id text, p_completed boolean, p_idempotency_key text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''operation'',''value'',to_jsonb("p_operation_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id"))));
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''''));
  v_item_id TEXT := trim(COALESCE(p_item_id, ''''));
  v_idempotency_key TEXT := trim(COALESCE(p_idempotency_key, ''''));
  v_is_owner BOOLEAN := FALSE;
  v_staff_role TEXT;
  v_role_snapshot JSONB;
  v_payload JSONB;
  v_inserted_operation_id TEXT;
  v_existing_operation_id TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_operation_id = '''' THEN
    RAISE EXCEPTION ''operation_id is required.''
      USING ERRCODE = ''22023'';
  END IF;

  IF p_market_id IS NULL THEN
    RAISE EXCEPTION ''market_id is required.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_item_id = '''' THEN
    RAISE EXCEPTION ''item_id is required.''
      USING ERRCODE = ''22023'';
  END IF;

  IF p_completed IS NULL THEN
    RAISE EXCEPTION ''completed is required.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_idempotency_key = '''' THEN
    RAISE EXCEPTION ''idempotency_key is required.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = p_market_id
      AND m.owner_id = v_actor_id
  )
  INTO v_is_owner;

  IF v_is_owner THEN
    v_role_snapshot := jsonb_build_object(
      ''isOwner'', true,
      ''staffRole'', NULL,
      ''capabilities'', jsonb_build_array(''canToggleChecklistItem'')
    );
  ELSE
    SELECT sr.role
    INTO v_staff_role
    FROM public.markets m
    JOIN public.staff_relationships sr
      ON sr.owner_id = m.owner_id
    WHERE m.id = p_market_id
      AND sr.staff_id = v_actor_id
      AND sr.status = ''active''
    LIMIT 1;

    IF v_staff_role IS NULL OR v_staff_role NOT IN (''operator'', ''manager'') THEN
      RAISE EXCEPTION ''Not authorized to toggle checklist items for this market.''
        USING ERRCODE = ''42501'';
    END IF;

    v_role_snapshot := jsonb_build_object(
      ''isOwner'', false,
      ''staffRole'', v_staff_role,
      ''capabilities'', jsonb_build_array(''canToggleChecklistItem'')
    );
  END IF;

  v_payload := jsonb_build_object(
    ''market_id'', p_market_id::TEXT,
    ''itemId'', v_item_id,
    ''completed'', p_completed
  );

  INSERT INTO public.pending_operations (
    operation_id,
    operation_type,
    entity_type,
    entity_id,
    market_id,
    payload,
    idempotency_key,
    actor_id,
    role_snapshot,
    status,
    retry_count,
    last_error_code,
    last_error_message
  )
  VALUES (
    v_operation_id,
    ''checklist_item_toggle'',
    ''checklist_item'',
    v_item_id,
    p_market_id,
    v_payload,
    v_idempotency_key,
    v_actor_id,
    v_role_snapshot,
    ''pending'',
    0,
    NULL,
    NULL
  )
  ON CONFLICT (actor_id, idempotency_key) DO NOTHING
  RETURNING operation_id INTO v_inserted_operation_id;

  IF v_inserted_operation_id IS NOT NULL THEN
    RETURN v_inserted_operation_id;
  END IF;

  SELECT po.operation_id
  INTO v_existing_operation_id
  FROM public.pending_operations po
  WHERE po.actor_id = v_actor_id
    AND po.idempotency_key = v_idempotency_key
    AND po.operation_type = ''checklist_item_toggle''
    AND po.entity_type = ''checklist_item''
    AND po.entity_id = v_item_id
    AND po.market_id = p_market_id
    AND po.payload = v_payload;

  IF v_existing_operation_id IS NOT NULL THEN
    RETURN v_existing_operation_id;
  END IF;

  RAISE EXCEPTION ''Idempotency key already used for a different pending operation.''
    USING ERRCODE = ''23505'';
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.finalize_product_cover_photo_upload(p_actor_id uuid, p_product_id uuid, p_photo_id uuid, p_version bigint, p_display_object_key text, p_thumbnail_object_key text, p_display_content_hash text, p_thumbnail_content_hash text, p_display_mime_type text, p_thumbnail_mime_type text, p_display_size_bytes integer, p_thumbnail_size_bytes integer, p_width integer, p_height integer)
 RETURNS product_cover_photos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''product'',''value'',to_jsonb("p_product_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_photo_id"))));
DECLARE v_row public.product_cover_photos%ROWTYPE;
BEGIN
  -- FERIA_PRODUCT_PHOTO_AUTH_V1
  IF NOT EXISTS(SELECT 1 FROM public.product_cover_photos p
    WHERE p.product_id=p_product_id AND p.deleted_at IS NULL
      AND public.product_cover_photo_write_allowed(p_actor_id,p.owner_id)) THEN
    RAISE EXCEPTION ''paid_entitlement_required'';
  END IF;

  UPDATE public.product_cover_photos p SET
    id = p_photo_id, status = ''uploaded'', version = p_version,
    display_object_key = p_display_object_key, thumbnail_object_key = p_thumbnail_object_key,
    display_content_hash = p_display_content_hash, thumbnail_content_hash = p_thumbnail_content_hash,
    display_mime_type = p_display_mime_type, thumbnail_mime_type = p_thumbnail_mime_type,
    display_size_bytes = p_display_size_bytes, thumbnail_size_bytes = p_thumbnail_size_bytes,
    width = p_width, height = p_height, pending_photo_id = NULL, pending_version = NULL,
    upload_lease_expires_at = NULL, last_error_code = NULL,
    updated_at = pg_catalog.clock_timestamp()
  WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
    AND (
      (p.status = ''uploading'' AND p.id = p_photo_id AND p.version = p_version)
      OR (p.status = ''uploaded'' AND p.pending_photo_id = p_photo_id AND p.pending_version = p_version)
    )
    AND (p.owner_id = p_actor_id OR EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id = p.owner_id
      AND sr.staff_id = p_actor_id AND sr.status = ''active'' AND sr.role = ''manager''
    ))
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION ''cover_photo_not_claimed''; END IF;
  RETURN v_row;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.finalize_product_cover_photo_upload(p_actor_id uuid, p_product_id uuid, p_photo_id uuid, p_version bigint, p_display_object_key text, p_thumbnail_object_key text, p_display_content_hash text, p_thumbnail_content_hash text, p_display_mime_type text, p_thumbnail_mime_type text, p_display_size_bytes integer, p_thumbnail_size_bytes integer, p_width integer, p_height integer, p_require_entitlement boolean)
 RETURNS product_cover_photos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''product'',''value'',to_jsonb("p_product_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_photo_id"))));
BEGIN
          -- FERIA_PHOTO_VERSION_COMPAT_V2
          -- The current server performs entitlement checks before calling false.
          -- An older deployed base has no entitlement switch: true/null deny.
          IF p_require_entitlement IS DISTINCT FROM false THEN
            RAISE EXCEPTION ''paid_entitlement_required'';
          END IF;
          RETURN public.finalize_product_cover_photo_upload(p_actor_id, p_product_id, p_photo_id, p_version, p_display_object_key, p_thumbnail_object_key, p_display_content_hash, p_thumbnail_content_hash, p_display_mime_type, p_thumbnail_mime_type, p_display_size_bytes, p_thumbnail_size_bytes, p_width, p_height);
        END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.financial_review_source(p_market_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id"))));
DECLARE m public.markets%ROWTYPE; j jsonb; dates jsonb; fees jsonb; days jsonb; total numeric; rows jsonb; operation jsonb;
BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.subscription_effective_plan(auth.uid()),''free'') NOT IN(''pro'',''team'')
  OR public.subscription_read_owner_paid(auth.uid()) IS NOT TRUE THEN RAISE EXCEPTION ''FINANCE_SCOPE'' USING ERRCODE=''42501''; END IF;
 SELECT * INTO m FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,false);
 IF NOT FOUND THEN RAISE EXCEPTION ''FINANCE_SCOPE'' USING ERRCODE=''42501''; END IF;
 j:=to_jsonb(m);
 SELECT e.payload->''updates'' INTO operation FROM public.events e WHERE e.market_id=m.id AND e.type=''market_updated''
  AND ((e.payload->''updates'') ? ''operationPhase'' OR (e.payload->''updates'') ? ''operation_phase'') ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
 SELECT CASE WHEN e.type=''market_created'' THEN e.payload->''dates'' ELSE e.payload#>''{updates,dates}'' END INTO dates
 FROM public.events e WHERE (e.market_id=m.id OR (e.market_id IS NULL AND COALESCE(e.payload->>''marketId'',e.payload->>''market_id'')=m.id::text))
 AND ((e.type=''market_created'' AND jsonb_typeof(e.payload->''dates'')=''array'') OR (e.type=''market_updated'' AND jsonb_typeof(e.payload#>''{updates,dates}'')=''array''))
 ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
 IF jsonb_typeof(dates) IS DISTINCT FROM ''array'' OR jsonb_array_length(dates)=0 THEN
  IF m.end_date-m.start_date>3659 THEN RAISE EXCEPTION ''FINANCE_LIMIT''; END IF;
  SELECT COALESCE(jsonb_agg(to_char(d,''YYYY-MM-DD'') ORDER BY d),''[]'') INTO dates
   FROM generate_series(m.start_date::timestamp,m.end_date::timestamp,interval ''1 day'') d;
 END IF;
 SELECT COALESCE(jsonb_agg(d ORDER BY d),''[]'') INTO dates FROM (SELECT DISTINCT value AS d FROM jsonb_array_elements_text(dates)) x;
 IF jsonb_array_length(dates)>3660 THEN RAISE EXCEPTION ''FINANCE_LIMIT''; END IF;
 fees:=jsonb_build_array(m.id,dates,COALESCE(NULLIF(j->''booth_cost'',''null''),''0''),COALESCE(NULLIF(j->''registration_fee'',''null''),''0''),
  COALESCE(NULLIF(j->''table_rental'',''null''),''0''),COALESCE(NULLIF(j->''table_free'',''null''),''false''),
  COALESCE(NULLIF(j->''chair_rental'',''null''),''0''),COALESCE(NULLIF(j->''chair_free'',''null''),''false''),
  COALESCE(NULLIF(j->''umbrella_rental'',''null''),''0''),COALESCE(NULLIF(j->''umbrella_free'',''null''),''false''),
  COALESCE(NULLIF(j->''tablecloth_rental'',''null''),''0''),COALESCE(NULLIF(j->''tablecloth_free'',''null''),''false''),
  COALESCE(NULLIF(j->''commission_rate'',''null''),''0''));
 total:=CASE WHEN COALESCE((j->>''booth_cost'')::numeric,0)<>0 THEN (j->>''booth_cost'')::numeric ELSE COALESCE((j->>''registration_fee'')::numeric,0) END
  +CASE WHEN COALESCE((j->>''table_free'')::boolean,false) THEN 0 ELSE COALESCE((j->>''table_rental'')::numeric,0) END
  +CASE WHEN COALESCE((j->>''chair_free'')::boolean,false) THEN 0 ELSE COALESCE((j->>''chair_rental'')::numeric,0) END
  +CASE WHEN COALESCE((j->>''umbrella_free'')::boolean,false) THEN 0 ELSE COALESCE((j->>''umbrella_rental'')::numeric,0) END
  +CASE WHEN COALESCE((j->>''tablecloth_free'')::boolean,false) THEN 0 ELSE COALESCE((j->>''tablecloth_rental'')::numeric,0) END;
 SELECT COALESCE(jsonb_agg(to_jsonb(e) ORDER BY e.id),''[]'') INTO rows FROM (
  SELECT id,type,payload,timestamp FROM public.events WHERE
   (market_id=m.id OR (market_id IS NULL AND COALESCE(payload->>''marketId'',payload->>''market_id'')=m.id::text))
   AND type IN(''deal_closed'',''deal_deleted'') ORDER BY id LIMIT 10001) e;
 IF jsonb_array_length(rows)>10000 THEN RAISE EXCEPTION ''FINANCE_LIMIT''; END IF;
 WITH raw AS (SELECT value AS e FROM jsonb_array_elements(rows)),
 sales AS (SELECT e,e->>''id'' AS id,public.financial_review_day(e->''payload'',(e->>''timestamp'')::timestamptz) AS day FROM raw WHERE e->>''type''=''deal_closed''),
 tombstones AS (SELECT e,COALESCE(e#>>''{payload,eventId}'',e#>>''{payload,event_id}'') AS target FROM raw WHERE e->>''type''=''deal_deleted''),
 active AS (SELECT s.* FROM sales s WHERE NOT EXISTS(SELECT 1 FROM tombstones t WHERE t.target=s.id)),
 amounts AS (SELECT *,public.financial_review_number(COALESCE(e#>''{payload,manualRevenue}'',e#>''{payload,manual_revenue}'',e#>''{payload,totalAmount}'',e#>''{payload,total_amount}'')) AS revenue,
  public.financial_review_number(COALESCE(e#>''{payload,manualDealCount}'',e#>''{payload,manual_deal_count}'',e#>''{payload,dealCount}'',e#>''{payload,deal_count}'',''1'')) AS deals FROM active),
 history AS (SELECT day,e FROM sales UNION ALL SELECT s.day,t.e FROM tombstones t JOIN sales s ON t.target=s.id),
 all_dates AS (SELECT value AS day FROM jsonb_array_elements_text(dates))
 SELECT COALESCE(jsonb_object_agg(d.day,jsonb_build_object(
  ''key'',md5(COALESCE((SELECT jsonb_agg(h.e ORDER BY h.e->>''id'') FROM history h WHERE h.day::text=d.day),''[]'')::text),
  ''revenue'',COALESCE((SELECT sum(a.revenue) FROM amounts a WHERE a.day::text=d.day),0),
  ''deals'',COALESCE((SELECT sum(a.deals) FROM amounts a WHERE a.day::text=d.day),0),
  ''count'',(SELECT count(*) FROM active a WHERE a.day::text=d.day),
  ''zeroAllowed'',COALESCE(d.day::date<=(clock_timestamp() AT TIME ZONE ''Asia/Taipei'')::date AND (d.day::date<(clock_timestamp() AT TIME ZONE ''Asia/Taipei'')::date OR j->>''status''=''completed''
   OR (COALESCE(operation->>''operationPhase'',operation->>''operation_phase'',j->>''operation_phase'')=''closing''
    AND COALESCE(operation->>''operationSessionDate'',operation->>''operation_session_date'',j->>''operation_session_date'')=d.day)),false),
  ''valid'',NOT EXISTS(SELECT 1 FROM active WHERE day IS NULL)
    AND NOT EXISTS(SELECT 1 FROM tombstones WHERE target IS NULL OR target='''')
    AND NOT EXISTS(SELECT 1 FROM amounts a WHERE a.day::text=d.day AND (a.revenue IS NULL OR a.deals IS NULL OR trunc(a.deals)<>a.deals OR a.deals<=0))
 )),''{}'') INTO days FROM all_dates d;
 RETURN jsonb_build_object(''ownerId'',auth.uid(),''marketId'',m.id,''dates'',dates,''feeBasis'',fees,''feeKey'',md5(fees::text),''feeTotal'',total,''days'',days);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.generate_invite_code(p_market_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id"))));
DECLARE
  v_user_id UUID;
  v_code TEXT;
  v_invitation_id UUID;
  v_max_attempts INTEGER := 10;
  v_attempt INTEGER := 0;
BEGIN
  -- 獲取當前用戶 ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''未登入''
    );
  END IF;
  
  -- 檢查是否為 owner
  IF NOT EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = v_user_id
      AND role = ''owner''
  ) THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''只有市集擁有者可以生成邀請碼''
    );
  END IF;
  
  -- 生成唯一的 6 位邀請碼
  LOOP
    v_attempt := v_attempt + 1;
    
    -- 生成隨機 6 位大寫字母和數字
    v_code := UPPER(
      SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 6)
    );
    
    -- 檢查是否已存在
    IF NOT EXISTS (
      SELECT 1 FROM market_invitations
      WHERE code = v_code AND is_used = FALSE
    ) THEN
      EXIT; -- 找到唯一的碼
    END IF;
    
    -- 防止無限循環
    IF v_attempt >= v_max_attempts THEN
      RETURN jsonb_build_object(
        ''success'', FALSE,
        ''error'', ''生成邀請碼失敗，請稍後再試''
      );
    END IF;
  END LOOP;
  
  -- 插入邀請碼
  INSERT INTO market_invitations (code, market_id, created_by)
  VALUES (v_code, p_market_id, v_user_id)
  RETURNING id INTO v_invitation_id;
  
  RETURN jsonb_build_object(
    ''success'', TRUE,
    ''code'', v_code,
    ''invitation_id'', v_invitation_id,
    ''expires_at'', (NOW() + INTERVAL ''7 days'')::TEXT
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', SQLERRM
    );
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.get_latest_snapshot(p_user_id uuid)
RETURNS TABLE(id uuid,snapshot_at timestamptz,event_count integer,data jsonb)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_user_id"))));
  IF auth.role() IS DISTINCT FROM ''service_role'' AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''snapshot_owner_scope'';END IF;
BEGIN
 IF auth.role() IS DISTINCT FROM ''service_role'' AND (auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id)
 THEN RAISE EXCEPTION USING ERRCODE=''42501'',MESSAGE=''snapshot_owner_scope'';END IF;
 RETURN QUERY SELECT s.id,s.snapshot_at,s.event_count,s.data FROM public.snapshots s
  WHERE s.user_id=p_user_id ORDER BY s.snapshot_at DESC,s.id DESC LIMIT 1;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.get_market_members(p_market_id uuid)
 RETURNS TABLE(user_id uuid, email text, display_name text, avatar_url text, role text, joined_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id"))));
DECLARE
  v_current_user_id UUID;
BEGIN
  -- 獲取當前用戶 ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION ''未登入'';
  END IF;
  
  -- 檢查是否為成員
  IF NOT EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = v_current_user_id
  ) THEN
    RAISE EXCEPTION ''無權限查看此市集的成員'';
  END IF;
  
  -- 返回成員列表
  RETURN QUERY
  SELECT 
    mm.user_id,
    p.email,
    p.display_name,
    p.avatar_url,
    mm.role,
    mm.joined_at
  FROM market_members mm
  JOIN profiles p ON mm.user_id = p.id
  WHERE mm.market_id = p_market_id
  ORDER BY 
    CASE mm.role 
      WHEN ''owner'' THEN 1 
      WHEN ''staff'' THEN 2 
    END,
    mm.joined_at;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.get_my_owners()
 RETURNS TABLE(owner_id uuid, owner_email text, permissions jsonb, accepted_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
RETURN QUERY SELECT sr.owner_id, u.email, sr.permissions, sr.accepted_at
  FROM public.staff_relationships AS sr
  JOIN auth.users AS u ON u.id = sr.owner_id
  WHERE sr.staff_id = auth.uid()
    AND sr.status = ''active''
    AND public.has_authoritative_team_entitlement(sr.owner_id);
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.get_my_staff()
 RETURNS TABLE(relationship_id uuid, staff_id uuid, staff_email text, status text, permissions jsonb, role text, invited_at timestamp with time zone, accepted_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  RETURN QUERY
  SELECT
    sr.id          AS relationship_id,
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.role,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.guard_cash_schedule_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF OLD.session_origin=''schedule'' AND (NEW.schedule_revision IS DISTINCT FROM OLD.schedule_revision
    OR NEW.schedule_occurrence_state IS DISTINCT FROM OLD.schedule_occurrence_state)
    AND EXISTS(SELECT 1 FROM public.market_cash_records c WHERE c.market_id=OLD.id) THEN
    RAISE EXCEPTION ''CASH_SCHEDULE_PROTECTED'' USING ERRCODE=''23514''; END IF;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.guard_journal_schedule_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF OLD.session_origin = ''schedule''
    AND (NEW.schedule_revision IS DISTINCT FROM OLD.schedule_revision
      OR NEW.schedule_occurrence_state IS DISTINCT FROM OLD.schedule_occurrence_state)
    AND EXISTS (SELECT 1 FROM public.market_journals j WHERE j.market_id=OLD.id) THEN
    RAISE EXCEPTION ''JOURNAL_SCHEDULE_PROTECTED'' USING ERRCODE = ''23514'';
  END IF;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.guard_market_payment_deadline_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF (TG_OP=''INSERT'' AND NEW.payment_deadline IS NOT NULL)
    OR (TG_OP=''UPDATE'' AND NEW.payment_deadline IS DISTINCT FROM OLD.payment_deadline) THEN
    IF auth.uid() IS NULL OR NEW.owner_id IS DISTINCT FROM auth.uid()
      OR NOT public.can_manage_recurring_operations() THEN
      RAISE EXCEPTION ''Payment deadline management is owner-only'' USING ERRCODE=''42501'';
    END IF;
  END IF;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.guard_market_region_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF (TG_OP = ''INSERT'' AND NEW.region_code IS NOT NULL)
    OR (TG_OP = ''UPDATE'' AND NEW.region_code IS DISTINCT FROM OLD.region_code) THEN
    IF auth.uid() IS NULL OR NEW.owner_id IS DISTINCT FROM auth.uid()
      OR NOT public.can_manage_recurring_operations() THEN
      RAISE EXCEPTION ''Region classification is owner-only'' USING ERRCODE = ''42501'';
    END IF;
  END IF;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.guard_recurring_operations_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF NEW.type IN (
    ''venue_created'', ''venue_updated'', ''venue_archived'',
    ''operation_schedule_created'', ''operation_schedule_updated'',
    ''operation_schedule_paused'', ''operation_schedule_resumed'', ''operation_schedule_archived''
  ) AND (
    auth.uid() IS NULL
    OR NEW.actor_id IS DISTINCT FROM auth.uid()
    OR NOT public.can_manage_recurring_operations()
  ) THEN
    RAISE EXCEPTION ''Recurring operations management is owner-only.''
      USING ERRCODE = ''42501'';
  END IF;

  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.guard_staff_role_permission_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  IF TG_OP=''UPDATE'' AND NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.permissions IS NOT DISTINCT FROM OLD.permissions THEN RETURN NEW; END IF;
  IF NEW.role IS NULL OR NEW.role NOT IN (''viewer'',''operator'',''manager'') OR
     jsonb_typeof(NEW.permissions) IS DISTINCT FROM ''object'' OR
     NEW.permissions->''can_view'' IS DISTINCT FROM ''true''::JSONB OR
     NEW.permissions->''can_edit'' IS DISTINCT FROM to_jsonb(NEW.role IN (''operator'',''manager'')) OR
     NEW.permissions->''infoLevel'' IS DISTINCT FROM to_jsonb(CASE NEW.role WHEN ''viewer'' THEN 0 ELSE 2 END) THEN
    RAISE EXCEPTION ''STAFF_ROLE_PERMISSIONS_MISMATCH: update role and canonical permissions together''
      USING ERRCODE=''22023'';
  END IF;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  INSERT INTO public.profiles (id, email, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>''display_name'', SPLIT_PART(NEW.email, ''@'', 1)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.has_authoritative_team_entitlement(p_owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")))) THEN RETURN false;END IF;
RETURN (SELECT public.subscription_effective_plan(p_owner_id)=''team'');
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.invite_staff_member(p_staff_email text)
 RETURNS staff_relationships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_owner_id uuid := auth.uid();
  v_staff_id uuid;
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_staff_email));
  v_existing public.staff_relationships%ROWTYPE;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION ''An active Team subscription is required.'' USING ERRCODE = ''42501'';
  END IF;
  IF v_email IS NULL OR v_email = '''' OR pg_catalog.length(v_email) > 320 THEN
    RAISE EXCEPTION ''Invalid staff email.'' USING ERRCODE = ''22023'';
  END IF;

  SELECT p.id
  INTO v_staff_id
  FROM public.profiles AS p
  WHERE pg_catalog.lower(p.email) = v_email
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION ''Registered staff account not found.'' USING ERRCODE = ''P0002'';
  END IF;
  IF v_staff_id = v_owner_id THEN
    RAISE EXCEPTION ''Owner cannot invite their own account.'' USING ERRCODE = ''22023'';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.staff_relationships
  WHERE owner_id = v_owner_id AND staff_id = v_staff_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status = ''revoked'' THEN
      UPDATE public.staff_relationships
      SET status = ''pending'',
          staff_email = v_email,
          accepted_at = NULL,
          role = ''viewer'',
          permissions = ''{"can_view": true, "can_edit": false, "infoLevel": 0}''::jsonb
      WHERE id = v_existing.id
      RETURNING * INTO v_record;
      RETURN v_record;
    END IF;

    IF v_existing.status = ''suspended_by_plan'' THEN
      RAISE EXCEPTION ''Restore the retained staff relationship instead of inviting again.''
        USING ERRCODE = ''P0001'';
    END IF;

    RAISE EXCEPTION ''This user is already invited or active staff.'' USING ERRCODE = ''23505'';
  END IF;

  INSERT INTO public.staff_relationships (
    owner_id, staff_id, staff_email, status, role, permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_email,
    ''pending'',
    ''viewer'',
    ''{"can_view": true, "can_edit": false, "infoLevel": 0}''::jsonb
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.is_sale_photo_evidence_sale_event(p_sale_id uuid, p_market_id uuid, p_owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''event'',''value'',to_jsonb("p_sale_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")))) THEN RETURN false;END IF;
RETURN (SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.markets m
      ON m.id = e.market_id
    WHERE e.id = p_sale_id
      AND e.market_id = p_market_id
      AND e.type = ''deal_closed''
      AND m.id = p_market_id
      AND m.owner_id = p_owner_id
  ));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.is_staff_of(p_owner_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")))) THEN RETURN false;END IF;
RETURN (SELECT public.has_authoritative_team_entitlement(p_owner_id)
    AND EXISTS (
      SELECT 1
      FROM public.staff_relationships AS sr
      WHERE sr.staff_id = auth.uid()
        AND sr.owner_id = p_owner_id
        AND sr.status = ''active''
    ));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.join_market_by_code(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''token'',''value'',to_jsonb("p_code"))));
DECLARE
  v_invitation RECORD;
  v_market RECORD;
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- 獲取當前用戶 ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''未登入''
    );
  END IF;
  
  -- 查詢並鎖定邀請碼（防止競態條件）
  SELECT * INTO v_invitation
  FROM market_invitations
  WHERE code = UPPER(p_code)
    AND is_used = FALSE
  FOR UPDATE;
  
  -- 驗證邀請碼
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''邀請碼無效或已使用''
    );
  END IF;
  
  -- 檢查是否過期
  IF v_invitation.expires_at < NOW() THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''邀請碼已過期''
    );
  END IF;
  
  -- 檢查是否已是成員
  IF EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = v_invitation.market_id
      AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''您已經是該市集的成員''
    );
  END IF;
  
  -- 獲取市集資訊
  SELECT * INTO v_market
  FROM markets
  WHERE id = v_invitation.market_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''市集不存在''
    );
  END IF;
  
  -- 原子操作：標記邀請碼 + 添加成員
  UPDATE market_invitations
  SET 
    is_used = TRUE,
    used_by = v_user_id,
    used_at = NOW()
  WHERE id = v_invitation.id;
  
  INSERT INTO market_members (market_id, user_id, role)
  VALUES (v_invitation.market_id, v_user_id, ''staff'');
  
  -- 返回市集資訊（供 Client 端同步使用）
  v_result := jsonb_build_object(
    ''success'', TRUE,
    ''market_id'', v_market.id,
    ''market_name'', v_market.name,
    ''owner_id'', v_market.owner_id
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- 統一錯誤處理
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', SQLERRM
    );
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.leave_current_staff_team(p_owner_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id"))));
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := ''{}''::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required'';
  END IF;

  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION ''Owner id is required'';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = p_owner_id;

  DELETE FROM market_members
  WHERE user_id = v_user_id
    AND role = ''staff''
    AND market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''market_members'', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = p_owner_id
    AND staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object(''staff_relationships'', v_count);

  RETURN v_result || jsonb_build_object(''owner_id'', p_owner_id, ''staff_id'', v_user_id);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.list_owner_pending_operation_diagnostics(p_owner_id uuid DEFAULT auth.uid())
 RETURNS TABLE(operation_id text, operation_type text, entity_type text, entity_id text, market_id uuid, status text, retry_count integer, actor_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, last_error_code text, last_error_message text, safe_metadata jsonb, age_bucket text, state_group text, final_event_id uuid, final_event_type text, has_final_event boolean, final_event_mismatch boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id"))));
DECLARE
  v_actor_id UUID := auth.uid();
  v_owner_id UUID := COALESCE(p_owner_id, auth.uid());
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION ''owner_id is required.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_owner_id <> v_actor_id THEN
    RAISE EXCEPTION ''Owner diagnostics can only be read by the authenticated owner.''
      USING ERRCODE = ''42501'';
  END IF;

  RETURN QUERY
  SELECT
    po.operation_id,
    po.operation_type,
    po.entity_type,
    po.entity_id,
    po.market_id,
    po.status,
    po.retry_count,
    po.actor_id,
    po.created_at,
    po.updated_at,
    po.last_error_code,
    po.last_error_message,
    jsonb_strip_nulls(jsonb_build_object(
      ''source'', e.metadata->>''source'',
      ''idempotencyKey'', e.metadata->>''idempotencyKey'',
      ''pendingOperationId'', e.metadata->>''pendingOperationId'',
      ''drainedAt'', e.metadata->>''drainedAt''
    )) AS safe_metadata,
    CASE
      WHEN NOW() - po.updated_at < INTERVAL ''15 minutes'' THEN ''fresh''
      WHEN NOW() - po.updated_at < INTERVAL ''1 hour'' THEN ''recent''
      WHEN NOW() - po.updated_at < INTERVAL ''1 day'' THEN ''stale''
      ELSE ''old''
    END AS age_bucket,
    CASE
      WHEN po.status = ''synced'' THEN ''healthy''
      WHEN po.status IN (''failed_retryable'', ''blocked_permission'', ''failed_permanent'') THEN ''needs_attention''
      WHEN po.status IN (''pending'', ''processing'') THEN ''in_progress''
      ELSE ''unknown''
    END AS state_group,
    e.id AS final_event_id,
    e.type AS final_event_type,
    e.id IS NOT NULL AS has_final_event,
    CASE
      WHEN e.id IS NULL THEN FALSE
      WHEN po.status = ''synced''
        AND e.type = ''checklist_item_updated''
        AND e.actor_id = po.actor_id
        AND e.market_id = po.market_id
      THEN FALSE
      ELSE TRUE
    END AS final_event_mismatch
  FROM public.pending_operations po
  JOIN public.markets m
    ON m.id = po.market_id
  LEFT JOIN public.events e
    ON e.id = CASE
      WHEN po.operation_id ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
      THEN po.operation_id::UUID
      ELSE NULL
    END
  WHERE m.owner_id = v_owner_id
  ORDER BY po.updated_at DESC, po.created_at DESC
  LIMIT 100;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.mark_product_cover_photo_upload_failed(p_actor_id uuid, p_product_id uuid, p_photo_id uuid, p_error_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''product'',''value'',to_jsonb("p_product_id")),jsonb_build_object(''kind'',''photo'',''value'',to_jsonb("p_photo_id"))));
BEGIN
  UPDATE public.product_cover_photos p SET
    status = CASE WHEN p.status = ''uploaded'' THEN ''uploaded'' ELSE ''upload_failed'' END,
    pending_photo_id = NULL, pending_version = NULL, upload_lease_expires_at = NULL,
    last_error_code = left(p_error_code, 80), updated_at = pg_catalog.clock_timestamp()
  WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
    AND (p.id = p_photo_id OR p.pending_photo_id = p_photo_id)
    AND (p.owner_id = p_actor_id OR EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id = p.owner_id
      AND sr.staff_id = p_actor_id AND sr.status = ''active'' AND sr.role = ''manager''
    ));
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.prevent_f3b_billing_ledger_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
       IF TG_OP=''DELETE''THEN IF deletion_billing_private.authorize_delete(TG_TABLE_NAME,to_jsonb(OLD))THEN RETURN OLD;END IF;END IF;
  RAISE EXCEPTION USING
    ERRCODE = ''23514'',
    MESSAGE = ''f3b_billing_ledger_delete_forbidden'';
  RETURN NULL;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.preview_venue_region_change(p_venue_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''venue'',''value'',to_jsonb("p_venue_id"))));
DECLARE actor UUID:=auth.uid(); venue public.venues%ROWTYPE; schedules JSONB; markets JSONB;
  today DATE:=(now() AT TIME ZONE ''Asia/Taipei'')::DATE;
BEGIN
  IF actor IS NULL OR NOT public.can_manage_recurring_operations() THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  SELECT * INTO venue FROM public.venues WHERE id=p_venue_id AND owner_id=actor AND status=''active'' AND NOT COALESCE(is_deleted,FALSE);
  IF NOT FOUND THEN RAISE EXCEPTION ''FOLLOWUP_SCOPE'' USING ERRCODE=''42501''; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(''id'',id,''revision'',revision,''status'',status,''updatedAt'',updated_at) ORDER BY id),''[]'') INTO schedules
    FROM public.operation_schedules WHERE venue_id=p_venue_id AND owner_id=actor AND status IN(''active'',''paused'');
  SELECT COALESCE(jsonb_agg(jsonb_build_object(''id'',m.id,''name'',m.name,''day'',m.start_date,''regionCode'',m.region_code,''updatedAt'',m.updated_at,
    ''eligible'',m.status IN(''registered'',''accepted'',''paid'') AND NOT COALESCE(m.is_schedule_override,FALSE)
      AND COALESCE(m.schedule_occurrence_state,''scheduled'')=''scheduled''
      AND NOT EXISTS(SELECT 1 FROM public.events e WHERE (e.market_id=m.id OR (e.market_id IS NULL AND COALESCE(e.payload->>''market_id'',e.payload->>''marketId'')=m.id::TEXT)) AND e.type IN(''market_started'',''market_ended'',''interaction_recorded'',''deal_closed'',''field_note_created'',''field_note_updated'',''field_note_deleted'',''checklist_item_created'',''checklist_item_updated'',''checklist_item_deleted''))
      AND NOT EXISTS(SELECT 1 FROM public.market_journals j WHERE j.market_id=m.id)
      AND NOT EXISTS(SELECT 1 FROM public.market_cash_records c WHERE c.market_id=m.id)
      AND COALESCE(m.total_revenue,0)=0 AND COALESCE(m.total_deals,0)=0 AND COALESCE(m.total_interactions,0)=0
    ) ORDER BY m.id),''[]'') INTO markets FROM public.markets m
    WHERE m.owner_id=actor AND m.venue_id=p_venue_id AND m.session_origin=''schedule''
      AND m.start_date>=today AND NOT COALESCE(m.is_deleted,FALSE)
      AND EXISTS(SELECT 1 FROM public.operation_schedules s WHERE s.id=m.schedule_id AND s.venue_id=p_venue_id AND s.owner_id=actor AND s.status IN(''active'',''paused''));
  IF jsonb_array_length(markets)>250 OR jsonb_array_length(schedules)>100 THEN RAISE EXCEPTION ''FOLLOWUP_LIMIT''; END IF;
  RETURN jsonb_build_object(''day'',today,''venueId'',venue.id,''name'',venue.name,''regionCode'',venue.region_code,''updatedAt'',venue.updated_at,''schedules'',schedules,''markets'',markets);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.product_cover_photo_write_allowed(p_actor uuid, p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner")))) THEN RETURN false;END IF;
DECLARE v_decision jsonb;
BEGIN
  -- FERIA_PRODUCT_PHOTO_AUTH_V1
  IF p_actor IS NULL OR p_owner IS NULL THEN RETURN false; END IF;
  v_decision := public.check_subscription_write_for_actor(p_actor,p_owner,''product_photo'');
  IF v_decision->''enabled''=''true''::jsonb THEN
    RETURN COALESCE(v_decision->''allowed''=''true''::jsonb,false);
  ELSIF v_decision->''enabled''=''false''::jsonb AND v_decision->''allowed''=''true''::jsonb THEN
    -- Preserve the old product-photo rollout for owners outside the 082 pilot.
    RETURN EXISTS(SELECT 1 FROM public.account_entitlements ae
      WHERE ae.owner_id=p_owner AND ae.product_cover_photo_enabled=true);
  END IF;
  RETURN false;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.project_market_payment_deadline_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE fields JSONB; deadline JSONB; target_id UUID;
BEGIN
  IF NEW.type NOT IN (''market_created'',''market_updated'') THEN RETURN NEW; END IF;
  fields := CASE WHEN NEW.type=''market_updated'' THEN NEW.payload->''updates'' ELSE NEW.payload END;
  IF fields IS NULL OR jsonb_typeof(fields)<>''object'' THEN RETURN NEW; END IF;
  IF NOT (fields ? ''paymentDeadline'' OR fields ? ''payment_deadline'') THEN RETURN NEW; END IF;
  IF fields ? ''paymentDeadline'' AND fields ? ''payment_deadline''
    AND fields->''paymentDeadline'' IS DISTINCT FROM fields->''payment_deadline'' THEN
    RAISE EXCEPTION ''Conflicting payment deadline aliases'' USING ERRCODE=''22023'';
  END IF;
  deadline := CASE WHEN fields ? ''paymentDeadline'' THEN fields->''paymentDeadline'' ELSE fields->''payment_deadline'' END;
  IF NOT public.market_payment_deadline_is_valid(deadline) THEN
    RAISE EXCEPTION ''Invalid payment deadline'' USING ERRCODE=''22023'';
  END IF;
  IF auth.uid() IS NULL OR NEW.actor_id IS DISTINCT FROM auth.uid()
    OR NOT public.can_manage_recurring_operations() THEN
    RAISE EXCEPTION ''Payment deadline events require an owner'' USING ERRCODE=''42501'';
  END IF;
  target_id := COALESCE(NEW.market_id,(NEW.payload->>''market_id'')::UUID,(NEW.payload->>''marketId'')::UUID);
  UPDATE public.markets SET payment_deadline = NULLIF(deadline,''null''::JSONB)
    WHERE id=target_id AND owner_id=NEW.actor_id;
  IF NOT FOUND THEN RAISE EXCEPTION ''Payment deadline target outside owner scope'' USING ERRCODE=''42501''; END IF;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.project_market_region_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  fields JSONB;
  region JSONB;
  region_text TEXT;
  target_id UUID;
BEGIN
  IF NEW.type NOT IN (''market_created'', ''market_updated'', ''venue_created'', ''venue_updated'') THEN
    RETURN NEW;
  END IF;
  fields := CASE WHEN NEW.type IN (''market_updated'', ''venue_updated'')
    THEN NEW.payload->''updates'' ELSE NEW.payload END;
  IF fields IS NULL OR jsonb_typeof(fields) <> ''object'' THEN RETURN NEW; END IF;
  -- Old clients omit the key: preserve existing snapshots, including null.
  IF NOT (fields ? ''regionCode'' OR fields ? ''region_code'') THEN RETURN NEW; END IF;
  IF fields ? ''regionCode'' AND fields ? ''region_code''
    AND fields->''regionCode'' IS DISTINCT FROM fields->''region_code'' THEN
    RAISE EXCEPTION ''Conflicting region aliases'' USING ERRCODE = ''22023'';
  END IF;
  region := CASE WHEN fields ? ''regionCode'' THEN fields->''regionCode'' ELSE fields->''region_code'' END;
  IF jsonb_typeof(region) NOT IN (''null'', ''string'') THEN
    RAISE EXCEPTION ''Invalid region value'' USING ERRCODE = ''22023'';
  END IF;
  region_text := CASE WHEN region = ''null''::JSONB THEN NULL ELSE region #>> ''{}'' END;
  IF NOT public.market_region_code_is_valid(region_text) THEN
    RAISE EXCEPTION ''Unknown region code'' USING ERRCODE = ''22023'';
  END IF;
  IF auth.uid() IS NULL OR NEW.actor_id IS DISTINCT FROM auth.uid()
    OR NOT public.can_manage_recurring_operations() THEN
    RAISE EXCEPTION ''Region events require an authenticated owner'' USING ERRCODE = ''42501'';
  END IF;

  IF NEW.type IN (''market_created'', ''market_updated'') THEN
    target_id := COALESCE(NEW.market_id, (NEW.payload->>''market_id'')::UUID, (NEW.payload->>''marketId'')::UUID);
    UPDATE public.markets SET region_code = region_text
      WHERE id = target_id AND owner_id = NEW.actor_id;
  ELSE
    target_id := (NEW.payload->>''venueId'')::UUID;
    UPDATE public.venues SET region_code = region_text
      WHERE id = target_id AND owner_id = NEW.actor_id;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION ''Region target not found in owner scope'' USING ERRCODE = ''42501'';
  END IF;
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.project_recurring_operations_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public'', ''pg_temp''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_updates JSONB;
  v_venue_id UUID;
  v_schedule_id UUID;
  v_market_id UUID;
BEGIN
  CASE NEW.type
    WHEN ''venue_created'' THEN
      v_venue_id := NULLIF(NEW.payload->>''venueId'', '''')::UUID;
      INSERT INTO public.venues (
        id, owner_id, name, address, location_note, status, is_deleted, created_at, updated_at
      ) VALUES (
        v_venue_id,
        NEW.actor_id,
        NEW.payload->>''name'',
        NULLIF(NEW.payload->>''address'', ''''),
        NULLIF(NEW.payload->>''locationNote'', ''''),
        COALESCE(NULLIF(NEW.payload->>''status'', ''''), ''active''),
        COALESCE((NEW.payload->>''isDeleted'')::BOOLEAN, FALSE),
        NEW.timestamp,
        NEW.timestamp
      );

    WHEN ''venue_updated'' THEN
      v_venue_id := NULLIF(NEW.payload->>''venueId'', '''')::UUID;
      v_updates := NEW.payload->''updates'';
      UPDATE public.venues SET
        name = CASE WHEN v_updates ? ''name'' THEN v_updates->>''name'' ELSE name END,
        address = CASE WHEN v_updates ? ''address'' THEN NULLIF(v_updates->>''address'', '''') ELSE address END,
        location_note = CASE WHEN v_updates ? ''locationNote'' THEN NULLIF(v_updates->>''locationNote'', '''') ELSE location_note END,
        status = CASE WHEN v_updates ? ''status'' THEN v_updates->>''status'' ELSE status END,
        is_deleted = CASE WHEN v_updates ? ''isDeleted'' THEN (v_updates->>''isDeleted'')::BOOLEAN ELSE is_deleted END,
        updated_at = NEW.timestamp
      WHERE id = v_venue_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION ''venue update owner scope mismatch''; END IF;

    WHEN ''venue_archived'' THEN
      v_venue_id := NULLIF(NEW.payload->>''venueId'', '''')::UUID;
      UPDATE public.venues SET status = ''archived'', updated_at = NEW.timestamp
      WHERE id = v_venue_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION ''venue archive owner scope mismatch''; END IF;

    WHEN ''operation_schedule_created'' THEN
      v_schedule_id := NULLIF(NEW.payload->>''scheduleId'', '''')::UUID;
      v_venue_id := NULLIF(NEW.payload->>''venueId'', '''')::UUID;
      IF NOT EXISTS (
        SELECT 1 FROM public.venues WHERE id = v_venue_id AND owner_id = NEW.actor_id
      ) THEN
        RAISE EXCEPTION ''schedule venue owner scope mismatch'';
      END IF;
      INSERT INTO public.operation_schedules (
        id, owner_id, venue_id, name, timezone, recurrence, start_time, end_time,
        ends_next_day, defaults, status, revision, created_at, updated_at
      ) VALUES (
        v_schedule_id,
        NEW.actor_id,
        v_venue_id,
        NULLIF(NEW.payload->>''name'', ''''),
        NEW.payload->>''timezone'',
        NEW.payload->''recurrence'',
        (NEW.payload->>''startTime'')::TIME,
        (NEW.payload->>''endTime'')::TIME,
        COALESCE((NEW.payload->>''endsNextDay'')::BOOLEAN, FALSE),
        COALESCE(NEW.payload->''defaults'', ''{}''::JSONB),
        COALESCE(NULLIF(NEW.payload->>''status'', ''''), ''active''),
        COALESCE((NEW.payload->>''revision'')::INTEGER, 1),
        NEW.timestamp,
        NEW.timestamp
      );

    WHEN ''operation_schedule_updated'' THEN
      v_schedule_id := NULLIF(NEW.payload->>''scheduleId'', '''')::UUID;
      v_updates := NEW.payload->''updates'';
      UPDATE public.operation_schedules SET
        venue_id = CASE WHEN v_updates ? ''venueId'' THEN (v_updates->>''venueId'')::UUID ELSE venue_id END,
        name = CASE WHEN v_updates ? ''name'' THEN NULLIF(v_updates->>''name'', '''') ELSE name END,
        timezone = CASE WHEN v_updates ? ''timezone'' THEN v_updates->>''timezone'' ELSE timezone END,
        recurrence = CASE WHEN v_updates ? ''recurrence'' THEN v_updates->''recurrence'' ELSE recurrence END,
        start_time = CASE WHEN v_updates ? ''startTime'' THEN (v_updates->>''startTime'')::TIME ELSE start_time END,
        end_time = CASE WHEN v_updates ? ''endTime'' THEN (v_updates->>''endTime'')::TIME ELSE end_time END,
        ends_next_day = CASE WHEN v_updates ? ''endsNextDay'' THEN (v_updates->>''endsNextDay'')::BOOLEAN ELSE ends_next_day END,
        defaults = CASE WHEN v_updates ? ''defaults'' THEN v_updates->''defaults'' ELSE defaults END,
        status = CASE WHEN v_updates ? ''status'' THEN v_updates->>''status'' ELSE status END,
        revision = CASE WHEN v_updates ? ''revision'' THEN (v_updates->>''revision'')::INTEGER ELSE revision END,
        updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION ''schedule update owner scope mismatch''; END IF;

    WHEN ''operation_schedule_paused'' THEN
      v_schedule_id := NULLIF(NEW.payload->>''scheduleId'', '''')::UUID;
      UPDATE public.operation_schedules SET status = ''paused'', updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION ''schedule pause owner scope mismatch''; END IF;

    WHEN ''operation_schedule_resumed'' THEN
      v_schedule_id := NULLIF(NEW.payload->>''scheduleId'', '''')::UUID;
      UPDATE public.operation_schedules SET status = ''active'', updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION ''schedule resume owner scope mismatch''; END IF;

    WHEN ''operation_schedule_archived'' THEN
      v_schedule_id := NULLIF(NEW.payload->>''scheduleId'', '''')::UUID;
      UPDATE public.operation_schedules SET status = ''archived'', updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION ''schedule archive owner scope mismatch''; END IF;

    WHEN ''market_created'' THEN
      v_market_id := COALESCE(
        NEW.market_id,
        NULLIF(NEW.payload->>''market_id'', '''')::UUID,
        NULLIF(NEW.payload->>''marketId'', '''')::UUID
      );
      UPDATE public.markets SET
        venue_id = NULLIF(COALESCE(NEW.payload->>''venue_id'', NEW.payload->>''venueId''), '''')::UUID,
        schedule_id = NULLIF(COALESCE(NEW.payload->>''schedule_id'', NEW.payload->>''scheduleId''), '''')::UUID,
        session_origin = NULLIF(COALESCE(NEW.payload->>''session_origin'', NEW.payload->>''sessionOrigin''), ''''),
        schedule_occurrence_key = NULLIF(COALESCE(NEW.payload->>''schedule_occurrence_key'', NEW.payload->>''scheduleOccurrenceKey''), ''''),
        schedule_revision = NULLIF(COALESCE(NEW.payload->>''schedule_revision'', NEW.payload->>''scheduleRevision''), '''')::INTEGER,
        schedule_occurrence_state = NULLIF(COALESCE(NEW.payload->>''schedule_occurrence_state'', NEW.payload->>''scheduleOccurrenceState''), ''''),
        is_schedule_override = COALESCE(
          (NEW.payload->>''is_schedule_override'')::BOOLEAN,
          (NEW.payload->>''isScheduleOverride'')::BOOLEAN,
          FALSE
        )
      WHERE id = v_market_id AND owner_id = NEW.actor_id;

    WHEN ''market_updated'' THEN
      v_market_id := COALESCE(
        NEW.market_id,
        NULLIF(NEW.payload->>''market_id'', '''')::UUID,
        NULLIF(NEW.payload->>''marketId'', '''')::UUID
      );
      v_updates := NEW.payload->''updates'';
      UPDATE public.markets SET
        venue_id = CASE WHEN v_updates ? ''venue_id'' OR v_updates ? ''venueId''
          THEN NULLIF(COALESCE(v_updates->>''venue_id'', v_updates->>''venueId''), '''')::UUID ELSE venue_id END,
        schedule_id = CASE WHEN v_updates ? ''schedule_id'' OR v_updates ? ''scheduleId''
          THEN NULLIF(COALESCE(v_updates->>''schedule_id'', v_updates->>''scheduleId''), '''')::UUID ELSE schedule_id END,
        session_origin = CASE WHEN v_updates ? ''session_origin'' OR v_updates ? ''sessionOrigin''
          THEN NULLIF(COALESCE(v_updates->>''session_origin'', v_updates->>''sessionOrigin''), '''') ELSE session_origin END,
        schedule_occurrence_key = CASE WHEN v_updates ? ''schedule_occurrence_key'' OR v_updates ? ''scheduleOccurrenceKey''
          THEN NULLIF(COALESCE(v_updates->>''schedule_occurrence_key'', v_updates->>''scheduleOccurrenceKey''), '''') ELSE schedule_occurrence_key END,
        schedule_revision = CASE WHEN v_updates ? ''schedule_revision'' OR v_updates ? ''scheduleRevision''
          THEN NULLIF(COALESCE(v_updates->>''schedule_revision'', v_updates->>''scheduleRevision''), '''')::INTEGER ELSE schedule_revision END,
        schedule_occurrence_state = CASE WHEN v_updates ? ''schedule_occurrence_state'' OR v_updates ? ''scheduleOccurrenceState''
          THEN NULLIF(COALESCE(v_updates->>''schedule_occurrence_state'', v_updates->>''scheduleOccurrenceState''), '''') ELSE schedule_occurrence_state END,
        is_schedule_override = CASE WHEN v_updates ? ''is_schedule_override'' OR v_updates ? ''isScheduleOverride''
          THEN COALESCE((v_updates->>''is_schedule_override'')::BOOLEAN, (v_updates->>''isScheduleOverride'')::BOOLEAN)
          ELSE is_schedule_override END,
        updated_at = NEW.timestamp
      WHERE id = v_market_id AND owner_id = NEW.actor_id;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.read_market_cash_sales(p_market_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id"))));
DECLARE rows JSONB;
BEGIN
 -- FERIA_CASH_READ_TIER_V1
 IF NOT public.subscription_read_paid(auth.uid()) THEN RAISE EXCEPTION ''SUBSCRIPTION_READ_REQUIRED'' USING ERRCODE=''42501''; END IF;
  PERFORM 1 FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,FALSE) FOR SHARE;
  IF auth.uid() IS NULL OR NOT FOUND THEN RAISE EXCEPTION ''CASH_SCOPE'' USING ERRCODE=''42501''; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(''id'',e.id,''type'',e.type,''payload'',e.payload,''timestamp'',e.timestamp) ORDER BY e.id),''[]''::JSONB)
    INTO rows FROM (SELECT id,type,payload,timestamp FROM public.events
      WHERE market_id=p_market_id AND type IN(''deal_closed'',''deal_deleted'') ORDER BY id LIMIT 10001) e;
  IF jsonb_array_length(rows)>10000 THEN RAISE EXCEPTION ''CASH_SALES_LIMIT''; END IF;
  RETURN jsonb_build_object(''marketId'',p_market_id,''key'',md5(rows::TEXT),''capturedAt'',clock_timestamp(),''events'',rows);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.read_market_financial_reviews(p_market_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_ids"))));
DECLARE id uuid; source jsonb; reviews jsonb; result jsonb:=''[]'';
BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.subscription_effective_plan(auth.uid()),''free'') NOT IN(''pro'',''team'') OR public.subscription_read_owner_paid(auth.uid()) IS NOT TRUE THEN RAISE EXCEPTION ''FINANCE_SCOPE'' USING ERRCODE=''42501''; END IF;
 IF p_market_ids IS NULL OR cardinality(p_market_ids)>100 THEN RAISE EXCEPTION ''FINANCE_LIMIT''; END IF;
 FOR id IN SELECT DISTINCT unnest(p_market_ids) LOOP
  source:=public.financial_review_source(id);
  SELECT COALESCE(jsonb_agg(to_jsonb(r)||jsonb_build_object(''valid'',COALESCE(r.source_key=CASE WHEN r.review_key=''fees'' THEN source->>''feeKey'' ELSE source#>>ARRAY[''days'',r.review_key,''key''] END
   AND (r.mode<>''zero-income'' OR source#>>ARRAY[''days'',r.review_key,''zeroAllowed'']=''true''),false)) ORDER BY r.review_key),''[]'') INTO reviews
   FROM public.market_financial_reviews r WHERE r.owner_id=auth.uid() AND r.market_id=id;
  result:=result||jsonb_build_array(source||jsonb_build_object(''reviews'',reviews));
 END LOOP;
 RETURN result;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.read_subscription_account_for_actor(p_actor_id uuid, p_owner_id uuid)
 RETURNS TABLE(access_allowed boolean, account_exists boolean, owner_id uuid, plan_code text, plan_source text, billing_status text, entitlement_status text, entitlement_ends_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor_id")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id"))));
DECLARE v_test public.subscription_write_guard_owners%ROWTYPE;
BEGIN
 IF p_actor_id IS NULL OR p_owner_id IS NULL THEN RETURN; END IF;
 IF p_actor_id<>p_owner_id AND NOT EXISTS(SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id=p_owner_id
   AND sr.staff_id=p_actor_id AND sr.status=''active'' AND public.has_authoritative_team_entitlement(p_owner_id)) THEN RETURN; END IF;
 SELECT * INTO v_test FROM public.subscription_write_guard_owners t WHERE t.owner_id=p_owner_id AND t.enabled
   AND t.allow_test_switch AND t.test_expires_at>now();
 IF FOUND THEN
   RETURN QUERY SELECT TRUE,TRUE,p_owner_id,v_test.test_plan_code,
     CASE WHEN v_test.test_plan_code=''free'' THEN ''free'' ELSE ''admin'' END,''none''::TEXT,''active''::TEXT,
     CASE WHEN v_test.test_plan_code=''free'' THEN NULL::TIMESTAMPTZ ELSE v_test.test_expires_at END,v_test.updated_at;
   RETURN;
 END IF;
 RETURN QUERY SELECT TRUE,sa.owner_id IS NOT NULL,p_owner_id,sa.plan_code,sa.plan_source,sa.billing_status,
   sa.entitlement_status,sa.entitlement_ends_at,sa.updated_at
   FROM (SELECT 1) seed LEFT JOIN public.subscription_accounts sa ON sa.owner_id=p_owner_id;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.read_subscription_data_scope()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION ''SUBSCRIPTION_READ_AUTH'' USING ERRCODE=''42501''; END IF;
 RETURN jsonb_build_object(''ownerId'',auth.uid(),''enforced'',public.subscription_read_guard_active(auth.uid()),
  ''scope'',CASE WHEN NOT public.subscription_read_guard_active(auth.uid()) THEN ''legacy''
   WHEN public.subscription_effective_plan(auth.uid())=''free'' THEN ''foundation'' ELSE ''paid'' END);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.read_subscription_test_switch(p_actor uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor"))));
DECLARE v_row public.subscription_write_guard_owners%ROWTYPE; v_active BOOLEAN;
BEGIN
 SELECT * INTO v_row FROM public.subscription_write_guard_owners WHERE owner_id=p_actor AND enabled AND allow_test_switch;
 IF NOT FOUND THEN RAISE EXCEPTION ''TEST_SWITCH_NOT_ALLOWED'' USING ERRCODE=''42501''; END IF;
 v_active:=COALESCE(v_row.test_expires_at>now(),FALSE);
 RETURN jsonb_build_object(''enabled'',v_active,''planCode'',CASE WHEN v_active THEN v_row.test_plan_code ELSE NULL END,
   ''expiresAt'',CASE WHEN v_active THEN v_row.test_expires_at ELSE NULL END,''cloudBacked'',TRUE);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.recover_stale_processing_pending_operation(p_operation_id text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''operation'',''value'',to_jsonb("p_operation_id"))));
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''''));
  v_operation public.pending_operations%ROWTYPE;
  v_event_id UUID;
  v_existing_event RECORD;
  v_is_owner BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_operation_id = '''' THEN
    RAISE EXCEPTION ''operation_id is required.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT *
  INTO v_operation
  FROM public.pending_operations po
  WHERE po.operation_id = v_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Pending operation not found.''
      USING ERRCODE = ''22023'';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = v_operation.market_id
      AND m.owner_id = v_actor_id
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION ''Only the market owner can recover stale processing pending operations.''
      USING ERRCODE = ''42501'';
  END IF;

  IF v_operation.status <> ''processing'' THEN
    RAISE EXCEPTION ''Only processing pending operations can be recovered.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_operation.updated_at >= NOW() - INTERVAL ''15 minutes'' THEN
    RAISE EXCEPTION ''Processing pending operation is not stale.''
      USING ERRCODE = ''22023'';
  END IF;

  IF v_operation_id ~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'' THEN
    v_event_id := v_operation_id::UUID;

    SELECT
      e.type,
      e.payload,
      e.actor_id,
      e.market_id
    INTO v_existing_event
    FROM public.events e
    WHERE e.id = v_event_id;

    IF FOUND THEN
      IF v_operation.operation_type = ''checklist_item_toggle''
        AND v_operation.entity_type = ''checklist_item''
        AND v_existing_event.type = ''checklist_item_updated''
        AND v_existing_event.payload = v_operation.payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = ''synced'',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;

        RETURN ''synced'';
      END IF;

      UPDATE public.pending_operations
      SET
        status = ''failed_permanent'',
        last_error_code = ''event_id_collision'',
        last_error_message = ''A different event already uses this operation_id''
      WHERE operation_id = v_operation_id;

      RETURN ''failed_permanent'';
    END IF;
  END IF;

  UPDATE public.pending_operations
  SET
    status = ''failed_retryable'',
    retry_count = retry_count + 1,
    last_error_code = ''stale_processing_reset'',
    last_error_message = ''Stale processing operation reset to retryable without draining''
  WHERE operation_id = v_operation_id;

  RETURN ''failed_retryable'';
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.reject_billing_customer_link_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
       IF TG_OP=''DELETE''THEN IF deletion_billing_private.authorize_delete(TG_TABLE_NAME,to_jsonb(OLD))THEN RETURN OLD;END IF;END IF;
  RAISE EXCEPTION USING
    ERRCODE = ''23514'',
    MESSAGE = ''billing_customer_link_immutable'';
  RETURN NULL;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.remove_team_member(p_market_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_user_id"))));
DECLARE
  v_current_user_id UUID;
BEGIN
  -- 獲取當前用戶 ID
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''未登入''
    );
  END IF;
  
  -- 檢查是否為 owner
  IF NOT EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = v_current_user_id
      AND role = ''owner''
  ) THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''只有市集擁有者可以移除成員''
    );
  END IF;
  
  -- 不能移除 owner
  IF EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = p_market_id
      AND user_id = p_user_id
      AND role = ''owner''
  ) THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''不能移除市集擁有者''
    );
  END IF;
  
  -- 移除成員
  DELETE FROM market_members
  WHERE market_id = p_market_id
    AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', ''成員不存在''
    );
  END IF;
  
  RETURN jsonb_build_object(
    ''success'', TRUE,
    ''message'', ''成員已移除''
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      ''success'', FALSE,
      ''error'', SQLERRM
    );
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.restore_staff_relationship(p_relationship_id uuid)
 RETURNS staff_relationships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''relationship'',''value'',to_jsonb("p_relationship_id"))));
DECLARE
  v_owner_id uuid := auth.uid();
  v_staff_id uuid;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;
  -- STAFF_PLAN_RESTORE_LOCK_088
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''staff-plan:'' || v_owner_id::text, 0));
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION ''An active Team subscription is required.'' USING ERRCODE = ''42501'';
  END IF;

  SELECT staff_id
  INTO v_staff_id
  FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status = ''suspended_by_plan''
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Suspended staff relationship not found.'' USING ERRCODE = ''P0002'';
  END IF;

  UPDATE public.staff_relationships
  SET status = ''active''
  WHERE id = p_relationship_id
  RETURNING * INTO v_record;

  INSERT INTO public.market_members (market_id, user_id, role, joined_at)
  SELECT m.id, v_staff_id, ''staff'', pg_catalog.now()
  FROM public.markets AS m
  WHERE m.owner_id = v_owner_id
    AND m.status IN (''ongoing'', ''registered'', ''accepted'', ''paid'')
  ON CONFLICT DO NOTHING;

  RETURN v_record;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.revoke_staff_member(p_staff_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_staff_id"))));
DECLARE
  v_owner_id uuid := auth.uid();
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;

  UPDATE public.staff_relationships
  SET status = ''revoked''
  WHERE owner_id = v_owner_id
    AND staff_id = p_staff_id
    AND status IN (''pending'', ''active'', ''suspended_by_plan'');

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Staff relationship not found.'' USING ERRCODE = ''P0002'';
  END IF;

  DELETE FROM public.market_members AS mm
  USING public.markets AS m
  WHERE m.id = mm.market_id
    AND m.owner_id = v_owner_id
    AND mm.user_id = p_staff_id
    AND mm.role = ''staff'';

  RETURN true;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.revoke_staff_relationship(p_relationship_id uuid)
 RETURNS staff_relationships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''relationship'',''value'',to_jsonb("p_relationship_id"))));
DECLARE
  v_owner_id uuid := auth.uid();
  v_staff_id uuid;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;

  UPDATE public.staff_relationships
  SET status = ''revoked''
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status IN (''pending'', ''active'', ''suspended_by_plan'')
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Staff relationship not found.'' USING ERRCODE = ''P0002'';
  END IF;

  v_staff_id := v_record.staff_id;

  DELETE FROM public.market_members AS mm
  USING public.markets AS m
  WHERE m.id = mm.market_id
    AND m.owner_id = v_owner_id
    AND mm.user_id = v_staff_id
    AND mm.role = ''staff'';

  RETURN v_record;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.save_market_cash_record(p_market_id uuid, p_business_date date, p_data jsonb, p_expected_revision integer, p_mutation_id uuid)
 RETURNS market_cash_records
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_data"))));
BEGIN
 -- FERIA_CASH_SAVE_READ_TIER_V1
 IF NOT public.subscription_read_owner_paid(auth.uid()) THEN RAISE EXCEPTION ''SUBSCRIPTION_READ_REQUIRED'' USING ERRCODE=''42501''; END IF;
  PERFORM 1 FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,FALSE) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION ''CASH_SCOPE'' USING ERRCODE=''42501''; END IF;
  IF EXISTS(SELECT 1 FROM public.market_cash_records WHERE market_id=p_market_id AND business_date=p_business_date
    AND (data ? ''otherCash'' OR data ? ''salesBasis'')) THEN RAISE EXCEPTION ''CASH_CLIENT_UPGRADE''; END IF;
  IF p_data ? ''otherCash'' OR p_data ? ''salesBasis'' THEN RAISE EXCEPTION ''CASH_CLIENT_UPGRADE''; END IF;
  RETURN public.save_market_cash_record_v2(p_market_id,p_business_date,p_data,p_expected_revision,p_mutation_id);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.save_market_cash_record_v2(p_market_id uuid, p_business_date date, p_data jsonb, p_expected_revision integer, p_mutation_id uuid)
 RETURNS market_cash_records
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_data"))));
DECLARE v_user UUID:=auth.uid(); v_market public.markets%ROWTYPE; v_row public.market_cash_records%ROWTYPE;
  v_dates JSONB; v_open BIGINT; v_close BIGINT;
BEGIN
 -- FERIA_CASH_SAVE_READ_TIER_V1
 IF NOT public.subscription_read_owner_paid(auth.uid()) THEN RAISE EXCEPTION ''SUBSCRIPTION_READ_REQUIRED'' USING ERRCODE=''42501''; END IF;
  IF v_user IS NULL OR p_market_id IS NULL OR p_business_date IS NULL OR p_mutation_id IS NULL
    OR p_expected_revision IS NULL OR p_expected_revision<0 THEN RAISE EXCEPTION ''CASH_SCOPE'' USING ERRCODE=''42501''; END IF;
  SELECT * INTO v_market FROM public.markets WHERE id=p_market_id FOR UPDATE;
  IF NOT FOUND OR v_market.owner_id IS DISTINCT FROM v_user OR COALESCE(v_market.is_deleted,FALSE) THEN
    RAISE EXCEPTION ''CASH_SCOPE'' USING ERRCODE=''42501''; END IF;
  SELECT * INTO v_row FROM public.market_cash_records WHERE market_id=p_market_id AND business_date=p_business_date FOR UPDATE;
  IF FOUND THEN
    IF v_row.owner_id<>v_user THEN RAISE EXCEPTION ''CASH_SCOPE'' USING ERRCODE=''42501''; END IF;
    IF v_row.mutation_id=p_mutation_id AND v_row.data=p_data THEN RETURN v_row; END IF;
    IF v_row.revision<>p_expected_revision OR v_row.mutation_id=p_mutation_id THEN RAISE EXCEPTION ''CASH_CONFLICT''; END IF;
  ELSIF p_expected_revision<>0 THEN RAISE EXCEPTION ''CASH_CONFLICT''; END IF;
  IF p_data IS NULL OR jsonb_typeof(p_data)<>''object'' OR p_data-''opening''-''closing''-''note''-''otherCash''-''salesBasis''<>''{}''::JSONB
    OR jsonb_typeof(p_data->''note'') IS DISTINCT FROM ''string'' OR char_length(p_data->>''note'')>1000 THEN
    RAISE EXCEPTION ''CASH_INPUT'' USING ERRCODE=''22023''; END IF;
  IF p_data ? ''otherCash'' AND NOT (
    p_data->''otherCash''=''{"mode":"none"}''::JSONB OR (
      jsonb_typeof(p_data->''otherCash'')=''object'' AND p_data#>>''{otherCash,mode}''=''net''
      AND jsonb_typeof(p_data#>''{otherCash,amount}'')=''string''
      AND p_data#>>''{otherCash,amount}'' ~ ''^-?(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?$''
      AND jsonb_typeof(p_data#>''{otherCash,note}'')=''string'' AND char_length(p_data#>>''{otherCash,note}'')<=1000
      AND (p_data->''otherCash'')-''mode''-''amount''-''note''=''{}''::JSONB
    )
  ) IS TRUE THEN RAISE EXCEPTION ''CASH_INPUT'' USING ERRCODE=''22023''; END IF;
  IF p_data ? ''salesBasis'' AND p_data->''salesBasis''<>''null''::JSONB AND NOT (
    jsonb_typeof(p_data->''salesBasis'')=''object''
    AND p_data#>>''{salesBasis,salesKey}'' ~ ''^[a-f0-9]{32}$''
    AND jsonb_typeof(p_data#>''{salesBasis,cashKey}'')=''string'' AND char_length(p_data#>>''{salesBasis,cashKey}'')<=16000
    AND jsonb_typeof(p_data#>''{salesBasis,capturedAt}'')=''string''
    AND p_data#>>''{salesBasis,capturedAt}'' ~ ''^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}''
    AND (p_data->''salesBasis'')-''salesKey''-''cashKey''-''capturedAt''=''{}''::JSONB
  ) IS TRUE THEN RAISE EXCEPTION ''CASH_INPUT'' USING ERRCODE=''22023''; END IF;
  IF p_data->''salesBasis'' IS NOT NULL AND p_data->''salesBasis''<>''null''::JSONB THEN
    PERFORM (p_data#>>''{salesBasis,capturedAt}'')::TIMESTAMPTZ;
  END IF;
  v_open:=public.market_cash_point_cents(p_data->''opening'');v_close:=public.market_cash_point_cents(p_data->''closing'');
  IF v_row.market_id IS NULL THEN
    IF v_open IS NULL AND v_close IS NULL AND btrim(p_data->>''note'')='''' AND COALESCE(p_data#>>''{otherCash,mode}'',''none'')<>''net'' THEN RAISE EXCEPTION ''CASH_INPUT'' USING ERRCODE=''22023''; END IF;
    SELECT CASE WHEN e.type=''market_created'' THEN e.payload->''dates'' ELSE e.payload#>''{updates,dates}'' END INTO v_dates
      FROM public.events e WHERE e.market_id=p_market_id AND e.actor_id=v_user
        AND ((e.type=''market_created'' AND jsonb_typeof(e.payload->''dates'')=''array'')
          OR (e.type=''market_updated'' AND jsonb_typeof(e.payload#>''{updates,dates}'')=''array''))
      ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
    IF (jsonb_typeof(v_dates)=''array'' AND jsonb_array_length(v_dates)>0 AND NOT v_dates ? p_business_date::TEXT)
      OR p_business_date<v_market.start_date OR p_business_date>v_market.end_date THEN RAISE EXCEPTION ''CASH_DATE'' USING ERRCODE=''22023''; END IF;
    INSERT INTO public.market_cash_records(market_id,business_date,owner_id,data,revision,mutation_id)
      VALUES(p_market_id,p_business_date,v_user,p_data,1,p_mutation_id) RETURNING * INTO v_row;
  ELSE
    UPDATE public.market_cash_records SET data=p_data,revision=revision+1,mutation_id=p_mutation_id,updated_at=clock_timestamp()
      WHERE market_id=p_market_id AND business_date=p_business_date RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.save_market_financial_review(p_market_id uuid, p_review_key text, p_mode text, p_amount numeric, p_observed jsonb, p_source_key text, p_expected_revision integer, p_mutation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id")),jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_observed"))));
DECLARE source jsonb; current_row public.market_financial_reviews%ROWTYPE; receipt public.market_financial_review_receipts%ROWTYPE;
 request jsonb; response jsonb; day_source jsonb; business_day date;
BEGIN
 IF auth.uid() IS NULL OR COALESCE(public.subscription_effective_plan(auth.uid()),''free'') NOT IN(''pro'',''team'') OR public.subscription_read_owner_paid(auth.uid()) IS NOT TRUE THEN RAISE EXCEPTION ''FINANCE_SCOPE'' USING ERRCODE=''42501''; END IF;
 PERFORM 1 FROM public.markets WHERE id=p_market_id AND owner_id=auth.uid() AND NOT COALESCE(is_deleted,false) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION ''FINANCE_SCOPE'' USING ERRCODE=''42501''; END IF;
 IF p_mutation_id IS NULL OR p_expected_revision IS NULL OR p_expected_revision<0 OR p_review_key IS NULL OR p_source_key IS NULL OR p_mode IS NULL OR p_observed IS NULL THEN RAISE EXCEPTION ''FINANCE_INPUT'' USING ERRCODE=''22023''; END IF;
 request:=jsonb_build_array(p_market_id,p_review_key,p_mode,p_amount,p_observed,p_source_key,p_expected_revision);
 SELECT * INTO receipt FROM public.market_financial_review_receipts WHERE owner_id=auth.uid() AND mutation_id=p_mutation_id;
 IF FOUND THEN IF receipt.request=request THEN RETURN receipt.response; ELSE RAISE EXCEPTION ''FINANCE_RETRY_CONFLICT'' USING ERRCODE=''40001''; END IF; END IF;
 source:=public.financial_review_source(p_market_id);
 IF p_review_key=''fees'' THEN
  IF p_mode NOT IN(''zero-fee'',''cleared'') OR p_amount IS NOT NULL OR p_source_key<>source->>''feeKey'' OR p_observed<>source->''feeBasis'' THEN RAISE EXCEPTION ''FINANCE_SOURCE'' USING ERRCODE=''40001''; END IF;
  IF p_mode=''zero-fee'' AND ((source->>''feeTotal'')::numeric<>0 OR EXISTS(
   SELECT 1 FROM jsonb_array_elements(source->''feeBasis'') WITH ORDINALITY f(value,n)
   WHERE n IN(3,4,5,7,9,11,13) AND public.financial_review_number(value) IS NULL
  ) OR (source#>>''{feeBasis,12}'')::numeric>100) THEN RAISE EXCEPTION ''FINANCE_INPUT'' USING ERRCODE=''22023''; END IF;
 ELSE
  business_day:=public.financial_review_day(jsonb_build_object(''dealDate'',p_review_key),NULL);
  day_source:=source#>ARRAY[''days'',p_review_key];
  IF business_day IS NULL OR business_day>(clock_timestamp() AT TIME ZONE ''Asia/Taipei'')::date OR day_source IS NULL THEN RAISE EXCEPTION ''FINANCE_DATE'' USING ERRCODE=''22023''; END IF;
  IF p_mode NOT IN(''cost'',''zero-income'',''cleared'') OR p_source_key<>day_source->>''key'' OR day_source->>''valid''<>''true'' THEN RAISE EXCEPTION ''FINANCE_SOURCE'' USING ERRCODE=''40001''; END IF;
  IF jsonb_typeof(p_observed) IS DISTINCT FROM ''array'' OR jsonb_array_length(p_observed)<>6 OR (p_observed->>0) IS DISTINCT FROM p_market_id::text OR (p_observed->>1) IS DISTINCT FROM p_review_key
   OR public.financial_review_number(p_observed->2) IS DISTINCT FROM (day_source->>''revenue'')::numeric
   OR public.financial_review_number(p_observed->5) IS DISTINCT FROM (day_source->>''deals'')::numeric
   OR jsonb_typeof(p_observed->3)<>''number'' OR jsonb_typeof(p_observed->4)<>''number'' THEN RAISE EXCEPTION ''FINANCE_SOURCE'' USING ERRCODE=''40001''; END IF;
  IF p_mode=''cost'' AND (p_amount IS NULL OR public.financial_review_number(to_jsonb(p_amount)) IS NULL OR (day_source->>''count'')::integer=0) THEN RAISE EXCEPTION ''FINANCE_INPUT'' USING ERRCODE=''22023''; END IF;
  IF p_mode<>''cost'' AND p_amount IS NOT NULL THEN RAISE EXCEPTION ''FINANCE_INPUT'' USING ERRCODE=''22023''; END IF;
  IF p_mode=''zero-income'' AND ((day_source->>''count'')::integer<>0 OR day_source->>''zeroAllowed'' IS DISTINCT FROM ''true'' OR p_observed<>jsonb_build_array(p_market_id,p_review_key,0,0,0,0)) THEN RAISE EXCEPTION ''FINANCE_INPUT'' USING ERRCODE=''22023''; END IF;
 END IF;
 SELECT * INTO current_row FROM public.market_financial_reviews WHERE owner_id=auth.uid() AND market_id=p_market_id AND review_key=p_review_key FOR UPDATE;
 IF COALESCE(current_row.revision,0)<>p_expected_revision THEN RAISE EXCEPTION ''FINANCE_CONFLICT'' USING ERRCODE=''40001''; END IF;
 INSERT INTO public.market_financial_reviews(owner_id,market_id,review_key,mode,amount,observed,source_key,revision,mutation_id)
 VALUES(auth.uid(),p_market_id,p_review_key,p_mode,p_amount,p_observed,p_source_key,p_expected_revision+1,p_mutation_id)
 ON CONFLICT(owner_id,market_id,review_key) DO UPDATE SET mode=EXCLUDED.mode,amount=EXCLUDED.amount,observed=EXCLUDED.observed,source_key=EXCLUDED.source_key,revision=EXCLUDED.revision,mutation_id=EXCLUDED.mutation_id,updated_at=clock_timestamp()
 RETURNING to_jsonb(market_financial_reviews.*) INTO response;
 INSERT INTO public.market_financial_review_receipts(owner_id,mutation_id,request,response) VALUES(auth.uid(),p_mutation_id,request,response);
 RETURN response;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.save_market_journal(p_id uuid, p_market_id uuid, p_business_date date, p_body text, p_expected_revision integer, p_mutation_id uuid, p_deleted boolean DEFAULT false)
 RETURNS market_journals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''journal'',''value'',to_jsonb("p_id")),jsonb_build_object(''kind'',''market'',''value'',to_jsonb("p_market_id"))));
DECLARE
  v_user UUID := auth.uid();
  v_market public.markets%ROWTYPE;
  v_row public.market_journals%ROWTYPE;
  v_dates JSONB;
  v_body TEXT := btrim(replace(p_body, E''\r\n'', E''\n''), E'' \t\r\n'');
BEGIN
  IF v_user IS NULL OR p_id IS NULL OR p_market_id IS NULL OR p_mutation_id IS NULL
    OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_deleted IS NULL THEN
    RAISE EXCEPTION ''JOURNAL_SCOPE'' USING ERRCODE = ''42501'';
  END IF;
  SELECT * INTO v_market FROM public.markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND OR v_market.owner_id IS DISTINCT FROM v_user OR COALESCE(v_market.is_deleted, FALSE) THEN
    RAISE EXCEPTION ''JOURNAL_SCOPE'' USING ERRCODE = ''42501'';
  END IF;
  SELECT * INTO v_row FROM public.market_journals WHERE id = p_id FOR UPDATE;
  IF FOUND THEN
    IF v_row.owner_id <> v_user OR v_row.market_id <> p_market_id THEN
      RAISE EXCEPTION ''JOURNAL_SCOPE'' USING ERRCODE = ''42501'';
    END IF;
    -- Lost acknowledgements can safely repeat the exact mutation.
    IF v_row.mutation_id = p_mutation_id AND v_row.body = v_body
      AND v_row.business_date IS NOT DISTINCT FROM p_business_date
      AND (v_row.deleted_at IS NOT NULL) = p_deleted THEN RETURN v_row; END IF;
    IF v_row.revision <> p_expected_revision OR v_row.mutation_id = p_mutation_id THEN
      RAISE EXCEPTION ''JOURNAL_CONFLICT'' USING ERRCODE = ''40001'';
    END IF;
  ELSIF p_expected_revision <> 0 OR p_deleted THEN
    RAISE EXCEPTION ''JOURNAL_CONFLICT'' USING ERRCODE = ''40001'';
  END IF;
  IF v_body IS NULL OR char_length(v_body) NOT BETWEEN 1 AND 5000 OR v_body !~ ''[^[:space:]]'' THEN
    RAISE EXCEPTION ''JOURNAL_BODY'' USING ERRCODE = ''22023'';
  END IF;
  -- Existing historical days may be preserved when editing text, even after a market date correction.
  IF p_business_date IS NOT NULL AND (v_row.id IS NULL OR p_business_date IS DISTINCT FROM v_row.business_date) THEN
    -- The existing read model stores only the range; the event stream retains explicit days.
    SELECT CASE WHEN e.type=''market_created'' THEN e.payload->''dates'' ELSE e.payload#>''{updates,dates}'' END INTO v_dates
    FROM public.events e WHERE e.market_id=p_market_id AND e.actor_id=v_user
      AND ((e.type=''market_created'' AND jsonb_typeof(e.payload->''dates'')=''array'')
        OR (e.type=''market_updated'' AND jsonb_typeof(e.payload#>''{updates,dates}'')=''array''))
    ORDER BY e.timestamp DESC,e.id DESC LIMIT 1;
    IF (jsonb_typeof(v_dates)=''array'' AND jsonb_array_length(v_dates)>0 AND NOT v_dates ? p_business_date::TEXT)
      OR (p_business_date < v_market.start_date OR p_business_date > v_market.end_date) THEN
      RAISE EXCEPTION ''JOURNAL_DATE'' USING ERRCODE = ''22023'';
    END IF;
  END IF;
  IF v_row.id IS NULL THEN
    INSERT INTO public.market_journals(id,owner_id,market_id,author_id,business_date,body,revision,mutation_id)
    VALUES(p_id,v_user,p_market_id,v_user,p_business_date,v_body,1,p_mutation_id) RETURNING * INTO v_row;
  ELSE
    UPDATE public.market_journals SET business_date=p_business_date, body=v_body, revision=revision+1,
      mutation_id=p_mutation_id, updated_at=clock_timestamp(),
      deleted_at=CASE WHEN p_deleted THEN COALESCE(deleted_at,clock_timestamp()) ELSE NULL END
    WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.save_preparation_template(p_id uuid, p_owner_id uuid, p_name text, p_items jsonb, p_expected_revision integer, p_mutation_id uuid, p_archived boolean DEFAULT false)
 RETURNS preparation_templates
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''template'',''value'',to_jsonb("p_id")),jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id")),jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_items"))));
DECLARE v_row public.preparation_templates%ROWTYPE; v_item JSONB; v_keys TEXT[] := ''{}''; v_ids TEXT[] := ''{}''; v_key TEXT;
BEGIN
  IF p_id IS NULL OR p_owner_id IS NULL OR p_mutation_id IS NULL OR p_expected_revision IS NULL
    OR p_expected_revision<0 OR p_archived IS NULL OR NOT public.can_manage_preparation_templates(p_owner_id) THEN
    RAISE EXCEPTION ''TEMPLATE_SCOPE'' USING ERRCODE=''42501'';
  END IF;
  -- Serialize creation and updates including two clients creating the same id.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::TEXT,77));
  SELECT * INTO v_row FROM public.preparation_templates WHERE id=p_id FOR UPDATE;
  IF FOUND THEN
    IF v_row.owner_id<>p_owner_id THEN RAISE EXCEPTION ''TEMPLATE_SCOPE'' USING ERRCODE=''42501''; END IF;
    IF v_row.mutation_id=p_mutation_id AND v_row.name=p_name AND v_row.items=p_items AND v_row.archived=p_archived THEN RETURN v_row; END IF;
    IF v_row.revision<>p_expected_revision OR v_row.mutation_id=p_mutation_id THEN RAISE EXCEPTION ''TEMPLATE_CONFLICT''; END IF;
  ELSIF p_expected_revision<>0 OR p_archived THEN RAISE EXCEPTION ''TEMPLATE_CONFLICT''; END IF;
  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 60 OR p_name !~ ''[^[:space:]]''
    OR p_items IS NULL OR jsonb_typeof(p_items)<>''array'' THEN RAISE EXCEPTION ''TEMPLATE_INPUT'' USING ERRCODE=''22023''; END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION ''TEMPLATE_INPUT'' USING ERRCODE=''22023''; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_key := btrim(regexp_replace(v_item->>''text'',E''[ \\t\\r\\n]+'','' '',''g''));
    IF jsonb_typeof(v_item)<>''object'' OR jsonb_typeof(v_item->''id'') IS DISTINCT FROM ''string''
      OR jsonb_typeof(v_item->''text'') IS DISTINCT FROM ''string''
      OR COALESCE(v_item->>''id'','''') !~* ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$''
      OR COALESCE(v_key,'''')='''' OR char_length(v_item->>''text'')>200 OR (v_item->>''text'') ~ E''[\\r\\n]''
      OR v_key=ANY(v_keys) OR lower(v_item->>''id'')=ANY(v_ids) THEN RAISE EXCEPTION ''TEMPLATE_INPUT'' USING ERRCODE=''22023''; END IF;
    v_keys:=array_append(v_keys,v_key); v_ids:=array_append(v_ids,lower(v_item->>''id''));
  END LOOP;
  IF v_row.id IS NULL THEN
    INSERT INTO public.preparation_templates(id,owner_id,name,items,revision,mutation_id,archived)
      VALUES(p_id,p_owner_id,btrim(p_name),p_items,1,p_mutation_id,FALSE) RETURNING * INTO v_row;
  ELSE
    UPDATE public.preparation_templates SET name=btrim(p_name),items=p_items,revision=revision+1,
      mutation_id=p_mutation_id,archived=p_archived,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.set_subscription_test_switch(p_actor uuid, p_plan text, p_enabled boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_actor"))));
DECLARE v_expires TIMESTAMPTZ;
BEGIN
 IF p_actor IS NULL OR p_enabled IS NULL OR (p_enabled AND (p_plan IS NULL OR p_plan NOT IN (''free'',''pro'',''team''))) THEN
   RAISE EXCEPTION ''TEST_SWITCH_INPUT'' USING ERRCODE=''22023''; END IF;
 PERFORM 1 FROM public.subscription_write_guard_owners WHERE owner_id=p_actor AND enabled AND allow_test_switch FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION ''TEST_SWITCH_NOT_ALLOWED'' USING ERRCODE=''42501''; END IF;
 v_expires:=CASE WHEN p_enabled THEN clock_timestamp()+INTERVAL ''4 hours'' ELSE NULL END;
 UPDATE public.subscription_write_guard_owners SET test_plan_code=CASE WHEN p_enabled THEN p_plan ELSE NULL END,
   test_expires_at=v_expires,updated_at=clock_timestamp() WHERE owner_id=p_actor;
 INSERT INTO public.subscription_test_switch_audit(owner_id,plan_code,expires_at)
   VALUES(p_actor,CASE WHEN p_enabled THEN p_plan ELSE NULL END,v_expires);
 RETURN public.read_subscription_test_switch(p_actor);
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_effective_plan(p_owner uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner"))));
DECLARE v_plan TEXT;
BEGIN
 SELECT test_plan_code INTO v_plan FROM public.subscription_write_guard_owners
 WHERE owner_id=p_owner AND enabled AND allow_test_switch AND test_expires_at>now();
 IF v_plan IS NOT NULL THEN RETURN v_plan; END IF;
 -- Billing/promotion writers are intentionally not activated by this migration.
 SELECT plan_code INTO v_plan FROM public.subscription_accounts WHERE owner_id=p_owner
   AND plan_source=''admin'' AND billing_status=''none'' AND entitlement_status IN (''active'',''grace'')
   AND (entitlement_ends_at IS NULL OR entitlement_ends_at>=now());
 RETURN COALESCE(v_plan,''free'');
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_read_guard_active(p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner"))));
RETURN (SELECT COALESCE((SELECT enforce_all FROM public.subscription_read_guard_settings WHERE singleton),false));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_read_owner_advanced(p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner")))) THEN RETURN false;END IF;
RETURN (SELECT auth.uid()=p_owner AND (NOT public.subscription_read_guard_active(p_owner)
  OR public.subscription_effective_plan(p_owner)=''team''));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_read_owner_paid(p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner")))) THEN RETURN false;END IF;
RETURN (SELECT auth.uid() IS NOT NULL AND auth.uid()=p_owner AND public.subscription_read_paid(p_owner));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_read_paid(p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner")))) THEN RETURN false;END IF;
RETURN (SELECT auth.uid() IS NOT NULL AND (p_owner=auth.uid() OR (
  public.has_authoritative_team_entitlement(p_owner) AND EXISTS(SELECT 1 FROM public.staff_relationships sr
   WHERE sr.owner_id=p_owner AND sr.staff_id=auth.uid() AND sr.status=''active'' AND sr.permissions->>''can_view''=''true'')))
 AND (NOT public.subscription_read_guard_active(p_owner)
  OR public.subscription_effective_plan(p_owner) IN (''pro'',''team'')));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_read_staff(p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
IF NOT deletion_engine_private.rpc_allowed(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner")))) THEN RETURN false;END IF;
RETURN (SELECT auth.uid() IS NOT NULL AND public.has_authoritative_team_entitlement(p_owner)
 AND EXISTS(SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id=p_owner
  AND sr.staff_id=auth.uid() AND sr.status=''active'' AND sr.role IN (''viewer'',''operator'',''manager'')
  AND sr.permissions->>''can_view''=''true''));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_require_tier(p_owner uuid, p_min integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner"))));
DECLARE v_level INTEGER;
BEGIN
 IF p_owner IS NULL THEN RAISE EXCEPTION ''SUBSCRIPTION_SCOPE'' USING ERRCODE=''42501''; END IF;
 IF NOT public.subscription_write_guard_active(p_owner) THEN RETURN; END IF;
 v_level:=CASE public.subscription_effective_plan(p_owner) WHEN ''team'' THEN 2 WHEN ''pro'' THEN 1 ELSE 0 END;
 IF v_level<p_min THEN RAISE EXCEPTION ''SUBSCRIPTION_PLAN_REQUIRED'' USING ERRCODE=''42501''; END IF;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.subscription_write_guard_active(p_owner uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
#variable_conflict use_column
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner"))));
RETURN (SELECT COALESCE((SELECT enforce_all FROM public.subscription_write_guard_settings WHERE singleton),FALSE)
   OR EXISTS(SELECT 1 FROM public.subscription_write_guard_owners WHERE owner_id=p_owner AND enabled));
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.suspend_owner_staff_for_plan(p_owner_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''identity'',''value'',to_jsonb("p_owner_id"))));
DECLARE
  v_suspended_count integer := 0;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.staff_relationships
  SET status = ''suspended_by_plan''
  WHERE owner_id = p_owner_id
    AND status = ''active'';

  GET DIAGNOSTICS v_suspended_count = ROW_COUNT;

  DELETE FROM public.market_members AS mm
  USING public.markets AS m
  WHERE m.id = mm.market_id
    AND m.owner_id = p_owner_id
    AND mm.role = ''staff''
    AND EXISTS (
      SELECT 1
      FROM public.staff_relationships AS sr
      WHERE sr.owner_id = p_owner_id
        AND sr.staff_id = mm.user_id
        AND sr.status = ''suspended_by_plan''
    );

  RETURN v_suspended_count;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.sync_team_plan_staff_suspension()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE v_owner_id uuid; v_account jsonb; v_override jsonb;
BEGIN
 v_owner_id:=CASE WHEN TG_OP=''DELETE'' THEN OLD.owner_id ELSE NEW.owner_id END;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''staff-plan:''||v_owner_id::text,0));
 IF TG_OP=''UPDATE'' AND OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
 RAISE EXCEPTION ''Staff plan owner identity is immutable.'' USING ERRCODE=''22023''; END IF;
 SELECT to_jsonb(sa) INTO v_account FROM public.subscription_accounts sa WHERE sa.owner_id=v_owner_id;
 SELECT to_jsonb(sw) INTO v_override FROM public.subscription_write_guard_owners sw WHERE sw.owner_id=v_owner_id;
 IF TG_TABLE_NAME=''subscription_accounts'' THEN
 v_account:=CASE WHEN TG_OP=''INSERT'' THEN NULL ELSE to_jsonb(OLD) END;
 ELSIF TG_TABLE_NAME=''subscription_write_guard_owners'' THEN
 v_override:=CASE WHEN TG_OP=''INSERT'' THEN NULL ELSE to_jsonb(OLD) END;
 ELSE RAISE EXCEPTION ''Unexpected staff plan source.'' USING ERRCODE=''22023''; END IF;
 IF NOT public.staff_team_access_from_source_rows(v_account,v_override,pg_catalog.now())
 OR NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
 PERFORM public.suspend_owner_staff_for_plan(v_owner_id);
 END IF;
 RETURN CASE WHEN TG_OP=''DELETE'' THEN OLD ELSE NEW END;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.touch_subscription_accounts_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.update_market_operation_session_read_model()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''public'', ''pg_temp''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_updates JSONB;
  v_market_id UUID;
BEGIN
  IF NEW.type <> ''market_updated'' THEN
    RETURN NEW;
  END IF;

  v_updates := NEW.payload->''updates'';
  IF v_updates IS NULL OR jsonb_typeof(v_updates) <> ''object'' THEN
    RETURN NEW;
  END IF;

  IF NOT (
    v_updates ? ''operation_phase'' OR
    v_updates ? ''operationPhase'' OR
    v_updates ? ''operation_session_date'' OR
    v_updates ? ''operationSessionDate''
  ) THEN
    RETURN NEW;
  END IF;

  v_market_id := COALESCE(
    NULLIF(NEW.payload->>''market_id'', '''')::UUID,
    NULLIF(NEW.payload->>''marketId'', '''')::UUID,
    NEW.market_id
  );

  UPDATE public.markets
  SET
    operation_phase = CASE
      WHEN v_updates ? ''operation_phase'' THEN NULLIF(v_updates->>''operation_phase'', '''')
      WHEN v_updates ? ''operationPhase'' THEN NULLIF(v_updates->>''operationPhase'', '''')
      ELSE operation_phase
    END,
    operation_session_date = CASE
      WHEN v_updates ? ''operation_session_date''
        THEN NULLIF(v_updates->>''operation_session_date'', '''')::DATE
      WHEN v_updates ? ''operationSessionDate''
        THEN NULLIF(v_updates->>''operationSessionDate'', '''')::DATE
      ELSE operation_session_date
    END,
    updated_at = NEW.timestamp
  WHERE id = v_market_id;

  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.update_market_read_model()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_updates JSONB;
BEGIN
  CASE NEW.type
    WHEN ''market_created'' THEN
      INSERT INTO markets (
        id,
        owner_id,
        name,
        location,
        start_date,
        end_date,
        status,
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        sales_photo_evidence_required,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        NEW.market_id,
        NEW.actor_id,
        (NEW.payload->>''name'')::TEXT,
        (NEW.payload->>''location'')::TEXT,
        (NEW.payload->>''startDate'')::DATE,
        (NEW.payload->>''endDate'')::DATE,
        ''registered'',
        (NEW.payload->>''earlyEntryEnabled'')::BOOLEAN,
        (NEW.payload->>''earlyEntryTime'')::TIME,
        (NEW.payload->>''checkInTime'')::TIME,
        (NEW.payload->>''operatingStartTime'')::TIME,
        (NEW.payload->>''operatingEndTime'')::TIME,
        (NEW.payload->>''registrationFee'')::NUMERIC,
        (NEW.payload->>''boothCost'')::NUMERIC,
        (NEW.payload->>''deposit'')::NUMERIC,
        (NEW.payload->>''tableRental'')::NUMERIC,
        (NEW.payload->>''chairRental'')::NUMERIC,
        (NEW.payload->>''umbrellaRental'')::NUMERIC,
        (NEW.payload->>''tableclothRental'')::NUMERIC,
        (NEW.payload->>''commissionRate'')::NUMERIC,
        (NEW.payload->>''tableFree'')::BOOLEAN,
        (NEW.payload->>''chairFree'')::BOOLEAN,
        (NEW.payload->>''umbrellaFree'')::BOOLEAN,
        (NEW.payload->>''tableclothFree'')::BOOLEAN,
        COALESCE(
          (NEW.payload->>''sales_photo_evidence_required'')::BOOLEAN,
          (NEW.payload->>''salesPhotoEvidenceRequired'')::BOOLEAN,
          FALSE
        ),
        (NEW.payload->>''notes'')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO market_members (market_id, user_id, role)
      VALUES (NEW.market_id, NEW.actor_id, ''owner'')
      ON CONFLICT (market_id, user_id) DO NOTHING;

    WHEN ''market_updated'' THEN
      v_updates := NEW.payload->''updates'';

      UPDATE markets
      SET
        name = COALESCE((v_updates->>''name'')::TEXT, name),
        location = COALESCE((v_updates->>''location'')::TEXT, location),
        start_date = COALESCE((v_updates->>''start_date'')::DATE, start_date),
        end_date = COALESCE((v_updates->>''end_date'')::DATE, end_date),
        early_entry_enabled = COALESCE((v_updates->>''early_entry_enabled'')::BOOLEAN, early_entry_enabled),
        early_entry_time = CASE WHEN v_updates ? ''early_entry_time'' THEN NULLIF(BTRIM(v_updates->>''early_entry_time''), '''')::TIME ELSE early_entry_time END,
        check_in_time = CASE WHEN v_updates ? ''check_in_time'' THEN NULLIF(BTRIM(v_updates->>''check_in_time''), '''')::TIME ELSE check_in_time END,
        operating_start_time = CASE WHEN v_updates ? ''operating_start_time'' THEN NULLIF(BTRIM(v_updates->>''operating_start_time''), '''')::TIME ELSE operating_start_time END,
        operating_end_time = CASE WHEN v_updates ? ''operating_end_time'' THEN NULLIF(BTRIM(v_updates->>''operating_end_time''), '''')::TIME ELSE operating_end_time END,
        registration_fee = COALESCE((v_updates->>''registration_fee'')::NUMERIC, registration_fee),
        booth_cost = COALESCE((v_updates->>''booth_cost'')::NUMERIC, booth_cost),
        deposit = COALESCE((v_updates->>''deposit'')::NUMERIC, deposit),
        table_rental = COALESCE((v_updates->>''table_rental'')::NUMERIC, table_rental),
        chair_rental = COALESCE((v_updates->>''chair_rental'')::NUMERIC, chair_rental),
        umbrella_rental = COALESCE((v_updates->>''umbrella_rental'')::NUMERIC, umbrella_rental),
        tablecloth_rental = COALESCE((v_updates->>''tablecloth_rental'')::NUMERIC, tablecloth_rental),
        commission_rate = COALESCE((v_updates->>''commission_rate'')::NUMERIC, commission_rate),
        table_free = COALESCE((v_updates->>''table_free'')::BOOLEAN, table_free),
        chair_free = COALESCE((v_updates->>''chair_free'')::BOOLEAN, chair_free),
        umbrella_free = COALESCE((v_updates->>''umbrella_free'')::BOOLEAN, umbrella_free),
        tablecloth_free = COALESCE((v_updates->>''tablecloth_free'')::BOOLEAN, tablecloth_free),
        sales_photo_evidence_required = COALESCE(
          (v_updates->>''sales_photo_evidence_required'')::BOOLEAN,
          (v_updates->>''salesPhotoEvidenceRequired'')::BOOLEAN,
          sales_photo_evidence_required
        ),
        notes = COALESCE((v_updates->>''notes'')::TEXT, notes),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>''market_id'')::UUID;

    WHEN ''market_status_changed'' THEN
      UPDATE markets
      SET
        status = (NEW.payload->>''newStatus'')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    WHEN ''market_started'' THEN
      UPDATE markets
      SET
        status = ''ongoing'',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    WHEN ''market_ended'' THEN
      UPDATE markets
      SET
        status = ''completed'',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    WHEN ''market_deleted'' THEN
      UPDATE markets
      SET
        is_deleted = TRUE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>''marketId'')::UUID;

    WHEN ''deal_closed'', ''deal_deleted'' THEN
      -- BW10_DEAL_MARKET_V1: products are projected by the product trigger only.
      UPDATE public.markets m SET
        total_revenue = GREATEST(0, COALESCE(m.total_revenue, 0) + d.direction * d.revenue),
        total_profit = COALESCE(m.total_profit, 0) + d.direction * (d.revenue - d.cost),
        total_deals = GREATEST(0, COALESCE(m.total_deals, 0) + d.direction * d.deal_count),
        updated_at = NEW.timestamp
      FROM public.deal_projection_delta(NEW.id, NEW.market_id, NEW.type, NEW.payload) d
      WHERE m.id = NEW.market_id;

    WHEN ''interaction_recorded'' THEN
      UPDATE markets
      SET
        total_interactions = total_interactions + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.update_product_read_model()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
DECLARE
  v_product_id UUID;
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN ''product_created'' THEN
      INSERT INTO products (
        id,
        owner_id,           -- ✅ 新增：商品所有者
        market_id,          -- ✅ 可選：首次創建的市集
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        is_shared,          -- ✅ 新增：是否共享
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>''productId'')::UUID,
        NEW.actor_id,       -- ✅ 使用事件的 actor_id 作為所有者
        NEW.market_id,      -- ✅ 可以是 NULL
        (NEW.payload->>''name'')::TEXT,
        (NEW.payload->>''category'')::TEXT,
        (NEW.payload->>''price'')::NUMERIC,
        (NEW.payload->>''cost'')::NUMERIC,
        (NEW.payload->>''iconName'')::TEXT,
        (NEW.payload->>''colorCode'')::TEXT,
        (NEW.payload->>''stock'')::INTEGER,
        COALESCE((NEW.payload->>''unlimitedStock'')::BOOLEAN, FALSE),
        TRUE,
        COALESCE((NEW.payload->>''isShared'')::BOOLEAN, FALSE),
        (NEW.payload->>''description'')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 商品更新事件
    WHEN ''product_updated'' THEN
      UPDATE products
      SET
        -- FERIA_PRODUCT_ACTIVE_V1: explicit false must persist.
        is_active = COALESCE((NEW.payload->''updates''->>''isActive'')::boolean,
          (NEW.payload->''updates''->>''is_active'')::boolean, is_active),
        -- FERIA_PRODUCT_DESCRIPTION_V1: absent preserves; empty or null explicitly clears.
        description = CASE WHEN NEW.payload->''updates'' ? ''description''
          THEN NEW.payload->''updates''->>''description'' ELSE description END,
        -- FERIA_PRODUCT_STOCK_MODE_V1: explicit false must survive projection.
        unlimited_stock = COALESCE(
          (NEW.payload->''updates''->>''unlimitedStock'')::boolean,
          (NEW.payload->''updates''->>''unlimited_stock'')::boolean,
          unlimited_stock), 
        name = COALESCE((NEW.payload->''updates''->>''name'')::TEXT, name),
        price = COALESCE((NEW.payload->''updates''->>''price'')::NUMERIC, price),
        cost = COALESCE((NEW.payload->''updates''->>''cost'')::NUMERIC, cost),
        stock = COALESCE((NEW.payload->''updates''->>''stock'')::INTEGER, stock),
        is_shared = COALESCE((NEW.payload->''updates''->>''isShared'')::BOOLEAN, is_shared),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>''productId'')::UUID;
    
    -- 商品刪除事件
    WHEN ''product_deleted'' THEN
      UPDATE products
      SET 
        is_active = FALSE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>''productId'')::UUID;
    
    -- 成交事件：更新商品銷售統計
    WHEN ''deal_closed'', ''deal_deleted'' THEN
      -- BW10_DEAL_PRODUCT_V1: group repeated product lines into one update.
      UPDATE public.products p SET
        total_sold = GREATEST(0, COALESCE(p.total_sold, 0) + sold.direction * sold.quantity),
        stock = CASE WHEN NOT p.unlimited_stock AND p.stock IS NOT NULL
          THEN GREATEST(0, p.stock + sold.stock_direction * sold.quantity) ELSE p.stock END,
        updated_at = NEW.timestamp
      FROM (
        SELECT COALESCE(item->>''productId'', item->>''product_id'') AS product_id,
          d.direction, d.stock_direction,
          SUM(public.deal_projection_number(item->''quantity'')) AS quantity
        FROM public.deal_projection_delta(NEW.id, NEW.market_id, NEW.type, NEW.payload) d
        CROSS JOIN LATERAL jsonb_array_elements(d.items) AS lines(item)
        WHERE public.deal_projection_number(item->''quantity'') > 0
        GROUP BY COALESCE(item->>''productId'', item->>''product_id''), d.direction, d.stock_direction
      ) sold
      WHERE p.id::TEXT = sold.product_id
        AND p.owner_id = (SELECT m.owner_id FROM public.markets m WHERE m.id = NEW.market_id);
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.update_staff_permissions(p_relationship_id uuid, p_permissions jsonb)
 RETURNS staff_relationships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''relationship'',''value'',to_jsonb("p_relationship_id")),jsonb_build_object(''kind'',''json'',''value'',to_jsonb("p_permissions"))));
DECLARE
  v_owner_id uuid := auth.uid();
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL OR NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION ''An active Team subscription is required.'' USING ERRCODE = ''42501'';
  END IF;
  IF pg_catalog.jsonb_typeof(p_permissions) IS DISTINCT FROM ''object'' THEN
    RAISE EXCEPTION ''Invalid staff permissions.'' USING ERRCODE = ''22023'';
  END IF;

  UPDATE public.staff_relationships
  SET permissions = p_permissions
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status = ''active''
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Active staff relationship not found.'' USING ERRCODE = ''P0002'';
  END IF;
  RETURN v_record;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.update_staff_relationships_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.update_staff_role(p_relationship_id uuid, p_role text)
 RETURNS staff_relationships
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''relationship'',''value'',to_jsonb("p_relationship_id"))));
DECLARE
  v_owner_id uuid := auth.uid();
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION ''Authentication required.'' USING ERRCODE = ''42501'';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION ''An active Team subscription is required.'' USING ERRCODE = ''42501'';
  END IF;
  IF p_role NOT IN (''viewer'', ''operator'', ''manager'') THEN
    RAISE EXCEPTION ''Invalid staff role.'' USING ERRCODE = ''22023'';
  END IF;

  UPDATE public.staff_relationships
  SET role = p_role,
      permissions = pg_catalog.jsonb_build_object(
        ''can_view'', true,
        ''can_edit'', p_role IN (''operator'', ''manager''),
        ''infoLevel'', CASE p_role WHEN ''viewer'' THEN 0 ELSE 2 END
      )
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status = ''active''
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''Active staff relationship not found.'' USING ERRCODE = ''P0002'';
  END IF;
  RETURN v_record;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array());
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
END;
$access_fence$;
CREATE OR REPLACE FUNCTION public.verify_invitation_token(p_token text)
 RETURNS TABLE(is_valid boolean, owner_id uuid, owner_email text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''pg_catalog'', ''public''
AS $access_fence$
BEGIN
PERFORM deletion_engine_private.assert_rpc(jsonb_build_array(jsonb_build_object(''kind'',''token'',''value'',to_jsonb("p_token"))));
BEGIN
  IF p_token IS NULL OR pg_catalog.length(pg_catalog.btrim(p_token)) < 16 THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (
      si.expires_at > pg_catalog.now()
      AND public.has_authoritative_team_entitlement(si.owner_id)
    )::boolean,
    si.owner_id::uuid,
    u.email::text,
    si.expires_at::timestamptz
  FROM public.staff_invitations AS si
  JOIN auth.users AS u ON u.id = si.owner_id
  WHERE si.token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamptz;
  END IF;
END;
END;
$access_fence$;
CREATE OR REPLACE VIEW public.owner_accessible_events WITH(security_barrier=true) AS SELECT visible.* FROM ( SELECT e.id,
    e.type,
        CASE
            WHEN subscription_read_paid(auth.uid()) THEN e.payload
            ELSE subscription_free_payload(e.payload)
        END AS payload,
    e.actor_id,
    e.market_id,
    e."timestamp",
        CASE
            WHEN subscription_read_paid(auth.uid()) THEN e.metadata
            ELSE NULL::jsonb
        END AS metadata,
    e.sync_status,
    e.created_at
   FROM events e
     LEFT JOIN markets m ON m.id = e.market_id
     LEFT JOIN products p ON e.market_id IS NULL AND (e.type = ANY (ARRAY[''product_created''::text, ''product_updated''::text, ''product_deleted''::text])) AND p.id::text = COALESCE(e.payload ->> ''productId''::text, e.payload ->> ''product_id''::text)
  WHERE (m.owner_id = auth.uid() OR e.market_id IS NULL AND
        CASE
            WHEN e.type = ANY (ARRAY[''product_created''::text, ''product_updated''::text, ''product_deleted''::text]) THEN p.owner_id = auth.uid()
            ELSE e.actor_id = auth.uid()
        END) AND (subscription_read_paid(auth.uid()) OR subscription_foundation_event(e.type))) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));
CREATE OR REPLACE VIEW public.owner_accessible_markets WITH(security_barrier=true) AS SELECT visible.* FROM ( SELECT (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).id AS id,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).owner_id AS owner_id,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).name AS name,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).location AS location,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).start_date AS start_date,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).end_date AS end_date,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).status AS status,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).early_entry_enabled AS early_entry_enabled,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).early_entry_time AS early_entry_time,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).check_in_time AS check_in_time,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).operating_start_time AS operating_start_time,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).operating_end_time AS operating_end_time,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).registration_fee AS registration_fee,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).booth_cost AS booth_cost,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).deposit AS deposit,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).table_rental AS table_rental,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).chair_rental AS chair_rental,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).umbrella_rental AS umbrella_rental,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).tablecloth_rental AS tablecloth_rental,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).commission_rate AS commission_rate,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).table_free AS table_free,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).chair_free AS chair_free,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).umbrella_free AS umbrella_free,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).tablecloth_free AS tablecloth_free,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).total_revenue AS total_revenue,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).total_profit AS total_profit,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).total_interactions AS total_interactions,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).total_deals AS total_deals,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).notes AS notes,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).created_at AS created_at,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).updated_at AS updated_at,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).is_collaborative AS is_collaborative,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).operation_phase AS operation_phase,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).is_deleted AS is_deleted,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).sync_status AS sync_status,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).sales_photo_evidence_required AS sales_photo_evidence_required,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).operation_session_date AS operation_session_date,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).venue_id AS venue_id,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).schedule_id AS schedule_id,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).session_origin AS session_origin,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).schedule_occurrence_key AS schedule_occurrence_key,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).schedule_revision AS schedule_revision,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).schedule_occurrence_state AS schedule_occurrence_state,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).is_schedule_override AS is_schedule_override,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).region_code AS region_code,
    (jsonb_populate_record(NULL::markets,
        CASE
            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)
            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)
        END)).payment_deadline AS payment_deadline
   FROM markets m
  WHERE owner_id = auth.uid()) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));
CREATE OR REPLACE VIEW public.staff_accessible_events WITH(security_barrier=true) AS SELECT visible.* FROM ( SELECT id,
    type,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(relationship_owner_id) THEN subscription_free_payload(payload)
            WHEN access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN subscription_free_payload(subscription_staff_payload(payload))
            WHEN access_type = ''staff''::text THEN subscription_staff_payload(payload)
            ELSE payload
        END AS payload,
    actor_id,
    market_id,
    "timestamp",
        CASE
            WHEN access_type = ''staff''::text OR NOT subscription_read_paid(relationship_owner_id) THEN NULL::jsonb
            ELSE metadata
        END AS metadata,
    sync_status,
    relationship_owner_id,
    permissions,
    access_type
   FROM ( SELECT e.id,
            e.type,
            sanitize_staff_event_payload(e.payload) AS payload,
            e.actor_id,
            e.market_id,
            e."timestamp",
            e.metadata,
            e.sync_status,
            sr.owner_id AS relationship_owner_id,
            sr.permissions,
            ''staff''::text AS access_type
           FROM events e
             JOIN markets m ON m.id = e.market_id
             JOIN staff_relationships sr ON sr.owner_id = m.owner_id
          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND COALESCE(m.is_deleted, false) = false
        UNION ALL
         SELECT e.id,
            e.type,
            sanitize_staff_event_payload(e.payload) AS payload,
            e.actor_id,
            e.market_id,
            e."timestamp",
            e.metadata,
            e.sync_status,
            sr.owner_id AS relationship_owner_id,
            sr.permissions,
            ''staff''::text AS access_type
           FROM events e
             JOIN staff_relationships sr ON sr.owner_id = e.actor_id
          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND e.market_id IS NULL
        UNION ALL
         SELECT e.id,
            e.type,
            e.payload,
            e.actor_id,
            e.market_id,
            e."timestamp",
            e.metadata,
            e.sync_status,
            e.actor_id AS relationship_owner_id,
            ''{"can_edit": true, "can_view": true}''::jsonb AS permissions,
            ''owner''::text AS access_type
           FROM events e
          WHERE e.actor_id = auth.uid() AND e.market_id IS NULL AND (EXISTS ( SELECT 1
                   FROM markets owned_market
                  WHERE owned_market.owner_id = auth.uid()))
        UNION ALL
         SELECT e.id,
            e.type,
            e.payload,
            e.actor_id,
            e.market_id,
            e."timestamp",
            e.metadata,
            e.sync_status,
            m.owner_id AS relationship_owner_id,
            ''{"can_edit": true, "can_view": true}''::jsonb AS permissions,
            ''owner''::text AS access_type
           FROM events e
             JOIN markets m ON m.id = e.market_id
          WHERE m.owner_id = auth.uid()) s
  WHERE access_type = ''owner''::text AND relationship_owner_id = auth.uid() AND (subscription_read_paid(relationship_owner_id) OR subscription_foundation_event(type)) OR access_type = ''staff''::text AND subscription_read_staff(relationship_owner_id) AND ((COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) = ANY (ARRAY[''2''::text, ''3''::text])) OR subscription_foundation_event(type))) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));
CREATE OR REPLACE VIEW public.staff_accessible_markets WITH(security_barrier=true) AS SELECT visible.* FROM ( SELECT id,
    owner_id,
    name,
    location,
    start_date,
    end_date,
    status,
    early_entry_enabled,
    early_entry_time,
    check_in_time,
    operating_start_time,
    operating_end_time,
    registration_fee,
    booth_cost,
    deposit,
    table_rental,
    chair_rental,
    umbrella_rental,
    tablecloth_rental,
    commission_rate,
    table_free,
    chair_free,
    umbrella_free,
    tablecloth_free,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::numeric(10,2)
            ELSE total_revenue
        END AS total_revenue,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::numeric(10,2)
            ELSE total_profit
        END AS total_profit,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer
            ELSE total_interactions
        END AS total_interactions,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer
            ELSE total_deals
        END AS total_deals,
    notes,
    created_at,
    updated_at,
    is_collaborative,
    operation_phase,
    is_deleted,
    sync_status,
    relationship_owner_id,
    permissions,
    access_type,
    sales_photo_evidence_required,
    operation_session_date,
    venue_id,
    schedule_id,
    session_origin,
    schedule_occurrence_key,
    schedule_revision,
    schedule_occurrence_state,
    is_schedule_override,
    region_code,
    payment_deadline
   FROM ( SELECT m.id,
            m.owner_id,
            m.name,
            m.location,
            m.start_date,
            m.end_date,
            m.status,
            m.early_entry_enabled,
            m.early_entry_time,
            m.check_in_time,
            m.operating_start_time,
            m.operating_end_time,
            NULL::numeric(10,2) AS registration_fee,
            NULL::numeric(10,2) AS booth_cost,
            NULL::numeric(10,2) AS deposit,
            m.table_rental,
            m.chair_rental,
            m.umbrella_rental,
            m.tablecloth_rental,
            NULL::numeric(5,2) AS commission_rate,
            m.table_free,
            m.chair_free,
            m.umbrella_free,
            m.tablecloth_free,
            m.total_revenue,
            NULL::numeric(10,2) AS total_profit,
            m.total_interactions,
            m.total_deals,
            m.notes,
            m.created_at,
            m.updated_at,
            m.is_collaborative,
            m.operation_phase,
            m.is_deleted,
            m.sync_status,
            sr.owner_id AS relationship_owner_id,
            sr.permissions,
            ''staff''::text AS access_type,
            m.sales_photo_evidence_required,
            m.operation_session_date,
            m.venue_id,
            m.schedule_id,
            m.session_origin,
            m.schedule_occurrence_key,
            m.schedule_revision,
            m.schedule_occurrence_state,
            m.is_schedule_override,
            m.region_code,
            m.payment_deadline
           FROM markets m
             JOIN staff_relationships sr ON sr.owner_id = m.owner_id
          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND COALESCE(m.is_deleted, false) = false
        UNION ALL
         SELECT m.id,
            m.owner_id,
            m.name,
            m.location,
            m.start_date,
            m.end_date,
            m.status,
            m.early_entry_enabled,
            m.early_entry_time,
            m.check_in_time,
            m.operating_start_time,
            m.operating_end_time,
            m.registration_fee,
            m.booth_cost,
            m.deposit,
            m.table_rental,
            m.chair_rental,
            m.umbrella_rental,
            m.tablecloth_rental,
            m.commission_rate,
            m.table_free,
            m.chair_free,
            m.umbrella_free,
            m.tablecloth_free,
            m.total_revenue,
            m.total_profit,
            m.total_interactions,
            m.total_deals,
            m.notes,
            m.created_at,
            m.updated_at,
            m.is_collaborative,
            m.operation_phase,
            m.is_deleted,
            m.sync_status,
            m.owner_id AS relationship_owner_id,
            ''{"can_edit": true, "can_view": true}''::jsonb AS permissions,
            ''owner''::text AS access_type,
            m.sales_photo_evidence_required,
            m.operation_session_date,
            m.venue_id,
            m.schedule_id,
            m.session_origin,
            m.schedule_occurrence_key,
            m.schedule_revision,
            m.schedule_occurrence_state,
            m.is_schedule_override,
            m.region_code,
            m.payment_deadline
           FROM markets m
          WHERE m.owner_id = auth.uid()) s
  WHERE access_type = ''owner''::text AND owner_id = auth.uid() OR access_type = ''staff''::text AND subscription_read_staff(relationship_owner_id)) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));
CREATE OR REPLACE VIEW public.staff_accessible_products WITH(security_barrier=true) AS SELECT visible.* FROM ( SELECT id,
    market_id,
    name,
    category,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::numeric(10,2)
            ELSE price
        END AS price,
    cost,
    icon_name,
    color_code,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer
            ELSE stock
        END AS stock,
    unlimited_stock,
    is_active,
        CASE
            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer
            ELSE total_sold
        END AS total_sold,
    description,
    created_at,
    updated_at,
    owner_id,
    is_shared,
    relationship_owner_id,
    permissions,
    access_type
   FROM ( SELECT p.id,
            p.market_id,
            p.name,
            p.category,
            p.price,
            NULL::numeric(10,2) AS cost,
            p.icon_name,
            p.color_code,
            p.stock,
            p.unlimited_stock,
            p.is_active,
            p.total_sold,
            p.description,
            p.created_at,
            p.updated_at,
            p.owner_id,
            p.is_shared,
            sr.owner_id AS relationship_owner_id,
            sr.permissions,
            ''staff''::text AS access_type
           FROM products p
             JOIN staff_relationships sr ON sr.owner_id = p.owner_id
          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND p.is_active = true
        UNION ALL
         SELECT p.id,
            p.market_id,
            p.name,
            p.category,
            p.price,
            p.cost,
            p.icon_name,
            p.color_code,
            p.stock,
            p.unlimited_stock,
            p.is_active,
            p.total_sold,
            p.description,
            p.created_at,
            p.updated_at,
            p.owner_id,
            p.is_shared,
            p.owner_id AS relationship_owner_id,
            ''{"can_edit": true, "can_view": true}''::jsonb AS permissions,
            ''owner''::text AS access_type
           FROM products p
          WHERE p.owner_id = auth.uid() AND p.is_active = true) s
  WHERE access_type = ''owner''::text AND subscription_read_owner_paid(owner_id) OR access_type = ''staff''::text AND subscription_read_staff(relationship_owner_id)) visible WHERE deletion_engine_private.visible_row(to_jsonb(visible));
REVOKE ALL ON FUNCTION public.audit_account_deletion_request_transition() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.auto_add_staff_to_new_market() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.delete_current_user_app_data() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_account_deletion_request_transition() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_event_inbox_write() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_reconciliation_run_write() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_storefront_mapping_update() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_subscription_snapshot_write() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_transaction_write() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_event_actor_authorization() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_subscription_event_write() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_subscription_market_summary() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_subscription_price_assignment_write() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_subscription_price_version_update() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.enforce_subscription_row_write() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_cash_schedule_snapshot() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_journal_schedule_snapshot() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_market_payment_deadline_change() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_market_region_change() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_recurring_operations_event() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guard_staff_role_permission_consistency() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prevent_account_deletion_audit_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prevent_f3b_billing_ledger_delete() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.project_market_payment_deadline_event() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.project_market_region_event() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.project_recurring_operations_event() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reject_billing_customer_link_mutation() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.sync_team_plan_staff_suspension() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.touch_subscription_accounts_updated_at() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.update_market_operation_session_read_model() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.update_market_read_model() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.update_product_read_model() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.update_staff_relationships_timestamp() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC,anon,authenticated,service_role;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM PUBLIC,anon,authenticated,service_role;

CREATE SCHEMA deletion_upload_private;
REVOKE ALL ON SCHEMA deletion_upload_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE deletion_upload_private.attempts(
 id uuid PRIMARY KEY,token_hash text NOT NULL,actor_id uuid,owner_id uuid NOT NULL,
 state text NOT NULL DEFAULT ''open'' CHECK(state IN(''open'',''settled'',''uncertain'')),
 deadline timestamptz NOT NULL DEFAULT clock_timestamp()+interval ''5 minutes'',
 kind text CHECK(kind IN(''product'',''sale'')),entity_id uuid,keys text[] NOT NULL DEFAULT ''{}'',write_keys text[] NOT NULL DEFAULT ''{}'',
 issued_keys text[] NOT NULL DEFAULT ''{}'',claim_hash text,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON deletion_upload_private.attempts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION deletion_upload_private.lock_pair(a uuid,b uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE x uuid;BEGIN
 IF current_setting(''transaction_isolation'')<>''read committed'' THEN RAISE EXCEPTION ''upload_barrier_requires_read_committed'' USING ERRCODE=''40001'';END IF;
 FOR x IN SELECT DISTINCT v FROM unnest(ARRAY[a,b])v WHERE v IS NOT NULL ORDER BY v LOOP
  PERFORM pg_advisory_xact_lock(hashtextextended(''deletion-upload:''||x::text,0));
 END LOOP;
END$$;
CREATE FUNCTION deletion_upload_private.claim_hash(kind text,r jsonb) RETURNS text LANGUAGE sql IMMUTABLE SET search_path='''' AS $$
 SELECT encode(extensions.digest(jsonb_build_array(kind,r->''id'',r->''owner_id'',r->''product_id'',r->''status'',r->''pending_photo_id'',r->''pending_version'',r->''version'',r->''upload_attempt_id'',r->''upload_lease_expires_at'')::text,''sha256''),''hex'');
$$;
CREATE FUNCTION deletion_upload_private.key_owned(k text,owner uuid) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='''' AS $$
 SELECT k IS NOT NULL AND length(k)<=1024 AND k !~ ''[[:space:]%?#\\]'' AND position(''..'' IN k)=0 AND position(''//'' IN k)=0
 AND (k ~ (''^product-cover-photos/''||owner::text||''/[a-f0-9-]{36}/[a-f0-9-]{36}/v[1-9][0-9]*/(display|thumbnail)\.(webp|jpg|jpeg)$'')
 OR k ~ (''^sales-evidence(-thumbs)?/7d/''||owner::text||''/[A-Za-z0-9_./-]+\.(webp|jpg|jpeg)$''));
$$;
CREATE FUNCTION public.bff_begin_deletion_upload(p_id uuid,p_token uuid,p_actor uuid,p_owner uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
 IF p_id IS NULL OR p_token IS NULL OR p_actor IS NULL OR p_owner IS NULL THEN RAISE EXCEPTION ''upload_identity_required'' USING ERRCODE=''22023'';END IF;
 PERFORM deletion_upload_private.lock_pair(p_actor,p_owner);
 IF NOT deletion_engine_private.actor_enabled(p_actor) OR NOT deletion_engine_private.actor_enabled(p_owner) THEN RAISE EXCEPTION ''upload_actor_frozen'' USING ERRCODE=''55000'';END IF;
 INSERT INTO deletion_upload_private.attempts(id,token_hash,actor_id,owner_id) VALUES(p_id,encode(extensions.digest(p_token::text,''sha256''),''hex''),p_actor,p_owner);
END$$;
CREATE FUNCTION public.bff_bind_deletion_upload(p_id uuid,p_token uuid,p_kind text,p_entity uuid,p_keys text[],p_write_keys text[],p_expected jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;r jsonb;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,''sha256''),''hex'') OR a.state<>''open'' OR a.kind IS NOT NULL
  THEN RAISE EXCEPTION ''upload_attempt_conflict'' USING ERRCODE=''55000'';END IF;
 IF p_kind NOT IN(''product'',''sale'') OR p_kind IS NULL OR p_expected IS NULL OR jsonb_typeof(p_expected)<>''object''
  OR (p_kind=''product'' AND (p_expected->>''photoId'' IS NULL OR p_expected->>''version'' IS NULL))
  OR (p_kind=''sale'' AND p_expected->>''attemptId'' IS NULL)
  OR coalesce(cardinality(p_keys),0) NOT BETWEEN 1 AND 8
  OR coalesce(cardinality(p_write_keys),0)<>2 OR NOT p_write_keys<@p_keys
  OR EXISTS(SELECT 1 FROM unnest(p_keys)k WHERE NOT deletion_upload_private.key_owned(k,a.owner_id))
  THEN RAISE EXCEPTION ''upload_key_scope'' USING ERRCODE=''22023'';END IF;
 IF p_kind=''product'' THEN
  SELECT to_jsonb(p) INTO r FROM public.product_cover_photos p WHERE product_id=p_entity AND owner_id=a.owner_id AND deleted_at IS NULL;
  IF r IS NULL OR coalesce(r->>''pending_photo_id'',r->>''id'') IS DISTINCT FROM p_expected->>''photoId''
   OR coalesce(r->>''pending_version'',r->>''version'') IS DISTINCT FROM p_expected->>''version'' THEN RAISE EXCEPTION ''upload_claim_mismatch'' USING ERRCODE=''55000'';END IF;
 ELSE
  SELECT to_jsonb(p) INTO r FROM public.sale_photo_evidence p WHERE id=p_entity AND owner_id=a.owner_id;
  IF r IS NULL OR r->>''upload_attempt_id'' IS DISTINCT FROM p_expected->>''attemptId'' THEN RAISE EXCEPTION ''upload_claim_mismatch'' USING ERRCODE=''55000'';END IF;
 END IF;
 IF r->>''upload_lease_expires_at'' IS NULL THEN RAISE EXCEPTION ''upload_claim_lease_required'' USING ERRCODE=''55000'';END IF;
 UPDATE deletion_upload_private.attempts SET kind=p_kind,entity_id=p_entity,keys=p_keys,write_keys=p_write_keys,claim_hash=deletion_upload_private.claim_hash(p_kind,r) WHERE id=p_id;
END$$;
CREATE FUNCTION public.bff_authorize_deletion_upload(p_id uuid,p_token uuid,p_key text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,''sha256''),''hex'') OR a.state<>''open'' OR a.kind IS NULL
  OR a.deadline<=clock_timestamp() OR NOT deletion_engine_private.actor_enabled(a.actor_id) OR NOT deletion_engine_private.actor_enabled(a.owner_id)
  THEN RAISE EXCEPTION ''upload_write_fenced'' USING ERRCODE=''55000'';END IF;
 IF p_key IS NOT NULL THEN
  IF NOT p_key=ANY(a.write_keys) OR p_key=ANY(a.issued_keys) THEN RAISE EXCEPTION ''upload_ticket_conflict'' USING ERRCODE=''55000'';END IF;
  IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts other WHERE other.id<>p_id AND other.state<>''settled'' AND p_key=ANY(other.write_keys))
   THEN RAISE EXCEPTION ''upload_key_busy'' USING ERRCODE=''55P03'';END IF;
  UPDATE deletion_upload_private.attempts SET issued_keys=array_append(issued_keys,p_key) WHERE id=p_id;
 END IF;
END$$;
CREATE FUNCTION public.bff_finish_deletion_upload(p_id uuid,p_token uuid,p_state text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,''sha256''),''hex'') OR p_state NOT IN(''settled'',''uncertain'') OR p_state IS NULL
  OR (a.state<>''open'' AND a.state<>p_state) THEN RAISE EXCEPTION ''upload_finish_conflict'' USING ERRCODE=''55000'';END IF;
 UPDATE deletion_upload_private.attempts SET state=p_state WHERE id=p_id;
END$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.upload_tracking_enabled() RETURNS boolean LANGUAGE sql SET search_path='''' AS $$SELECT true$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.lock_upload_actor(actor uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path='''' AS $$SELECT deletion_upload_private.lock_pair(actor,actor)$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.assert_uploads_quiescent(actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE r record;h text;BEGIN
 IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts WHERE (actor_id=actor OR owner_id=actor) AND (state=''uncertain'' OR (state=''open'' AND deadline<=clock_timestamp())))
  THEN RAISE EXCEPTION ''upload_outcome_requires_review'' USING ERRCODE=''55000'';END IF;
 IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts WHERE (actor_id=actor OR owner_id=actor) AND state=''open'')
  THEN RAISE EXCEPTION ''uploads_still_open'' USING ERRCODE=''55P03'';END IF;
 -- An untracked product lease cannot safely be attributed to a staff member.
 -- Conservatively hold rather than guessing that an expired legacy lease stopped I/O.
 FOR r IN SELECT ''product''::text k,to_jsonb(p) j FROM public.product_cover_photos p WHERE upload_lease_expires_at IS NOT NULL OR status=''uploading''
  UNION ALL SELECT ''sale'',to_jsonb(p) FROM public.sale_photo_evidence p WHERE upload_lease_expires_at IS NOT NULL OR status=''uploading'' LOOP
  h:=deletion_upload_private.claim_hash(r.k,r.j);
  IF NOT EXISTS(SELECT 1 FROM deletion_upload_private.attempts a WHERE a.kind=r.k AND a.claim_hash=h) THEN
   IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts a WHERE a.owner_id=(r.j->>''owner_id'')::uuid AND a.kind IS NULL AND a.state=''open'' AND a.deadline>clock_timestamp())
    THEN RAISE EXCEPTION ''upload_binding_pending'' USING ERRCODE=''55P03'';END IF;
   RAISE EXCEPTION ''legacy_upload_requires_review'' USING ERRCODE=''55000'';
  END IF;
 END LOOP;
END$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.extra_upload_keys(actor uuid) RETURNS TABLE(object_key text)
LANGUAGE sql SECURITY DEFINER SET search_path='''' AS $$SELECT DISTINCT unnest(keys) FROM deletion_upload_private.attempts WHERE owner_id=actor$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.detach_upload_actor(actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
 PERFORM deletion_engine_private.assert_uploads_quiescent(actor);
 DELETE FROM deletion_upload_private.attempts WHERE owner_id=actor;
 UPDATE deletion_upload_private.attempts SET actor_id=NULL WHERE actor_id=actor;
END$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA deletion_upload_private FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_begin_deletion_upload(uuid,uuid,uuid,uuid),public.bff_bind_deletion_upload(uuid,uuid,text,uuid,text[],text[],jsonb),
 public.bff_authorize_deletion_upload(uuid,uuid,text),public.bff_finish_deletion_upload(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_begin_deletion_upload(uuid,uuid,uuid,uuid),public.bff_bind_deletion_upload(uuid,uuid,text,uuid,text[],text[],jsonb),
 public.bff_authorize_deletion_upload(uuid,uuid,text),public.bff_finish_deletion_upload(uuid,uuid,text) TO service_role;

CREATE TABLE deletion_upload_private.reviews(
 attempt_id uuid PRIMARY KEY REFERENCES deletion_upload_private.attempts(id) ON DELETE CASCADE,
 request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id),
 input_hash text NOT NULL,source_hash text NOT NULL,drain_hash text NOT NULL,reviewer_hash text NOT NULL,
 observation_hash text NOT NULL,present_count integer NOT NULL,absent_count integer NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON deletion_upload_private.reviews FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION deletion_upload_private.review_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path='''' AS $$BEGIN
 RAISE EXCEPTION ''upload_review_immutable'' USING ERRCODE=''55000'';
END$$;
CREATE TRIGGER upload_review_immutable BEFORE UPDATE ON deletion_upload_private.reviews FOR EACH ROW EXECUTE FUNCTION deletion_upload_private.review_immutable();
-- Prior fixture-only mode. The terminal-PUT installation replaces this hook with
-- receipt validation; production must never install this no-op as a drain attestor.
CREATE FUNCTION deletion_upload_private.validate_drain_evidence(a uuid,s text,h text) RETURNS void LANGUAGE plpgsql SET search_path='''' AS $$BEGIN RETURN;END$$;
REVOKE ALL ON FUNCTION deletion_upload_private.validate_drain_evidence(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.bff_reconcile_deletion_upload(p_request uuid,p_token text,p_id uuid,p_action text,p_evidence jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE r public.account_deletion_requests%ROWTYPE;a deletion_upload_private.attempts%ROWTYPE;
 saved deletion_upload_private.reviews%ROWTYPE;m jsonb;source text;input_hash text;obs jsonb;item jsonb;seen text[]:=''{}'';
 present_n integer:=0;absent_n integer:=0;frozen_request uuid;wanted text[];
BEGIN
 IF NOT deletion_release_private.runtime_allowed() THEN RAISE EXCEPTION ''upload_review_local_only'' USING ERRCODE=''55000'';END IF;
 SELECT * INTO r FROM public.account_deletion_requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND OR r.status<>''processing'' OR r.active_actor_id IS NULL OR r.identity_confirmed_at IS NULL OR r.preflight_resolution IS NULL
  OR r.lease_expires_at IS NULL OR r.lease_expires_at<=clock_timestamp() OR r.lease_expires_at>clock_timestamp()+interval ''5 minutes''
  OR r.lease_token_hash IS DISTINCT FROM encode(extensions.digest(p_token,''sha256''),''hex'')
  THEN RAISE EXCEPTION ''upload_review_lease_lost'' USING ERRCODE=''55000'';END IF;
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 IF NOT FOUND OR r.active_actor_id NOT IN(a.actor_id,a.owner_id) OR a.actor_id IS NULL
  THEN RAISE EXCEPTION ''upload_review_scope'' USING ERRCODE=''55000'';END IF;
 -- Same request -> sorted actor/owner -> attempt lock order as the engine.
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.actor_id IS NULL OR r.active_actor_id NOT IN(a.actor_id,a.owner_id)
  THEN RAISE EXCEPTION ''upload_review_scope'' USING ERRCODE=''55000'';END IF;
 IF r.lease_expires_at<=clock_timestamp() THEN RAISE EXCEPTION ''upload_review_lease_lost'' USING ERRCODE=''55000'';END IF;
 SELECT request_id INTO frozen_request FROM deletion_engine_private.frozen
  WHERE actor_hash=encode(extensions.digest(r.active_actor_id::text,''sha256''),''hex'');
 IF frozen_request IS DISTINCT FROM p_request THEN RAISE EXCEPTION ''upload_review_not_frozen'' USING ERRCODE=''55000'';END IF;
 PERFORM deletion_engine_private.assert_catalog();
 IF p_action IS NULL OR p_action NOT IN(''inspect'',''commit'') THEN RAISE EXCEPTION ''upload_review_action'' USING ERRCODE=''22023'';END IF;
 input_hash:=encode(extensions.digest(p_evidence::text,''sha256''),''hex'');
 SELECT * INTO saved FROM deletion_upload_private.reviews WHERE attempt_id=p_id;
 IF FOUND THEN
  IF saved.request_id<>p_request OR (p_action=''commit'' AND saved.input_hash IS DISTINCT FROM input_hash)
   THEN RAISE EXCEPTION ''upload_review_replay_conflict'' USING ERRCODE=''55000'';END IF;
  RETURN jsonb_build_object(''outcome'',''reconciled'',''evidenceHash'',saved.input_hash);
 END IF;
 -- Only recover at the first blocked post-freeze step, never after cleanup advances.
 IF NOT EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE request_id=p_request AND step_code=''access_frozen'' AND status=''completed'')
  OR NOT EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE request_id=p_request AND step_code=''staff_access_revoked'' AND status=''completed'')
  OR EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps WHERE request_id=p_request AND status=''completed'' AND step_code NOT IN(''access_frozen'',''staff_access_revoked''))
  THEN RAISE EXCEPTION ''upload_review_step_order'' USING ERRCODE=''55000'';END IF;
 IF a.kind IS NULL OR a.entity_id IS NULL OR a.claim_hash IS NULL OR cardinality(a.keys) NOT BETWEEN 1 AND 8
  OR EXISTS(SELECT 1 FROM unnest(a.keys)k WHERE NOT deletion_upload_private.key_owned(k,a.owner_id))
  THEN RAISE EXCEPTION ''upload_review_unbound_or_legacy'' USING ERRCODE=''55000'';END IF;
 -- Existing replay bindings may repeat the current keys as previous keys.
 -- Inspect each exact key once without rewriting the original ledger/source hash.
 SELECT array_agg(k ORDER BY k) INTO wanted FROM (SELECT DISTINCT unnest(a.keys)k)s;
 IF a.state NOT IN(''open'',''uncertain'') OR (a.state=''open'' AND a.deadline>clock_timestamp())
  THEN RAISE EXCEPTION ''upload_review_not_required_or_inflight'' USING ERRCODE=''55P03'';END IF;
 IF a.kind=''product'' THEN
  SELECT to_jsonb(p) INTO m FROM public.product_cover_photos p WHERE product_id=a.entity_id AND owner_id=a.owner_id AND deleted_at IS NULL FOR UPDATE;
 ELSE
  SELECT to_jsonb(p) INTO m FROM public.sale_photo_evidence p WHERE id=a.entity_id AND owner_id=a.owner_id FOR UPDATE;
 END IF;
 -- Original pending claim, terminal metadata with scoped keys, or absent metadata only.
 -- A newer/different pending claim must be separately reviewed; never rewrite it.
 IF m IS NOT NULL AND deletion_upload_private.claim_hash(a.kind,m) IS DISTINCT FROM a.claim_hash THEN
  IF coalesce(m->>''status'','''') NOT IN(''uploaded'',''upload_failed'') OR m->>''upload_lease_expires_at'' IS NOT NULL
   OR (a.kind=''product'' AND (m->>''pending_photo_id'' IS NOT NULL OR m->>''pending_version'' IS NOT NULL))
   THEN RAISE EXCEPTION ''upload_review_metadata_changed_claim'' USING ERRCODE=''55000'';END IF;
  IF EXISTS(SELECT 1 FROM unnest(CASE a.kind WHEN ''product'' THEN ARRAY[m->>''display_object_key'',m->>''thumbnail_object_key'']
     ELSE ARRAY[m->>''r2_object_key'',m->>''r2_thumbnail_key''] END)k
    WHERE (k IS NULL AND m->>''status''=''uploaded'') OR (k IS NOT NULL AND NOT k=ANY(a.keys)))
   THEN RAISE EXCEPTION ''upload_review_metadata_key_scope'' USING ERRCODE=''55000'';END IF;
 END IF;
 source:=encode(extensions.digest(jsonb_build_array(to_jsonb(a)-''token_hash'',m)::text,''sha256''),''hex'');
 IF p_action=''inspect'' THEN RETURN jsonb_build_object(''outcome'',''review_required'',''attemptId'',a.id,''actorId'',a.actor_id,''ownerId'',a.owner_id,
  ''sourceHash'',source,''keys'',to_jsonb(wanted),''issuedKeys'',to_jsonb(a.issued_keys));END IF;
 IF p_evidence IS NULL OR jsonb_typeof(p_evidence)<>''object'' OR p_evidence->>''sourceHash'' IS DISTINCT FROM source
  OR coalesce(p_evidence->>''drainHash'','''') !~ ''^[a-f0-9]{64}$'' OR coalesce(p_evidence->>''reviewerHash'','''') !~ ''^[a-f0-9]{64}$''
  OR p_evidence->>''expiresAt'' IS NULL OR (p_evidence->>''expiresAt'')::timestamptz<=clock_timestamp()
  OR (p_evidence->>''expiresAt'')::timestamptz>clock_timestamp()+interval ''2 minutes''
  OR coalesce(jsonb_typeof(p_evidence->''observations''),'''')<>''array''
  THEN RAISE EXCEPTION ''upload_review_evidence_stale'' USING ERRCODE=''55000'';END IF;
 obs:=p_evidence->''observations'';
 IF jsonb_array_length(obs)<>cardinality(wanted) THEN RAISE EXCEPTION ''upload_review_keys_incomplete'' USING ERRCODE=''22023'';END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(obs) LOOP
  IF coalesce(jsonb_typeof(item),'''')<>''object'' OR item->>''key'' IS NULL OR NOT (item->>''key'')=ANY(a.keys)
   OR (item->>''key'')=ANY(seen) OR item->>''state'' IS NULL OR item->>''state'' NOT IN(''present'',''absent'')
   THEN RAISE EXCEPTION ''upload_review_observation_invalid'' USING ERRCODE=''22023'';END IF;
  seen:=array_append(seen,item->>''key'');
  IF item->>''state''=''present'' THEN present_n:=present_n+1;ELSE absent_n:=absent_n+1;END IF;
 END LOOP;
 IF r.lease_expires_at<=clock_timestamp() OR (p_evidence->>''expiresAt'')::timestamptz<=clock_timestamp()
  THEN RAISE EXCEPTION ''upload_review_evidence_expired_while_waiting'' USING ERRCODE=''55000'';END IF;
 PERFORM deletion_upload_private.validate_drain_evidence(p_id,source,p_evidence->>''drainHash'');
 -- No object/metadata writes. Preserve every registered key for the normal manifest.
 INSERT INTO deletion_upload_private.reviews(attempt_id,request_id,input_hash,source_hash,drain_hash,reviewer_hash,observation_hash,present_count,absent_count)
 VALUES(p_id,p_request,input_hash,source,p_evidence->>''drainHash'',p_evidence->>''reviewerHash'',encode(extensions.digest(obs::text,''sha256''),''hex''),present_n,absent_n);
 UPDATE deletion_upload_private.attempts SET state=''settled'' WHERE id=p_id;
 RETURN jsonb_build_object(''outcome'',''reconciled'',''evidenceHash'',input_hash);
END$$;
REVOKE ALL ON FUNCTION deletion_upload_private.review_immutable() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_reconcile_deletion_upload(uuid,text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_reconcile_deletion_upload(uuid,text,uuid,text,jsonb) TO service_role;

CREATE TABLE deletion_upload_private.transport_target(slot boolean PRIMARY KEY CHECK(slot),target_hash text NOT NULL CHECK(target_hash ~ ''^[a-f0-9]{64}$''));
-- Reviewed installer must set exactly one target; missing/unmatched target always rejects.
CREATE TABLE deletion_upload_private.puts(
 attempt_id uuid NOT NULL REFERENCES deletion_upload_private.attempts(id) ON DELETE CASCADE,
 object_key text NOT NULL,ticket uuid NOT NULL UNIQUE,target_hash text NOT NULL,body_hash text NOT NULL,
 receipt jsonb,PRIMARY KEY(attempt_id,object_key)
);
REVOKE ALL ON deletion_upload_private.transport_target,deletion_upload_private.puts FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.bff_record_deletion_upload_put(p_id uuid,p_token uuid,p_key text,p_action text,p_data jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE a deletion_upload_private.attempts%ROWTYPE;old deletion_upload_private.puts%ROWTYPE;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 PERFORM deletion_upload_private.lock_pair(a.actor_id,a.owner_id);
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR a.token_hash IS DISTINCT FROM encode(extensions.digest(p_token::text,''sha256''),''hex'')
  OR p_data IS NULL OR jsonb_typeof(p_data)<>''object'' OR p_key IS NULL OR NOT p_key=ANY(a.issued_keys)
  OR coalesce(p_data->>''targetHash'','''') IS DISTINCT FROM (SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot)
  OR coalesce(p_data->>''bodyHash'','''') !~ ''^[a-f0-9]{64}$'' OR p_data->>''ticket'' IS NULL
  THEN RAISE EXCEPTION ''terminal_put_scope'' USING ERRCODE=''55000'';END IF;
 IF p_action=''issue'' THEN
  IF a.state<>''open'' OR a.deadline<=clock_timestamp() OR NOT deletion_engine_private.actor_enabled(a.actor_id) OR NOT deletion_engine_private.actor_enabled(a.owner_id)
   THEN RAISE EXCEPTION ''terminal_put_frozen'' USING ERRCODE=''55000'';END IF;
  INSERT INTO deletion_upload_private.puts(attempt_id,object_key,ticket,target_hash,body_hash)
   VALUES(p_id,p_key,(p_data->>''ticket'')::uuid,p_data->>''targetHash'',p_data->>''bodyHash'');
 ELSIF p_action=''ack'' THEN
  SELECT * INTO old FROM deletion_upload_private.puts WHERE attempt_id=p_id AND object_key=p_key FOR UPDATE;
  IF NOT FOUND OR old.ticket::text IS DISTINCT FROM p_data->>''ticket'' OR old.body_hash IS DISTINCT FROM p_data->>''bodyHash'' OR old.target_hash IS DISTINCT FROM p_data->>''targetHash''
   OR p_data->>''profile'' IS DISTINCT FROM ''s3-single-put-200-v1'' OR p_data->>''attempts'' IS DISTINCT FROM ''1''
   OR p_data->>''status'' IS DISTINCT FROM ''200'' OR coalesce(p_data->>''etagHash'','''') !~ ''^[a-f0-9]{64}$''
   OR (old.receipt IS NOT NULL AND old.receipt IS DISTINCT FROM p_data)
   THEN RAISE EXCEPTION ''terminal_put_ack_conflict'' USING ERRCODE=''55000'';END IF;
  -- A provider response can be persisted after freeze. It cannot authorize another PUT.
  UPDATE deletion_upload_private.puts SET receipt=p_data WHERE attempt_id=p_id AND object_key=p_key AND receipt IS NULL;
 ELSE RAISE EXCEPTION ''terminal_put_action'' USING ERRCODE=''22023'';END IF;
END$$;
CREATE FUNCTION deletion_upload_private.terminal_proof(p_id uuid,p_source text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$
DECLARE a deletion_upload_private.attempts%ROWTYPE;t text;rows jsonb;BEGIN
 SELECT * INTO a FROM deletion_upload_private.attempts WHERE id=p_id;
 SELECT target_hash INTO t FROM deletion_upload_private.transport_target WHERE slot;
 IF a.id IS NULL OR t IS NULL OR EXISTS(SELECT 1 FROM unnest(a.issued_keys)k WHERE NOT EXISTS(
    SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=p_id AND p.object_key=k AND p.receipt IS NOT NULL AND p.target_hash=t))
  OR EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=p_id AND (NOT p.object_key=ANY(a.issued_keys) OR p.receipt IS NULL OR p.target_hash<>t))
  THEN RAISE EXCEPTION ''terminal_put_unconfirmed'' USING ERRCODE=''55000'';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_array(object_key,ticket,body_hash,receipt) ORDER BY object_key),''[]'') INTO rows
  FROM deletion_upload_private.puts WHERE attempt_id=p_id;
 RETURN encode(extensions.digest(jsonb_build_array(''terminal-put-v1'',p_id,p_source,t,to_jsonb(a.issued_keys),rows)::text,''sha256''),''hex'');
END$$;
CREATE OR REPLACE FUNCTION deletion_upload_private.validate_drain_evidence(a uuid,s text,h text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
 IF h IS DISTINCT FROM deletion_upload_private.terminal_proof(a,s) THEN RAISE EXCEPTION ''terminal_put_proof_mismatch'' USING ERRCODE=''55000'';END IF;
END$$;
CREATE FUNCTION public.bff_get_deletion_upload_drain(p_request uuid,p_token text,p_id uuid,p_source text,p_target text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE c jsonb;h text;BEGIN
 -- Reuses exact live deletion lease/freeze/scope checks and retains their locks.
 c:=public.bff_reconcile_deletion_upload(p_request,p_token,p_id,''inspect'',NULL);
 IF c->>''outcome'' IS DISTINCT FROM ''review_required'' OR c->>''sourceHash'' IS DISTINCT FROM p_source
  OR p_target IS NULL OR p_target IS DISTINCT FROM (SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot)
  THEN RAISE EXCEPTION ''terminal_put_review_scope'' USING ERRCODE=''55000'';END IF;
 h:=deletion_upload_private.terminal_proof(p_id,p_source);
 RETURN jsonb_build_object(''scopeHash'',p_source,''evidenceHash'',h,''expiresAt'',clock_timestamp()+interval ''60 seconds'');
END$$;
REVOKE ALL ON FUNCTION deletion_upload_private.terminal_proof(uuid,text),deletion_upload_private.validate_drain_evidence(uuid,text,text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.bff_record_deletion_upload_put(uuid,uuid,text,text,jsonb),public.bff_get_deletion_upload_drain(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_record_deletion_upload_put(uuid,uuid,text,text,jsonb),public.bff_get_deletion_upload_drain(uuid,text,uuid,text,text) TO service_role;

CREATE TABLE deletion_upload_private.readbacks(
 attempt_id uuid NOT NULL REFERENCES deletion_upload_private.attempts(id) ON DELETE CASCADE,
 source_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(attempt_id,source_hash)
);
REVOKE ALL ON deletion_upload_private.readbacks FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.bff_read_recorded_photo_upload(p_actor uuid,p_owner uuid,p_kind text,p_entity uuid,p_spec jsonb,p_source text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE m jsonb;photo_keys text[];h text;candidate uuid;write_allowed jsonb;BEGIN
 IF p_actor IS NULL OR p_owner IS NULL OR p_entity IS NULL OR p_kind IS NULL OR p_kind NOT IN(''product'',''sale'') OR jsonb_typeof(p_spec) IS DISTINCT FROM ''object''
  THEN RAISE EXCEPTION ''photo_readback_input'' USING ERRCODE=''22023'';END IF;
 PERFORM deletion_upload_private.lock_pair(p_actor,p_owner);
 IF NOT deletion_engine_private.actor_enabled(p_actor) OR NOT deletion_engine_private.actor_enabled(p_owner)
  THEN RAISE EXCEPTION ''photo_readback_frozen'' USING ERRCODE=''55000'';END IF;
 write_allowed:=public.check_subscription_write_for_actor(p_actor,p_owner,CASE p_kind WHEN ''product'' THEN ''product_photo'' ELSE ''sales_photo'' END);
 IF write_allowed->>''allowed'' IS DISTINCT FROM ''true'' OR (p_actor<>p_owner AND NOT EXISTS(SELECT 1 FROM public.staff_relationships
  WHERE staff_id=p_actor AND owner_id=p_owner AND status=''active'' AND role=ANY(CASE p_kind WHEN ''product'' THEN ARRAY[''manager''] ELSE ARRAY[''manager'',''operator''] END)))
  THEN RAISE EXCEPTION ''photo_readback_permission'' USING ERRCODE=''42501'';END IF;
 IF p_kind=''product'' THEN
  IF NOT EXISTS(SELECT 1 FROM public.products WHERE id=p_entity AND owner_id=p_owner AND is_active) THEN RAISE EXCEPTION ''photo_readback_scope'' USING ERRCODE=''42501'';END IF;
  SELECT to_jsonb(p) INTO m FROM public.product_cover_photos p WHERE owner_id=p_owner AND product_id=p_entity AND deleted_at IS NULL FOR UPDATE;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.events e JOIN public.markets v ON v.id=e.market_id WHERE e.id=p_entity AND e.type=''deal_closed'' AND v.owner_id=p_owner AND v.id::text=p_spec->>''marketId'')
   THEN RAISE EXCEPTION ''photo_readback_scope'' USING ERRCODE=''42501'';END IF;
  SELECT to_jsonb(p) INTO m FROM public.sale_photo_evidence p WHERE owner_id=p_owner AND sale_id=p_entity AND deleted_at IS NULL FOR UPDATE;
  IF m IS NOT NULL AND p_actor<>p_owner AND m->>''captured_by_staff_id'' IS DISTINCT FROM p_actor::text THEN RAISE EXCEPTION ''photo_readback_attribution'' USING ERRCODE=''42501'';END IF;
 END IF;
 IF m IS NULL THEN RETURN jsonb_build_object(''outcome'',''absent'');END IF;
 IF m->>''status''<>''uploaded'' OR m->>''upload_lease_expires_at'' IS NOT NULL THEN
  IF EXISTS(SELECT 1 FROM deletion_upload_private.attempts WHERE owner_id=p_owner AND kind=p_kind
    AND entity_id=CASE p_kind WHEN ''product'' THEN p_entity ELSE (m->>''id'')::uuid END AND state<>''settled'')
   THEN RETURN jsonb_build_object(''outcome'',''pending'');END IF;
  RETURN jsonb_build_object(''outcome'',''absent'');
 END IF;
 IF p_kind=''product'' AND (m->>''id'' IS DISTINCT FROM p_spec->>''photoId'' OR m->>''version'' IS DISTINCT FROM p_spec->>''version'') THEN
  IF (p_spec->>''version'')::bigint>(m->>''version'')::bigint THEN RETURN jsonb_build_object(''outcome'',''absent'');END IF;
  RETURN jsonb_build_object(''outcome'',''conflict'');
 END IF;
 IF p_kind=''sale'' AND (m->>''expires_at'' IS NULL OR (m->>''expires_at'')::timestamptz<=clock_timestamp()) THEN RETURN jsonb_build_object(''outcome'',''conflict'');END IF;
 photo_keys:=CASE p_kind WHEN ''product'' THEN ARRAY[m->>''display_object_key'',m->>''thumbnail_object_key''] ELSE ARRAY[m->>''r2_object_key'',m->>''r2_thumbnail_key''] END;
 IF m->>''width'' IS DISTINCT FROM p_spec->>''width'' OR m->>''height'' IS DISTINCT FROM p_spec->>''height''
  OR EXISTS(SELECT 1 FROM unnest(photo_keys)k WHERE NOT deletion_upload_private.key_owned(k,p_owner))
  THEN RETURN jsonb_build_object(''outcome'',''conflict'');END IF;
 IF p_kind=''product'' AND (m->>''display_content_hash'' IS DISTINCT FROM p_spec->>''imageHash'' OR m->>''thumbnail_content_hash'' IS DISTINCT FROM p_spec->>''thumbnailHash''
  OR m->>''display_mime_type'' IS DISTINCT FROM p_spec->>''imageMime'' OR m->>''thumbnail_mime_type'' IS DISTINCT FROM p_spec->>''thumbnailMime''
  OR m->>''display_size_bytes'' IS DISTINCT FROM p_spec->>''imageBytes'' OR m->>''thumbnail_size_bytes'' IS DISTINCT FROM p_spec->>''thumbnailBytes'')
  THEN RETURN jsonb_build_object(''outcome'',''conflict'');END IF;
 SELECT a.id INTO candidate FROM deletion_upload_private.attempts a
 WHERE a.owner_id=p_owner AND a.kind=p_kind AND a.entity_id=CASE p_kind WHEN ''product'' THEN p_entity ELSE (m->>''id'')::uuid END
  AND photo_keys<@a.write_keys AND cardinality(a.issued_keys)=2
  AND EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=a.id AND p.object_key=photo_keys[1] AND p.body_hash=p_spec->>''imageHash'' AND p.receipt IS NOT NULL AND p.target_hash=(SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot))
  AND EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=a.id AND p.object_key=photo_keys[2] AND p.body_hash=p_spec->>''thumbnailHash'' AND p.receipt IS NOT NULL AND p.target_hash=(SELECT target_hash FROM deletion_upload_private.transport_target WHERE slot))
 ORDER BY a.created_at DESC LIMIT 1 FOR UPDATE;
 IF candidate IS NULL THEN RETURN jsonb_build_object(''outcome'',''conflict'');END IF;
 h:=encode(extensions.digest(jsonb_build_array(m,p_spec,candidate,deletion_upload_private.terminal_proof(candidate,''readback''))::text,''sha256''),''hex'');
 IF p_source IS NOT NULL THEN
  IF p_source<>h THEN RAISE EXCEPTION ''photo_readback_changed'' USING ERRCODE=''40001'';END IF;
  INSERT INTO deletion_upload_private.readbacks(attempt_id,source_hash) VALUES(candidate,h) ON CONFLICT DO NOTHING;
  UPDATE deletion_upload_private.attempts SET state=''settled'' WHERE id=candidate;
 END IF;
 RETURN jsonb_build_object(''outcome'',''confirmed'',''sourceHash'',h,''keys'',to_jsonb(photo_keys),''evidenceId'',m->>''id'');
END$$;
REVOKE ALL ON FUNCTION public.bff_read_recorded_photo_upload(uuid,uuid,text,uuid,jsonb,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_read_recorded_photo_upload(uuid,uuid,text,uuid,jsonb,text) TO service_role;
CREATE FUNCTION public.bff_account_deletion_upload_reviews(p_request uuid,p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$DECLARE r public.account_deletion_requests%ROWTYPE;items jsonb;legacy_n integer;BEGIN
 SELECT * INTO r FROM public.account_deletion_requests WHERE id=p_request FOR UPDATE;
 IF NOT FOUND OR r.status<>''processing'' OR r.active_actor_id IS NULL OR r.lease_expires_at IS NULL OR r.lease_expires_at<=clock_timestamp()
  OR r.lease_token_hash IS DISTINCT FROM encode(extensions.digest(p_token,''sha256''),''hex'')
  OR NOT EXISTS(SELECT 1 FROM deletion_engine_private.frozen WHERE request_id=p_request AND actor_hash=encode(extensions.digest(r.active_actor_id::text,''sha256''),''hex''))
  THEN RAISE EXCEPTION ''upload_review_queue_scope'' USING ERRCODE=''55000'';END IF;
 PERFORM deletion_engine_private.lock_upload_actor(r.active_actor_id);
 IF r.lease_expires_at<=clock_timestamp() THEN RAISE EXCEPTION ''upload_review_lease_expired'' USING ERRCODE=''55000'';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(''attemptId'',a.id,''kind'',a.kind,''state'',a.state,''keyCount'',cardinality(a.keys),
  ''reason'',CASE WHEN a.kind IS NULL THEN ''unbound_claim'' WHEN EXISTS(SELECT 1 FROM unnest(a.issued_keys)k WHERE NOT EXISTS(SELECT 1 FROM deletion_upload_private.puts p WHERE p.attempt_id=a.id AND p.object_key=k AND p.receipt IS NOT NULL)) THEN ''provider_outcome_unknown''
   WHEN a.deadline<=clock_timestamp() AND a.state=''open'' THEN ''expired_open'' ELSE ''needs_evidence_review'' END) ORDER BY a.created_at),''[]'') INTO items
  FROM (SELECT * FROM deletion_upload_private.attempts WHERE (actor_id=r.active_actor_id OR owner_id=r.active_actor_id) AND state<>''settled'' ORDER BY created_at,id LIMIT 100)a;
 SELECT count(*) INTO legacy_n FROM (
  SELECT ''product'' k,to_jsonb(p) j FROM public.product_cover_photos p WHERE upload_lease_expires_at IS NOT NULL OR status=''uploading''
  UNION ALL SELECT ''sale'',to_jsonb(p) FROM public.sale_photo_evidence p WHERE upload_lease_expires_at IS NOT NULL OR status=''uploading'')x
  WHERE NOT EXISTS(SELECT 1 FROM deletion_upload_private.attempts a WHERE a.kind=x.k AND a.claim_hash=deletion_upload_private.claim_hash(x.k,x.j));
 RETURN jsonb_build_object(''items'',items,''limit'',100,''truncated'',jsonb_array_length(items)=100,''unattributedLegacyClaimCount'',legacy_n,''canAutoRelease'',false,
  ''sourceHash'',encode(extensions.digest(jsonb_build_array(p_request,items,legacy_n)::text,''sha256''),''hex''));
END$$;
REVOKE ALL ON FUNCTION public.bff_account_deletion_upload_reviews(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.bff_account_deletion_upload_reviews(uuid,text) TO service_role;
DO $$BEGIN IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname=''public'' AND NOT (p.proname||''(''||oidvectortypes(p.proargtypes)||'')''=ANY(ARRAY[''accept_invitation_and_bind(text, uuid)'',''accept_staff_email_invitation(uuid)'',''apply_journal_checklist(uuid, uuid, integer, uuid, jsonb)'',''apply_preparation_template(uuid, uuid, uuid, integer, uuid[])'',''apply_venue_region_change(uuid, jsonb, text)'',''audit_account_deletion_request_transition()'',''auto_add_staff_to_new_market()'',''backfill_market_regions(uuid, jsonb)'',''bff_claim_account_deletion_lease(uuid, text, timestamp with time zone, integer)'',''bff_claim_sale_photo_evidence_upload(uuid, uuid, uuid, uuid, uuid, uuid, timestamp with time zone)'',''bff_create_account_deletion_request(uuid, text, text, text, text)'',''bff_finalize_account_deletion(uuid, text)'',''bff_finalize_sale_photo_evidence_delete(uuid, uuid, text, text)'',''bff_finalize_sale_photo_evidence_expiration(uuid, text, text)'',''bff_finalize_sale_photo_evidence_upload(uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, integer, integer, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone)'',''bff_list_expired_sale_photo_evidence(integer)'',''bff_mark_sale_photo_evidence_upload_failed(uuid, uuid, uuid, uuid, uuid, uuid, text)'',''bff_prepare_sale_photo_evidence_delete(uuid, uuid)'',''bff_read_account_deletion_request(uuid)'',''bff_record_account_deletion_step(uuid, text, text, text, integer, text, text)'',''bff_release_account_deletion_lease(uuid, text)'',''can_current_staff_read_relationship(uuid, text)'',''can_manage_preparation_templates(uuid)'',''can_manage_recurring_operations()'',''check_subscription_read_for_actor(uuid, uuid, text)'',''check_subscription_write_access(uuid, text)'',''check_subscription_write_for_actor(uuid, uuid, text)'',''check_user_market_permission(uuid, text)'',''claim_product_cover_photo_upload(uuid, uuid, uuid, bigint, integer, bigint)'',''claim_product_cover_photo_upload(uuid, uuid, uuid, bigint, integer, bigint, boolean)'',''cleanup_expired_invitations()'',''cleanup_old_snapshots(uuid)'',''create_staff_invitation()'',''current_user_market_ids()'',''current_user_owned_market_ids()'',''deal_projection_delta(uuid, uuid, text, jsonb)'',''deal_projection_number(jsonb[])'',''deal_projection_totals(jsonb)'',''decline_staff_email_invitation(uuid)'',''delete_current_user_app_data()'',''delete_product_cover_photo(uuid, uuid)'',''delete_revoked_staff_relationship(uuid)'',''delete_staff_invitation(uuid)'',''drain_checklist_toggle_pending_operation(text)'',''enforce_account_deletion_request_transition()'',''enforce_billing_event_inbox_write()'',''enforce_billing_reconciliation_run_write()'',''enforce_billing_storefront_mapping_update()'',''enforce_billing_subscription_snapshot_write()'',''enforce_billing_transaction_write()'',''enforce_event_actor_authorization()'',''enforce_subscription_event_write()'',''enforce_subscription_market_summary()'',''enforce_subscription_price_assignment_write()'',''enforce_subscription_price_version_update()'',''enforce_subscription_row_write()'',''enqueue_checklist_toggle_pending_operation(text, uuid, text, boolean, text)'',''finalize_product_cover_photo_upload(uuid, uuid, uuid, bigint, text, text, text, text, text, text, integer, integer, integer, integer)'',''finalize_product_cover_photo_upload(uuid, uuid, uuid, bigint, text, text, text, text, text, text, integer, integer, integer, integer, boolean)'',''financial_review_day(jsonb, timestamp with time zone)'',''financial_review_number(jsonb)'',''financial_review_source(uuid)'',''generate_invite_code(uuid)'',''get_latest_snapshot(uuid)'',''get_market_members(uuid)'',''get_my_owners()'',''get_my_staff()'',''guard_cash_schedule_snapshot()'',''guard_journal_schedule_snapshot()'',''guard_market_payment_deadline_change()'',''guard_market_region_change()'',''guard_recurring_operations_event()'',''guard_staff_role_permission_consistency()'',''handle_new_user()'',''has_authoritative_team_entitlement(uuid)'',''invite_staff_member(text)'',''is_sale_photo_evidence_sale_event(uuid, uuid, uuid)'',''is_staff_of(uuid)'',''join_market_by_code(text)'',''leave_current_staff_team(uuid)'',''list_owner_pending_operation_diagnostics(uuid)'',''mark_product_cover_photo_upload_failed(uuid, uuid, uuid, text)'',''market_cash_point_cents(jsonb)'',''market_payment_deadline_is_valid(jsonb)'',''market_region_code_is_valid(text)'',''prevent_account_deletion_audit_mutation()'',''prevent_f3b_billing_ledger_delete()'',''preview_venue_region_change(uuid)'',''product_cover_photo_write_allowed(uuid, uuid)'',''project_market_payment_deadline_event()'',''project_market_region_event()'',''project_recurring_operations_event()'',''read_market_cash_sales(uuid)'',''read_market_financial_reviews(uuid[])'',''read_subscription_account_for_actor(uuid, uuid)'',''read_subscription_data_scope()'',''read_subscription_test_switch(uuid)'',''recover_stale_processing_pending_operation(text)'',''reject_billing_customer_link_mutation()'',''remove_team_member(uuid, uuid)'',''restore_staff_relationship(uuid)'',''revoke_staff_member(uuid)'',''revoke_staff_relationship(uuid)'',''sanitize_staff_event_payload(jsonb)'',''save_market_cash_record(uuid, date, jsonb, integer, uuid)'',''save_market_cash_record_v2(uuid, date, jsonb, integer, uuid)'',''save_market_financial_review(uuid, text, text, numeric, jsonb, text, integer, uuid)'',''save_market_journal(uuid, uuid, date, text, integer, uuid, boolean)'',''save_preparation_template(uuid, uuid, text, jsonb, integer, uuid, boolean)'',''set_subscription_test_switch(uuid, text, boolean)'',''staff_team_access_from_source_rows(jsonb, jsonb, timestamp with time zone)'',''subscription_effective_plan(uuid)'',''subscription_foundation_event(text)'',''subscription_free_payload(jsonb)'',''subscription_mask_json(jsonb, text[])'',''subscription_read_guard_active(uuid)'',''subscription_read_owner_advanced(uuid)'',''subscription_read_owner_paid(uuid)'',''subscription_read_paid(uuid)'',''subscription_read_staff(uuid)'',''subscription_require_tier(uuid, integer)'',''subscription_staff_payload(jsonb)'',''subscription_write_guard_active(uuid)'',''suspend_owner_staff_for_plan(uuid)'',''sync_team_plan_staff_suspension()'',''touch_subscription_accounts_updated_at()'',''update_market_operation_session_read_model()'',''update_market_read_model()'',''update_product_read_model()'',''update_staff_permissions(uuid, jsonb)'',''update_staff_relationships_timestamp()'',''update_staff_role(uuid, text)'',''update_updated_at_column()'',''verify_invitation_token(text)'',''bff_confirm_account_deletion_request(uuid, uuid, text)'',''bff_cancel_account_deletion_request(uuid, uuid, text)'',''bff_account_deletion_engine(uuid, text, text, text, text, text)'',''bff_clear_billing_reference(uuid, text, text, uuid, text, text, text, text)'',''bff_prepare_billing_detachment(uuid, text, timestamp with time zone, text, text)'',''bff_stage_billing_detachment(uuid, text, text, jsonb)'',''bff_review_detached_billing(uuid, integer, uuid, timestamp with time zone, text)'',''bff_purge_detached_billing(uuid, integer, uuid)'',''bff_check_retired_billing_binding(text, text, text, text)'',''bff_begin_deletion_upload(uuid, uuid, uuid, uuid)'',''bff_bind_deletion_upload(uuid, uuid, text, uuid, text[], text[], jsonb)'',''bff_authorize_deletion_upload(uuid, uuid, text)'',''bff_finish_deletion_upload(uuid, uuid, text)'',''bff_reconcile_deletion_upload(uuid, text, uuid, text, jsonb)'',''bff_record_deletion_upload_put(uuid, uuid, text, text, jsonb)'',''bff_get_deletion_upload_drain(uuid, text, uuid, text, text)'',''bff_read_recorded_photo_upload(uuid, uuid, text, uuid, jsonb, text)'',''bff_account_deletion_upload_reviews(uuid, text)''])) )
  THEN RAISE EXCEPTION ''Unreviewed public routine'';END IF;END$$;
 CREATE FUNCTION deletion_engine_private.access_catalog() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='''' AS $cat$
 SELECT jsonb_build_object(''routines'',(SELECT jsonb_agg(jsonb_build_array(p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)),p.proacl) ORDER BY p.oid)
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=''public''),
  ''relations'',(SELECT jsonb_agg(jsonb_build_array(c.oid::regclass::text,c.relkind,c.reloptions,c.relacl,c.relrowsecurity,c.relforcerowsecurity,
    CASE WHEN c.relkind IN(''v'',''m'') THEN pg_get_viewdef(c.oid,true) END) ORDER BY c.oid)
   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=''public'' AND c.relkind IN(''r'',''p'',''v'',''m'',''f'')),
  ''triggers'',(SELECT jsonb_agg(jsonb_build_array(pg_get_triggerdef(t.oid,true),t.tgenabled) ORDER BY t.oid) FROM pg_trigger t
   JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=''public'' AND NOT t.tgisinternal),
  ''policies'',(SELECT jsonb_agg(jsonb_build_array(p.polrelid::regclass::text,p.polname,p.polpermissive,p.polcmd,p.polroles,
    pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.oid)
   FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=''public''));
 $cat$;
 CREATE TABLE deletion_engine_private.approved_access AS SELECT deletion_engine_private.access_catalog() AS contract;
 ALTER FUNCTION deletion_engine_private.assert_catalog() RENAME TO assert_table_catalog;
 CREATE FUNCTION deletion_engine_private.assert_catalog() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='''' AS $$BEGIN
  PERFORM deletion_engine_private.assert_table_catalog();
  IF (SELECT contract FROM deletion_engine_private.approved_access) IS DISTINCT FROM deletion_engine_private.access_catalog()
  THEN RAISE EXCEPTION USING ERRCODE=''55000'',MESSAGE=''engine_unreviewed_access_catalog'';END IF;
 END$$;
 REVOKE ALL ON FUNCTION deletion_engine_private.access_catalog(),deletion_engine_private.assert_catalog(),deletion_engine_private.assert_table_catalog()
  FROM PUBLIC,anon,authenticated,service_role;
 REVOKE ALL ON deletion_engine_private.approved_access FROM PUBLIC,anon,authenticated,service_role;
SELECT deletion_engine_private.assert_catalog();';
BEGIN
 IF session_user<>'postgres' THEN RAISE EXCEPTION 'deletion_migration_dba_required';END IF;
 IF current_setting('deletion.install_project_ref',true)IS DISTINCT FROM 'fgejncfsvvsayiequubm'
  OR current_setting('deletion.install_payload_sha',true)IS DISTINCT FROM 'c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e'
  THEN RAISE EXCEPTION 'deletion_migration_target_ack_required';END IF;
 IF current_setting('deletion.install_environment',true)='isolated' THEN
  IF current_database()<>'deletion_engine_test'THEN RAISE EXCEPTION 'deletion_migration_isolated_database';END IF;
 ELSIF current_setting('deletion.install_environment',true)='managed' THEN
  IF current_setting('app.settings.project_ref',true)IS DISTINCT FROM 'fgejncfsvvsayiequubm'
   OR current_setting('deletion.install_review_sha',true)IS DISTINCT FROM 'c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e'
   THEN RAISE EXCEPTION 'deletion_migration_managed_target_unverified';END IF;
 ELSE RAISE EXCEPTION 'deletion_migration_environment_required';END IF;
 IF to_regclass('deletion_release_private.installation')IS NOT NULL THEN
  EXECUTE 'SELECT * FROM deletion_release_private.installation WHERE version=$1'INTO installed USING '096-account-deletion-candidate-v1';
  IF installed IS NULL OR installed.project_ref IS DISTINCT FROM 'fgejncfsvvsayiequubm' OR installed.payload_sha IS DISTINCT FROM 'c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e'
   THEN RAISE EXCEPTION 'deletion_migration_version_conflict';END IF;
  SELECT (SELECT md5(jsonb_build_object(
   'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relowner::regrole::text,c.relacl,c.reloptions,c.relrowsecurity,c.relforcerowsecurity,
     CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END,
     (SELECT jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated)ORDER BY a.attnum)
       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
     (SELECT jsonb_agg(jsonb_build_array(x.conname,pg_get_constraintdef(x.oid,true),x.convalidated)ORDER BY x.conname)FROM pg_constraint x WHERE x.conrelid=c.oid),
     (SELECT jsonb_agg(pg_get_indexdef(x.indexrelid)ORDER BY x.indexrelid)FROM pg_index x WHERE x.indrelid=c.oid))ORDER BY n.nspname,c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND c.relkind IN('r','p','v','m','f','S')),
   'routines',(SELECT jsonb_agg(jsonb_build_array(n.nspname,p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)),p.proowner::regrole::text,p.proacl)ORDER BY n.nspname,p.oid::regprocedure::text)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND p.prokind IN('f','p')),
   'triggers',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid,true),t.tgenabled)ORDER BY n.nspname,c.relname,t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND(n.nspname='public' OR n.nspname LIKE 'deletion_%')),
   'policies',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,p.polname,p.polpermissive,p.polcmd,p.polroles,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY n.nspname,c.relname,p.polname)
     FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' OR n.nspname LIKE 'deletion_%'),
   'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner::regrole::text,nspacl)ORDER BY nspname)FROM pg_namespace WHERE nspname='public' OR nspname LIKE 'deletion_%')
  )::text)) INTO schema_now;
  IF schema_now IS DISTINCT FROM installed.schema_hash THEN RAISE EXCEPTION 'deletion_migration_installed_drift';END IF;
  RETURN; -- Verified rerun is read-only; never overwrite an installed drift.
 END IF;
 IF encode(extensions.digest(payload,'sha256'),'hex')IS DISTINCT FROM 'c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e' THEN RAISE EXCEPTION 'deletion_migration_payload_changed';END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname LIKE 'deletion_%')THEN RAISE EXCEPTION 'deletion_migration_unreviewed_private_schema';END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'AND c.relkind IN('r','p','v','m','f'))<>45
   OR(SELECT count(*)FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'AND p.prokind IN('f','p'))<>134
   THEN RAISE EXCEPTION 'deletion_migration_baseline_surface';END IF;
  IF EXISTS(WITH expected(identity,d)AS(VALUES ('public.account_deletion_cleanup_steps','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"request_id","type":"uuid","nullable":false},{"name":"step_code","type":"text","nullable":false},{"name":"status","type":"text","nullable":false},{"name":"affected_count","type":"integer","nullable":false},{"name":"evidence_hash","type":"text","nullable":true},{"name":"safe_error_code","type":"text","nullable":true},{"name":"attempt_count","type":"integer","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false},{"name":"completed_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"account_deletion_cleanup_steps_affected_count_check","definition":"CHECK (affected_count >= 0 AND affected_count <= 2147483647)"},{"name":"account_deletion_cleanup_steps_attempt_count_check","definition":"CHECK (attempt_count >= 0 AND attempt_count <= 100)"},{"name":"account_deletion_cleanup_steps_pkey","definition":"PRIMARY KEY (request_id, step_code)"},{"name":"account_deletion_cleanup_steps_request_id_fkey","definition":"FOREIGN KEY (request_id) REFERENCES account_deletion_requests(id) ON DELETE RESTRICT"},{"name":"account_deletion_cleanup_steps_safe_error_code_check","definition":"CHECK (safe_error_code IS NULL OR safe_error_code ~ ''^[a-z0-9_]{1,64}$''::text)"},{"name":"account_deletion_cleanup_steps_status_check","definition":"CHECK (status = ANY (ARRAY[''pending''::text, ''processing''::text, ''failed_retryable''::text, ''manual_review''::text, ''completed''::text]))"},{"name":"account_deletion_cleanup_steps_step_code_check","definition":"CHECK (step_code = ANY (ARRAY[''access_frozen''::text, ''staff_access_revoked''::text, ''staff_attribution_anonymized''::text, ''object_manifest_built''::text, ''r2_objects_deleted''::text, ''r2_absence_verified''::text, ''billing_identity_detached''::text, ''operational_data_cleaned''::text, ''profile_deleted''::text, ''auth_user_deleted''::text, ''sessions_revoked''::text]))"},{"name":"account_deletion_step_evidence_check","definition":"CHECK (status = ''completed''::text AND completed_at IS NOT NULL AND evidence_hash ~ ''^[0-9a-f]{64}$''::text OR status <> ''completed''::text)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.account_deletion_requests','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"active_actor_id","type":"uuid","nullable":true},{"name":"subject_ref_hash","type":"text","nullable":false},{"name":"idempotency_hash","type":"text","nullable":false},{"name":"account_kind","type":"text","nullable":false},{"name":"status","type":"text","nullable":false},{"name":"preflight_resolution","type":"text","nullable":false},{"name":"policy_revision","type":"text","nullable":false},{"name":"safe_error_code","type":"text","nullable":true},{"name":"retry_count","type":"integer","nullable":false},{"name":"lease_token_hash","type":"text","nullable":true},{"name":"lease_expires_at","type":"timestamp with time zone","nullable":true},{"name":"requested_at","type":"timestamp with time zone","nullable":false},{"name":"identity_confirmed_at","type":"timestamp with time zone","nullable":true},{"name":"processing_started_at","type":"timestamp with time zone","nullable":true},{"name":"completed_at","type":"timestamp with time zone","nullable":true},{"name":"cancelled_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"audit_account_deletion_request_transition","definition":"CREATE TRIGGER audit_account_deletion_request_transition AFTER INSERT OR UPDATE OF status ON account_deletion_requests FOR EACH ROW EXECUTE FUNCTION audit_account_deletion_request_transition()"},{"name":"enforce_account_deletion_request_transition","definition":"CREATE TRIGGER enforce_account_deletion_request_transition BEFORE UPDATE ON account_deletion_requests FOR EACH ROW EXECUTE FUNCTION enforce_account_deletion_request_transition()"}],"constraints":[{"name":"account_deletion_lease_shape_check","definition":"CHECK (lease_token_hash IS NULL AND lease_expires_at IS NULL OR lease_token_hash ~ ''^[0-9a-f]{64}$''::text AND lease_expires_at IS NOT NULL AND (status = ANY (ARRAY[''processing''::text, ''failed_retryable''::text, ''manual_review''::text])))"},{"name":"account_deletion_no_terminal_lease_check","definition":"CHECK ((status <> ALL (ARRAY[''completed''::text, ''cancelled''::text])) OR lease_token_hash IS NULL AND lease_expires_at IS NULL)"},{"name":"account_deletion_requests_account_kind_check","definition":"CHECK (account_kind = ANY (ARRAY[''owner''::text, ''staff''::text]))"},{"name":"account_deletion_requests_idempotency_hash_check","definition":"CHECK (idempotency_hash ~ ''^[0-9a-f]{64}$''::text)"},{"name":"account_deletion_requests_idempotency_hash_key","definition":"UNIQUE (idempotency_hash)"},{"name":"account_deletion_requests_pkey","definition":"PRIMARY KEY (id)"},{"name":"account_deletion_requests_policy_revision_check","definition":"CHECK (policy_revision = ''2026-08-17''::text)"},{"name":"account_deletion_requests_preflight_resolution_check","definition":"CHECK (preflight_resolution = ANY (ARRAY[''clean''::text, ''sync_confirmed''::text, ''export_confirmed''::text, ''discard_confirmed''::text]))"},{"name":"account_deletion_requests_retry_count_check","definition":"CHECK (retry_count >= 0 AND retry_count <= 100)"},{"name":"account_deletion_requests_safe_error_code_check","definition":"CHECK (safe_error_code IS NULL OR safe_error_code ~ ''^[a-z0-9_]{1,64}$''::text)"},{"name":"account_deletion_requests_status_check","definition":"CHECK (status = ANY (ARRAY[''requested''::text, ''identity_confirmed''::text, ''processing''::text, ''failed_retryable''::text, ''manual_review''::text, ''cancelled''::text, ''completed''::text]))"},{"name":"account_deletion_requests_subject_ref_hash_check","definition":"CHECK (subject_ref_hash ~ ''^[0-9a-f]{64}$''::text)"},{"name":"account_deletion_terminal_shape_check","definition":"CHECK (status = ''completed''::text AND completed_at IS NOT NULL AND active_actor_id IS NULL OR status = ''cancelled''::text AND cancelled_at IS NOT NULL OR (status <> ALL (ARRAY[''completed''::text, ''cancelled''::text])))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.account_deletion_transition_audit','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"bigint","nullable":false},{"name":"request_id","type":"uuid","nullable":false},{"name":"from_status","type":"text","nullable":true},{"name":"to_status","type":"text","nullable":false},{"name":"reason_code","type":"text","nullable":false},{"name":"evidence_hash","type":"text","nullable":false},{"name":"occurred_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"prevent_account_deletion_audit_mutation","definition":"CREATE TRIGGER prevent_account_deletion_audit_mutation BEFORE DELETE OR UPDATE ON account_deletion_transition_audit FOR EACH ROW EXECUTE FUNCTION prevent_account_deletion_audit_mutation()"}],"constraints":[{"name":"account_deletion_transition_audit_evidence_hash_check","definition":"CHECK (evidence_hash ~ ''^[0-9a-f]{64}$''::text)"},{"name":"account_deletion_transition_audit_pkey","definition":"PRIMARY KEY (id)"},{"name":"account_deletion_transition_audit_reason_code_check","definition":"CHECK (reason_code ~ ''^[a-z0-9_]{1,64}$''::text)"},{"name":"account_deletion_transition_audit_request_id_fkey","definition":"FOREIGN KEY (request_id) REFERENCES account_deletion_requests(id) ON DELETE RESTRICT"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.account_entitlements','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"owner_id","type":"uuid","nullable":false},{"name":"product_cover_photo_enabled","type":"boolean","nullable":false},{"name":"source","type":"text","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[{"name":"account_entitlements_owner_read","check":null,"roles":["authenticated"],"using":"(owner_id = auth.uid())","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"account_entitlements_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"account_entitlements_pkey","definition":"PRIMARY KEY (owner_id)"},{"name":"account_entitlements_source_check","definition":"CHECK (source = ANY (ARRAY[''free''::text, ''admin''::text, ''billing''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.billing_customer_links','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"billing_origin","type":"text","nullable":false},{"name":"provider_environment","type":"text","nullable":false},{"name":"provider_customer_ref","type":"text","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"reject_billing_customer_link_mutation","definition":"CREATE TRIGGER reject_billing_customer_link_mutation BEFORE DELETE OR UPDATE ON billing_customer_links FOR EACH ROW EXECUTE FUNCTION reject_billing_customer_link_mutation()"}],"constraints":[{"name":"billing_customer_links_environment_check","definition":"CHECK (provider_environment = ANY (ARRAY[''sandbox''::text, ''production''::text]))"},{"name":"billing_customer_links_origin_check","definition":"CHECK (billing_origin = ANY (ARRAY[''newebpay_web''::text, ''ecpay_web''::text, ''apple_app_store''::text, ''google_play''::text]))"},{"name":"billing_customer_links_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT"},{"name":"billing_customer_links_owner_origin_environment_key","definition":"UNIQUE (owner_id, billing_origin, provider_environment)"},{"name":"billing_customer_links_pkey","definition":"PRIMARY KEY (id)"},{"name":"billing_customer_links_provider_identity_key","definition":"UNIQUE (billing_origin, provider_environment, provider_customer_ref)"},{"name":"billing_customer_links_provider_ref_check","definition":"CHECK (length(btrim(provider_customer_ref)) >= 1 AND length(btrim(provider_customer_ref)) <= 512 AND provider_customer_ref = btrim(provider_customer_ref))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.billing_event_inbox','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"billing_origin","type":"text","nullable":false},{"name":"provider_environment","type":"text","nullable":false},{"name":"provider_event_ref","type":"text","nullable":false},{"name":"payload_hash","type":"text","nullable":false},{"name":"verification_status","type":"text","nullable":false},{"name":"event_kind","type":"text","nullable":false},{"name":"provider_occurred_at","type":"timestamp with time zone","nullable":true},{"name":"received_at","type":"timestamp with time zone","nullable":false},{"name":"processing_status","type":"text","nullable":false},{"name":"attempt_count","type":"integer","nullable":false},{"name":"next_attempt_at","type":"timestamp with time zone","nullable":true},{"name":"last_safe_error_code","type":"text","nullable":true},{"name":"processed_at","type":"timestamp with time zone","nullable":true},{"name":"raw_payload_ciphertext_ref","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"enforce_billing_event_inbox_write","definition":"CREATE TRIGGER enforce_billing_event_inbox_write BEFORE INSERT OR UPDATE ON billing_event_inbox FOR EACH ROW EXECUTE FUNCTION enforce_billing_event_inbox_write()"},{"name":"prevent_billing_event_inbox_delete","definition":"CREATE TRIGGER prevent_billing_event_inbox_delete BEFORE DELETE ON billing_event_inbox FOR EACH ROW EXECUTE FUNCTION prevent_f3b_billing_ledger_delete()"}],"constraints":[{"name":"billing_event_inbox_attempt_check","definition":"CHECK (attempt_count >= 0 AND attempt_count <= 1000)"},{"name":"billing_event_inbox_environment_check","definition":"CHECK (provider_environment = ANY (ARRAY[''sandbox''::text, ''production''::text]))"},{"name":"billing_event_inbox_error_code_check","definition":"CHECK (last_safe_error_code IS NULL OR length(last_safe_error_code) >= 1 AND length(last_safe_error_code) <= 80 AND last_safe_error_code ~ ''^[a-z0-9]+(_[a-z0-9]+)*$''::text)"},{"name":"billing_event_inbox_event_kind_check","definition":"CHECK (length(event_kind) >= 1 AND length(event_kind) <= 80 AND event_kind ~ ''^[a-z0-9]+(_[a-z0-9]+)*$''::text)"},{"name":"billing_event_inbox_origin_check","definition":"CHECK (billing_origin = ANY (ARRAY[''newebpay_web''::text, ''ecpay_web''::text, ''apple_app_store''::text, ''google_play''::text]))"},{"name":"billing_event_inbox_payload_hash_check","definition":"CHECK (payload_hash ~ ''^[0-9a-f]{64}$''::text)"},{"name":"billing_event_inbox_payload_ref_check","definition":"CHECK (raw_payload_ciphertext_ref IS NULL OR length(btrim(raw_payload_ciphertext_ref)) >= 1 AND length(btrim(raw_payload_ciphertext_ref)) <= 1000 AND raw_payload_ciphertext_ref = btrim(raw_payload_ciphertext_ref))"},{"name":"billing_event_inbox_pkey","definition":"PRIMARY KEY (id)"},{"name":"billing_event_inbox_processing_check","definition":"CHECK (processing_status = ANY (ARRAY[''pending''::text, ''processing''::text, ''retryable_failed''::text, ''processed''::text, ''ignored''::text, ''terminal_failed''::text]))"},{"name":"billing_event_inbox_processing_shape_check","definition":"CHECK (processing_status = ''pending''::text AND attempt_count = 0 AND next_attempt_at IS NULL AND last_safe_error_code IS NULL AND processed_at IS NULL OR processing_status = ''processing''::text AND attempt_count > 0 AND next_attempt_at IS NULL AND last_safe_error_code IS NULL AND processed_at IS NULL OR processing_status = ''retryable_failed''::text AND attempt_count > 0 AND next_attempt_at IS NOT NULL AND last_safe_error_code IS NOT NULL AND processed_at IS NULL OR processing_status = ''processed''::text AND attempt_count > 0 AND next_attempt_at IS NULL AND last_safe_error_code IS NULL AND processed_at IS NOT NULL OR processing_status = ''ignored''::text AND next_attempt_at IS NULL AND processed_at IS NOT NULL OR processing_status = ''terminal_failed''::text AND next_attempt_at IS NULL AND last_safe_error_code IS NOT NULL AND processed_at IS NOT NULL)"},{"name":"billing_event_inbox_provider_event_key","definition":"UNIQUE (billing_origin, provider_environment, provider_event_ref)"},{"name":"billing_event_inbox_provider_ref_check","definition":"CHECK (length(btrim(provider_event_ref)) >= 1 AND length(btrim(provider_event_ref)) <= 512 AND provider_event_ref = btrim(provider_event_ref))"},{"name":"billing_event_inbox_time_check","definition":"CHECK ((provider_occurred_at IS NULL OR received_at >= provider_occurred_at) AND (processed_at IS NULL OR processed_at >= received_at) AND (next_attempt_at IS NULL OR next_attempt_at >= received_at))"},{"name":"billing_event_inbox_verification_check","definition":"CHECK (verification_status = ANY (ARRAY[''pending''::text, ''verified''::text, ''rejected''::text]))"},{"name":"billing_event_inbox_verification_shape_check","definition":"CHECK (verification_status = ''pending''::text AND processing_status = ''pending''::text OR verification_status = ''verified''::text OR verification_status = ''rejected''::text AND (processing_status = ANY (ARRAY[''ignored''::text, ''terminal_failed''::text])))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.billing_reconciliation_runs','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"billing_origin","type":"text","nullable":false},{"name":"provider_environment","type":"text","nullable":false},{"name":"trigger_kind","type":"text","nullable":false},{"name":"trigger_event_inbox_id","type":"uuid","nullable":true},{"name":"provider_snapshot_ref","type":"text","nullable":true},{"name":"provider_observed_at","type":"timestamp with time zone","nullable":true},{"name":"status","type":"text","nullable":false},{"name":"before_projection_hash","type":"text","nullable":true},{"name":"after_projection_hash","type":"text","nullable":true},{"name":"decision_code","type":"text","nullable":true},{"name":"safe_error_code","type":"text","nullable":true},{"name":"started_at","type":"timestamp with time zone","nullable":false},{"name":"completed_at","type":"timestamp with time zone","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"enforce_billing_reconciliation_run_write","definition":"CREATE TRIGGER enforce_billing_reconciliation_run_write BEFORE INSERT OR UPDATE ON billing_reconciliation_runs FOR EACH ROW EXECUTE FUNCTION enforce_billing_reconciliation_run_write()"},{"name":"prevent_billing_reconciliation_run_delete","definition":"CREATE TRIGGER prevent_billing_reconciliation_run_delete BEFORE DELETE ON billing_reconciliation_runs FOR EACH ROW EXECUTE FUNCTION prevent_f3b_billing_ledger_delete()"}],"constraints":[{"name":"billing_reconciliation_runs_code_check","definition":"CHECK ((decision_code IS NULL OR length(decision_code) >= 1 AND length(decision_code) <= 80 AND decision_code ~ ''^[a-z0-9]+(_[a-z0-9]+)*$''::text) AND (safe_error_code IS NULL OR length(safe_error_code) >= 1 AND length(safe_error_code) <= 80 AND safe_error_code ~ ''^[a-z0-9]+(_[a-z0-9]+)*$''::text))"},{"name":"billing_reconciliation_runs_environment_check","definition":"CHECK (provider_environment = ANY (ARRAY[''sandbox''::text, ''production''::text]))"},{"name":"billing_reconciliation_runs_hash_check","definition":"CHECK ((before_projection_hash IS NULL OR before_projection_hash ~ ''^[0-9a-f]{64}$''::text) AND (after_projection_hash IS NULL OR after_projection_hash ~ ''^[0-9a-f]{64}$''::text))"},{"name":"billing_reconciliation_runs_origin_check","definition":"CHECK (billing_origin = ANY (ARRAY[''newebpay_web''::text, ''ecpay_web''::text, ''apple_app_store''::text, ''google_play''::text]))"},{"name":"billing_reconciliation_runs_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT"},{"name":"billing_reconciliation_runs_pkey","definition":"PRIMARY KEY (id)"},{"name":"billing_reconciliation_runs_reference_check","definition":"CHECK (provider_snapshot_ref IS NULL OR length(btrim(provider_snapshot_ref)) >= 1 AND length(btrim(provider_snapshot_ref)) <= 1000 AND provider_snapshot_ref = btrim(provider_snapshot_ref))"},{"name":"billing_reconciliation_runs_status_check","definition":"CHECK (status = ANY (ARRAY[''running''::text, ''succeeded''::text, ''no_change''::text, ''failed''::text]))"},{"name":"billing_reconciliation_runs_status_shape_check","definition":"CHECK (status = ''running''::text AND completed_at IS NULL AND decision_code IS NULL AND safe_error_code IS NULL AND after_projection_hash IS NULL OR status = ''succeeded''::text AND completed_at IS NOT NULL AND provider_snapshot_ref IS NOT NULL AND provider_observed_at IS NOT NULL AND before_projection_hash IS NOT NULL AND after_projection_hash IS NOT NULL AND decision_code IS NOT NULL AND safe_error_code IS NULL OR status = ''no_change''::text AND completed_at IS NOT NULL AND provider_snapshot_ref IS NOT NULL AND provider_observed_at IS NOT NULL AND before_projection_hash IS NOT NULL AND after_projection_hash = before_projection_hash AND decision_code IS NOT NULL AND safe_error_code IS NULL OR status = ''failed''::text AND completed_at IS NOT NULL AND decision_code IS NULL AND safe_error_code IS NOT NULL AND after_projection_hash IS NULL)"},{"name":"billing_reconciliation_runs_time_check","definition":"CHECK (completed_at IS NULL OR completed_at >= started_at)"},{"name":"billing_reconciliation_runs_trigger_check","definition":"CHECK (trigger_kind = ANY (ARRAY[''event''::text, ''scheduled''::text, ''support''::text, ''recovery''::text]))"},{"name":"billing_reconciliation_runs_trigger_event_inbox_id_fkey","definition":"FOREIGN KEY (trigger_event_inbox_id) REFERENCES billing_event_inbox(id) ON DELETE RESTRICT"},{"name":"billing_reconciliation_runs_trigger_shape_check","definition":"CHECK (trigger_kind = ''event''::text AND trigger_event_inbox_id IS NOT NULL OR trigger_kind <> ''event''::text AND trigger_event_inbox_id IS NULL)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.billing_storefront_price_mappings','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"price_version_id","type":"text","nullable":false},{"name":"billing_origin","type":"text","nullable":false},{"name":"provider_environment","type":"text","nullable":false},{"name":"mapping_mode","type":"text","nullable":false},{"name":"provider_product_ref","type":"text","nullable":true},{"name":"provider_price_ref","type":"text","nullable":true},{"name":"mapping_status","type":"text","nullable":false},{"name":"verified_at","type":"timestamp with time zone","nullable":true},{"name":"evidence_reference","type":"text","nullable":true},{"name":"activated_at","type":"timestamp with time zone","nullable":true},{"name":"retired_at","type":"timestamp with time zone","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"enforce_billing_storefront_mapping_update","definition":"CREATE TRIGGER enforce_billing_storefront_mapping_update BEFORE INSERT OR UPDATE ON billing_storefront_price_mappings FOR EACH ROW EXECUTE FUNCTION enforce_billing_storefront_mapping_update()"}],"constraints":[{"name":"billing_storefront_mappings_environment_check","definition":"CHECK (provider_environment = ANY (ARRAY[''sandbox''::text, ''production''::text]))"},{"name":"billing_storefront_mappings_evidence_length_check","definition":"CHECK (evidence_reference IS NULL OR length(btrim(evidence_reference)) >= 1 AND length(btrim(evidence_reference)) <= 1000 AND evidence_reference = btrim(evidence_reference))"},{"name":"billing_storefront_mappings_mode_check","definition":"CHECK (mapping_mode = ANY (ARRAY[''server_amount''::text, ''provider_price_object''::text]))"},{"name":"billing_storefront_mappings_mode_shape_check","definition":"CHECK (mapping_mode = ''server_amount''::text AND provider_price_ref IS NULL OR mapping_mode = ''provider_price_object''::text AND provider_price_ref IS NOT NULL)"},{"name":"billing_storefront_mappings_origin_check","definition":"CHECK (billing_origin = ANY (ARRAY[''newebpay_web''::text, ''ecpay_web''::text, ''apple_app_store''::text, ''google_play''::text]))"},{"name":"billing_storefront_mappings_ref_length_check","definition":"CHECK ((provider_product_ref IS NULL OR length(btrim(provider_product_ref)) >= 1 AND length(btrim(provider_product_ref)) <= 512 AND provider_product_ref = btrim(provider_product_ref)) AND (provider_price_ref IS NULL OR length(btrim(provider_price_ref)) >= 1 AND length(btrim(provider_price_ref)) <= 512 AND provider_price_ref = btrim(provider_price_ref)))"},{"name":"billing_storefront_mappings_status_check","definition":"CHECK (mapping_status = ANY (ARRAY[''candidate''::text, ''active''::text, ''retired''::text]))"},{"name":"billing_storefront_mappings_status_shape_check","definition":"CHECK (mapping_status = ''candidate''::text AND activated_at IS NULL AND retired_at IS NULL OR mapping_status = ''active''::text AND verified_at IS NOT NULL AND evidence_reference IS NOT NULL AND activated_at IS NOT NULL AND retired_at IS NULL OR mapping_status = ''retired''::text AND retired_at IS NOT NULL AND (activated_at IS NULL OR retired_at >= activated_at))"},{"name":"billing_storefront_mappings_version_origin_environment_key","definition":"UNIQUE (price_version_id, billing_origin, provider_environment)"},{"name":"billing_storefront_price_mappings_pkey","definition":"PRIMARY KEY (id)"},{"name":"billing_storefront_price_mappings_price_version_id_fkey","definition":"FOREIGN KEY (price_version_id) REFERENCES subscription_price_versions(id) ON DELETE RESTRICT"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.billing_subscriptions','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"billing_customer_link_id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"billing_origin","type":"text","nullable":false},{"name":"provider_environment","type":"text","nullable":false},{"name":"provider_subscription_ref","type":"text","nullable":false},{"name":"provider_product_ref","type":"text","nullable":true},{"name":"provider_price_ref","type":"text","nullable":true},{"name":"normalized_plan_code","type":"text","nullable":false},{"name":"normalized_cadence","type":"text","nullable":false},{"name":"normalized_billing_status","type":"text","nullable":false},{"name":"cancel_at_period_end","type":"boolean","nullable":false},{"name":"current_period_starts_at","type":"timestamp with time zone","nullable":true},{"name":"current_period_ends_at","type":"timestamp with time zone","nullable":true},{"name":"provider_observed_at","type":"timestamp with time zone","nullable":false},{"name":"provider_sequence","type":"text","nullable":true},{"name":"snapshot_hash","type":"text","nullable":false},{"name":"last_reconciled_at","type":"timestamp with time zone","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"enforce_billing_subscription_snapshot_write","definition":"CREATE TRIGGER enforce_billing_subscription_snapshot_write BEFORE INSERT OR UPDATE ON billing_subscriptions FOR EACH ROW EXECUTE FUNCTION enforce_billing_subscription_snapshot_write()"},{"name":"prevent_billing_subscription_delete","definition":"CREATE TRIGGER prevent_billing_subscription_delete BEFORE DELETE ON billing_subscriptions FOR EACH ROW EXECUTE FUNCTION prevent_f3b_billing_ledger_delete()"}],"constraints":[{"name":"billing_subscriptions_billing_customer_link_id_fkey","definition":"FOREIGN KEY (billing_customer_link_id) REFERENCES billing_customer_links(id) ON DELETE RESTRICT"},{"name":"billing_subscriptions_cadence_check","definition":"CHECK (normalized_cadence = ANY (ARRAY[''monthly''::text, ''annual''::text]))"},{"name":"billing_subscriptions_environment_check","definition":"CHECK (provider_environment = ANY (ARRAY[''sandbox''::text, ''production''::text]))"},{"name":"billing_subscriptions_origin_check","definition":"CHECK (billing_origin = ANY (ARRAY[''newebpay_web''::text, ''ecpay_web''::text, ''apple_app_store''::text, ''google_play''::text]))"},{"name":"billing_subscriptions_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT"},{"name":"billing_subscriptions_period_check","definition":"CHECK (current_period_starts_at IS NULL AND current_period_ends_at IS NULL OR current_period_starts_at IS NOT NULL AND current_period_ends_at IS NOT NULL AND current_period_ends_at >= current_period_starts_at)"},{"name":"billing_subscriptions_pkey","definition":"PRIMARY KEY (id)"},{"name":"billing_subscriptions_plan_check","definition":"CHECK (normalized_plan_code = ANY (ARRAY[''pro''::text, ''team''::text]))"},{"name":"billing_subscriptions_provider_identity_key","definition":"UNIQUE (billing_origin, provider_environment, provider_subscription_ref)"},{"name":"billing_subscriptions_provider_ref_check","definition":"CHECK (length(btrim(provider_subscription_ref)) >= 1 AND length(btrim(provider_subscription_ref)) <= 512 AND provider_subscription_ref = btrim(provider_subscription_ref) AND (provider_product_ref IS NULL OR length(btrim(provider_product_ref)) >= 1 AND length(btrim(provider_product_ref)) <= 512 AND provider_product_ref = btrim(provider_product_ref)) AND (provider_price_ref IS NULL OR length(btrim(provider_price_ref)) >= 1 AND length(btrim(provider_price_ref)) <= 512 AND provider_price_ref = btrim(provider_price_ref)))"},{"name":"billing_subscriptions_reconciled_time_check","definition":"CHECK (last_reconciled_at >= provider_observed_at)"},{"name":"billing_subscriptions_sequence_check","definition":"CHECK (provider_sequence IS NULL OR provider_sequence = btrim(provider_sequence) AND length(provider_sequence) >= 1 AND length(provider_sequence) <= 256)"},{"name":"billing_subscriptions_snapshot_hash_check","definition":"CHECK (snapshot_hash ~ ''^[0-9a-f]{64}$''::text)"},{"name":"billing_subscriptions_status_check","definition":"CHECK (normalized_billing_status = ANY (ARRAY[''trialing''::text, ''active''::text, ''past_due''::text, ''paused''::text, ''cancelled''::text, ''expired''::text, ''refunded''::text, ''disputed''::text, ''unknown''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.billing_transactions','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"billing_subscription_id","type":"uuid","nullable":true},{"name":"billing_origin","type":"text","nullable":false},{"name":"provider_environment","type":"text","nullable":false},{"name":"provider_transaction_ref","type":"text","nullable":false},{"name":"provider_parent_transaction_ref","type":"text","nullable":true},{"name":"transaction_kind","type":"text","nullable":false},{"name":"transaction_status","type":"text","nullable":false},{"name":"currency","type":"text","nullable":false},{"name":"amount_minor","type":"bigint","nullable":false},{"name":"provider_effective_at","type":"timestamp with time zone","nullable":false},{"name":"settled_at","type":"timestamp with time zone","nullable":true},{"name":"provider_observed_at","type":"timestamp with time zone","nullable":false},{"name":"snapshot_hash","type":"text","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"enforce_billing_transaction_write","definition":"CREATE TRIGGER enforce_billing_transaction_write BEFORE INSERT OR DELETE OR UPDATE ON billing_transactions FOR EACH ROW EXECUTE FUNCTION enforce_billing_transaction_write()"}],"constraints":[{"name":"billing_transactions_amount_check","definition":"CHECK (amount_minor >= 0 AND amount_minor <= ''9007199254740991''::bigint)"},{"name":"billing_transactions_billing_subscription_id_fkey","definition":"FOREIGN KEY (billing_subscription_id) REFERENCES billing_subscriptions(id) ON DELETE RESTRICT"},{"name":"billing_transactions_currency_check","definition":"CHECK (currency ~ ''^[A-Z]{3}$''::text)"},{"name":"billing_transactions_environment_check","definition":"CHECK (provider_environment = ANY (ARRAY[''sandbox''::text, ''production''::text]))"},{"name":"billing_transactions_kind_check","definition":"CHECK (transaction_kind = ANY (ARRAY[''charge''::text, ''refund''::text, ''credit''::text, ''dispute''::text, ''chargeback''::text, ''reversal''::text]))"},{"name":"billing_transactions_origin_check","definition":"CHECK (billing_origin = ANY (ARRAY[''newebpay_web''::text, ''ecpay_web''::text, ''apple_app_store''::text, ''google_play''::text]))"},{"name":"billing_transactions_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT"},{"name":"billing_transactions_pkey","definition":"PRIMARY KEY (id)"},{"name":"billing_transactions_provider_kind_key","definition":"UNIQUE (billing_origin, provider_environment, provider_transaction_ref, transaction_kind)"},{"name":"billing_transactions_provider_ref_check","definition":"CHECK (length(btrim(provider_transaction_ref)) >= 1 AND length(btrim(provider_transaction_ref)) <= 512 AND provider_transaction_ref = btrim(provider_transaction_ref) AND (provider_parent_transaction_ref IS NULL OR length(btrim(provider_parent_transaction_ref)) >= 1 AND length(btrim(provider_parent_transaction_ref)) <= 512 AND provider_parent_transaction_ref = btrim(provider_parent_transaction_ref) AND provider_parent_transaction_ref <> provider_transaction_ref))"},{"name":"billing_transactions_settlement_shape_check","definition":"CHECK ((transaction_status = ANY (ARRAY[''settled''::text, ''reversed''::text])) AND settled_at IS NOT NULL OR (transaction_status <> ALL (ARRAY[''settled''::text, ''reversed''::text])) AND settled_at IS NULL)"},{"name":"billing_transactions_snapshot_hash_check","definition":"CHECK (snapshot_hash ~ ''^[0-9a-f]{64}$''::text)"},{"name":"billing_transactions_status_check","definition":"CHECK (transaction_status = ANY (ARRAY[''pending''::text, ''authorized''::text, ''succeeded''::text, ''settled''::text, ''failed''::text, ''cancelled''::text, ''reversed''::text, ''unknown''::text]))"},{"name":"billing_transactions_time_check","definition":"CHECK (provider_observed_at >= provider_effective_at AND (settled_at IS NULL OR settled_at >= provider_effective_at))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.events','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"type","type":"text","nullable":false},{"name":"payload","type":"jsonb","nullable":false},{"name":"actor_id","type":"uuid","nullable":false},{"name":"market_id","type":"uuid","nullable":true},{"name":"timestamp","type":"timestamp with time zone","nullable":true},{"name":"metadata","type":"jsonb","nullable":true},{"name":"sync_status","type":"sync_status","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[{"name":"events_select_owner_only","check":null,"roles":["authenticated"],"using":"((market_id IN ( SELECT current_user_owned_market_ids.id\n   FROM current_user_owned_market_ids() current_user_owned_market_ids(id))) OR ((market_id IS NULL) AND (actor_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM markets m\n  WHERE (m.owner_id = auth.uid())))))","command":"r","permissive":true},{"name":"owner_product_metadata_events_read","check":null,"roles":["authenticated"],"using":"((market_id IS NULL) AND (type = ANY (ARRAY[''product_updated''::text, ''product_deleted''::text])) AND (EXISTS ( SELECT 1\n   FROM products p\n  WHERE (((p.id)::text = COALESCE((events.payload ->> ''productId''::text), (events.payload ->> ''product_id''::text))) AND (p.owner_id = auth.uid())))))","command":"r","permissive":true},{"name":"recurring_operations_events_owner_only","check":"((type <> ALL (ARRAY[''venue_created''::text, ''venue_updated''::text, ''venue_archived''::text, ''operation_schedule_created''::text, ''operation_schedule_updated''::text, ''operation_schedule_paused''::text, ''operation_schedule_resumed''::text, ''operation_schedule_archived''::text])) OR can_manage_recurring_operations())","roles":["authenticated"],"using":null,"command":"a","permissive":false},{"name":"subscription_retained_paid_read","check":null,"roles":["authenticated"],"using":"subscription_read_owner_paid(auth.uid())","command":"r","permissive":false},{"name":"users_can_insert_own_events","check":"((actor_id)::text = (auth.uid())::text)","roles":["authenticated"],"using":null,"command":"a","permissive":true},{"name":"users_can_update_own_events","check":"(((actor_id)::text = (auth.uid())::text) AND ((market_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM market_members\n  WHERE ((market_members.market_id = events.market_id) AND ((market_members.user_id)::text = (auth.uid())::text))))))","roles":["authenticated"],"using":"(((actor_id)::text = (auth.uid())::text) AND ((market_id IS NULL) OR (EXISTS ( SELECT 1\n   FROM market_members\n  WHERE ((market_members.market_id = events.market_id) AND ((market_members.user_id)::text = (auth.uid())::text))))))","command":"w","permissive":true},{"name":"用戶可以插入事件_v3","check":"((actor_id = auth.uid()) AND ((market_id IS NULL) OR (type = ''market_created''::text) OR (EXISTS ( SELECT 1\n   FROM market_members\n  WHERE ((market_members.market_id = events.market_id) AND (market_members.user_id = auth.uid())))) OR (EXISTS ( SELECT 1\n   FROM (market_members mm\n     JOIN staff_relationships sr ON ((sr.owner_id = mm.user_id)))\n  WHERE ((mm.market_id = events.market_id) AND (sr.staff_id = auth.uid()) AND (sr.status = ''active''::text))))))","roles":["authenticated"],"using":null,"command":"a","permissive":true}],"triggers":[{"name":"a00_event_actor_authorization","definition":"CREATE TRIGGER a00_event_actor_authorization BEFORE INSERT OR DELETE OR UPDATE ON events FOR EACH ROW EXECUTE FUNCTION enforce_event_actor_authorization()"},{"name":"subscription_event_write","definition":"CREATE TRIGGER subscription_event_write BEFORE INSERT OR DELETE OR UPDATE ON events FOR EACH ROW EXECUTE FUNCTION enforce_subscription_event_write()"},{"name":"trigger_guard_recurring_operations_event","definition":"CREATE TRIGGER trigger_guard_recurring_operations_event BEFORE INSERT ON events FOR EACH ROW EXECUTE FUNCTION guard_recurring_operations_event()"},{"name":"trigger_update_market_operation_session_read_model","definition":"CREATE TRIGGER trigger_update_market_operation_session_read_model AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION update_market_operation_session_read_model()"},{"name":"trigger_update_market_read_model","definition":"CREATE TRIGGER trigger_update_market_read_model AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION update_market_read_model()"},{"name":"trigger_update_product_read_model","definition":"CREATE TRIGGER trigger_update_product_read_model AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION update_product_read_model()"},{"name":"trigger_update_recurring_operations_read_model","definition":"CREATE TRIGGER trigger_update_recurring_operations_read_model AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION project_recurring_operations_event()"},{"name":"zz_project_market_payment_deadline_event","definition":"CREATE TRIGGER zz_project_market_payment_deadline_event AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION project_market_payment_deadline_event()"},{"name":"zz_project_market_region_event","definition":"CREATE TRIGGER zz_project_market_region_event AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION project_market_region_event()"}],"constraints":[{"name":"events_actor_id_fkey","definition":"FOREIGN KEY (actor_id) REFERENCES profiles(id)"},{"name":"events_pkey","definition":"PRIMARY KEY (id)"},{"name":"events_type_check","definition":"CHECK (type = ANY (ARRAY[''venue_created''::text, ''venue_updated''::text, ''venue_archived''::text, ''operation_schedule_created''::text, ''operation_schedule_updated''::text, ''operation_schedule_paused''::text, ''operation_schedule_resumed''::text, ''operation_schedule_archived''::text, ''market_created''::text, ''market_updated''::text, ''market_status_changed''::text, ''market_started''::text, ''market_ended''::text, ''market_deleted''::text, ''product_created''::text, ''product_updated''::text, ''product_deleted''::text, ''interaction_recorded''::text, ''interaction_deleted''::text, ''deal_closed''::text, ''deal_deleted''::text, ''field_note_created''::text, ''field_note_updated''::text, ''field_note_deleted''::text, ''checklist_item_created''::text, ''checklist_item_updated''::text, ''checklist_item_deleted''::text, ''settings_updated''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.events_archive','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"type","type":"text","nullable":false},{"name":"payload","type":"jsonb","nullable":false},{"name":"actor_id","type":"uuid","nullable":false},{"name":"market_id","type":"uuid","nullable":true},{"name":"timestamp","type":"timestamp with time zone","nullable":false},{"name":"metadata","type":"jsonb","nullable":true},{"name":"archived_at","type":"timestamp with time zone","nullable":true},{"name":"archived_by","type":"uuid","nullable":true}],"forceRls":false,"policies":[{"name":"用戶只能創建自己的歸檔事件","check":"(auth.uid() = actor_id)","roles":["PUBLIC"],"using":null,"command":"a","permissive":true},{"name":"用戶只能查看自己的歸檔事件","check":null,"roles":["PUBLIC"],"using":"(auth.uid() = actor_id)","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"events_archive_archived_by_fkey","definition":"FOREIGN KEY (archived_by) REFERENCES profiles(id)"},{"name":"events_archive_pkey","definition":"PRIMARY KEY (id)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.market_cash_records','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"SELECT"}],"columns":[{"name":"market_id","type":"uuid","nullable":false},{"name":"business_date","type":"date","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"data","type":"jsonb","nullable":false},{"name":"revision","type":"integer","nullable":false},{"name":"mutation_id","type":"uuid","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[{"name":"market_cash_owner_read","check":null,"roles":["authenticated"],"using":"((owner_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM markets m\n  WHERE ((m.id = market_cash_records.market_id) AND (m.owner_id = auth.uid()) AND (NOT COALESCE(m.is_deleted, false))))))","command":"r","permissive":true},{"name":"subscription_retained_paid_read","check":null,"roles":["authenticated"],"using":"subscription_read_owner_paid(owner_id)","command":"r","permissive":false}],"triggers":[{"name":"subscription_row_write","definition":"CREATE TRIGGER subscription_row_write BEFORE INSERT OR DELETE OR UPDATE ON market_cash_records FOR EACH ROW EXECUTE FUNCTION enforce_subscription_row_write(''1'')"}],"constraints":[{"name":"market_cash_records_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE"},{"name":"market_cash_records_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"market_cash_records_pkey","definition":"PRIMARY KEY (market_id, business_date)"},{"name":"market_cash_records_revision_check","definition":"CHECK (revision > 0)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.market_financial_review_receipts','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"owner_id","type":"uuid","nullable":false},{"name":"mutation_id","type":"uuid","nullable":false},{"name":"request","type":"jsonb","nullable":false},{"name":"response","type":"jsonb","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"market_financial_review_receipts_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"market_financial_review_receipts_pkey","definition":"PRIMARY KEY (owner_id, mutation_id)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.market_financial_reviews','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"owner_id","type":"uuid","nullable":false},{"name":"market_id","type":"uuid","nullable":false},{"name":"review_key","type":"text","nullable":false},{"name":"mode","type":"text","nullable":false},{"name":"amount","type":"numeric(12,2)","nullable":true},{"name":"observed","type":"jsonb","nullable":false},{"name":"source_key","type":"text","nullable":false},{"name":"revision","type":"integer","nullable":false},{"name":"mutation_id","type":"uuid","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"market_financial_reviews_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE"},{"name":"market_financial_reviews_mode_check","definition":"CHECK (mode = ANY (ARRAY[''cost''::text, ''zero-income''::text, ''zero-fee''::text, ''cleared''::text]))"},{"name":"market_financial_reviews_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"market_financial_reviews_pkey","definition":"PRIMARY KEY (owner_id, market_id, review_key)"},{"name":"market_financial_reviews_revision_check","definition":"CHECK (revision > 0)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.market_invitations','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"code","type":"text","nullable":false},{"name":"market_id","type":"uuid","nullable":false},{"name":"created_by","type":"uuid","nullable":false},{"name":"is_used","type":"boolean","nullable":true},{"name":"used_by","type":"uuid","nullable":true},{"name":"used_at","type":"timestamp with time zone","nullable":true},{"name":"expires_at","type":"timestamp with time zone","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[{"name":"允許 service_role 插入邀請碼","check":"true","roles":["service_role"],"using":null,"command":"a","permissive":true},{"name":"允許 service_role 更新邀請碼","check":"true","roles":["service_role"],"using":"true","command":"w","permissive":true},{"name":"用戶只能查看自己創建的邀請碼","check":null,"roles":["authenticated"],"using":"(created_by = auth.uid())","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"market_invitations_code_check","definition":"CHECK (length(code) = 6)"},{"name":"market_invitations_code_key","definition":"UNIQUE (code)"},{"name":"market_invitations_created_by_fkey","definition":"FOREIGN KEY (created_by) REFERENCES profiles(id)"},{"name":"market_invitations_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE"},{"name":"market_invitations_pkey","definition":"PRIMARY KEY (id)"},{"name":"market_invitations_used_by_fkey","definition":"FOREIGN KEY (used_by) REFERENCES profiles(id)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.market_journals','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"SELECT"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"market_id","type":"uuid","nullable":false},{"name":"author_id","type":"uuid","nullable":false},{"name":"business_date","type":"date","nullable":true},{"name":"body","type":"text","nullable":false},{"name":"revision","type":"integer","nullable":false},{"name":"mutation_id","type":"uuid","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false},{"name":"deleted_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[{"name":"market_journals_owner_read","check":null,"roles":["authenticated"],"using":"((owner_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM markets m\n  WHERE ((m.id = market_journals.market_id) AND (m.owner_id = auth.uid()) AND (NOT COALESCE(m.is_deleted, false))))))","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"market_journals_author_id_fkey","definition":"FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"market_journals_body_check","definition":"CHECK (char_length(body) >= 1 AND char_length(body) <= 5000 AND body ~ ''[^[:space:]]''::text)"},{"name":"market_journals_check","definition":"CHECK (author_id = owner_id)"},{"name":"market_journals_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE"},{"name":"market_journals_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"market_journals_pkey","definition":"PRIMARY KEY (id)"},{"name":"market_journals_revision_check","definition":"CHECK (revision > 0)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.market_members','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"market_id","type":"uuid","nullable":false},{"name":"user_id","type":"uuid","nullable":false},{"name":"joined_at","type":"timestamp with time zone","nullable":true},{"name":"role","type":"text","nullable":false}],"forceRls":false,"policies":[{"name":"market_members_delete_owner_or_self_staff","check":null,"roles":["authenticated"],"using":"((role = ''staff''::text) AND ((user_id = auth.uid()) OR (market_id IN ( SELECT current_user_owned_market_ids.id\n   FROM current_user_owned_market_ids() current_user_owned_market_ids(id)))))","command":"d","permissive":true},{"name":"market_members_select_secure","check":null,"roles":["authenticated"],"using":"(market_id IN ( SELECT current_user_market_ids.market_id\n   FROM current_user_market_ids() current_user_market_ids(market_id)))","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"market_members_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED"},{"name":"market_members_pkey","definition":"PRIMARY KEY (market_id, user_id)"},{"name":"market_members_role_check","definition":"CHECK (role = ANY (ARRAY[''owner''::text, ''staff''::text]))"},{"name":"market_members_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.markets','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"name","type":"text","nullable":false},{"name":"location","type":"text","nullable":false},{"name":"start_date","type":"date","nullable":false},{"name":"end_date","type":"date","nullable":false},{"name":"status","type":"text","nullable":false},{"name":"early_entry_enabled","type":"boolean","nullable":true},{"name":"early_entry_time","type":"time without time zone","nullable":true},{"name":"check_in_time","type":"time without time zone","nullable":true},{"name":"operating_start_time","type":"time without time zone","nullable":true},{"name":"operating_end_time","type":"time without time zone","nullable":true},{"name":"registration_fee","type":"numeric(10,2)","nullable":true},{"name":"booth_cost","type":"numeric(10,2)","nullable":true},{"name":"deposit","type":"numeric(10,2)","nullable":true},{"name":"table_rental","type":"numeric(10,2)","nullable":true},{"name":"chair_rental","type":"numeric(10,2)","nullable":true},{"name":"umbrella_rental","type":"numeric(10,2)","nullable":true},{"name":"tablecloth_rental","type":"numeric(10,2)","nullable":true},{"name":"commission_rate","type":"numeric(5,2)","nullable":true},{"name":"table_free","type":"boolean","nullable":true},{"name":"chair_free","type":"boolean","nullable":true},{"name":"umbrella_free","type":"boolean","nullable":true},{"name":"tablecloth_free","type":"boolean","nullable":true},{"name":"total_revenue","type":"numeric(10,2)","nullable":true},{"name":"total_profit","type":"numeric(10,2)","nullable":true},{"name":"total_interactions","type":"integer","nullable":true},{"name":"total_deals","type":"integer","nullable":true},{"name":"notes","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true},{"name":"is_collaborative","type":"boolean","nullable":true},{"name":"operation_phase","type":"text","nullable":true},{"name":"is_deleted","type":"boolean","nullable":true},{"name":"sync_status","type":"sync_status","nullable":true},{"name":"sales_photo_evidence_required","type":"boolean","nullable":false},{"name":"operation_session_date","type":"date","nullable":true},{"name":"venue_id","type":"uuid","nullable":true},{"name":"schedule_id","type":"uuid","nullable":true},{"name":"session_origin","type":"text","nullable":true},{"name":"schedule_occurrence_key","type":"text","nullable":true},{"name":"schedule_revision","type":"integer","nullable":true},{"name":"schedule_occurrence_state","type":"text","nullable":true},{"name":"is_schedule_override","type":"boolean","nullable":false},{"name":"region_code","type":"text","nullable":true},{"name":"payment_deadline","type":"jsonb","nullable":true}],"forceRls":false,"policies":[{"name":"markets_select_owner_only","check":null,"roles":["authenticated"],"using":"(owner_id = auth.uid())","command":"r","permissive":true},{"name":"subscription_retained_paid_read","check":null,"roles":["authenticated"],"using":"subscription_read_owner_paid(owner_id)","command":"r","permissive":false},{"name":"允許 authenticated 更新市集","check":"(id IN ( SELECT m.market_id\n   FROM market_members m\n  WHERE (m.user_id = auth.uid())))","roles":["authenticated"],"using":"(id IN ( SELECT m.market_id\n   FROM market_members m\n  WHERE (m.user_id = auth.uid())))","command":"w","permissive":true}],"triggers":[{"name":"guard_market_payment_deadline_change","definition":"CREATE TRIGGER guard_market_payment_deadline_change BEFORE INSERT OR UPDATE ON markets FOR EACH ROW EXECUTE FUNCTION guard_market_payment_deadline_change()"},{"name":"guard_market_region_change","definition":"CREATE TRIGGER guard_market_region_change BEFORE INSERT OR UPDATE ON markets FOR EACH ROW EXECUTE FUNCTION guard_market_region_change()"},{"name":"subscription_market_summary","definition":"CREATE TRIGGER subscription_market_summary BEFORE INSERT OR UPDATE ON markets FOR EACH ROW EXECUTE FUNCTION enforce_subscription_market_summary()"},{"name":"trigger_auto_add_staff_to_new_market","definition":"CREATE TRIGGER trigger_auto_add_staff_to_new_market AFTER INSERT ON markets FOR EACH ROW EXECUTE FUNCTION auto_add_staff_to_new_market()"},{"name":"trigger_guard_cash_schedule_snapshot","definition":"CREATE TRIGGER trigger_guard_cash_schedule_snapshot BEFORE UPDATE ON markets FOR EACH ROW EXECUTE FUNCTION guard_cash_schedule_snapshot()"},{"name":"trigger_guard_journal_schedule_snapshot","definition":"CREATE TRIGGER trigger_guard_journal_schedule_snapshot BEFORE UPDATE ON markets FOR EACH ROW EXECUTE FUNCTION guard_journal_schedule_snapshot()"},{"name":"update_markets_updated_at","definition":"CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}],"constraints":[{"name":"markets_operation_phase_check","definition":"CHECK (operation_phase IS NULL OR (operation_phase = ANY (ARRAY[''early_entry''::text, ''check_in''::text, ''operating''::text, ''closing''::text])))"},{"name":"markets_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"markets_payment_deadline_check","definition":"CHECK (market_payment_deadline_is_valid(payment_deadline) AND (session_origin IS DISTINCT FROM ''schedule''::text OR payment_deadline IS NULL OR payment_deadline = ''null''::jsonb))"},{"name":"markets_pkey","definition":"PRIMARY KEY (id)"},{"name":"markets_region_code_check","definition":"CHECK (market_region_code_is_valid(region_code))"},{"name":"markets_schedule_id_fkey","definition":"FOREIGN KEY (schedule_id) REFERENCES operation_schedules(id) ON DELETE RESTRICT"},{"name":"markets_schedule_occurrence_state_check","definition":"CHECK (schedule_occurrence_state IS NULL OR (schedule_occurrence_state = ANY (ARRAY[''scheduled''::text, ''skipped''::text, ''suppressed''::text, ''rule_removed''::text])))"},{"name":"markets_schedule_revision_check","definition":"CHECK (schedule_revision IS NULL OR schedule_revision >= 1)"},{"name":"markets_session_origin_check","definition":"CHECK (session_origin IS NULL OR (session_origin = ANY (ARRAY[''manual''::text, ''schedule''::text, ''legacy''::text])))"},{"name":"markets_status_check","definition":"CHECK (status = ANY (ARRAY[''registered''::text, ''accepted''::text, ''paid''::text, ''ongoing''::text, ''completed''::text, ''postponed''::text, ''cancelled''::text]))"},{"name":"markets_venue_id_fkey","definition":"FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.operation_schedules','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"venue_id","type":"uuid","nullable":false},{"name":"name","type":"text","nullable":true},{"name":"timezone","type":"text","nullable":false},{"name":"recurrence","type":"jsonb","nullable":false},{"name":"start_time","type":"time without time zone","nullable":false},{"name":"end_time","type":"time without time zone","nullable":false},{"name":"ends_next_day","type":"boolean","nullable":false},{"name":"defaults","type":"jsonb","nullable":false},{"name":"status","type":"text","nullable":false},{"name":"revision","type":"integer","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[{"name":"operation_schedules_owner_insert","check":"((owner_id = auth.uid()) AND can_manage_recurring_operations() AND (EXISTS ( SELECT 1\n   FROM venues v\n  WHERE ((v.id = operation_schedules.venue_id) AND (v.owner_id = auth.uid())))))","roles":["authenticated"],"using":null,"command":"a","permissive":true},{"name":"operation_schedules_owner_select","check":null,"roles":["authenticated"],"using":"((owner_id = auth.uid()) AND can_manage_recurring_operations())","command":"r","permissive":true},{"name":"operation_schedules_owner_update","check":"((owner_id = auth.uid()) AND can_manage_recurring_operations() AND (EXISTS ( SELECT 1\n   FROM venues v\n  WHERE ((v.id = operation_schedules.venue_id) AND (v.owner_id = auth.uid())))))","roles":["authenticated"],"using":"((owner_id = auth.uid()) AND can_manage_recurring_operations())","command":"w","permissive":true}],"triggers":[],"constraints":[{"name":"operation_schedules_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"operation_schedules_pkey","definition":"PRIMARY KEY (id)"},{"name":"operation_schedules_revision_check","definition":"CHECK (revision >= 1)"},{"name":"operation_schedules_status_check","definition":"CHECK (status = ANY (ARRAY[''active''::text, ''paused''::text, ''archived''::text]))"},{"name":"operation_schedules_venue_id_fkey","definition":"FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT"},{"name":"operation_schedules_weekly_v1_check","definition":"CHECK ((recurrence ->> ''frequency''::text) = ''weekly''::text AND ((recurrence ->> ''interval''::text)::integer) = 1 AND jsonb_typeof(recurrence -> ''weekdays''::text) = ''array''::text)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.owner_accessible_events','{"rls":false,"kind":"v","grants":[{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":true},{"name":"type","type":"text","nullable":true},{"name":"payload","type":"jsonb","nullable":true},{"name":"actor_id","type":"uuid","nullable":true},{"name":"market_id","type":"uuid","nullable":true},{"name":"timestamp","type":"timestamp with time zone","nullable":true},{"name":"metadata","type":"jsonb","nullable":true},{"name":"sync_status","type":"sync_status","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[],"triggers":[],"constraints":[],"viewDefinition":" SELECT e.id,\n    e.type,\n        CASE\n            WHEN subscription_read_paid(auth.uid()) THEN e.payload\n            ELSE subscription_free_payload(e.payload)\n        END AS payload,\n    e.actor_id,\n    e.market_id,\n    e.\"timestamp\",\n        CASE\n            WHEN subscription_read_paid(auth.uid()) THEN e.metadata\n            ELSE NULL::jsonb\n        END AS metadata,\n    e.sync_status,\n    e.created_at\n   FROM events e\n     LEFT JOIN markets m ON m.id = e.market_id\n     LEFT JOIN products p ON e.market_id IS NULL AND (e.type = ANY (ARRAY[''product_created''::text, ''product_updated''::text, ''product_deleted''::text])) AND p.id::text = COALESCE(e.payload ->> ''productId''::text, e.payload ->> ''product_id''::text)\n  WHERE (m.owner_id = auth.uid() OR e.market_id IS NULL AND\n        CASE\n            WHEN e.type = ANY (ARRAY[''product_created''::text, ''product_updated''::text, ''product_deleted''::text]) THEN p.owner_id = auth.uid()\n            ELSE e.actor_id = auth.uid()\n        END) AND (subscription_read_paid(auth.uid()) OR subscription_foundation_event(e.type));","owner":"postgres","options":["security_barrier=true"]}'::jsonb),
('public.owner_accessible_markets','{"rls":false,"kind":"v","grants":[{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":true},{"name":"owner_id","type":"uuid","nullable":true},{"name":"name","type":"text","nullable":true},{"name":"location","type":"text","nullable":true},{"name":"start_date","type":"date","nullable":true},{"name":"end_date","type":"date","nullable":true},{"name":"status","type":"text","nullable":true},{"name":"early_entry_enabled","type":"boolean","nullable":true},{"name":"early_entry_time","type":"time without time zone","nullable":true},{"name":"check_in_time","type":"time without time zone","nullable":true},{"name":"operating_start_time","type":"time without time zone","nullable":true},{"name":"operating_end_time","type":"time without time zone","nullable":true},{"name":"registration_fee","type":"numeric(10,2)","nullable":true},{"name":"booth_cost","type":"numeric(10,2)","nullable":true},{"name":"deposit","type":"numeric(10,2)","nullable":true},{"name":"table_rental","type":"numeric(10,2)","nullable":true},{"name":"chair_rental","type":"numeric(10,2)","nullable":true},{"name":"umbrella_rental","type":"numeric(10,2)","nullable":true},{"name":"tablecloth_rental","type":"numeric(10,2)","nullable":true},{"name":"commission_rate","type":"numeric(5,2)","nullable":true},{"name":"table_free","type":"boolean","nullable":true},{"name":"chair_free","type":"boolean","nullable":true},{"name":"umbrella_free","type":"boolean","nullable":true},{"name":"tablecloth_free","type":"boolean","nullable":true},{"name":"total_revenue","type":"numeric(10,2)","nullable":true},{"name":"total_profit","type":"numeric(10,2)","nullable":true},{"name":"total_interactions","type":"integer","nullable":true},{"name":"total_deals","type":"integer","nullable":true},{"name":"notes","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true},{"name":"is_collaborative","type":"boolean","nullable":true},{"name":"operation_phase","type":"text","nullable":true},{"name":"is_deleted","type":"boolean","nullable":true},{"name":"sync_status","type":"sync_status","nullable":true},{"name":"sales_photo_evidence_required","type":"boolean","nullable":true},{"name":"operation_session_date","type":"date","nullable":true},{"name":"venue_id","type":"uuid","nullable":true},{"name":"schedule_id","type":"uuid","nullable":true},{"name":"session_origin","type":"text","nullable":true},{"name":"schedule_occurrence_key","type":"text","nullable":true},{"name":"schedule_revision","type":"integer","nullable":true},{"name":"schedule_occurrence_state","type":"text","nullable":true},{"name":"is_schedule_override","type":"boolean","nullable":true},{"name":"region_code","type":"text","nullable":true},{"name":"payment_deadline","type":"jsonb","nullable":true}],"forceRls":false,"policies":[],"triggers":[],"constraints":[],"viewDefinition":" SELECT (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).id AS id,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).owner_id AS owner_id,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).name AS name,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).location AS location,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).start_date AS start_date,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).end_date AS end_date,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).status AS status,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).early_entry_enabled AS early_entry_enabled,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).early_entry_time AS early_entry_time,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).check_in_time AS check_in_time,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).operating_start_time AS operating_start_time,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).operating_end_time AS operating_end_time,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).registration_fee AS registration_fee,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).booth_cost AS booth_cost,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).deposit AS deposit,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).table_rental AS table_rental,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).chair_rental AS chair_rental,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).umbrella_rental AS umbrella_rental,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).tablecloth_rental AS tablecloth_rental,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).commission_rate AS commission_rate,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).table_free AS table_free,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).chair_free AS chair_free,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).umbrella_free AS umbrella_free,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).tablecloth_free AS tablecloth_free,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).total_revenue AS total_revenue,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).total_profit AS total_profit,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).total_interactions AS total_interactions,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).total_deals AS total_deals,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).notes AS notes,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).created_at AS created_at,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).updated_at AS updated_at,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).is_collaborative AS is_collaborative,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).operation_phase AS operation_phase,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).is_deleted AS is_deleted,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).sync_status AS sync_status,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).sales_photo_evidence_required AS sales_photo_evidence_required,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).operation_session_date AS operation_session_date,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).venue_id AS venue_id,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).schedule_id AS schedule_id,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).session_origin AS session_origin,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).schedule_occurrence_key AS schedule_occurrence_key,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).schedule_revision AS schedule_revision,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).schedule_occurrence_state AS schedule_occurrence_state,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).is_schedule_override AS is_schedule_override,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).region_code AS region_code,\n    (jsonb_populate_record(NULL::markets,\n        CASE\n            WHEN subscription_read_paid(owner_id) THEN to_jsonb(m.*)\n            ELSE to_jsonb(m.*) || jsonb_build_object(''total_revenue'', NULL::unknown, ''total_profit'', NULL::unknown, ''total_interactions'', NULL::unknown, ''total_deals'', NULL::unknown)\n        END)).payment_deadline AS payment_deadline\n   FROM markets m\n  WHERE owner_id = auth.uid();","owner":"postgres","options":["security_barrier=true"]}'::jsonb),
('public.owner_workflow_receipts','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"kind","type":"text","nullable":false},{"name":"request","type":"jsonb","nullable":false},{"name":"result","type":"jsonb","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"owner_workflow_receipts_kind_check","definition":"CHECK (kind = ANY (ARRAY[''journal_tasks''::text, ''venue_regions''::text]))"},{"name":"owner_workflow_receipts_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"owner_workflow_receipts_pkey","definition":"PRIMARY KEY (id)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.pending_operations','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"operation_id","type":"text","nullable":false},{"name":"operation_type","type":"text","nullable":false},{"name":"entity_type","type":"text","nullable":false},{"name":"entity_id","type":"text","nullable":false},{"name":"market_id","type":"uuid","nullable":false},{"name":"payload","type":"jsonb","nullable":false},{"name":"idempotency_key","type":"text","nullable":false},{"name":"actor_id","type":"uuid","nullable":false},{"name":"role_snapshot","type":"jsonb","nullable":false},{"name":"status","type":"text","nullable":false},{"name":"retry_count","type":"integer","nullable":false},{"name":"last_error_code","type":"text","nullable":true},{"name":"last_error_message","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[{"name":"pending_operations_insert_actor_market_member","check":"((actor_id = auth.uid()) AND ((EXISTS ( SELECT 1\n   FROM markets m\n  WHERE ((m.id = pending_operations.market_id) AND (m.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1\n   FROM (markets m\n     JOIN staff_relationships sr ON ((sr.owner_id = m.owner_id)))\n  WHERE ((m.id = pending_operations.market_id) AND (sr.staff_id = auth.uid()) AND (sr.status = ''active''::text))))))","roles":["authenticated"],"using":null,"command":"a","permissive":true},{"name":"pending_operations_select_actor_or_owner","check":null,"roles":["authenticated"],"using":"((actor_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM markets m\n  WHERE ((m.id = pending_operations.market_id) AND (m.owner_id = auth.uid())))))","command":"r","permissive":true},{"name":"pending_operations_update_actor_only","check":"(actor_id = auth.uid())","roles":["authenticated"],"using":"(actor_id = auth.uid())","command":"w","permissive":true}],"triggers":[{"name":"update_pending_operations_updated_at","definition":"CREATE TRIGGER update_pending_operations_updated_at BEFORE UPDATE ON pending_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}],"constraints":[{"name":"pending_operations_actor_id_fkey","definition":"FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"pending_operations_entity_id_check","definition":"CHECK (length(TRIM(BOTH FROM entity_id)) > 0)"},{"name":"pending_operations_entity_type_check","definition":"CHECK (entity_type = ANY (ARRAY[''field_note''::text, ''checklist_item''::text]))"},{"name":"pending_operations_idempotency_key_check","definition":"CHECK (length(TRIM(BOTH FROM idempotency_key)) > 0)"},{"name":"pending_operations_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE"},{"name":"pending_operations_operation_id_check","definition":"CHECK (length(TRIM(BOTH FROM operation_id)) > 0)"},{"name":"pending_operations_operation_type_check","definition":"CHECK (operation_type = ANY (ARRAY[''field_note_create''::text, ''field_note_update''::text, ''field_note_delete''::text, ''checklist_item_create''::text, ''checklist_item_update''::text, ''checklist_item_delete''::text, ''checklist_item_toggle''::text]))"},{"name":"pending_operations_payload_check","definition":"CHECK (jsonb_typeof(payload) = ''object''::text)"},{"name":"pending_operations_pkey","definition":"PRIMARY KEY (operation_id)"},{"name":"pending_operations_retry_count_check","definition":"CHECK (retry_count >= 0)"},{"name":"pending_operations_role_snapshot_check","definition":"CHECK (jsonb_typeof(role_snapshot) = ''object''::text)"},{"name":"pending_operations_status_check","definition":"CHECK (status = ANY (ARRAY[''pending''::text, ''processing''::text, ''synced''::text, ''failed_retryable''::text, ''failed_permanent''::text, ''blocked_permission''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.preparation_template_applications','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"market_id","type":"uuid","nullable":false},{"name":"actor_id","type":"uuid","nullable":false},{"name":"template_id","type":"uuid","nullable":false},{"name":"request","type":"jsonb","nullable":false},{"name":"result","type":"jsonb","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"preparation_template_applications_actor_id_fkey","definition":"FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"preparation_template_applications_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE"},{"name":"preparation_template_applications_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"preparation_template_applications_pkey","definition":"PRIMARY KEY (id)"},{"name":"preparation_template_applications_template_id_fkey","definition":"FOREIGN KEY (template_id) REFERENCES preparation_templates(id) ON DELETE CASCADE"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.preparation_templates','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"SELECT"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"name","type":"text","nullable":false},{"name":"items","type":"jsonb","nullable":false},{"name":"revision","type":"integer","nullable":false},{"name":"mutation_id","type":"uuid","nullable":false},{"name":"archived","type":"boolean","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[{"name":"preparation_templates_manage_read","check":null,"roles":["authenticated"],"using":"can_manage_preparation_templates(owner_id)","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"preparation_templates_items_check","definition":"CHECK (jsonb_typeof(items) = ''array''::text AND jsonb_array_length(items) >= 1 AND jsonb_array_length(items) <= 50)"},{"name":"preparation_templates_name_check","definition":"CHECK (char_length(name) >= 1 AND char_length(name) <= 60)"},{"name":"preparation_templates_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"preparation_templates_pkey","definition":"PRIMARY KEY (id)"},{"name":"preparation_templates_revision_check","definition":"CHECK (revision > 0)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.product_cover_photos','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"product_id","type":"uuid","nullable":false},{"name":"status","type":"text","nullable":false},{"name":"display_object_key","type":"text","nullable":true},{"name":"thumbnail_object_key","type":"text","nullable":true},{"name":"display_content_hash","type":"text","nullable":true},{"name":"thumbnail_content_hash","type":"text","nullable":true},{"name":"display_mime_type","type":"text","nullable":true},{"name":"thumbnail_mime_type","type":"text","nullable":true},{"name":"display_size_bytes","type":"integer","nullable":true},{"name":"thumbnail_size_bytes","type":"integer","nullable":true},{"name":"width","type":"integer","nullable":true},{"name":"height","type":"integer","nullable":true},{"name":"version","type":"bigint","nullable":false},{"name":"pending_photo_id","type":"uuid","nullable":true},{"name":"pending_version","type":"bigint","nullable":true},{"name":"upload_lease_expires_at","type":"timestamp with time zone","nullable":true},{"name":"last_error_code","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false},{"name":"deleted_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[{"name":"product_cover_photos_accessible_read","check":null,"roles":["authenticated"],"using":"((deleted_at IS NULL) AND ((owner_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM staff_relationships sr\n  WHERE ((sr.owner_id = product_cover_photos.owner_id) AND (sr.staff_id = auth.uid()) AND (sr.status = ''active''::text))))))","command":"r","permissive":true},{"name":"subscription_retained_paid_read","check":null,"roles":["authenticated"],"using":"(subscription_read_owner_paid(owner_id) OR subscription_read_staff(owner_id))","command":"r","permissive":false}],"triggers":[{"name":"subscription_row_write","definition":"CREATE TRIGGER subscription_row_write BEFORE INSERT OR DELETE OR UPDATE ON product_cover_photos FOR EACH ROW EXECUTE FUNCTION enforce_subscription_row_write(''1'')"}],"constraints":[{"name":"product_cover_photos_dimensions_check","definition":"CHECK ((width IS NULL OR width >= 1 AND width <= 1600) AND (height IS NULL OR height >= 1 AND height <= 1600))"},{"name":"product_cover_photos_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"product_cover_photos_pending_version_check","definition":"CHECK (pending_version IS NULL OR pending_version > 0)"},{"name":"product_cover_photos_pkey","definition":"PRIMARY KEY (id)"},{"name":"product_cover_photos_product_id_fkey","definition":"FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE"},{"name":"product_cover_photos_size_check","definition":"CHECK ((display_size_bytes IS NULL OR display_size_bytes >= 1 AND display_size_bytes <= 600000) AND (thumbnail_size_bytes IS NULL OR thumbnail_size_bytes >= 1 AND thumbnail_size_bytes <= 150000))"},{"name":"product_cover_photos_status_check","definition":"CHECK (status = ANY (ARRAY[''uploading''::text, ''uploaded''::text, ''upload_failed''::text, ''deleting''::text]))"},{"name":"product_cover_photos_version_check","definition":"CHECK (version > 0)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.products','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"market_id","type":"uuid","nullable":true},{"name":"name","type":"text","nullable":false},{"name":"category","type":"text","nullable":false},{"name":"price","type":"numeric(10,2)","nullable":false},{"name":"cost","type":"numeric(10,2)","nullable":true},{"name":"icon_name","type":"text","nullable":true},{"name":"color_code","type":"text","nullable":true},{"name":"stock","type":"integer","nullable":true},{"name":"unlimited_stock","type":"boolean","nullable":true},{"name":"is_active","type":"boolean","nullable":true},{"name":"total_sold","type":"integer","nullable":true},{"name":"description","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true},{"name":"owner_id","type":"uuid","nullable":false},{"name":"is_shared","type":"boolean","nullable":true}],"forceRls":false,"policies":[{"name":"Users can delete own products","check":null,"roles":["PUBLIC"],"using":"(owner_id = auth.uid())","command":"d","permissive":true},{"name":"Users can insert own products","check":"(owner_id = auth.uid())","roles":["PUBLIC"],"using":null,"command":"a","permissive":true},{"name":"Users can update own products","check":"(owner_id = auth.uid())","roles":["PUBLIC"],"using":"(owner_id = auth.uid())","command":"w","permissive":true},{"name":"products_select_owner_only","check":null,"roles":["authenticated"],"using":"(owner_id = auth.uid())","command":"r","permissive":true},{"name":"subscription_retained_paid_read","check":null,"roles":["authenticated"],"using":"subscription_read_owner_paid(owner_id)","command":"r","permissive":false},{"name":"允許 authenticated 更新商品","check":"((market_id IS NULL) OR (market_id IN ( SELECT m.market_id\n   FROM market_members m\n  WHERE (m.user_id = auth.uid()))))","roles":["authenticated"],"using":"((market_id IS NULL) OR (market_id IN ( SELECT m.market_id\n   FROM market_members m\n  WHERE (m.user_id = auth.uid()))))","command":"w","permissive":true}],"triggers":[{"name":"subscription_row_write","definition":"CREATE TRIGGER subscription_row_write BEFORE INSERT OR DELETE OR UPDATE ON products FOR EACH ROW EXECUTE FUNCTION enforce_subscription_row_write(''1'')"},{"name":"update_products_updated_at","definition":"CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}],"constraints":[{"name":"products_category_check","definition":"CHECK (category = ANY (ARRAY[''handmade''::text, ''food''::text, ''accessory''::text, ''clothing''::text, ''art''::text, ''stationery''::text, ''other''::text]))"},{"name":"products_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"products_pkey","definition":"PRIMARY KEY (id)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.profiles','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"email","type":"text","nullable":false},{"name":"display_name","type":"text","nullable":true},{"name":"avatar_url","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[{"name":"用戶只能更新自己的 profile","check":"(auth.uid() = id)","roles":["authenticated"],"using":"(auth.uid() = id)","command":"w","permissive":true},{"name":"用戶可以插入自己的 profile","check":"(auth.uid() = id)","roles":["authenticated"],"using":null,"command":"a","permissive":true},{"name":"用戶可以查看所有 profiles","check":null,"roles":["authenticated"],"using":"true","command":"r","permissive":true}],"triggers":[{"name":"update_profiles_updated_at","definition":"CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}],"constraints":[{"name":"profiles_email_key","definition":"UNIQUE (email)"},{"name":"profiles_id_fkey","definition":"FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"profiles_pkey","definition":"PRIMARY KEY (id)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.sale_photo_evidence','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"SELECT"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"market_id","type":"uuid","nullable":false},{"name":"sale_id","type":"uuid","nullable":false},{"name":"captured_by_staff_id","type":"uuid","nullable":true},{"name":"status","type":"text","nullable":false},{"name":"r2_object_key","type":"text","nullable":true},{"name":"r2_thumbnail_key","type":"text","nullable":true},{"name":"mime_type","type":"text","nullable":true},{"name":"width","type":"integer","nullable":true},{"name":"height","type":"integer","nullable":true},{"name":"file_size_bytes","type":"integer","nullable":true},{"name":"content_hash","type":"text","nullable":true},{"name":"skipped_reason","type":"text","nullable":true},{"name":"failure_reason","type":"text","nullable":true},{"name":"sale_completed_at","type":"timestamp with time zone","nullable":false},{"name":"captured_at","type":"timestamp with time zone","nullable":true},{"name":"uploaded_at","type":"timestamp with time zone","nullable":true},{"name":"expires_at","type":"timestamp with time zone","nullable":true},{"name":"waived_by_owner_id","type":"uuid","nullable":true},{"name":"waived_reason","type":"text","nullable":true},{"name":"waived_at","type":"timestamp with time zone","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false},{"name":"deleted_at","type":"timestamp with time zone","nullable":true},{"name":"upload_attempt_id","type":"uuid","nullable":true},{"name":"upload_lease_expires_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[{"name":"sale_photo_evidence_select_owner_or_own_staff","check":null,"roles":["authenticated"],"using":"((owner_id = auth.uid()) OR ((captured_by_staff_id = auth.uid()) AND (EXISTS ( SELECT 1\n   FROM staff_relationships sr\n  WHERE ((sr.owner_id = sale_photo_evidence.owner_id) AND (sr.staff_id = auth.uid()) AND (sr.status = ''active''::text))))))","command":"r","permissive":true},{"name":"subscription_retained_paid_read","check":null,"roles":["authenticated"],"using":"(subscription_read_owner_advanced(owner_id) OR subscription_read_staff(owner_id))","command":"r","permissive":false}],"triggers":[{"name":"subscription_row_write","definition":"CREATE TRIGGER subscription_row_write BEFORE INSERT OR DELETE OR UPDATE ON sale_photo_evidence FOR EACH ROW EXECUTE FUNCTION enforce_subscription_row_write(''2'')"},{"name":"update_sale_photo_evidence_updated_at","definition":"CREATE TRIGGER update_sale_photo_evidence_updated_at BEFORE UPDATE ON sale_photo_evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}],"constraints":[{"name":"sale_photo_evidence_captured_by_staff_id_fkey","definition":"FOREIGN KEY (captured_by_staff_id) REFERENCES profiles(id) ON DELETE SET NULL"},{"name":"sale_photo_evidence_check","definition":"CHECK (status <> ''waived_by_owner''::text OR waived_by_owner_id IS NOT NULL AND waived_reason IS NOT NULL AND length(TRIM(BOTH FROM waived_reason)) > 0 AND waived_at IS NOT NULL)"},{"name":"sale_photo_evidence_check1","definition":"CHECK (status <> ''uploaded''::text OR r2_object_key IS NOT NULL AND r2_thumbnail_key IS NOT NULL AND uploaded_at IS NOT NULL AND expires_at IS NOT NULL)"},{"name":"sale_photo_evidence_file_size_bytes_check","definition":"CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0)"},{"name":"sale_photo_evidence_file_size_ceiling_check","definition":"CHECK (file_size_bytes IS NULL OR file_size_bytes <= 1000000) NOT VALID"},{"name":"sale_photo_evidence_height_check","definition":"CHECK (height IS NULL OR height > 0)"},{"name":"sale_photo_evidence_market_id_fkey","definition":"FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE"},{"name":"sale_photo_evidence_mime_type_check","definition":"CHECK (mime_type IS NULL OR (mime_type = ANY (ARRAY[''image/webp''::text, ''image/jpeg''::text])))"},{"name":"sale_photo_evidence_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"sale_photo_evidence_pkey","definition":"PRIMARY KEY (id)"},{"name":"sale_photo_evidence_r2_object_key_check","definition":"CHECK (r2_object_key IS NULL OR r2_object_key ~~ ''sales-evidence/7d/%''::text AND r2_object_key !~~ ''%..%''::text AND r2_object_key !~~ ''%//%''::text)"},{"name":"sale_photo_evidence_r2_object_key_identity_check","definition":"CHECK (r2_object_key IS NULL OR r2_object_key = ((((((((''sales-evidence/7d/''::text || owner_id::text) || ''/''::text) || market_id::text) || ''/''::text) || sale_id::text) || ''/''::text) || id::text) || ''.webp''::text) OR r2_object_key = ((((((((''sales-evidence/7d/''::text || owner_id::text) || ''/''::text) || market_id::text) || ''/''::text) || sale_id::text) || ''/''::text) || id::text) || ''.jpg''::text) OR r2_object_key = ((((((((''sales-evidence/7d/''::text || owner_id::text) || ''/''::text) || market_id::text) || ''/''::text) || sale_id::text) || ''/''::text) || id::text) || ''.jpeg''::text)) NOT VALID"},{"name":"sale_photo_evidence_r2_thumbnail_key_check","definition":"CHECK (r2_thumbnail_key IS NULL OR r2_thumbnail_key ~~ ''sales-evidence-thumbs/7d/%''::text AND r2_thumbnail_key !~~ ''%..%''::text AND r2_thumbnail_key !~~ ''%//%''::text)"},{"name":"sale_photo_evidence_r2_thumbnail_key_identity_check","definition":"CHECK (r2_thumbnail_key IS NULL OR r2_thumbnail_key = ((((((((''sales-evidence-thumbs/7d/''::text || owner_id::text) || ''/''::text) || market_id::text) || ''/''::text) || sale_id::text) || ''/''::text) || id::text) || ''.webp''::text) OR r2_thumbnail_key = ((((((((''sales-evidence-thumbs/7d/''::text || owner_id::text) || ''/''::text) || market_id::text) || ''/''::text) || sale_id::text) || ''/''::text) || id::text) || ''.jpg''::text) OR r2_thumbnail_key = ((((((((''sales-evidence-thumbs/7d/''::text || owner_id::text) || ''/''::text) || market_id::text) || ''/''::text) || sale_id::text) || ''/''::text) || id::text) || ''.jpeg''::text)) NOT VALID"},{"name":"sale_photo_evidence_sale_id_fkey","definition":"FOREIGN KEY (sale_id) REFERENCES events(id) ON DELETE CASCADE"},{"name":"sale_photo_evidence_status_check","definition":"CHECK (status = ANY (ARRAY[''not_required''::text, ''pending_capture''::text, ''capture_skipped''::text, ''captured_local''::text, ''uploading''::text, ''uploaded''::text, ''upload_failed''::text, ''expired''::text, ''waived_by_owner''::text]))"},{"name":"sale_photo_evidence_upload_lease_state_check","definition":"CHECK (status = ''uploading''::text AND upload_attempt_id IS NOT NULL AND upload_lease_expires_at IS NOT NULL OR status <> ''uploading''::text AND upload_lease_expires_at IS NULL)"},{"name":"sale_photo_evidence_waived_by_owner_id_fkey","definition":"FOREIGN KEY (waived_by_owner_id) REFERENCES profiles(id) ON DELETE SET NULL"},{"name":"sale_photo_evidence_width_check","definition":"CHECK (width IS NULL OR width > 0)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.snapshots','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"user_id","type":"uuid","nullable":false},{"name":"snapshot_at","type":"timestamp with time zone","nullable":false},{"name":"version","type":"integer","nullable":false},{"name":"data","type":"jsonb","nullable":false},{"name":"event_count","type":"integer","nullable":false},{"name":"last_event_id","type":"uuid","nullable":false},{"name":"data_size_bytes","type":"integer","nullable":true},{"name":"compressed_size_bytes","type":"integer","nullable":true},{"name":"compression_ratio","type":"numeric(5,2)","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[{"name":"用戶只能刪除自己的快照","check":null,"roles":["PUBLIC"],"using":"(auth.uid() = user_id)","command":"d","permissive":true},{"name":"用戶只能創建自己的快照","check":"(auth.uid() = user_id)","roles":["PUBLIC"],"using":null,"command":"a","permissive":true},{"name":"用戶只能查看自己的快照","check":null,"roles":["PUBLIC"],"using":"(auth.uid() = user_id)","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"snapshots_pkey","definition":"PRIMARY KEY (id)"},{"name":"snapshots_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"snapshots_user_version_unique","definition":"UNIQUE (user_id, version)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.staff_accessible_events','{"rls":false,"kind":"v","grants":[{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":true},{"name":"type","type":"text","nullable":true},{"name":"payload","type":"jsonb","nullable":true},{"name":"actor_id","type":"uuid","nullable":true},{"name":"market_id","type":"uuid","nullable":true},{"name":"timestamp","type":"timestamp with time zone","nullable":true},{"name":"metadata","type":"jsonb","nullable":true},{"name":"sync_status","type":"sync_status","nullable":true},{"name":"relationship_owner_id","type":"uuid","nullable":true},{"name":"permissions","type":"jsonb","nullable":true},{"name":"access_type","type":"text","nullable":true}],"forceRls":false,"policies":[],"triggers":[],"constraints":[],"viewDefinition":" SELECT id,\n    type,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(relationship_owner_id) THEN subscription_free_payload(payload)\n            WHEN access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN subscription_free_payload(subscription_staff_payload(payload))\n            WHEN access_type = ''staff''::text THEN subscription_staff_payload(payload)\n            ELSE payload\n        END AS payload,\n    actor_id,\n    market_id,\n    \"timestamp\",\n        CASE\n            WHEN access_type = ''staff''::text OR NOT subscription_read_paid(relationship_owner_id) THEN NULL::jsonb\n            ELSE metadata\n        END AS metadata,\n    sync_status,\n    relationship_owner_id,\n    permissions,\n    access_type\n   FROM ( SELECT e.id,\n            e.type,\n            sanitize_staff_event_payload(e.payload) AS payload,\n            e.actor_id,\n            e.market_id,\n            e.\"timestamp\",\n            e.metadata,\n            e.sync_status,\n            sr.owner_id AS relationship_owner_id,\n            sr.permissions,\n            ''staff''::text AS access_type\n           FROM events e\n             JOIN markets m ON m.id = e.market_id\n             JOIN staff_relationships sr ON sr.owner_id = m.owner_id\n          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND COALESCE(m.is_deleted, false) = false\n        UNION ALL\n         SELECT e.id,\n            e.type,\n            sanitize_staff_event_payload(e.payload) AS payload,\n            e.actor_id,\n            e.market_id,\n            e.\"timestamp\",\n            e.metadata,\n            e.sync_status,\n            sr.owner_id AS relationship_owner_id,\n            sr.permissions,\n            ''staff''::text AS access_type\n           FROM events e\n             JOIN staff_relationships sr ON sr.owner_id = e.actor_id\n          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND e.market_id IS NULL\n        UNION ALL\n         SELECT e.id,\n            e.type,\n            e.payload,\n            e.actor_id,\n            e.market_id,\n            e.\"timestamp\",\n            e.metadata,\n            e.sync_status,\n            e.actor_id AS relationship_owner_id,\n            ''{\"can_edit\": true, \"can_view\": true}''::jsonb AS permissions,\n            ''owner''::text AS access_type\n           FROM events e\n          WHERE e.actor_id = auth.uid() AND e.market_id IS NULL AND (EXISTS ( SELECT 1\n                   FROM markets owned_market\n                  WHERE owned_market.owner_id = auth.uid()))\n        UNION ALL\n         SELECT e.id,\n            e.type,\n            e.payload,\n            e.actor_id,\n            e.market_id,\n            e.\"timestamp\",\n            e.metadata,\n            e.sync_status,\n            m.owner_id AS relationship_owner_id,\n            ''{\"can_edit\": true, \"can_view\": true}''::jsonb AS permissions,\n            ''owner''::text AS access_type\n           FROM events e\n             JOIN markets m ON m.id = e.market_id\n          WHERE m.owner_id = auth.uid()) s\n  WHERE access_type = ''owner''::text AND relationship_owner_id = auth.uid() AND (subscription_read_paid(relationship_owner_id) OR subscription_foundation_event(type)) OR access_type = ''staff''::text AND subscription_read_staff(relationship_owner_id) AND ((COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) = ANY (ARRAY[''2''::text, ''3''::text])) OR subscription_foundation_event(type));","owner":"postgres","options":["security_barrier=true"]}'::jsonb),
('public.staff_accessible_markets','{"rls":false,"kind":"v","grants":[{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":true},{"name":"owner_id","type":"uuid","nullable":true},{"name":"name","type":"text","nullable":true},{"name":"location","type":"text","nullable":true},{"name":"start_date","type":"date","nullable":true},{"name":"end_date","type":"date","nullable":true},{"name":"status","type":"text","nullable":true},{"name":"early_entry_enabled","type":"boolean","nullable":true},{"name":"early_entry_time","type":"time without time zone","nullable":true},{"name":"check_in_time","type":"time without time zone","nullable":true},{"name":"operating_start_time","type":"time without time zone","nullable":true},{"name":"operating_end_time","type":"time without time zone","nullable":true},{"name":"registration_fee","type":"numeric(10,2)","nullable":true},{"name":"booth_cost","type":"numeric(10,2)","nullable":true},{"name":"deposit","type":"numeric(10,2)","nullable":true},{"name":"table_rental","type":"numeric(10,2)","nullable":true},{"name":"chair_rental","type":"numeric(10,2)","nullable":true},{"name":"umbrella_rental","type":"numeric(10,2)","nullable":true},{"name":"tablecloth_rental","type":"numeric(10,2)","nullable":true},{"name":"commission_rate","type":"numeric(5,2)","nullable":true},{"name":"table_free","type":"boolean","nullable":true},{"name":"chair_free","type":"boolean","nullable":true},{"name":"umbrella_free","type":"boolean","nullable":true},{"name":"tablecloth_free","type":"boolean","nullable":true},{"name":"total_revenue","type":"numeric(10,2)","nullable":true},{"name":"total_profit","type":"numeric(10,2)","nullable":true},{"name":"total_interactions","type":"integer","nullable":true},{"name":"total_deals","type":"integer","nullable":true},{"name":"notes","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true},{"name":"is_collaborative","type":"boolean","nullable":true},{"name":"operation_phase","type":"text","nullable":true},{"name":"is_deleted","type":"boolean","nullable":true},{"name":"sync_status","type":"sync_status","nullable":true},{"name":"relationship_owner_id","type":"uuid","nullable":true},{"name":"permissions","type":"jsonb","nullable":true},{"name":"access_type","type":"text","nullable":true},{"name":"sales_photo_evidence_required","type":"boolean","nullable":true},{"name":"operation_session_date","type":"date","nullable":true},{"name":"venue_id","type":"uuid","nullable":true},{"name":"schedule_id","type":"uuid","nullable":true},{"name":"session_origin","type":"text","nullable":true},{"name":"schedule_occurrence_key","type":"text","nullable":true},{"name":"schedule_revision","type":"integer","nullable":true},{"name":"schedule_occurrence_state","type":"text","nullable":true},{"name":"is_schedule_override","type":"boolean","nullable":true},{"name":"region_code","type":"text","nullable":true},{"name":"payment_deadline","type":"jsonb","nullable":true}],"forceRls":false,"policies":[],"triggers":[],"constraints":[],"viewDefinition":" SELECT id,\n    owner_id,\n    name,\n    location,\n    start_date,\n    end_date,\n    status,\n    early_entry_enabled,\n    early_entry_time,\n    check_in_time,\n    operating_start_time,\n    operating_end_time,\n    registration_fee,\n    booth_cost,\n    deposit,\n    table_rental,\n    chair_rental,\n    umbrella_rental,\n    tablecloth_rental,\n    commission_rate,\n    table_free,\n    chair_free,\n    umbrella_free,\n    tablecloth_free,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::numeric(10,2)\n            ELSE total_revenue\n        END AS total_revenue,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::numeric(10,2)\n            ELSE total_profit\n        END AS total_profit,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer\n            ELSE total_interactions\n        END AS total_interactions,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer\n            ELSE total_deals\n        END AS total_deals,\n    notes,\n    created_at,\n    updated_at,\n    is_collaborative,\n    operation_phase,\n    is_deleted,\n    sync_status,\n    relationship_owner_id,\n    permissions,\n    access_type,\n    sales_photo_evidence_required,\n    operation_session_date,\n    venue_id,\n    schedule_id,\n    session_origin,\n    schedule_occurrence_key,\n    schedule_revision,\n    schedule_occurrence_state,\n    is_schedule_override,\n    region_code,\n    payment_deadline\n   FROM ( SELECT m.id,\n            m.owner_id,\n            m.name,\n            m.location,\n            m.start_date,\n            m.end_date,\n            m.status,\n            m.early_entry_enabled,\n            m.early_entry_time,\n            m.check_in_time,\n            m.operating_start_time,\n            m.operating_end_time,\n            NULL::numeric(10,2) AS registration_fee,\n            NULL::numeric(10,2) AS booth_cost,\n            NULL::numeric(10,2) AS deposit,\n            m.table_rental,\n            m.chair_rental,\n            m.umbrella_rental,\n            m.tablecloth_rental,\n            NULL::numeric(5,2) AS commission_rate,\n            m.table_free,\n            m.chair_free,\n            m.umbrella_free,\n            m.tablecloth_free,\n            m.total_revenue,\n            NULL::numeric(10,2) AS total_profit,\n            m.total_interactions,\n            m.total_deals,\n            m.notes,\n            m.created_at,\n            m.updated_at,\n            m.is_collaborative,\n            m.operation_phase,\n            m.is_deleted,\n            m.sync_status,\n            sr.owner_id AS relationship_owner_id,\n            sr.permissions,\n            ''staff''::text AS access_type,\n            m.sales_photo_evidence_required,\n            m.operation_session_date,\n            m.venue_id,\n            m.schedule_id,\n            m.session_origin,\n            m.schedule_occurrence_key,\n            m.schedule_revision,\n            m.schedule_occurrence_state,\n            m.is_schedule_override,\n            m.region_code,\n            m.payment_deadline\n           FROM markets m\n             JOIN staff_relationships sr ON sr.owner_id = m.owner_id\n          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND COALESCE(m.is_deleted, false) = false\n        UNION ALL\n         SELECT m.id,\n            m.owner_id,\n            m.name,\n            m.location,\n            m.start_date,\n            m.end_date,\n            m.status,\n            m.early_entry_enabled,\n            m.early_entry_time,\n            m.check_in_time,\n            m.operating_start_time,\n            m.operating_end_time,\n            m.registration_fee,\n            m.booth_cost,\n            m.deposit,\n            m.table_rental,\n            m.chair_rental,\n            m.umbrella_rental,\n            m.tablecloth_rental,\n            m.commission_rate,\n            m.table_free,\n            m.chair_free,\n            m.umbrella_free,\n            m.tablecloth_free,\n            m.total_revenue,\n            m.total_profit,\n            m.total_interactions,\n            m.total_deals,\n            m.notes,\n            m.created_at,\n            m.updated_at,\n            m.is_collaborative,\n            m.operation_phase,\n            m.is_deleted,\n            m.sync_status,\n            m.owner_id AS relationship_owner_id,\n            ''{\"can_edit\": true, \"can_view\": true}''::jsonb AS permissions,\n            ''owner''::text AS access_type,\n            m.sales_photo_evidence_required,\n            m.operation_session_date,\n            m.venue_id,\n            m.schedule_id,\n            m.session_origin,\n            m.schedule_occurrence_key,\n            m.schedule_revision,\n            m.schedule_occurrence_state,\n            m.is_schedule_override,\n            m.region_code,\n            m.payment_deadline\n           FROM markets m\n          WHERE m.owner_id = auth.uid()) s\n  WHERE access_type = ''owner''::text AND owner_id = auth.uid() OR access_type = ''staff''::text AND subscription_read_staff(relationship_owner_id);","owner":"postgres","options":["security_barrier=true"]}'::jsonb),
('public.staff_accessible_products','{"rls":false,"kind":"v","grants":[{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":true},{"name":"market_id","type":"uuid","nullable":true},{"name":"name","type":"text","nullable":true},{"name":"category","type":"text","nullable":true},{"name":"price","type":"numeric(10,2)","nullable":true},{"name":"cost","type":"numeric(10,2)","nullable":true},{"name":"icon_name","type":"text","nullable":true},{"name":"color_code","type":"text","nullable":true},{"name":"stock","type":"integer","nullable":true},{"name":"unlimited_stock","type":"boolean","nullable":true},{"name":"is_active","type":"boolean","nullable":true},{"name":"total_sold","type":"integer","nullable":true},{"name":"description","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true},{"name":"owner_id","type":"uuid","nullable":true},{"name":"is_shared","type":"boolean","nullable":true},{"name":"relationship_owner_id","type":"uuid","nullable":true},{"name":"permissions","type":"jsonb","nullable":true},{"name":"access_type","type":"text","nullable":true}],"forceRls":false,"policies":[],"triggers":[],"constraints":[],"viewDefinition":" SELECT id,\n    market_id,\n    name,\n    category,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::numeric(10,2)\n            ELSE price\n        END AS price,\n    cost,\n    icon_name,\n    color_code,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer\n            ELSE stock\n        END AS stock,\n    unlimited_stock,\n    is_active,\n        CASE\n            WHEN access_type = ''owner''::text AND NOT subscription_read_paid(owner_id) OR access_type = ''staff''::text AND (COALESCE(permissions ->> ''infoLevel''::text, ''0''::text) <> ALL (ARRAY[''2''::text, ''3''::text])) THEN NULL::integer\n            ELSE total_sold\n        END AS total_sold,\n    description,\n    created_at,\n    updated_at,\n    owner_id,\n    is_shared,\n    relationship_owner_id,\n    permissions,\n    access_type\n   FROM ( SELECT p.id,\n            p.market_id,\n            p.name,\n            p.category,\n            p.price,\n            NULL::numeric(10,2) AS cost,\n            p.icon_name,\n            p.color_code,\n            p.stock,\n            p.unlimited_stock,\n            p.is_active,\n            p.total_sold,\n            p.description,\n            p.created_at,\n            p.updated_at,\n            p.owner_id,\n            p.is_shared,\n            sr.owner_id AS relationship_owner_id,\n            sr.permissions,\n            ''staff''::text AS access_type\n           FROM products p\n             JOIN staff_relationships sr ON sr.owner_id = p.owner_id\n          WHERE sr.staff_id = auth.uid() AND sr.status = ''active''::text AND p.is_active = true\n        UNION ALL\n         SELECT p.id,\n            p.market_id,\n            p.name,\n            p.category,\n            p.price,\n            p.cost,\n            p.icon_name,\n            p.color_code,\n            p.stock,\n            p.unlimited_stock,\n            p.is_active,\n            p.total_sold,\n            p.description,\n            p.created_at,\n            p.updated_at,\n            p.owner_id,\n            p.is_shared,\n            p.owner_id AS relationship_owner_id,\n            ''{\"can_edit\": true, \"can_view\": true}''::jsonb AS permissions,\n            ''owner''::text AS access_type\n           FROM products p\n          WHERE p.owner_id = auth.uid() AND p.is_active = true) s\n  WHERE access_type = ''owner''::text AND subscription_read_owner_paid(owner_id) OR access_type = ''staff''::text AND subscription_read_staff(relationship_owner_id);","owner":"postgres","options":["security_barrier=true"]}'::jsonb),
('public.staff_invitations','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"token","type":"text","nullable":false},{"name":"expires_at","type":"timestamp with time zone","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":true}],"forceRls":false,"policies":[{"name":"Owners can view their invitations","check":null,"roles":["PUBLIC"],"using":"(auth.uid() = owner_id)","command":"r","permissive":true}],"triggers":[],"constraints":[{"name":"staff_invitations_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"staff_invitations_pkey","definition":"PRIMARY KEY (id)"},{"name":"staff_invitations_token_key","definition":"UNIQUE (token)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.staff_relationships','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"staff_id","type":"uuid","nullable":false},{"name":"staff_email","type":"text","nullable":false},{"name":"invited_at","type":"timestamp with time zone","nullable":true},{"name":"accepted_at","type":"timestamp with time zone","nullable":true},{"name":"status","type":"text","nullable":false},{"name":"permissions","type":"jsonb","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true},{"name":"role","type":"text","nullable":false}],"forceRls":false,"policies":[{"name":"Owners can view their staff","check":null,"roles":["authenticated"],"using":"(auth.uid() = owner_id)","command":"r","permissive":true},{"name":"Staff can view their relationships","check":null,"roles":["authenticated"],"using":"((auth.uid() = staff_id) AND can_current_staff_read_relationship(owner_id, status))","command":"r","permissive":true},{"name":"老闆或員工可以刪除員工關係","check":null,"roles":["PUBLIC"],"using":"((auth.uid() = owner_id) OR (auth.uid() = staff_id))","command":"d","permissive":true}],"triggers":[{"name":"staff_role_permission_consistency","definition":"CREATE TRIGGER staff_role_permission_consistency BEFORE INSERT OR UPDATE OF role, permissions ON staff_relationships FOR EACH ROW EXECUTE FUNCTION guard_staff_role_permission_consistency()"},{"name":"trigger_update_staff_relationships_timestamp","definition":"CREATE TRIGGER trigger_update_staff_relationships_timestamp BEFORE UPDATE ON staff_relationships FOR EACH ROW EXECUTE FUNCTION update_staff_relationships_timestamp()"}],"constraints":[{"name":"no_self_invite","definition":"CHECK (owner_id <> staff_id)"},{"name":"staff_relationships_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"staff_relationships_owner_id_staff_id_key","definition":"UNIQUE (owner_id, staff_id)"},{"name":"staff_relationships_pkey","definition":"PRIMARY KEY (id)"},{"name":"staff_relationships_role_check","definition":"CHECK (role = ANY (ARRAY[''viewer''::text, ''operator''::text, ''manager''::text]))"},{"name":"staff_relationships_staff_id_fkey","definition":"FOREIGN KEY (staff_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"staff_relationships_status_check","definition":"CHECK (status = ANY (ARRAY[''pending''::text, ''active''::text, ''suspended_by_plan''::text, ''revoked''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.subscription_accounts','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"owner_id","type":"uuid","nullable":false},{"name":"plan_code","type":"text","nullable":false},{"name":"plan_source","type":"text","nullable":false},{"name":"billing_status","type":"text","nullable":false},{"name":"entitlement_status","type":"text","nullable":false},{"name":"entitlement_ends_at","type":"timestamp with time zone","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"sync_team_plan_staff_suspension","definition":"CREATE TRIGGER sync_team_plan_staff_suspension AFTER INSERT OR DELETE OR UPDATE ON subscription_accounts FOR EACH ROW EXECUTE FUNCTION sync_team_plan_staff_suspension()"},{"name":"update_subscription_accounts_updated_at","definition":"CREATE TRIGGER update_subscription_accounts_updated_at BEFORE UPDATE ON subscription_accounts FOR EACH ROW EXECUTE FUNCTION touch_subscription_accounts_updated_at()"}],"constraints":[{"name":"subscription_accounts_billing_status_check","definition":"CHECK (billing_status = ANY (ARRAY[''none''::text, ''trialing''::text, ''active''::text, ''past_due''::text, ''cancel_at_period_end''::text, ''cancelled''::text, ''refunded''::text, ''disputed''::text, ''unknown''::text]))"},{"name":"subscription_accounts_entitlement_status_check","definition":"CHECK (entitlement_status = ANY (ARRAY[''active''::text, ''grace''::text, ''inactive''::text, ''unknown''::text]))"},{"name":"subscription_accounts_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"subscription_accounts_pkey","definition":"PRIMARY KEY (owner_id)"},{"name":"subscription_accounts_plan_code_check","definition":"CHECK (plan_code = ANY (ARRAY[''free''::text, ''pro''::text, ''team''::text]))"},{"name":"subscription_accounts_plan_source_check","definition":"CHECK (plan_source = ANY (ARRAY[''free''::text, ''admin''::text, ''promotion''::text, ''billing''::text]))"},{"name":"subscription_accounts_source_shape_check","definition":"CHECK (plan_source = ''free''::text AND plan_code = ''free''::text AND billing_status = ''none''::text AND entitlement_status = ''active''::text AND entitlement_ends_at IS NULL OR plan_source = ''admin''::text AND (plan_code = ANY (ARRAY[''pro''::text, ''team''::text])) AND billing_status = ''none''::text OR plan_source = ''promotion''::text AND plan_code = ''pro''::text AND billing_status = ''none''::text AND entitlement_ends_at IS NOT NULL OR plan_source = ''billing''::text AND (plan_code = ANY (ARRAY[''pro''::text, ''team''::text])))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.subscription_price_assignments','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"storefront_price_mapping_id","type":"uuid","nullable":false},{"name":"price_version_id","type":"text","nullable":false},{"name":"assigned_plan_code","type":"text","nullable":false},{"name":"assigned_cadence","type":"text","nullable":false},{"name":"assigned_currency","type":"text","nullable":false},{"name":"assigned_amount_minor","type":"bigint","nullable":false},{"name":"price_policy","type":"text","nullable":false},{"name":"founder_offer_code","type":"text","nullable":true},{"name":"founder_lock_status","type":"text","nullable":true},{"name":"assignment_source","type":"text","nullable":false},{"name":"source_reference","type":"text","nullable":false},{"name":"continuity_started_at","type":"timestamp with time zone","nullable":false},{"name":"assigned_at","type":"timestamp with time zone","nullable":false},{"name":"dormant_at","type":"timestamp with time zone","nullable":true},{"name":"forfeited_at","type":"timestamp with time zone","nullable":true},{"name":"forfeiture_reason","type":"text","nullable":true},{"name":"superseded_at","type":"timestamp with time zone","nullable":true},{"name":"last_transition_at","type":"timestamp with time zone","nullable":false},{"name":"last_transition_reason","type":"text","nullable":false},{"name":"last_transition_evidence_reference","type":"text","nullable":false},{"name":"assignment_revision","type":"bigint","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"enforce_subscription_price_assignment_write","definition":"CREATE TRIGGER enforce_subscription_price_assignment_write BEFORE INSERT OR UPDATE ON subscription_price_assignments FOR EACH ROW EXECUTE FUNCTION enforce_subscription_price_assignment_write()"}],"constraints":[{"name":"subscription_price_assignments_amount_check","definition":"CHECK (assigned_amount_minor > 0 AND assigned_amount_minor <= ''9007199254740991''::bigint)"},{"name":"subscription_price_assignments_cadence_check","definition":"CHECK (assigned_cadence = ANY (ARRAY[''monthly''::text, ''annual''::text]))"},{"name":"subscription_price_assignments_currency_check","definition":"CHECK (assigned_currency = ''TWD''::text)"},{"name":"subscription_price_assignments_lock_status_check","definition":"CHECK (founder_lock_status IS NULL OR (founder_lock_status = ANY (ARRAY[''active''::text, ''grace''::text, ''dormant''::text, ''forfeited''::text])))"},{"name":"subscription_price_assignments_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT"},{"name":"subscription_price_assignments_pkey","definition":"PRIMARY KEY (id)"},{"name":"subscription_price_assignments_plan_check","definition":"CHECK (assigned_plan_code = ANY (ARRAY[''pro''::text, ''team''::text]))"},{"name":"subscription_price_assignments_policy_check","definition":"CHECK (price_policy = ANY (ARRAY[''standard''::text, ''founder_locked''::text]))"},{"name":"subscription_price_assignments_policy_shape_check","definition":"CHECK (price_policy = ''standard''::text AND founder_offer_code IS NULL AND founder_lock_status IS NULL AND dormant_at IS NULL AND forfeited_at IS NULL AND forfeiture_reason IS NULL OR price_policy = ''founder_locked''::text AND assigned_plan_code = ''pro''::text AND assigned_cadence = ''annual''::text AND founder_offer_code = ''pro_founder_annual_65''::text AND founder_lock_status IS NOT NULL AND (founder_lock_status <> ''dormant''::text OR dormant_at IS NOT NULL) AND (founder_lock_status <> ''forfeited''::text OR forfeited_at IS NOT NULL AND forfeiture_reason IS NOT NULL) AND (founder_lock_status = ''forfeited''::text OR forfeited_at IS NULL AND forfeiture_reason IS NULL))"},{"name":"subscription_price_assignments_price_version_id_fkey","definition":"FOREIGN KEY (price_version_id) REFERENCES subscription_price_versions(id) ON DELETE RESTRICT"},{"name":"subscription_price_assignments_reference_length_check","definition":"CHECK (length(btrim(source_reference)) >= 1 AND length(btrim(source_reference)) <= 1000 AND source_reference = btrim(source_reference) AND length(btrim(last_transition_reason)) >= 1 AND length(btrim(last_transition_reason)) <= 120 AND last_transition_reason = btrim(last_transition_reason) AND length(btrim(last_transition_evidence_reference)) >= 1 AND length(btrim(last_transition_evidence_reference)) <= 1000 AND last_transition_evidence_reference = btrim(last_transition_evidence_reference) AND (forfeiture_reason IS NULL OR length(btrim(forfeiture_reason)) >= 1 AND length(btrim(forfeiture_reason)) <= 120 AND forfeiture_reason = btrim(forfeiture_reason)))"},{"name":"subscription_price_assignments_revision_check","definition":"CHECK (assignment_revision > 0)"},{"name":"subscription_price_assignments_source_check","definition":"CHECK (assignment_source = ANY (ARRAY[''billing''::text, ''migration''::text]))"},{"name":"subscription_price_assignments_storefront_price_mapping_id_fkey","definition":"FOREIGN KEY (storefront_price_mapping_id) REFERENCES billing_storefront_price_mappings(id) ON DELETE RESTRICT"},{"name":"subscription_price_assignments_time_order_check","definition":"CHECK (assigned_at >= continuity_started_at AND last_transition_at >= assigned_at AND (dormant_at IS NULL OR dormant_at >= assigned_at) AND (forfeited_at IS NULL OR forfeited_at >= assigned_at) AND (superseded_at IS NULL OR superseded_at >= assigned_at))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.subscription_price_versions','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"text","nullable":false},{"name":"plan_code","type":"text","nullable":false},{"name":"cadence","type":"text","nullable":false},{"name":"currency","type":"text","nullable":false},{"name":"amount_minor","type":"bigint","nullable":false},{"name":"price_policy","type":"text","nullable":false},{"name":"offer_code","type":"text","nullable":true},{"name":"commercial_status","type":"text","nullable":false},{"name":"effective_at","type":"timestamp with time zone","nullable":true},{"name":"retired_at","type":"timestamp with time zone","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"enforce_subscription_price_version_update","definition":"CREATE TRIGGER enforce_subscription_price_version_update BEFORE UPDATE ON subscription_price_versions FOR EACH ROW EXECUTE FUNCTION enforce_subscription_price_version_update()"}],"constraints":[{"name":"subscription_price_versions_amount_check","definition":"CHECK (amount_minor > 0 AND amount_minor <= ''9007199254740991''::bigint)"},{"name":"subscription_price_versions_cadence_check","definition":"CHECK (cadence = ANY (ARRAY[''monthly''::text, ''annual''::text]))"},{"name":"subscription_price_versions_currency_check","definition":"CHECK (currency = ''TWD''::text)"},{"name":"subscription_price_versions_id_check","definition":"CHECK (length(id) >= 3 AND length(id) <= 96 AND id ~ ''^[a-z0-9]+(_[a-z0-9]+)*$''::text)"},{"name":"subscription_price_versions_offer_shape_check","definition":"CHECK (price_policy = ''standard''::text AND offer_code IS NULL OR price_policy = ''founder_locked''::text AND plan_code = ''pro''::text AND cadence = ''annual''::text AND offer_code = ''pro_founder_annual_65''::text)"},{"name":"subscription_price_versions_pkey","definition":"PRIMARY KEY (id)"},{"name":"subscription_price_versions_plan_check","definition":"CHECK (plan_code = ANY (ARRAY[''pro''::text, ''team''::text]))"},{"name":"subscription_price_versions_policy_check","definition":"CHECK (price_policy = ANY (ARRAY[''standard''::text, ''founder_locked''::text]))"},{"name":"subscription_price_versions_status_check","definition":"CHECK (commercial_status = ANY (ARRAY[''candidate''::text, ''active''::text, ''retired''::text]))"},{"name":"subscription_price_versions_status_shape_check","definition":"CHECK (commercial_status = ''candidate''::text AND effective_at IS NULL AND retired_at IS NULL OR commercial_status = ''active''::text AND effective_at IS NOT NULL AND retired_at IS NULL OR commercial_status = ''retired''::text AND retired_at IS NOT NULL AND (effective_at IS NULL OR retired_at >= effective_at))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.subscription_read_guard_settings','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"singleton","type":"boolean","nullable":false},{"name":"enforce_all","type":"boolean","nullable":false}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"subscription_read_guard_settings_pkey","definition":"PRIMARY KEY (singleton)"},{"name":"subscription_read_guard_settings_singleton_check","definition":"CHECK (singleton)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.subscription_test_switch_audit','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"id","type":"bigint","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"plan_code","type":"text","nullable":true},{"name":"expires_at","type":"timestamp with time zone","nullable":true},{"name":"changed_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"subscription_test_switch_audit_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"subscription_test_switch_audit_pkey","definition":"PRIMARY KEY (id)"},{"name":"subscription_test_switch_audit_plan_code_check","definition":"CHECK (plan_code = ANY (ARRAY[''free''::text, ''pro''::text, ''team''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.subscription_write_guard_owners','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"owner_id","type":"uuid","nullable":false},{"name":"enabled","type":"boolean","nullable":false},{"name":"allow_test_switch","type":"boolean","nullable":false},{"name":"test_plan_code","type":"text","nullable":true},{"name":"test_expires_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":false}],"forceRls":false,"policies":[],"triggers":[{"name":"sync_team_override_staff_suspension","definition":"CREATE TRIGGER sync_team_override_staff_suspension AFTER INSERT OR DELETE OR UPDATE ON subscription_write_guard_owners FOR EACH ROW EXECUTE FUNCTION sync_team_plan_staff_suspension()"}],"constraints":[{"name":"subscription_write_guard_owners_check","definition":"CHECK ((test_plan_code IS NULL) = (test_expires_at IS NULL))"},{"name":"subscription_write_guard_owners_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE CASCADE"},{"name":"subscription_write_guard_owners_pkey","definition":"PRIMARY KEY (owner_id)"},{"name":"subscription_write_guard_owners_test_plan_code_check","definition":"CHECK (test_plan_code = ANY (ARRAY[''free''::text, ''pro''::text, ''team''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.subscription_write_guard_settings','{"rls":true,"kind":"r","grants":[{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"}],"columns":[{"name":"singleton","type":"boolean","nullable":false},{"name":"enforce_all","type":"boolean","nullable":false}],"forceRls":false,"policies":[],"triggers":[],"constraints":[{"name":"subscription_write_guard_settings_pkey","definition":"PRIMARY KEY (singleton)"},{"name":"subscription_write_guard_settings_singleton_check","definition":"CHECK (singleton)"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.user_settings','{"rls":true,"kind":"r","grants":[{"grantee":"anon","privilege":"DELETE"},{"grantee":"anon","privilege":"INSERT"},{"grantee":"anon","privilege":"REFERENCES"},{"grantee":"anon","privilege":"SELECT"},{"grantee":"anon","privilege":"TRIGGER"},{"grantee":"anon","privilege":"TRUNCATE"},{"grantee":"anon","privilege":"UPDATE"},{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"user_id","type":"uuid","nullable":false},{"name":"quick_action_buttons","type":"jsonb","nullable":true},{"name":"theme","type":"text","nullable":true},{"name":"language","type":"text","nullable":true},{"name":"created_at","type":"timestamp with time zone","nullable":true},{"name":"updated_at","type":"timestamp with time zone","nullable":true},{"name":"brand_name","type":"text","nullable":true},{"name":"default_sales_photo_evidence_required","type":"boolean","nullable":false}],"forceRls":false,"policies":[{"name":"Users can delete own settings","check":null,"roles":["PUBLIC"],"using":"(auth.uid() = user_id)","command":"d","permissive":true},{"name":"Users can insert own settings","check":"(auth.uid() = user_id)","roles":["PUBLIC"],"using":null,"command":"a","permissive":true},{"name":"Users can update own settings","check":"(auth.uid() = user_id)","roles":["PUBLIC"],"using":"(auth.uid() = user_id)","command":"w","permissive":true},{"name":"Users can view own settings","check":null,"roles":["PUBLIC"],"using":"(auth.uid() = user_id)","command":"r","permissive":true}],"triggers":[{"name":"update_user_settings_updated_at","definition":"CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()"}],"constraints":[{"name":"user_settings_pkey","definition":"PRIMARY KEY (user_id)"},{"name":"user_settings_theme_check","definition":"CHECK (theme = ANY (ARRAY[''light''::text, ''dark''::text, ''auto''::text]))"},{"name":"user_settings_user_id_fkey","definition":"FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb),
('public.venues','{"rls":true,"kind":"r","grants":[{"grantee":"authenticated","privilege":"DELETE"},{"grantee":"authenticated","privilege":"INSERT"},{"grantee":"authenticated","privilege":"REFERENCES"},{"grantee":"authenticated","privilege":"SELECT"},{"grantee":"authenticated","privilege":"TRIGGER"},{"grantee":"authenticated","privilege":"TRUNCATE"},{"grantee":"authenticated","privilege":"UPDATE"},{"grantee":"postgres","privilege":"DELETE"},{"grantee":"postgres","privilege":"INSERT"},{"grantee":"postgres","privilege":"REFERENCES"},{"grantee":"postgres","privilege":"SELECT"},{"grantee":"postgres","privilege":"TRIGGER"},{"grantee":"postgres","privilege":"TRUNCATE"},{"grantee":"postgres","privilege":"UPDATE"},{"grantee":"service_role","privilege":"DELETE"},{"grantee":"service_role","privilege":"INSERT"},{"grantee":"service_role","privilege":"REFERENCES"},{"grantee":"service_role","privilege":"SELECT"},{"grantee":"service_role","privilege":"TRIGGER"},{"grantee":"service_role","privilege":"TRUNCATE"},{"grantee":"service_role","privilege":"UPDATE"}],"columns":[{"name":"id","type":"uuid","nullable":false},{"name":"owner_id","type":"uuid","nullable":false},{"name":"name","type":"text","nullable":false},{"name":"address","type":"text","nullable":true},{"name":"location_note","type":"text","nullable":true},{"name":"status","type":"text","nullable":false},{"name":"is_deleted","type":"boolean","nullable":false},{"name":"created_at","type":"timestamp with time zone","nullable":false},{"name":"updated_at","type":"timestamp with time zone","nullable":false},{"name":"region_code","type":"text","nullable":true}],"forceRls":false,"policies":[{"name":"venues_owner_insert","check":"((owner_id = auth.uid()) AND can_manage_recurring_operations())","roles":["authenticated"],"using":null,"command":"a","permissive":true},{"name":"venues_owner_select","check":null,"roles":["authenticated"],"using":"((owner_id = auth.uid()) AND can_manage_recurring_operations())","command":"r","permissive":true},{"name":"venues_owner_update","check":"((owner_id = auth.uid()) AND can_manage_recurring_operations())","roles":["authenticated"],"using":"((owner_id = auth.uid()) AND can_manage_recurring_operations())","command":"w","permissive":true}],"triggers":[{"name":"guard_venue_region_change","definition":"CREATE TRIGGER guard_venue_region_change BEFORE INSERT OR UPDATE ON venues FOR EACH ROW EXECUTE FUNCTION guard_market_region_change()"}],"constraints":[{"name":"venues_name_check","definition":"CHECK (length(btrim(name)) > 0)"},{"name":"venues_owner_id_fkey","definition":"FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE"},{"name":"venues_pkey","definition":"PRIMARY KEY (id)"},{"name":"venues_region_code_check","definition":"CHECK (market_region_code_is_valid(region_code))"},{"name":"venues_status_check","definition":"CHECK (status = ANY (ARRAY[''active''::text, ''archived''::text]))"}],"viewDefinition":null,"owner":"postgres","options":null}'::jsonb))SELECT 1 FROM expected e LEFT JOIN pg_class c ON c.oid=to_regclass(e.identity)
   WHERE c.oid IS NULL OR e.d->>'kind'IS DISTINCT FROM c.relkind::text OR(e.d->>'rls')::boolean IS DISTINCT FROM c.relrowsecurity OR(e.d->>'forceRls')::boolean IS DISTINCT FROM c.relforcerowsecurity OR e.d->>'owner'IS DISTINCT FROM c.relowner::regrole::text OR e.d->'options'IS DISTINCT FROM coalesce(to_jsonb(c.reloptions),'null')
   OR e.d->'columns'IS DISTINCT FROM(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull)ORDER BY a.attnum)FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)
   OR e.d->'constraints'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid,true))ORDER BY x.conname),'[]')FROM pg_constraint x WHERE x.conrelid=c.oid)
   OR e.d->'triggers'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,true))ORDER BY t.tgname),'[]')FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
   OR EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal AND t.tgenabled<>'O')
   OR e.d->'policies'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'roles',(SELECT jsonb_agg(name ORDER BY name)FROM(SELECT CASE WHEN v=0 THEN 'PUBLIC'ELSE pg_get_userbyid(v)END AS name FROM unnest(p.polroles)v)roles),'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY p.polname),'[]')FROM pg_policy p WHERE p.polrelid=c.oid)
   OR e.d->'grants'IS DISTINCT FROM(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',g.grantee,'privilege',g.privilege_type)ORDER BY g.grantee,g.privilege_type),'[]')FROM information_schema.table_privileges g WHERE g.table_schema='public'AND g.table_name=c.relname)
   OR e.d->>'viewDefinition'IS DISTINCT FROM CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END)
   THEN RAISE EXCEPTION 'deletion_migration_baseline_relations';END IF;
  WITH expected(sig,h,config,definer,owner_name,normalize_095,grants)AS(VALUES ('public.accept_invitation_and_bind(text, uuid)','5fc49540a811c07a7e7dd080d5784a10','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.accept_staff_email_invitation(uuid)','abbbbd3b002231704d9a2698bc9e133a','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.apply_journal_checklist(uuid, uuid, integer, uuid, jsonb)','0a04095616f90cceafc7ec20bb4afcb5','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.apply_preparation_template(uuid, uuid, uuid, integer, uuid[])','ca91ad0e809155ac776e9d40ef672484','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.apply_venue_region_change(uuid, jsonb, text)','6086a98f0418adcb55285e8b9fc005b3','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.audit_account_deletion_request_transition()','bad4129d7221f36325940ca4d6db3fdd','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.auto_add_staff_to_new_market()','eb7ea7cb7900d092bad68a1f890bea9f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.backfill_market_regions(uuid, jsonb)','82b2ec29df7e21751c647a29e7e58392','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_claim_account_deletion_lease(uuid, text, timestamp with time zone, integer)','a53df30c681e7d28ed47903c22dc6192','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_claim_sale_photo_evidence_upload(uuid, uuid, uuid, uuid, uuid, uuid, timestamp with time zone)','5de79264050016aca38b865983f528cd','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_create_account_deletion_request(uuid, text, text, text, text)','61d4cfbc151ba0a731ee830c236de915','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_finalize_account_deletion(uuid, text)','7bd2f2f8494a14e1381a626fa1a09c88','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_finalize_sale_photo_evidence_delete(uuid, uuid, text, text)','e008773f8d041039e4c61af187f2de0b','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_finalize_sale_photo_evidence_expiration(uuid, text, text)','d65250d3b5f13e143d5da88879473802','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_finalize_sale_photo_evidence_upload(uuid, uuid, uuid, uuid, uuid, uuid, text, text, text, integer, integer, integer, timestamp with time zone, timestamp with time zone, timestamp with time zone)','bd9225debbbf446d537e3a0ae72f3a8a','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_list_expired_sale_photo_evidence(integer)','3fc81270f85dddcc1dd30c41767bbde0','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_mark_sale_photo_evidence_upload_failed(uuid, uuid, uuid, uuid, uuid, uuid, text)','7e01c92178a8dc29cd9b8289ad259f3f','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_prepare_sale_photo_evidence_delete(uuid, uuid)','cd84335a7125c6c7e847f128ca7bb491','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_read_account_deletion_request(uuid)','c94ff96329f305a28fd1022352b65070','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_record_account_deletion_step(uuid, text, text, text, integer, text, text)','b85ed35f52693bd012e26997be8711fc','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.bff_release_account_deletion_lease(uuid, text)','5c08e8845411ceadd46255ded6811a38','["search_path=\"\""]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.can_current_staff_read_relationship(uuid, text)','4d2d2312305a481bc1ff7e03e51f76a0','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.can_manage_preparation_templates(uuid)','c3772a6eebf168185ce538c05fac2eb4','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.can_manage_recurring_operations()','d331bd8cd03d6197ad3e6286fdeea179','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.check_subscription_read_for_actor(uuid, uuid, text)','581d0670d76bc49d2ef976c059648eca','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.check_subscription_write_access(uuid, text)','865d0321343d7109bb91e1aee2c2e1c4','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.check_subscription_write_for_actor(uuid, uuid, text)','297e06c408dbdb149e65130137c49147','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.check_user_market_permission(uuid, text)','460bec16e5cb8cd4f6a15e991b1d025d','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.claim_product_cover_photo_upload(uuid, uuid, uuid, bigint, integer, bigint)','45947c49ef5394e44815c65d09baabea','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.claim_product_cover_photo_upload(uuid, uuid, uuid, bigint, integer, bigint, boolean)','dd95821f1c08d2f03c2f1ee77a532be4','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.cleanup_expired_invitations()','a647d322b26ae077aa154ba6a9c91429','null'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.cleanup_old_snapshots(uuid)','8acd35d91782110158bba12838f23b35','["search_path=\"\""]'::jsonb,true,'postgres',true,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.create_staff_invitation()','5b62364ac5d4389315d162ad299a41f0','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.current_user_market_ids()','8de63e70a23b4a00c15eb28fdc2ed002','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.current_user_owned_market_ids()','e33ce1e21e1d24fd8563bbd5d8590ed0','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.deal_projection_delta(uuid, uuid, text, jsonb)','2c8f7c5383928d9f204fdfa31ffb66ed','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.deal_projection_number(jsonb[])','5c1d309712bbd502a159a479f6a58e49','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.deal_projection_totals(jsonb)','cff1108da753f73b50baa44fb7bc6ffa','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.decline_staff_email_invitation(uuid)','b7a53f2c3dcf5842ebb73b279d63166a','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.delete_current_user_app_data()','e6bce51a1724c79c9a1fb16df8f67836','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.delete_product_cover_photo(uuid, uuid)','8e87b218245816a2acd404c59b06a4fe','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.delete_revoked_staff_relationship(uuid)','af1d2b6de21956b3ccb7bf75ef3f82d2','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.delete_staff_invitation(uuid)','940959138c2206928783c501f943731d','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.drain_checklist_toggle_pending_operation(text)','4982ded201bff6be0a09e9f28b121361','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_account_deletion_request_transition()','a6d4cbd0386489830b0481436acf0eed','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_billing_event_inbox_write()','9ecea036e2b3baa3c63c7a79e6ade421','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_billing_reconciliation_run_write()','2b81e4793b6a568a19ff5a4ac2b17568','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_billing_storefront_mapping_update()','5cf6eaf7a984b83432f93a3148b61583','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_billing_subscription_snapshot_write()','cb7e04e28d5e493e711470da14c01384','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_billing_transaction_write()','1e40bf63207f63d9992d7bd2e64ae622','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_event_actor_authorization()','d485f4af99f81405dc9f6966aa3c7215','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_subscription_event_write()','e9c34f0ae1deda44dd54bd0941babdc1','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_subscription_market_summary()','67770a5b6bff26a3043cc0c99dacfa4b','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_subscription_price_assignment_write()','293247c8651bca06ba8ef5ea33ecf407','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_subscription_price_version_update()','e1c405554e7856562d1ad1feeb83f2a5','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enforce_subscription_row_write()','4394ab510223f3e81e75bffecae3066f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.enqueue_checklist_toggle_pending_operation(text, uuid, text, boolean, text)','3a242c3b2ef600b63fd158e19b18a331','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.finalize_product_cover_photo_upload(uuid, uuid, uuid, bigint, text, text, text, text, text, text, integer, integer, integer, integer)','1792e2e000f1c867c71b92ae17e44692','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.finalize_product_cover_photo_upload(uuid, uuid, uuid, bigint, text, text, text, text, text, text, integer, integer, integer, integer, boolean)','d54dc962ca95043660fb68a61122875f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.financial_review_day(jsonb, timestamp with time zone)','11bfb62ececadb4f454bfab4571196f0','["search_path=pg_catalog"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.financial_review_number(jsonb)','55e95f9402bf9186c8c5e872794c8824','["search_path=pg_catalog"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.financial_review_source(uuid)','e47acc696b31ee2d091a7cb5829d974f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.generate_invite_code(uuid)','541d9f0724134e9597f90ad0bbe3b67d','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.get_latest_snapshot(uuid)','0683d4eb751ae5148c72624b63c0e7d8','["search_path=\"\""]'::jsonb,true,'postgres',true,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.get_market_members(uuid)','34481a411007d49fa54bbfad3475072e','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.get_my_owners()','5e138356d6e09a1d74f8c6d32c5f5882','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.get_my_staff()','da2825389f6cb75912f7ab35e777c241','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.guard_cash_schedule_snapshot()','7b9249e3ce86dd4c2a43d7e5d3732e22','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.guard_journal_schedule_snapshot()','2b3d5170af8ec2649d4fe067c866269f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.guard_market_payment_deadline_change()','84543d40989425f84217df540070d65c','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.guard_market_region_change()','87d18c5a849f821a55653e578d7484db','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.guard_recurring_operations_event()','b173879d5078d2e76df869bdfa4c815f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.guard_staff_role_permission_consistency()','b4f75db2d8b7933cb9d4f9edc8198ced','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.handle_new_user()','93d8283f5532b1dc79f35b5d1c2f823f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.has_authoritative_team_entitlement(uuid)','0b0912104484d3f462735b938c0ee299','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.invite_staff_member(text)','2bfabc7198ed60b0de855c8ede2e8469','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.is_sale_photo_evidence_sale_event(uuid, uuid, uuid)','444e4f57b885e57febaf98034d4944a2','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.is_staff_of(uuid)','9ba9d0fed33aba6e5c3dc7288159ef13','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.join_market_by_code(text)','2d02266a5a180d58adbab5557251cfe7','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.leave_current_staff_team(uuid)','edfc2305e1275d03d8a67ea81ec807ad','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.list_owner_pending_operation_diagnostics(uuid)','464aeba9e99f6f514a718d5adb215e0d','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.mark_product_cover_photo_upload_failed(uuid, uuid, uuid, text)','7ed3f7b64df7a3eba7637b274bdfda3a','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.market_cash_point_cents(jsonb)','aadf08e38e1c27d7b728a815eed51223','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.market_payment_deadline_is_valid(jsonb)','887f94e301349ee1d04b7f4b1b7006ae','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.market_region_code_is_valid(text)','bede09eeecb66cb4760a785e18c3a0c5','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.prevent_account_deletion_audit_mutation()','4befce9dc54d9607b3e621422a603acb','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.prevent_f3b_billing_ledger_delete()','b5aed31abd01a80c527d880c087b81bc','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.preview_venue_region_change(uuid)','0230fd4dba4be75386578c29eabb4c35','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.product_cover_photo_write_allowed(uuid, uuid)','fa9d5b0464c34d5ecd1174b002be53a6','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.project_market_payment_deadline_event()','ca1708d6ad540470616c114aa16f0cbe','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.project_market_region_event()','827d388be1b0c6c12a7b987e1e9ece78','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.project_recurring_operations_event()','c955e6fb15236ac73781a830404547fd','["search_path=public, pg_temp"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.read_market_cash_sales(uuid)','5312ca2e9d083015b15e69cb31ee2106','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.read_market_financial_reviews(uuid[])','5b6fe943671304573f0ad824e11fcbe9','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.read_subscription_account_for_actor(uuid, uuid)','e663d1b5940ce043b1a84f285216fd93','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.read_subscription_data_scope()','65b2fe0e2b3c9730667aa309f053f5bf','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.read_subscription_test_switch(uuid)','32783f48eacce65575f82e3f534db5fc','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.recover_stale_processing_pending_operation(text)','70e62db6a2d823acf03ba92924748211','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.reject_billing_customer_link_mutation()','d7380a0097c65cf55434866d75dd4478','["search_path=\"\""]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.remove_team_member(uuid, uuid)','4cc6e5e829b05d6106e57842ade17130','["search_path=public"]'::jsonb,true,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.restore_staff_relationship(uuid)','ab8d22e7dbc059b0b12924ee4f9f7192','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.revoke_staff_member(uuid)','46bec4f31c2144c8ab2baa7eae5d3172','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.revoke_staff_relationship(uuid)','493df244edef15128ad69015f988cf68','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.sanitize_staff_event_payload(jsonb)','677ad4b3b9e702d229de65d0198eb0b5','["search_path=public"]'::jsonb,false,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.save_market_cash_record(uuid, date, jsonb, integer, uuid)','a6fb19493915c259b61497e932b2c499','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.save_market_cash_record_v2(uuid, date, jsonb, integer, uuid)','9cce1c5c0cbed768f8bdb5a59e4bfb7e','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.save_market_financial_review(uuid, text, text, numeric, jsonb, text, integer, uuid)','2af1391f56830fca19b1de44b91d9c54','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.save_market_journal(uuid, uuid, date, text, integer, uuid, boolean)','d6e78d008b61407ff0eaa7ec849d3d4a','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.save_preparation_template(uuid, uuid, text, jsonb, integer, uuid, boolean)','b39fee280978a2f4fd6a1b907b24b1a5','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.set_subscription_test_switch(uuid, text, boolean)','401ec99c42d90a6b34e81d00c93494ba','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.staff_team_access_from_source_rows(jsonb, jsonb, timestamp with time zone)','6b1e2736d596b538697d672da0a58758','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_effective_plan(uuid)','4f826c2f913cf4559aed96a7279540da','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_foundation_event(text)','2fa4e42b4d04bcf6462251b28da6abe2','["search_path=pg_catalog"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_free_payload(jsonb)','4ea0522dd87c278212cf2066d1c97ac2','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_mask_json(jsonb, text[])','b7df19962973162c61ba3593a1f6398f','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_read_guard_active(uuid)','dc62e55f989d20072e753bde60fbac67','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_read_owner_advanced(uuid)','a927be7ec260e4dd6cc0ffaa7fd8305e','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_read_owner_paid(uuid)','6c937a9080835b9b596d3067bcbdd882','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_read_paid(uuid)','7bdb3edb9503a018b5e847f7fdf66c44','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_read_staff(uuid)','f3e46f8311f2ab0d30c7c94d60a2405f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_require_tier(uuid, integer)','f845b70177bc10d60b09fc094a51dfa6','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_staff_payload(jsonb)','cb6868c7cd476e096e34b7f31ebb5ce7','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.subscription_write_guard_active(uuid)','58161892442e0d216cf7b86f7aa5515f','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.suspend_owner_staff_for_plan(uuid)','a6e9b6241189059789865ac046ae4bc1','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.sync_team_plan_staff_suspension()','88fef3516c2143016d7a39dedf6f5e46','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.touch_subscription_accounts_updated_at()','ff51a18ec5a89f2d36fbab46ad2a33fe','["search_path=pg_catalog, public"]'::jsonb,false,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.update_market_operation_session_read_model()','22fec99668d26608a7cf3e4ce597e327','["search_path=public, pg_temp"]'::jsonb,true,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.update_market_read_model()','eb6f6958f6b0b3154fb0d24b88daf9dc','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.update_product_read_model()','eda1d3e1ab354c2c44c72fbcb58075d8','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.update_staff_permissions(uuid, jsonb)','759b221404835af7f6b17553f59456aa','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.update_staff_relationships_timestamp()','2ab23c99850d0906b2ab1aac3f400a14','null'::jsonb,false,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.update_staff_role(uuid, text)','b9e5c0169fdbed237d28d336f75e293a','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.update_updated_at_column()','b3a966fa88bdacdafefb2ff2b8b8779a','null'::jsonb,false,'postgres',false,'[{"role":"PUBLIC","grantable":false,"privilege":"EXECUTE"},{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb),
('public.verify_invitation_token(text)','0103aa51ae8630fe041f08a148576245','["search_path=pg_catalog, public"]'::jsonb,true,'postgres',false,'[{"role":"postgres","grantable":false,"privilege":"EXECUTE"},{"role":"anon","grantable":false,"privilege":"EXECUTE"},{"role":"authenticated","grantable":false,"privilege":"EXECUTE"},{"role":"service_role","grantable":false,"privilege":"EXECUTE"}]'::jsonb))SELECT string_agg(e.sig,',')INTO schema_now FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.sig)
   WHERE p.oid IS NULL OR md5(CASE WHEN e.normalize_095 THEN replace(pg_get_functiondef(p.oid),chr(13),'')ELSE pg_get_functiondef(p.oid)END)IS DISTINCT FROM e.h OR coalesce(to_jsonb(p.proconfig),'null')IS DISTINCT FROM e.config OR p.prosecdef IS DISTINCT FROM e.definer OR p.proowner::regrole::text IS DISTINCT FROM e.owner_name
   OR(SELECT coalesce(jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC'ELSE pg_get_userbyid(a.grantee)END,'privilege',a.privilege_type,'grantable',a.is_grantable)ORDER BY a.grantee,a.privilege_type),'[]')FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner)))a)
     IS DISTINCT FROM(SELECT jsonb_agg(g ORDER BY CASE WHEN g->>'role'='PUBLIC'THEN 0 ELSE(g->>'role')::regrole::oid END,g->>'privilege')FROM jsonb_array_elements(e.grants)g);
  IF schema_now IS NOT NULL THEN RAISE EXCEPTION 'deletion_migration_baseline_routines: %',schema_now;END IF;
 EXECUTE 'CREATE SCHEMA deletion_release_private;
   REVOKE ALL ON SCHEMA deletion_release_private FROM PUBLIC,anon,authenticated,service_role;
   CREATE TABLE deletion_release_private.installation(version text PRIMARY KEY,project_ref text NOT NULL,payload_sha text NOT NULL,schema_hash text NOT NULL,installed_at timestamptz NOT NULL DEFAULT clock_timestamp());
   CREATE TABLE deletion_release_private.controls(slot boolean PRIMARY KEY CHECK(slot),runtime_enabled boolean NOT NULL DEFAULT false CONSTRAINT deletion_candidate_disabled CHECK(NOT runtime_enabled));
   INSERT INTO deletion_release_private.controls VALUES(true,false);
   REVOKE ALL ON ALL TABLES IN SCHEMA deletion_release_private FROM PUBLIC,anon,authenticated,service_role;
   CREATE FUNCTION deletion_release_private.runtime_allowed()RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''''AS $$SELECT coalesce((SELECT runtime_enabled FROM deletion_release_private.controls WHERE slot),false)$$;
   REVOKE ALL ON FUNCTION deletion_release_private.runtime_allowed()FROM PUBLIC,anon,authenticated,service_role;';
 EXECUTE payload;
 SELECT (SELECT md5(jsonb_build_object(
   'relations',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relkind,c.relowner::regrole::text,c.relacl,c.reloptions,c.relrowsecurity,c.relforcerowsecurity,
     CASE WHEN c.relkind IN('v','m')THEN pg_get_viewdef(c.oid,true)END,
     (SELECT jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid),a.attidentity,a.attgenerated)ORDER BY a.attnum)
       FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
     (SELECT jsonb_agg(jsonb_build_array(x.conname,pg_get_constraintdef(x.oid,true),x.convalidated)ORDER BY x.conname)FROM pg_constraint x WHERE x.conrelid=c.oid),
     (SELECT jsonb_agg(pg_get_indexdef(x.indexrelid)ORDER BY x.indexrelid)FROM pg_index x WHERE x.indrelid=c.oid))ORDER BY n.nspname,c.relname)
     FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND c.relkind IN('r','p','v','m','f','S')),
   'routines',(SELECT jsonb_agg(jsonb_build_array(n.nspname,p.oid::regprocedure::text,md5(pg_get_functiondef(p.oid)),p.proowner::regrole::text,p.proacl)ORDER BY n.nspname,p.oid::regprocedure::text)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE (n.nspname='public' OR n.nspname LIKE 'deletion_%')AND p.prokind IN('f','p')),
   'triggers',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,t.tgname,pg_get_triggerdef(t.oid,true),t.tgenabled)ORDER BY n.nspname,c.relname,t.tgname)
     FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE NOT t.tgisinternal AND(n.nspname='public' OR n.nspname LIKE 'deletion_%')),
   'policies',(SELECT jsonb_agg(jsonb_build_array(n.nspname,c.relname,p.polname,p.polpermissive,p.polcmd,p.polroles,pg_get_expr(p.polqual,p.polrelid),pg_get_expr(p.polwithcheck,p.polrelid))ORDER BY n.nspname,c.relname,p.polname)
     FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' OR n.nspname LIKE 'deletion_%'),
   'schemas',(SELECT jsonb_agg(jsonb_build_array(nspname,nspowner::regrole::text,nspacl)ORDER BY nspname)FROM pg_namespace WHERE nspname='public' OR nspname LIKE 'deletion_%')
  )::text)) INTO schema_now;
 INSERT INTO deletion_release_private.installation(version,project_ref,payload_sha,schema_hash)
  VALUES('096-account-deletion-candidate-v1','fgejncfsvvsayiequubm','c449baff62f39e53b6851e8c1af4e4866ca79baa923b78092eae5c50686cc40e',schema_now);
END;
$candidate_migration$;
COMMIT;
