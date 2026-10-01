-- SRA-A1 LOCAL REVIEW MIGRATION DRAFT
-- Authorized scope: disposable localhost evidence only.
-- Prohibited: remote/Production execution or placement in supabase/migrations.
-- Baseline: phased local bootstrap through repository migration 071.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $sra_a1_preflight$
DECLARE
  target record;
  function_oid oid;
  actual_owner text;
  actual_security_definer boolean;
  actual_config text;
  actual_definition_hash text;
  actual_body_hash text;
  actual_acl text;
  trigger_count integer;
BEGIN
  FOR target IN
    SELECT *
    FROM (VALUES
      (
        'auto_add_staff_to_new_market',
        'e0f49fbb9d20b3f7e5c63477f647cba6',
        'bff498382d61382bdd440f9a8e5d2807',
        '',
        'public',
        'markets',
        'trigger_auto_add_staff_to_new_market'
      ),
      (
        'handle_new_user',
        '6d14aa3115a3deb38c605316d026f8a6',
        '42281ca83183d1a5e88bc75865cae1b7',
        '',
        'auth',
        'users',
        'on_auth_user_created'
      ),
      (
        'update_market_read_model',
        '917e1eaa7435e3f649c01178a7193d6f',
        '419d0fda762ed54387600d318195a039',
        '=X/postgres,postgres=X/postgres,service_role=X/postgres',
        'public',
        'events',
        'trigger_update_market_read_model'
      ),
      (
        'update_product_read_model',
        '1455caf09593c37bb51965944e0e88ff',
        'ef21f08fc762225ffe4d026209211250',
        '=X/postgres,postgres=X/postgres,service_role=X/postgres',
        'public',
        'events',
        'trigger_update_product_read_model'
      )
    ) AS expected(
      function_name,
      definition_hash,
      body_hash,
      acl_text,
      trigger_schema,
      trigger_table,
      trigger_name
    )
  LOOP
    SELECT
      p.oid,
      pg_get_userbyid(p.proowner),
      p.prosecdef,
      COALESCE(array_to_string(p.proconfig, ','), ''),
      md5(pg_get_functiondef(p.oid)),
      md5(p.prosrc),
      COALESCE(array_to_string(p.proacl, ','), '')
    INTO
      function_oid,
      actual_owner,
      actual_security_definer,
      actual_config,
      actual_definition_hash,
      actual_body_hash,
      actual_acl
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = target.function_name
      AND p.pronargs = 0;

    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'sra_a1_preflight_function_missing:%', target.function_name;
    END IF;
    IF actual_owner <> 'postgres'
      OR actual_security_definer IS DISTINCT FROM TRUE
      OR actual_config <> ''
      OR actual_definition_hash <> target.definition_hash
      OR actual_body_hash <> target.body_hash
      OR actual_acl <> target.acl_text
    THEN
      RAISE EXCEPTION 'sra_a1_preflight_function_drift:%', target.function_name;
    END IF;

    SELECT count(*)
    INTO trigger_count
    FROM pg_catalog.pg_trigger trigger_row
    JOIN pg_catalog.pg_class relation ON relation.oid = trigger_row.tgrelid
    JOIN pg_catalog.pg_namespace relation_schema ON relation_schema.oid = relation.relnamespace
    WHERE trigger_row.tgfoid = function_oid
      AND NOT trigger_row.tgisinternal
      AND trigger_row.tgenabled = 'O'
      AND relation_schema.nspname = target.trigger_schema
      AND relation.relname = target.trigger_table
      AND trigger_row.tgname = target.trigger_name;

    IF trigger_count <> 1 THEN
      RAISE EXCEPTION 'sra_a1_preflight_trigger_drift:%', target.function_name;
    END IF;
  END LOOP;
END
$sra_a1_preflight$;

ALTER FUNCTION public.update_market_read_model()
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.update_product_read_model()
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.handle_new_user()
  SET search_path TO pg_catalog, public;
ALTER FUNCTION public.auto_add_staff_to_new_market()
  SET search_path TO pg_catalog, public;

REVOKE EXECUTE ON FUNCTION public.update_market_read_model() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_product_read_model() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_add_staff_to_new_market() FROM PUBLIC, anon, authenticated;

DO $sra_a1_postcheck$
DECLARE
  target record;
  function_oid oid;
  actual_owner text;
  actual_security_definer boolean;
  actual_config text;
  actual_body_hash text;
  public_execute_count integer;
  trigger_count integer;
BEGIN
  FOR target IN
    SELECT *
    FROM (VALUES
      ('auto_add_staff_to_new_market', 'bff498382d61382bdd440f9a8e5d2807', 'public', 'markets', 'trigger_auto_add_staff_to_new_market'),
      ('handle_new_user', '42281ca83183d1a5e88bc75865cae1b7', 'auth', 'users', 'on_auth_user_created'),
      ('update_market_read_model', '419d0fda762ed54387600d318195a039', 'public', 'events', 'trigger_update_market_read_model'),
      ('update_product_read_model', 'ef21f08fc762225ffe4d026209211250', 'public', 'events', 'trigger_update_product_read_model')
    ) AS expected(function_name, body_hash, trigger_schema, trigger_table, trigger_name)
  LOOP
    SELECT
      p.oid,
      pg_get_userbyid(p.proowner),
      p.prosecdef,
      COALESCE(array_to_string(p.proconfig, ','), ''),
      md5(p.prosrc)
    INTO
      function_oid,
      actual_owner,
      actual_security_definer,
      actual_config,
      actual_body_hash
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = target.function_name
      AND p.pronargs = 0;

    IF function_oid IS NULL
      OR actual_owner <> 'postgres'
      OR actual_security_definer IS DISTINCT FROM TRUE
      OR actual_config <> 'search_path=pg_catalog, public'
      OR actual_body_hash <> target.body_hash
    THEN
      RAISE EXCEPTION 'sra_a1_postcheck_function_drift:%', target.function_name;
    END IF;

    IF pg_catalog.has_function_privilege('anon', function_oid, 'EXECUTE')
      OR pg_catalog.has_function_privilege('authenticated', function_oid, 'EXECUTE')
    THEN
      RAISE EXCEPTION 'sra_a1_postcheck_client_execute_retained:%', target.function_name;
    END IF;

    SELECT count(*)
    INTO public_execute_count
    FROM pg_catalog.aclexplode(
      COALESCE(
        (SELECT p.proacl FROM pg_catalog.pg_proc p WHERE p.oid = function_oid),
        pg_catalog.acldefault('f', (SELECT p.proowner FROM pg_catalog.pg_proc p WHERE p.oid = function_oid))
      )
    ) acl
    WHERE acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE';

    IF public_execute_count <> 0 THEN
      RAISE EXCEPTION 'sra_a1_postcheck_public_execute_retained:%', target.function_name;
    END IF;

    SELECT count(*)
    INTO trigger_count
    FROM pg_catalog.pg_trigger trigger_row
    JOIN pg_catalog.pg_class relation ON relation.oid = trigger_row.tgrelid
    JOIN pg_catalog.pg_namespace relation_schema ON relation_schema.oid = relation.relnamespace
    WHERE trigger_row.tgfoid = function_oid
      AND NOT trigger_row.tgisinternal
      AND trigger_row.tgenabled = 'O'
      AND relation_schema.nspname = target.trigger_schema
      AND relation.relname = target.trigger_table
      AND trigger_row.tgname = target.trigger_name;

    IF trigger_count <> 1 THEN
      RAISE EXCEPTION 'sra_a1_postcheck_trigger_drift:%', target.function_name;
    END IF;
  END LOOP;
END
$sra_a1_postcheck$;

COMMIT;
