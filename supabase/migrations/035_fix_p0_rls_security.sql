-- ============================================================
-- Phase 8E/8F: P0 RLS Security Hardening
-- Migration: 035_fix_p0_rls_security.sql
-- Date: 2026-06-02
-- Severity: P0
-- Description:
--   1. Creates SECURITY DEFINER helper function current_user_market_ids()
--      (no parameters, uses auth.uid(), avoids RLS recursion)
--   2. Removes all market_members INSERT policies
--      (write via SECURITY DEFINER RPCs only)
--   3. Removes all market_members DELETE policies and replaces with
--      secure policy: user can only delete own membership
--   4. Enables RLS on market_members
--   5. Creates secure market_members SELECT policy using helper
--   6. Removes markets_select_temp and replaces with helper-based policy
--   7. Removes products_select_temp
--
-- Does NOT touch:
--   - staff_accessible_* views
--   - events payload
--   - get_my_staff RPC
--   - markets/products INSERT/UPDATE policies
--   - P1/P2 items
--
-- IMPORTANT: Execute against Supabase after review.
-- ============================================================

-- ============================================================
-- STEP 1: Helper function (no parameters, prevents injection)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_market_ids()
RETURNS TABLE(market_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT market_id
  FROM public.market_members
  WHERE user_id = auth.uid();
$$;

-- Restrict execution: authenticated only, no PUBLIC
REVOKE ALL ON FUNCTION public.current_user_market_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_market_ids() TO authenticated;

COMMENT ON FUNCTION public.current_user_market_ids() IS
  'Returns market_ids the current authenticated user is a member of. SECURITY DEFINER avoids market_members RLS recursion. No parameters — always uses auth.uid().';

-- ============================================================
-- STEP 2: Remove all market_members INSERT policies
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;
-- market_members INSERT is exclusively handled by SECURITY DEFINER RPCs:
--   - accept_invitation_and_bind()   (staff joining via invitation)
--   - remove_team_member()           (owner removing a member)
--   - leave_current_staff_team()    (staff leaving)
-- No client-side INSERT policy is needed.

-- ============================================================
-- STEP 3: Remove all market_members DELETE policies, then create
--         a secure policy: user can only delete their own membership
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;

-- Secure DELETE: users can remove only their own membership.
-- This allows staff to leave a team via direct DELETE.
-- RPC-based deletes (remove_team_member, leave_current_staff_team) are also
-- available as the primary controlled path.
CREATE POLICY "market_members_delete_own"
ON public.market_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- STEP 4: Enable RLS on market_members
-- ============================================================

ALTER TABLE public.market_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: Remove all market_members SELECT policies, then create
--         secure policy using helper (avoids recursion)
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "market_members_select_secure"
ON public.market_members FOR SELECT
TO authenticated
USING (
  market_id IN (SELECT * FROM public.current_user_market_ids())
);

-- ============================================================
-- STEP 6: Remove markets_select_temp and all other SELECT policies,
--         then create helper-based secure policy
-- ============================================================

DROP POLICY IF EXISTS "markets_select_temp" ON public.markets;

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

CREATE POLICY "markets_select_secure"
ON public.markets FOR SELECT
TO authenticated
USING (
  id IN (SELECT * FROM public.current_user_market_ids())
);

-- ============================================================
-- STEP 7: Remove products_select_temp
-- Note: Migration 014's "Users can view own and team products"
-- policy will automatically take effect. No replacement needed.
-- ============================================================

DROP POLICY IF EXISTS "products_select_temp" ON public.products;

-- ============================================================
-- VERIFICATION SQL (read-only, run in SQL Editor after migration)
-- ============================================================
/*

-- V1: market_members rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'market_members';
-- Expected: 1 row, rowsecurity = true

-- V2: market_members has no INSERT policies
SELECT policyname, cmd, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'INSERT';
-- Expected: 0 rows

-- V3: market_members DELETE policy: user_id = auth.uid()
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'DELETE';
-- Expected: 1 row, qual contains 'user_id = auth.uid()'

-- V4: market_members SELECT policy uses helper
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'SELECT';
-- Expected: 1 row, qual contains 'current_user_market_ids'

-- V5: markets_select_temp is gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND policyname = 'markets_select_temp';
-- Expected: 0 rows

-- V6: markets SELECT policy uses helper
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND cmd = 'SELECT';
-- Expected: 1 row, qual contains 'current_user_market_ids'

-- V7: products_select_temp is gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'products_select_temp';
-- Expected: 0 rows

-- V8: current_user_market_ids is SECURITY DEFINER with no IN parameters
SELECT routine_name, security_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name = 'current_user_market_ids';
-- Expected: routine_name = 'current_user_market_ids', security_type = 'DEFINER'

SELECT COUNT(*) AS param_count
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name IN (
    SELECT specific_name FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_name = 'current_user_market_ids'
  )
  AND parameter_mode = 'IN';
-- Expected: 0 (no input parameters)

-- V9: Helper grants
SELECT grantee, privilege_type
FROM information_schema.function_privileges
WHERE specific_schema = 'public' AND routine_name = 'current_user_market_ids';
-- Expected: authenticated has EXECUTE; PUBLIC does not appear

*/

-- ============================================================
-- Done.
-- Next steps (outside this migration):
--   - Phase 8D-2: Sanitize staff_accessible_* views (typed NULL)
--   - Phase 8D-3: Fix get_my_staff() RPC (exclude revoked)
--   - Phase 8D-4: events payload sanitization
--   - Phase 8D-5: markets/products INSERT policy tightening (P1)
-- ============================================================
