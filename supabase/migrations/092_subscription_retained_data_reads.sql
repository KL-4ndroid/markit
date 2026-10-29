-- Install dormant read contracts first. Activate only after compatible clients are published.
BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS public.subscription_read_guard_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enforce_all boolean NOT NULL DEFAULT false
);
ALTER TABLE public.subscription_read_guard_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_read_guard_settings FROM PUBLIC,anon,authenticated,service_role;
INSERT INTO public.subscription_read_guard_settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.subscription_read_guard_active(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
 SELECT COALESCE((SELECT enforce_all FROM public.subscription_read_guard_settings WHERE singleton),false);
$body$;

CREATE OR REPLACE FUNCTION public.subscription_read_paid(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
 SELECT auth.uid() IS NOT NULL AND (p_owner=auth.uid() OR (
  public.has_authoritative_team_entitlement(p_owner) AND EXISTS(SELECT 1 FROM public.staff_relationships sr
   WHERE sr.owner_id=p_owner AND sr.staff_id=auth.uid() AND sr.status='active' AND sr.permissions->>'can_view'='true')))
 AND (NOT public.subscription_read_guard_active(p_owner)
  OR public.subscription_effective_plan(p_owner) IN ('pro','team'));
$body$;

CREATE OR REPLACE FUNCTION public.subscription_read_owner_paid(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
 SELECT auth.uid() IS NOT NULL AND auth.uid()=p_owner AND public.subscription_read_paid(p_owner);
$body$;

CREATE OR REPLACE FUNCTION public.subscription_read_staff(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
 SELECT auth.uid() IS NOT NULL AND public.has_authoritative_team_entitlement(p_owner)
 AND EXISTS(SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id=p_owner
  AND sr.staff_id=auth.uid() AND sr.status='active' AND sr.role IN ('viewer','operator','manager')
  AND sr.permissions->>'can_view'='true');
$body$;

CREATE OR REPLACE FUNCTION public.subscription_read_owner_advanced(p_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
 SELECT auth.uid()=p_owner AND (NOT public.subscription_read_guard_active(p_owner)
  OR public.subscription_effective_plan(p_owner)='team');
$body$;

CREATE OR REPLACE FUNCTION public.subscription_foundation_event(p_type text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $body$
 SELECT p_type IN ('market_created','market_updated','market_status_changed','market_started','market_ended','market_deleted',
 'venue_created','venue_updated','venue_archived','operation_schedule_created','operation_schedule_updated',
 'operation_schedule_paused','operation_schedule_resumed','operation_schedule_archived',
 'checklist_item_created','checklist_item_updated','checklist_item_toggled','checklist_item_deleted','settings_updated');
$body$;

CREATE OR REPLACE FUNCTION public.subscription_mask_json(p_value jsonb,p_keys text[]) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog,public AS $body$
DECLARE v_result jsonb;
BEGIN
 IF jsonb_typeof(p_value)='object' THEN
  SELECT COALESCE(jsonb_object_agg(key,public.subscription_mask_json(value,p_keys)),'{}'::jsonb)
   INTO v_result FROM jsonb_each(p_value) WHERE NOT(key=ANY(p_keys));
  RETURN v_result;
 ELSIF jsonb_typeof(p_value)='array' THEN
  SELECT COALESCE(jsonb_agg(public.subscription_mask_json(value,p_keys) ORDER BY ord),'[]'::jsonb)
   INTO v_result FROM jsonb_array_elements(p_value) WITH ORDINALITY AS entries(value,ord);
  RETURN v_result;
 END IF;
 RETURN p_value;
END;
$body$;

CREATE OR REPLACE FUNCTION public.subscription_free_payload(p_value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public AS $body$
 SELECT public.subscription_mask_json(p_value,ARRAY[
 'revenue','totalRevenue','total_revenue','totalAmount','total_amount','manualRevenue','manual_revenue','manualCost','manual_cost','manualProfit','manual_profit',
 'totalCost','total_cost','totalProfit','total_profit','netProfit','net_profit','profit','profitMargin','profit_margin',
 'cost','price','stock','totalSold','total_sold','totalDeals','total_deals','totalInteractions','total_interactions',
 'averageDealValue','average_deal_value','items','productsSold','products_sold','productIds','costAtTimeOfSale']);
$body$;

CREATE OR REPLACE FUNCTION public.subscription_staff_payload(p_value jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path=pg_catalog,public AS $body$
 SELECT public.subscription_mask_json(p_value,ARRAY[
 'cost','totalCost','total_cost','manualCost','manual_cost','manualProfit','costAtTimeOfSale','cost_at_time_of_sale',
 'supplierInfo','supplier_info','profit','profitMargin','profit_margin','grossMargin','gross_margin',
 'totalProfit','total_profit','netProfit','net_profit','boothCost','booth_cost','registrationFee','registration_fee',
 'deposit','commissionRate','commission_rate','costBreakdown','cost_breakdown','averageCost','average_cost','costPerItem','cost_per_item']);
$body$;

-- Owner metadata stays available through a masked, explicitly scoped view.
CREATE OR REPLACE VIEW public.owner_accessible_markets WITH(security_barrier=true) AS
 SELECT (jsonb_populate_record(NULL::public.markets,
  CASE WHEN public.subscription_read_paid(m.owner_id) THEN to_jsonb(m)
   ELSE to_jsonb(m)||jsonb_build_object('total_revenue',NULL,'total_profit',NULL,'total_interactions',NULL,'total_deals',NULL)
  END)).* FROM public.markets m WHERE m.owner_id=auth.uid();

CREATE OR REPLACE VIEW public.owner_accessible_events WITH(security_barrier=true) AS
 SELECT e.id,e.type,
  CASE WHEN public.subscription_read_paid(auth.uid()) THEN e.payload ELSE public.subscription_free_payload(e.payload) END AS payload,
  e.actor_id,e.market_id,e.timestamp,
  CASE WHEN public.subscription_read_paid(auth.uid()) THEN e.metadata ELSE NULL::jsonb END AS metadata,
  e.sync_status,e.created_at
 FROM public.events e LEFT JOIN public.markets m ON m.id=e.market_id
 LEFT JOIN public.products p ON e.market_id IS NULL AND e.type IN ('product_created','product_updated','product_deleted')
  AND p.id::text=COALESCE(e.payload->>'productId',e.payload->>'product_id')
 WHERE (m.owner_id=auth.uid() OR (e.market_id IS NULL AND
  CASE WHEN e.type IN ('product_created','product_updated','product_deleted') THEN p.owner_id=auth.uid() ELSE e.actor_id=auth.uid() END))
 AND (public.subscription_read_paid(auth.uid()) OR public.subscription_foundation_event(e.type));

-- Existing owner/staff views must not become an alternate unguarded route.
DO $views$
DECLARE v_name text; v_definition text; v_columns text; v_filter text; v_expression text; v_type text; col record;
BEGIN
 FOREACH v_name IN ARRAY ARRAY['staff_accessible_markets','staff_accessible_products','staff_accessible_events'] LOOP
  IF obj_description(('public.'||v_name)::regclass,'pg_class')='FERIA_SUBSCRIPTION_READ_V1' THEN CONTINUE; END IF;
  v_definition:=rtrim(pg_get_viewdef(('public.'||v_name)::regclass,true),E' ;\n\r'); v_columns:='';
  FOR col IN SELECT attname,atttypid,atttypmod FROM pg_attribute WHERE attrelid=('public.'||v_name)::regclass AND attnum>0 AND NOT attisdropped ORDER BY attnum LOOP
   v_expression:=format('s.%I',col.attname); v_type:=format_type(col.atttypid,col.atttypmod);
   IF v_name='staff_accessible_events' AND col.attname='payload' THEN
    v_expression:=$expr$CASE WHEN s.access_type='owner' AND NOT public.subscription_read_paid(s.relationship_owner_id) THEN public.subscription_free_payload(s.payload)
     WHEN s.access_type='staff' AND COALESCE(s.permissions->>'infoLevel','0') NOT IN ('2','3') THEN public.subscription_free_payload(public.subscription_staff_payload(s.payload))
     WHEN s.access_type='staff' THEN public.subscription_staff_payload(s.payload) ELSE s.payload END$expr$;
   ELSIF (v_name='staff_accessible_markets' AND col.attname IN ('total_revenue','total_profit','total_interactions','total_deals'))
    OR (v_name='staff_accessible_products' AND col.attname IN ('price','stock','total_sold')) THEN
    v_expression:=format($expr$CASE WHEN (s.access_type='owner' AND NOT public.subscription_read_paid(s.owner_id))
     OR (s.access_type='staff' AND COALESCE(s.permissions->>'infoLevel','0') NOT IN ('2','3')) THEN NULL::%s ELSE s.%I END$expr$,v_type,col.attname);
   ELSIF v_name='staff_accessible_events' AND col.attname='metadata' THEN
    v_expression:=$expr$CASE WHEN s.access_type='staff' OR NOT public.subscription_read_paid(s.relationship_owner_id) THEN NULL::jsonb ELSE s.metadata END$expr$;
   END IF;
   v_columns:=v_columns||CASE WHEN v_columns='' THEN '' ELSE ',' END||format('%s AS %I',v_expression,col.attname);
  END LOOP;
  v_filter:=CASE WHEN v_name='staff_accessible_products' THEN 'public.subscription_read_owner_paid(s.owner_id)'
   ELSE 's.owner_id=auth.uid()' END;
  IF v_name='staff_accessible_events' THEN
   v_filter:=$expr$s.relationship_owner_id=auth.uid() AND (public.subscription_read_paid(s.relationship_owner_id) OR public.subscription_foundation_event(s.type))$expr$;
  END IF;
  v_filter:='(s.access_type=''owner'' AND ('||v_filter||')) OR (s.access_type=''staff'' AND public.subscription_read_staff(s.relationship_owner_id)'
   ||CASE WHEN v_name='staff_accessible_events' THEN ' AND (COALESCE(s.permissions->>''infoLevel'',''0'') IN (''2'',''3'') OR public.subscription_foundation_event(s.type))' ELSE '' END||')';
  EXECUTE format('CREATE OR REPLACE VIEW public.%I WITH(security_barrier=true) AS SELECT %s FROM (%s) s WHERE %s',v_name,v_columns,v_definition,v_filter);
  EXECUTE format('COMMENT ON VIEW public.%I IS ''FERIA_SUBSCRIPTION_READ_V1''',v_name);
 END LOOP;
END;
$views$;

-- Restrictive policies supplement, never replace, existing ownership policies.
DO $policies$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['markets','products','events','market_cash_records','daily_stats'] LOOP
  IF t='daily_stats' AND to_regclass('public.daily_stats') IS NULL THEN CONTINUE; END IF;
  EXECUTE format('DROP POLICY IF EXISTS subscription_retained_paid_read ON public.%I',t);
  EXECUTE format('CREATE POLICY subscription_retained_paid_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.subscription_read_owner_paid(%s))',t,
   CASE WHEN t='events' THEN 'auth.uid()' ELSE 'owner_id' END);
 END LOOP;
 FOREACH t IN ARRAY ARRAY['product_cover_photos','sale_photo_evidence'] LOOP
  EXECUTE format('DROP POLICY IF EXISTS subscription_retained_paid_read ON public.%I',t);
  EXECUTE format('CREATE POLICY subscription_retained_paid_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s OR public.subscription_read_staff(owner_id))',t,
   CASE WHEN t='sale_photo_evidence' THEN 'public.subscription_read_owner_advanced(owner_id)' ELSE 'public.subscription_read_owner_paid(owner_id)' END);
 END LOOP;
END;
$policies$;

CREATE OR REPLACE FUNCTION public.read_subscription_data_scope() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'SUBSCRIPTION_READ_AUTH' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('ownerId',auth.uid(),'enforced',public.subscription_read_guard_active(auth.uid()),
  'scope',CASE WHEN NOT public.subscription_read_guard_active(auth.uid()) THEN 'legacy'
   WHEN public.subscription_effective_plan(auth.uid())='free' THEN 'foundation' ELSE 'paid' END);
END;
$body$;

CREATE OR REPLACE FUNCTION public.check_subscription_read_for_actor(p_actor uuid,p_owner uuid,p_feature text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $body$
DECLARE v_min integer; v_level integer;
BEGIN
 v_min:=CASE WHEN p_feature IN ('sales','products','cash','product_photo') THEN 1 WHEN p_feature IN ('sales_photo','advanced') THEN 2 ELSE NULL END;
 IF p_actor IS NULL OR p_owner IS NULL OR v_min IS NULL THEN RETURN jsonb_build_object('enabled',true,'allowed',false,'reason','invalid_scope'); END IF;
 IF p_actor<>p_owner AND (NOT public.has_authoritative_team_entitlement(p_owner) OR NOT EXISTS(
  SELECT 1 FROM public.staff_relationships WHERE owner_id=p_owner AND staff_id=p_actor AND status='active'
   AND role IN ('viewer','operator','manager') AND permissions->>'can_view'='true')) THEN
  RETURN jsonb_build_object('enabled',true,'allowed',false,'reason','role_forbidden'); END IF;
 IF NOT public.subscription_read_guard_active(p_owner) THEN RETURN jsonb_build_object('enabled',false,'allowed',true,'reason','pilot_not_enabled'); END IF;
 v_level:=CASE public.subscription_effective_plan(p_owner) WHEN 'team' THEN 2 WHEN 'pro' THEN 1 ELSE 0 END;
 RETURN jsonb_build_object('enabled',true,'allowed',v_level>=v_min,'reason',CASE WHEN v_level>=v_min THEN 'allowed' ELSE 'plan_required' END);
END;
$body$;

-- Cash sales is a SECURITY DEFINER read and therefore needs an explicit tier check.
DO $cash$
DECLARE d text;
BEGIN
 d:=pg_get_functiondef('public.read_market_cash_sales(uuid)'::regprocedure);
 IF position('FERIA_CASH_READ_TIER_V1' IN d)=0 THEN
  d:=regexp_replace(d,'BEGIN',E'BEGIN\n -- FERIA_CASH_READ_TIER_V1\n IF NOT public.subscription_read_paid(auth.uid()) THEN RAISE EXCEPTION ''SUBSCRIPTION_READ_REQUIRED'' USING ERRCODE=''42501''; END IF;');
  EXECUTE d;
 END IF;
END;
$cash$;

REVOKE ALL ON FUNCTION public.subscription_read_guard_active(uuid),public.subscription_read_paid(uuid),public.subscription_read_owner_paid(uuid),
 public.subscription_read_staff(uuid),public.subscription_read_owner_advanced(uuid),public.subscription_foundation_event(text),public.subscription_mask_json(jsonb,text[]),
 public.subscription_free_payload(jsonb),public.subscription_staff_payload(jsonb),public.read_subscription_data_scope(),
 public.check_subscription_read_for_actor(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.subscription_read_owner_paid(uuid),public.subscription_read_owner_advanced(uuid),public.subscription_read_staff(uuid),public.subscription_read_paid(uuid),
 public.subscription_foundation_event(text),public.subscription_mask_json(jsonb,text[]),public.subscription_free_payload(jsonb),
 public.subscription_staff_payload(jsonb),public.read_subscription_data_scope() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_subscription_read_for_actor(uuid,uuid,text) TO service_role;
REVOKE ALL ON public.owner_accessible_markets,public.owner_accessible_events,
 public.staff_accessible_markets,public.staff_accessible_products,public.staff_accessible_events FROM PUBLIC,anon;
GRANT SELECT ON public.owner_accessible_markets,public.owner_accessible_events,
 public.staff_accessible_markets,public.staff_accessible_products,public.staff_accessible_events TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
