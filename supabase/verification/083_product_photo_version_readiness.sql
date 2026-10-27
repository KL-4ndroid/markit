-- Read-only product cover photo version readiness; no operational writes.
DO $verify$
DECLARE
  v_signature text;
  v_base text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND table_name='product_cover_photos' AND column_name IN ('version','pending_version') AND data_type<>'bigint') THEN
    RAISE EXCEPTION 'Product photo versions must use bigint';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'
    AND table_name='product_cover_photos' AND column_name IN ('version','pending_version') AND data_type='bigint') <> 2 THEN
    RAISE EXCEPTION 'Both product photo version columns are required';
  END IF;
  FOREACH v_signature IN ARRAY ARRAY[
    'public.claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint,boolean)',
    'public.finalize_product_cover_photo_upload(uuid,uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,integer,integer,boolean)'
  ] LOOP
    IF to_regprocedure(v_signature) IS NULL THEN RAISE EXCEPTION 'Missing version RPC: %',v_signature; END IF;
    IF has_function_privilege('anon',v_signature,'EXECUTE') OR has_function_privilege('authenticated',v_signature,'EXECUTE') THEN
      RAISE EXCEPTION 'Photo mutation RPC must not be callable by clients';
    END IF;
    IF NOT has_function_privilege('service_role',v_signature,'EXECUTE') THEN RAISE EXCEPTION 'Service RPC execution missing'; END IF;
    IF NOT (SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure(v_signature)) THEN RAISE EXCEPTION 'RPC security mode changed'; END IF;
    v_base := replace(v_signature, ',boolean)', ')');
    IF to_regprocedure(v_base) IS NOT NULL THEN
      IF position('FERIA_PHOTO_VERSION_COMPAT_V2' IN
        (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure(v_signature)))=0 THEN
        RAISE EXCEPTION 'Unrecognized photo compatibility wrapper';
      END IF;
      IF has_function_privilege('anon',v_base,'EXECUTE') OR has_function_privilege('authenticated',v_base,'EXECUTE')
        OR NOT has_function_privilege('service_role',v_base,'EXECUTE')
        OR NOT (SELECT prosecdef AND pronargdefaults=0 FROM pg_proc WHERE oid=to_regprocedure(v_base)) THEN
        RAISE EXCEPTION 'Legacy base must remain service-only without default arguments';
      END IF;
    END IF;
  END LOOP;
  IF to_regprocedure('public.claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint,boolean)') IS NOT NULL
    OR to_regprocedure('public.finalize_product_cover_photo_upload(uuid,uuid,uuid,integer,text,text,text,text,text,text,integer,integer,integer,integer,boolean)') IS NOT NULL
    OR to_regprocedure('public.claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint)') IS NOT NULL
    OR to_regprocedure('public.finalize_product_cover_photo_upload(uuid,uuid,uuid,integer,text,text,text,text,text,text,integer,integer,integer,integer)') IS NOT NULL THEN
    RAISE EXCEPTION 'Ambiguous legacy RPC overload remains';
  END IF;
END
$verify$;
