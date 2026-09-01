-- SRA-B fixed release transaction. Prepared but not authorized for Production execution.

BEGIN;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

DO $sra_b_preflight$
DECLARE
  actual_count integer;
BEGIN
  IF current_setting('server_version_num')::integer / 10000 <> 17 THEN
    RAISE EXCEPTION 'SRA-B blocked: unexpected PostgreSQL major version';
  END IF;

  IF to_regclass('supabase_migrations.schema_migrations') IS NOT NULL THEN
    RAISE EXCEPTION 'SRA-B blocked: migration ledger baseline changed';
  END IF;

  IF to_regclass('public.markets') IS NULL OR to_regclass('public.products') IS NULL THEN
    RAISE EXCEPTION 'SRA-B blocked: target table missing';
  END IF;

  SELECT count(*)
  INTO actual_count
  FROM pg_catalog.pg_policy policy
  JOIN pg_catalog.pg_class table_name ON table_name.oid = policy.polrelid
  JOIN pg_catalog.pg_namespace namespace_name ON namespace_name.oid = table_name.relnamespace
  WHERE namespace_name.nspname = 'public'
    AND table_name.relname IN ('markets', 'products')
    AND policy.polcmd = 'a';

  IF actual_count <> 4 THEN
    RAISE EXCEPTION 'SRA-B blocked: INSERT policy count drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = 'public.markets'::regclass
      AND policy.polname = 'authenticated_can_insert_markets'
      AND policy.polcmd = 'a'
      AND policy.polpermissive
      AND policy.polroles = ARRAY[(SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')]
      AND policy.polqual IS NULL
      AND pg_get_expr(policy.polwithcheck, policy.polrelid, true) = 'true'
  ) THEN
    RAISE EXCEPTION 'SRA-B blocked: authenticated_can_insert_markets drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = 'public.markets'::regclass
      AND policy.polname = '允許 authenticated 插入市集'
      AND policy.polcmd = 'a'
      AND policy.polpermissive
      AND policy.polroles = ARRAY[(SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')]
      AND policy.polqual IS NULL
      AND pg_get_expr(policy.polwithcheck, policy.polrelid, true) = 'true'
  ) THEN
    RAISE EXCEPTION 'SRA-B blocked: localized markets policy drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = 'public.products'::regclass
      AND policy.polname = '允許 authenticated 插入商品'
      AND policy.polcmd = 'a'
      AND policy.polpermissive
      AND policy.polroles = ARRAY[(SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')]
      AND policy.polqual IS NULL
      AND pg_get_expr(policy.polwithcheck, policy.polrelid, true) = 'true'
  ) THEN
    RAISE EXCEPTION 'SRA-B blocked: localized products policy drift';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = 'public.products'::regclass
      AND policy.polname = 'Users can insert own products'
      AND policy.polcmd = 'a'
      AND policy.polpermissive
      AND policy.polroles = ARRAY[0::oid]
      AND policy.polqual IS NULL
      AND pg_get_expr(policy.polwithcheck, policy.polrelid, true) = 'owner_id = auth.uid()'
  ) THEN
    RAISE EXCEPTION 'SRA-B blocked: retained owner product policy drift';
  END IF;
END
$sra_b_preflight$;

DROP POLICY "authenticated_can_insert_markets" ON public.markets;
DROP POLICY "允許 authenticated 插入市集" ON public.markets;
DROP POLICY "允許 authenticated 插入商品" ON public.products;

DO $sra_b_postcheck$
DECLARE
  market_insert_count integer;
  product_insert_count integer;
BEGIN
  SELECT count(*) INTO market_insert_count
  FROM pg_catalog.pg_policy
  WHERE polrelid = 'public.markets'::regclass AND polcmd = 'a';

  SELECT count(*) INTO product_insert_count
  FROM pg_catalog.pg_policy
  WHERE polrelid = 'public.products'::regclass AND polcmd = 'a';

  IF market_insert_count <> 0 OR product_insert_count <> 1 THEN
    RAISE EXCEPTION 'SRA-B blocked: postcheck INSERT policy count mismatch';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid = 'public.products'::regclass
      AND policy.polname = 'Users can insert own products'
      AND policy.polcmd = 'a'
      AND policy.polpermissive
      AND policy.polroles = ARRAY[0::oid]
      AND policy.polqual IS NULL
      AND pg_get_expr(policy.polwithcheck, policy.polrelid, true) = 'owner_id = auth.uid()'
  ) THEN
    RAISE EXCEPTION 'SRA-B blocked: retained owner product policy changed';
  END IF;
END
$sra_b_postcheck$;

COMMIT;
