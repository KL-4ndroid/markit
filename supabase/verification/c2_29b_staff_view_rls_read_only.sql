-- C2.29B Staff View / RLS Read-Only Verification
-- =============================================================================
--
-- Purpose:
--   Verify deployed staff data isolation after C2.20 and migration 053.
--
-- Safety:
--   - Read-only verification only.
--   - Uses transaction-local auth simulation with SET LOCAL and set_config.
--   - Does not modify data, schema, functions, views, RLS policies, or storage.
--
-- Required placeholders:
--   STAFF_USER_UUID - active staff profile id / auth uid to simulate.
--   OWNER_USER_UUID - owner profile id / auth uid for owner regression checks.
--
-- Recommended order:
--   1. Run E0 to confirm active staff relationship context.
--   2. Run E1-E3 for staff views and sanitizer behavior.
--   3. Run E4 for staff direct base-table RLS behavior.
--   4. Run E4-owner for owner regression.
--   5. Run E5 locally with TypeScript, not in Supabase SQL editor.
--
-- Result template:
--   docs/C2.29B_READ_ONLY_VERIFICATION_RESULT_TEMPLATE.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- C2.29B-E0: Candidate active owner/staff pairs
-- -----------------------------------------------------------------------------
-- Expected:
--   At least one active relationship exists for the chosen STAFF_USER_UUID.

SELECT
  sr.owner_id,
  sr.staff_id,
  sr.status,
  sr.role,
  count(m.id) AS related_market_count
FROM public.staff_relationships sr
LEFT JOIN public.markets m
  ON m.owner_id = sr.owner_id
 AND COALESCE(m.is_deleted, false) = false
WHERE sr.status = 'active'
GROUP BY sr.owner_id, sr.staff_id, sr.status, sr.role
ORDER BY related_market_count DESC, sr.owner_id, sr.staff_id
LIMIT 20;

-- -----------------------------------------------------------------------------
-- C2.29B-E1: Staff market view redaction and scope
-- -----------------------------------------------------------------------------
-- Expected:
--   - access_type is only staff.
--   - If total_markets > 0, all sensitive *_null counts equal total_markets.
--   - duplicate_market_id_rows = 0.
--   - deleted_market_rows = 0.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

SELECT access_type, count(*)
FROM public.staff_accessible_markets
GROUP BY access_type
ORDER BY access_type;

SELECT
  count(*) AS total_markets,
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null,
  count(*) FILTER (WHERE registration_fee IS NULL) AS registration_fee_null,
  count(*) FILTER (WHERE deposit IS NULL) AS deposit_null
FROM public.staff_accessible_markets;

SELECT count(*) AS duplicate_market_id_rows
FROM (
  SELECT id
  FROM public.staff_accessible_markets
  GROUP BY id
  HAVING count(*) > 1
) duplicated;

SELECT count(*) AS deleted_market_rows
FROM public.staff_accessible_markets
WHERE COALESCE(is_deleted, false) = true;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- C2.29B-E2: Staff product view redaction
-- -----------------------------------------------------------------------------
-- Expected:
--   - access_type is only staff if the view exposes access_type.
--   - If total_products > 0, cost_null = total_products.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

SELECT count(*) AS staff_products_view
FROM public.staff_accessible_products;

SELECT
  count(*) AS total_products,
  count(*) FILTER (WHERE cost IS NULL) AS cost_null
FROM public.staff_accessible_products;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- C2.29B-E3: Staff event payload redaction, tombstones, and duplicate ids
-- -----------------------------------------------------------------------------
-- Expected:
--   - access_type is only staff.
--   - All has_* sensitive-key counts are 0.
--   - duplicate_event_id_rows = 0.
--   - Tombstones are visible when relevant staff-accessible deleted events exist.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

SELECT access_type, count(*)
FROM public.staff_accessible_events
GROUP BY access_type
ORDER BY access_type;

SELECT
  count(*) AS total_events,
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'booth_cost') AS has_booth_cost,
  count(*) FILTER (WHERE payload ? 'registrationFee') AS has_registrationFee,
  count(*) FILTER (WHERE payload ? 'registration_fee') AS has_registration_fee,
  count(*) FILTER (WHERE payload ? 'deposit') AS has_deposit,
  count(*) FILTER (WHERE payload ? 'cost') AS has_cost,
  count(*) FILTER (WHERE payload ? 'costAtTimeOfSale') AS has_costAtTimeOfSale,
  count(*) FILTER (WHERE payload ? 'cost_at_time_of_sale') AS has_cost_at_time_of_sale,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo,
  count(*) FILTER (WHERE payload ? 'supplier_info') AS has_supplier_info,
  count(*) FILTER (WHERE payload ? 'totalCost') AS has_totalCost,
  count(*) FILTER (WHERE payload ? 'total_cost') AS has_total_cost,
  count(*) FILTER (WHERE payload ? 'profitMargin') AS has_profitMargin,
  count(*) FILTER (WHERE payload ? 'profit_margin') AS has_profit_margin,
  count(*) FILTER (WHERE payload ? 'grossMargin') AS has_grossMargin,
  count(*) FILTER (WHERE payload ? 'gross_margin') AS has_gross_margin,
  count(*) FILTER (WHERE payload ? 'totalProfit') AS has_totalProfit,
  count(*) FILTER (WHERE payload ? 'total_profit') AS has_total_profit,
  count(*) FILTER (WHERE payload ? 'netProfit') AS has_netProfit,
  count(*) FILTER (WHERE payload ? 'net_profit') AS has_net_profit,
  count(*) FILTER (WHERE payload ? 'commissionRate') AS has_commissionRate,
  count(*) FILTER (WHERE payload ? 'commission_rate') AS has_commission_rate,
  count(*) FILTER (WHERE payload ? 'tableRental') AS has_tableRental,
  count(*) FILTER (WHERE payload ? 'table_rental') AS has_table_rental,
  count(*) FILTER (WHERE payload ? 'chairRental') AS has_chairRental,
  count(*) FILTER (WHERE payload ? 'chair_rental') AS has_chair_rental,
  count(*) FILTER (WHERE payload ? 'umbrellaRental') AS has_umbrellaRental,
  count(*) FILTER (WHERE payload ? 'umbrella_rental') AS has_umbrella_rental,
  count(*) FILTER (WHERE payload ? 'tableclothRental') AS has_tableclothRental,
  count(*) FILTER (WHERE payload ? 'tablecloth_rental') AS has_tablecloth_rental
FROM public.staff_accessible_events;

SELECT count(*) AS duplicate_event_id_rows
FROM (
  SELECT id
  FROM public.staff_accessible_events
  GROUP BY id
  HAVING count(*) > 1
) duplicated;

SELECT type, count(*)
FROM public.staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- C2.29B-E4: Staff direct base-table SELECT blocked
-- -----------------------------------------------------------------------------
-- Expected:
--   Staff direct base-table counts are 0.
--   If a query errors instead of returning 0, preserve the exact error output.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

SELECT count(*) AS staff_markets_direct FROM public.markets;
SELECT count(*) AS staff_products_direct FROM public.products;
SELECT count(*) AS staff_events_direct FROM public.events;

SELECT count(*) AS staff_markets_with_booth_cost
FROM public.markets
WHERE booth_cost IS NOT NULL;

SELECT count(*) AS staff_products_with_cost
FROM public.products
WHERE cost IS NOT NULL;

SELECT count(*) AS staff_events_with_payload
FROM public.events
WHERE payload IS NOT NULL;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- C2.29B-E4-owner: Owner direct base-table regression check
-- -----------------------------------------------------------------------------
-- Expected:
--   Owner direct base-table counts are non-zero when that owner has data.
--   Owner financial fields are not forced null by staff-view hardening.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);

SELECT count(*) AS owner_markets_direct FROM public.markets;
SELECT count(*) AS owner_products_direct FROM public.products;
SELECT count(*) AS owner_events_direct FROM public.events;

SELECT id, name, booth_cost, total_profit, commission_rate, registration_fee, deposit
FROM public.markets
ORDER BY start_date DESC NULLS LAST, id
LIMIT 10;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- C2.29B-E5: Type-level guard
-- -----------------------------------------------------------------------------
-- Run locally, not in Supabase SQL editor:
--
--   npx.cmd tsc --noEmit --project tsconfig.staff-typed-client.json
--
-- Expected:
--   Staff-scoped client allows staff_accessible_* views and rejects forbidden
--   base tables at compile time through @ts-expect-error assertions.
