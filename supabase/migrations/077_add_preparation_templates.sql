-- Brand preparation templates. Existing checklist events remain the only checklist read model.
BEGIN;
CREATE TABLE IF NOT EXISTS public.preparation_templates (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  items JSONB NOT NULL CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) BETWEEN 1 AND 50),
  revision INTEGER NOT NULL CHECK (revision > 0),
  mutation_id UUID NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS preparation_templates_owner ON public.preparation_templates(owner_id);
CREATE TABLE IF NOT EXISTS public.preparation_template_applications (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.preparation_templates(id) ON DELETE CASCADE,
  request JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.preparation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preparation_template_applications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.preparation_templates, public.preparation_template_applications FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT ON public.preparation_templates TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.can_manage_preparation_templates(p_owner UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
  SELECT auth.uid() IS NOT NULL AND (auth.uid() = p_owner OR (
    public.has_authoritative_team_entitlement(p_owner) AND EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id=p_owner
        AND sr.staff_id=auth.uid() AND sr.status='active' AND sr.role='manager'
    )
  ));
$$;
DROP POLICY IF EXISTS preparation_templates_manage_read ON public.preparation_templates;
CREATE POLICY preparation_templates_manage_read ON public.preparation_templates FOR SELECT TO authenticated
  USING(public.can_manage_preparation_templates(owner_id));

CREATE OR REPLACE FUNCTION public.save_preparation_template(
  p_id UUID, p_owner_id UUID, p_name TEXT, p_items JSONB,
  p_expected_revision INTEGER, p_mutation_id UUID, p_archived BOOLEAN DEFAULT FALSE
) RETURNS public.preparation_templates
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_row public.preparation_templates%ROWTYPE; v_item JSONB; v_keys TEXT[] := '{}'; v_ids TEXT[] := '{}'; v_key TEXT;
BEGIN
  IF p_id IS NULL OR p_owner_id IS NULL OR p_mutation_id IS NULL OR p_expected_revision IS NULL
    OR p_expected_revision<0 OR p_archived IS NULL OR NOT public.can_manage_preparation_templates(p_owner_id) THEN
    RAISE EXCEPTION 'TEMPLATE_SCOPE' USING ERRCODE='42501';
  END IF;
  -- Serialize creation and updates including two clients creating the same id.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::TEXT,77));
  SELECT * INTO v_row FROM public.preparation_templates WHERE id=p_id FOR UPDATE;
  IF FOUND THEN
    IF v_row.owner_id<>p_owner_id THEN RAISE EXCEPTION 'TEMPLATE_SCOPE' USING ERRCODE='42501'; END IF;
    IF v_row.mutation_id=p_mutation_id AND v_row.name=p_name AND v_row.items=p_items AND v_row.archived=p_archived THEN RETURN v_row; END IF;
    IF v_row.revision<>p_expected_revision OR v_row.mutation_id=p_mutation_id THEN RAISE EXCEPTION 'TEMPLATE_CONFLICT'; END IF;
  ELSIF p_expected_revision<>0 OR p_archived THEN RAISE EXCEPTION 'TEMPLATE_CONFLICT'; END IF;
  IF p_name IS NULL OR char_length(btrim(p_name)) NOT BETWEEN 1 AND 60 OR p_name !~ '[^[:space:]]'
    OR p_items IS NULL OR jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'TEMPLATE_INPUT' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'TEMPLATE_INPUT' USING ERRCODE='22023'; END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_key := btrim(regexp_replace(v_item->>'text',E'[ \\t\\r\\n]+',' ','g'));
    IF jsonb_typeof(v_item)<>'object' OR jsonb_typeof(v_item->'id') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_item->'text') IS DISTINCT FROM 'string'
      OR COALESCE(v_item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR COALESCE(v_key,'')='' OR char_length(v_item->>'text')>200 OR (v_item->>'text') ~ E'[\\r\\n]'
      OR v_key=ANY(v_keys) OR lower(v_item->>'id')=ANY(v_ids) THEN RAISE EXCEPTION 'TEMPLATE_INPUT' USING ERRCODE='22023'; END IF;
    v_keys:=array_append(v_keys,v_key); v_ids:=array_append(v_ids,lower(v_item->>'id'));
  END LOOP;
  IF v_row.id IS NULL THEN
    INSERT INTO public.preparation_templates(id,owner_id,name,items,revision,mutation_id,archived)
      VALUES(p_id,p_owner_id,btrim(p_name),p_items,1,p_mutation_id,FALSE) RETURNING * INTO v_row;
  ELSE
    UPDATE public.preparation_templates SET name=btrim(p_name),items=p_items,revision=revision+1,
      mutation_id=p_mutation_id,archived=p_archived,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_preparation_template(
  p_application_id UUID, p_market_id UUID, p_template_id UUID, p_revision INTEGER, p_item_ids UUID[]
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_market public.markets%ROWTYPE; v_template public.preparation_templates%ROWTYPE;
  v_receipt public.preparation_template_applications%ROWTYPE; v_request JSONB; v_result JSONB;
  v_item JSONB; v_event public.events%ROWTYPE; v_events JSONB:='[]'; v_count INTEGER:=0; v_skip INTEGER:=0;
  v_key TEXT; v_item_id UUID; v_existing TEXT[];
BEGIN
  IF p_application_id IS NULL OR p_market_id IS NULL OR p_template_id IS NULL OR p_revision IS NULL
    OR p_item_ids IS NULL OR cardinality(p_item_ids) NOT BETWEEN 1 AND 50 OR array_position(p_item_ids,NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'TEMPLATE_INPUT' USING ERRCODE='22023';
  END IF;
  -- All apply calls for one market are serialized; the whole event batch and receipt commit together.
  SELECT * INTO v_market FROM public.markets WHERE id=p_market_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_market.is_deleted,FALSE) OR NOT public.can_manage_preparation_templates(v_market.owner_id) THEN
    RAISE EXCEPTION 'TEMPLATE_SCOPE' USING ERRCODE='42501'; END IF;
  v_request:=jsonb_build_object('marketId',p_market_id,'templateId',p_template_id,'revision',p_revision,'itemIds',to_jsonb(p_item_ids));
  SELECT * INTO v_receipt FROM public.preparation_template_applications WHERE id=p_application_id;
  IF FOUND THEN
    IF v_receipt.actor_id<>auth.uid() OR v_receipt.request<>v_request THEN RAISE EXCEPTION 'TEMPLATE_CONFLICT'; END IF;
    RETURN v_receipt.result;
  END IF;
  SELECT * INTO v_template FROM public.preparation_templates WHERE id=p_template_id FOR SHARE;
  IF NOT FOUND OR v_template.owner_id<>v_market.owner_id OR v_template.archived OR v_template.revision<>p_revision THEN
    RAISE EXCEPTION 'TEMPLATE_CONFLICT'; END IF;
  IF cardinality(p_item_ids)<>(SELECT count(DISTINCT x) FROM unnest(p_item_ids) x)
    OR EXISTS(SELECT 1 FROM unnest(p_item_ids) x WHERE NOT EXISTS(
      SELECT 1 FROM jsonb_array_elements(v_template.items) i WHERE (i->>'id')::UUID=x
    )) THEN RAISE EXCEPTION 'TEMPLATE_INPUT' USING ERRCODE='22023'; END IF;
  -- Reconstruct active item text without changing completed flags, edits or deletions.
  WITH checklist AS (
    SELECT * FROM public.events e WHERE e.market_id=p_market_id
      AND e.type IN ('checklist_item_created','checklist_item_updated','checklist_item_deleted')
      AND e.payload->>'itemId' IS NOT NULL
  ), last_kind AS (
    SELECT DISTINCT ON(payload->>'itemId') payload->>'itemId' AS item_id,type FROM checklist ORDER BY payload->>'itemId',timestamp DESC,id DESC
  ), last_text AS (
    SELECT DISTINCT ON(payload->>'itemId') payload->>'itemId' AS item_id,payload->>'text' AS text FROM checklist
      WHERE jsonb_typeof(payload->'text')='string' ORDER BY payload->>'itemId',timestamp DESC,id DESC
  ) SELECT COALESCE(array_agg(btrim(regexp_replace(t.text,E'[ \\t\\r\\n]+',' ','g'))),'{}') INTO v_existing
    FROM last_kind k JOIN last_text t ON t.item_id=k.item_id WHERE k.type<>'checklist_item_deleted';
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_template.items) WHERE (value->>'id')::UUID=ANY(p_item_ids) LOOP
    v_key:=btrim(regexp_replace(v_item->>'text',E'[ \\t\\r\\n]+',' ','g'));
    IF v_key=ANY(v_existing) THEN v_skip:=v_skip+1; CONTINUE; END IF;
    v_item_id:=gen_random_uuid();
    INSERT INTO public.events(id,type,payload,actor_id,market_id,timestamp,metadata) VALUES(
      gen_random_uuid(),'checklist_item_created',jsonb_build_object('market_id',p_market_id,'itemId',v_item_id,'text',v_item->>'text','completed',FALSE),
      auth.uid(),p_market_id,clock_timestamp(),jsonb_build_object('source','preparation_template','templateId',p_template_id,'templateRevision',p_revision,'applicationId',p_application_id)
    ) RETURNING * INTO v_event;
    v_events:=v_events||jsonb_build_array(to_jsonb(v_event)); v_count:=v_count+1;
    v_existing:=array_append(v_existing,v_key);
  END LOOP;
  v_result:=jsonb_build_object('appliedCount',v_count,'skippedCount',v_skip,'events',v_events);
  INSERT INTO public.preparation_template_applications(id,owner_id,market_id,actor_id,template_id,request,result)
    VALUES(p_application_id,v_market.owner_id,p_market_id,auth.uid(),p_template_id,v_request,v_result);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.can_manage_preparation_templates(UUID) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.save_preparation_template(UUID,UUID,TEXT,JSONB,INTEGER,UUID,BOOLEAN) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.apply_preparation_template(UUID,UUID,UUID,INTEGER,UUID[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_preparation_templates(UUID),
  public.save_preparation_template(UUID,UUID,TEXT,JSONB,INTEGER,UUID,BOOLEAN),
  public.apply_preparation_template(UUID,UUID,UUID,INTEGER,UUID[]) TO authenticated;
DO $$ BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.preparation_templates'::regclass)
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.preparation_template_applications'::regclass)
    OR has_table_privilege('authenticated','public.preparation_templates','INSERT,UPDATE,DELETE')
    OR has_table_privilege('authenticated','public.preparation_template_applications','SELECT,INSERT,UPDATE,DELETE')
    OR has_table_privilege('anon','public.preparation_templates','SELECT')
    OR has_function_privilege('anon','public.can_manage_preparation_templates(UUID)','EXECUTE')
    OR has_function_privilege('anon','public.save_preparation_template(UUID,UUID,TEXT,JSONB,INTEGER,UUID,BOOLEAN)','EXECUTE')
    OR has_function_privilege('anon','public.apply_preparation_template(UUID,UUID,UUID,INTEGER,UUID[])','EXECUTE') THEN
    RAISE EXCEPTION 'Template grants or RLS unsafe';
  END IF;
  IF NOT has_table_privilege('authenticated','public.preparation_templates','SELECT')
    OR NOT has_function_privilege('authenticated','public.save_preparation_template(UUID,UUID,TEXT,JSONB,INTEGER,UUID,BOOLEAN)','EXECUTE')
    OR NOT has_function_privilege('authenticated','public.apply_preparation_template(UUID,UUID,UUID,INTEGER,UUID[])','EXECUTE')
    OR NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='preparation_templates' AND policyname='preparation_templates_manage_read') THEN
    RAISE EXCEPTION 'Template reader/writer grants or policy missing';
  END IF;
END $$;
COMMIT;
