-- Read-only structure checks, no account or relationship updates.
DO $verify$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.subscription_accounts'::regclass
      AND tgname='sync_team_plan_staff_suspension' AND tgenabled='O' AND tgtype=29) OR
     NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.subscription_write_guard_owners'::regclass
      AND tgname='sync_team_override_staff_suspension' AND tgenabled='O' AND tgtype=29) THEN
    RAISE EXCEPTION '088 plan source triggers missing or disabled';
  END IF;
  IF has_function_privilege('anon','public.staff_team_access_from_source_rows(jsonb,jsonb,timestamptz)','EXECUTE') OR
     has_function_privilege('authenticated','public.staff_team_access_from_source_rows(jsonb,jsonb,timestamptz)','EXECUTE') OR
     has_function_privilege('service_role','public.staff_team_access_from_source_rows(jsonb,jsonb,timestamptz)','EXECUTE') THEN
    RAISE EXCEPTION '088 previous-source helper must be private';
  END IF;
  IF position('STAFF_PLAN_RESTORE_LOCK_088' IN pg_get_functiondef('public.restore_staff_relationship(uuid)'::regprocedure))=0 THEN
    RAISE EXCEPTION '088 explicit restoration lock missing';
  END IF;
END;
$verify$;
