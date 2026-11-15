-- Runs after the guarded test_prg routine and role fixtures, in their rollback transaction.
DO $columns$
DECLARE
  members_before jsonb;
  products_before jsonb;
  role_column smallint;
  sync_column smallint;
  role_check text;
  role_index text;
  delete_rule text;
  role_comment text;
BEGIN
  IF current_setting('feria.test_prg_column_rehearsal',true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Expected the test_prg column rehearsal transaction';
  END IF;
  SELECT a.attnum INTO STRICT role_column FROM pg_attribute a
    WHERE a.attrelid='public.market_members'::regclass AND a.attname='role' AND NOT a.attisdropped
      AND a.atttypid='text'::regtype AND a.attnotnull AND NOT a.atthasdef AND a.attacl IS NULL;
  SELECT a.attnum INTO STRICT sync_column FROM pg_attribute a
    WHERE a.attrelid='public.products'::regclass AND a.attname='sync_status' AND NOT a.attisdropped
      AND a.atttypid='text'::regtype AND NOT a.attnotnull AND a.attacl IS NULL;
  SELECT pg_get_constraintdef(oid,true) INTO STRICT role_check FROM pg_constraint
    WHERE conrelid='public.market_members'::regclass AND conname='market_members_role_check' AND convalidated;
  SELECT pg_get_indexdef(to_regclass('public.idx_market_members_role')) INTO role_index;
  SELECT pg_get_expr(polqual,polrelid) INTO STRICT delete_rule FROM pg_policy
    WHERE polrelid='public.market_members'::regclass AND polname='market_members_delete_owner_or_self_staff'
      AND polcmd='d' AND polpermissive AND polroles=ARRAY['authenticated'::regrole::oid] AND polwithcheck IS NULL;

  IF role_index IS NULL OR delete_rule IS NULL OR EXISTS (
    SELECT 1 FROM pg_depend d WHERE d.refclassid='pg_class'::regclass
      AND d.refobjid='public.market_members'::regclass AND d.refobjsubid=role_column
      AND NOT ((d.classid='pg_class'::regclass AND d.objid=to_regclass('public.idx_market_members_role'))
        OR (d.classid='pg_constraint'::regclass AND d.objid IN (SELECT oid FROM pg_constraint
          WHERE conrelid='public.market_members'::regclass AND conname='market_members_role_check'))
        OR (d.classid='pg_policy'::regclass AND d.objid IN (SELECT oid FROM pg_policy
          WHERE polrelid='public.market_members'::regclass AND polname='market_members_delete_owner_or_self_staff')))
  ) OR EXISTS (
    SELECT 1 FROM pg_depend d WHERE d.refclassid='pg_class'::regclass
      AND d.refobjid='public.products'::regclass AND d.refobjsubid=sync_column
      AND NOT ((d.classid='pg_class'::regclass AND d.objid IS NOT DISTINCT FROM to_regclass('public.idx_products_sync_status'))
        OR (d.classid='pg_attrdef'::regclass AND d.objid IN (SELECT oid FROM pg_attrdef
          WHERE adrelid='public.products'::regclass AND adnum=sync_column)))
  ) OR EXISTS (SELECT 1 FROM public.products WHERE sync_status IS DISTINCT FROM 'synced')
    OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.market_members'::regclass AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Column dependencies or legacy product states require review';
  END IF;

  SELECT jsonb_agg(to_jsonb(m) ORDER BY market_id,user_id) INTO members_before FROM public.market_members m;
  SELECT jsonb_agg(to_jsonb(p)-'sync_status' ORDER BY id) INTO products_before FROM public.products p;
  role_comment := col_description('public.market_members'::regclass,role_column);

  ALTER TABLE public.market_members ADD COLUMN rehearsal_role text;
  UPDATE public.market_members SET rehearsal_role=role;
  DROP POLICY market_members_delete_owner_or_self_staff ON public.market_members;
  ALTER TABLE public.market_members DROP COLUMN role RESTRICT;
  ALTER TABLE public.market_members RENAME COLUMN rehearsal_role TO role;
  ALTER TABLE public.market_members ALTER COLUMN role SET NOT NULL;
  EXECUTE 'ALTER TABLE public.market_members ADD CONSTRAINT market_members_role_check ' || role_check;
  EXECUTE role_index;
  EXECUTE format('COMMENT ON COLUMN public.market_members.role IS %L',role_comment);
  EXECUTE format('CREATE POLICY market_members_delete_owner_or_self_staff ON public.market_members FOR DELETE TO authenticated USING (%s)',delete_rule);
  ALTER TABLE public.products DROP COLUMN sync_status RESTRICT;

  IF members_before IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(m) ORDER BY market_id,user_id) FROM public.market_members m)
    OR products_before IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM public.products p)
    OR pg_get_indexdef(to_regclass('public.idx_market_members_role')) IS DISTINCT FROM role_index
    OR to_regclass('public.idx_products_sync_status') IS NOT NULL THEN
    RAISE EXCEPTION 'Column alignment changed retained values or index definitions';
  END IF;
END;
$columns$;

-- REHEARSAL FIXTURES BEGIN
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
DO $members$
DECLARE
  fixture record;
  market constant uuid := 'a9610000-0000-4000-8000-000000000004';
  owner_id constant uuid := 'a9610000-0000-4000-8000-000000000001';
  staff_id constant uuid := 'a9610000-0000-4000-8000-000000000002';
  changed integer;
BEGIN
  FOR fixture IN SELECT * FROM (VALUES
    (owner_id::text,true), (staff_id::text,true), ('a9610000-0000-4000-8000-000000000003',false)
  ) AS cases(actor,may_remove_staff) LOOP
    PERFORM set_config('request.jwt.claim.sub',fixture.actor,true);
    DELETE FROM public.market_members WHERE market_id=market AND user_id=owner_id;
    IF FOUND THEN RAISE EXCEPTION 'Owner membership must be protected'; END IF;
    BEGIN
      DELETE FROM public.market_members WHERE market_id=market AND user_id=staff_id;
      GET DIAGNOSTICS changed = ROW_COUNT;
      IF (changed=1) IS DISTINCT FROM fixture.may_remove_staff THEN
        RAISE EXCEPTION 'Staff membership deletion policy changed';
      END IF;
      RAISE EXCEPTION USING ERRCODE='R0960', MESSAGE='Rollback the synthetic delete case';
    EXCEPTION WHEN SQLSTATE 'R0960' THEN NULL;
    END;
  END LOOP;
END;
$members$;

SET LOCAL request.jwt.claim.sub = 'a9610000-0000-4000-8000-000000000001';
INSERT INTO public.events (id,type,payload,actor_id,market_id,timestamp,sync_status)
VALUES ('a9610000-0000-4000-8000-000000000011','product_updated',
  '{"productId":"a9610000-0000-4000-8000-000000000006","updates":{"stock":5}}',
  'a9610000-0000-4000-8000-000000000001','a9610000-0000-4000-8000-000000000004',now(),'synced');
DO $product$
BEGIN
  IF (SELECT stock FROM public.products WHERE id='a9610000-0000-4000-8000-000000000006') IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'Product event did not project after removal of the legacy sync column';
  END IF;
END;
$product$;
RESET ROLE;
