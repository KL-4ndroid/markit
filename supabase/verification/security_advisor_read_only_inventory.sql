-- SRA-000 read-only inventory. Run only against the explicitly selected target.
-- Raw definitions and ACL output are restricted evidence and must not be committed.

begin;
set transaction read only;

with
target_views as (
  select
    c.oid,
    n.nspname as schema_name,
    c.relname as object_name,
    owner_role.rolname as owner_name,
    c.reloptions,
    c.relacl,
    c.relowner,
    pg_get_viewdef(c.oid, true) as definition
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  join pg_catalog.pg_roles owner_role on owner_role.oid = c.relowner
  where n.nspname = 'public'
    and c.relkind in ('v', 'm')
    and c.relname in (
      'staff_accessible_events',
      'staff_accessible_markets',
      'staff_accessible_products'
    )
),
public_functions as (
  select
    p.oid,
    n.nspname as schema_name,
    p.proname as object_name,
    pg_get_function_identity_arguments(p.oid) as identity_arguments,
    owner_role.rolname as owner_name,
    language_name.lanname as language_name,
    p.prosecdef,
    p.proconfig,
    p.proacl,
    p.proowner,
    pg_get_functiondef(p.oid) as definition
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  join pg_catalog.pg_roles owner_role on owner_role.oid = p.proowner
  join pg_catalog.pg_language language_name on language_name.oid = p.prolang
  where n.nspname = 'public'
    and p.prokind in ('f', 'p')
),
public_policies as (
  select
    policy.oid,
    namespace_name.nspname as schema_name,
    table_name.relname as table_name,
    policy.polname as policy_name,
    policy.polpermissive,
    policy.polcmd,
    policy.polroles,
    pg_get_expr(policy.polqual, policy.polrelid, true) as using_expression,
    pg_get_expr(policy.polwithcheck, policy.polrelid, true) as check_expression
  from pg_catalog.pg_policy policy
  join pg_catalog.pg_class table_name on table_name.oid = policy.polrelid
  join pg_catalog.pg_namespace namespace_name on namespace_name.oid = table_name.relnamespace
  where namespace_name.nspname = 'public'
),
view_rows as (
  select
    'staff_view'::text as section,
    format('%I.%I', schema_name, object_name) as object_key,
    jsonb_build_object(
      'schema', schema_name,
      'name', object_name,
      'owner', owner_name,
      'reloptions', to_jsonb(reloptions),
      'securityInvoker', coalesce('security_invoker=true' = any(reloptions), false),
      'definition', definition,
      'definitionMd5', md5(definition)
    ) as payload
  from target_views
),
view_acl_rows as (
  select
    'view_select_acl'::text as section,
    format(
      '%I.%I:%s',
      view_row.schema_name,
      view_row.object_name,
      coalesce(grantee_role.rolname, 'PUBLIC')
    ) as object_key,
    jsonb_build_object(
      'schema', view_row.schema_name,
      'name', view_row.object_name,
      'grantor', grantor_role.rolname,
      'grantee', coalesce(grantee_role.rolname, 'PUBLIC'),
      'privilege', expanded_acl.privilege_type,
      'grantable', expanded_acl.is_grantable
    ) as payload
  from target_views view_row
  cross join lateral aclexplode(
    coalesce(view_row.relacl, acldefault('r', view_row.relowner))
  ) expanded_acl
  left join pg_catalog.pg_roles grantor_role on grantor_role.oid = expanded_acl.grantor
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = expanded_acl.grantee
  where expanded_acl.privilege_type = 'SELECT'
),
function_rows as (
  select
    'public_function'::text as section,
    format('%I.%I(%s)', schema_name, object_name, identity_arguments) as object_key,
    jsonb_build_object(
      'schema', schema_name,
      'name', object_name,
      'identityArguments', identity_arguments,
      'owner', owner_name,
      'language', language_name,
      'securityDefiner', prosecdef,
      'configuration', to_jsonb(proconfig),
      'searchPathSetting', coalesce(
        (
          select setting
          from unnest(coalesce(proconfig, array[]::text[])) setting
          where setting like 'search_path=%'
          limit 1
        ),
        'missing'
      ),
      'definition', definition,
      'definitionMd5', md5(definition)
    ) as payload
  from public_functions
),
policy_rows as (
  select
    'rls_policy'::text as section,
    format('%I.%I:%s', schema_name, table_name, policy_name) as object_key,
    jsonb_build_object(
      'schema', schema_name,
      'table', table_name,
      'policy', policy_name,
      'permissive', polpermissive,
      'command', polcmd,
      'roles', coalesce(
        (
          select jsonb_agg(
            coalesce(role_name.rolname, 'PUBLIC')
            order by policy_role.role_oid
          )
          from unnest(polroles) as policy_role(role_oid)
          left join pg_catalog.pg_roles role_name
            on role_name.oid = policy_role.role_oid
        ),
        '[]'::jsonb
      ),
      'usingExpression', using_expression,
      'checkExpression', check_expression,
      'usingMd5', md5(coalesce(using_expression, '')),
      'checkMd5', md5(coalesce(check_expression, ''))
    ) as payload
  from public_policies
),
function_acl_rows as (
  select
    'function_execute_acl'::text as section,
    format(
      '%I.%I(%s):%s',
      function_row.schema_name,
      function_row.object_name,
      function_row.identity_arguments,
      coalesce(grantee_role.rolname, 'PUBLIC')
    ) as object_key,
    jsonb_build_object(
      'schema', function_row.schema_name,
      'name', function_row.object_name,
      'identityArguments', function_row.identity_arguments,
      'securityDefiner', function_row.prosecdef,
      'grantor', grantor_role.rolname,
      'grantee', coalesce(grantee_role.rolname, 'PUBLIC'),
      'privilege', expanded_acl.privilege_type,
      'grantable', expanded_acl.is_grantable
    ) as payload
  from public_functions function_row
  cross join lateral aclexplode(
    coalesce(function_row.proacl, acldefault('f', function_row.proowner))
  ) expanded_acl
  left join pg_catalog.pg_roles grantor_role on grantor_role.oid = expanded_acl.grantor
  left join pg_catalog.pg_roles grantee_role on grantee_role.oid = expanded_acl.grantee
  where expanded_acl.privilege_type = 'EXECUTE'
),
trigger_rows as (
  select
    'function_trigger'::text as section,
    format(
      '%I.%I:%I',
      table_namespace.nspname,
      table_name.relname,
      trigger_row.tgname
    ) as object_key,
    jsonb_build_object(
      'tableSchema', table_namespace.nspname,
      'table', table_name.relname,
      'trigger', trigger_row.tgname,
      'functionSchema', function_row.schema_name,
      'functionName', function_row.object_name,
      'identityArguments', function_row.identity_arguments,
      'triggerDefinition', pg_get_triggerdef(trigger_row.oid, true),
      'triggerDefinitionMd5', md5(pg_get_triggerdef(trigger_row.oid, true))
    ) as payload
  from public_functions function_row
  join pg_catalog.pg_trigger trigger_row
    on trigger_row.tgfoid = function_row.oid
   and not trigger_row.tgisinternal
  join pg_catalog.pg_class table_name on table_name.oid = trigger_row.tgrelid
  join pg_catalog.pg_namespace table_namespace on table_namespace.oid = table_name.relnamespace
),
dependency_rows as (
  select
    'function_dependency'::text as section,
    format(
      '%I.%I(%s):%s',
      function_row.schema_name,
      function_row.object_name,
      function_row.identity_arguments,
      dependency.deptype
    ) as object_key,
    jsonb_build_object(
      'functionSchema', function_row.schema_name,
      'functionName', function_row.object_name,
      'identityArguments', function_row.identity_arguments,
      'dependencyType', dependency.deptype,
      'dependentObject', pg_describe_object(
        dependency.classid,
        dependency.objid,
        dependency.objsubid
      )
    ) as payload
  from public_functions function_row
  join pg_catalog.pg_depend dependency
    on dependency.refclassid = 'pg_catalog.pg_proc'::regclass
   and dependency.refobjid = function_row.oid
),
summary_row as (
  select
    'inventory_summary'::text as section,
    'public-security-inventory'::text as object_key,
    jsonb_build_object(
      'targetStaffViewCount', (select count(*) from target_views),
      'publicFunctionCount', (select count(*) from public_functions),
      'securityDefinerFunctionCount', (
        select count(*) from public_functions where prosecdef
      ),
      'missingFunctionSearchPathCount', (
        select count(*)
        from public_functions
        where not exists (
          select 1
          from unnest(coalesce(proconfig, array[]::text[])) setting
          where setting like 'search_path=%'
        )
      ),
      'publicPolicyCount', (select count(*) from public_policies),
      'viewSelectAclCount', (select count(*) from view_acl_rows),
      'executeAclCount', (select count(*) from function_acl_rows),
      'triggerCount', (select count(*) from trigger_rows),
      'dependencyCount', (select count(*) from dependency_rows)
    ) as payload
)
select section, object_key, payload from summary_row
union all
select section, object_key, payload from view_rows
union all
select section, object_key, payload from view_acl_rows
union all
select section, object_key, payload from function_rows
union all
select section, object_key, payload from policy_rows
union all
select section, object_key, payload from function_acl_rows
union all
select section, object_key, payload from trigger_rows
union all
select section, object_key, payload from dependency_rows
order by section, object_key;

rollback;
