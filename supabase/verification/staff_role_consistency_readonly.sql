-- Diagnostic only. Run in a privileged SQL session and save the result for review.
-- Does not call mutation RPCs or repair rows. Function definitions can differ from repo history.
BEGIN TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';

SELECT sr.id, sr.owner_id, sr.staff_id, sr.status, sr.role, sr.permissions,
       sr.created_at, sr.updated_at, sr.invited_at, sr.accepted_at,
       (sr.permissions->'can_view' = 'true'::jsonb
        AND sr.permissions->'can_edit' = to_jsonb(sr.role IN ('operator', 'manager'))
        AND sr.permissions->'infoLevel' = to_jsonb(CASE sr.role WHEN 'viewer' THEN 0 ELSE 2 END))
         IS TRUE AS matches_role_matrix
FROM public.staff_relationships sr
JOIN public.profiles owner_profile ON owner_profile.id = sr.owner_id
JOIN public.profiles staff_profile ON staff_profile.id = sr.staff_id
WHERE lower(owner_profile.email) = '123@123'
  AND lower(staff_profile.email) = '1234@1234';

-- Read deployed writers, including the legacy acceptance and independent JSON writer.
SELECT p.oid::regprocedure AS signature, p.prosecdef AS security_definer,
       p.proconfig AS settings, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN (
  'invite_staff_member', 'accept_staff_email_invitation', 'accept_invitation_and_bind',
  'restore_staff_relationship', 'update_staff_role', 'update_staff_permissions'
)
ORDER BY p.oid::regprocedure::text;

-- Check for additional writers/invariants and whether direct writes are still granted.
SELECT t.tgname, pg_get_triggerdef(t.oid) AS trigger_definition,
       pg_get_functiondef(t.tgfoid) AS function_definition
FROM pg_trigger t
WHERE t.tgrelid = 'public.staff_relationships'::regclass AND NOT t.tgisinternal;

SELECT conname, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'public.staff_relationships'::regclass;

SELECT role_name, privilege,
       has_table_privilege(role_name, 'public.staff_relationships', privilege) AS granted
FROM (VALUES ('anon'), ('authenticated'), ('service_role')) roles(role_name)
CROSS JOIN (VALUES ('INSERT'), ('UPDATE'), ('DELETE')) privileges(privilege);

SELECT policyname, roles, cmd, qual, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'staff_relationships';

SELECT p.oid::regprocedure AS signature, role_name,
       has_function_privilege(role_name, p.oid, 'EXECUTE') AS executable
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN (VALUES ('anon'), ('authenticated'), ('service_role')) roles(role_name)
WHERE n.nspname = 'public' AND p.proname IN ('update_staff_role', 'update_staff_permissions')
ORDER BY p.oid::regprocedure::text, role_name;
COMMIT;
