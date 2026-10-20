-- =============================================================================
-- 053_repair_staff_accessible_view_sanitization.sql
-- =============================================================================
--
-- Purpose:
--   Repair C2.20 read-only verification findings in staff-accessible views.
--
-- Findings addressed:
--   1. staff_accessible_markets owner branch still used market_members.user_id,
--      allowing staff rows in market_members to hit owner-style full fields.
--   2. staff_accessible_events returned duplicate staff-authored events because
--      staff branch rows could overlap with the owner-style actor_id branch.
--   3. sanitize_staff_event_payload did not remove deposit, while local
--      PermissionGate treats market/event deposit as sensitive for staff.
--
-- Safety:
--   - No data updates.
--   - No data deletes.
--   - No RLS policy changes.
--   - No base table schema changes.
--   - Rebuilds function/view definitions only.
--
-- Manual execution boundary:
--   This migration should be executed only after explicit approval.
--   After execution, rerun the verification block at the end of this file and
--   then rerun C2.20 read-only verification.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Section 1: staff event payload sanitizer
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sanitize_staff_event_payload(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  sensitive_keys text[] := ARRAY[
    -- Market cost / fee fields
    'boothCost', 'booth_cost',
    'registrationFee', 'registration_fee',
    'deposit',
    'commissionRate', 'commission_rate',
    'tableRental', 'table_rental',
    'chairRental', 'chair_rental',
    'umbrellaRental', 'umbrella_rental',
    'tableclothRental', 'tablecloth_rental',

    -- Product and sale cost fields
    'cost',
    'costAtTimeOfSale', 'cost_at_time_of_sale',
    'supplierInfo', 'supplier_info',
    'totalCost', 'total_cost',

    -- Profit fields
    'profitMargin', 'profit_margin',
    'grossMargin', 'gross_margin',
    'totalProfit', 'total_profit',
    'netProfit', 'net_profit',
    'profit'
  ];
  result jsonb;
  arr jsonb;
  cleaned_item jsonb;
  i int;
BEGIN
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RETURN payload;
  END IF;

  result := payload;
  FOR i IN 1..array_length(sensitive_keys, 1) LOOP
    result := result - sensitive_keys[i];
  END LOOP;

  IF result ? 'items' AND jsonb_typeof(result->'items') = 'array' THEN
    arr := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(result->'items') - 1 LOOP
      cleaned_item := public.sanitize_staff_event_payload(result->'items'->i);
      arr := arr || jsonb_build_array(cleaned_item);
    END LOOP;
    result := jsonb_set(result, '{items}', arr, false);
  END IF;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.sanitize_staff_event_payload(jsonb) IS
  '053: Staff event payload sanitizer. Removes owner-only financial/cost keys including deposit and recursively sanitizes items[].';

-- -----------------------------------------------------------------------------
-- Section 2: staff_accessible_markets
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF. Sensitive owner-only fields are nulled. Rental amounts are
-- preserved for operational equipment-status display, matching 042 intent.
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
  'staff'::text AS access_type
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
  'owner'::text AS access_type
FROM public.markets m
WHERE m.owner_id = auth.uid();

COMMENT ON VIEW public.staff_accessible_markets IS
  '053: Staff market view with strict owner branch, no market_members owner-branch match, deposit nulled for staff, rental fields preserved for operational display.';

-- -----------------------------------------------------------------------------
-- Section 3: staff_accessible_events
-- -----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.staff_accessible_events AS
-- Branch 1: STAFF market events. Payload is sanitized.
SELECT
  e.id,
  e.type,
  public.sanitize_staff_event_payload(e.payload) AS payload,
  e.actor_id,
  e.market_id,
  e."timestamp",
  e.metadata,
  e.sync_status,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff'::text AS access_type
FROM public.events e
JOIN public.markets m ON m.id = e.market_id
JOIN public.staff_relationships sr ON sr.owner_id = m.owner_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'::text
  AND COALESCE(m.is_deleted, false) = false

UNION ALL

-- Branch 2: STAFF owner-global events. Payload is sanitized.
SELECT
  e.id,
  e.type,
  public.sanitize_staff_event_payload(e.payload) AS payload,
  e.actor_id,
  e.market_id,
  e."timestamp",
  e.metadata,
  e.sync_status,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff'::text AS access_type
FROM public.events e
JOIN public.staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'::text
  AND e.market_id IS NULL

UNION ALL

-- Branch 3: OWNER self global events only. Market events owned by this owner
-- are covered by Branch 4, which prevents staff-authored market events from
-- matching this owner-style branch.
SELECT
  e.id,
  e.type,
  e.payload,
  e.actor_id,
  e.market_id,
  e."timestamp",
  e.metadata,
  e.sync_status,
  e.actor_id AS relationship_owner_id,
  '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
  'owner'::text AS access_type
FROM public.events e
WHERE e.actor_id = auth.uid()
  AND e.market_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.markets owned_market
    WHERE owned_market.owner_id = auth.uid()
  )

UNION ALL

-- Branch 4: OWNER owned-market events, including owner-authored and
-- staff-authored events in the owner market scope.
SELECT
  e.id,
  e.type,
  e.payload,
  e.actor_id,
  e.market_id,
  e."timestamp",
  e.metadata,
  e.sync_status,
  m.owner_id AS relationship_owner_id,
  '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
  'owner'::text AS access_type
FROM public.events e
JOIN public.markets m ON m.id = e.market_id
WHERE m.owner_id = auth.uid();

COMMENT ON VIEW public.staff_accessible_events IS
  '053: Staff event view with sanitized staff branches, owner self branch limited to global events, owner market branch using strict market ownership, and no staff-authored duplicate owner branch.';

-- -----------------------------------------------------------------------------
-- Section 4: read-only verification
-- -----------------------------------------------------------------------------
-- Replace STAFF_USER_UUID and OWNER_USER_UUID before running.
-- All verification blocks are read-only and transaction-local.

/*
-- V1: Staff market view should expose staff rows only, with sensitive columns nulled.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

SELECT access_type, count(*)
FROM public.staff_accessible_markets
GROUP BY access_type;
-- Expected: only access_type = 'staff'.

SELECT
  count(*) AS total_markets,
  count(*) FILTER (WHERE registration_fee IS NULL) AS registration_fee_null,
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE deposit IS NULL) AS deposit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null
FROM public.staff_accessible_markets;
-- Expected: every *_null count equals total_markets.

SELECT id, count(*)
FROM public.staff_accessible_markets
GROUP BY id
HAVING count(*) > 1;
-- Expected: 0 rows.

ROLLBACK;

-- V2: Staff event view should be sanitized and should not duplicate ids.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

SELECT access_type, count(*)
FROM public.staff_accessible_events
GROUP BY access_type;
-- Expected: only access_type = 'staff'.

SELECT
  count(*) AS total_events,
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'booth_cost') AS has_booth_cost,
  count(*) FILTER (WHERE payload ? 'registrationFee') AS has_registrationFee,
  count(*) FILTER (WHERE payload ? 'registration_fee') AS has_registration_fee,
  count(*) FILTER (WHERE payload ? 'deposit') AS has_deposit,
  count(*) FILTER (WHERE payload ? 'cost') AS has_cost,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo,
  count(*) FILTER (WHERE payload ? 'supplier_info') AS has_supplier_info,
  count(*) FILTER (WHERE payload ? 'totalProfit') AS has_totalProfit,
  count(*) FILTER (WHERE payload ? 'total_profit') AS has_total_profit
FROM public.staff_accessible_events;
-- Expected: every has_* count is 0.

SELECT id, type, market_id, count(*) AS duplicate_count
FROM public.staff_accessible_events
GROUP BY id, type, market_id
HAVING count(*) > 1;
-- Expected: 0 rows.

SELECT type, count(*)
FROM public.staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;
-- Expected: tombstones remain visible when present in staff market scope.

ROLLBACK;

-- V3: Owner still receives owner rows with full values.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);

SELECT access_type, count(*)
FROM public.staff_accessible_markets
GROUP BY access_type;
-- Expected: owner rows exist.

SELECT access_type, count(*)
FROM public.staff_accessible_events
GROUP BY access_type;
-- Expected: owner rows exist.

SELECT id, booth_cost, deposit, total_profit
FROM public.staff_accessible_markets
WHERE access_type = 'owner'
LIMIT 5;
-- Expected: owner financial fields are not forced to NULL.

ROLLBACK;
*/

-- =============================================================================
-- End of 053_repair_staff_accessible_view_sanitization.sql
-- =============================================================================
