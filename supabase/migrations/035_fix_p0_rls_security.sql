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
--      a role-aware policy:
--      - staff can delete their own staff memberships
--      - owner can delete staff memberships in their own markets
--      - nobody can delete owner memberships
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
-- STEP 1b: Helper for owned market IDs (for owner-based DELETE)
-- Returns market IDs where the current user is the market owner.
-- SECURITY DEFINER: does not go through RLS, no parameters.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_owned_market_ids()
RETURNS TABLE(id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.markets
  WHERE owner_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_owned_market_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owned_market_ids() TO authenticated;

COMMENT ON FUNCTION public.current_user_owned_market_ids() IS
  'Returns market_ids where the current user is the owner. SECURITY DEFINER, no parameters.';

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
--         a role-aware secure policy:
--         - staff: can delete only their own staff membership
--         - owner: can delete staff memberships in their own markets
--         - nobody: can delete owner memberships
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

CREATE POLICY "market_members_delete_owner_or_self_staff"
ON public.market_members FOR DELETE
TO authenticated
USING (
  role = 'staff'
  AND (
    user_id = auth.uid()
    OR market_id IN (SELECT * FROM public.current_user_owned_market_ids())
  )
);
-- Logic: only staff rows are deletable.
--   - A staff member can delete their own staff row.
--   - A market owner can delete staff rows in markets they own.
--   - Owner rows (role = 'owner') are never deletable via this policy.

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

-- V3: market_members DELETE policy: role='staff' + self OR owner market
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'DELETE';
-- Expected: 1 row named 'market_members_delete_owner_or_self_staff'
-- Expected: qual contains 'role = \'staff\'', 'user_id = auth.uid()',
--           'market_id IN', 'current_user_owned_market_ids'

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

-- V8: Helper functions are SECURITY DEFINER with no IN parameters
SELECT r.routine_name, r.security_type,
  COUNT(p.parameter_name) FILTER (WHERE p.parameter_mode = 'IN') AS in_param_count
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
  ON p.specific_schema = r.specific_schema
 AND p.specific_name = r.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('current_user_market_ids', 'current_user_owned_market_ids')
GROUP BY r.routine_name, r.security_type
ORDER BY r.routine_name;
-- Expected: 2 rows, all security_type = 'DEFINER', all in_param_count = 0

-- V9: Helper grants
SELECT r.routine_name, fp.grantee, fp.privilege_type
FROM information_schema.routines r
JOIN information_schema.function_privileges fp
  ON fp.specific_schema = r.specific_schema
 AND fp.specific_name = r.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('current_user_market_ids', 'current_user_owned_market_ids')
ORDER BY r.routine_name, fp.privilege_type;
-- Expected: both functions have EXECUTE granted to 'authenticated';
--           PUBLIC does not appear

-- V10: Owner membership integrity
-- IMPORTANT: Run this BEFORE applying this migration. If it returns rows,
-- the owner market membership is missing — the owner will lose access to
-- their own market after RLS is enabled. Backfill the missing memberships
-- before proceeding with this migration.
--
-- Backfill example (run as service_role):
--   INSERT INTO public.market_members (market_id, user_id, role)
--   SELECT m.id, m.owner_id, 'owner'
--   FROM public.markets m
--   WHERE NOT EXISTS (
--     SELECT 1 FROM public.market_members mm
--     WHERE mm.market_id = m.id AND mm.user_id = m.owner_id AND mm.role = 'owner'
--   );
SELECT m.id AS market_id, m.name AS market_name, m.owner_id
FROM public.markets m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.market_members mm
  WHERE mm.market_id = m.id
    AND mm.user_id = m.owner_id
    AND mm.role = 'owner'
);
-- Expected: 0 rows before migration. If rows appear, backfill first.

*/

-- ============================================================
-- Done.
-- Next steps (outside this migration):
--   - Phase 8D-2: Sanitize staff_accessible_* views (typed NULL)
--   - Phase 8D-3: Fix get_my_staff() RPC (exclude revoked)
--   - Phase 8D-4: events payload sanitization
--   - Phase 8D-5: markets/products INSERT policy tightening (P1)
-- ============================================================
