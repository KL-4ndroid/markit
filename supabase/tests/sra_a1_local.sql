\set ON_ERROR_STOP on

BEGIN;

DO $sra_a1_catalog_assertions$
DECLARE
  function_name text;
  function_oid oid;
  client_execute boolean;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'update_market_read_model',
    'update_product_read_model',
    'handle_new_user',
    'auto_add_staff_to_new_market'
  ]
  LOOP
    SELECT p.oid
    INTO function_oid
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = function_name
      AND p.pronargs = 0
      AND p.prosecdef
      AND p.proconfig = ARRAY['search_path=pg_catalog, public'];

    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'sra_a1_catalog_assertion_failed:%', function_name;
    END IF;

    client_execute := pg_catalog.has_function_privilege('anon', function_oid, 'EXECUTE')
      OR pg_catalog.has_function_privilege('authenticated', function_oid, 'EXECUTE');
    IF client_execute THEN
      RAISE EXCEPTION 'sra_a1_client_execute_assertion_failed:%', function_name;
    END IF;
  END LOOP;
END
$sra_a1_catalog_assertions$;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a3000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'sra-a1-owner@example.test', 'synthetic', now(),
    '{}'::jsonb, '{"display_name":"SRA A1 owner"}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a3000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'sra-a1-staff@example.test', 'synthetic', now(),
    '{}'::jsonb, '{"display_name":"SRA A1 staff"}'::jsonb, now(), now()
  );

DO $sra_a1_profile_assertion$
BEGIN
  IF (
    SELECT count(*)
    FROM public.profiles
    WHERE id IN (
      'a3000000-0000-4000-8000-000000000001',
      'a3000000-0000-4000-8000-000000000002'
    )
  ) <> 2 THEN
    RAISE EXCEPTION 'sra_a1_profile_trigger_failed';
  END IF;
END
$sra_a1_profile_assertion$;

INSERT INTO public.staff_relationships (
  owner_id, staff_id, staff_email, accepted_at, status
) VALUES (
  'a3000000-0000-4000-8000-000000000001',
  'a3000000-0000-4000-8000-000000000002',
  'sra-a1-staff@example.test', now(), 'active'
);

INSERT INTO public.events (
  id, type, payload, actor_id, market_id, timestamp, metadata, sync_status
) VALUES (
  'e3000000-0000-4000-8000-000000000001',
  'market_created',
  jsonb_build_object(
    'name', 'SRA A1 disposable market',
    'location', 'localhost',
    'startDate', current_date::text,
    'endDate', current_date::text,
    'salesPhotoEvidenceRequired', false
  ),
  'a3000000-0000-4000-8000-000000000001',
  'b3000000-0000-4000-8000-000000000001',
  now(), '{}'::jsonb, 'synced'
);

DO $sra_a1_market_assertion$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.markets
    WHERE id = 'b3000000-0000-4000-8000-000000000001'
      AND owner_id = 'a3000000-0000-4000-8000-000000000001'
      AND name = 'SRA A1 disposable market'
  ) THEN
    RAISE EXCEPTION 'sra_a1_market_projection_failed';
  END IF;

  IF (
    SELECT count(*)
    FROM public.market_members
    WHERE market_id = 'b3000000-0000-4000-8000-000000000001'
      AND user_id IN (
        'a3000000-0000-4000-8000-000000000001',
        'a3000000-0000-4000-8000-000000000002'
      )
  ) <> 2 THEN
    RAISE EXCEPTION 'sra_a1_market_membership_trigger_failed';
  END IF;
END
$sra_a1_market_assertion$;

INSERT INTO public.events (
  id, type, payload, actor_id, market_id, timestamp, metadata, sync_status
) VALUES (
  'e3000000-0000-4000-8000-000000000002',
  'product_created',
  jsonb_build_object(
    'productId', 'c3000000-0000-4000-8000-000000000001',
    'name', 'SRA A1 product',
    'category', 'other',
    'price', 10,
    'cost', 4,
    'stock', 3,
    'unlimitedStock', false,
    'isShared', false
  ),
  'a3000000-0000-4000-8000-000000000001',
  'b3000000-0000-4000-8000-000000000001',
  now(), '{}'::jsonb, 'synced'
), (
  'e3000000-0000-4000-8000-000000000003',
  'product_updated',
  jsonb_build_object(
    'productId', 'c3000000-0000-4000-8000-000000000001',
    'updates', jsonb_build_object('name', 'SRA A1 product updated', 'price', 12)
  ),
  'a3000000-0000-4000-8000-000000000001',
  'b3000000-0000-4000-8000-000000000001',
  now(), '{}'::jsonb, 'synced'
), (
  'e3000000-0000-4000-8000-000000000004',
  'product_deleted',
  jsonb_build_object('productId', 'c3000000-0000-4000-8000-000000000001'),
  'a3000000-0000-4000-8000-000000000001',
  'b3000000-0000-4000-8000-000000000001',
  now(), '{}'::jsonb, 'synced'
);

DO $sra_a1_product_assertion$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.products
    WHERE id = 'c3000000-0000-4000-8000-000000000001'
      AND owner_id = 'a3000000-0000-4000-8000-000000000001'
      AND name = 'SRA A1 product updated'
      AND price = 12
      AND is_active IS FALSE
  ) THEN
    RAISE EXCEPTION 'sra_a1_product_projection_failed';
  END IF;
END
$sra_a1_product_assertion$;

SELECT json_build_object(
  'ok', true,
  'targetFunctionCount', 4,
  'profileTriggerCount', 2,
  'marketProjectionCount', 1,
  'marketMembershipCount', 2,
  'productProjectionCount', 1,
  'transactionOutcome', 'rolled_back'
) AS sra_a1_local_evidence;

ROLLBACK;
