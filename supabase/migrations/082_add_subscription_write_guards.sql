-- Pilot activation is separate. No existing owner is enrolled by this migration.
BEGIN;
CREATE TABLE IF NOT EXISTS public.subscription_write_guard_settings (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton),
  enforce_all BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO public.subscription_write_guard_settings(singleton) VALUES(TRUE) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.subscription_write_guard_owners (
  owner_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  allow_test_switch BOOLEAN NOT NULL DEFAULT FALSE,
  test_plan_code TEXT CHECK(test_plan_code IN ('free','pro','team')),
  test_expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK((test_plan_code IS NULL)=(test_expires_at IS NULL))
);
CREATE TABLE IF NOT EXISTS public.subscription_test_switch_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_code TEXT CHECK(plan_code IN ('free','pro','team')),
  expires_at TIMESTAMPTZ,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.subscription_write_guard_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_write_guard_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_test_switch_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_write_guard_settings,public.subscription_write_guard_owners,public.subscription_test_switch_audit FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.subscription_write_guard_active(p_owner UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT COALESCE((SELECT enforce_all FROM public.subscription_write_guard_settings WHERE singleton),FALSE)
   OR EXISTS(SELECT 1 FROM public.subscription_write_guard_owners WHERE owner_id=p_owner AND enabled);
$$;
CREATE OR REPLACE FUNCTION public.subscription_effective_plan(p_owner UUID) RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_plan TEXT;
BEGIN
 SELECT test_plan_code INTO v_plan FROM public.subscription_write_guard_owners
 WHERE owner_id=p_owner AND enabled AND allow_test_switch AND test_expires_at>now();
 IF v_plan IS NOT NULL THEN RETURN v_plan; END IF;
 -- Billing/promotion writers are intentionally not activated by this migration.
 SELECT plan_code INTO v_plan FROM public.subscription_accounts WHERE owner_id=p_owner
   AND plan_source='admin' AND billing_status='none' AND entitlement_status IN ('active','grace')
   AND (entitlement_ends_at IS NULL OR entitlement_ends_at>=now());
 RETURN COALESCE(v_plan,'free');
END; $$;
CREATE OR REPLACE FUNCTION public.has_authoritative_team_entitlement(p_owner_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.subscription_effective_plan(p_owner_id)='team';
$$;
CREATE OR REPLACE FUNCTION public.subscription_require_tier(p_owner UUID,p_min INTEGER) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_level INTEGER;
BEGIN
 IF p_owner IS NULL THEN RAISE EXCEPTION 'SUBSCRIPTION_SCOPE' USING ERRCODE='42501'; END IF;
 IF NOT public.subscription_write_guard_active(p_owner) THEN RETURN; END IF;
 v_level:=CASE public.subscription_effective_plan(p_owner) WHEN 'team' THEN 2 WHEN 'pro' THEN 1 ELSE 0 END;
 IF v_level<p_min THEN RAISE EXCEPTION 'SUBSCRIPTION_PLAN_REQUIRED' USING ERRCODE='42501'; END IF;
END; $$;

-- Additional entitlement check, never a replacement for entity RLS/role checks.
CREATE OR REPLACE FUNCTION public.check_subscription_write_for_actor(p_actor UUID,p_owner UUID,p_feature TEXT) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_min INTEGER; v_role TEXT; v_level INTEGER;
BEGIN
 IF p_feature IS NULL OR p_feature NOT IN ('sales','products','cash','product_photo','sales_photo','field_notes') OR p_actor IS NULL OR p_owner IS NULL THEN
   RETURN jsonb_build_object('allowed',FALSE,'reason','invalid_scope','enabled',TRUE); END IF;
 v_min:=CASE WHEN p_feature IN ('sales_photo','field_notes') THEN 2 ELSE 1 END;
 IF p_actor<>p_owner THEN
   SELECT role INTO v_role FROM public.staff_relationships WHERE owner_id=p_owner AND staff_id=p_actor AND status='active';
   IF NOT public.has_authoritative_team_entitlement(p_owner) OR v_role NOT IN ('manager','operator') OR v_role IS NULL
     OR p_feature='cash' OR (p_feature IN ('products','product_photo') AND v_role<>'manager') THEN
     RETURN jsonb_build_object('allowed',FALSE,'reason','role_forbidden','enabled',TRUE); END IF;
 END IF;
 IF NOT public.subscription_write_guard_active(p_owner) THEN
   RETURN jsonb_build_object('allowed',TRUE,'reason','pilot_not_enabled','enabled',FALSE); END IF;
 v_level:=CASE public.subscription_effective_plan(p_owner) WHEN 'team' THEN 2 WHEN 'pro' THEN 1 ELSE 0 END;
 RETURN jsonb_build_object('allowed',v_level>=v_min,'reason',CASE WHEN v_level>=v_min THEN 'allowed' ELSE 'plan_required' END,'enabled',TRUE);
END; $$;
CREATE OR REPLACE FUNCTION public.check_subscription_write_access(p_owner_id UUID,p_feature TEXT) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE='42501'; END IF;
 RETURN public.check_subscription_write_for_actor(auth.uid(),p_owner_id,p_feature);
END; $$;

CREATE OR REPLACE FUNCTION public.read_subscription_test_switch(p_actor UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_row public.subscription_write_guard_owners%ROWTYPE; v_active BOOLEAN;
BEGIN
 SELECT * INTO v_row FROM public.subscription_write_guard_owners WHERE owner_id=p_actor AND enabled AND allow_test_switch;
 IF NOT FOUND THEN RAISE EXCEPTION 'TEST_SWITCH_NOT_ALLOWED' USING ERRCODE='42501'; END IF;
 v_active:=COALESCE(v_row.test_expires_at>now(),FALSE);
 RETURN jsonb_build_object('enabled',v_active,'planCode',CASE WHEN v_active THEN v_row.test_plan_code ELSE NULL END,
   'expiresAt',CASE WHEN v_active THEN v_row.test_expires_at ELSE NULL END,'cloudBacked',TRUE);
END; $$;
CREATE OR REPLACE FUNCTION public.set_subscription_test_switch(p_actor UUID,p_plan TEXT,p_enabled BOOLEAN) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_expires TIMESTAMPTZ;
BEGIN
 IF p_actor IS NULL OR p_enabled IS NULL OR (p_enabled AND (p_plan IS NULL OR p_plan NOT IN ('free','pro','team'))) THEN
   RAISE EXCEPTION 'TEST_SWITCH_INPUT' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.subscription_write_guard_owners WHERE owner_id=p_actor AND enabled AND allow_test_switch FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'TEST_SWITCH_NOT_ALLOWED' USING ERRCODE='42501'; END IF;
 v_expires:=CASE WHEN p_enabled THEN clock_timestamp()+INTERVAL '4 hours' ELSE NULL END;
 UPDATE public.subscription_write_guard_owners SET test_plan_code=CASE WHEN p_enabled THEN p_plan ELSE NULL END,
   test_expires_at=v_expires,updated_at=clock_timestamp() WHERE owner_id=p_actor;
 INSERT INTO public.subscription_test_switch_audit(owner_id,plan_code,expires_at)
   VALUES(p_actor,CASE WHEN p_enabled THEN p_plan ELSE NULL END,v_expires);
 RETURN public.read_subscription_test_switch(p_actor);
END; $$;

-- Preserve the existing RPC shape and account ledger. Only an opted-in, unexpired
-- server-controlled test override takes precedence; reset reveals the original row.
CREATE OR REPLACE FUNCTION public.read_subscription_account_for_actor(p_actor_id UUID,p_owner_id UUID)
RETURNS TABLE(access_allowed BOOLEAN,account_exists BOOLEAN,owner_id UUID,plan_code TEXT,plan_source TEXT,
 billing_status TEXT,entitlement_status TEXT,entitlement_ends_at TIMESTAMPTZ,updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_test public.subscription_write_guard_owners%ROWTYPE;
BEGIN
 IF p_actor_id IS NULL OR p_owner_id IS NULL THEN RETURN; END IF;
 IF p_actor_id<>p_owner_id AND NOT EXISTS(SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id=p_owner_id
   AND sr.staff_id=p_actor_id AND sr.status='active' AND public.has_authoritative_team_entitlement(p_owner_id)) THEN RETURN; END IF;
 SELECT * INTO v_test FROM public.subscription_write_guard_owners t WHERE t.owner_id=p_owner_id AND t.enabled
   AND t.allow_test_switch AND t.test_expires_at>now();
 IF FOUND THEN
   RETURN QUERY SELECT TRUE,TRUE,p_owner_id,v_test.test_plan_code,
     CASE WHEN v_test.test_plan_code='free' THEN 'free' ELSE 'admin' END,'none'::TEXT,'active'::TEXT,
     CASE WHEN v_test.test_plan_code='free' THEN NULL::TIMESTAMPTZ ELSE v_test.test_expires_at END,v_test.updated_at;
   RETURN;
 END IF;
 RETURN QUERY SELECT TRUE,sa.owner_id IS NOT NULL,p_owner_id,sa.plan_code,sa.plan_source,sa.billing_status,
   sa.entitlement_status,sa.entitlement_ends_at,sa.updated_at
   FROM (SELECT 1) seed LEFT JOIN public.subscription_accounts sa ON sa.owner_id=p_owner_id;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_subscription_event_write() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_event JSONB:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 v_type TEXT; v_owner UUID; v_market UUID; v_product UUID; v_min INTEGER:=0; v_key TEXT; v_cloud_key TEXT; v_current JSONB; v_updates JSONB;
BEGIN
 -- Trusted service cleanup (e.g. account deletion) must remain possible.
 IF TG_OP='DELETE' AND auth.role()='service_role' THEN RETURN OLD; END IF;
 v_type:=v_event->>'type';
 -- Metadata-only acknowledgements stay possible after a downgrade.
 -- For enrolled owners semantic changes must be expressed as new events.
 IF TG_OP='UPDATE' AND NEW.type IS NOT DISTINCT FROM OLD.type AND NEW.payload IS NOT DISTINCT FROM OLD.payload
   AND NEW.actor_id IS NOT DISTINCT FROM OLD.actor_id AND NEW.market_id IS NOT DISTINCT FROM OLD.market_id THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN
   v_market:=COALESCE(OLD.market_id,(OLD.payload->>'market_id')::UUID,(OLD.payload->>'marketId')::UUID);
   IF v_market IS NOT NULL THEN SELECT m.owner_id INTO v_owner FROM public.markets m WHERE m.id=v_market;
   ELSIF OLD.type IN ('product_updated','product_deleted') THEN
     SELECT p.owner_id INTO v_owner FROM public.products p WHERE p.id=COALESCE((OLD.payload->>'productId')::UUID,(OLD.payload->>'product_id')::UUID);
   ELSE v_owner:=OLD.actor_id; END IF;
   IF public.subscription_write_guard_active(v_owner) THEN RAISE EXCEPTION 'EVENT_IMMUTABLE' USING ERRCODE='42501'; END IF;
 END IF;
 v_owner:=NULL;
 IF v_type IN ('deal_closed','deal_deleted','interaction_recorded','interaction_deleted','product_created','product_updated','product_deleted') THEN v_min:=1;
 ELSIF v_type IN ('field_note_created','field_note_updated','field_note_deleted') THEN v_min:=2;
 ELSIF v_type='market_updated' THEN v_min:=0;
 ELSE IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 v_market:=COALESCE((v_event->>'market_id')::UUID,(v_event#>>'{payload,market_id}')::UUID,(v_event#>>'{payload,marketId}')::UUID);
 IF v_market IS NOT NULL THEN
   SELECT m.owner_id,to_jsonb(m) INTO v_owner,v_current FROM public.markets m WHERE m.id=v_market;
 ELSIF v_type IN ('product_updated','product_deleted') THEN
   v_product:=COALESCE((v_event#>>'{payload,productId}')::UUID,(v_event#>>'{payload,product_id}')::UUID);
   SELECT p.owner_id INTO v_owner FROM public.products p WHERE p.id=v_product;
 ELSE v_owner:=(v_event->>'actor_id')::UUID; END IF;
 IF v_type='market_updated' THEN
   v_updates:=v_event#>'{payload,updates}';
   FOREACH v_key IN ARRAY ARRAY['total_revenue','total_profit','total_deals','total_interactions','totalRevenue','totalProfit','totalDeals','totalInteractions'] LOOP
     v_cloud_key:=CASE v_key WHEN 'totalRevenue' THEN 'total_revenue' WHEN 'totalProfit' THEN 'total_profit' WHEN 'totalDeals' THEN 'total_deals' WHEN 'totalInteractions' THEN 'total_interactions' ELSE v_key END;
     IF v_updates ? v_key AND COALESCE((v_updates->>v_key)::NUMERIC,0) IS DISTINCT FROM COALESCE((v_current->>v_cloud_key)::NUMERIC,0) THEN v_min:=1; END IF;
   END LOOP;
   IF v_min=0 THEN IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF; END IF;
 END IF;
 PERFORM public.subscription_require_tier(v_owner,v_min);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_subscription_row_write() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_row JSONB:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END; v_owner UUID; v_entity_owner UUID; v_min INTEGER:=TG_ARGV[0]::INTEGER;
BEGIN
 IF TG_OP='DELETE' AND auth.role()='service_role' THEN RETURN OLD; END IF;
 v_owner:=(v_row->>'owner_id')::UUID;
 IF v_row->>'market_id' IS NOT NULL THEN
   SELECT m.owner_id INTO v_entity_owner FROM public.markets m WHERE m.id=(v_row->>'market_id')::UUID;
 ELSIF TG_TABLE_NAME='product_cover_photos' THEN
   SELECT p.owner_id INTO v_entity_owner FROM public.products p WHERE p.id=(v_row->>'product_id')::UUID;
 ELSE v_entity_owner:=v_owner; END IF;
 IF v_owner IS NOT NULL AND v_entity_owner IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'SUBSCRIPTION_SCOPE' USING ERRCODE='42501'; END IF;
 v_owner:=v_entity_owner;
 IF TG_OP='UPDATE' AND v_row->>'owner_id' IS DISTINCT FROM to_jsonb(OLD)->>'owner_id' THEN
   RAISE EXCEPTION 'SUBSCRIPTION_SCOPE' USING ERRCODE='42501'; END IF;
 -- Failure/deletion/expiry compensation does not create a usable paid photo.
 IF TG_TABLE_NAME IN ('product_cover_photos','sale_photo_evidence') AND TG_OP='UPDATE'
   AND v_row->>'status' IN ('upload_failed','deleting','expired','waived_by_owner') THEN RETURN NEW; END IF;
 PERFORM public.subscription_require_tier(v_owner,v_min);
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.enforce_subscription_market_summary() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_key TEXT; v_new JSONB:=to_jsonb(NEW); v_old JSONB:=CASE WHEN TG_OP='INSERT' THEN '{}'::JSONB ELSE to_jsonb(OLD) END;
BEGIN
 FOREACH v_key IN ARRAY ARRAY['total_revenue','total_profit','total_deals','total_interactions'] LOOP
   IF COALESCE((v_new->>v_key)::NUMERIC,0) IS DISTINCT FROM COALESCE((v_old->>v_key)::NUMERIC,0) THEN
     PERFORM public.subscription_require_tier(NEW.owner_id,1); EXIT; END IF;
 END LOOP;
 RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS subscription_event_write ON public.events;
CREATE TRIGGER subscription_event_write BEFORE INSERT OR UPDATE OR DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_event_write();
DROP TRIGGER IF EXISTS subscription_market_summary ON public.markets;
CREATE TRIGGER subscription_market_summary BEFORE INSERT OR UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_market_summary();
DO $$ DECLARE v_table TEXT; v_min TEXT; BEGIN
 FOREACH v_table IN ARRAY ARRAY['products','market_cash_records','product_cover_photos','sale_photo_evidence','daily_stats'] LOOP
   IF to_regclass('public.'||v_table) IS NOT NULL THEN
     v_min:=CASE WHEN v_table='sale_photo_evidence' THEN '2' ELSE '1' END;
     EXECUTE format('DROP TRIGGER IF EXISTS subscription_row_write ON public.%I',v_table);
     EXECUTE format('CREATE TRIGGER subscription_row_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_row_write(%L)',v_table,v_min);
   END IF;
 END LOOP;
END; $$;

REVOKE ALL ON FUNCTION public.subscription_write_guard_active(UUID),public.subscription_effective_plan(UUID),public.has_authoritative_team_entitlement(UUID),
 public.subscription_require_tier(UUID,INTEGER),public.check_subscription_write_for_actor(UUID,UUID,TEXT),public.read_subscription_test_switch(UUID),
 public.set_subscription_test_switch(UUID,TEXT,BOOLEAN),public.enforce_subscription_event_write(),public.enforce_subscription_row_write(),public.enforce_subscription_market_summary()
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.read_subscription_account_for_actor(UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_subscription_account_for_actor(UUID,UUID),public.check_subscription_write_for_actor(UUID,UUID,TEXT),
 public.read_subscription_test_switch(UUID),public.set_subscription_test_switch(UUID,TEXT,BOOLEAN) TO service_role;
REVOKE ALL ON FUNCTION public.check_subscription_write_access(UUID,TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.check_subscription_write_access(UUID,TEXT) TO authenticated;
COMMIT;
