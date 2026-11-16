-- Distinguish unconfirmed equipment from explicitly self-provided equipment.
BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.markets ADD COLUMN registration_conditions jsonb;

CREATE FUNCTION public.project_market_registration_conditions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $body$
DECLARE
  fields jsonb;
  conditions jsonb;
BEGIN
  IF NEW.type NOT IN ('market_created', 'market_updated') THEN RETURN NEW; END IF;
  fields := CASE WHEN NEW.type = 'market_updated' THEN NEW.payload->'updates' ELSE NEW.payload END;
  conditions := COALESCE(fields->'registration_conditions', fields->'registrationConditions');
  IF conditions IS NULL THEN RETURN NEW; END IF;

  IF jsonb_typeof(conditions) <> 'object' THEN
    RAISE EXCEPTION 'Invalid registration conditions' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_each(conditions) AS entry(key, value)
    WHERE CASE
      WHEN key IN ('tableFree', 'chairFree', 'umbrellaFree')
        THEN value NOT IN ('"unknown"', '"free"', '"rental"', '"self"')
      ELSE true
    END
  ) THEN RAISE EXCEPTION 'Invalid registration conditions' USING ERRCODE = '22023';
  END IF;

  UPDATE public.markets m
    SET registration_conditions = COALESCE(m.registration_conditions, '{}'::jsonb) || conditions
  WHERE m.id = NEW.market_id AND m.owner_id = NEW.actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration conditions require the market owner' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$body$;
REVOKE ALL ON FUNCTION public.project_market_registration_conditions() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER zz_project_market_registration_conditions
AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.project_market_registration_conditions();

-- Append the new column using the existing owner-only projection and financial mask.
CREATE OR REPLACE VIEW public.owner_accessible_markets WITH (security_barrier=true) AS
 SELECT (jsonb_populate_record(NULL::public.markets,
  CASE WHEN public.subscription_read_paid(m.owner_id) THEN to_jsonb(m)
   ELSE to_jsonb(m)||jsonb_build_object('total_revenue',NULL,'total_profit',NULL,'total_interactions',NULL,'total_deals',NULL)
  END)).* FROM public.markets m WHERE m.owner_id=auth.uid();

NOTIFY pgrst, 'reload schema';
COMMIT;
