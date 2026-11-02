-- Local-only extension of the existing engine. Install after its base draft and a
-- literal approved_columns manifest from the checked-in captured catalog. No cloud migration.
BEGIN;
DO $$ BEGIN IF current_database()<>'deletion_engine_test' THEN RAISE EXCEPTION 'Disposable DB required'; END IF; END $$;

ALTER TABLE public.events ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.events_archive ALTER COLUMN actor_id DROP NOT NULL;
ALTER TABLE public.preparation_template_applications ALTER COLUMN actor_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION deletion_engine_private.assert_catalog() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','f') AND NOT EXISTS (
      SELECT 1 FROM deletion_engine_private.approved_columns a WHERE a.table_name=c.relname)
  ) OR EXISTS (
    SELECT 1 FROM deletion_engine_private.approved_columns e FULL JOIN (
      SELECT c.relname AS table_name,a.attname AS column_name,pg_catalog.regexp_replace(pg_catalog.format_type(a.atttypid,a.atttypmod),'^public\.','') AS type_name,
        NOT a.attnotnull AS nullable FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid
        WHERE n.nspname='public' AND c.relkind IN ('r','p','f') AND a.attnum>0 AND NOT a.attisdropped
    ) live USING(table_name,column_name)
    WHERE e.type_name IS DISTINCT FROM live.type_name OR e.nullable IS DISTINCT FROM live.nullable
  ) THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_unreviewed_catalog'; END IF;
END $$;

CREATE OR REPLACE FUNCTION deletion_engine_private.prepare_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t text; has_rows boolean;
BEGIN
  IF step<>'access_frozen' THEN RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.pending_operations po WHERE po.status<>'synced'
    AND (po.actor_id=actor OR (kind='owner' AND po.market_id IN(SELECT id FROM public.markets WHERE owner_id=actor))))
  THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_cloud_pending_unresolved'; END IF;
  IF NOT deletion_engine_private.upload_tracking_enabled() AND (EXISTS(SELECT 1 FROM public.product_cover_photos WHERE owner_id=actor AND upload_lease_expires_at>clock_timestamp())
    OR EXISTS(SELECT 1 FROM public.sale_photo_evidence WHERE owner_id=actor AND upload_lease_expires_at>clock_timestamp()))
  THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_upload_in_flight'; END IF;
  FOREACH t IN ARRAY ARRAY['billing_customer_links','billing_subscriptions','billing_transactions',
    'billing_reconciliation_runs','subscription_price_assignments'] LOOP
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE owner_id=$1)',t) INTO has_rows USING actor;
    IF has_rows AND NOT deletion_engine_private.billing_ready(actor) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_billing_detachment_required'; END IF;
  END LOOP;
  IF kind='staff' THEN
    FOREACH t IN ARRAY ARRAY['venues','operation_schedules','preparation_templates','market_journals',
      'market_cash_records','market_financial_reviews','market_financial_review_receipts','owner_workflow_receipts'] LOOP
      EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE owner_id=$1)',t) INTO has_rows USING actor;
      IF has_rows THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_staff_owns_workspace'; END IF;
    END LOOP;
  END IF;
  IF EXISTS(SELECT 1 FROM public.markets WHERE owner_id<>actor AND (
    venue_id IN(SELECT id FROM public.venues WHERE owner_id=actor)
    OR schedule_id IN(SELECT id FROM public.operation_schedules WHERE owner_id=actor)))
  THEN RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='engine_foreign_workspace_reference'; END IF;
END $$;

-- The two deployed event triggers retain their normal authorization rules. A
-- narrow early-return branch (generated from captured definitions by the test
-- installer) calls this helper only for a current, ordered engine operation.
CREATE FUNCTION deletion_engine_private.authorize_event_change(old_row jsonb,new_row jsonb,op text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.account_deletion_requests%ROWTYPE; step text; email text; name text;
BEGIN
  SELECT * INTO r FROM public.account_deletion_requests WHERE id::text=current_setting('deletion_engine.request',true)
    AND status='processing' AND lease_expires_at>clock_timestamp()
    AND lease_token_hash=encode(extensions.digest(current_setting('deletion_engine.lease',true),'sha256'),'hex');
  IF NOT FOUND THEN RETURN false; END IF;
  step:=current_setting('deletion_engine.step',true);
  IF step NOT IN ('operational_data_cleaned','staff_attribution_anonymized') THEN RETURN false; END IF;
  IF op='DELETE' THEN
    RETURN step='operational_data_cleaned' AND r.account_kind='owner' AND (
      old_row->>'market_id' IN (SELECT id::text FROM public.markets WHERE owner_id=r.active_actor_id)
      OR (old_row->>'market_id' IS NULL AND old_row->>'actor_id'=r.active_actor_id::text)
      OR (old_row->>'market_id' IS NULL AND coalesce(old_row#>>'{payload,marketId}',old_row#>>'{payload,market_id}') IN
        (SELECT id::text FROM public.markets WHERE owner_id=r.active_actor_id)));
  END IF;
  IF op<>'UPDATE' OR new_row-'actor_id'-'payload'-'metadata' IS DISTINCT FROM old_row-'actor_id'-'payload'-'metadata' THEN RETURN false; END IF;
  SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE id=r.active_actor_id;
  RETURN new_row->'actor_id' IS NOT DISTINCT FROM CASE WHEN old_row->>'actor_id'=r.active_actor_id::text THEN 'null'::jsonb ELSE old_row->'actor_id' END
    AND new_row->'payload' IS NOT DISTINCT FROM deletion_engine_private.redact(old_row->'payload',r.active_actor_id::text,email,name)
    AND new_row->'metadata' IS NOT DISTINCT FROM (
      coalesce(deletion_engine_private.redact(NULLIF(old_row->'metadata','null'::jsonb),r.active_actor_id::text,email,name),'{}')
        ||CASE WHEN old_row->>'actor_id'=r.active_actor_id::text THEN '{"deletedActor":true}'::jsonb ELSE '{}'::jsonb END);
END $$;
REVOKE ALL ON FUNCTION deletion_engine_private.authorize_event_change(jsonb,jsonb,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION deletion_engine_private.before_step(actor uuid,kind text,step text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE email text; name text;
BEGIN
  PERFORM set_config('deletion_engine.step',step,true);
  IF step='staff_access_revoked' THEN
    DELETE FROM public.market_invitations WHERE created_by=actor OR used_by=actor
      OR (kind='owner' AND market_id IN(SELECT id FROM public.markets WHERE owner_id=actor));
  ELSIF step IN ('staff_attribution_anonymized','operational_data_cleaned') THEN
    SELECT p.email,p.display_name INTO email,name FROM public.profiles p WHERE id=actor;
    -- Snapshots are derived caches, not the source of owner transaction history.
    DELETE FROM public.snapshots WHERE user_id=actor OR position(actor::text IN data::text)>0
      OR (email IS NOT NULL AND position(email IN data::text)>0);
    IF step='operational_data_cleaned' AND kind='owner' THEN
      -- Capture/delete owner-global events BEFORE their actor is anonymized.
      DELETE FROM public.events WHERE market_id IS NULL AND (actor_id=actor OR
        coalesce(payload->>'marketId',payload->>'market_id') IN(SELECT id::text FROM public.markets WHERE owner_id=actor));
      DELETE FROM public.events_archive WHERE (market_id IS NULL AND actor_id=actor)
        OR market_id IN(SELECT id FROM public.markets WHERE owner_id=actor)
        OR coalesce(payload->>'marketId',payload->>'market_id') IN(SELECT id::text FROM public.markets WHERE owner_id=actor);
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
    IF step='operational_data_cleaned' THEN
      DELETE FROM public.pending_operations WHERE status='synced' AND (actor_id=actor
        OR (kind='owner' AND market_id IN(SELECT id FROM public.markets WHERE owner_id=actor)));
      IF kind='owner' THEN
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
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF step='operational_data_cleaned' AND kind='owner' THEN
    DELETE FROM public.operation_schedules WHERE owner_id=actor;
    DELETE FROM public.venues WHERE owner_id=actor;
  END IF;
END $$;
-- Extra owner data gets the same immediate row fence. Views and all SECURITY
-- DEFINER reads require their own release audit; no claim of production coverage.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['events_archive','market_cash_records','market_financial_review_receipts','market_financial_reviews',
    'market_invitations','market_journals','operation_schedules','owner_workflow_receipts','pending_operations',
    'preparation_template_applications','preparation_templates','snapshots','subscription_test_switch_audit',
    'subscription_write_guard_owners','account_entitlements','venues'] LOOP
    EXECUTE format('CREATE TRIGGER deletion_engine_write_fence BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION deletion_engine_private.write_fence()',t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY deletion_engine_read_fence ON public.%I AS RESTRICTIVE TO authenticated USING (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I))) WITH CHECK (deletion_engine_private.actor_enabled(auth.uid()) AND deletion_engine_private.record_enabled(to_jsonb(%I)))',t,t,t);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION deletion_engine_private.prepare_step(uuid,text,text),
  deletion_engine_private.before_step(uuid,text,text),deletion_engine_private.after_step(uuid,text,text)
  FROM PUBLIC,anon,authenticated,service_role;
ROLLBACK;
