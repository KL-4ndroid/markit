-- Run in test_prg (tzhbirwchhqabkxhqjdl) before the staged upgrade.
-- Catalog metadata only. Returns fingerprints, signatures and privilege flags.
SELECT p.proname AS rpc,
  oidvectortypes(p.proargtypes) AS argument_types,
  pg_get_userbyid(p.proowner) AS owner,
  p.prosecdef AS security_definer,
  p.pronargdefaults AS default_count,
  p.proargnames[4] AS version_argument,
  p.proargnames[p.pronargs] AS last_argument,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_execute,
  NOT EXISTS (
    SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    WHERE acl.grantee NOT IN (p.proowner, 'service_role'::regrole)
  ) AS expected_acl,
  md5(replace(pg_get_functiondef(p.oid), chr(13), '')) AS definition_fingerprint,
  md5(regexp_replace(substring(pg_get_functiondef(p.oid) FROM
    $gate$IF p_require_entitlement AND NOT EXISTS[[:space:]]*\([^;]*;[[:space:]]*END IF;$gate$),
    '[[:space:]]+', ' ', 'g')) AS legacy_gate_fingerprint
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind = 'f'
  AND p.proname IN ('claim_product_cover_photo_upload', 'finalize_product_cover_photo_upload')
ORDER BY p.proname, argument_types;
