-- Product photo clients use millisecond versions, which exceed PostgreSQL int4.
-- Widen only version storage and RPC argument types. Preserve stored values,
-- existing RPC bodies, authorization, RLS, quotas and service-only privileges.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
ALTER TABLE public.product_cover_photos ALTER COLUMN version TYPE bigint;
ALTER TABLE public.product_cover_photos ALTER COLUMN pending_version TYPE bigint;

DO $migrate$
DECLARE
  v_name text;
  v_bool_old text;
  v_bool_new text;
  v_base_old text;
  v_base_new text;
  v_old text;
  v_new text;
  v_oid oid;
  v_count integer;
  v_definition text;
  v_arguments text;
  v_calls text;
  v_header_end integer;
  v_owner text;
  v_has_boolean boolean;
  v_result text;
  v_return text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['claim_product_cover_photo_upload','finalize_product_cover_photo_upload'] LOOP
    IF v_name='claim_product_cover_photo_upload' THEN
      v_bool_old := 'public.claim_product_cover_photo_upload(uuid,uuid,uuid,integer,integer,bigint,boolean)';
      v_bool_new := 'public.claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint,boolean)';
    ELSE
      v_bool_old := 'public.finalize_product_cover_photo_upload(uuid,uuid,uuid,integer,text,text,text,text,text,text,integer,integer,integer,integer,boolean)';
      v_bool_new := 'public.finalize_product_cover_photo_upload(uuid,uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,integer,integer,boolean)';
    END IF;
    v_base_old := replace(v_bool_old, ',boolean)', ')');
    v_base_new := replace(v_bool_new, ',boolean)', ')');
    SELECT count(*) INTO v_count FROM pg_proc WHERE oid IN
      (to_regprocedure(v_bool_old),to_regprocedure(v_bool_new),to_regprocedure(v_base_old),to_regprocedure(v_base_new));

    IF to_regprocedure(v_bool_new) IS NOT NULL THEN
      -- A successful legacy conversion keeps a service-only bigint base plus
      -- an explicit-boolean wrapper. Different required JSON argument sets
      -- are unambiguous to PostgREST. Never accept unrelated duplicate RPCs.
      IF v_count=1 THEN CONTINUE; END IF;
      IF v_count=2 AND to_regprocedure(v_base_new) IS NOT NULL
        AND position('FERIA_PHOTO_VERSION_COMPAT_V2' IN
          (SELECT prosrc FROM pg_proc WHERE oid=to_regprocedure(v_bool_new)))>0 THEN
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'Unexpected photo RPC variants: %',v_name;
    END IF;
    IF v_count<>1 THEN RAISE EXCEPTION 'Expected one original photo RPC for %, found %',v_name,v_count; END IF;
    v_old := CASE WHEN to_regprocedure(v_bool_old) IS NOT NULL THEN v_bool_old
      WHEN to_regprocedure(v_base_old) IS NOT NULL THEN v_base_old ELSE v_base_new END;
    v_oid := to_regprocedure(v_old);
    v_has_boolean := v_old=v_bool_old;
    v_new := CASE WHEN v_has_boolean THEN v_bool_new ELSE v_base_new END;
    IF NOT (SELECT prosecdef AND NOT proretset
      AND proargmodes IS NULL AND pronargdefaults=0 AND provariadic=0
      AND proargnames[4]='p_version' FROM pg_proc WHERE oid=v_oid) THEN
      RAISE EXCEPTION 'Unexpected photo RPC contract: %',v_old;
    END IF;
    SELECT pg_get_userbyid(proowner) INTO v_owner FROM pg_proc WHERE oid=v_oid;

    -- Deparse only the catalog-generated declaration. The deployed function
    -- body, language, search_path and execution attributes remain byte-for-byte
    -- unchanged. No BEGIN/DECLARE/case/newline matching inside deployed code.
    IF v_old<>v_new THEN
      v_definition := pg_get_functiondef(v_oid);
      v_header_end := strpos(v_definition,E'\n');
      IF v_header_end=0 THEN RAISE EXCEPTION 'Missing catalog declaration'; END IF;
      SELECT string_agg(format('%I %s',p.proargnames[i],
        CASE WHEN i=4 THEN 'bigint' ELSE format_type(p.proargtypes[i-1],NULL) END),', ' ORDER BY i)
        INTO v_arguments FROM pg_proc p CROSS JOIN LATERAL generate_series(1,p.pronargs) i WHERE p.oid=v_oid;
      EXECUTE format('CREATE OR REPLACE FUNCTION public.%I(%s)%s',v_name,v_arguments,substr(v_definition,v_header_end));
      EXECUTE format('ALTER FUNCTION %s OWNER TO %I',v_new,v_owner);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',v_new);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_new);
      EXECUTE format('DROP FUNCTION %s',v_old);
    END IF;

    IF NOT v_has_boolean THEN
      SELECT string_agg(format('%I %s',p.proargnames[i],format_type(p.proargtypes[i-1],NULL)),', ' ORDER BY i),
        string_agg(format('%I',p.proargnames[i]),', ' ORDER BY i)
        INTO v_arguments,v_calls FROM pg_proc p CROSS JOIN LATERAL generate_series(1,p.pronargs) i
        WHERE p.oid=to_regprocedure(v_base_new);
      SELECT pg_get_function_result(oid),CASE WHEN prorettype='void'::regtype
        THEN format('PERFORM public.%I(%s); RETURN;',v_name,v_calls)
        ELSE format('RETURN public.%I(%s);',v_name,v_calls) END
        INTO v_result,v_return FROM pg_proc WHERE oid=to_regprocedure(v_base_new);
      EXECUTE format($create$
        CREATE FUNCTION public.%I(%s, p_require_entitlement boolean)
        RETURNS %s LANGUAGE plpgsql SECURITY DEFINER
        SET search_path=pg_catalog,public AS $compat$
        BEGIN
          -- FERIA_PHOTO_VERSION_COMPAT_V2
          -- The current server performs entitlement checks before calling false.
          -- An older deployed base has no entitlement switch: true/null deny.
          IF p_require_entitlement IS DISTINCT FROM false THEN
            RAISE EXCEPTION 'paid_entitlement_required';
          END IF;
          %s
        END;
        $compat$
      $create$,v_name,v_arguments,v_result,v_return);
      EXECUTE format('ALTER FUNCTION %s OWNER TO %I',v_bool_new,v_owner);
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',v_bool_new);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_bool_new);
      -- Also harden an already-bigint legacy base (no declaration rewrite).
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',v_base_new);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',v_base_new);
    END IF;
  END LOOP;
END
$migrate$;

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

NOTIFY pgrst, 'reload schema';
COMMIT;
