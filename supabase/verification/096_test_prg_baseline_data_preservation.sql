-- Capture existing rows inside the transaction. Only counts and a pass/fail result leave the database.
CREATE TEMP TABLE test_prg_baseline_rows (
  schema_name text NOT NULL,
  relation_name text NOT NULL,
  column_names text[] NOT NULL,
  row_count bigint NOT NULL,
  fingerprint bytea NOT NULL,
  PRIMARY KEY (schema_name, relation_name)
) ON COMMIT DROP;

CREATE FUNCTION pg_temp.test_prg_row_fingerprint(schema_name text, relation_name text, column_names text[])
RETURNS TABLE (row_count bigint, fingerprint bytea)
LANGUAGE plpgsql SET search_path = pg_catalog AS $fingerprint$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT count(*), sha256(convert_to(coalesce(string_agg(row_hash, '''' ORDER BY row_hash), ''''), ''UTF8''))
      FROM (SELECT encode(sha256(convert_to((SELECT jsonb_object_agg(f.key,f.value)
        FROM jsonb_each(to_jsonb(t)) f WHERE f.key=ANY($1))::text, ''UTF8'')), ''hex'') AS row_hash
        FROM %I.%I t) rows', schema_name, relation_name) USING column_names;
END;
$fingerprint$;

DO $preserve_before$
DECLARE
  relation record;
  retained_columns text[];
BEGIN
  -- Keep the existing records stable while their catalog and projections are aligned.
  FOR relation IN
    SELECT c.oid, n.nspname AS schema_name, c.relname AS relation_name
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND (n.nspname='public' OR (n.nspname='auth' AND c.relname IN ('users','sessions')))
    ORDER BY n.nspname,c.relname
  LOOP
    EXECUTE format('LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',relation.schema_name,relation.relation_name);
    SELECT array_agg(a.attname::text ORDER BY a.attnum) INTO retained_columns FROM pg_attribute a
    WHERE a.attrelid=relation.oid AND a.attnum>0 AND NOT a.attisdropped
      AND NOT (relation.schema_name='public' AND relation.relation_name='products' AND a.attname='sync_status');
    INSERT INTO pg_temp.test_prg_baseline_rows
    SELECT relation.schema_name,relation.relation_name,retained_columns,f.row_count,f.fingerprint
    FROM pg_temp.test_prg_row_fingerprint(relation.schema_name,relation.relation_name,retained_columns) f;
  END LOOP;

  IF NOT EXISTS (SELECT 1 FROM pg_temp.test_prg_baseline_rows WHERE schema_name='auth' AND relation_name='users')
    OR NOT EXISTS (SELECT 1 FROM pg_temp.test_prg_baseline_rows WHERE schema_name='auth' AND relation_name='sessions')
    OR EXISTS (SELECT 1 FROM public.products WHERE sync_status IS DISTINCT FROM 'synced') THEN
    RAISE EXCEPTION 'Unexpected account catalog or legacy product sync state';
  END IF;
END;
$preserve_before$;

-- BASELINE UPDATES RUN HERE

DO $preserve_after$
DECLARE
  original pg_temp.test_prg_baseline_rows%ROWTYPE;
  present_columns text[];
  current_rows record;
BEGIN
  FOR original IN SELECT * FROM pg_temp.test_prg_baseline_rows LOOP
    SELECT array_agg(a.attname::text) INTO present_columns FROM pg_attribute a
    WHERE a.attrelid=to_regclass(format('%I.%I',original.schema_name,original.relation_name))
      AND a.attnum>0 AND NOT a.attisdropped;
    IF (original.column_names <@ present_columns) IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Retained columns changed in %.%',original.schema_name,original.relation_name;
    END IF;
    SELECT * INTO STRICT current_rows FROM pg_temp.test_prg_row_fingerprint(
      original.schema_name,original.relation_name,original.column_names);
    IF current_rows.row_count IS DISTINCT FROM original.row_count
      OR current_rows.fingerprint IS DISTINCT FROM original.fingerprint THEN
      RAISE EXCEPTION 'Existing records changed in %.%',original.schema_name,original.relation_name;
    END IF;
  END LOOP;
END;
$preserve_after$;
