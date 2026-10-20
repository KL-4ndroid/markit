-- ACCOUNT_DELETION_AD1_REQUEST_FOUNDATION_DRAFT.sql
-- Date: 2026-08-17
-- REVIEW-ONLY DRAFT. Do not apply to any database from this path.
-- No client mutation RPC, cleanup worker, auth deletion, or object deletion is included.

BEGIN;

CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  active_actor_id uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  subject_ref_hash text NOT NULL,
  idempotency_hash text NOT NULL,
  account_kind text NOT NULL,
  status text NOT NULL DEFAULT 'requested',
  preflight_resolution text NOT NULL,
  policy_revision text NOT NULL,
  safe_error_code text,
  retry_count integer NOT NULL DEFAULT 0,
  lease_token_hash text,
  lease_expires_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  identity_confirmed_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT account_deletion_subject_hash_check
    CHECK (subject_ref_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT account_deletion_idempotency_hash_check
    CHECK (idempotency_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT account_deletion_kind_check CHECK (account_kind IN ('owner', 'staff')),
  CONSTRAINT account_deletion_status_check CHECK (status IN (
    'requested', 'identity_confirmed', 'processing', 'failed_retryable',
    'manual_review', 'cancelled', 'completed'
  )),
  CONSTRAINT account_deletion_preflight_check CHECK (preflight_resolution IN (
    'clean', 'sync_confirmed', 'export_confirmed', 'discard_confirmed'
  )),
  CONSTRAINT account_deletion_policy_revision_check
    CHECK (policy_revision = '2026-08-17'),
  CONSTRAINT account_deletion_error_code_check CHECK (
    safe_error_code IS NULL
    OR safe_error_code ~ '^[a-z0-9_]{1,64}$'
  ),
  CONSTRAINT account_deletion_retry_count_check CHECK (retry_count BETWEEN 0 AND 100),
  CONSTRAINT account_deletion_lease_shape_check CHECK (
    (lease_token_hash IS NULL AND lease_expires_at IS NULL)
    OR (
      lease_token_hash ~ '^[0-9a-f]{64}$'
      AND lease_expires_at IS NOT NULL
      AND status IN ('processing', 'failed_retryable')
    )
  ),
  CONSTRAINT account_deletion_terminal_shape_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND active_actor_id IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR status NOT IN ('completed', 'cancelled')
  ),
  CONSTRAINT account_deletion_no_terminal_lease_check CHECK (
    status NOT IN ('completed', 'cancelled')
    OR (lease_token_hash IS NULL AND lease_expires_at IS NULL)
  ),
  CONSTRAINT account_deletion_idempotency_key UNIQUE (idempotency_hash)
);

CREATE UNIQUE INDEX account_deletion_one_active_actor
  ON public.account_deletion_requests(active_actor_id)
  WHERE active_actor_id IS NOT NULL
    AND status IN ('requested', 'identity_confirmed', 'processing', 'failed_retryable', 'manual_review');

CREATE TABLE public.account_deletion_cleanup_steps (
  request_id uuid NOT NULL
    REFERENCES public.account_deletion_requests(id) ON DELETE RESTRICT,
  step_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  affected_count integer NOT NULL DEFAULT 0,
  evidence_hash text,
  safe_error_code text,
  attempt_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  completed_at timestamptz,
  PRIMARY KEY (request_id, step_code),
  CONSTRAINT account_deletion_step_code_check CHECK (step_code IN (
    'access_frozen', 'staff_access_revoked', 'staff_attribution_anonymized',
    'object_manifest_built', 'r2_objects_deleted', 'r2_absence_verified',
    'billing_identity_detached', 'operational_data_cleaned', 'profile_deleted',
    'auth_user_deleted', 'sessions_revoked'
  )),
  CONSTRAINT account_deletion_step_status_check CHECK (status IN (
    'pending', 'processing', 'failed_retryable', 'manual_review', 'completed'
  )),
  CONSTRAINT account_deletion_step_count_check
    CHECK (affected_count BETWEEN 0 AND 2147483647),
  CONSTRAINT account_deletion_step_attempt_check CHECK (attempt_count BETWEEN 0 AND 100),
  CONSTRAINT account_deletion_step_evidence_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND evidence_hash ~ '^[0-9a-f]{64}$')
    OR status <> 'completed'
  ),
  CONSTRAINT account_deletion_step_error_code_check CHECK (
    safe_error_code IS NULL OR safe_error_code ~ '^[a-z0-9_]{1,64}$'
  )
);

CREATE TABLE public.account_deletion_transition_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL
    REFERENCES public.account_deletion_requests(id) ON DELETE RESTRICT,
  from_status text,
  to_status text NOT NULL,
  reason_code text NOT NULL,
  evidence_hash text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT account_deletion_audit_reason_check
    CHECK (reason_code ~ '^[a-z0-9_]{1,64}$'),
  CONSTRAINT account_deletion_audit_evidence_check
    CHECK (evidence_hash ~ '^[0-9a-f]{64}$')
);

CREATE OR REPLACE FUNCTION public.enforce_account_deletion_request_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_required_steps text[];
BEGIN
  IF OLD.subject_ref_hash <> NEW.subject_ref_hash
    OR OLD.idempotency_hash <> NEW.idempotency_hash
    OR OLD.account_kind <> NEW.account_kind
    OR OLD.preflight_resolution <> NEW.preflight_resolution
    OR OLD.policy_revision <> NEW.policy_revision
  THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'account_deletion_identity_immutable';
  END IF;

  IF OLD.status IN ('cancelled', 'completed') AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'account_deletion_terminal_state';
  END IF;

  IF NEW.status <> OLD.status AND NOT (
    (OLD.status = 'requested' AND NEW.status IN ('identity_confirmed', 'cancelled'))
    OR (OLD.status = 'identity_confirmed' AND NEW.status IN ('processing', 'cancelled'))
    OR (OLD.status = 'processing' AND NEW.status IN ('failed_retryable', 'manual_review', 'completed'))
    OR (OLD.status = 'failed_retryable' AND NEW.status IN ('processing', 'manual_review'))
    OR (OLD.status = 'manual_review' AND NEW.status IN ('processing', 'completed'))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'account_deletion_transition_invalid';
  END IF;

  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    v_required_steps := CASE NEW.account_kind
      WHEN 'owner' THEN ARRAY[
        'access_frozen', 'staff_access_revoked', 'object_manifest_built',
        'r2_objects_deleted', 'r2_absence_verified', 'billing_identity_detached',
        'operational_data_cleaned', 'profile_deleted', 'auth_user_deleted',
        'sessions_revoked'
      ]::text[]
      ELSE ARRAY[
        'access_frozen', 'staff_access_revoked', 'staff_attribution_anonymized',
        'operational_data_cleaned', 'profile_deleted', 'auth_user_deleted',
        'sessions_revoked'
      ]::text[]
    END;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(v_required_steps) AS required(step_code)
      WHERE NOT EXISTS (
        SELECT 1
        FROM public.account_deletion_cleanup_steps AS step
        WHERE step.request_id = NEW.id
          AND step.step_code = required.step_code
          AND step.status = 'completed'
          AND step.evidence_hash ~ '^[0-9a-f]{64}$'
      )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'account_deletion_completion_incomplete';
    END IF;
  END IF;

  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_account_deletion_request_transition
BEFORE UPDATE ON public.account_deletion_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_account_deletion_request_transition();

CREATE OR REPLACE FUNCTION public.prevent_account_deletion_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'account_deletion_audit_immutable';
END;
$$;

CREATE TRIGGER prevent_account_deletion_audit_mutation
BEFORE UPDATE OR DELETE ON public.account_deletion_transition_audit
FOR EACH ROW EXECUTE FUNCTION public.prevent_account_deletion_audit_mutation();

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_cleanup_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_transition_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.account_deletion_requests
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.account_deletion_cleanup_steps
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.account_deletion_transition_audit
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.enforce_account_deletion_request_transition()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_account_deletion_audit_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

-- AD2 cutover requirement, intentionally not executed by AD1:
-- REVOKE EXECUTE ON FUNCTION public.delete_current_user_app_data() FROM authenticated;
-- The replacement server route must be deployed and verified before this revoke is applied.

ROLLBACK;
