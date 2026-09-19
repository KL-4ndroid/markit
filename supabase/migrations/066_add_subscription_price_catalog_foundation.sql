-- ============================================================
-- 066_add_subscription_price_catalog_foundation.sql
-- Date: 2026-07-30
--
-- F3A scope:
--   - Add a private, immutable subscription price catalog foundation.
--   - Add provider/storefront mapping metadata without provider secrets.
--   - Add server-owned price assignments and Founder lock constraints.
--   - Seed only non-billable candidate prices.
--
-- Non-goals:
--   - No active price or storefront mapping.
--   - No checkout, callback, provider SDK, transaction, or billing writer.
--   - No subscription_accounts mutation or entitlement change.
--   - No anon/authenticated/service_role direct table access.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.subscription_price_versions (
  id TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL,
  cadence TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  price_policy TEXT NOT NULL,
  offer_code TEXT,
  commercial_status TEXT NOT NULL DEFAULT 'candidate',
  effective_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT subscription_price_versions_id_check CHECK (
    pg_catalog.length(id) BETWEEN 3 AND 96
    AND id ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),
  CONSTRAINT subscription_price_versions_plan_check
    CHECK (plan_code IN ('pro', 'team')),
  CONSTRAINT subscription_price_versions_cadence_check
    CHECK (cadence IN ('monthly', 'annual')),
  CONSTRAINT subscription_price_versions_currency_check
    CHECK (currency = 'TWD'),
  CONSTRAINT subscription_price_versions_amount_check
    CHECK (amount_minor > 0 AND amount_minor <= 9007199254740991),
  CONSTRAINT subscription_price_versions_policy_check
    CHECK (price_policy IN ('standard', 'founder_locked')),
  CONSTRAINT subscription_price_versions_offer_shape_check CHECK (
    (
      price_policy = 'standard'
      AND offer_code IS NULL
    )
    OR (
      price_policy = 'founder_locked'
      AND plan_code = 'pro'
      AND cadence = 'annual'
      AND offer_code = 'pro_founder_annual_65'
    )
  ),
  CONSTRAINT subscription_price_versions_status_check
    CHECK (commercial_status IN ('candidate', 'active', 'retired')),
  CONSTRAINT subscription_price_versions_status_shape_check CHECK (
    (
      commercial_status = 'candidate'
      AND effective_at IS NULL
      AND retired_at IS NULL
    )
    OR (
      commercial_status = 'active'
      AND effective_at IS NOT NULL
      AND retired_at IS NULL
    )
    OR (
      commercial_status = 'retired'
      AND retired_at IS NOT NULL
      AND (effective_at IS NULL OR retired_at >= effective_at)
    )
  )
);

CREATE OR REPLACE FUNCTION public.enforce_subscription_price_version_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF ROW(
    NEW.id,
    NEW.plan_code,
    NEW.cadence,
    NEW.currency,
    NEW.amount_minor,
    NEW.price_policy,
    NEW.offer_code,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.plan_code,
    OLD.cadence,
    OLD.currency,
    OLD.amount_minor,
    OLD.price_policy,
    OLD.offer_code,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription_price_version_immutable_fields';
  END IF;

  IF OLD.commercial_status = 'candidate' THEN
    IF NEW.commercial_status NOT IN ('candidate', 'active', 'retired') THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_version_invalid_transition';
    END IF;
  ELSIF OLD.commercial_status = 'active' THEN
    IF NEW.commercial_status NOT IN ('active', 'retired')
      OR NEW.effective_at IS DISTINCT FROM OLD.effective_at THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_version_invalid_transition';
    END IF;
  ELSE
    IF ROW(NEW.commercial_status, NEW.effective_at, NEW.retired_at)
      IS DISTINCT FROM ROW(OLD.commercial_status, OLD.effective_at, OLD.retired_at) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_version_retired';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_subscription_price_version_update
  ON public.subscription_price_versions;
CREATE TRIGGER enforce_subscription_price_version_update
BEFORE UPDATE ON public.subscription_price_versions
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_price_version_update();

CREATE TABLE IF NOT EXISTS public.billing_storefront_price_mappings (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  price_version_id TEXT NOT NULL
    REFERENCES public.subscription_price_versions(id) ON DELETE RESTRICT,
  billing_origin TEXT NOT NULL,
  provider_environment TEXT NOT NULL,
  mapping_mode TEXT NOT NULL,
  provider_product_ref TEXT,
  provider_price_ref TEXT,
  mapping_status TEXT NOT NULL DEFAULT 'candidate',
  verified_at TIMESTAMPTZ,
  evidence_reference TEXT,
  activated_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT billing_storefront_mappings_origin_check CHECK (
    billing_origin IN (
      'newebpay_web',
      'ecpay_web',
      'apple_app_store',
      'google_play'
    )
  ),
  CONSTRAINT billing_storefront_mappings_environment_check
    CHECK (provider_environment IN ('sandbox', 'production')),
  CONSTRAINT billing_storefront_mappings_mode_check
    CHECK (mapping_mode IN ('server_amount', 'provider_price_object')),
  CONSTRAINT billing_storefront_mappings_ref_length_check CHECK (
    (provider_product_ref IS NULL OR (
      pg_catalog.length(pg_catalog.btrim(provider_product_ref)) BETWEEN 1 AND 512
      AND provider_product_ref = pg_catalog.btrim(provider_product_ref)
    ))
    AND (provider_price_ref IS NULL OR (
      pg_catalog.length(pg_catalog.btrim(provider_price_ref)) BETWEEN 1 AND 512
      AND provider_price_ref = pg_catalog.btrim(provider_price_ref)
    ))
  ),
  CONSTRAINT billing_storefront_mappings_mode_shape_check CHECK (
    (
      mapping_mode = 'server_amount'
      AND provider_price_ref IS NULL
    )
    OR (
      mapping_mode = 'provider_price_object'
      AND provider_price_ref IS NOT NULL
    )
  ),
  CONSTRAINT billing_storefront_mappings_status_check
    CHECK (mapping_status IN ('candidate', 'active', 'retired')),
  CONSTRAINT billing_storefront_mappings_evidence_length_check CHECK (
    evidence_reference IS NULL
    OR (
      pg_catalog.length(pg_catalog.btrim(evidence_reference)) BETWEEN 1 AND 1000
      AND evidence_reference = pg_catalog.btrim(evidence_reference)
    )
  ),
  CONSTRAINT billing_storefront_mappings_status_shape_check CHECK (
    (
      mapping_status = 'candidate'
      AND activated_at IS NULL
      AND retired_at IS NULL
    )
    OR (
      mapping_status = 'active'
      AND verified_at IS NOT NULL
      AND evidence_reference IS NOT NULL
      AND activated_at IS NOT NULL
      AND retired_at IS NULL
    )
    OR (
      mapping_status = 'retired'
      AND retired_at IS NOT NULL
      AND (activated_at IS NULL OR retired_at >= activated_at)
    )
  ),
  CONSTRAINT billing_storefront_mappings_version_origin_environment_key
    UNIQUE (price_version_id, billing_origin, provider_environment)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_storefront_provider_price_ref
ON public.billing_storefront_price_mappings (
  billing_origin,
  provider_environment,
  provider_price_ref
)
WHERE provider_price_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_billing_storefront_mapping_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_price_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND ROW(
    NEW.id,
    NEW.price_version_id,
    NEW.billing_origin,
    NEW.provider_environment,
    NEW.mapping_mode,
    NEW.provider_product_ref,
    NEW.provider_price_ref,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.price_version_id,
    OLD.billing_origin,
    OLD.provider_environment,
    OLD.mapping_mode,
    OLD.provider_product_ref,
    OLD.provider_price_ref,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_storefront_mapping_immutable_fields';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.mapping_status = 'candidate' THEN
      IF NEW.mapping_status NOT IN ('candidate', 'active', 'retired') THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'billing_storefront_mapping_invalid_transition';
      END IF;
    ELSIF OLD.mapping_status = 'active' THEN
      IF NEW.mapping_status NOT IN ('active', 'retired')
        OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
        OR NEW.evidence_reference IS DISTINCT FROM OLD.evidence_reference
        OR NEW.activated_at IS DISTINCT FROM OLD.activated_at THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'billing_storefront_mapping_invalid_transition';
      END IF;
    ELSE
      IF ROW(
        NEW.mapping_status,
        NEW.verified_at,
        NEW.evidence_reference,
        NEW.activated_at,
        NEW.retired_at
      ) IS DISTINCT FROM ROW(
        OLD.mapping_status,
        OLD.verified_at,
        OLD.evidence_reference,
        OLD.activated_at,
        OLD.retired_at
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'billing_storefront_mapping_retired';
      END IF;
    END IF;
  END IF;

  IF NEW.mapping_status = 'active' THEN
    SELECT spv.commercial_status
    INTO v_price_status
    FROM public.subscription_price_versions AS spv
    WHERE spv.id = NEW.price_version_id;

    IF v_price_status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_storefront_mapping_price_not_active';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_billing_storefront_mapping_update
  ON public.billing_storefront_price_mappings;
CREATE TRIGGER enforce_billing_storefront_mapping_update
BEFORE INSERT OR UPDATE ON public.billing_storefront_price_mappings
FOR EACH ROW EXECUTE FUNCTION public.enforce_billing_storefront_mapping_update();

CREATE TABLE IF NOT EXISTS public.subscription_price_assignments (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  storefront_price_mapping_id UUID NOT NULL
    REFERENCES public.billing_storefront_price_mappings(id) ON DELETE RESTRICT,
  price_version_id TEXT NOT NULL
    REFERENCES public.subscription_price_versions(id) ON DELETE RESTRICT,
  assigned_plan_code TEXT NOT NULL,
  assigned_cadence TEXT NOT NULL,
  assigned_currency TEXT NOT NULL,
  assigned_amount_minor BIGINT NOT NULL,
  price_policy TEXT NOT NULL,
  founder_offer_code TEXT,
  founder_lock_status TEXT,
  assignment_source TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  continuity_started_at TIMESTAMPTZ NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL,
  dormant_at TIMESTAMPTZ,
  forfeited_at TIMESTAMPTZ,
  forfeiture_reason TEXT,
  superseded_at TIMESTAMPTZ,
  last_transition_at TIMESTAMPTZ NOT NULL,
  last_transition_reason TEXT NOT NULL,
  last_transition_evidence_reference TEXT NOT NULL,
  assignment_revision BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT subscription_price_assignments_plan_check
    CHECK (assigned_plan_code IN ('pro', 'team')),
  CONSTRAINT subscription_price_assignments_cadence_check
    CHECK (assigned_cadence IN ('monthly', 'annual')),
  CONSTRAINT subscription_price_assignments_currency_check
    CHECK (assigned_currency = 'TWD'),
  CONSTRAINT subscription_price_assignments_amount_check
    CHECK (assigned_amount_minor > 0 AND assigned_amount_minor <= 9007199254740991),
  CONSTRAINT subscription_price_assignments_policy_check
    CHECK (price_policy IN ('standard', 'founder_locked')),
  CONSTRAINT subscription_price_assignments_lock_status_check CHECK (
    founder_lock_status IS NULL
    OR founder_lock_status IN ('active', 'grace', 'dormant', 'forfeited')
  ),
  CONSTRAINT subscription_price_assignments_source_check
    CHECK (assignment_source IN ('billing', 'migration')),
  CONSTRAINT subscription_price_assignments_reference_length_check CHECK (
    pg_catalog.length(pg_catalog.btrim(source_reference)) BETWEEN 1 AND 1000
    AND source_reference = pg_catalog.btrim(source_reference)
    AND pg_catalog.length(pg_catalog.btrim(last_transition_reason)) BETWEEN 1 AND 120
    AND last_transition_reason = pg_catalog.btrim(last_transition_reason)
    AND pg_catalog.length(pg_catalog.btrim(last_transition_evidence_reference)) BETWEEN 1 AND 1000
    AND last_transition_evidence_reference = pg_catalog.btrim(last_transition_evidence_reference)
    AND (
      forfeiture_reason IS NULL
      OR (
        pg_catalog.length(pg_catalog.btrim(forfeiture_reason)) BETWEEN 1 AND 120
        AND forfeiture_reason = pg_catalog.btrim(forfeiture_reason)
      )
    )
  ),
  CONSTRAINT subscription_price_assignments_time_order_check CHECK (
    assigned_at >= continuity_started_at
    AND last_transition_at >= assigned_at
    AND (dormant_at IS NULL OR dormant_at >= assigned_at)
    AND (forfeited_at IS NULL OR forfeited_at >= assigned_at)
    AND (superseded_at IS NULL OR superseded_at >= assigned_at)
  ),
  CONSTRAINT subscription_price_assignments_revision_check
    CHECK (assignment_revision > 0),
  CONSTRAINT subscription_price_assignments_policy_shape_check CHECK (
    (
      price_policy = 'standard'
      AND founder_offer_code IS NULL
      AND founder_lock_status IS NULL
      AND dormant_at IS NULL
      AND forfeited_at IS NULL
      AND forfeiture_reason IS NULL
    )
    OR (
      price_policy = 'founder_locked'
      AND assigned_plan_code = 'pro'
      AND assigned_cadence = 'annual'
      AND founder_offer_code = 'pro_founder_annual_65'
      AND founder_lock_status IS NOT NULL
      AND (
        founder_lock_status <> 'dormant'
        OR dormant_at IS NOT NULL
      )
      AND (
        founder_lock_status <> 'forfeited'
        OR (
          forfeited_at IS NOT NULL
          AND forfeiture_reason IS NOT NULL
        )
      )
      AND (
        founder_lock_status = 'forfeited'
        OR (
          forfeited_at IS NULL
          AND forfeiture_reason IS NULL
        )
      )
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_price_assignments_founder_once
ON public.subscription_price_assignments(owner_id)
WHERE price_policy = 'founder_locked';

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_price_assignments_current
ON public.subscription_price_assignments(owner_id)
WHERE superseded_at IS NULL
  AND (
    price_policy = 'standard'
    OR founder_lock_status IN ('active', 'grace')
  );

CREATE INDEX IF NOT EXISTS idx_subscription_price_assignments_owner_history
ON public.subscription_price_assignments(owner_id, assigned_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_subscription_price_assignment_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_price public.subscription_price_versions%ROWTYPE;
  v_mapping public.billing_storefront_price_mappings%ROWTYPE;
  v_mutable_changed BOOLEAN;
BEGIN
  SELECT *
  INTO v_price
  FROM public.subscription_price_versions AS spv
  WHERE spv.id = NEW.price_version_id;

  IF NOT FOUND OR v_price.commercial_status <> 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription_price_assignment_price_not_active';
  END IF;

  SELECT *
  INTO v_mapping
  FROM public.billing_storefront_price_mappings AS bspm
  WHERE bspm.id = NEW.storefront_price_mapping_id;

  IF NOT FOUND
    OR v_mapping.mapping_status <> 'active'
    OR v_mapping.price_version_id <> NEW.price_version_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription_price_assignment_mapping_not_active';
  END IF;

  IF ROW(
    NEW.assigned_plan_code,
    NEW.assigned_cadence,
    NEW.assigned_currency,
    NEW.assigned_amount_minor,
    NEW.price_policy,
    NEW.founder_offer_code
  ) IS DISTINCT FROM ROW(
    v_price.plan_code,
    v_price.cadence,
    v_price.currency,
    v_price.amount_minor,
    v_price.price_policy,
    v_price.offer_code
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription_price_assignment_catalog_mismatch';
  END IF;

  IF TG_OP = 'INSERT'
    AND NEW.price_policy = 'founder_locked'
    AND NEW.assignment_source = 'billing'
    AND NEW.founder_lock_status <> 'active' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription_price_assignment_invalid_initial_founder_state';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF ROW(
      NEW.id,
      NEW.owner_id,
      NEW.storefront_price_mapping_id,
      NEW.price_version_id,
      NEW.assigned_plan_code,
      NEW.assigned_cadence,
      NEW.assigned_currency,
      NEW.assigned_amount_minor,
      NEW.price_policy,
      NEW.founder_offer_code,
      NEW.assignment_source,
      NEW.source_reference,
      NEW.continuity_started_at,
      NEW.assigned_at,
      NEW.created_at
    ) IS DISTINCT FROM ROW(
      OLD.id,
      OLD.owner_id,
      OLD.storefront_price_mapping_id,
      OLD.price_version_id,
      OLD.assigned_plan_code,
      OLD.assigned_cadence,
      OLD.assigned_currency,
      OLD.assigned_amount_minor,
      OLD.price_policy,
      OLD.founder_offer_code,
      OLD.assignment_source,
      OLD.source_reference,
      OLD.continuity_started_at,
      OLD.assigned_at,
      OLD.created_at
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_assignment_immutable_fields';
    END IF;

    IF OLD.superseded_at IS NOT NULL
      AND NEW.superseded_at IS DISTINCT FROM OLD.superseded_at THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_assignment_superseded';
    END IF;

    IF OLD.price_policy = 'founder_locked'
      AND NEW.founder_lock_status IS DISTINCT FROM OLD.founder_lock_status THEN
      IF NOT (
        (OLD.founder_lock_status = 'active'
          AND NEW.founder_lock_status IN ('grace', 'dormant', 'forfeited'))
        OR (OLD.founder_lock_status = 'grace'
          AND NEW.founder_lock_status IN ('active', 'dormant', 'forfeited'))
        OR (OLD.founder_lock_status = 'dormant'
          AND NEW.founder_lock_status IN ('active', 'forfeited'))
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'subscription_price_assignment_invalid_lock_transition';
      END IF;

      IF NEW.founder_lock_status = 'dormant'
        AND (
          NEW.dormant_at IS NULL
          OR (OLD.dormant_at IS NOT NULL AND NEW.dormant_at <= OLD.dormant_at)
        ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'subscription_price_assignment_dormant_timestamp_required';
      END IF;

      IF OLD.founder_lock_status = 'dormant'
        AND NEW.founder_lock_status = 'active'
        AND NEW.dormant_at IS DISTINCT FROM OLD.dormant_at THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'subscription_price_assignment_dormant_history_immutable';
      END IF;
    ELSIF OLD.price_policy = 'founder_locked'
      AND NEW.dormant_at IS DISTINCT FROM OLD.dormant_at THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_assignment_dormant_transition_required';
    END IF;

    v_mutable_changed := ROW(
      NEW.founder_lock_status,
      NEW.dormant_at,
      NEW.forfeited_at,
      NEW.forfeiture_reason,
      NEW.superseded_at
    ) IS DISTINCT FROM ROW(
      OLD.founder_lock_status,
      OLD.dormant_at,
      OLD.forfeited_at,
      OLD.forfeiture_reason,
      OLD.superseded_at
    );

    IF NOT v_mutable_changed THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_assignment_noop_update';
    END IF;

    IF NEW.last_transition_at <= OLD.last_transition_at
      OR NEW.last_transition_reason IS NOT DISTINCT FROM OLD.last_transition_reason
      OR NEW.last_transition_evidence_reference
        IS NOT DISTINCT FROM OLD.last_transition_evidence_reference THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'subscription_price_assignment_transition_evidence_required';
    END IF;

    NEW.assignment_revision := OLD.assignment_revision + 1;
  ELSE
    NEW.assignment_revision := 1;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_subscription_price_assignment_write
  ON public.subscription_price_assignments;
CREATE TRIGGER enforce_subscription_price_assignment_write
BEFORE INSERT OR UPDATE ON public.subscription_price_assignments
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_price_assignment_write();

ALTER TABLE public.subscription_price_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_storefront_price_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_price_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.subscription_price_versions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.billing_storefront_price_mappings
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.subscription_price_assignments
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.enforce_subscription_price_version_update()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_storefront_mapping_update()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_subscription_price_assignment_write()
  FROM PUBLIC, anon, authenticated, service_role;

INSERT INTO public.subscription_price_versions (
  id,
  plan_code,
  cadence,
  currency,
  amount_minor,
  price_policy,
  offer_code,
  commercial_status,
  effective_at,
  retired_at
) VALUES
  (
    'pro_monthly_twd_launch_v1',
    'pro',
    'monthly',
    'TWD',
    199,
    'standard',
    NULL,
    'candidate',
    NULL,
    NULL
  ),
  (
    'pro_annual_twd_launch_v1',
    'pro',
    'annual',
    'TWD',
    1990,
    'standard',
    NULL,
    'candidate',
    NULL,
    NULL
  ),
  (
    'pro_founder_annual_twd_launch_v1',
    'pro',
    'annual',
    'TWD',
    1290,
    'founder_locked',
    'pro_founder_annual_65',
    'candidate',
    NULL,
    NULL
  ),
  (
    'team_monthly_twd_launch_v1',
    'team',
    'monthly',
    'TWD',
    499,
    'standard',
    NULL,
    'candidate',
    NULL,
    NULL
  ),
  (
    'team_annual_twd_launch_v1',
    'team',
    'annual',
    'TWD',
    4990,
    'standard',
    NULL,
    'candidate',
    NULL,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      VALUES
        ('pro_monthly_twd_launch_v1', 'pro', 'monthly', 'TWD', 199::BIGINT, 'standard', NULL::TEXT),
        ('pro_annual_twd_launch_v1', 'pro', 'annual', 'TWD', 1990::BIGINT, 'standard', NULL::TEXT),
        ('pro_founder_annual_twd_launch_v1', 'pro', 'annual', 'TWD', 1290::BIGINT, 'founder_locked', 'pro_founder_annual_65'),
        ('team_monthly_twd_launch_v1', 'team', 'monthly', 'TWD', 499::BIGINT, 'standard', NULL::TEXT),
        ('team_annual_twd_launch_v1', 'team', 'annual', 'TWD', 4990::BIGINT, 'standard', NULL::TEXT)
    ) AS expected(id, plan_code, cadence, currency, amount_minor, price_policy, offer_code)
    LEFT JOIN public.subscription_price_versions AS actual
      ON actual.id = expected.id
    WHERE actual.id IS NULL
      OR ROW(
        actual.plan_code,
        actual.cadence,
        actual.currency,
        actual.amount_minor,
        actual.price_policy,
        actual.offer_code,
        actual.commercial_status,
        actual.effective_at,
        actual.retired_at
      ) IS DISTINCT FROM ROW(
        expected.plan_code,
        expected.cadence,
        expected.currency,
        expected.amount_minor,
        expected.price_policy,
        expected.offer_code,
        'candidate'::TEXT,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'subscription_price_catalog_seed_mismatch';
  END IF;
END;
$$;

COMMENT ON TABLE public.subscription_price_versions IS
  'F3A private immutable commercial catalog. Migration 066 seeds candidate rows only; no row is billable until a separately approved activation migration.';
COMMENT ON TABLE public.billing_storefront_price_mappings IS
  'F3A private mapping between internal prices and one provider environment. No mapping is seeded or activated by migration 066.';
COMMENT ON TABLE public.subscription_price_assignments IS
  'F3A private server-owned price assignment ledger. No writer or assignment is created by migration 066.';

COMMIT;
