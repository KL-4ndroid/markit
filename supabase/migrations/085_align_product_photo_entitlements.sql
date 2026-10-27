-- Align deployed legacy photo checks with the existing 082 pilot contract.
-- No owner enrollment, legacy entitlement writes, object moves or quota changes.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='60s';

CREATE OR REPLACE FUNCTION public.product_cover_photo_write_allowed(p_actor uuid,p_owner uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public AS $helper$
DECLARE v_decision jsonb;
BEGIN
  -- FERIA_PRODUCT_PHOTO_AUTH_V1
  IF p_actor IS NULL OR p_owner IS NULL THEN RETURN false; END IF;
  v_decision := public.check_subscription_write_for_actor(p_actor,p_owner,'product_photo');
  IF v_decision->'enabled'='true'::jsonb THEN
    RETURN COALESCE(v_decision->'allowed'='true'::jsonb,false);
  ELSIF v_decision->'enabled'='false'::jsonb AND v_decision->'allowed'='true'::jsonb THEN
    -- Preserve the old product-photo rollout for owners outside the 082 pilot.
    RETURN EXISTS(SELECT 1 FROM public.account_entitlements ae
      WHERE ae.owner_id=p_owner AND ae.product_cover_photo_enabled=true);
  END IF;
  RETURN false;
END;
$helper$;
REVOKE ALL ON FUNCTION public.product_cover_photo_write_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.product_cover_photo_write_allowed(uuid,uuid) TO service_role;

DO $patch$
DECLARE v_signature text; v_expected text; v_definition text; v_gate text; v_replacement text;
BEGIN
  FOR v_signature,v_expected IN SELECT * FROM (VALUES
    ('public.claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint)',$expected$IF NOT EXISTS ( SELECT 1 FROM public.account_entitlements ae WHERE ae.owner_id = v_product.owner_id AND ae.product_cover_photo_enabled = true ) THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;$expected$),
    ('public.finalize_product_cover_photo_upload(uuid,uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,integer,integer)',$expected$IF NOT EXISTS ( SELECT 1 FROM public.product_cover_photos p JOIN public.account_entitlements ae ON ae.owner_id = p.owner_id WHERE p.product_id = p_product_id AND p.deleted_at IS NULL AND ae.product_cover_photo_enabled = true ) THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;$expected$)
  ) AS reviewed(signature,expected_gate) LOOP
    IF to_regprocedure(v_signature) IS NULL THEN RAISE EXCEPTION '083 base RPC missing: %',v_signature; END IF;
    v_definition := pg_get_functiondef(to_regprocedure(v_signature));
    IF position('FERIA_PRODUCT_PHOTO_AUTH_V1' IN v_definition)>0 THEN CONTINUE; END IF;
    v_gate := substring(v_definition FROM $pattern$IF[[:space:]]+?NOT[[:space:]]+?EXISTS[[:space:]]*?\([\s\S]*?END[[:space:]]+?IF;$pattern$);
    IF v_gate IS NULL OR regexp_replace(v_gate,'[[:space:]]+',' ','g')<>v_expected THEN
      RAISE EXCEPTION 'Unreviewed photo entitlement block: %',v_signature;
    END IF;
    IF position('claim_product_cover_photo_upload' IN v_signature)>0 THEN
      v_replacement := $claim$-- FERIA_PRODUCT_PHOTO_AUTH_V1
  IF NOT public.product_cover_photo_write_allowed(p_actor_id,v_product.owner_id) THEN
    RAISE EXCEPTION 'paid_entitlement_required';
  END IF;$claim$;
    ELSE
      v_replacement := $finalize$-- FERIA_PRODUCT_PHOTO_AUTH_V1
  IF NOT EXISTS(SELECT 1 FROM public.product_cover_photos p
    WHERE p.product_id=p_product_id AND p.deleted_at IS NULL
      AND public.product_cover_photo_write_allowed(p_actor_id,p.owner_id)) THEN
    RAISE EXCEPTION 'paid_entitlement_required';
  END IF;$finalize$;
    END IF;
    EXECUTE replace(v_definition,v_gate,v_replacement);
  END LOOP;
END;
$patch$;

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

NOTIFY pgrst,'reload schema';
COMMIT;
