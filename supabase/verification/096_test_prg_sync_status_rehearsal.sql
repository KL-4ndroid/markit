-- Runs inside the guarded test_prg rollback bundle, after the cleanup fixture.
DO $convert$
DECLARE
  view_names constant text[] := ARRAY['owner_accessible_events','owner_accessible_markets',
    'staff_accessible_events','staff_accessible_markets'];
  view_state jsonb;
  view_entry jsonb;
  grant_entry record;
  status_values constant text[] := ARRAY['pending','synced','local_only','error'];
  current_values text[];
  before_status jsonb;
  after_status jsonb;
  relation_name text;
  default_value text;
BEGIN
  IF current_setting('feria.test_prg_sync_status_rehearsal',true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Expected the test_prg sync status rehearsal transaction';
  END IF;

  SELECT array_agg(enumlabel::text ORDER BY enumsortorder) INTO current_values
  FROM pg_enum WHERE enumtypid=to_regtype('public.sync_status');
  IF to_regtype('public.sync_status') IS NULL THEN
    -- Matches the 096 account-deletion catalog fixture.
    CREATE TYPE public.sync_status AS ENUM ('pending','synced','local_only','error');
  ELSIF current_values IS DISTINCT FROM status_values THEN
    RAISE EXCEPTION 'Unexpected public.sync_status enum labels';
  END IF;
  IF EXISTS (SELECT 1 FROM public.events WHERE sync_status IS NOT NULL AND sync_status::text <> ALL(status_values))
    OR EXISTS (SELECT 1 FROM public.markets WHERE sync_status IS NOT NULL AND sync_status::text <> ALL(status_values)) THEN
    RAISE EXCEPTION 'Existing sync status value needs review';
  END IF;

  SELECT jsonb_build_array(
    (SELECT jsonb_agg(jsonb_build_array(id,sync_status::text) ORDER BY id) FROM public.events),
    (SELECT jsonb_agg(jsonb_build_array(id,sync_status::text) ORDER BY id) FROM public.markets)
  ) INTO before_status;

  SELECT jsonb_agg(jsonb_build_object('name',c.relname,'definition',pg_get_viewdef(c.oid,true),
    'options',to_jsonb(c.reloptions),'comment',obj_description(c.oid,'pg_class'),
    'acl',to_jsonb(coalesce(c.relacl,acldefault('r',c.relowner)))) ORDER BY c.relname)
  INTO view_state
  FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relname=ANY(view_names)
    AND c.relkind='v' AND c.relowner='postgres'::regrole;
  IF jsonb_array_length(view_state) IS DISTINCT FROM cardinality(view_names) THEN
    RAISE EXCEPTION 'Unexpected access view ownership or inventory';
  END IF;

  DROP VIEW public.owner_accessible_events, public.owner_accessible_markets,
    public.staff_accessible_events, public.staff_accessible_markets RESTRICT;

  FOREACH relation_name IN ARRAY ARRAY['events','markets'] LOOP
    SELECT pg_get_expr(ad.adbin,ad.adrelid) INTO default_value
    FROM pg_attribute a JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
    WHERE a.attrelid=to_regclass('public.'||relation_name) AND a.attname='sync_status';
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN sync_status DROP DEFAULT, ALTER COLUMN sync_status TYPE public.sync_status USING sync_status::text::public.sync_status', relation_name);
    IF default_value IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN sync_status SET DEFAULT (%s)::text::public.sync_status', relation_name,default_value);
    END IF;
  END LOOP;

  FOR view_entry IN SELECT value FROM jsonb_array_elements(view_state) LOOP
    relation_name := view_entry->>'name';
    IF view_entry->'options' IS DISTINCT FROM '["security_barrier=true"]'::jsonb THEN
      RAISE EXCEPTION 'Unexpected access view options: %',relation_name;
    END IF;
    EXECUTE format('CREATE VIEW public.%I WITH (security_barrier=true) AS %s',relation_name,view_entry->>'definition');
    EXECUTE format('COMMENT ON VIEW public.%I IS %L',relation_name,view_entry->>'comment');
    -- Remove default privileges and restore the captured privileges, including grant options.
    FOR grant_entry IN
      SELECT DISTINCT a.grantee FROM pg_class c
      CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a
      WHERE c.oid=to_regclass('public.'||relation_name) AND a.grantee<>c.relowner
    LOOP
      EXECUTE format('REVOKE ALL ON public.%I FROM %s',relation_name,
        CASE WHEN grant_entry.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(grant_entry.grantee)) END);
    END LOOP;
    FOR grant_entry IN
      SELECT a.* FROM aclexplode(ARRAY(SELECT value::aclitem FROM jsonb_array_elements_text(view_entry->'acl'))) a
      WHERE a.grantee<>'postgres'::regrole
    LOOP
      IF grant_entry.grantor<>'postgres'::regrole THEN
        RAISE EXCEPTION 'Unexpected access view grantor: %',relation_name;
      END IF;
      EXECUTE format('GRANT %s ON public.%I TO %s%s',grant_entry.privilege_type,relation_name,
        CASE WHEN grant_entry.grantee=0 THEN 'PUBLIC' ELSE quote_ident(pg_get_userbyid(grant_entry.grantee)) END,
        CASE WHEN grant_entry.is_grantable THEN ' WITH GRANT OPTION' ELSE '' END);
    END LOOP;
  END LOOP;

  SELECT jsonb_build_array(
    (SELECT jsonb_agg(jsonb_build_array(id,sync_status::text) ORDER BY id) FROM public.events),
    (SELECT jsonb_agg(jsonb_build_array(id,sync_status::text) ORDER BY id) FROM public.markets)
  ) INTO after_status;
  IF before_status IS DISTINCT FROM after_status THEN
    RAISE EXCEPTION 'Conversion changed a sync status value';
  END IF;
END;
$convert$;

-- REHEARSAL FIXTURES BEGIN
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.role = 'authenticated';
DO $access$
DECLARE
  fixture record;
  market_id constant uuid := 'a9610000-0000-4000-8000-000000000004';
  event_id constant uuid := 'a9610000-0000-4000-8000-000000000005';
BEGIN
  FOR fixture IN SELECT * FROM (VALUES
    ('a9610000-0000-4000-8000-000000000001',true,true),
    ('a9610000-0000-4000-8000-000000000002',false,true),
    ('a9610000-0000-4000-8000-000000000003',false,false)
  ) AS cases(actor,owner_visible,staff_visible) LOOP
    PERFORM set_config('request.jwt.claim.sub',fixture.actor,true);
    IF (EXISTS(SELECT 1 FROM public.owner_accessible_markets WHERE id=market_id AND sync_status='synced')) IS DISTINCT FROM fixture.owner_visible
      OR (EXISTS(SELECT 1 FROM public.owner_accessible_events WHERE id=event_id AND sync_status='synced')) IS DISTINCT FROM fixture.owner_visible
      OR (EXISTS(SELECT 1 FROM public.staff_accessible_markets WHERE id=market_id AND sync_status='synced')) IS DISTINCT FROM fixture.staff_visible
      OR (EXISTS(SELECT 1 FROM public.staff_accessible_events WHERE id=event_id AND sync_status='synced')) IS DISTINCT FROM fixture.staff_visible THEN
      RAISE EXCEPTION 'Access view regression after sync status conversion';
    END IF;
  END LOOP;
END;
$access$;
RESET ROLE;
