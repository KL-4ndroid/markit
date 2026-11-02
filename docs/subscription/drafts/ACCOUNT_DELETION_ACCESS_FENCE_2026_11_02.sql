-- LOCAL-ONLY support for captured routine/view/trigger rewrites, installed by the
-- access fixture tool. Not a production migration. Run after engine + operational.
BEGIN;
DO $$BEGIN IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'Disposable DB required';END IF;END$$;
CREATE FUNCTION deletion_engine_private.worker_matches(actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.account_deletion_requests r WHERE r.active_actor_id=actor
  AND r.id::text=current_setting('deletion_engine.request',true) AND r.status='processing'
  AND r.identity_confirmed_at IS NOT NULL AND r.preflight_resolution IS NOT NULL
  AND r.lease_expires_at>clock_timestamp() AND r.lease_expires_at<=clock_timestamp()+interval '5 minutes'
  AND r.lease_token_hash=encode(extensions.digest(current_setting('deletion_engine.lease',true),'sha256'),'hex')
  AND current_setting('deletion_engine.step',true)=(
    SELECT code FROM unnest(CASE r.account_kind WHEN 'owner' THEN ARRAY['access_frozen','staff_access_revoked','object_manifest_built',
      'r2_objects_deleted','r2_absence_verified','billing_identity_detached','operational_data_cleaned','profile_deleted','auth_user_deleted','sessions_revoked']
    ELSE ARRAY['access_frozen','staff_access_revoked','staff_attribution_anonymized','operational_data_cleaned','profile_deleted','auth_user_deleted','sessions_revoked'] END)
      WITH ORDINALITY AS u(code,ord) WHERE NOT EXISTS(SELECT 1 FROM public.account_deletion_cleanup_steps s
        WHERE s.request_id=r.id AND s.step_code=code AND s.status='completed') ORDER BY ord LIMIT 1));
$$;
CREATE FUNCTION deletion_engine_private.identity_allowed(actor uuid,worker boolean DEFAULT true) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT actor IS NULL OR NOT EXISTS(SELECT 1 FROM deletion_engine_private.frozen WHERE actor_hash=encode(extensions.digest(actor::text,'sha256'),'hex'))
   OR (worker AND deletion_engine_private.worker_matches(actor));
$$;
CREATE FUNCTION deletion_engine_private.reference_allowed(kind text,value jsonb,allow_worker boolean DEFAULT true) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
#variable_conflict use_variable
DECLARE id uuid;owner uuid;staff uuid;item jsonb;k text;v jsonb;name text;
BEGIN
 IF value IS NULL OR value='null'::jsonb OR kind='none' THEN RETURN true;END IF;
 IF jsonb_typeof(value)='array' THEN
  FOR item IN SELECT x FROM jsonb_array_elements(value)x LOOP IF NOT deletion_engine_private.reference_allowed(kind,item,allow_worker) THEN RETURN false;END IF;END LOOP;RETURN true;
 END IF;
 IF kind='json' THEN
  IF jsonb_typeof(value)<>'object' THEN RETURN true;END IF;
  FOR k,v IN SELECT * FROM jsonb_each(value) LOOP
   name:=CASE k WHEN 'ownerId' THEN 'identity' WHEN 'owner_id' THEN 'identity'
    WHEN 'marketId' THEN 'market' WHEN 'market_id' THEN 'market' WHEN 'productId' THEN 'product' WHEN 'product_id' THEN 'product'
    WHEN 'venueId' THEN 'venue' WHEN 'venue_id' THEN 'venue' WHEN 'scheduleId' THEN 'schedule' WHEN 'schedule_id' THEN 'schedule'
    WHEN 'journalId' THEN 'journal' WHEN 'templateId' THEN 'template' ELSE 'json' END;
   IF NOT deletion_engine_private.reference_allowed(name,v,allow_worker) THEN RETURN false;END IF;
  END LOOP;RETURN true;
 END IF;
 IF jsonb_typeof(value)<>'string' THEN RETURN true;END IF;
 IF kind='token' THEN
  IF EXISTS(SELECT 1 FROM public.staff_invitations si WHERE si.token=value#>>'{}' AND NOT deletion_engine_private.identity_allowed(si.owner_id)) THEN RETURN false;END IF;
  IF EXISTS(SELECT 1 FROM public.market_invitations i JOIN public.markets m ON m.id=i.market_id WHERE i.code=value#>>'{}' AND NOT deletion_engine_private.identity_allowed(m.owner_id)) THEN RETURN false;END IF;
  RETURN true;
 END IF;
 IF kind='operation' THEN
  RETURN NOT EXISTS(SELECT 1 FROM public.pending_operations p JOIN public.markets m ON m.id=p.market_id WHERE p.operation_id=value#>>'{}'
    AND (NOT deletion_engine_private.identity_allowed(m.owner_id) OR NOT deletion_engine_private.identity_allowed(p.actor_id)));
 END IF;
 IF value#>>'{}' !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' THEN RETURN true;END IF;
 id:=(value#>>'{}')::uuid;
 CASE kind
  WHEN 'identity' THEN RETURN deletion_engine_private.identity_allowed(id,allow_worker);
  WHEN 'market' THEN SELECT owner_id INTO owner FROM public.markets WHERE markets.id=id;
  WHEN 'product' THEN SELECT owner_id INTO owner FROM public.products WHERE products.id=id;
  WHEN 'event' THEN
    SELECT coalesce(m.owner_id,p.owner_id,e.actor_id) INTO owner FROM public.events e LEFT JOIN public.markets m ON m.id=e.market_id
     LEFT JOIN public.products p ON p.id::text=coalesce(e.payload->>'productId',e.payload->>'product_id') WHERE e.id=id;
  WHEN 'photo' THEN
    SELECT owner_id INTO owner FROM public.sale_photo_evidence WHERE sale_photo_evidence.id=id;
    IF NOT FOUND THEN SELECT owner_id INTO owner FROM public.product_cover_photos WHERE product_cover_photos.id=id;END IF;
  WHEN 'journal' THEN SELECT owner_id INTO owner FROM public.market_journals WHERE market_journals.id=id;
  WHEN 'template' THEN SELECT owner_id INTO owner FROM public.preparation_templates WHERE preparation_templates.id=id;
  WHEN 'venue' THEN SELECT owner_id INTO owner FROM public.venues WHERE venues.id=id;
  WHEN 'schedule' THEN SELECT owner_id INTO owner FROM public.operation_schedules WHERE operation_schedules.id=id;
  WHEN 'relationship' THEN SELECT owner_id,staff_id INTO owner,staff FROM public.staff_relationships WHERE staff_relationships.id=id;
  WHEN 'invitation' THEN SELECT owner_id INTO owner FROM public.staff_invitations WHERE staff_invitations.id=id;
  ELSE RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='deletion_reference_unclassified';
 END CASE;
 RETURN deletion_engine_private.identity_allowed(owner,allow_worker) AND deletion_engine_private.identity_allowed(staff,allow_worker);
END$$;
CREATE FUNCTION deletion_engine_private.rpc_allowed(args jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$DECLARE a jsonb;BEGIN
 IF NOT deletion_engine_private.identity_allowed(auth.uid(),false) THEN RETURN false;END IF;
 FOR a IN SELECT x FROM jsonb_array_elements(args)x LOOP
  IF NOT deletion_engine_private.reference_allowed(a->>'kind',a->'value') THEN RETURN false;END IF;
 END LOOP;RETURN true;
END$$;
CREATE FUNCTION deletion_engine_private.assert_rpc(args jsonb) RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$BEGIN
 IF NOT deletion_engine_private.rpc_allowed(args) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='account_deletion_access_frozen';END IF;
END$$;

-- Preserve the original staff masks and definer view semantics. Force explicit
-- owner/caller filtering instead of breaking staff access by assuming invoker RLS.
CREATE FUNCTION deletion_engine_private.visible_row(r jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
#variable_conflict use_variable
DECLARE owner uuid;id text;BEGIN
 IF NOT deletion_engine_private.identity_allowed(auth.uid(),false) THEN RETURN false;END IF;
 IF r->>'relationship_owner_id' IS NOT NULL THEN owner:=(r->>'relationship_owner_id')::uuid;
 ELSIF r->>'owner_id' IS NOT NULL THEN owner:=(r->>'owner_id')::uuid;
 ELSIF r->>'market_id' IS NOT NULL THEN SELECT owner_id INTO owner FROM public.markets WHERE markets.id=(r->>'market_id')::uuid;
 ELSE
  id:=coalesce(r#>>'{payload,productId}',r#>>'{payload,product_id}');
  SELECT owner_id INTO owner FROM public.products WHERE products.id::text=id;
  IF owner IS NULL AND r->>'actor_id' IS NOT NULL THEN owner:=(r->>'actor_id')::uuid;END IF;
 END IF;
 RETURN deletion_engine_private.identity_allowed(owner,false);
END$$;

CREATE FUNCTION deletion_engine_private.worker_row(t text,old_r jsonb,new_r jsonb,op text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$DECLARE actor uuid;step text;owner uuid;email text;name text;BEGIN
 SELECT active_actor_id INTO actor FROM public.account_deletion_requests WHERE id::text=current_setting('deletion_engine.request',true);
 IF NOT deletion_engine_private.worker_matches(actor) THEN RETURN false;END IF;
 step:=current_setting('deletion_engine.step',true);
 owner:=nullif(old_r->>'owner_id','')::uuid;
 IF owner IS NOT NULL AND owner<>actor AND NOT deletion_engine_private.identity_allowed(owner,false) THEN RETURN false;END IF;
 SELECT owner_id INTO owner FROM public.markets WHERE id::text=old_r->>'market_id';
 IF owner IS NOT NULL AND owner<>actor AND NOT deletion_engine_private.identity_allowed(owner,false) THEN RETURN false;END IF;
 IF op='DELETE' AND ((step='staff_access_revoked' AND t IN('staff_relationships','staff_invitations','market_members','market_invitations'))
   OR (step='profile_deleted' AND t='profiles') OR (step='operational_data_cleaned' AND t<>'profiles')
   OR (step='staff_attribution_anonymized' AND t='snapshots')) THEN
  IF old_r->>'owner_id'=actor::text OR old_r->>'user_id'=actor::text OR (t='profiles' AND old_r->>'id'=actor::text)
    OR (t='staff_relationships' AND old_r->>'staff_id'=actor::text) THEN RETURN true;END IF;
  IF t='events' AND deletion_engine_private.authorize_event_change(old_r,NULL,'DELETE') THEN RETURN true;END IF;
  IF old_r->>'market_id' IN(SELECT id::text FROM public.markets WHERE owner_id=actor) THEN RETURN true;END IF;
 END IF;
 IF op='UPDATE' AND step IN('staff_attribution_anonymized','operational_data_cleaned') THEN
  IF t='events' AND deletion_engine_private.authorize_event_change(old_r,new_r,op) THEN RETURN true;END IF;
  SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE p.id=actor;
  IF t='events_archive' AND new_r-'actor_id'-'archived_by'-'payload'-'metadata' IS NOT DISTINCT FROM old_r-'actor_id'-'archived_by'-'payload'-'metadata'
   AND new_r->'actor_id' IS NOT DISTINCT FROM (CASE WHEN old_r->>'actor_id'=actor::text THEN 'null'::jsonb ELSE old_r->'actor_id' END)
   AND new_r->'archived_by' IS NOT DISTINCT FROM (CASE WHEN old_r->>'archived_by'=actor::text THEN 'null'::jsonb ELSE old_r->'archived_by' END)
   AND new_r->'payload' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->'payload',actor::text,email,name)
   AND new_r->'metadata' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->'metadata',actor::text,email,name) THEN RETURN true;END IF;
  IF t='preparation_template_applications' AND new_r-'actor_id'-'request'-'result' IS NOT DISTINCT FROM old_r-'actor_id'-'request'-'result'
   AND new_r->'actor_id' IS NOT DISTINCT FROM (CASE WHEN old_r->>'actor_id'=actor::text THEN 'null'::jsonb ELSE old_r->'actor_id' END)
   AND new_r->'request' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->'request',actor::text,email,name)
   AND new_r->'result' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->'result',actor::text,email,name) THEN RETURN true;END IF;
  IF t='owner_workflow_receipts' AND new_r-'request'-'result' IS NOT DISTINCT FROM old_r-'request'-'result'
   AND new_r->'request' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->'request',actor::text,email,name)
   AND new_r->'result' IS NOT DISTINCT FROM deletion_engine_private.redact(old_r->'result',actor::text,email,name) THEN RETURN true;END IF;
  IF t='sale_photo_evidence' AND old_r->>'captured_by_staff_id'=actor::text AND new_r->'captured_by_staff_id'='null'::jsonb
    AND old_r-'captured_by_staff_id'-'updated_at' IS NOT DISTINCT FROM new_r-'captured_by_staff_id'-'updated_at' THEN RETURN true;END IF;
  IF t='products' AND step='operational_data_cleaned' AND new_r->'market_id'='null'::jsonb
    AND old_r-'market_id'-'updated_at' IS NOT DISTINCT FROM new_r-'market_id'-'updated_at'
    AND old_r->>'market_id' IN(SELECT id::text FROM public.markets WHERE owner_id=actor) THEN RETURN true;END IF;
 END IF;
 RETURN false;
END$$;
CREATE OR REPLACE FUNCTION deletion_engine_private.write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$DECLARE r jsonb;k text;BEGIN
 IF NOT deletion_engine_private.identity_allowed(auth.uid(),false) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='account_deletion_access_frozen';END IF;
 IF deletion_engine_private.worker_row(TG_TABLE_NAME,CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(OLD) END,
   CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(NEW) END,TG_OP) THEN IF TG_OP='DELETE' THEN RETURN OLD;ELSE RETURN NEW;END IF;END IF;
 FOR r IN SELECT x FROM jsonb_array_elements(CASE TG_OP WHEN 'INSERT' THEN jsonb_build_array(to_jsonb(NEW)) WHEN 'DELETE' THEN jsonb_build_array(to_jsonb(OLD)) ELSE jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) END)x LOOP
  FOREACH k IN ARRAY ARRAY['owner_id','user_id','staff_id'] LOOP
   IF NOT deletion_engine_private.reference_allowed('identity',r->k,false) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='account_deletion_access_frozen';END IF;
  END LOOP;
  IF NOT deletion_engine_private.reference_allowed('market',r->'market_id',false) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='account_deletion_access_frozen';END IF;
  IF TG_TABLE_NAME IN('events','events_archive') AND NOT deletion_engine_private.reference_allowed('json',r->'payload',false)
   THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='account_deletion_access_frozen';END IF;
  IF TG_TABLE_NAME='profiles' AND NOT deletion_engine_private.reference_allowed('identity',r->'id',false) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='account_deletion_access_frozen';END IF;
 END LOOP;
 IF TG_OP='INSERT' OR (TG_OP='UPDATE' AND to_jsonb(NEW)->'actor_id' IS DISTINCT FROM to_jsonb(OLD)->'actor_id') THEN
  IF NOT deletion_engine_private.reference_allowed('identity',to_jsonb(NEW)->'actor_id',false) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='account_deletion_access_frozen';END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END$$;
-- Read RLS may retain other brands' historical sales; actor is authorship, not ownership.
CREATE OR REPLACE FUNCTION deletion_engine_private.record_enabled(r jsonb) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT deletion_engine_private.visible_row(r)
  AND deletion_engine_private.identity_allowed(nullif(r->>'user_id','')::uuid,false)
  AND deletion_engine_private.identity_allowed(nullif(r->>'staff_id','')::uuid,false)
  AND (r ? 'owner_id' OR r ? 'market_id' OR r ? 'actor_id' OR deletion_engine_private.identity_allowed(nullif(r->>'id','')::uuid,false));
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA deletion_engine_private FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA deletion_engine_private TO anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION deletion_engine_private.rpc_allowed(jsonb),deletion_engine_private.assert_rpc(jsonb),
 deletion_engine_private.visible_row(jsonb),deletion_engine_private.actor_enabled(uuid),deletion_engine_private.record_enabled(jsonb)
 TO anon,authenticated,service_role;
ROLLBACK;
