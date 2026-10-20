BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_accounts (
  owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_code text NOT NULL DEFAULT 'free',
  plan_source text NOT NULL DEFAULT 'free',
  billing_status text NOT NULL DEFAULT 'none',
  entitlement_status text NOT NULL DEFAULT 'active',
  entitlement_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT subscription_accounts_plan_code_check
    CHECK (plan_code IN ('free', 'pro', 'team')),
  CONSTRAINT subscription_accounts_plan_source_check
    CHECK (plan_source IN ('free', 'admin', 'promotion', 'billing')),
  CONSTRAINT subscription_accounts_billing_status_check
    CHECK (billing_status IN (
      'none', 'trialing', 'active', 'past_due', 'cancel_at_period_end',
      'cancelled', 'refunded', 'disputed', 'unknown'
    )),
  CONSTRAINT subscription_accounts_entitlement_status_check
    CHECK (entitlement_status IN ('active', 'grace', 'inactive', 'unknown')),
  CONSTRAINT subscription_accounts_source_shape_check CHECK (
    (
      plan_source = 'free'
      AND plan_code = 'free'
      AND billing_status = 'none'
      AND entitlement_status = 'active'
      AND entitlement_ends_at IS NULL
    )
    OR (
      plan_source = 'admin'
      AND plan_code IN ('pro', 'team')
      AND billing_status = 'none'
    )
    OR (
      plan_source = 'promotion'
      AND plan_code = 'pro'
      AND billing_status = 'none'
      AND entitlement_ends_at IS NOT NULL
    )
    OR (
      plan_source = 'billing'
      AND plan_code IN ('pro', 'team')
    )
  )
);

ALTER TABLE public.subscription_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.subscription_accounts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.touch_subscription_accounts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_subscription_accounts_updated_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS update_subscription_accounts_updated_at ON public.subscription_accounts;
CREATE TRIGGER update_subscription_accounts_updated_at
BEFORE UPDATE ON public.subscription_accounts
FOR EACH ROW EXECUTE FUNCTION public.touch_subscription_accounts_updated_at();

CREATE OR REPLACE FUNCTION public.read_subscription_account_for_actor(
  p_actor_id uuid,
  p_owner_id uuid
) RETURNS TABLE (
  access_allowed boolean,
  account_exists boolean,
  owner_id uuid,
  plan_code text,
  plan_source text,
  billing_status text,
  entitlement_status text,
  entitlement_ends_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_actor_id IS NULL OR p_owner_id IS NULL THEN
    RETURN;
  END IF;

  IF p_actor_id <> p_owner_id AND NOT EXISTS (
    SELECT 1
    FROM public.staff_relationships AS sr
    WHERE sr.owner_id = p_owner_id
      AND sr.staff_id = p_actor_id
      AND sr.status = 'active'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    true,
    sa.owner_id IS NOT NULL,
    p_owner_id,
    sa.plan_code,
    sa.plan_source,
    sa.billing_status,
    sa.entitlement_status,
    sa.entitlement_ends_at,
    sa.updated_at
  FROM (SELECT 1) AS seed
  LEFT JOIN public.subscription_accounts AS sa ON sa.owner_id = p_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.read_subscription_account_for_actor(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.read_subscription_account_for_actor(uuid, uuid)
  TO service_role;

COMMENT ON TABLE public.subscription_accounts IS
  'Server-authoritative Free/admin capability source. Billing and promotion rows remain fail-closed until their later approved runtimes exist.';
COMMENT ON FUNCTION public.read_subscription_account_for_actor(uuid, uuid) IS
  'Read-only BFF capability lookup after verified actor identity; returns no row for a foreign or inactive workspace relationship.';

COMMIT;
