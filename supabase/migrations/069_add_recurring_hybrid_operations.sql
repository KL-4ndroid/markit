-- ============================================================
-- 069_add_recurring_hybrid_operations.sql
-- Code-level contract only. Production apply requires the manual runbook gate.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
  address TEXT,
  location_note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venues_owner_status
  ON public.venues(owner_id, status);

ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS venues_owner_select ON public.venues;
CREATE POLICY venues_owner_select ON public.venues
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS venues_owner_insert ON public.venues;
CREATE POLICY venues_owner_insert ON public.venues
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS venues_owner_update ON public.venues;
CREATE POLICY venues_owner_update ON public.venues
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

REVOKE ALL ON public.venues FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.venues TO authenticated;

CREATE TABLE IF NOT EXISTS public.operation_schedules (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE RESTRICT,
  name TEXT,
  timezone TEXT NOT NULL,
  recurrence JSONB NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  ends_next_day BOOLEAN NOT NULL DEFAULT FALSE,
  defaults JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision >= 1),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT operation_schedules_weekly_v1_check CHECK (
    recurrence->>'frequency' = 'weekly'
    AND (recurrence->>'interval')::INTEGER = 1
    AND jsonb_typeof(recurrence->'weekdays') = 'array'
  )
);

CREATE INDEX IF NOT EXISTS idx_operation_schedules_owner_status
  ON public.operation_schedules(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_operation_schedules_owner_venue
  ON public.operation_schedules(owner_id, venue_id);

ALTER TABLE public.operation_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operation_schedules_owner_select ON public.operation_schedules;
CREATE POLICY operation_schedules_owner_select ON public.operation_schedules
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS operation_schedules_owner_insert ON public.operation_schedules;
CREATE POLICY operation_schedules_owner_insert ON public.operation_schedules
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS operation_schedules_owner_update ON public.operation_schedules;
CREATE POLICY operation_schedules_owner_update ON public.operation_schedules
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.venues v
      WHERE v.id = venue_id AND v.owner_id = auth.uid()
    )
  );

REVOKE ALL ON public.operation_schedules FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.operation_schedules TO authenticated;

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.venues(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS schedule_id UUID REFERENCES public.operation_schedules(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS session_origin TEXT,
  ADD COLUMN IF NOT EXISTS schedule_occurrence_key TEXT,
  ADD COLUMN IF NOT EXISTS schedule_revision INTEGER,
  ADD COLUMN IF NOT EXISTS schedule_occurrence_state TEXT,
  ADD COLUMN IF NOT EXISTS is_schedule_override BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_session_origin_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_session_origin_check
  CHECK (session_origin IS NULL OR session_origin IN ('manual', 'schedule', 'legacy'));
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_schedule_occurrence_state_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_schedule_occurrence_state_check
  CHECK (
    schedule_occurrence_state IS NULL
    OR schedule_occurrence_state IN ('scheduled', 'skipped', 'suppressed', 'rule_removed')
  );
ALTER TABLE public.markets DROP CONSTRAINT IF EXISTS markets_schedule_revision_check;
ALTER TABLE public.markets ADD CONSTRAINT markets_schedule_revision_check
  CHECK (schedule_revision IS NULL OR schedule_revision >= 1);

CREATE INDEX IF NOT EXISTS idx_markets_owner_schedule
  ON public.markets(owner_id, schedule_id);
CREATE INDEX IF NOT EXISTS idx_markets_owner_venue
  ON public.markets(owner_id, venue_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_markets_owner_schedule_occurrence
  ON public.markets(owner_id, schedule_occurrence_key)
  WHERE schedule_occurrence_key IS NOT NULL;

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    'venue_created', 'venue_updated', 'venue_archived',
    'operation_schedule_created', 'operation_schedule_updated',
    'operation_schedule_paused', 'operation_schedule_resumed', 'operation_schedule_archived',
    'market_created', 'market_updated', 'market_status_changed', 'market_started', 'market_ended', 'market_deleted',
    'product_created', 'product_updated', 'product_deleted',
    'interaction_recorded', 'interaction_deleted', 'deal_closed', 'deal_deleted',
    'field_note_created', 'field_note_updated', 'field_note_deleted',
    'checklist_item_created', 'checklist_item_updated', 'checklist_item_deleted',
    'settings_updated'
  )
);

CREATE OR REPLACE FUNCTION public.project_recurring_operations_event()
RETURNS TRIGGER AS $$
DECLARE
  v_updates JSONB;
  v_venue_id UUID;
  v_schedule_id UUID;
  v_market_id UUID;
BEGIN
  CASE NEW.type
    WHEN 'venue_created' THEN
      v_venue_id := NULLIF(NEW.payload->>'venueId', '')::UUID;
      INSERT INTO public.venues (
        id, owner_id, name, address, location_note, status, is_deleted, created_at, updated_at
      ) VALUES (
        v_venue_id,
        NEW.actor_id,
        NEW.payload->>'name',
        NULLIF(NEW.payload->>'address', ''),
        NULLIF(NEW.payload->>'locationNote', ''),
        COALESCE(NULLIF(NEW.payload->>'status', ''), 'active'),
        COALESCE((NEW.payload->>'isDeleted')::BOOLEAN, FALSE),
        NEW.timestamp,
        NEW.timestamp
      );

    WHEN 'venue_updated' THEN
      v_venue_id := NULLIF(NEW.payload->>'venueId', '')::UUID;
      v_updates := NEW.payload->'updates';
      UPDATE public.venues SET
        name = CASE WHEN v_updates ? 'name' THEN v_updates->>'name' ELSE name END,
        address = CASE WHEN v_updates ? 'address' THEN NULLIF(v_updates->>'address', '') ELSE address END,
        location_note = CASE WHEN v_updates ? 'locationNote' THEN NULLIF(v_updates->>'locationNote', '') ELSE location_note END,
        status = CASE WHEN v_updates ? 'status' THEN v_updates->>'status' ELSE status END,
        is_deleted = CASE WHEN v_updates ? 'isDeleted' THEN (v_updates->>'isDeleted')::BOOLEAN ELSE is_deleted END,
        updated_at = NEW.timestamp
      WHERE id = v_venue_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'venue update owner scope mismatch'; END IF;

    WHEN 'venue_archived' THEN
      v_venue_id := NULLIF(NEW.payload->>'venueId', '')::UUID;
      UPDATE public.venues SET status = 'archived', updated_at = NEW.timestamp
      WHERE id = v_venue_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'venue archive owner scope mismatch'; END IF;

    WHEN 'operation_schedule_created' THEN
      v_schedule_id := NULLIF(NEW.payload->>'scheduleId', '')::UUID;
      v_venue_id := NULLIF(NEW.payload->>'venueId', '')::UUID;
      IF NOT EXISTS (
        SELECT 1 FROM public.venues WHERE id = v_venue_id AND owner_id = NEW.actor_id
      ) THEN
        RAISE EXCEPTION 'schedule venue owner scope mismatch';
      END IF;
      INSERT INTO public.operation_schedules (
        id, owner_id, venue_id, name, timezone, recurrence, start_time, end_time,
        ends_next_day, defaults, status, revision, created_at, updated_at
      ) VALUES (
        v_schedule_id,
        NEW.actor_id,
        v_venue_id,
        NULLIF(NEW.payload->>'name', ''),
        NEW.payload->>'timezone',
        NEW.payload->'recurrence',
        (NEW.payload->>'startTime')::TIME,
        (NEW.payload->>'endTime')::TIME,
        COALESCE((NEW.payload->>'endsNextDay')::BOOLEAN, FALSE),
        COALESCE(NEW.payload->'defaults', '{}'::JSONB),
        COALESCE(NULLIF(NEW.payload->>'status', ''), 'active'),
        COALESCE((NEW.payload->>'revision')::INTEGER, 1),
        NEW.timestamp,
        NEW.timestamp
      );

    WHEN 'operation_schedule_updated' THEN
      v_schedule_id := NULLIF(NEW.payload->>'scheduleId', '')::UUID;
      v_updates := NEW.payload->'updates';
      UPDATE public.operation_schedules SET
        venue_id = CASE WHEN v_updates ? 'venueId' THEN (v_updates->>'venueId')::UUID ELSE venue_id END,
        name = CASE WHEN v_updates ? 'name' THEN NULLIF(v_updates->>'name', '') ELSE name END,
        timezone = CASE WHEN v_updates ? 'timezone' THEN v_updates->>'timezone' ELSE timezone END,
        recurrence = CASE WHEN v_updates ? 'recurrence' THEN v_updates->'recurrence' ELSE recurrence END,
        start_time = CASE WHEN v_updates ? 'startTime' THEN (v_updates->>'startTime')::TIME ELSE start_time END,
        end_time = CASE WHEN v_updates ? 'endTime' THEN (v_updates->>'endTime')::TIME ELSE end_time END,
        ends_next_day = CASE WHEN v_updates ? 'endsNextDay' THEN (v_updates->>'endsNextDay')::BOOLEAN ELSE ends_next_day END,
        defaults = CASE WHEN v_updates ? 'defaults' THEN v_updates->'defaults' ELSE defaults END,
        status = CASE WHEN v_updates ? 'status' THEN v_updates->>'status' ELSE status END,
        revision = CASE WHEN v_updates ? 'revision' THEN (v_updates->>'revision')::INTEGER ELSE revision END,
        updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'schedule update owner scope mismatch'; END IF;

    WHEN 'operation_schedule_paused' THEN
      v_schedule_id := NULLIF(NEW.payload->>'scheduleId', '')::UUID;
      UPDATE public.operation_schedules SET status = 'paused', updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'schedule pause owner scope mismatch'; END IF;

    WHEN 'operation_schedule_resumed' THEN
      v_schedule_id := NULLIF(NEW.payload->>'scheduleId', '')::UUID;
      UPDATE public.operation_schedules SET status = 'active', updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'schedule resume owner scope mismatch'; END IF;

    WHEN 'operation_schedule_archived' THEN
      v_schedule_id := NULLIF(NEW.payload->>'scheduleId', '')::UUID;
      UPDATE public.operation_schedules SET status = 'archived', updated_at = NEW.timestamp
      WHERE id = v_schedule_id AND owner_id = NEW.actor_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'schedule archive owner scope mismatch'; END IF;

    WHEN 'market_created' THEN
      v_market_id := COALESCE(
        NEW.market_id,
        NULLIF(NEW.payload->>'market_id', '')::UUID,
        NULLIF(NEW.payload->>'marketId', '')::UUID
      );
      UPDATE public.markets SET
        venue_id = NULLIF(COALESCE(NEW.payload->>'venue_id', NEW.payload->>'venueId'), '')::UUID,
        schedule_id = NULLIF(COALESCE(NEW.payload->>'schedule_id', NEW.payload->>'scheduleId'), '')::UUID,
        session_origin = NULLIF(COALESCE(NEW.payload->>'session_origin', NEW.payload->>'sessionOrigin'), ''),
        schedule_occurrence_key = NULLIF(COALESCE(NEW.payload->>'schedule_occurrence_key', NEW.payload->>'scheduleOccurrenceKey'), ''),
        schedule_revision = NULLIF(COALESCE(NEW.payload->>'schedule_revision', NEW.payload->>'scheduleRevision'), '')::INTEGER,
        schedule_occurrence_state = NULLIF(COALESCE(NEW.payload->>'schedule_occurrence_state', NEW.payload->>'scheduleOccurrenceState'), ''),
        is_schedule_override = COALESCE(
          (NEW.payload->>'is_schedule_override')::BOOLEAN,
          (NEW.payload->>'isScheduleOverride')::BOOLEAN,
          FALSE
        )
      WHERE id = v_market_id AND owner_id = NEW.actor_id;

    WHEN 'market_updated' THEN
      v_market_id := COALESCE(
        NEW.market_id,
        NULLIF(NEW.payload->>'market_id', '')::UUID,
        NULLIF(NEW.payload->>'marketId', '')::UUID
      );
      v_updates := NEW.payload->'updates';
      UPDATE public.markets SET
        venue_id = CASE WHEN v_updates ? 'venue_id' OR v_updates ? 'venueId'
          THEN NULLIF(COALESCE(v_updates->>'venue_id', v_updates->>'venueId'), '')::UUID ELSE venue_id END,
        schedule_id = CASE WHEN v_updates ? 'schedule_id' OR v_updates ? 'scheduleId'
          THEN NULLIF(COALESCE(v_updates->>'schedule_id', v_updates->>'scheduleId'), '')::UUID ELSE schedule_id END,
        session_origin = CASE WHEN v_updates ? 'session_origin' OR v_updates ? 'sessionOrigin'
          THEN NULLIF(COALESCE(v_updates->>'session_origin', v_updates->>'sessionOrigin'), '') ELSE session_origin END,
        schedule_occurrence_key = CASE WHEN v_updates ? 'schedule_occurrence_key' OR v_updates ? 'scheduleOccurrenceKey'
          THEN NULLIF(COALESCE(v_updates->>'schedule_occurrence_key', v_updates->>'scheduleOccurrenceKey'), '') ELSE schedule_occurrence_key END,
        schedule_revision = CASE WHEN v_updates ? 'schedule_revision' OR v_updates ? 'scheduleRevision'
          THEN NULLIF(COALESCE(v_updates->>'schedule_revision', v_updates->>'scheduleRevision'), '')::INTEGER ELSE schedule_revision END,
        schedule_occurrence_state = CASE WHEN v_updates ? 'schedule_occurrence_state' OR v_updates ? 'scheduleOccurrenceState'
          THEN NULLIF(COALESCE(v_updates->>'schedule_occurrence_state', v_updates->>'scheduleOccurrenceState'), '') ELSE schedule_occurrence_state END,
        is_schedule_override = CASE WHEN v_updates ? 'is_schedule_override' OR v_updates ? 'isScheduleOverride'
          THEN COALESCE((v_updates->>'is_schedule_override')::BOOLEAN, (v_updates->>'isScheduleOverride')::BOOLEAN)
          ELSE is_schedule_override END,
        updated_at = NEW.timestamp
      WHERE id = v_market_id AND owner_id = NEW.actor_id;

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

REVOKE ALL ON FUNCTION public.project_recurring_operations_event() FROM PUBLIC;

DROP TRIGGER IF EXISTS trigger_update_recurring_operations_read_model ON public.events;
CREATE TRIGGER trigger_update_recurring_operations_read_model
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.project_recurring_operations_event();

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
SELECT
  m.id, m.owner_id, m.name, m.location, m.start_date, m.end_date, m.status,
  m.early_entry_enabled, m.early_entry_time, m.check_in_time,
  m.operating_start_time, m.operating_end_time,
  NULL::numeric(10,2) AS registration_fee,
  NULL::numeric(10,2) AS booth_cost,
  NULL::numeric(10,2) AS deposit,
  m.table_rental, m.chair_rental, m.umbrella_rental, m.tablecloth_rental,
  NULL::numeric(5,2) AS commission_rate,
  m.table_free, m.chair_free, m.umbrella_free, m.tablecloth_free,
  m.total_revenue,
  NULL::numeric(10,2) AS total_profit,
  m.total_interactions, m.total_deals, m.notes, m.created_at, m.updated_at,
  m.is_collaborative, m.operation_phase, m.is_deleted, m.sync_status,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff'::text AS access_type,
  m.sales_photo_evidence_required,
  m.operation_session_date,
  m.venue_id, m.schedule_id, m.session_origin, m.schedule_occurrence_key,
  m.schedule_revision, m.schedule_occurrence_state, m.is_schedule_override
FROM public.markets m
JOIN public.staff_relationships sr ON sr.owner_id = m.owner_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'::text
  AND COALESCE(m.is_deleted, false) = false

UNION ALL

SELECT
  m.id, m.owner_id, m.name, m.location, m.start_date, m.end_date, m.status,
  m.early_entry_enabled, m.early_entry_time, m.check_in_time,
  m.operating_start_time, m.operating_end_time,
  m.registration_fee, m.booth_cost, m.deposit,
  m.table_rental, m.chair_rental, m.umbrella_rental, m.tablecloth_rental,
  m.commission_rate,
  m.table_free, m.chair_free, m.umbrella_free, m.tablecloth_free,
  m.total_revenue, m.total_profit, m.total_interactions, m.total_deals,
  m.notes, m.created_at, m.updated_at, m.is_collaborative, m.operation_phase,
  m.is_deleted, m.sync_status,
  m.owner_id AS relationship_owner_id,
  '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
  'owner'::text AS access_type,
  m.sales_photo_evidence_required,
  m.operation_session_date,
  m.venue_id, m.schedule_id, m.session_origin, m.schedule_occurrence_key,
  m.schedule_revision, m.schedule_occurrence_state, m.is_schedule_override
FROM public.markets m
WHERE m.owner_id = auth.uid();

COMMENT ON VIEW public.staff_accessible_markets IS
  '069: Preserves financial redaction and exposes only materialized market recurrence metadata. Venue and schedule management tables remain owner-only.';
