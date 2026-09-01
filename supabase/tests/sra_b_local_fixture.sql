\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated')
    OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Supabase authenticated role/auth.uid() baseline missing';
  END IF;
END
$$;

CREATE TABLE public.markets (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL
);

CREATE TABLE public.events (
  id uuid PRIMARY KEY,
  type text NOT NULL,
  actor_id uuid NOT NULL,
  entity_id uuid NOT NULL
);

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.markets, public.products TO authenticated;
GRANT INSERT ON public.events TO authenticated;

CREATE POLICY "authenticated can insert own fixture events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());

CREATE FUNCTION public.project_sra_b_fixture_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.type = 'market_created' THEN
    INSERT INTO public.markets (id, owner_id) VALUES (NEW.entity_id, NEW.actor_id);
  ELSIF NEW.type = 'product_created' THEN
    INSERT INTO public.products (id, owner_id) VALUES (NEW.entity_id, NEW.actor_id);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.project_sra_b_fixture_event() FROM PUBLIC, authenticated;

CREATE TRIGGER project_sra_b_fixture_event_trigger
AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.project_sra_b_fixture_event();

CREATE POLICY "authenticated_can_insert_markets"
ON public.markets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "允許 authenticated 插入市集"
ON public.markets FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "允許 authenticated 插入商品"
ON public.products FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can insert own products"
ON public.products FOR INSERT
WITH CHECK (owner_id = auth.uid());
