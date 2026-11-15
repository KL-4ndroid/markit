-- Runs after the legacy market fixture in the guarded test_prg rollback bundle.
DO $scope$
BEGIN
  IF current_setting('feria.test_prg_policy_rehearsal', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Expected the test_prg policy rehearsal transaction';
  END IF;
END;
$scope$;

DROP POLICY IF EXISTS "用戶可以查看自己市集的事件_v2" ON public.events;
DROP POLICY IF EXISTS "用戶可以查看自己的事件和市集事件" ON public.events;
DROP POLICY IF EXISTS markets_select_secure ON public.markets;
DROP POLICY IF EXISTS "允許 authenticated 插入市集" ON public.markets;
DROP POLICY IF EXISTS "Users can view own and team products" ON public.products;
DROP POLICY IF EXISTS "允許 authenticated 插入商品" ON public.products;
DROP POLICY IF EXISTS "用戶可以查看自己市集的商品_v2" ON public.products;
DROP POLICY IF EXISTS markets_select_owner_only ON public.markets;
DROP POLICY IF EXISTS products_select_owner_only ON public.products;
DROP POLICY IF EXISTS events_select_owner_only ON public.events;
DROP POLICY IF EXISTS users_can_insert_own_events ON public.events;
DROP POLICY IF EXISTS users_can_update_own_events ON public.events;
DROP POLICY IF EXISTS "老闆或員工可以刪除員工關係" ON public.staff_relationships;

CREATE POLICY markets_select_owner_only ON public.markets FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY products_select_owner_only ON public.products FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY events_select_owner_only ON public.events FOR SELECT TO authenticated
  USING (market_id IN (SELECT id FROM public.current_user_owned_market_ids()) OR
    (market_id IS NULL AND actor_id = auth.uid() AND
      EXISTS (SELECT 1 FROM public.markets m WHERE m.owner_id = auth.uid())));

CREATE POLICY users_can_insert_own_events ON public.events FOR INSERT TO authenticated
  WITH CHECK (actor_id::text = auth.uid()::text);
CREATE POLICY users_can_update_own_events ON public.events FOR UPDATE TO authenticated
  USING (actor_id::text = auth.uid()::text AND (market_id IS NULL OR EXISTS (
    SELECT 1 FROM public.market_members
    WHERE market_members.market_id = events.market_id AND market_members.user_id::text = auth.uid()::text)))
  WITH CHECK (actor_id::text = auth.uid()::text AND (market_id IS NULL OR EXISTS (
    SELECT 1 FROM public.market_members
    WHERE market_members.market_id = events.market_id AND market_members.user_id::text = auth.uid()::text)));
CREATE POLICY "老闆或員工可以刪除員工關係" ON public.staff_relationships FOR DELETE TO PUBLIC
  USING (auth.uid() = owner_id OR auth.uid() = staff_id);

-- REHEARSAL FIXTURES BEGIN
-- A viewer is covered by the market fixture. Product events require an operator.
UPDATE public.staff_relationships
SET role='operator', permissions='{"can_view":true,"can_edit":true,"infoLevel":2}'
WHERE owner_id='a9610000-0000-4000-8000-000000000001'
  AND staff_id='a9610000-0000-4000-8000-000000000002';

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = 'a9610000-0000-4000-8000-000000000001';

INSERT INTO public.events (id, type, payload, actor_id, market_id, timestamp, sync_status)
VALUES ('a9610000-0000-4000-8000-000000000005', 'product_created',
  '{"productId":"a9610000-0000-4000-8000-000000000006","name":"096 disposable product","category":"other","price":10,"cost":4,"stock":3}',
  'a9610000-0000-4000-8000-000000000001', 'a9610000-0000-4000-8000-000000000004', now(), 'synced');

DO $access$
DECLARE
  fixture_owner constant uuid := 'a9610000-0000-4000-8000-000000000001';
  fixture_market constant uuid := 'a9610000-0000-4000-8000-000000000004';
  fixture_event constant uuid := 'a9610000-0000-4000-8000-000000000005';
  fixture_product constant uuid := 'a9610000-0000-4000-8000-000000000006';
  fixture record;
BEGIN
  UPDATE public.events SET metadata = '{"rehearsalSyncAck":true}' WHERE id = fixture_event;
  IF NOT FOUND THEN RAISE EXCEPTION 'Owner event sync acknowledgement did not update'; END IF;

  FOR fixture IN SELECT * FROM (VALUES
    (fixture_owner::text, true, true),
    ('a9610000-0000-4000-8000-000000000002', false, true),
    ('a9610000-0000-4000-8000-000000000003', false, false)
  ) AS cases(user_id, direct_visible, scoped_visible) LOOP
    PERFORM set_config('request.jwt.claim.sub', fixture.user_id, true);
    IF (EXISTS (SELECT 1 FROM public.markets WHERE id=fixture_market)) IS DISTINCT FROM fixture.direct_visible
      OR (EXISTS (SELECT 1 FROM public.products WHERE id=fixture_product)) IS DISTINCT FROM fixture.direct_visible
      OR (EXISTS (SELECT 1 FROM public.events WHERE id=fixture_event)) IS DISTINCT FROM fixture.direct_visible
      OR (EXISTS (SELECT 1 FROM public.staff_accessible_markets WHERE id=fixture_market)) IS DISTINCT FROM fixture.scoped_visible
      OR (EXISTS (SELECT 1 FROM public.staff_accessible_products WHERE id=fixture_product)) IS DISTINCT FROM fixture.scoped_visible
      OR (EXISTS (SELECT 1 FROM public.staff_accessible_events WHERE id=fixture_event)) IS DISTINCT FROM fixture.scoped_visible THEN
      RAISE EXCEPTION 'Synthetic market, product, or event scope mismatch for %', fixture.user_id;
    END IF;

    IF NOT fixture.direct_visible THEN
      UPDATE public.events SET metadata = '{}' WHERE id=fixture_event;
      IF FOUND THEN RAISE EXCEPTION 'Event acknowledgement must be scoped'; END IF;
    END IF;
  END LOOP;

  IF has_table_privilege('authenticated','public.staff_relationships','DELETE')
    OR has_table_privilege('anon','public.staff_relationships','DELETE') THEN
    RAISE EXCEPTION 'Employee relationship delete must retain the table-level restriction';
  END IF;
END;
$access$;
RESET ROLE;
