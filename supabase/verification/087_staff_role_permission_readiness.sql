-- Read-only: reports old inconsistencies without exposing accounts or repairing them.
DO $verify$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.staff_relationships'::regclass
      AND tgname='staff_role_permission_consistency' AND tgenabled='O'
      AND tgfoid='public.guard_staff_role_permission_consistency()'::regprocedure) THEN
    RAISE EXCEPTION '087 staff consistency trigger missing or disabled';
  END IF;
  IF has_function_privilege('anon','public.guard_staff_role_permission_consistency()','EXECUTE') OR
     has_function_privilege('authenticated','public.guard_staff_role_permission_consistency()','EXECUTE') THEN
    RAISE EXCEPTION '087 staff consistency trigger must not be client-callable';
  END IF;
END;
$verify$;
SELECT count(*) AS existing_mismatched_relationships_retained
FROM public.staff_relationships
WHERE role NOT IN ('viewer','operator','manager') OR permissions IS NULL OR
  jsonb_typeof(permissions) IS DISTINCT FROM 'object' OR
  permissions->'can_view' IS DISTINCT FROM 'true'::JSONB OR
  permissions->'can_edit' IS DISTINCT FROM to_jsonb(role IN ('operator','manager')) OR
  permissions->'infoLevel' IS DISTINCT FROM to_jsonb(CASE role WHEN 'viewer' THEN 0 ELSE 2 END);
