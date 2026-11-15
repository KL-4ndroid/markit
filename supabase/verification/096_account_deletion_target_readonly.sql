-- READ ONLY: pg_catalog metadata only. No customer rows or runtime changes.
-- Run in the independently verified target project's SQL Editor.
-- The target identity literal is an EXPECTED LABEL, not proof of DB identity.
-- Export all result rows as CSV; 501 rows means the capture may be truncated.
SELECT 'target' AS category,'fgejncfsvvsayiequubm' AS identity,
 jsonb_build_object('observedAt',clock_timestamp(),'database',current_database(),'sessionUser',session_user,
 'projectRefSetting',current_setting('app.settings.project_ref',true),'providerRefSetting',current_setting('supabase.project_ref',true),
 'serverVersion',current_setting('server_version'),'engineInstalled',to_regnamespace('deletion_engine_private') IS NOT NULL,
 'releaseInstalled',to_regnamespace('deletion_release_private') IS NOT NULL) AS detail
UNION ALL
SELECT 'relation',n.nspname||'.'||c.relname,
 jsonb_build_object('kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'options',c.reloptions,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
 'columns',(SELECT jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'nullable',NOT a.attnotnull) ORDER BY a.attnum) FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',x.conname,'definition',pg_get_constraintdef(x.oid,true)) ORDER BY x.conname),'[]') FROM pg_constraint x WHERE x.conrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,true),'enabled',t.tgenabled) ORDER BY t.tgname),'[]') FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,'roles',p.polroles::text,'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]') FROM pg_policy p WHERE p.polrelid=c.oid),
 'grants',(SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',g.grantee,'privilege',g.privilege_type) ORDER BY g.grantee,g.privilege_type),'[]') FROM information_schema.table_privileges g WHERE g.table_schema=n.nspname AND g.table_name=c.relname),
 'viewDefinition',CASE WHEN c.relkind IN('v','m') THEN pg_get_viewdef(c.oid,true) END)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE(n.nspname='public' OR n.nspname LIKE 'billing_%' OR n.nspname LIKE 'deletion_%') AND c.relkind IN('r','p','v','m','f')
UNION ALL
SELECT 'routine',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
 jsonb_build_object('securityDefiner',p.prosecdef,'owner',pg_get_userbyid(p.proowner),'language',l.lanname,'config',p.proconfig,'acl',p.proacl::text,
 'grants',(SELECT jsonb_agg(jsonb_build_object('role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.privilege_type) FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner)))a),
 'definitionMd5',md5(pg_get_functiondef(p.oid)),'normalizedMd5',md5(replace(pg_get_functiondef(p.oid),chr(13),'')))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
WHERE(n.nspname='public' OR n.nspname LIKE 'billing_%' OR n.nspname LIKE 'deletion_%') AND p.prokind IN('f','p')
ORDER BY category,identity LIMIT 501;
