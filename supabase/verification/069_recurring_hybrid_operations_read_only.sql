-- Read-only verifier for migration 069. Safe to run before/after production apply.
-- This file performs no INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, or RPC calls.

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('venues', 'operation_schedules')
ORDER BY table_name;

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    table_name IN ('venues', 'operation_schedules')
    OR (
      table_name = 'markets'
      AND column_name IN (
        'venue_id', 'schedule_id', 'session_origin', 'schedule_occurrence_key',
        'schedule_revision', 'schedule_occurrence_state', 'is_schedule_override'
      )
    )
  )
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('venues', 'operation_schedules');

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('venues', 'operation_schedules')
ORDER BY tablename, policyname;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.events'::regclass
  AND conname = 'events_type_check';

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_venues_owner_status',
    'idx_operation_schedules_owner_status',
    'idx_operation_schedules_owner_venue',
    'idx_markets_owner_schedule',
    'idx_markets_owner_venue',
    'uq_markets_owner_schedule_occurrence'
  )
ORDER BY indexname;

SELECT trigger_name, action_timing, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'events'
  AND trigger_name = 'trigger_update_recurring_operations_read_model';

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'staff_accessible_markets'
  AND column_name IN (
    'venue_id', 'schedule_id', 'session_origin', 'schedule_occurrence_key',
    'schedule_revision', 'schedule_occurrence_state', 'is_schedule_override'
  )
ORDER BY column_name;

-- Must return zero rows. Never auto-merge these rows.
SELECT owner_id, schedule_occurrence_key, count(*) AS duplicate_count
FROM public.markets
WHERE schedule_occurrence_key IS NOT NULL
GROUP BY owner_id, schedule_occurrence_key
HAVING count(*) > 1;

-- Must return zero rows. These checks do not expose schedule defaults to staff.
SELECT s.id AS schedule_id, s.owner_id AS schedule_owner_id, v.owner_id AS venue_owner_id
FROM public.operation_schedules s
JOIN public.venues v ON v.id = s.venue_id
WHERE s.owner_id <> v.owner_id;

-- Compact post-apply result for Supabase SQL Editor. This is intentionally the
-- final statement so the operator only needs to copy one JSON value.
SELECT jsonb_build_object(
  'tables_ready', (
    SELECT count(*) = 2
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('venues', 'operation_schedules')
  ),
  'rls_ready', (
    SELECT count(*) = 2 AND bool_and(c.relrowsecurity)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('venues', 'operation_schedules')
  ),
  'owner_policy_count', (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('venues', 'operation_schedules')
      AND policyname IN (
        'venues_owner_select', 'venues_owner_insert', 'venues_owner_update',
        'operation_schedules_owner_select',
        'operation_schedules_owner_insert',
        'operation_schedules_owner_update'
      )
  ),
  'event_check_ready', EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass
      AND conname = 'events_type_check'
      AND pg_get_constraintdef(oid) LIKE '%venue_created%'
      AND pg_get_constraintdef(oid) LIKE '%operation_schedule_archived%'
  ),
  'unique_occurrence_index_ready', EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_markets_owner_schedule_occurrence'
      AND indexdef LIKE '%owner_id%'
      AND indexdef LIKE '%schedule_occurrence_key%'
      AND indexdef LIKE '%WHERE (schedule_occurrence_key IS NOT NULL)%'
  ),
  'projection_trigger_ready', EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'events'
      AND trigger_name = 'trigger_update_recurring_operations_read_model'
  ),
  'staff_compatibility_column_count', (
    SELECT count(*)
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff_accessible_markets'
      AND column_name IN (
        'venue_id', 'schedule_id', 'session_origin', 'schedule_occurrence_key',
        'schedule_revision', 'schedule_occurrence_state', 'is_schedule_override'
      )
  ),
  'duplicate_occurrence_count', (
    SELECT count(*)
    FROM (
      SELECT owner_id, schedule_occurrence_key
      FROM public.markets
      WHERE schedule_occurrence_key IS NOT NULL
      GROUP BY owner_id, schedule_occurrence_key
      HAVING count(*) > 1
    ) duplicates
  ),
  'schedule_venue_owner_mismatch_count', (
    SELECT count(*)
    FROM public.operation_schedules s
    JOIN public.venues v ON v.id = s.venue_id
    WHERE s.owner_id <> v.owner_id
  )
) AS verification_summary;
