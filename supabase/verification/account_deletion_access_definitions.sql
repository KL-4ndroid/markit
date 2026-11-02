-- READ ONLY, structural source only. No account/customer rows or runtime mutation.
SELECT 'routine' AS category,
  n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS identity,
  jsonb_build_object('name',p.proname,'definition',pg_get_functiondef(p.oid),
    'definitionMd5',md5(pg_get_functiondef(p.oid)),'language',l.lanname,
    'securityDefiner',p.prosecdef,'volatility',p.provolatile,'strict',p.proisstrict,
    'returnsSet',p.proretset,'returnType',pg_get_function_result(p.oid),
    'argumentTypes',oidvectortypes(p.proargtypes),'argumentNames',p.proargnames,
    'argumentModes',p.proargmodes,'owner',pg_get_userbyid(p.proowner),
    'config',p.proconfig,'grants',(SELECT jsonb_agg(jsonb_build_object(
      'role',CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END,
      'privilege',a.privilege_type,'grantable',a.is_grantable))
      FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a)) AS detail
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
WHERE n.nspname='public' AND p.prokind IN('f','p')
UNION ALL
SELECT 'relation',n.nspname||'.'||c.relname,jsonb_build_object(
  'owner',pg_get_userbyid(c.relowner),'options',c.reloptions,'kind',c.relkind,
  'viewDefinition',CASE WHEN c.relkind IN('v','m') THEN pg_get_viewdef(c.oid,true) ELSE NULL END,
  'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,
    'permissive',p.polpermissive,'command',p.polcmd,
    'roles',(SELECT jsonb_agg(CASE WHEN role_id=0 THEN 'PUBLIC' ELSE pg_get_userbyid(role_id) END)
      FROM unnest(p.polroles) role_id),
    'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]')
    FROM pg_policy p WHERE p.polrelid=c.oid))
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','f')
ORDER BY category,identity;
