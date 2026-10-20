-- ============================================================
-- 068_add_daily_market_operation_sessions.sql
-- Date: 2026-08-12
--
-- Persist manual early-open and daily close state without completing an
-- entire multi-day market. The existing operation_phase stores the state;
-- operation_session_date scopes it to one scheduled day.
-- ============================================================

ALTER TABLE public.markets
ADD COLUMN IF NOT EXISTS operation_session_date DATE;

COMMENT ON COLUMN public.markets.operation_session_date IS
  'Scheduled market date to which operation_phase applies. Used for daily early-open and close state.';

CREATE OR REPLACE FUNCTION public.update_market_operation_session_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_updates JSONB;
  v_market_id UUID;
BEGIN
  IF NEW.type <> 'market_updated' THEN
    RETURN NEW;
  END IF;

  v_updates := NEW.payload->'updates';
  IF v_updates IS NULL OR jsonb_typeof(v_updates) <> 'object' THEN
    RETURN NEW;
  END IF;

  IF NOT (
    v_updates ? 'operation_phase' OR
    v_updates ? 'operationPhase' OR
    v_updates ? 'operation_session_date' OR
    v_updates ? 'operationSessionDate'
  ) THEN
    RETURN NEW;
  END IF;

  v_market_id := COALESCE(
    NULLIF(NEW.payload->>'market_id', '')::UUID,
    NULLIF(NEW.payload->>'marketId', '')::UUID,
    NEW.market_id
  );

  UPDATE public.markets
  SET
    operation_phase = CASE
      WHEN v_updates ? 'operation_phase' THEN NULLIF(v_updates->>'operation_phase', '')
      WHEN v_updates ? 'operationPhase' THEN NULLIF(v_updates->>'operationPhase', '')
      ELSE operation_phase
    END,
    operation_session_date = CASE
      WHEN v_updates ? 'operation_session_date'
        THEN NULLIF(v_updates->>'operation_session_date', '')::DATE
      WHEN v_updates ? 'operationSessionDate'
        THEN NULLIF(v_updates->>'operationSessionDate', '')::DATE
      ELSE operation_session_date
    END,
    updated_at = NEW.timestamp
  WHERE id = v_market_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trigger_update_market_operation_session_read_model ON public.events;

CREATE TRIGGER trigger_update_market_operation_session_read_model
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_market_operation_session_read_model();

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
SELECT
  m.id,
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
  'staff'::text AS access_type,
  m.sales_photo_evidence_required,
  m.operation_session_date
FROM public.markets m
JOIN public.staff_relationships sr ON sr.owner_id = m.owner_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'::text
  AND COALESCE(m.is_deleted, false) = false

UNION ALL

SELECT
  m.id,
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
  '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
  'owner'::text AS access_type,
  m.sales_photo_evidence_required,
  m.operation_session_date
FROM public.markets m
WHERE m.owner_id = auth.uid();

COMMENT ON VIEW public.staff_accessible_markets IS
  '068: Preserves staff financial redaction and exposes daily operation session state for shared live-action gating.';
