-- READ ONLY. Structural metadata only; no customer rows, credentials or runtime changes.
-- Export all result rows as CSV. This is evidence, not automatic cleanup approval.
SELECT 'relation' AS category, n.nspname || '.' || c.relname AS identity,
  jsonb_build_object(
    'kind', c.relkind, 'rls', c.relrowsecurity, 'forceRls', c.relforcerowsecurity,
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
      'nullable', NOT a.attnotnull) ORDER BY a.attnum)
      FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',co.conname,
      'definition',pg_get_constraintdef(co.oid,true)) ORDER BY co.conname),'[]')
      FROM pg_constraint co WHERE co.conrelid=c.oid),
    'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,
      'definition',pg_get_triggerdef(t.oid,true)) ORDER BY t.tgname),'[]')
      FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
    'policies', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,
      'command',p.polcmd,'roles',p.polroles::text,'using',pg_get_expr(p.polqual,p.polrelid),
      'check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]')
      FROM pg_policy p WHERE p.polrelid=c.oid),
    'grants', (SELECT coalesce(jsonb_agg(jsonb_build_object('grantee',g.grantee,'privilege',g.privilege_type)
      ORDER BY g.grantee,g.privilege_type),'[]') FROM information_schema.table_privileges g
      WHERE g.table_schema=n.nspname AND g.table_name=c.relname),
    'viewDefinition', CASE WHEN c.relkind IN ('v','m') THEN pg_get_viewdef(c.oid,true) ELSE NULL END
  ) AS detail
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname='public' OR n.nspname LIKE 'billing_%' OR n.nspname LIKE 'deletion_%')
  AND c.relkind IN ('r','p','v','m','f')
UNION ALL
SELECT 'routine', n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
  jsonb_build_object('securityDefiner',p.prosecdef,'language',l.lanname,'config',p.proconfig,
    'acl',p.proacl::text,'definitionMd5',md5(pg_get_functiondef(p.oid)),
    'definitionBytes',octet_length(pg_get_functiondef(p.oid)))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
WHERE (n.nspname='public' OR n.nspname LIKE 'billing_%' OR n.nspname LIKE 'deletion_%')
  AND p.prokind IN ('f','p')
ORDER BY category,identity;
