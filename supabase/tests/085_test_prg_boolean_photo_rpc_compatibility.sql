-- Isolated fixture only. All changes roll back.
BEGIN;
DO $test$
DECLARE
  owner_id uuid := gen_random_uuid();
  product_id uuid := gen_random_uuid();
  photo_id uuid := gen_random_uuid();
  photo_version bigint := 3000000000;
  signature text;
  claimed public.product_cover_photos;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint,boolean)',
    'public.finalize_product_cover_photo_upload(uuid,uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,integer,integer,boolean)',
    'public.product_cover_photo_write_allowed(uuid,uuid)'
  ] LOOP
    IF has_function_privilege('anon', signature, 'EXECUTE')
      OR has_function_privilege('authenticated', signature, 'EXECUTE')
      OR NOT has_function_privilege('service_role', signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'Unexpected photo execution privileges: %', signature;
    END IF;
  END LOOP;

  INSERT INTO auth.users(id, email, raw_user_meta_data)
  VALUES (owner_id, owner_id::text || '@example.test', '{}'::jsonb);
  INSERT INTO public.products(id, owner_id, name, category, price)
  VALUES (product_id, owner_id, '085 test product', 'other', 1);

  BEGIN
    PERFORM public.claim_product_cover_photo_upload(owner_id, product_id, photo_id, photo_version, 2, 750000, true);
    RAISE EXCEPTION 'Unentitled claim was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'paid_entitlement_required' THEN RAISE; END IF;
  END;

  claimed := public.claim_product_cover_photo_upload(owner_id, product_id, photo_id, photo_version, 2, 750000, false);
  IF claimed.status IS DISTINCT FROM 'uploading' OR claimed.version IS DISTINCT FROM photo_version THEN
    RAISE EXCEPTION 'Existing service call or bigint version no longer works';
  END IF;

  BEGIN
    PERFORM public.finalize_product_cover_photo_upload(owner_id, product_id, photo_id, photo_version,
      'unused', 'unused', repeat('a', 64), repeat('b', 64), 'image/webp', 'image/webp', 1, 1, 1, 1, true);
    RAISE EXCEPTION 'Unentitled finalization was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'paid_entitlement_required' THEN RAISE; END IF;
  END;

  INSERT INTO public.account_entitlements(owner_id, product_cover_photo_enabled) VALUES (owner_id, true);
  IF public.product_cover_photo_write_allowed(owner_id, owner_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Legacy entitlement did not carry forward outside the pilot';
  END IF;
  INSERT INTO public.subscription_write_guard_owners(owner_id) VALUES (owner_id);
  IF public.product_cover_photo_write_allowed(owner_id, owner_id) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Legacy entitlement overrode the active Free plan';
  END IF;
  INSERT INTO public.subscription_accounts(owner_id, plan_code, plan_source) VALUES (owner_id, 'pro', 'admin');
  IF public.product_cover_photo_write_allowed(owner_id, owner_id) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Active Pro plan was denied';
  END IF;
END;
$test$;
ROLLBACK;
