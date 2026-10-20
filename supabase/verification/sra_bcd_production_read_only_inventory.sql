-- SRA-B/C/D bounded Production inventory.
-- Metadata only: no business rows, Auth users, secrets, raw project reference, or writes.

BEGIN;
SET TRANSACTION READ ONLY;
SET LOCAL statement_timeout = '15s';
SET LOCAL lock_timeout = '3s';

WITH target_policies AS (
  SELECT
    policy.oid,
    namespace_name.nspname AS schema_name,
    table_name.relname AS table_name,
    policy.polname AS policy_name,
    policy.polpermissive,
    policy.polcmd,
    policy.polroles,
    pg_get_expr(policy.polqual, policy.polrelid, true) AS using_expression,
    pg_get_expr(policy.polwithcheck, policy.polrelid, true) AS check_expression
  FROM pg_catalog.pg_policy policy
  JOIN pg_catalog.pg_class table_name ON table_name.oid = policy.polrelid
  JOIN pg_catalog.pg_namespace namespace_name
    ON namespace_name.oid = table_name.relnamespace
  WHERE namespace_name.nspname = 'public'
    AND table_name.relname IN ('markets', 'products')
    AND policy.polcmd = 'a'
),
target_views AS (
  SELECT
    view_class.oid,
    namespace_name.nspname AS schema_name,
    view_class.relname AS view_name,
    owner_role.rolname AS owner_name,
    view_class.reloptions,
    view_class.relacl,
    view_class.relowner,
    pg_get_viewdef(view_class.oid, true) AS definition
  FROM pg_catalog.pg_class view_class
  JOIN pg_catalog.pg_namespace namespace_name
    ON namespace_name.oid = view_class.relnamespace
  JOIN pg_catalog.pg_roles owner_role ON owner_role.oid = view_class.relowner
  WHERE namespace_name.nspname = 'public'
    AND view_class.relkind = 'v'
    AND view_class.relname IN (
      'staff_accessible_events',
      'staff_accessible_markets',
      'staff_accessible_products'
    )
),
policy_rows AS (
  SELECT
    'sra_b_insert_policy'::text AS section,
    format('%I.%I:%s', schema_name, table_name, policy_name) AS object_key,
    jsonb_build_object(
      'schema', schema_name,
      'table', table_name,
      'policy', policy_name,
      'permissive', polpermissive,
      'command', polcmd,
      'roles', COALESCE(
        (
          SELECT jsonb_agg(COALESCE(role_name.rolname, 'PUBLIC') ORDER BY policy_role.role_oid)
          FROM unnest(polroles) AS policy_role(role_oid)
          LEFT JOIN pg_catalog.pg_roles role_name ON role_name.oid = policy_role.role_oid
        ),
        '[]'::jsonb
      ),
      'usingExpression', using_expression,
      'checkExpression', check_expression,
      'usingMd5', md5(COALESCE(using_expression, '')),
      'checkMd5', md5(COALESCE(check_expression, ''))
    ) AS payload
  FROM target_policies
),
view_rows AS (
  SELECT
    'sra_c_staff_view'::text AS section,
    format('%I.%I', schema_name, view_name) AS object_key,
    jsonb_build_object(
      'schema', schema_name,
      'name', view_name,
      'owner', owner_name,
      'securityInvoker', COALESCE('security_invoker=true' = ANY(reloptions), false),
      'definitionMd5', md5(definition),
      'columnSignature', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'position', attribute.attnum,
            'name', attribute.attname,
            'type', pg_catalog.format_type(attribute.atttypid, attribute.atttypmod)
          )
          ORDER BY attribute.attnum
        )
        FROM pg_catalog.pg_attribute attribute
        WHERE attribute.attrelid = target_views.oid
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
      ),
      'selectAcl', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'grantee', COALESCE(grantee_role.rolname, 'PUBLIC'),
            'grantable', expanded_acl.is_grantable
          )
          ORDER BY COALESCE(grantee_role.rolname, 'PUBLIC')
        )
        FROM aclexplode(COALESCE(relacl, acldefault('r', relowner))) expanded_acl
        LEFT JOIN pg_catalog.pg_roles grantee_role ON grantee_role.oid = expanded_acl.grantee
        WHERE expanded_acl.privilege_type = 'SELECT'
      )
    ) AS payload
  FROM target_views
),
view_dependency_rows AS (
  SELECT
    'sra_c_view_dependency'::text AS section,
    format('%I.%I:%I.%I', view_schema, view_name, table_schema, table_name) AS object_key,
    jsonb_build_object(
      'viewSchema', view_schema,
      'view', view_name,
      'referencedSchema', table_schema,
      'referencedTable', table_name
    ) AS payload
  FROM information_schema.view_table_usage
  WHERE view_schema = 'public'
    AND view_name IN (
      'staff_accessible_events',
      'staff_accessible_markets',
      'staff_accessible_products'
    )
),
environment_row AS (
  SELECT
    'environment'::text AS section,
    'production-sra-bcd-inventory'::text AS object_key,
    jsonb_build_object(
      'serverVersionNum', current_setting('server_version_num'),
      'transactionReadOnly', current_setting('transaction_read_only'),
      'migrationLedgerPresent',
        to_regclass('supabase_migrations.schema_migrations') IS NOT NULL,
      'insertPolicyCount', (SELECT count(*) FROM target_policies),
      'staffViewCount', (SELECT count(*) FROM target_views)
    ) AS payload
)
SELECT section, object_key, payload FROM environment_row
UNION ALL
SELECT section, object_key, payload FROM policy_rows
UNION ALL
SELECT section, object_key, payload FROM view_rows
UNION ALL
SELECT section, object_key, payload FROM view_dependency_rows
ORDER BY section, object_key;

ROLLBACK;
