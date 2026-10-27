-- Read-only structural and service-boundary verification for migration 085.
DO $verify$
DECLARE v_signature text; v_definition text;
BEGIN
  IF to_regprocedure('public.product_cover_photo_write_allowed(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'Photo write decision helper missing';
  END IF;
  IF has_function_privilege('anon','public.product_cover_photo_write_allowed(uuid,uuid)','EXECUTE')
    OR has_function_privilege('authenticated','public.product_cover_photo_write_allowed(uuid,uuid)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.product_cover_photo_write_allowed(uuid,uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Photo decision helper must be service-only';
  END IF;
  FOREACH v_signature IN ARRAY ARRAY[
    'public.claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint)',
    'public.finalize_product_cover_photo_upload(uuid,uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,integer,integer)'
  ] LOOP
    v_definition := pg_get_functiondef(to_regprocedure(v_signature));
    IF position('FERIA_PRODUCT_PHOTO_AUTH_V1' IN v_definition)=0
      OR position('public.product_cover_photo_write_allowed' IN v_definition)=0
      OR position('account_entitlements' IN v_definition)>0 THEN
      RAISE EXCEPTION 'Legacy photo authorization not aligned: %',v_signature;
    END IF;
    IF has_function_privilege('anon',v_signature,'EXECUTE') OR has_function_privilege('authenticated',v_signature,'EXECUTE')
      OR NOT has_function_privilege('service_role',v_signature,'EXECUTE')
      OR NOT (SELECT prosecdef FROM pg_proc WHERE oid=to_regprocedure(v_signature)) THEN
      RAISE EXCEPTION 'Photo RPC service boundary changed';
    END IF;
  END LOOP;
END;
$verify$;
