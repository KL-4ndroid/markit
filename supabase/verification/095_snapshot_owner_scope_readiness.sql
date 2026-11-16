-- READ ONLY metadata verification. Does not read snapshots/customer rows or call cleanup.
WITH expected(signature,fingerprint) AS(VALUES
 ('public.get_latest_snapshot(uuid)','0683d4eb751ae5148c72624b63c0e7d8'),
 ('public.cleanup_old_snapshots(uuid)','8acd35d91782110158bba12838f23b35')),
checks AS(SELECT e.signature,
 p.prosecdef AND md5(replace(pg_get_functiondef(p.oid),chr(13),''))=e.fingerprint
 AND p.proconfig @> ARRAY['search_path=""']
 AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
 AND has_function_privilege('authenticated',p.oid,'EXECUTE')
 AND has_function_privilege('service_role',p.oid,'EXECUTE')
 AND NOT EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') AS ready
 FROM expected e LEFT JOIN pg_proc p ON p.oid=to_regprocedure(e.signature))
SELECT '095_snapshot_scope_ready' AS check_name,count(*)=2 AND bool_and(coalesce(ready,false)) AS passed,
 jsonb_agg(jsonb_build_object('function',signature,'passed',coalesce(ready,false)) ORDER BY signature) AS checks
FROM checks;
