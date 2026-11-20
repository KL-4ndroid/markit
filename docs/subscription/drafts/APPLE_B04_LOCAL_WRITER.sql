-- B04 disposable integration ONLY. Not a deployable migration. Never remove the target guard.
BEGIN;
DO $$BEGIN IF current_database()<>'stallight_b04_test' THEN RAISE EXCEPTION 'b04_local_target_required'; END IF; END$$;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE ROLE stallight_billing_writer NOLOGIN;
CREATE SCHEMA native_billing_private;
REVOKE ALL ON SCHEMA native_billing_private FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE native_billing_private.bindings(owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE RESTRICT,token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid());
CREATE TABLE native_billing_private.mappings(environment text NOT NULL CHECK(environment IN('sandbox','production')),product_id text NOT NULL CHECK(length(product_id) BETWEEN 1 AND 256),price_id text NOT NULL REFERENCES public.subscription_price_versions(id),status text NOT NULL CHECK(status IN('candidate','active','disabled')),PRIMARY KEY(environment,product_id));
CREATE TABLE native_billing_private.receipts(key text PRIMARY KEY CHECK(key~'^[a-f0-9]{64}$'),owner_id uuid NOT NULL REFERENCES public.profiles(id),snapshot_hash text NOT NULL CHECK(snapshot_hash~'^[a-f0-9]{64}$'),last_code text NOT NULL);
CREATE TABLE native_billing_private.decisions(key text NOT NULL REFERENCES native_billing_private.receipts(key),code text NOT NULL,run_id uuid NOT NULL REFERENCES public.billing_reconciliation_runs(id),PRIMARY KEY(key,code));
CREATE TABLE native_billing_private.event_leases(event_id uuid PRIMARY KEY REFERENCES public.billing_event_inbox(id),token uuid NOT NULL,expires_at timestamptz NOT NULL);
CREATE FUNCTION native_billing_private.command(op text,actor uuid,x jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE s jsonb;d jsonb;row_data jsonb;old_account jsonb;after_account jsonb;b uuid;customer uuid;run uuid;sub public.billing_subscriptions%ROWTYPE;price public.subscription_price_versions%ROWTYPE;m native_billing_private.mappings%ROWTYPE;r native_billing_private.receipts%ROWTYPE;ev public.billing_event_inbox%ROWTYPE;l native_billing_private.event_leases%ROWTYPE;k text;env text;ref text;before_hash text;active boolean;
BEGIN
 IF current_database()<>'stallight_b04_test' THEN RAISE EXCEPTION 'b04_local_target_required'; END IF;
 IF x IS NULL OR jsonb_typeof(x)<>'object' OR octet_length(x::text)>65536 THEN RAISE EXCEPTION 'b04_input'; END IF;
 IF op='binding' THEN
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor) OR EXISTS(SELECT 1 FROM public.staff_relationships WHERE staff_id=actor AND status='active') THEN RAISE EXCEPTION 'b04_owner_required'; END IF;
  INSERT INTO native_billing_private.bindings(owner_id) VALUES(actor) ON CONFLICT DO NOTHING;
  RETURN (SELECT to_jsonb(token) FROM native_billing_private.bindings WHERE owner_id=actor);
 ELSIF op='lookup_binding' THEN
  RETURN (SELECT to_jsonb(owner_id) FROM native_billing_private.bindings WHERE token=(x->>'token')::uuid);
 ELSIF op IN('event_claim','event_finish') THEN
  env:=x->>'environment';ref:=x->>'event';
  IF env NOT IN('sandbox','production') OR ref IS NULL OR length(ref)>128 THEN RAISE EXCEPTION 'b04_event_input'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('native-event:'||env||':'||ref,0));
  IF op='event_claim' THEN
   IF (x->>'hash')!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'b04_event_input'; END IF;
   INSERT INTO public.billing_event_inbox(billing_origin,provider_environment,provider_event_ref,payload_hash,verification_status,event_kind,provider_occurred_at)
    VALUES('apple_app_store',env,ref,x->>'hash','verified','subscription_changed',(x->>'occurredAt')::timestamptz) ON CONFLICT DO NOTHING;
   SELECT * INTO STRICT ev FROM public.billing_event_inbox WHERE billing_origin='apple_app_store' AND provider_environment=env AND provider_event_ref=ref FOR UPDATE;
   IF ev.payload_hash<>x->>'hash' THEN RAISE EXCEPTION 'b04_event_conflict'; END IF;
   IF ev.processing_status IN('processed','terminal_failed','ignored') THEN RETURN jsonb_build_object('duplicate',true); END IF;
   SELECT * INTO l FROM native_billing_private.event_leases WHERE event_id=ev.id;
   IF ev.processing_status='processing' THEN
    IF l.expires_at>clock_timestamp() THEN RETURN jsonb_build_object('busy',true); END IF;
    UPDATE public.billing_event_inbox SET processing_status='retryable_failed',next_attempt_at=clock_timestamp(),last_safe_error_code='lease_expired' WHERE id=ev.id;
   END IF;
   UPDATE public.billing_event_inbox SET processing_status='processing',attempt_count=attempt_count+1,next_attempt_at=NULL,last_safe_error_code=NULL WHERE id=ev.id;
   b:=gen_random_uuid();
   INSERT INTO native_billing_private.event_leases VALUES(ev.id,b,clock_timestamp()+interval '30 seconds') ON CONFLICT(event_id) DO UPDATE SET token=EXCLUDED.token,expires_at=EXCLUDED.expires_at;
   RETURN jsonb_build_object('lease',b);
  ELSE
   SELECT * INTO STRICT ev FROM public.billing_event_inbox WHERE billing_origin='apple_app_store' AND provider_environment=env AND provider_event_ref=ref FOR UPDATE;
   SELECT * INTO STRICT l FROM native_billing_private.event_leases WHERE event_id=ev.id;
   IF l.token<>(x->>'lease')::uuid OR l.expires_at<=clock_timestamp() OR ev.processing_status<>'processing' THEN RAISE EXCEPTION 'b04_lease'; END IF;
   IF x->>'result'='retry' THEN UPDATE public.billing_event_inbox SET processing_status='retryable_failed',next_attempt_at=clock_timestamp()+interval '1 second',last_safe_error_code='reconciliation_unavailable' WHERE id=ev.id;
   ELSIF x->>'result'='review' THEN UPDATE public.billing_event_inbox SET processing_status='terminal_failed',last_safe_error_code='account_binding_unresolved',processed_at=clock_timestamp() WHERE id=ev.id;
   ELSE UPDATE public.billing_event_inbox SET processing_status='processed',processed_at=clock_timestamp() WHERE id=ev.id; END IF;
   RETURN '{}'::jsonb;
  END IF;
 END IF;
 s:=x->'snapshot';k:=x->>'key';env:=s->>'environment';ref:=s->>'providerSubscriptionRef';
 IF actor IS NULL OR s->>'ownerId' IS DISTINCT FROM actor::text OR s->>'origin'<>'apple_app_store' OR env NOT IN('sandbox','production') OR ref IS NULL OR ref!~'^[0-9]{1,64}$' OR s->>'snapshotHash'!~'^[a-f0-9]{64}$' OR k!~'^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'b04_snapshot'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('native-owner:'||actor::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('native-chain:'||env||':'||ref,0));
 SELECT token INTO STRICT b FROM native_billing_private.bindings WHERE owner_id=actor;
 IF op='mapping' THEN
  SELECT * INTO m FROM native_billing_private.mappings WHERE environment=env AND product_id=s->>'productId';
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO STRICT price FROM public.subscription_price_versions WHERE id=m.price_id;
  RETURN jsonb_build_object('origin','apple_app_store','environment',env,'productId',m.product_id,'basePlanId',NULL,'offerId',NULL,'status',m.status,'price',jsonb_build_object('id',price.id,'planCode',price.plan_code,'cadence',price.cadence,'currency',price.currency,'amountMinor',price.amount_minor,'policy',price.price_policy,'offerCode',price.offer_code,'runtimeStatus',price.commercial_status,'effectiveAt',price.effective_at));
 ELSIF op='state' THEN
  SELECT * INTO sub FROM public.billing_subscriptions WHERE billing_origin='apple_app_store' AND provider_environment=env AND provider_subscription_ref=ref;
  SELECT * INTO r FROM native_billing_private.receipts WHERE key=k;
  RETURN jsonb_build_object('ownerId',actor,'referenceOwnerId',sub.owner_id,'previous',CASE WHEN sub.id IS NOT NULL THEN jsonb_build_object('snapshotHash',sub.snapshot_hash,'storeObservedAt',to_char(sub.provider_observed_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) END,
   'receipt',CASE WHEN r.key IS NOT NULL THEN jsonb_build_object('ownerId',r.owner_id,'snapshotHash',r.snapshot_hash,'lastDecision',r.last_code) END,
   'projectionSource',COALESCE((SELECT plan_source FROM public.subscription_accounts WHERE owner_id=actor),'free'),
   'subscriptions',COALESCE((SELECT jsonb_agg(jsonb_build_object('ownerId',owner_id,'origin',billing_origin,'environment',provider_environment,'providerSubscriptionRef',provider_subscription_ref,'entitlementStatus',CASE WHEN normalized_billing_status IN('active') AND current_period_ends_at>=clock_timestamp() THEN 'active' WHEN normalized_billing_status IN('past_due','unknown','trialing','disputed') THEN 'unknown' ELSE 'inactive' END,'entitlementEndsAt',to_char(current_period_ends_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) FROM public.billing_subscriptions WHERE owner_id=actor),'[]'::jsonb));
 END IF;
 SELECT to_jsonb(a) INTO old_account FROM public.subscription_accounts a WHERE owner_id=actor FOR UPDATE;
 before_hash:=encode(public.digest(COALESCE(old_account::text,'null'),'sha256'),'hex');
 d:=x->'decision';
 IF op='record' THEN
  INSERT INTO native_billing_private.receipts VALUES(k,actor,s->>'snapshotHash',d->>'code') ON CONFLICT(key) DO NOTHING;
  SELECT * INTO STRICT r FROM native_billing_private.receipts WHERE key=k;
  IF r.owner_id<>actor OR r.snapshot_hash<>s->>'snapshotHash' THEN RAISE EXCEPTION 'b04_receipt_conflict'; END IF;
  IF EXISTS(SELECT 1 FROM native_billing_private.decisions WHERE key=k AND code=d->>'code') THEN RETURN '{}'::jsonb; END IF;
  IF r.last_code='projection_ready' AND d->>'code'<>'projection_ready' THEN RAISE EXCEPTION 'b04_terminal_receipt'; END IF;
  INSERT INTO public.billing_reconciliation_runs(owner_id,billing_origin,provider_environment,trigger_kind) VALUES(actor,'apple_app_store',env,'recovery') RETURNING id INTO run;
  INSERT INTO native_billing_private.decisions VALUES(k,d->>'code',run);
  UPDATE native_billing_private.receipts SET last_code=d->>'code' WHERE key=k;
  IF d->>'outcome'<>'apply' THEN UPDATE public.billing_reconciliation_runs SET status='no_change',provider_snapshot_ref=ref,provider_observed_at=(s->>'storeObservedAt')::timestamptz,before_projection_hash=before_hash,after_projection_hash=before_hash,decision_code=d->>'code',completed_at=clock_timestamp() WHERE id=run; END IF;
  RETURN '{}'::jsonb;
 ELSIF op='apply' THEN
  IF d->>'outcome' IS DISTINCT FROM 'apply' OR d->>'code' IS DISTINCT FROM 'projection_ready' OR old_account->>'plan_source' IN('admin','promotion') OR s->>'verification' IS DISTINCT FROM 'verified' OR s->>'accountBinding' IS DISTINCT FROM 'matched' THEN RAISE EXCEPTION 'b04_projection_denied'; END IF;
  IF (s->>'storeObservedAt')::timestamptz>clock_timestamp() OR (s->>'verifiedAt')::timestamptz>clock_timestamp() OR (s->>'storeObservedAt')::timestamptz<clock_timestamp()-interval '5 minutes' THEN RAISE EXCEPTION 'b04_stale'; END IF;
  SELECT * INTO STRICT m FROM native_billing_private.mappings WHERE environment=env AND product_id=s->>'productId' AND status='active';
  SELECT * INTO STRICT price FROM public.subscription_price_versions WHERE id=m.price_id AND commercial_status='active' AND effective_at<=clock_timestamp();
  IF ROW(price.id,price.plan_code,price.cadence) IS DISTINCT FROM ROW(s->>'mappedPriceVersionId',s->>'mappedPlanCode',s->>'mappedCadence') OR s->>'status' NOT IN('active','cancel_at_period_end','cancelled','refunded') THEN RAISE EXCEPTION 'b04_mapping'; END IF;
  IF EXISTS(SELECT 1 FROM public.billing_subscriptions WHERE owner_id=actor AND normalized_billing_status IN('active','past_due','unknown','trialing','disputed') AND (current_period_ends_at IS NULL OR current_period_ends_at>=clock_timestamp()) AND (billing_origin,provider_environment,provider_subscription_ref) IS DISTINCT FROM ('apple_app_store',env,ref)) THEN RAISE EXCEPTION 'b04_origin_conflict'; END IF;
  INSERT INTO public.billing_customer_links(owner_id,billing_origin,provider_environment,provider_customer_ref) VALUES(actor,'apple_app_store',env,b::text) ON CONFLICT DO NOTHING;
  SELECT id INTO STRICT customer FROM public.billing_customer_links WHERE owner_id=actor AND billing_origin='apple_app_store' AND provider_environment=env AND provider_customer_ref=b::text;
  SELECT * INTO sub FROM public.billing_subscriptions WHERE billing_origin='apple_app_store' AND provider_environment=env AND provider_subscription_ref=ref;
  IF sub.id IS NOT NULL AND sub.owner_id<>actor THEN RAISE EXCEPTION 'b04_owner_conflict'; END IF;
  INSERT INTO public.billing_subscriptions(billing_customer_link_id,owner_id,billing_origin,provider_environment,provider_subscription_ref,provider_product_ref,provider_price_ref,normalized_plan_code,normalized_cadence,normalized_billing_status,cancel_at_period_end,current_period_starts_at,current_period_ends_at,provider_observed_at,snapshot_hash,last_reconciled_at)
   VALUES(customer,actor,'apple_app_store',env,ref,s->>'productId',price.id,price.plan_code,price.cadence,CASE WHEN s->>'status'='cancel_at_period_end' THEN 'active' ELSE s->>'status' END,s->>'status'='cancel_at_period_end',(s->>'currentPeriodStartsAt')::timestamptz,(s->>'currentPeriodEndsAt')::timestamptz,(s->>'storeObservedAt')::timestamptz,s->>'snapshotHash',clock_timestamp())
   ON CONFLICT(billing_origin,provider_environment,provider_subscription_ref) DO UPDATE SET provider_product_ref=EXCLUDED.provider_product_ref,provider_price_ref=EXCLUDED.provider_price_ref,normalized_plan_code=EXCLUDED.normalized_plan_code,normalized_cadence=EXCLUDED.normalized_cadence,normalized_billing_status=EXCLUDED.normalized_billing_status,cancel_at_period_end=EXCLUDED.cancel_at_period_end,current_period_starts_at=EXCLUDED.current_period_starts_at,current_period_ends_at=EXCLUDED.current_period_ends_at,provider_observed_at=EXCLUDED.provider_observed_at,snapshot_hash=EXCLUDED.snapshot_hash,last_reconciled_at=EXCLUDED.last_reconciled_at;
  active:=s->>'status' IN('active','cancel_at_period_end') AND (s->>'currentPeriodEndsAt')::timestamptz>=clock_timestamp();
  INSERT INTO public.subscription_accounts(owner_id,plan_code,plan_source,billing_status,entitlement_status,entitlement_ends_at) VALUES(actor,price.plan_code,'billing',s->>'status',CASE WHEN active THEN 'active' ELSE 'inactive' END,(s->>'currentPeriodEndsAt')::timestamptz)
   ON CONFLICT(owner_id) DO UPDATE SET plan_code=EXCLUDED.plan_code,plan_source='billing',billing_status=EXCLUDED.billing_status,entitlement_status=EXCLUDED.entitlement_status,entitlement_ends_at=EXCLUDED.entitlement_ends_at WHERE subscription_accounts.plan_source IN('free','billing');
  SELECT to_jsonb(a) INTO after_account FROM public.subscription_accounts a WHERE owner_id=actor;
  UPDATE public.billing_reconciliation_runs SET status='succeeded',provider_snapshot_ref=ref,provider_observed_at=(s->>'storeObservedAt')::timestamptz,before_projection_hash=before_hash,after_projection_hash=encode(public.digest(after_account::text,'sha256'),'hex'),decision_code='projection_ready',completed_at=clock_timestamp() WHERE id=(SELECT run_id FROM native_billing_private.decisions WHERE key=k AND code='projection_ready');
  IF NOT FOUND THEN RAISE EXCEPTION 'b04_missing_audit'; END IF;
  RETURN '{}'::jsonb;
 END IF;
 RAISE EXCEPTION 'b04_operation';
END; $$;
REVOKE ALL ON ALL TABLES IN SCHEMA native_billing_private FROM PUBLIC,anon,authenticated,service_role,stallight_billing_writer;
REVOKE ALL ON FUNCTION native_billing_private.command(text,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT USAGE ON SCHEMA native_billing_private TO stallight_billing_writer;
GRANT EXECUTE ON FUNCTION native_billing_private.command(text,uuid,jsonb) TO stallight_billing_writer;
COMMIT;
