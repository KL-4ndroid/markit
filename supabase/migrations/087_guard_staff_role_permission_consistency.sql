-- Reject new contradictory role/visibility writes. Existing rows are retained.
-- The owner must explicitly choose the intended role before repairing old data.
BEGIN;
CREATE OR REPLACE FUNCTION public.guard_staff_role_permission_consistency()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = pg_catalog, public AS $body$
BEGIN
  IF TG_OP='UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.permissions IS NOT DISTINCT FROM OLD.permissions THEN RETURN NEW; END IF;
  IF NEW.role IS NULL OR NEW.role NOT IN ('viewer','operator','manager') OR
     jsonb_typeof(NEW.permissions) IS DISTINCT FROM 'object' OR
     NEW.permissions->'can_view' IS DISTINCT FROM 'true'::JSONB OR
     NEW.permissions->'can_edit' IS DISTINCT FROM to_jsonb(NEW.role IN ('operator','manager')) OR
     NEW.permissions->'infoLevel' IS DISTINCT FROM to_jsonb(CASE NEW.role WHEN 'viewer' THEN 0 ELSE 2 END) THEN
    RAISE EXCEPTION 'STAFF_ROLE_PERMISSIONS_MISMATCH: update role and canonical permissions together'
      USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.guard_staff_role_permission_consistency() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER staff_role_permission_consistency
BEFORE INSERT OR UPDATE OF role,permissions ON public.staff_relationships
FOR EACH ROW EXECUTE FUNCTION public.guard_staff_role_permission_consistency();
COMMIT;
