-- ============================================================
-- 067_add_billing_event_transaction_ledger.sql
-- Date: 2026-08-03
--
-- F3B scope:
--   - Add private provider customer and subscription identity records.
--   - Add an append-oriented transaction ledger.
--   - Add a durable notification inbox and reconciliation audit ledger.
--   - Enforce cross-owner, origin, environment, transition, and retention guards.
--
-- Non-goals:
--   - No callback route, provider SDK, checkout, charge, refund, or cancellation.
--   - No projection writer or subscription_accounts mutation.
--   - No public RPC, SECURITY DEFINER function, or direct table access.
--   - No seeded customer, subscription, transaction, event, or reconciliation row.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.billing_customer_links (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  billing_origin TEXT NOT NULL,
  provider_environment TEXT NOT NULL,
  provider_customer_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT billing_customer_links_origin_check CHECK (
    billing_origin IN (
      'newebpay_web',
      'ecpay_web',
      'apple_app_store',
      'google_play'
    )
  ),
  CONSTRAINT billing_customer_links_environment_check
    CHECK (provider_environment IN ('sandbox', 'production')),
  CONSTRAINT billing_customer_links_provider_ref_check CHECK (
    pg_catalog.length(pg_catalog.btrim(provider_customer_ref)) BETWEEN 1 AND 512
    AND provider_customer_ref = pg_catalog.btrim(provider_customer_ref)
  ),
  CONSTRAINT billing_customer_links_owner_origin_environment_key
    UNIQUE (owner_id, billing_origin, provider_environment),
  CONSTRAINT billing_customer_links_provider_identity_key
    UNIQUE (billing_origin, provider_environment, provider_customer_ref)
);

CREATE OR REPLACE FUNCTION public.reject_billing_customer_link_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'billing_customer_link_immutable';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS reject_billing_customer_link_mutation
  ON public.billing_customer_links;
CREATE TRIGGER reject_billing_customer_link_mutation
BEFORE UPDATE OR DELETE ON public.billing_customer_links
FOR EACH ROW EXECUTE FUNCTION public.reject_billing_customer_link_mutation();

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  billing_customer_link_id UUID NOT NULL
    REFERENCES public.billing_customer_links(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  billing_origin TEXT NOT NULL,
  provider_environment TEXT NOT NULL,
  provider_subscription_ref TEXT NOT NULL,
  provider_product_ref TEXT,
  provider_price_ref TEXT,
  normalized_plan_code TEXT NOT NULL,
  normalized_cadence TEXT NOT NULL,
  normalized_billing_status TEXT NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_starts_at TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  provider_observed_at TIMESTAMPTZ NOT NULL,
  provider_sequence TEXT,
  snapshot_hash TEXT NOT NULL,
  last_reconciled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT billing_subscriptions_origin_check CHECK (
    billing_origin IN (
      'newebpay_web',
      'ecpay_web',
      'apple_app_store',
      'google_play'
    )
  ),
  CONSTRAINT billing_subscriptions_environment_check
    CHECK (provider_environment IN ('sandbox', 'production')),
  CONSTRAINT billing_subscriptions_provider_ref_check CHECK (
    pg_catalog.length(pg_catalog.btrim(provider_subscription_ref)) BETWEEN 1 AND 512
    AND provider_subscription_ref = pg_catalog.btrim(provider_subscription_ref)
    AND (provider_product_ref IS NULL OR (
      pg_catalog.length(pg_catalog.btrim(provider_product_ref)) BETWEEN 1 AND 512
      AND provider_product_ref = pg_catalog.btrim(provider_product_ref)
    ))
    AND (provider_price_ref IS NULL OR (
      pg_catalog.length(pg_catalog.btrim(provider_price_ref)) BETWEEN 1 AND 512
      AND provider_price_ref = pg_catalog.btrim(provider_price_ref)
    ))
  ),
  CONSTRAINT billing_subscriptions_plan_check
    CHECK (normalized_plan_code IN ('pro', 'team')),
  CONSTRAINT billing_subscriptions_cadence_check
    CHECK (normalized_cadence IN ('monthly', 'annual')),
  CONSTRAINT billing_subscriptions_status_check CHECK (
    normalized_billing_status IN (
      'trialing',
      'active',
      'past_due',
      'paused',
      'cancelled',
      'expired',
      'refunded',
      'disputed',
      'unknown'
    )
  ),
  CONSTRAINT billing_subscriptions_period_check CHECK (
    (current_period_starts_at IS NULL AND current_period_ends_at IS NULL)
    OR (
      current_period_starts_at IS NOT NULL
      AND current_period_ends_at IS NOT NULL
      AND current_period_ends_at >= current_period_starts_at
    )
  ),
  CONSTRAINT billing_subscriptions_sequence_check
    CHECK (
      provider_sequence IS NULL
      OR (
        provider_sequence = pg_catalog.btrim(provider_sequence)
        AND pg_catalog.length(provider_sequence) BETWEEN 1 AND 256
      )
    ),
  CONSTRAINT billing_subscriptions_snapshot_hash_check
    CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT billing_subscriptions_reconciled_time_check
    CHECK (last_reconciled_at >= provider_observed_at),
  CONSTRAINT billing_subscriptions_provider_identity_key
    UNIQUE (billing_origin, provider_environment, provider_subscription_ref)
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_owner_status
ON public.billing_subscriptions (
  owner_id,
  normalized_billing_status,
  provider_observed_at DESC
);

CREATE OR REPLACE FUNCTION public.enforce_billing_subscription_snapshot_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_customer public.billing_customer_links%ROWTYPE;
BEGIN
  SELECT *
  INTO v_customer
  FROM public.billing_customer_links AS bcl
  WHERE bcl.id = NEW.billing_customer_link_id;

  IF NOT FOUND
    OR ROW(
      v_customer.owner_id,
      v_customer.billing_origin,
      v_customer.provider_environment
    ) IS DISTINCT FROM ROW(
      NEW.owner_id,
      NEW.billing_origin,
      NEW.provider_environment
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_subscription_customer_identity_mismatch';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF ROW(
      NEW.id,
      NEW.billing_customer_link_id,
      NEW.owner_id,
      NEW.billing_origin,
      NEW.provider_environment,
      NEW.provider_subscription_ref,
      NEW.created_at
    ) IS DISTINCT FROM ROW(
      OLD.id,
      OLD.billing_customer_link_id,
      OLD.owner_id,
      OLD.billing_origin,
      OLD.provider_environment,
      OLD.provider_subscription_ref,
      OLD.created_at
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_subscription_identity_immutable';
    END IF;

    IF NEW.provider_observed_at <= OLD.provider_observed_at THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_subscription_stale_snapshot';
    END IF;

    IF OLD.provider_sequence IS NOT NULL
      AND NEW.provider_sequence IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_subscription_sequence_cleared';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_billing_subscription_snapshot_write
  ON public.billing_subscriptions;
CREATE TRIGGER enforce_billing_subscription_snapshot_write
BEFORE INSERT OR UPDATE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_billing_subscription_snapshot_write();

CREATE OR REPLACE FUNCTION public.prevent_f3b_billing_ledger_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '23514',
    MESSAGE = 'f3b_billing_ledger_delete_forbidden';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS prevent_billing_subscription_delete
  ON public.billing_subscriptions;
CREATE TRIGGER prevent_billing_subscription_delete
BEFORE DELETE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.prevent_f3b_billing_ledger_delete();

CREATE TABLE IF NOT EXISTS public.billing_transactions (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  billing_subscription_id UUID
    REFERENCES public.billing_subscriptions(id) ON DELETE RESTRICT,
  billing_origin TEXT NOT NULL,
  provider_environment TEXT NOT NULL,
  provider_transaction_ref TEXT NOT NULL,
  provider_parent_transaction_ref TEXT,
  transaction_kind TEXT NOT NULL,
  transaction_status TEXT NOT NULL,
  currency TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  provider_effective_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  provider_observed_at TIMESTAMPTZ NOT NULL,
  snapshot_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT billing_transactions_origin_check CHECK (
    billing_origin IN (
      'newebpay_web',
      'ecpay_web',
      'apple_app_store',
      'google_play'
    )
  ),
  CONSTRAINT billing_transactions_environment_check
    CHECK (provider_environment IN ('sandbox', 'production')),
  CONSTRAINT billing_transactions_provider_ref_check CHECK (
    pg_catalog.length(pg_catalog.btrim(provider_transaction_ref)) BETWEEN 1 AND 512
    AND provider_transaction_ref = pg_catalog.btrim(provider_transaction_ref)
    AND (provider_parent_transaction_ref IS NULL OR (
      pg_catalog.length(pg_catalog.btrim(provider_parent_transaction_ref)) BETWEEN 1 AND 512
      AND provider_parent_transaction_ref = pg_catalog.btrim(provider_parent_transaction_ref)
      AND provider_parent_transaction_ref <> provider_transaction_ref
    ))
  ),
  CONSTRAINT billing_transactions_kind_check CHECK (
    transaction_kind IN (
      'charge',
      'refund',
      'credit',
      'dispute',
      'chargeback',
      'reversal'
    )
  ),
  CONSTRAINT billing_transactions_status_check CHECK (
    transaction_status IN (
      'pending',
      'authorized',
      'succeeded',
      'settled',
      'failed',
      'cancelled',
      'reversed',
      'unknown'
    )
  ),
  CONSTRAINT billing_transactions_currency_check
    CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT billing_transactions_amount_check
    CHECK (amount_minor >= 0 AND amount_minor <= 9007199254740991),
  CONSTRAINT billing_transactions_time_check CHECK (
    provider_observed_at >= provider_effective_at
    AND (settled_at IS NULL OR settled_at >= provider_effective_at)
  ),
  CONSTRAINT billing_transactions_settlement_shape_check CHECK (
    (transaction_status IN ('settled', 'reversed') AND settled_at IS NOT NULL)
    OR (transaction_status NOT IN ('settled', 'reversed') AND settled_at IS NULL)
  ),
  CONSTRAINT billing_transactions_snapshot_hash_check
    CHECK (snapshot_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT billing_transactions_provider_kind_key UNIQUE (
    billing_origin,
    provider_environment,
    provider_transaction_ref,
    transaction_kind
  )
);

CREATE INDEX IF NOT EXISTS idx_billing_transactions_subscription_effective
ON public.billing_transactions (
  billing_subscription_id,
  provider_effective_at DESC
)
WHERE billing_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_transactions_owner_effective
ON public.billing_transactions (owner_id, provider_effective_at DESC);

CREATE OR REPLACE FUNCTION public.enforce_billing_transaction_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_subscription public.billing_subscriptions%ROWTYPE;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_transaction_append_only';
  END IF;

  IF NEW.billing_subscription_id IS NOT NULL THEN
    SELECT *
    INTO v_subscription
    FROM public.billing_subscriptions AS bs
    WHERE bs.id = NEW.billing_subscription_id;

    IF NOT FOUND
      OR ROW(
        v_subscription.owner_id,
        v_subscription.billing_origin,
        v_subscription.provider_environment
      ) IS DISTINCT FROM ROW(
        NEW.owner_id,
        NEW.billing_origin,
        NEW.provider_environment
      ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_transaction_subscription_identity_mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_billing_transaction_write
  ON public.billing_transactions;
CREATE TRIGGER enforce_billing_transaction_write
BEFORE INSERT OR UPDATE OR DELETE ON public.billing_transactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_billing_transaction_write();

CREATE TABLE IF NOT EXISTS public.billing_event_inbox (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  billing_origin TEXT NOT NULL,
  provider_environment TEXT NOT NULL,
  provider_event_ref TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  verification_status TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  provider_occurred_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  processing_status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_safe_error_code TEXT,
  processed_at TIMESTAMPTZ,
  raw_payload_ciphertext_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT billing_event_inbox_origin_check CHECK (
    billing_origin IN (
      'newebpay_web',
      'ecpay_web',
      'apple_app_store',
      'google_play'
    )
  ),
  CONSTRAINT billing_event_inbox_environment_check
    CHECK (provider_environment IN ('sandbox', 'production')),
  CONSTRAINT billing_event_inbox_provider_ref_check CHECK (
    pg_catalog.length(pg_catalog.btrim(provider_event_ref)) BETWEEN 1 AND 512
    AND provider_event_ref = pg_catalog.btrim(provider_event_ref)
  ),
  CONSTRAINT billing_event_inbox_payload_hash_check
    CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT billing_event_inbox_verification_check
    CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  CONSTRAINT billing_event_inbox_event_kind_check CHECK (
    pg_catalog.length(event_kind) BETWEEN 1 AND 80
    AND event_kind ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),
  CONSTRAINT billing_event_inbox_processing_check CHECK (
    processing_status IN (
      'pending',
      'processing',
      'retryable_failed',
      'processed',
      'ignored',
      'terminal_failed'
    )
  ),
  CONSTRAINT billing_event_inbox_attempt_check
    CHECK (attempt_count BETWEEN 0 AND 1000),
  CONSTRAINT billing_event_inbox_error_code_check CHECK (
    last_safe_error_code IS NULL
    OR (
      pg_catalog.length(last_safe_error_code) BETWEEN 1 AND 80
      AND last_safe_error_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
    )
  ),
  CONSTRAINT billing_event_inbox_payload_ref_check CHECK (
    raw_payload_ciphertext_ref IS NULL
    OR (
      pg_catalog.length(pg_catalog.btrim(raw_payload_ciphertext_ref)) BETWEEN 1 AND 1000
      AND raw_payload_ciphertext_ref = pg_catalog.btrim(raw_payload_ciphertext_ref)
    )
  ),
  CONSTRAINT billing_event_inbox_time_check CHECK (
    (provider_occurred_at IS NULL OR received_at >= provider_occurred_at)
    AND (processed_at IS NULL OR processed_at >= received_at)
    AND (next_attempt_at IS NULL OR next_attempt_at >= received_at)
  ),
  CONSTRAINT billing_event_inbox_verification_shape_check CHECK (
    (verification_status = 'pending' AND processing_status = 'pending')
    OR verification_status = 'verified'
    OR (
      verification_status = 'rejected'
      AND processing_status IN ('ignored', 'terminal_failed')
    )
  ),
  CONSTRAINT billing_event_inbox_processing_shape_check CHECK (
    (
      processing_status = 'pending'
      AND attempt_count = 0
      AND next_attempt_at IS NULL
      AND last_safe_error_code IS NULL
      AND processed_at IS NULL
    )
    OR (
      processing_status = 'processing'
      AND attempt_count > 0
      AND next_attempt_at IS NULL
      AND last_safe_error_code IS NULL
      AND processed_at IS NULL
    )
    OR (
      processing_status = 'retryable_failed'
      AND attempt_count > 0
      AND next_attempt_at IS NOT NULL
      AND last_safe_error_code IS NOT NULL
      AND processed_at IS NULL
    )
    OR (
      processing_status = 'processed'
      AND attempt_count > 0
      AND next_attempt_at IS NULL
      AND last_safe_error_code IS NULL
      AND processed_at IS NOT NULL
    )
    OR (
      processing_status = 'ignored'
      AND next_attempt_at IS NULL
      AND processed_at IS NOT NULL
    )
    OR (
      processing_status = 'terminal_failed'
      AND next_attempt_at IS NULL
      AND last_safe_error_code IS NOT NULL
      AND processed_at IS NOT NULL
    )
  ),
  CONSTRAINT billing_event_inbox_provider_event_key
    UNIQUE (billing_origin, provider_environment, provider_event_ref)
);

CREATE INDEX IF NOT EXISTS idx_billing_event_inbox_processing
ON public.billing_event_inbox (
  processing_status,
  next_attempt_at,
  received_at
)
WHERE processing_status IN ('pending', 'retryable_failed');

CREATE OR REPLACE FUNCTION public.enforce_billing_event_inbox_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT (
      (
        NEW.verification_status IN ('pending', 'verified')
        AND NEW.processing_status = 'pending'
        AND NEW.attempt_count = 0
      )
      OR (
        NEW.verification_status = 'rejected'
        AND NEW.processing_status = 'ignored'
        AND NEW.attempt_count = 0
      )
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_event_invalid_initial_state';
    END IF;

    NEW.updated_at := pg_catalog.clock_timestamp();
    RETURN NEW;
  END IF;

  IF ROW(
    NEW.id,
    NEW.billing_origin,
    NEW.provider_environment,
    NEW.provider_event_ref,
    NEW.payload_hash,
    NEW.event_kind,
    NEW.provider_occurred_at,
    NEW.received_at,
    NEW.raw_payload_ciphertext_ref,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.billing_origin,
    OLD.provider_environment,
    OLD.provider_event_ref,
    OLD.payload_hash,
    OLD.event_kind,
    OLD.provider_occurred_at,
    OLD.received_at,
    OLD.raw_payload_ciphertext_ref,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_event_identity_immutable';
  END IF;

  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
    AND NOT (
      OLD.verification_status = 'pending'
      AND NEW.verification_status IN ('verified', 'rejected')
    ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_event_invalid_verification_transition';
  END IF;

  IF NEW.processing_status IS DISTINCT FROM OLD.processing_status THEN
    IF NOT (
      (OLD.processing_status = 'pending'
        AND NEW.processing_status IN ('processing', 'ignored', 'terminal_failed'))
      OR (OLD.processing_status = 'processing'
        AND NEW.processing_status IN ('processed', 'retryable_failed', 'terminal_failed'))
      OR (OLD.processing_status = 'retryable_failed'
        AND NEW.processing_status IN ('processing', 'terminal_failed'))
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_event_invalid_processing_transition';
    END IF;
  ELSIF NEW.verification_status IS NOT DISTINCT FROM OLD.verification_status THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_event_noop_update';
  END IF;

  IF NEW.processing_status = 'processing' THEN
    IF NEW.attempt_count <> OLD.attempt_count + 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_event_attempt_increment_required';
    END IF;
  ELSIF NEW.attempt_count <> OLD.attempt_count THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_event_attempt_change_forbidden';
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_billing_event_inbox_write
  ON public.billing_event_inbox;
CREATE TRIGGER enforce_billing_event_inbox_write
BEFORE INSERT OR UPDATE ON public.billing_event_inbox
FOR EACH ROW EXECUTE FUNCTION public.enforce_billing_event_inbox_write();

DROP TRIGGER IF EXISTS prevent_billing_event_inbox_delete
  ON public.billing_event_inbox;
CREATE TRIGGER prevent_billing_event_inbox_delete
BEFORE DELETE ON public.billing_event_inbox
FOR EACH ROW EXECUTE FUNCTION public.prevent_f3b_billing_ledger_delete();

CREATE TABLE IF NOT EXISTS public.billing_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  billing_origin TEXT NOT NULL,
  provider_environment TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  trigger_event_inbox_id UUID
    REFERENCES public.billing_event_inbox(id) ON DELETE RESTRICT,
  provider_snapshot_ref TEXT,
  provider_observed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  before_projection_hash TEXT,
  after_projection_hash TEXT,
  decision_code TEXT,
  safe_error_code TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT billing_reconciliation_runs_origin_check CHECK (
    billing_origin IN (
      'newebpay_web',
      'ecpay_web',
      'apple_app_store',
      'google_play'
    )
  ),
  CONSTRAINT billing_reconciliation_runs_environment_check
    CHECK (provider_environment IN ('sandbox', 'production')),
  CONSTRAINT billing_reconciliation_runs_trigger_check
    CHECK (trigger_kind IN ('event', 'scheduled', 'support', 'recovery')),
  CONSTRAINT billing_reconciliation_runs_trigger_shape_check CHECK (
    (trigger_kind = 'event' AND trigger_event_inbox_id IS NOT NULL)
    OR (trigger_kind <> 'event' AND trigger_event_inbox_id IS NULL)
  ),
  CONSTRAINT billing_reconciliation_runs_status_check
    CHECK (status IN ('running', 'succeeded', 'no_change', 'failed')),
  CONSTRAINT billing_reconciliation_runs_reference_check CHECK (
    provider_snapshot_ref IS NULL
    OR (
      pg_catalog.length(pg_catalog.btrim(provider_snapshot_ref)) BETWEEN 1 AND 1000
      AND provider_snapshot_ref = pg_catalog.btrim(provider_snapshot_ref)
    )
  ),
  CONSTRAINT billing_reconciliation_runs_hash_check CHECK (
    (before_projection_hash IS NULL OR before_projection_hash ~ '^[0-9a-f]{64}$')
    AND (after_projection_hash IS NULL OR after_projection_hash ~ '^[0-9a-f]{64}$')
  ),
  CONSTRAINT billing_reconciliation_runs_code_check CHECK (
    (decision_code IS NULL OR (
      pg_catalog.length(decision_code) BETWEEN 1 AND 80
      AND decision_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
    ))
    AND (safe_error_code IS NULL OR (
      pg_catalog.length(safe_error_code) BETWEEN 1 AND 80
      AND safe_error_code ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
    ))
  ),
  CONSTRAINT billing_reconciliation_runs_time_check CHECK (
    completed_at IS NULL OR completed_at >= started_at
  ),
  CONSTRAINT billing_reconciliation_runs_status_shape_check CHECK (
    (
      status = 'running'
      AND completed_at IS NULL
      AND decision_code IS NULL
      AND safe_error_code IS NULL
      AND after_projection_hash IS NULL
    )
    OR (
      status = 'succeeded'
      AND completed_at IS NOT NULL
      AND provider_snapshot_ref IS NOT NULL
      AND provider_observed_at IS NOT NULL
      AND before_projection_hash IS NOT NULL
      AND after_projection_hash IS NOT NULL
      AND decision_code IS NOT NULL
      AND safe_error_code IS NULL
    )
    OR (
      status = 'no_change'
      AND completed_at IS NOT NULL
      AND provider_snapshot_ref IS NOT NULL
      AND provider_observed_at IS NOT NULL
      AND before_projection_hash IS NOT NULL
      AND after_projection_hash = before_projection_hash
      AND decision_code IS NOT NULL
      AND safe_error_code IS NULL
    )
    OR (
      status = 'failed'
      AND completed_at IS NOT NULL
      AND decision_code IS NULL
      AND safe_error_code IS NOT NULL
      AND after_projection_hash IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_billing_reconciliation_runs_owner_started
ON public.billing_reconciliation_runs (owner_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_reconciliation_runs_status_started
ON public.billing_reconciliation_runs (status, started_at)
WHERE status IN ('running', 'failed');

CREATE OR REPLACE FUNCTION public.enforce_billing_reconciliation_run_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_event public.billing_event_inbox%ROWTYPE;
BEGIN
  IF NEW.trigger_event_inbox_id IS NOT NULL THEN
    SELECT *
    INTO v_event
    FROM public.billing_event_inbox AS bei
    WHERE bei.id = NEW.trigger_event_inbox_id;

    IF NOT FOUND
      OR v_event.verification_status <> 'verified'
      OR ROW(v_event.billing_origin, v_event.provider_environment)
        IS DISTINCT FROM ROW(NEW.billing_origin, NEW.provider_environment) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_reconciliation_event_identity_mismatch';
    END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'running' THEN
      RAISE EXCEPTION USING
        ERRCODE = '23514',
        MESSAGE = 'billing_reconciliation_invalid_initial_state';
    END IF;

    NEW.updated_at := pg_catalog.clock_timestamp();
    RETURN NEW;
  END IF;

  IF ROW(
    NEW.id,
    NEW.owner_id,
    NEW.billing_origin,
    NEW.provider_environment,
    NEW.trigger_kind,
    NEW.trigger_event_inbox_id,
    NEW.started_at,
    NEW.created_at
  ) IS DISTINCT FROM ROW(
    OLD.id,
    OLD.owner_id,
    OLD.billing_origin,
    OLD.provider_environment,
    OLD.trigger_kind,
    OLD.trigger_event_inbox_id,
    OLD.started_at,
    OLD.created_at
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_reconciliation_identity_immutable';
  END IF;

  IF OLD.status <> 'running'
    OR NEW.status NOT IN ('succeeded', 'no_change', 'failed') THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'billing_reconciliation_invalid_transition';
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_billing_reconciliation_run_write
  ON public.billing_reconciliation_runs;
CREATE TRIGGER enforce_billing_reconciliation_run_write
BEFORE INSERT OR UPDATE ON public.billing_reconciliation_runs
FOR EACH ROW EXECUTE FUNCTION public.enforce_billing_reconciliation_run_write();

DROP TRIGGER IF EXISTS prevent_billing_reconciliation_run_delete
  ON public.billing_reconciliation_runs;
CREATE TRIGGER prevent_billing_reconciliation_run_delete
BEFORE DELETE ON public.billing_reconciliation_runs
FOR EACH ROW EXECUTE FUNCTION public.prevent_f3b_billing_ledger_delete();

ALTER TABLE public.billing_customer_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_event_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_reconciliation_runs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.billing_customer_links
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.billing_subscriptions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.billing_transactions
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.billing_event_inbox
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.billing_reconciliation_runs
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.reject_billing_customer_link_mutation()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_subscription_snapshot_write()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_f3b_billing_ledger_delete()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_transaction_write()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_event_inbox_write()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_billing_reconciliation_run_write()
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.billing_customer_links IS
  'F3B private immutable owner-to-provider customer identity. No direct client or service_role access is granted by migration 067.';
COMMENT ON TABLE public.billing_subscriptions IS
  'F3B private normalized provider subscription snapshot. It is billing evidence, not entitlement authority.';
COMMENT ON TABLE public.billing_transactions IS
  'F3B private append-oriented transaction ledger. A transaction row never grants capability by itself.';
COMMENT ON TABLE public.billing_event_inbox IS
  'F3B private durable notification metadata. Raw payloads are not stored inline and no callback route exists in this slice.';
COMMENT ON TABLE public.billing_reconciliation_runs IS
  'F3B private reconciliation audit ledger. Migration 067 creates no writer and cannot mutate subscription_accounts.';

COMMIT;
