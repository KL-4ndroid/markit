-- ============================================================
-- 056_wire_sales_photo_evidence_market_projection.sql
-- Date: 2026-07-04
--
-- Scope:
--   - Wire markets.sales_photo_evidence_required into the existing market
--     read-model trigger.
--   - Expose the non-sensitive flag from staff_accessible_markets.
--
-- Non-goals:
--   - Do not create sale_photo_evidence rows.
--   - Do not add photo capture, R2 upload, signed URL, or album behavior.
--   - Do not change events RLS, event type constraints, staff permissions, or
--     sensitive financial redaction.
--   - Do not backfill old markets from historical events.
-- ============================================================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_updates JSONB;
BEGIN
  CASE NEW.type
    WHEN 'market_created' THEN
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
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        'registered',
        (NEW.payload->>'earlyEntryEnabled')::BOOLEAN,
        (NEW.payload->>'earlyEntryTime')::TIME,
        (NEW.payload->>'checkInTime')::TIME,
        (NEW.payload->>'operatingStartTime')::TIME,
        (NEW.payload->>'operatingEndTime')::TIME,
        (NEW.payload->>'registrationFee')::NUMERIC,
        (NEW.payload->>'boothCost')::NUMERIC,
        (NEW.payload->>'deposit')::NUMERIC,
        (NEW.payload->>'tableRental')::NUMERIC,
        (NEW.payload->>'chairRental')::NUMERIC,
        (NEW.payload->>'umbrellaRental')::NUMERIC,
        (NEW.payload->>'tableclothRental')::NUMERIC,
        (NEW.payload->>'commissionRate')::NUMERIC,
        (NEW.payload->>'tableFree')::BOOLEAN,
        (NEW.payload->>'chairFree')::BOOLEAN,
        (NEW.payload->>'umbrellaFree')::BOOLEAN,
        (NEW.payload->>'tableclothFree')::BOOLEAN,
        COALESCE(
          (NEW.payload->>'sales_photo_evidence_required')::BOOLEAN,
          (NEW.payload->>'salesPhotoEvidenceRequired')::BOOLEAN,
          FALSE
        ),
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO market_members (market_id, user_id, role)
      VALUES (NEW.market_id, NEW.actor_id, 'owner')
      ON CONFLICT (market_id, user_id) DO NOTHING;

    WHEN 'market_updated' THEN
      v_updates := NEW.payload->'updates';

      UPDATE markets
      SET
        name = COALESCE((v_updates->>'name')::TEXT, name),
        location = COALESCE((v_updates->>'location')::TEXT, location),
        start_date = COALESCE((v_updates->>'start_date')::DATE, start_date),
        end_date = COALESCE((v_updates->>'end_date')::DATE, end_date),
        early_entry_enabled = COALESCE((v_updates->>'early_entry_enabled')::BOOLEAN, early_entry_enabled),
        early_entry_time = COALESCE((v_updates->>'early_entry_time')::TIME, early_entry_time),
        check_in_time = COALESCE((v_updates->>'check_in_time')::TIME, check_in_time),
        operating_start_time = COALESCE((v_updates->>'operating_start_time')::TIME, operating_start_time),
        operating_end_time = COALESCE((v_updates->>'operating_end_time')::TIME, operating_end_time),
        registration_fee = COALESCE((v_updates->>'registration_fee')::NUMERIC, registration_fee),
        booth_cost = COALESCE((v_updates->>'booth_cost')::NUMERIC, booth_cost),
        deposit = COALESCE((v_updates->>'deposit')::NUMERIC, deposit),
        table_rental = COALESCE((v_updates->>'table_rental')::NUMERIC, table_rental),
        chair_rental = COALESCE((v_updates->>'chair_rental')::NUMERIC, chair_rental),
        umbrella_rental = COALESCE((v_updates->>'umbrella_rental')::NUMERIC, umbrella_rental),
        tablecloth_rental = COALESCE((v_updates->>'tablecloth_rental')::NUMERIC, tablecloth_rental),
        commission_rate = COALESCE((v_updates->>'commission_rate')::NUMERIC, commission_rate),
        table_free = COALESCE((v_updates->>'table_free')::BOOLEAN, table_free),
        chair_free = COALESCE((v_updates->>'chair_free')::BOOLEAN, chair_free),
        umbrella_free = COALESCE((v_updates->>'umbrella_free')::BOOLEAN, umbrella_free),
        tablecloth_free = COALESCE((v_updates->>'tablecloth_free')::BOOLEAN, tablecloth_free),
        sales_photo_evidence_required = COALESCE(
          (v_updates->>'sales_photo_evidence_required')::BOOLEAN,
          (v_updates->>'salesPhotoEvidenceRequired')::BOOLEAN,
          sales_photo_evidence_required
        ),
        notes = COALESCE((v_updates->>'notes')::TEXT, notes),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'market_id')::UUID;

    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    WHEN 'market_started' THEN
      UPDATE markets
      SET
        status = 'ongoing',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    WHEN 'market_ended' THEN
      UPDATE markets
      SET
        status = 'completed',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    WHEN 'market_deleted' THEN
      UPDATE markets
      SET
        is_deleted = TRUE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;

    WHEN 'deal_closed' THEN
      UPDATE markets
      SET
        total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;

    WHEN 'interaction_recorded' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_market_read_model() IS
  'CQRS: updates markets read model from events. 056 wires sales_photo_evidence_required from market_created and market_updated payloads.';

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF. Sensitive owner-only fields are nulled. The sales photo
-- evidence requirement is operational and intentionally visible read-only.
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
  m.sales_photo_evidence_required
FROM public.markets m
JOIN public.staff_relationships sr ON sr.owner_id = m.owner_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'::text
  AND COALESCE(m.is_deleted, false) = false

UNION ALL

-- Branch 2: OWNER. Strict ownership only; do not use membership joins here.
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
  m.sales_photo_evidence_required
FROM public.markets m
WHERE m.owner_id = auth.uid();

COMMENT ON VIEW public.staff_accessible_markets IS
  '056: Staff market view preserves 053 redaction and exposes sales_photo_evidence_required as non-sensitive operational state.';

-- Verification notes:
-- 1. Existing markets are not backfilled.
-- 2. Existing staff financial redaction remains unchanged.
-- 3. This migration intentionally does not alter public.events, evidence
--    metadata rows, queued sync tables, R2, or runtime routes.
