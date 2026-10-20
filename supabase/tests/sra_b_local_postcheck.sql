\set ON_ERROR_STOP on

DO $sra_b_catalog$
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
    RAISE EXCEPTION 'unexpected SRA-B postcheck policy counts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policy policy
    WHERE policy.polrelid IN ('public.markets'::regclass, 'public.products'::regclass)
      AND policy.polcmd = 'a'
      AND pg_get_expr(policy.polwithcheck, policy.polrelid, true) = 'true'
  ) THEN
    RAISE EXCEPTION 'always-true INSERT policy remains';
  END IF;
END
$sra_b_catalog$;

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

DO $sra_b_denials$
BEGIN
  BEGIN
    INSERT INTO public.markets (id, owner_id)
    VALUES (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '11111111-1111-4111-8111-111111111111'
    );
    RAISE EXCEPTION 'direct market INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    INSERT INTO public.products (id, owner_id)
    VALUES (
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      '22222222-2222-4222-8222-222222222222'
    );
    RAISE EXCEPTION 'foreign product INSERT unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$sra_b_denials$;

INSERT INTO public.products (id, owner_id)
VALUES (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111'
);

INSERT INTO public.events (id, type, actor_id, entity_id) VALUES
  (
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'market_created',
    '11111111-1111-4111-8111-111111111111',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  (
    'ffffffff-ffff-4fff-8fff-ffffffffffff',
    'product_created',
    '11111111-1111-4111-8111-111111111111',
    '99999999-9999-4999-8999-999999999999'
  );

RESET ROLE;

DO $sra_b_projection$
BEGIN
  IF (SELECT count(*) FROM public.markets) <> 1 THEN
    RAISE EXCEPTION 'market event projection failed after SRA-B';
  END IF;
  IF (SELECT count(*) FROM public.products) <> 2 THEN
    RAISE EXCEPTION 'product owner INSERT or event projection failed after SRA-B';
  END IF;
END
$sra_b_projection$;

ROLLBACK;
