-- Runs only inside the guarded test_prg rollback bundle, after the policy fixture.
DO $scope$
BEGIN
  IF current_setting('feria.test_prg_cleanup_rehearsal', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Expected the test_prg cleanup rehearsal transaction';
  END IF;
  IF EXISTS (SELECT 1 FROM public.staff_relationships WHERE owner_id=staff_id) THEN
    RAISE EXCEPTION 'Self-invitation rows require review before validating no_self_invite';
  END IF;
END;
$scope$;

SET CONSTRAINTS ALL IMMEDIATE;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_market_id_fkey;
ALTER TABLE public.staff_relationships DROP CONSTRAINT IF EXISTS no_self_invite;
ALTER TABLE public.staff_relationships ADD CONSTRAINT no_self_invite CHECK (owner_id <> staff_id);
REVOKE DELETE ON public.pending_operations FROM authenticated;

-- REHEARSAL FIXTURES BEGIN
SET LOCAL request.jwt.claim.role = 'service_role';
DO $constraints$
DECLARE
  fixture_owner constant uuid := 'a9610000-0000-4000-8000-000000000001';
  other_market constant uuid := 'a9610000-0000-4000-8000-000000000007';
  other_event constant uuid := 'a9610000-0000-4000-8000-000000000008';
  rejected_constraint text;
BEGIN
  BEGIN
    INSERT INTO public.staff_relationships (owner_id,staff_id,staff_email,role,permissions)
    VALUES (fixture_owner,fixture_owner,'096-market-owner@example.test','viewer',
      '{"can_view":true,"can_edit":false,"infoLevel":0}');
    RAISE EXCEPTION 'Self-invitation must be rejected';
  EXCEPTION WHEN check_violation THEN
    GET STACKED DIAGNOSTICS rejected_constraint = CONSTRAINT_NAME;
    IF rejected_constraint <> 'no_self_invite' THEN RAISE; END IF;
  END;

  INSERT INTO public.events (id,type,payload,actor_id,market_id,timestamp,sync_status)
  VALUES (other_event,'market_created',jsonb_build_object('name','096 disposable FK market','location','test fixture',
    'startDate',current_date::text,'endDate',current_date::text),fixture_owner,other_market,now(),'synced');
  DELETE FROM public.markets WHERE id=other_market;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.events WHERE id=other_event) THEN
    RAISE EXCEPTION 'Expected market projection to delete without cascading into events';
  END IF;
  DELETE FROM public.events WHERE id=other_event AND market_id=other_market;
  IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.events WHERE id='a9610000-0000-4000-8000-000000000005') THEN
    RAISE EXCEPTION 'Explicit event cleanup did not retain the unrelated market event';
  END IF;
END;
$constraints$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL request.jwt.claim.sub = 'a9610000-0000-4000-8000-000000000001';
DO $queue$
DECLARE
  operation_id constant text := 'a9610000-0000-4000-8000-000000000009';
  fixture_market constant uuid := 'a9610000-0000-4000-8000-000000000004';
  drained text;
BEGIN
  IF has_table_privilege(current_user,'public.pending_operations','DELETE') THEN
    RAISE EXCEPTION 'Client pending operation DELETE remains granted';
  END IF;
  IF public.enqueue_checklist_toggle_pending_operation(operation_id,fixture_market,'096-test-item',true,operation_id)
      IS DISTINCT FROM operation_id THEN
    RAISE EXCEPTION 'Pending operation enqueue failed';
  END IF;
  drained := public.drain_checklist_toggle_pending_operation(operation_id);
  IF drained IS DISTINCT FROM operation_id THEN
    RAISE EXCEPTION 'Pending operation drain returned %',drained;
  END IF;
END;
$queue$;
RESET ROLE;

INSERT INTO public.subscription_write_guard_owners (owner_id)
VALUES ('a9610000-0000-4000-8000-000000000001');

SET LOCAL ROLE service_role;
SET LOCAL request.jwt.claim.role = 'service_role';
DO $photos$
DECLARE
  fixture_owner constant uuid := 'a9610000-0000-4000-8000-000000000001';
  fixture_product constant uuid := 'a9610000-0000-4000-8000-000000000006';
  fixture_photo constant uuid := 'a9610000-0000-4000-8000-000000000010';
  photo_version constant bigint := 3000000000;
  photo public.product_cover_photos;
BEGIN
  BEGIN
    PERFORM public.claim_product_cover_photo_upload(fixture_owner,fixture_product,fixture_photo,photo_version,2,750000,true);
    RAISE EXCEPTION 'Expected the reviewed boolean wrapper to reject true';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'paid_entitlement_required' THEN RAISE; END IF;
  END;
  photo := public.claim_product_cover_photo_upload(fixture_owner,fixture_product,fixture_photo,photo_version,2,750000,false);
  IF photo.status IS DISTINCT FROM 'uploading' OR photo.version IS DISTINCT FROM photo_version THEN
    RAISE EXCEPTION 'Photo upload claim did not preserve bigint version';
  END IF;
  BEGIN
    PERFORM public.finalize_product_cover_photo_upload(fixture_owner,fixture_product,fixture_photo,photo_version-1,
      '096-fixture-display','096-fixture-thumbnail',repeat('a',64),repeat('b',64),'image/webp','image/webp',1,1,1,1,false);
    RAISE EXCEPTION 'Stale photo version was finalized';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'cover_photo_not_claimed' THEN RAISE; END IF;
  END;
  photo := public.finalize_product_cover_photo_upload(fixture_owner,fixture_product,fixture_photo,photo_version,
    '096-fixture-display','096-fixture-thumbnail',repeat('a',64),repeat('b',64),'image/webp','image/webp',1,1,1,1,false);
  IF photo.status IS DISTINCT FROM 'uploaded' OR photo.version IS DISTINCT FROM photo_version
    OR photo.display_object_key IS DISTINCT FROM '096-fixture-display'
    OR photo.thumbnail_object_key IS DISTINCT FROM '096-fixture-thumbnail' THEN
    RAISE EXCEPTION 'Photo finalization did not preserve the reviewed object references';
  END IF;
END;
$photos$;
RESET ROLE;
