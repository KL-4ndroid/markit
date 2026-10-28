-- Single read-only result so SQL Editor preserves all policy/trigger evidence.
-- No event insertion, role impersonation, or writer execution.
SELECT jsonb_build_object(
  'events_table', (SELECT jsonb_build_object('rls', relrowsecurity, 'force_rls', relforcerowsecurity)
                   FROM pg_class WHERE oid = 'public.events'::regclass),
  'policies', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p
               WHERE schemaname = 'public' AND tablename = 'events'),
  'triggers', (SELECT jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'enabled', t.tgenabled,
      'trigger', pg_get_triggerdef(t.oid), 'function', pg_get_functiondef(t.tgfoid)))
      FROM pg_trigger t WHERE t.tgrelid = 'public.events'::regclass AND NOT t.tgisinternal),
  'helpers', (SELECT jsonb_agg(jsonb_build_object('signature', p.oid::regprocedure::text,
       'definition', pg_get_functiondef(p.oid))) FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
       AND p.proname IN ('check_subscription_write_for_actor', 'subscription_require_tier',
          'subscription_write_guard_active', 'has_authoritative_team_entitlement',
          'can_manage_recurring_operations', 'current_user_market_ids', 'current_user_owned_market_ids',
          'subscription_effective_plan', 'deal_projection_number', 'deal_projection_totals',
          'deal_projection_delta', 'market_region_code_is_valid', 'market_payment_deadline_is_valid',
          'update_staff_permissions', 'update_staff_role')),
  'columns', (SELECT jsonb_agg(jsonb_build_object('table',table_name,'column',column_name,
      'type',udt_name,'nullable',is_nullable,'default',column_default))
      FROM information_schema.columns WHERE table_schema='public'
      AND table_name IN ('events','markets','products','staff_relationships','market_members')),
  'constraints', (SELECT jsonb_agg(jsonb_build_object('name',conname,'definition',pg_get_constraintdef(oid)))
      FROM pg_constraint WHERE conrelid='public.events'::regclass),
  'downstream_triggers', (SELECT jsonb_agg(jsonb_build_object('table',c.relname,
      'name',t.tgname,'enabled',t.tgenabled,'trigger',pg_get_triggerdef(t.oid),'function',pg_get_functiondef(t.tgfoid)))
      FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
      WHERE c.oid IN ('public.markets'::regclass,'public.products'::regclass,
        'public.market_members'::regclass,'public.staff_relationships'::regclass) AND NOT t.tgisinternal),
  'downstream_constraints', (SELECT jsonb_agg(jsonb_build_object('table',c.relname,'name',s.conname,'definition',pg_get_constraintdef(s.oid)))
      FROM pg_constraint s JOIN pg_class c ON c.oid=s.conrelid
      WHERE c.oid IN ('public.markets'::regclass,'public.products'::regclass,
        'public.market_members'::regclass,'public.staff_relationships'::regclass)),
  'authenticated_insert', has_table_privilege('authenticated', 'public.events', 'INSERT')
) AS event_write_authorization;
