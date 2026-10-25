-- UX-NEXT-05A. Additive region snapshots; no historical classification/backfill.
-- Apply after 070-073. Keep client writes off until the verification runbook passes.
BEGIN;

ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS region_code TEXT;
ALTER TABLE public.venues ADD COLUMN IF NOT EXISTS region_code TEXT;

CREATE OR REPLACE FUNCTION public.market_region_code_is_valid(code TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE
SET search_path = pg_catalog, public AS $$
  SELECT code IS NULL OR code = ANY (ARRAY[
    'tw-taipei-city', 'tw-new-taipei-city', 'tw-keelung-city', 'tw-taoyuan-city',
    'tw-hsinchu-city', 'tw-hsinchu-county', 'tw-miaoli-county', 'tw-taichung-city',
    'tw-changhua-county', 'tw-nantou-county', 'tw-yunlin-county', 'tw-chiayi-city',
    'tw-chiayi-county', 'tw-tainan-city', 'tw-kaohsiung-city', 'tw-pingtung-county',
    'tw-yilan-county', 'tw-hualien-county', 'tw-taitung-county', 'tw-penghu-county',
    'tw-kinmen-county', 'tw-lienchiang-county'
  ]::TEXT[]);
$$;
-- Supabase default privileges may grant roles directly in addition to PUBLIC.
REVOKE ALL ON FUNCTION public.market_region_code_is_valid(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.market_region_code_is_valid(TEXT) TO authenticated, service_role;

ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_region_code_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_region_code_check
  CHECK (public.market_region_code_is_valid(region_code));
ALTER TABLE public.venues DROP CONSTRAINT IF EXISTS venues_region_code_check;
ALTER TABLE public.venues ADD CONSTRAINT venues_region_code_check
  CHECK (public.market_region_code_is_valid(region_code));

-- Defense in depth for direct table updates as well as event projection.
-- No new Staff capability: region classification is owner-managed metadata.
CREATE OR REPLACE FUNCTION public.guard_market_region_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.region_code IS NOT NULL)
    OR (TG_OP = 'UPDATE' AND NEW.region_code IS DISTINCT FROM OLD.region_code) THEN
    IF auth.uid() IS NULL OR NEW.owner_id IS DISTINCT FROM auth.uid()
      OR NOT public.can_manage_recurring_operations() THEN
      RAISE EXCEPTION 'Region classification is owner-only' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_market_region_change() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS guard_market_region_change ON public.markets;
CREATE TRIGGER guard_market_region_change BEFORE INSERT OR UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION public.guard_market_region_change();
DROP TRIGGER IF EXISTS guard_venue_region_change ON public.venues;
CREATE TRIGGER guard_venue_region_change BEFORE INSERT OR UPDATE ON public.venues
  FOR EACH ROW EXECUTE FUNCTION public.guard_market_region_change();

CREATE OR REPLACE FUNCTION public.project_market_region_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE
  fields JSONB;
  region JSONB;
  region_text TEXT;
  target_id UUID;
BEGIN
  IF NEW.type NOT IN ('market_created', 'market_updated', 'venue_created', 'venue_updated') THEN
    RETURN NEW;
  END IF;
  fields := CASE WHEN NEW.type IN ('market_updated', 'venue_updated')
    THEN NEW.payload->'updates' ELSE NEW.payload END;
  IF fields IS NULL OR jsonb_typeof(fields) <> 'object' THEN RETURN NEW; END IF;
  -- Old clients omit the key: preserve existing snapshots, including null.
  IF NOT (fields ? 'regionCode' OR fields ? 'region_code') THEN RETURN NEW; END IF;
  IF fields ? 'regionCode' AND fields ? 'region_code'
    AND fields->'regionCode' IS DISTINCT FROM fields->'region_code' THEN
    RAISE EXCEPTION 'Conflicting region aliases' USING ERRCODE = '22023';
  END IF;
  region := CASE WHEN fields ? 'regionCode' THEN fields->'regionCode' ELSE fields->'region_code' END;
  IF jsonb_typeof(region) NOT IN ('null', 'string') THEN
    RAISE EXCEPTION 'Invalid region value' USING ERRCODE = '22023';
  END IF;
  region_text := CASE WHEN region = 'null'::JSONB THEN NULL ELSE region #>> '{}' END;
  IF NOT public.market_region_code_is_valid(region_text) THEN
    RAISE EXCEPTION 'Unknown region code' USING ERRCODE = '22023';
  END IF;
  IF auth.uid() IS NULL OR NEW.actor_id IS DISTINCT FROM auth.uid()
    OR NOT public.can_manage_recurring_operations() THEN
    RAISE EXCEPTION 'Region events require an authenticated owner' USING ERRCODE = '42501';
  END IF;

  IF NEW.type IN ('market_created', 'market_updated') THEN
    target_id := COALESCE(NEW.market_id, (NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID);
    UPDATE public.markets SET region_code = region_text
      WHERE id = target_id AND owner_id = NEW.actor_id;
  ELSE
    target_id := (NEW.payload->>'venueId')::UUID;
    UPDATE public.venues SET region_code = region_text
      WHERE id = target_id AND owner_id = NEW.actor_id;
  END IF;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Region target not found in owner scope' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_market_region_event() FROM PUBLIC, anon, authenticated, service_role;

-- AFTER triggers run in name order: both parent read models must already exist.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.events'::regclass
    AND tgname = 'trigger_update_market_read_model' AND NOT tgisinternal)
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'public.events'::regclass
    AND tgname = 'trigger_update_recurring_operations_read_model' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Expected market and recurring projectors before applying 074';
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS zz_project_market_region_event ON public.events;
CREATE TRIGGER zz_project_market_region_event AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.project_market_region_event();

-- Append region_code to the current 069 view; preserve column order, scope and redaction.
-- Capture/replace/compare in ONE statement. No temporary table or pooled-session state.
DO $region_view$
DECLARE
  before_definition TEXT := pg_get_viewdef('public.staff_accessible_markets'::regclass);
  after_definition TEXT;
BEGIN
EXECUTE $view_sql$
CREATE OR REPLACE VIEW public.staff_accessible_markets AS
SELECT
  m.id, m.owner_id, m.name, m.location, m.start_date, m.end_date, m.status,
  m.early_entry_enabled, m.early_entry_time, m.check_in_time,
  m.operating_start_time, m.operating_end_time,
  NULL::numeric(10,2) AS registration_fee,
  NULL::numeric(10,2) AS booth_cost,
  NULL::numeric(10,2) AS deposit,
  m.table_rental, m.chair_rental, m.umbrella_rental, m.tablecloth_rental,
  NULL::numeric(5,2) AS commission_rate,
  m.table_free, m.chair_free, m.umbrella_free, m.tablecloth_free,
  m.total_revenue,
  NULL::numeric(10,2) AS total_profit,
  m.total_interactions, m.total_deals, m.notes, m.created_at, m.updated_at,
  m.is_collaborative, m.operation_phase, m.is_deleted, m.sync_status,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff'::text AS access_type,
  m.sales_photo_evidence_required,
  m.operation_session_date,
  m.venue_id, m.schedule_id, m.session_origin, m.schedule_occurrence_key,
  m.schedule_revision, m.schedule_occurrence_state, m.is_schedule_override,
  m.region_code
FROM public.markets m
JOIN public.staff_relationships sr ON sr.owner_id = m.owner_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'::text
  AND COALESCE(m.is_deleted, false) = false
UNION ALL
SELECT
  m.id, m.owner_id, m.name, m.location, m.start_date, m.end_date, m.status,
  m.early_entry_enabled, m.early_entry_time, m.check_in_time,
  m.operating_start_time, m.operating_end_time,
  m.registration_fee, m.booth_cost, m.deposit,
  m.table_rental, m.chair_rental, m.umbrella_rental, m.tablecloth_rental,
  m.commission_rate,
  m.table_free, m.chair_free, m.umbrella_free, m.tablecloth_free,
  m.total_revenue, m.total_profit, m.total_interactions, m.total_deals,
  m.notes, m.created_at, m.updated_at, m.is_collaborative, m.operation_phase,
  m.is_deleted, m.sync_status,
  m.owner_id AS relationship_owner_id,
  '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
  'owner'::text AS access_type,
  m.sales_photo_evidence_required,
  m.operation_session_date,
  m.venue_id, m.schedule_id, m.session_origin, m.schedule_occurrence_key,
  m.schedule_revision, m.schedule_occurrence_state, m.is_schedule_override,
  m.region_code
FROM public.markets m WHERE m.owner_id = auth.uid();
$view_sql$;
  after_definition := pg_get_viewdef('public.staff_accessible_markets'::regclass);
  IF regexp_replace(regexp_replace(before_definition, ',\s*m\.region_code', '', 'g'), '\s', '', 'g')
    IS DISTINCT FROM
    regexp_replace(regexp_replace(after_definition, ',\s*m\.region_code', '', 'g'), '\s', '', 'g') THEN
    RAISE EXCEPTION 'Unexpected staff view definition; inspect before applying 074';
  END IF;
END;
$region_view$;
COMMENT ON VIEW public.staff_accessible_markets IS
  '074: Appends non-financial region metadata. Existing owner/staff scope and financial redaction remain unchanged.';

COMMIT;
