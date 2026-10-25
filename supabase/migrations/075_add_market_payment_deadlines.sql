-- UX-NEXT-01A: optional market registration deadlines, no payment ledger or push.
-- Requires 074. No historical backfill or original market projector replacement.
BEGIN;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS payment_deadline JSONB;

CREATE OR REPLACE FUNCTION public.market_payment_deadline_is_valid(deadline JSONB)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public AS $$
DECLARE parsed_date DATE;
BEGIN
  IF deadline IS NULL OR deadline = 'null'::JSONB THEN RETURN TRUE; END IF;
  IF jsonb_typeof(deadline) <> 'object' THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(deadline) AS k(key)
    WHERE key NOT IN ('date','time','timeZone','reminderEnabled')) THEN RETURN FALSE; END IF;
  IF jsonb_typeof(deadline->'date') IS DISTINCT FROM 'string'
    OR deadline->>'date' !~ '^\d{4}-\d{2}-\d{2}$'
    OR deadline->>'timeZone' IS DISTINCT FROM 'Asia/Taipei' THEN RETURN FALSE; END IF;
  IF deadline ? 'time' AND (jsonb_typeof(deadline->'time') IS DISTINCT FROM 'string'
    OR deadline->>'time' !~ '^([01]\d|2[0-3]):[0-5]\d$') THEN RETURN FALSE; END IF;
  IF deadline ? 'reminderEnabled' AND jsonb_typeof(deadline->'reminderEnabled') <> 'boolean' THEN RETURN FALSE; END IF;
  BEGIN
    parsed_date := (deadline->>'date')::DATE;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN FALSE;
  END;
  RETURN parsed_date BETWEEN DATE '1900-01-01' AND DATE '9999-12-31'
    AND to_char(parsed_date, 'YYYY-MM-DD') = deadline->>'date';
END;
$$;
REVOKE ALL ON FUNCTION public.market_payment_deadline_is_valid(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.market_payment_deadline_is_valid(JSONB) TO authenticated, service_role;

ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_payment_deadline_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_payment_deadline_check CHECK (
  public.market_payment_deadline_is_valid(payment_deadline)
  AND (session_origin IS DISTINCT FROM 'schedule' OR payment_deadline IS NULL OR payment_deadline='null'::JSONB)
);

CREATE OR REPLACE FUNCTION public.guard_market_payment_deadline_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
BEGIN
  IF (TG_OP='INSERT' AND NEW.payment_deadline IS NOT NULL)
    OR (TG_OP='UPDATE' AND NEW.payment_deadline IS DISTINCT FROM OLD.payment_deadline) THEN
    IF auth.uid() IS NULL OR NEW.owner_id IS DISTINCT FROM auth.uid()
      OR NOT public.can_manage_recurring_operations() THEN
      RAISE EXCEPTION 'Payment deadline management is owner-only' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_market_payment_deadline_change() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS guard_market_payment_deadline_change ON public.markets;
CREATE TRIGGER guard_market_payment_deadline_change BEFORE INSERT OR UPDATE ON public.markets
  FOR EACH ROW EXECUTE FUNCTION public.guard_market_payment_deadline_change();

CREATE OR REPLACE FUNCTION public.project_market_payment_deadline_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public AS $$
DECLARE fields JSONB; deadline JSONB; target_id UUID;
BEGIN
  IF NEW.type NOT IN ('market_created','market_updated') THEN RETURN NEW; END IF;
  fields := CASE WHEN NEW.type='market_updated' THEN NEW.payload->'updates' ELSE NEW.payload END;
  IF fields IS NULL OR jsonb_typeof(fields)<>'object' THEN RETURN NEW; END IF;
  IF NOT (fields ? 'paymentDeadline' OR fields ? 'payment_deadline') THEN RETURN NEW; END IF;
  IF fields ? 'paymentDeadline' AND fields ? 'payment_deadline'
    AND fields->'paymentDeadline' IS DISTINCT FROM fields->'payment_deadline' THEN
    RAISE EXCEPTION 'Conflicting payment deadline aliases' USING ERRCODE='22023';
  END IF;
  deadline := CASE WHEN fields ? 'paymentDeadline' THEN fields->'paymentDeadline' ELSE fields->'payment_deadline' END;
  IF NOT public.market_payment_deadline_is_valid(deadline) THEN
    RAISE EXCEPTION 'Invalid payment deadline' USING ERRCODE='22023';
  END IF;
  IF auth.uid() IS NULL OR NEW.actor_id IS DISTINCT FROM auth.uid()
    OR NOT public.can_manage_recurring_operations() THEN
    RAISE EXCEPTION 'Payment deadline events require an owner' USING ERRCODE='42501';
  END IF;
  target_id := COALESCE(NEW.market_id,(NEW.payload->>'market_id')::UUID,(NEW.payload->>'marketId')::UUID);
  UPDATE public.markets SET payment_deadline = NULLIF(deadline,'null'::JSONB)
    WHERE id=target_id AND owner_id=NEW.actor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payment deadline target outside owner scope' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.project_market_payment_deadline_event() FROM PUBLIC, anon, authenticated, service_role;

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM pg_trigger WHERE tgrelid='public.events'::regclass AND NOT tgisinternal
    AND tgenabled <> 'D' AND tgname IN ('trigger_update_market_read_model','trigger_update_recurring_operations_read_model')) <> 2 THEN
    RAISE EXCEPTION 'Expected parent market projectors before migration 075';
  END IF;
END;
$$;
DROP TRIGGER IF EXISTS zz_project_market_payment_deadline_event ON public.events;
CREATE TRIGGER zz_project_market_payment_deadline_event AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.project_market_payment_deadline_event();

-- Append operational date metadata using the existing view definition itself.
-- Preserve all deployed scopes, columns, financial redaction and grants.
DO $deadline_view$
DECLARE definition TEXT; references_count INTEGER;
BEGIN
  definition := pg_get_viewdef('public.staff_accessible_markets'::regclass);
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='staff_accessible_markets' AND column_name='payment_deadline') THEN
    IF (length(definition)-length(replace(definition,'m.payment_deadline','')))/length('m.payment_deadline') <> 2 THEN
      RAISE EXCEPTION 'Unexpected payment deadline view projection';
    END IF;
    RETURN;
  END IF;
  references_count := (length(definition)-length(replace(definition,'m.region_code','')))/length('m.region_code');
  IF references_count <> 2 OR (SELECT column_name FROM information_schema.columns WHERE table_schema='public'
    AND table_name='staff_accessible_markets' ORDER BY ordinal_position DESC LIMIT 1) <> 'region_code' THEN
    RAISE EXCEPTION 'Expected 074 region view before migration 075';
  END IF;
  EXECUTE 'CREATE OR REPLACE VIEW public.staff_accessible_markets AS '
    || replace(definition,'m.region_code','m.region_code, m.payment_deadline');
END;
$deadline_view$;

-- Self-verification in the same apply. Any failure aborts before COMMIT.
DO $readiness$
DECLARE routine TEXT; client_role TEXT;
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public'
    AND table_name IN ('markets','staff_accessible_markets') AND column_name='payment_deadline') <> 2 THEN
    RAISE EXCEPTION 'Payment deadline columns not ready';
  END IF;
  IF public.market_payment_deadline_is_valid('{"date":"2026-10-24","timeZone":"Asia/Taipei","reminderEnabled":true}') IS NOT TRUE
    OR public.market_payment_deadline_is_valid('{"date":"2026-02-30","timeZone":"Asia/Taipei"}') IS NOT FALSE
    OR public.market_payment_deadline_is_valid(NULL) IS NOT TRUE THEN
    RAISE EXCEPTION 'Payment deadline validator mismatch';
  END IF;
  FOREACH routine IN ARRAY ARRAY['public.project_market_payment_deadline_event()','public.guard_market_payment_deadline_change()'] LOOP
    FOREACH client_role IN ARRAY ARRAY['anon','authenticated','service_role'] LOOP
      IF has_function_privilege(client_role,routine,'EXECUTE') THEN
        RAISE EXCEPTION 'Unexpected EXECUTE grant for % on %',client_role,routine;
      END IF;
    END LOOP;
  END LOOP;
  IF has_function_privilege('anon','public.market_payment_deadline_is_valid(JSONB)','EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous deadline validator execution must be denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.events'::regclass
    AND tgname='zz_project_market_payment_deadline_event' AND NOT tgisinternal AND tgenabled <> 'D')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.markets'::regclass
      AND tgname='guard_market_payment_deadline_change' AND NOT tgisinternal AND tgenabled <> 'D')
    OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.markets'::regclass
      AND conname='markets_payment_deadline_check' AND convalidated) THEN
    RAISE EXCEPTION 'Payment deadline trigger or constraint not ready';
  END IF;
  RAISE NOTICE '075 payment deadline schema, validator, triggers and explicit grants passed';
END;
$readiness$;
COMMIT;
