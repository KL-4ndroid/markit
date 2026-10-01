-- ============================================================
-- 070_enforce_recurring_operations_owner_role.sql
-- Close the remote role gap left by 069 without changing existing Market
-- capabilities. In the current app role model, an authenticated user with an
-- active staff_relationship is Staff and must not manage Venue/Schedule data.
-- Production apply requires the manual runbook gate.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_manage_recurring_operations()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.staff_relationships sr
      WHERE sr.staff_id = auth.uid()
        AND sr.status = 'active'
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_recurring_operations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_recurring_operations() TO authenticated;

DROP POLICY IF EXISTS venues_owner_select ON public.venues;
CREATE POLICY venues_owner_select ON public.venues
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND public.can_manage_recurring_operations());

DROP POLICY IF EXISTS venues_owner_insert ON public.venues;
CREATE POLICY venues_owner_insert ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() AND public.can_manage_recurring_operations());

DROP POLICY IF EXISTS venues_owner_update ON public.venues;
CREATE POLICY venues_owner_update ON public.venues
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.can_manage_recurring_operations())
  WITH CHECK (owner_id = auth.uid() AND public.can_manage_recurring_operations());

DROP POLICY IF EXISTS operation_schedules_owner_select ON public.operation_schedules;
CREATE POLICY operation_schedules_owner_select ON public.operation_schedules
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() AND public.can_manage_recurring_operations());

DROP POLICY IF EXISTS operation_schedules_owner_insert ON public.operation_schedules;
CREATE POLICY operation_schedules_owner_insert ON public.operation_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND public.can_manage_recurring_operations()
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS operation_schedules_owner_update ON public.operation_schedules;
CREATE POLICY operation_schedules_owner_update ON public.operation_schedules
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() AND public.can_manage_recurring_operations())
  WITH CHECK (
    owner_id = auth.uid()
    AND public.can_manage_recurring_operations()
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
  );

-- Restrictive policies are ANDed with the existing permissive event policy.
-- Existing Market/Product/interaction events retain their current behavior.
DROP POLICY IF EXISTS recurring_operations_events_owner_only ON public.events;
CREATE POLICY recurring_operations_events_owner_only
  ON public.events
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    type NOT IN (
      'venue_created', 'venue_updated', 'venue_archived',
      'operation_schedule_created', 'operation_schedule_updated',
      'operation_schedule_paused', 'operation_schedule_resumed', 'operation_schedule_archived'
    )
    OR public.can_manage_recurring_operations()
  );

CREATE OR REPLACE FUNCTION public.guard_recurring_operations_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.type IN (
    'venue_created', 'venue_updated', 'venue_archived',
    'operation_schedule_created', 'operation_schedule_updated',
    'operation_schedule_paused', 'operation_schedule_resumed', 'operation_schedule_archived'
  ) AND (
    auth.uid() IS NULL
    OR NEW.actor_id IS DISTINCT FROM auth.uid()
    OR NOT public.can_manage_recurring_operations()
  ) THEN
    RAISE EXCEPTION 'Recurring operations management is owner-only.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_recurring_operations_event() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_guard_recurring_operations_event ON public.events;
CREATE TRIGGER trigger_guard_recurring_operations_event
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.guard_recurring_operations_event();

COMMENT ON FUNCTION public.can_manage_recurring_operations() IS
  '070: Mirrors the application role model. Active Staff sessions cannot manage Venue/Schedule data.';
COMMENT ON POLICY recurring_operations_events_owner_only ON public.events IS
  '070: Restrictive owner-role guard for the eight recurring operations event types only.';
