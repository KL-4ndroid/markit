\set ON_ERROR_STOP on

\if :ad3a_local_confirmed
\else
\echo 'Refusing AD3A test: pass -v ad3a_local_confirmed=1 only to the disposable local container.'
\quit
\endif

BEGIN;

DO $$
BEGIN
  IF current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'AD3A tests may run only against the local Supabase database';
  END IF;
END;
$$;

CREATE TEMP TABLE ad3a_test_state (
  key text PRIMARY KEY,
  value text NOT NULL
);

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'ad3a-owner@example.test', 'synthetic', now(),
    '{}'::jsonb, '{"display_name":"AD3A owner"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'ad3a-staff@example.test', 'synthetic', now(),
    '{}'::jsonb, '{"display_name":"AD3A staff"}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'ad3a-outsider@example.test', 'synthetic', now(),
    '{}'::jsonb, '{"display_name":"AD3A outsider"}'::jsonb, now(), now());

INSERT INTO public.staff_relationships (
  owner_id, staff_id, staff_email, accepted_at, status
) VALUES (
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  'ad3a-staff@example.test', now(), 'active'
);

INSERT INTO public.markets (
  id, owner_id, name, location, start_date, end_date
) VALUES (
  'b1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000001',
  'AD3A disposable market', 'localhost', current_date, current_date
);

DO $$
DECLARE
  v_owner_request uuid;
  v_staff_request uuid;
  v_repeat_request uuid;
BEGIN
  SELECT request_id INTO v_owner_request
  FROM public.bff_create_account_deletion_request(
    'a1000000-0000-4000-8000-000000000001', repeat('1', 64), repeat('2', 64),
    '2026-08-17', 'clean'
  );
  SELECT request_id INTO v_repeat_request
  FROM public.bff_create_account_deletion_request(
    'a1000000-0000-4000-8000-000000000001', repeat('1', 64), repeat('2', 64),
    '2026-08-17', 'clean'
  );
  IF v_owner_request IS DISTINCT FROM v_repeat_request THEN
    RAISE EXCEPTION 'idempotent owner create returned a different request';
  END IF;

  SELECT request_id INTO v_staff_request
  FROM public.bff_create_account_deletion_request(
    'a1000000-0000-4000-8000-000000000002', repeat('3', 64), repeat('4', 64),
    '2026-08-17', 'sync_confirmed'
  );

  IF (SELECT account_kind FROM public.account_deletion_requests WHERE id = v_owner_request) <> 'owner'
    OR (SELECT account_kind FROM public.account_deletion_requests WHERE id = v_staff_request) <> 'staff' THEN
    RAISE EXCEPTION 'owner/staff account kind derivation failed';
  END IF;

  BEGIN
    PERFORM * FROM public.bff_create_account_deletion_request(
      'a1000000-0000-4000-8000-000000000003', repeat('5', 64), repeat('2', 64),
      '2026-08-17', 'clean'
    );
    RAISE EXCEPTION 'cross-actor idempotency collision was accepted';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO ad3a_test_state(key, value) VALUES
    ('owner_request', v_owner_request::text),
    ('staff_request', v_staff_request::text);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'account_deletion_requests'
      AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'request table RLS is not enabled'; END IF;

  IF has_table_privilege('authenticated', 'public.account_deletion_requests', 'SELECT')
    OR has_table_privilege('service_role', 'public.account_deletion_requests', 'SELECT') THEN
    RAISE EXCEPTION 'direct request table grants are present';
  END IF;
  IF has_function_privilege('authenticated', 'public.delete_current_user_app_data()', 'EXECUTE') THEN
    RAISE EXCEPTION 'legacy authenticated deletion RPC remains executable';
  END IF;
  IF has_function_privilege(
    'authenticated',
    'public.bff_create_account_deletion_request(uuid,text,text,text,text)',
    'EXECUTE'
  ) THEN RAISE EXCEPTION 'authenticated can execute server-only create RPC'; END IF;
  IF NOT has_function_privilege(
    'service_role',
    'public.bff_create_account_deletion_request(uuid,text,text,text,text)',
    'EXECUTE'
  ) THEN RAISE EXCEPTION 'service_role cannot execute create RPC'; END IF;
END;
$$;

UPDATE public.account_deletion_requests
SET status = 'identity_confirmed', identity_confirmed_at = clock_timestamp()
WHERE id IN (
  (SELECT value::uuid FROM ad3a_test_state WHERE key = 'owner_request'),
  (SELECT value::uuid FROM ad3a_test_state WHERE key = 'staff_request')
);

DO $$
DECLARE
  v_request uuid := (SELECT value::uuid FROM ad3a_test_state WHERE key = 'owner_request');
  v_first jsonb;
  v_second jsonb;
  v_third jsonb;
  v_token text;
  v_finalize text;
  v_step text;
BEGIN
  v_first := public.bff_claim_account_deletion_lease(v_request, 'worker.ad3a.owner', now(), 300);
  v_second := public.bff_claim_account_deletion_lease(v_request, 'worker.ad3a.racer', now(), 300);
  IF COALESCE((v_first->>'claimed')::boolean, false) IS NOT TRUE
    OR COALESCE((v_second->>'claimed')::boolean, false) IS NOT FALSE THEN
    RAISE EXCEPTION 'lease exclusion failed';
  END IF;
  v_token := v_first->>'leaseToken';
  v_finalize := public.bff_finalize_account_deletion(v_request, v_token);
  IF v_finalize <> 'incomplete' THEN RAISE EXCEPTION 'incomplete completion was accepted'; END IF;
  PERFORM public.bff_release_account_deletion_lease(v_request, v_token);

  v_third := public.bff_claim_account_deletion_lease(v_request, 'worker.ad3a.reclaim', now(), 300);
  IF COALESCE((v_third->>'claimed')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'released lease could not be reclaimed';
  END IF;
  v_token := v_third->>'leaseToken';
  INSERT INTO ad3a_test_state(key, value) VALUES ('owner_lease_token', v_token);

  FOREACH v_step IN ARRAY ARRAY[
    'access_frozen','staff_access_revoked','object_manifest_built','r2_objects_deleted',
    'r2_absence_verified','billing_identity_detached','operational_data_cleaned'
  ] LOOP
    PERFORM public.bff_record_account_deletion_step(
      v_request, v_token, v_step, 'completed', 0, repeat('a', 64), NULL
    );
  END LOOP;
END;
$$;

DELETE FROM auth.users WHERE id = 'a1000000-0000-4000-8000-000000000001';

DO $$
DECLARE
  v_request uuid := (SELECT value::uuid FROM ad3a_test_state WHERE key = 'owner_request');
  v_token text := (SELECT value FROM ad3a_test_state WHERE key = 'owner_lease_token');
  v_step text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = 'a1000000-0000-4000-8000-000000000001')
    OR EXISTS (SELECT 1 FROM public.markets WHERE owner_id = 'a1000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'owner identity/workspace cascade did not complete';
  END IF;
  FOREACH v_step IN ARRAY ARRAY['profile_deleted','auth_user_deleted','sessions_revoked'] LOOP
    PERFORM public.bff_record_account_deletion_step(
      v_request, v_token, v_step, 'completed', 1, repeat('b', 64), NULL
    );
  END LOOP;
  IF public.bff_finalize_account_deletion(v_request, v_token) <> 'completed' THEN
    RAISE EXCEPTION 'owner request did not complete';
  END IF;
END;
$$;

DO $$
DECLARE
  v_request uuid := (SELECT value::uuid FROM ad3a_test_state WHERE key = 'staff_request');
  v_claim jsonb;
  v_token text;
  v_step text;
BEGIN
  v_claim := public.bff_claim_account_deletion_lease(v_request, 'worker.ad3a.staff', now(), 300);
  IF COALESCE((v_claim->>'claimed')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'staff lease could not be claimed';
  END IF;
  v_token := v_claim->>'leaseToken';
  FOREACH v_step IN ARRAY ARRAY[
    'access_frozen','staff_access_revoked','staff_attribution_anonymized',
    'operational_data_cleaned'
  ] LOOP
    PERFORM public.bff_record_account_deletion_step(
      v_request, v_token, v_step, 'completed', 0, repeat('c', 64), NULL
    );
  END LOOP;
  INSERT INTO ad3a_test_state(key, value) VALUES ('staff_lease_token', v_token);
END;
$$;

DELETE FROM auth.users WHERE id = 'a1000000-0000-4000-8000-000000000002';

DO $$
DECLARE
  v_request uuid := (SELECT value::uuid FROM ad3a_test_state WHERE key = 'staff_request');
  v_token text := (SELECT value FROM ad3a_test_state WHERE key = 'staff_lease_token');
  v_step text;
  v_audit_id bigint;
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = 'a1000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'staff identity deletion did not complete';
  END IF;
  FOREACH v_step IN ARRAY ARRAY['profile_deleted','auth_user_deleted','sessions_revoked'] LOOP
    PERFORM public.bff_record_account_deletion_step(
      v_request, v_token, v_step, 'completed', 1, repeat('d', 64), NULL
    );
  END LOOP;
  IF public.bff_finalize_account_deletion(v_request, v_token) <> 'completed' THEN
    RAISE EXCEPTION 'staff request did not complete';
  END IF;

  IF (SELECT count(*) FROM public.account_deletion_requests WHERE status = 'completed'
      AND active_actor_id IS NULL) <> 2 THEN
    RAISE EXCEPTION 'terminal request invariants failed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.account_deletion_cleanup_steps WHERE status <> 'completed') THEN
    RAISE EXCEPTION 'a required cleanup step remains incomplete';
  END IF;

  BEGIN
    UPDATE public.account_deletion_requests SET status = 'processing' WHERE id = v_request;
    RAISE EXCEPTION 'terminal request transitioned backwards';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  SELECT id INTO v_audit_id FROM public.account_deletion_transition_audit LIMIT 1;
  BEGIN
    UPDATE public.account_deletion_transition_audit SET reason_code = 'tampered' WHERE id = v_audit_id;
    RAISE EXCEPTION 'audit mutation was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

DELETE FROM auth.users WHERE id = 'a1000000-0000-4000-8000-000000000003';

COMMIT;

SELECT json_build_object(
  'ok', true,
  'completed_requests', count(*),
  'audit_rows', (SELECT count(*) FROM public.account_deletion_transition_audit),
  'remaining_synthetic_profiles', (SELECT count(*) FROM public.profiles WHERE email LIKE 'ad3a-%@example.test')
) AS ad3a_result
FROM public.account_deletion_requests
WHERE status = 'completed';
