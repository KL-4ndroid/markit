-- C2.29B Staff View / RLS Read-Only Verification Follow-up
-- =============================================================================
--
-- Purpose:
--   Collect the missing C2.29B result sets when Supabase SQL Editor only shows
--   the last SELECT from a multi-SELECT block.
--
-- Safety:
--   - Read-only verification only.
--   - Transaction-local auth simulation only.
--   - No migration, data repair, schema change, function/view change, or RLS change.
--
-- Replace placeholders:
--   STAFF_USER_UUID = 5e92b457-1eaf-49eb-9295-ba47b5a3e575
--   OWNER_USER_UUID = 0d21abfe-136f-4c42-987b-14928593f323
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Follow-up E1: Staff market view redaction/scope summary
-- -----------------------------------------------------------------------------
-- Expected:
--   - staff_access_type_rows = total_markets
--   - owner_access_type_rows = 0
--   - every *_null count equals total_markets
--   - duplicate_market_id_rows = 0
--   - deleted_market_rows = 0

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

WITH market_rows AS (
  SELECT *
  FROM public.staff_accessible_markets
),
duplicate_rows AS (
  SELECT id
  FROM market_rows
  GROUP BY id
  HAVING count(*) > 1
)
SELECT
  count(*) AS total_markets,
  count(*) FILTER (WHERE access_type = 'staff') AS staff_access_type_rows,
  count(*) FILTER (WHERE access_type = 'owner') AS owner_access_type_rows,
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null,
  count(*) FILTER (WHERE registration_fee IS NULL) AS registration_fee_null,
  count(*) FILTER (WHERE deposit IS NULL) AS deposit_null,
  (SELECT count(*) FROM duplicate_rows) AS duplicate_market_id_rows,
  count(*) FILTER (WHERE COALESCE(is_deleted, false) = true) AS deleted_market_rows
FROM market_rows;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- Follow-up E3: Staff event redaction/scope/duplicate summary
-- -----------------------------------------------------------------------------
-- Expected:
--   - staff_access_type_rows = total_events
--   - owner_access_type_rows = 0
--   - every has_* count is 0
--   - duplicate_event_id_rows = 0

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

WITH event_rows AS (
  SELECT *
  FROM public.staff_accessible_events
),
duplicate_rows AS (
  SELECT id
  FROM event_rows
  GROUP BY id
  HAVING count(*) > 1
)
SELECT
  count(*) AS total_events,
  count(*) FILTER (WHERE access_type = 'staff') AS staff_access_type_rows,
  count(*) FILTER (WHERE access_type = 'owner') AS owner_access_type_rows,
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
  count(*) FILTER (WHERE payload ? 'tablecloth_rental') AS has_tablecloth_rental,
  (SELECT count(*) FROM duplicate_rows) AS duplicate_event_id_rows
FROM event_rows;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- Follow-up E4: Staff direct base-table SELECT summary
-- -----------------------------------------------------------------------------
-- Expected:
--   All counts are 0 for staff.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);

SELECT
  (SELECT count(*) FROM public.markets) AS staff_markets_direct,
  (SELECT count(*) FROM public.products) AS staff_products_direct,
  (SELECT count(*) FROM public.events) AS staff_events_direct,
  (SELECT count(*) FROM public.markets WHERE booth_cost IS NOT NULL) AS staff_markets_with_booth_cost,
  (SELECT count(*) FROM public.products WHERE cost IS NOT NULL) AS staff_products_with_cost,
  (SELECT count(*) FROM public.events WHERE payload IS NOT NULL) AS staff_events_with_payload;

ROLLBACK;

-- -----------------------------------------------------------------------------
-- Follow-up E4-owner: Owner direct base-table count summary
-- -----------------------------------------------------------------------------
-- Expected:
--   Counts are non-zero when the chosen owner has data.

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);

SELECT
  (SELECT count(*) FROM public.markets) AS owner_markets_direct,
  (SELECT count(*) FROM public.products) AS owner_products_direct,
  (SELECT count(*) FROM public.events) AS owner_events_direct,
  (SELECT count(*) FROM public.markets WHERE booth_cost IS NOT NULL) AS owner_markets_with_booth_cost,
  (SELECT count(*) FROM public.markets WHERE total_profit IS NOT NULL) AS owner_markets_with_total_profit;

ROLLBACK;
