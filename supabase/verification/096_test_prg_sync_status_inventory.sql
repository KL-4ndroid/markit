-- Run in the test_prg SQL Editor. Returns aggregates and catalog metadata only.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '15s';

WITH RECURSIVE status_columns AS (
  SELECT c.oid AS relation_id, a.attnum AS column_number, c.relname AS relation_name,
    format_type(a.atttypid, a.atttypmod) AS data_type, NOT a.attnotnull AS nullable,
    pg_get_expr(ad.adbin, ad.adrelid) AS default_expression
  FROM pg_class c
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'sync_status' AND NOT a.attisdropped
  LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
  WHERE c.oid IN ('public.events'::regclass, 'public.markets'::regclass, 'public.products'::regclass)
), status_counts AS (
  SELECT 'events' AS relation_name, sync_status::text AS status, count(*) FROM public.events GROUP BY 2
  UNION ALL SELECT 'markets', sync_status::text, count(*) FROM public.markets GROUP BY 2
  UNION ALL SELECT 'products', sync_status::text, count(*) FROM public.products GROUP BY 2
), view_dependencies AS (
  SELECT s.relation_name AS source, r.ev_class AS view_id
  FROM status_columns s
  JOIN pg_depend d ON d.refclassid = 'pg_class'::regclass AND d.classid = 'pg_rewrite'::regclass
    AND d.refobjid = s.relation_id AND d.refobjsubid IN (0, s.column_number)
  JOIN pg_rewrite r ON r.oid = d.objid AND r.ev_class <> s.relation_id
  UNION
  SELECT v.source, r.ev_class
  FROM view_dependencies v
  JOIN pg_depend d ON d.refclassid = 'pg_class'::regclass AND d.classid = 'pg_rewrite'::regclass
    AND d.refobjid = v.view_id
  JOIN pg_rewrite r ON r.oid = d.objid AND r.ev_class <> v.view_id
), other_dependencies AS (
  SELECT DISTINCT s.relation_name AS source, pg_describe_object(d.classid, d.objid, d.objsubid) AS dependent
  FROM status_columns s
  JOIN pg_depend d ON d.refclassid = 'pg_class'::regclass AND d.refobjid = s.relation_id
    AND d.refobjsubid = s.column_number AND d.classid <> 'pg_rewrite'::regclass
)
SELECT jsonb_build_object(
  'columns', (SELECT jsonb_agg(to_jsonb(s) - ARRAY['relation_id','column_number'] ORDER BY relation_name) FROM status_columns s),
  'values', (SELECT jsonb_agg(jsonb_build_object('table',relation_name,'status',
    CASE WHEN status IS NULL OR status IN ('local_only','pending','synced','conflict','error') THEN status ELSE '<unrecognized>' END,
    'count',count) ORDER BY relation_name,status) FROM status_counts),
  'existing_enum', (SELECT jsonb_agg(e.enumlabel ORDER BY e.enumsortorder)
    FROM pg_enum e WHERE e.enumtypid = to_regtype('public.sync_status')),
  'views', (SELECT coalesce(jsonb_agg(jsonb_build_object('source',source,'view',view_id::regclass::text)
    ORDER BY source,view_id::regclass::text),'[]') FROM view_dependencies),
  'other_dependencies', (SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY source,dependent),'[]') FROM other_dependencies d)
) AS sync_status_inventory;

ROLLBACK;
