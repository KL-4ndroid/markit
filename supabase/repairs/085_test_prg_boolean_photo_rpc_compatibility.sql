-- Candidate for test_prg after 083. Use only through a verified test target.
-- This is the 085 authorization change for the older explicit-boolean RPCs.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE OR REPLACE FUNCTION public.product_cover_photo_write_allowed(p_actor uuid, p_owner uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public AS $helper$
DECLARE v_decision jsonb;
BEGIN
  IF p_actor IS NULL OR p_owner IS NULL THEN RETURN false; END IF;
  v_decision := public.check_subscription_write_for_actor(p_actor, p_owner, 'product_photo');
  IF v_decision->'enabled' = 'true'::jsonb THEN
    RETURN COALESCE(v_decision->'allowed' = 'true'::jsonb, false);
  ELSIF v_decision->'enabled' = 'false'::jsonb AND v_decision->'allowed' = 'true'::jsonb THEN
    RETURN EXISTS(SELECT 1 FROM public.account_entitlements ae
      WHERE ae.owner_id = p_owner AND ae.product_cover_photo_enabled = true);
  END IF;
  RETURN false;
END;
$helper$;
REVOKE ALL ON FUNCTION public.product_cover_photo_write_allowed(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.product_cover_photo_write_allowed(uuid,uuid) TO service_role;

DO $patch$
DECLARE
  entry record;
  rpc pg_proc%ROWTYPE;
  definition text;
  old_gate text;
BEGIN
  IF to_regprocedure('public.check_subscription_write_for_actor(uuid,uuid,text)') IS NULL THEN
    RAISE EXCEPTION '085 test compatibility requires 082';
  END IF;

  FOR entry IN SELECT * FROM (VALUES
    ('claim_product_cover_photo_upload',
      'public.claim_product_cover_photo_upload(uuid,uuid,uuid,bigint,integer,bigint,boolean)',
      $old$IF p_require_entitlement AND NOT EXISTS ( SELECT 1 FROM public.account_entitlements ae WHERE ae.owner_id = v_product.owner_id AND ae.product_cover_photo_enabled = true ) THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;$old$,
      $new$IF p_require_entitlement AND NOT public.product_cover_photo_write_allowed(p_actor_id, v_product.owner_id) THEN
    RAISE EXCEPTION 'paid_entitlement_required';
  END IF;$new$),
    ('finalize_product_cover_photo_upload',
      'public.finalize_product_cover_photo_upload(uuid,uuid,uuid,bigint,text,text,text,text,text,text,integer,integer,integer,integer,boolean)',
      $old$IF p_require_entitlement AND NOT EXISTS ( SELECT 1 FROM public.product_cover_photos p JOIN public.account_entitlements ae ON ae.owner_id = p.owner_id WHERE p.product_id = p_product_id AND p.deleted_at IS NULL AND ae.product_cover_photo_enabled = true ) THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;$old$,
      $new$IF p_require_entitlement AND NOT EXISTS (
    SELECT 1 FROM public.product_cover_photos p
    WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
      AND public.product_cover_photo_write_allowed(p_actor_id, p.owner_id)
  ) THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;$new$)
  ) AS expected(name, signature, legacy_gate, replacement) LOOP
    SELECT * INTO rpc FROM pg_proc WHERE oid = to_regprocedure(entry.signature);
    IF NOT FOUND OR rpc.proowner <> 'postgres'::regrole OR NOT rpc.prosecdef
      OR rpc.proretset OR rpc.pronargdefaults <> 0 OR rpc.proargmodes IS NOT NULL
      OR rpc.provariadic <> 0 OR rpc.proargnames[4] IS DISTINCT FROM 'p_version'
      OR rpc.proargnames[rpc.pronargs] IS DISTINCT FROM 'p_require_entitlement'
      OR (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = entry.name) <> 1
      OR has_function_privilege('anon', rpc.oid, 'EXECUTE')
      OR has_function_privilege('authenticated', rpc.oid, 'EXECUTE')
      OR NOT has_function_privilege('service_role', rpc.oid, 'EXECUTE')
      OR EXISTS (SELECT 1 FROM aclexplode(coalesce(rpc.proacl, acldefault('f', rpc.proowner))) acl
        WHERE acl.grantee NOT IN (rpc.proowner, 'service_role'::regrole)) THEN
      RAISE EXCEPTION 'Unreviewed test photo RPC contract: %', entry.signature;
    END IF;

    definition := pg_get_functiondef(rpc.oid);
    IF position(entry.replacement IN definition) > 0 THEN CONTINUE; END IF;
    old_gate := substring(definition FROM $pattern$IF p_require_entitlement AND NOT EXISTS[[:space:]]*\([^;]*;[[:space:]]*END IF;$pattern$);
    IF old_gate IS NULL OR regexp_replace(old_gate, '[[:space:]]+', ' ', 'g') <> entry.legacy_gate
      OR (length(definition) - length(replace(definition, old_gate, ''))) <> length(old_gate) THEN
      RAISE EXCEPTION 'Unreviewed test photo entitlement block: %', entry.signature;
    END IF;
    EXECUTE replace(definition, old_gate, entry.replacement);
  END LOOP;
END;
$patch$;

NOTIFY pgrst, 'reload schema';
COMMIT;
