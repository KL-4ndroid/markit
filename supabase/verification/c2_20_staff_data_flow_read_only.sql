-- C2.20 Staff Data Flow Read-Only Verification
-- Date prepared: 2026-06-29
--
-- Safety boundary:
-- - Read-only SELECT statements only.
-- - BEGIN / SET LOCAL / ROLLBACK blocks are used only for transaction-local
--   auth.uid() simulation in Supabase SQL Editor.
-- - No INSERT / UPDATE / DELETE / UPSERT / TRUNCATE.
-- - No schema, RLS, policy, function, or migration changes.
-- - Non-zero anomaly rows are audit findings, not repair approval.
--
-- Required placeholders:
-- - <OWNER_ID>: owner user/profile id.
-- - <STAFF_ID>: active staff user/profile id related to that owner.
--
-- Recommended use:
-- 1. Run C2.20-0 to identify candidate active owner/staff pairs if needed.
-- 2. Replace <OWNER_ID> and <STAFF_ID>.
-- 3. Run each section in Supabase SQL Editor.
-- 4. Record outputs in docs/C2.20_READ_ONLY_VERIFICATION_RESULT_TEMPLATE.md.

-- ---------------------------------------------------------------------------
-- C2.20-0: Candidate active owner/staff pairs
-- Purpose:
--   Find active staff relationships that can be used for the placeholder-based
--   checks below.
-- Expected:
--   At least one active relationship in environments where staff verification
--   is possible.
-- ---------------------------------------------------------------------------

SELECT
  sr.owner_id,
  sr.staff_id,
  sr.status,
  sr.role,
  COUNT(DISTINCT mm.market_id) AS related_market_count
FROM public.staff_relationships sr
LEFT JOIN public.market_members mm ON mm.user_id = sr.owner_id
WHERE sr.status = 'active'
GROUP BY sr.owner_id, sr.staff_id, sr.status, sr.role
ORDER BY related_market_count DESC, sr.owner_id, sr.staff_id
LIMIT 20;

-- ---------------------------------------------------------------------------
-- C2.20-A: Staff view definitions
-- Purpose:
--   Confirm deployed staff views and sanitizer function shape.
-- Expected:
--   - staff_accessible_events includes tombstone-capable market-scoped events.
--   - staff branch event payload is sanitized by the deployed view/function.
--   - active staff relationship filtering is present.
-- ---------------------------------------------------------------------------

SELECT
  'staff_accessible_markets' AS object_name,
  pg_get_viewdef('public.staff_accessible_markets'::regclass, true) AS definition
UNION ALL
SELECT
  'staff_accessible_products' AS object_name,
  pg_get_viewdef('public.staff_accessible_products'::regclass, true) AS definition
UNION ALL
SELECT
  'staff_accessible_events' AS object_name,
  pg_get_viewdef('public.staff_accessible_events'::regclass, true) AS definition;

SELECT
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'sanitize_staff_event_payload';

-- ---------------------------------------------------------------------------
-- C2.20-B: Tombstone root market id coverage
-- Purpose:
--   Confirm deletion tombstones have root market ids and target event ids.
-- Expected:
--   missing_root_market_id = 0
--   missing_target_event_id = 0
-- ---------------------------------------------------------------------------

SELECT
  type,
  COUNT(*) AS tombstone_count,
  COUNT(*) FILTER (WHERE market_id IS NULL) AS missing_root_market_id,
  COUNT(*) FILTER (
    WHERE COALESCE(payload->>'eventId', payload->>'event_id') IS NULL
  ) AS missing_target_event_id
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;

-- ---------------------------------------------------------------------------
-- C2.20-C: Inspect tombstones missing root market id
-- Purpose:
--   Only relevant if C2.20-B reports missing_root_market_id > 0.
-- Expected:
--   Zero rows is ideal.
-- ---------------------------------------------------------------------------

SELECT
  id,
  type,
  market_id,
  payload->>'marketId' AS payload_market_id_camel,
  payload->>'market_id' AS payload_market_id_snake,
  payload->>'eventId' AS payload_event_id_camel,
  payload->>'event_id' AS payload_event_id_snake,
  timestamp,
  created_at
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
  AND market_id IS NULL
ORDER BY created_at DESC NULLS LAST, timestamp DESC
LIMIT 50;

-- ---------------------------------------------------------------------------
-- C2.20-D: Explicit owner/staff relationship event coverage
-- Purpose:
--   Check whether market-scoped projection events and tombstones are reachable
--   through the active owner/staff relationship.
-- Expected:
--   - Staff-related market events are reachable through the relationship.
--   - Deleted/tombstone event counts are not unexpectedly absent.
--   - missing_root_market_id = 0.
-- ---------------------------------------------------------------------------

SELECT
  e.type,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE e.market_id IS NULL) AS missing_root_market_id
FROM public.events e
JOIN public.market_members mm ON mm.market_id = e.market_id
JOIN public.staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.owner_id = '<OWNER_ID>'::uuid
  AND sr.staff_id = '<STAFF_ID>'::uuid
  AND sr.status = 'active'
  AND e.type IN ('deal_closed', 'deal_deleted', 'interaction_recorded', 'interaction_deleted')
GROUP BY e.type
ORDER BY e.type;

-- ---------------------------------------------------------------------------
-- C2.20-E: Staff-session view counts
-- Purpose:
--   Simulate the staff user and confirm the staff views return scoped rows.
-- Expected:
--   - Counts may be zero only if the selected staff has no accessible data.
--   - Non-zero staff_accessible_events should be scoped to authorized markets.
-- ---------------------------------------------------------------------------

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT count(*) AS staff_markets_view
FROM public.staff_accessible_markets;

SELECT count(*) AS staff_products_view
FROM public.staff_accessible_products;

SELECT count(*) AS staff_events_view
FROM public.staff_accessible_events;

SELECT
  type,
  COUNT(*) AS event_count
FROM public.staff_accessible_events
WHERE type IN ('deal_closed', 'deal_deleted', 'interaction_recorded', 'interaction_deleted')
GROUP BY type
ORDER BY type;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- C2.20-I: Staff-session deposit payload classification sample
-- Purpose:
--   Run only if C2.20-G reports has_deposit > 0.
--   Classify whether `deposit` in staff-visible event payloads is an owner-only
--   sensitive financial field or a non-sensitive operational field.
-- Expected:
--   Human classification. No automatic repair is approved.
-- ---------------------------------------------------------------------------

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT
  id,
  type,
  market_id,
  actor_id,
  timestamp,
  payload
FROM public.staff_accessible_events
WHERE payload ? 'deposit'
ORDER BY timestamp DESC NULLS LAST
LIMIT 30;

ROLLBACK;
-- ---------------------------------------------------------------------------
-- C2.20-F: Staff-session tombstone visibility
-- Purpose:
--   Confirm tombstone events are visible through staff_accessible_events when
--   they exist in the staff-accessible market scope.
-- Expected:
--   - If explicit relationship coverage in C2.20-D shows tombstones, this view
--     should expose corresponding tombstone rows.
--   - Tombstone rows should keep target event ids.
-- ---------------------------------------------------------------------------

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT
  type,
  COUNT(*) AS tombstone_count,
  COUNT(*) FILTER (WHERE market_id IS NULL) AS missing_root_market_id,
  COUNT(*) FILTER (
    WHERE COALESCE(payload->>'eventId', payload->>'event_id') IS NULL
  ) AS missing_target_event_id
FROM public.staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;

SELECT
  id,
  type,
  market_id,
  payload->>'eventId' AS payload_event_id_camel,
  payload->>'event_id' AS payload_event_id_snake,
  timestamp
FROM public.staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
ORDER BY timestamp DESC NULLS LAST
LIMIT 20;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- C2.20-G: Staff-session event payload sensitive-key check
-- Purpose:
--   Confirm staff_accessible_events payloads do not expose sensitive financial
--   or supplier keys that local staff replay should never receive.
-- Expected:
--   All has_* counts should be 0 for staff session.
-- ---------------------------------------------------------------------------

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT
  count(*) AS total_events,
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost') AS has_cost,
  count(*) FILTER (WHERE payload ? 'costAtTimeOfSale') AS has_costAtTimeOfSale,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo,
  count(*) FILTER (WHERE payload ? 'profitMargin') AS has_profitMargin,
  count(*) FILTER (WHERE payload ? 'grossMargin') AS has_grossMargin,
  count(*) FILTER (WHERE payload ? 'totalProfit') AS has_totalProfit,
  count(*) FILTER (WHERE payload ? 'netProfit') AS has_netProfit,
  count(*) FILTER (WHERE payload ? 'deposit') AS has_deposit,
  count(*) FILTER (WHERE payload ? 'commissionRate') AS has_commissionRate,
  count(*) FILTER (WHERE payload ? 'tableRental') AS has_tableRental,
  count(*) FILTER (WHERE payload ? 'chairRental') AS has_chairRental,
  count(*) FILTER (WHERE payload ? 'umbrellaRental') AS has_umbrellaRental,
  count(*) FILTER (WHERE payload ? 'tableclothRental') AS has_tableclothRental,
  count(*) FILTER (WHERE payload ? 'registrationFee') AS has_registrationFee,
  count(*) FILTER (WHERE payload ? 'booth_cost') AS has_booth_cost,
  count(*) FILTER (WHERE payload ? 'total_cost') AS has_total_cost,
  count(*) FILTER (WHERE payload ? 'supplier_info') AS has_supplier_info
FROM public.staff_accessible_events;

ROLLBACK;

-- ---------------------------------------------------------------------------
-- C2.20-H: Staff-session market/product sensitive-column check
-- Purpose:
--   Confirm staff views do not expose sensitive market/product columns needed
--   only by owner-level financial workflows.
-- Expected:
--   If total > 0, sensitive-column null counts should equal total.
-- ---------------------------------------------------------------------------

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<STAFF_ID>', true);

SELECT
  count(*) AS total_markets,
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null,
  count(*) FILTER (WHERE registration_fee IS NULL) AS registration_fee_null
FROM public.staff_accessible_markets;

SELECT
  count(*) AS total_products,
  count(*) FILTER (WHERE cost IS NULL) AS cost_null
FROM public.staff_accessible_products;

ROLLBACK;
