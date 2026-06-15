-- ============================================================
-- Phase C2.29B-2.1: Base Table SELECT RLS Tightening
-- Migration: 041_tighten_base_table_select_rls.sql
-- Date: 2026-06-16
-- Severity: P0 (Owner / Staff data isolation)
-- Description:
--   1. markets: replace markets_select_secure (uses current_user_market_ids)
--      with markets_select_owner_only (uses owner_id = auth.uid()).
--      → Staff SELECT markets = 0 row.
--      → Staff must go through staff_accessible_markets view.
--   2. products: drop "Users can view own and team products" (014, includes
--      team + is_shared path that exposes cost to staff) and any other
--      staff-friendly SELECT policy; replace with products_select_owner_only.
--      → Staff SELECT products = 0 row.
--      → Staff must go through staff_accessible_products view.
--   3. events: drop both legacy SELECT policies
--      - "用戶可以查看自己的事件和市集事件" (015, uses market_members)
--      - "users_can_view_events" (online-only, simplified)
--      Replace with events_select_owner_only (actor_id self OR market_id in
--      markets owned by auth.uid()).
--      → Staff SELECT events = 0 row.
--      → Staff must go through staff_accessible_events view.
--
-- Does NOT touch:
--   - staff_accessible_markets / products / events views (039 + 040)
--   - sanitize_staff_event_payload() (039)
--   - market_members / staff_relationships / staff_invitations RLS
--   - INSERT / UPDATE / DELETE policies on markets / products / events
--   - profiles / market_invitations RLS
--   - Existing trigger / function / RPC
--
-- IMPORTANT:
--   - This is a DESTRUCTIVE migration for the staff SELECT path.
--   - Staff clients MUST go through staff_accessible_* view.
--   - Owner clients (and services running with auth.uid() == owner) must
--     either SELECT base tables directly or call staff_accessible_* view.
--   - The following service / repair paths run with the user's auth.uid()
--     and thus are subject to the new RLS. Each MUST be owner-only:
--       lib/db/recovery.ts:240                       (.from('products'))
--       lib/sync/owner-revenue-gap-repair.ts:328/347 (.from('markets' / 'events'))
--       lib/supabase/migration.ts:204-208            (.from('events'))
--     If any of these are ever invoked from a staff session, they will
--     silently return 0 rows. Pre-apply audit required.
--   - This migration is NOT yet applied to Supabase. Execute only after
--     review and the pre-apply checklist in
--     docs/C2.29B-2_1_RLS_MIGRATION_DRAFT_2026_06_16.md
-- ============================================================

-- ============================================================
-- STEP 1: Helper function (no parameters, prevents injection)
-- Reuse current_user_owned_market_ids() (already created in 035).
-- ============================================================

-- Verify the helper still exists and is SECURITY DEFINER
DO $$
DECLARE
  v_security_type text;
BEGIN
  SELECT p.prosecdef INTO v_security_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'current_user_owned_market_ids';

  IF v_security_type IS NULL THEN
    RAISE EXCEPTION 'current_user_owned_market_ids() does not exist. Run 035 first.';
  ELSIF v_security_type = false THEN
    RAISE EXCEPTION 'current_user_owned_market_ids() is not SECURITY DEFINER. Refusing to use it.';
  END IF;

  RAISE NOTICE 'Helper current_user_owned_market_ids() verified: SECURITY DEFINER';
END;
$$;

-- ============================================================
-- STEP 2: Drop all markets SELECT policies, then create owner-only
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'markets'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.markets', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "markets_select_owner_only"
ON public.markets FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);

COMMENT ON POLICY "markets_select_owner_only" ON public.markets IS
  'Owner-only direct SELECT. Staff must use staff_accessible_markets view. Replaces markets_select_secure (035) which used current_user_market_ids and allowed staff via market_members.';

-- ============================================================
-- STEP 3: Drop all products SELECT policies, then create owner-only
-- Note: 014 created "Users can view own and team products" with three
-- OR branches (own / team via market_members / is_shared = true).
-- The team and shared branches both leak cost to staff. Drop everything
-- and replace with strict owner check.
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'products'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "products_select_owner_only"
ON public.products FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);

COMMENT ON POLICY "products_select_owner_only" ON public.products IS
  'Owner-only direct SELECT. Staff must use staff_accessible_products view. Replaces "Users can view own and team products" (014) which had team/shared branches that exposed cost to staff.';

-- ============================================================
-- STEP 4: Drop all events SELECT policies, then create owner-only
-- Note: 015 created "用戶可以查看自己的事件和市集事件" with
--   actor_id = auth.uid()
--   OR market_id IN (SELECT market_id FROM market_members WHERE user_id = auth.uid())
-- Plus the online-only "users_can_view_events" simplified version.
-- Both let staff SELECT events via market_members. Drop and replace.
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'events'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "events_select_owner_only"
ON public.events FOR SELECT
TO authenticated
USING (
  -- 自己的事件 (包含 market_id IS NULL 的全局事件)
  actor_id = auth.uid()
  OR
  -- 自己市集的事件 (透過 markets.owner_id 嚴格 owner 判斷)
  market_id IN (SELECT id FROM public.current_user_owned_market_ids())
);

COMMENT ON POLICY "events_select_owner_only" ON public.events IS
  'Owner-only direct SELECT. Staff must use staff_accessible_events view. Replaces "用戶可以查看自己的事件和市集事件" (015) and "users_can_view_events" (online-only) which let staff read events via market_members.';

-- ============================================================
-- STEP 5: Note about INSERT / UPDATE / DELETE (intentionally untouched)
-- ============================================================

-- events INSERT: "用戶可以插入事件_v3" (025) is preserved as-is.
--   It allows staff to insert events into markets they are bound to via
--   staff_relationships (acting as staff), which is required for the
--   staff sync flow. actor_id is preserved as the staff's own UUID.
-- markets INSERT / UPDATE: "authenticated_can_insert_markets" (and any
--   other authenticated INSERT / UPDATE) are preserved as-is. Triggers
--   gate actual writes (002 / 008 / 021).
-- products INSERT / UPDATE / DELETE: 014 owner-only policies are
--   preserved as-is.
-- market_members / staff_relationships / staff_invitations: 035 P0 RLS
--   is preserved as-is.

-- ============================================================
-- VERIFICATION SQL (read-only, run in SQL Editor after migration)
-- ============================================================

/*

-- V1: markets has exactly one SELECT policy, owner-only
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND cmd = 'SELECT';
-- Expected: 1 row named 'markets_select_owner_only', qual contains 'owner_id = auth.uid()'

-- V2: products has exactly one SELECT policy, owner-only
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'SELECT';
-- Expected: 1 row named 'products_select_owner_only', qual contains 'owner_id = auth.uid()'

-- V3: events has exactly one SELECT policy, owner-only
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'events' AND cmd = 'SELECT';
-- Expected: 1 row named 'events_select_owner_only', qual contains
--           'actor_id = auth.uid()' and 'current_user_owned_market_ids'

-- V4: All legacy staff-friendly SELECT policies are gone
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
  AND tablename IN ('markets', 'products', 'events')
  AND policyname IN (
    'markets_select_secure',
    'Users can view own and team products',
    'products_select_temp',
    '用戶可以查看自己的事件和市集事件',
    'users_can_view_events'
  );
-- Expected: 0 rows

-- ============================================================
-- STAFF DIRECT TABLE SELECT (must be 0 rows)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- Staff direct markets SELECT → expected 0
SELECT count(*) AS staff_markets_direct FROM markets;

-- Staff direct products SELECT → expected 0
SELECT count(*) AS staff_products_direct FROM products;

-- Staff direct events SELECT → expected 0
SELECT count(*) AS staff_events_direct FROM events;

ROLLBACK;

-- ============================================================
-- STAFF VIEW STILL WORKS (脱敏有效)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT count(*) AS staff_markets_view FROM staff_accessible_markets;
SELECT count(*) AS staff_products_view FROM staff_accessible_products;
SELECT count(*) AS staff_events_view FROM staff_accessible_events;

-- spot-check: staff markets financial fields are NULL
SELECT
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null
FROM staff_accessible_markets;

-- spot-check: staff products cost is NULL
SELECT
  count(*) FILTER (WHERE cost IS NULL) AS cost_null
FROM staff_accessible_products;

-- spot-check: staff events payload has no sensitive top-level keys
SELECT
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost') AS has_cost,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo
FROM staff_accessible_events;

ROLLBACK;

-- ============================================================
-- OWNER DIRECT TABLE SELECT (must work, no regression)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '0d21abfe-136f-4c42-987b-14928593f323', true);

-- Owner markets direct SELECT → expected > 0
SELECT count(*) AS owner_markets_direct FROM markets;

-- Owner products direct SELECT → expected > 0
SELECT count(*) AS owner_products_direct FROM products;

-- Owner events direct SELECT → expected > 0
SELECT count(*) AS owner_events_direct FROM events;

-- Owner can see full financial fields
SELECT id, name, booth_cost, total_profit, commission_rate
FROM markets
LIMIT 5;

-- Owner can see full product cost
SELECT id, name, cost, price
FROM products
LIMIT 5;

-- Owner can see full event payload
SELECT id, type, payload
FROM events
LIMIT 5;

ROLLBACK;

-- ============================================================
-- OWNER VIEW STILL WORKS
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '0d21abfe-136f-4c42-987b-14928593f323', true);

SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;

SELECT access_type, count(*)
FROM staff_accessible_events
GROUP BY access_type;

ROLLBACK;

*/

-- ============================================================
-- Done.
-- Next steps (outside this migration):
--   - C2.29B-2.2: Frontend type-level guard (prevent future code from
--     re-introducing staff → base-table queries)
--   - C2.29B-2.3: Full chain E1-E5 verification (re-run E1-E3 from
--     C2.29 + add E4 base-table direct SELECT + E5 build-time guard)
-- ============================================================
