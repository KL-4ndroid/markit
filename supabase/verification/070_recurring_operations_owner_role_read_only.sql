-- Read-only post-apply verifier for migration 070.

SELECT jsonb_build_object(
  'owner_guard_function_ready', EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'can_manage_recurring_operations'
      AND p.prosecdef = TRUE
  ),
  'restrictive_event_policy_ready', EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = 'recurring_operations_events_owner_only'
      AND permissive = 'RESTRICTIVE'
      AND cmd = 'INSERT'
      AND with_check LIKE '%can_manage_recurring_operations%'
  ),
  'event_guard_trigger_ready', EXISTS (
    SELECT 1
    FROM information_schema.triggers
    WHERE event_object_schema = 'public'
      AND event_object_table = 'events'
      AND trigger_name = 'trigger_guard_recurring_operations_event'
      AND action_timing = 'BEFORE'
      AND event_manipulation = 'INSERT'
  ),
  'venue_guarded_policy_count', (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'venues'
      AND policyname IN ('venues_owner_select', 'venues_owner_insert', 'venues_owner_update')
      AND concat_ws(' ', qual, with_check) LIKE '%can_manage_recurring_operations%'
  ),
  'schedule_guarded_policy_count', (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operation_schedules'
      AND policyname IN (
        'operation_schedules_owner_select',
        'operation_schedules_owner_insert',
        'operation_schedules_owner_update'
      )
      AND concat_ws(' ', qual, with_check) LIKE '%can_manage_recurring_operations%'
  ),
  'existing_market_event_policy_preserved', EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'events'
      AND policyname = '用戶可以插入事件_v3'
      AND permissive = 'PERMISSIVE'
      AND cmd = 'INSERT'
  )
) AS verification_summary;
