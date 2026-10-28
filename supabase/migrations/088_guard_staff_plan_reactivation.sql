-- Staff retention only. No existing relationship is backfilled by this migration.
-- Expiry is still enforced dynamically by the existing entitlement read gates.
BEGIN;

-- Reconstruct the previous effective Team decision from the changed source's OLD
-- row and the unchanged source's current row. Keep 082 precedence exactly:
-- unexpired, enabled test override first; otherwise authoritative admin account.
CREATE OR REPLACE FUNCTION public.staff_team_access_from_source_rows(
  p_account jsonb, p_override jsonb, p_at timestamptz
) RETURNS boolean
LANGUAGE sql STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT CASE WHEN COALESCE((p_override->>'enabled')::boolean, false)
    AND COALESCE((p_override->>'allow_test_switch')::boolean, false)
    AND (p_override->>'test_expires_at')::timestamptz > p_at
    AND p_override->>'test_plan_code' IS NOT NULL
  THEN p_override->>'test_plan_code' = 'team'
  ELSE COALESCE(
    p_account->>'plan_code' = 'team'
    AND p_account->>'plan_source' = 'admin'
    AND p_account->>'billing_status' = 'none'
    AND p_account->>'entitlement_status' IN ('active', 'grace')
    AND ((p_account->>'entitlement_ends_at') IS NULL
      OR (p_account->>'entitlement_ends_at')::timestamptz >= p_at), false)
  END;
$$;
REVOKE ALL ON FUNCTION public.staff_team_access_from_source_rows(jsonb,jsonb,timestamptz)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_team_plan_staff_suspension()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid;
  v_account jsonb;
  v_override jsonb;
BEGIN
  v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('staff-plan:' || v_owner_id::text, 0));

  IF TG_OP = 'UPDATE' AND OLD.owner_id IS DISTINCT FROM NEW.owner_id THEN
    RAISE EXCEPTION 'Staff plan owner identity is immutable.' USING ERRCODE = '22023';
  END IF;

  SELECT to_jsonb(sa) INTO v_account FROM public.subscription_accounts sa
    WHERE sa.owner_id = v_owner_id;
  SELECT to_jsonb(sw) INTO v_override FROM public.subscription_write_guard_owners sw
    WHERE sw.owner_id = v_owner_id;

  IF TG_TABLE_NAME = 'subscription_accounts' THEN
    v_account := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  ELSIF TG_TABLE_NAME = 'subscription_write_guard_owners' THEN
    v_override := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  ELSE
    RAISE EXCEPTION 'Unexpected staff plan source.' USING ERRCODE = '22023';
  END IF;

  -- In particular, expired OLD -> renewed NEW must suspend before Team access
  -- can expose retained active rows. Continuous Team -> Team leaves them intact.
  IF NOT public.staff_team_access_from_source_rows(v_account, v_override, pg_catalog.now())
    OR NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    PERFORM public.suspend_owner_staff_for_plan(v_owner_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_team_plan_staff_suspension() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_team_plan_staff_suspension ON public.subscription_accounts;
CREATE TRIGGER sync_team_plan_staff_suspension
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_team_plan_staff_suspension();

DROP TRIGGER IF EXISTS sync_team_override_staff_suspension ON public.subscription_write_guard_owners;
CREATE TRIGGER sync_team_override_staff_suspension
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_write_guard_owners
FOR EACH ROW EXECUTE FUNCTION public.sync_team_plan_staff_suspension();

-- Serialize explicit owner restoration with both plan sources. Retain the
-- deployed restore body, owner/status checks, return type, ACL and settings.
DO $patch$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.restore_staff_relationship(uuid)'::regprocedure)
    INTO v_definition;
  IF position('STAFF_PLAN_RESTORE_LOCK_088' IN v_definition) = 0 THEN
    IF (length(v_definition)-length(replace(v_definition,
        'IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN','')))
       / length('IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN') <> 1 THEN
      RAISE EXCEPTION 'Unexpected restore entitlement check; review deployed function before patching.';
    END IF;
    v_definition := replace(v_definition,
      'IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN',
      E'-- STAFF_PLAN_RESTORE_LOCK_088\n  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''staff-plan:'' || v_owner_id::text, 0));\n  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN');
    EXECUTE v_definition;
  END IF;
END;
$patch$;
COMMIT;
