BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.account_deletion_requests (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  -- Deliberately not an FK: profile/auth deletion is a required step before this
  -- durable request can transition to completed and clear the actor reference.
  active_actor_id uuid,
  subject_ref_hash text NOT NULL CHECK (subject_ref_hash ~ '^[0-9a-f]{64}$'),
  idempotency_hash text NOT NULL UNIQUE CHECK (idempotency_hash ~ '^[0-9a-f]{64}$'),
  account_kind text NOT NULL CHECK (account_kind IN ('owner', 'staff')),
  status text NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'identity_confirmed', 'processing', 'failed_retryable',
    'manual_review', 'cancelled', 'completed'
  )),
  preflight_resolution text NOT NULL CHECK (preflight_resolution IN (
    'clean', 'sync_confirmed', 'export_confirmed', 'discard_confirmed'
  )),
  policy_revision text NOT NULL CHECK (policy_revision = '2026-08-17'),
  safe_error_code text CHECK (safe_error_code IS NULL OR safe_error_code ~ '^[a-z0-9_]{1,64}$'),
  retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count BETWEEN 0 AND 100),
  lease_token_hash text,
  lease_expires_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  identity_confirmed_at timestamptz,
  processing_started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT account_deletion_lease_shape_check CHECK (
    (lease_token_hash IS NULL AND lease_expires_at IS NULL)
    OR (lease_token_hash ~ '^[0-9a-f]{64}$' AND lease_expires_at IS NOT NULL
      AND status IN ('processing', 'failed_retryable', 'manual_review'))
  ),
  CONSTRAINT account_deletion_terminal_shape_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND active_actor_id IS NULL)
    OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
    OR status NOT IN ('completed', 'cancelled')
  ),
  CONSTRAINT account_deletion_no_terminal_lease_check CHECK (
    status NOT IN ('completed', 'cancelled')
    OR (lease_token_hash IS NULL AND lease_expires_at IS NULL)
  )
);

CREATE UNIQUE INDEX account_deletion_one_active_actor
  ON public.account_deletion_requests(active_actor_id)
  WHERE active_actor_id IS NOT NULL
    AND status IN ('requested', 'identity_confirmed', 'processing', 'failed_retryable', 'manual_review');

CREATE TABLE public.account_deletion_cleanup_steps (
  request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id) ON DELETE RESTRICT,
  step_code text NOT NULL CHECK (step_code IN (
    'access_frozen', 'staff_access_revoked', 'staff_attribution_anonymized',
    'object_manifest_built', 'r2_objects_deleted', 'r2_absence_verified',
    'billing_identity_detached', 'operational_data_cleaned', 'profile_deleted',
    'auth_user_deleted', 'sessions_revoked'
  )),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'failed_retryable', 'manual_review', 'completed'
  )),
  affected_count integer NOT NULL DEFAULT 0 CHECK (affected_count BETWEEN 0 AND 2147483647),
  evidence_hash text,
  safe_error_code text CHECK (safe_error_code IS NULL OR safe_error_code ~ '^[a-z0-9_]{1,64}$'),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  completed_at timestamptz,
  PRIMARY KEY (request_id, step_code),
  CONSTRAINT account_deletion_step_evidence_check CHECK (
    (status = 'completed' AND completed_at IS NOT NULL AND evidence_hash ~ '^[0-9a-f]{64}$')
    OR status <> 'completed'
  )
);

CREATE TABLE public.account_deletion_transition_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.account_deletion_requests(id) ON DELETE RESTRICT,
  from_status text,
  to_status text NOT NULL,
  reason_code text NOT NULL CHECK (reason_code ~ '^[a-z0-9_]{1,64}$'),
  evidence_hash text NOT NULL CHECK (evidence_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp()
);

CREATE OR REPLACE FUNCTION public.enforce_account_deletion_request_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_required_steps text[];
BEGIN
  IF OLD.subject_ref_hash <> NEW.subject_ref_hash OR OLD.idempotency_hash <> NEW.idempotency_hash
    OR OLD.account_kind <> NEW.account_kind OR OLD.preflight_resolution <> NEW.preflight_resolution
    OR OLD.policy_revision <> NEW.policy_revision THEN
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
    v_required_steps := CASE NEW.account_kind WHEN 'owner' THEN ARRAY[
      'access_frozen','staff_access_revoked','object_manifest_built','r2_objects_deleted',
      'r2_absence_verified','billing_identity_detached','operational_data_cleaned',
      'profile_deleted','auth_user_deleted','sessions_revoked'
    ]::text[] ELSE ARRAY[
      'access_frozen','staff_access_revoked','staff_attribution_anonymized',
      'operational_data_cleaned','profile_deleted','auth_user_deleted','sessions_revoked'
    ]::text[] END;
    IF EXISTS (
      SELECT 1 FROM pg_catalog.unnest(v_required_steps) AS required(step_code)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.account_deletion_cleanup_steps step
        WHERE step.request_id = NEW.id AND step.step_code = required.step_code
          AND step.status = 'completed' AND step.evidence_hash ~ '^[0-9a-f]{64}$'
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
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'account_deletion_audit_immutable';
END;
$$;

CREATE TRIGGER prevent_account_deletion_audit_mutation
BEFORE UPDATE OR DELETE ON public.account_deletion_transition_audit
FOR EACH ROW EXECUTE FUNCTION public.prevent_account_deletion_audit_mutation();

CREATE OR REPLACE FUNCTION public.audit_account_deletion_request_transition()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.account_deletion_transition_audit(
      request_id, from_status, to_status, reason_code, evidence_hash)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      CASE WHEN TG_OP = 'INSERT' THEN 'request_created' ELSE 'status_transition' END,
      pg_catalog.encode(extensions.digest(
        NEW.id::text || ':' || CASE WHEN TG_OP = 'INSERT' THEN '' ELSE OLD.status END
          || ':' || NEW.status || ':' || NEW.updated_at::text,
        'sha256'
      ), 'hex')
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_account_deletion_request_transition
AFTER INSERT OR UPDATE OF status ON public.account_deletion_requests
FOR EACH ROW EXECUTE FUNCTION public.audit_account_deletion_request_transition();

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_cleanup_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_deletion_transition_audit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.account_deletion_requests FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.account_deletion_cleanup_steps FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.account_deletion_transition_audit FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.bff_read_account_deletion_request(p_actor_id uuid)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at,
    CASE WHEN r.status = 'failed_retryable' THEN r.lease_expires_at ELSE NULL END
  FROM public.account_deletion_requests r
  WHERE r.active_actor_id = p_actor_id
    AND r.status IN ('requested','identity_confirmed','processing','failed_retryable','manual_review')
  ORDER BY r.requested_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.bff_create_account_deletion_request(
  p_actor_id uuid, p_subject_ref_hash text, p_idempotency_hash text,
  p_policy_revision text, p_preflight_resolution text)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_request_id uuid; v_kind text; v_existing_actor uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = p_actor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'account_deletion_actor_invalid';
  END IF;
  v_kind := CASE WHEN EXISTS (SELECT 1 FROM public.markets m WHERE m.owner_id = p_actor_id)
    OR EXISTS (SELECT 1 FROM public.subscription_accounts s WHERE s.owner_id = p_actor_id)
    OR EXISTS (SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id = p_actor_id)
    THEN 'owner'
    WHEN EXISTS (SELECT 1 FROM public.staff_relationships sr WHERE sr.staff_id = p_actor_id)
    THEN 'staff'
    ELSE 'owner' END;
  INSERT INTO public.account_deletion_requests (
    active_actor_id, subject_ref_hash, idempotency_hash, account_kind,
    preflight_resolution, policy_revision)
  VALUES (p_actor_id, p_subject_ref_hash, p_idempotency_hash, v_kind,
    p_preflight_resolution, p_policy_revision)
  ON CONFLICT (idempotency_hash) DO UPDATE SET updated_at = pg_catalog.clock_timestamp()
  RETURNING id, active_actor_id INTO v_request_id, v_existing_actor;
  IF v_existing_actor IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'account_deletion_idempotency_conflict';
  END IF;
  INSERT INTO public.account_deletion_cleanup_steps(request_id, step_code)
  SELECT v_request_id, step_code FROM pg_catalog.unnest(
    CASE v_kind WHEN 'owner' THEN ARRAY[
      'access_frozen','staff_access_revoked','object_manifest_built','r2_objects_deleted',
      'r2_absence_verified','billing_identity_detached','operational_data_cleaned',
      'profile_deleted','auth_user_deleted','sessions_revoked'
    ]::text[] ELSE ARRAY[
      'access_frozen','staff_access_revoked','staff_attribution_anonymized',
      'operational_data_cleaned','profile_deleted','auth_user_deleted','sessions_revoked'
    ]::text[] END) step_code ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at, NULL::timestamptz
    FROM public.account_deletion_requests r WHERE r.id = v_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_claim_account_deletion_lease(
  p_request_id uuid, p_worker_id text, p_now timestamptz, p_lease_duration_seconds integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_token text := pg_catalog.gen_random_uuid()::text; v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  IF p_worker_id !~ '^[A-Za-z0-9._:-]{8,128}$' OR p_lease_duration_seconds NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'account_deletion_lease_invalid';
  END IF;
  UPDATE public.account_deletion_requests r SET status = 'processing',
    processing_started_at = COALESCE(r.processing_started_at, p_now),
    lease_token_hash = pg_catalog.encode(extensions.digest(v_token, 'sha256'), 'hex'),
    lease_expires_at = p_now + pg_catalog.make_interval(secs => p_lease_duration_seconds)
  WHERE r.id = p_request_id AND r.status IN ('identity_confirmed','processing','failed_retryable','manual_review')
    AND (r.lease_expires_at IS NULL OR r.lease_expires_at <= p_now)
  RETURNING r.* INTO v_row;
  IF NOT FOUND THEN RETURN pg_catalog.jsonb_build_object('claimed', false); END IF;
  RETURN pg_catalog.jsonb_build_object('claimed', true, 'leaseToken', v_token, 'snapshot',
    pg_catalog.jsonb_build_object('requestId', v_row.id, 'accountKind', v_row.account_kind,
      'requestStatus', v_row.status, 'identityConfirmed', v_row.identity_confirmed_at IS NOT NULL,
      'preflightResolution', v_row.preflight_resolution, 'steps', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('code', s.step_code, 'status', s.status,
          'affectedCount', s.affected_count, 'evidenceHash', s.evidence_hash) ORDER BY s.step_code)
        FROM public.account_deletion_cleanup_steps s WHERE s.request_id = v_row.id), '[]'::jsonb)));
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_record_account_deletion_step(
  p_request_id uuid, p_lease_token text, p_step_code text, p_outcome text,
  p_affected_count integer, p_evidence_hash text, p_safe_error_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests r WHERE r.id = p_request_id
    AND r.lease_token_hash = pg_catalog.encode(extensions.digest(p_lease_token, 'sha256'), 'hex')
    AND r.lease_expires_at > pg_catalog.clock_timestamp()) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'account_deletion_lease_lost';
  END IF;
  UPDATE public.account_deletion_cleanup_steps SET status = p_outcome,
    affected_count = COALESCE(p_affected_count, 0), evidence_hash = p_evidence_hash,
    safe_error_code = p_safe_error_code, attempt_count = attempt_count + 1,
    completed_at = CASE WHEN p_outcome = 'completed' THEN pg_catalog.clock_timestamp() ELSE NULL END,
    updated_at = pg_catalog.clock_timestamp()
  WHERE request_id = p_request_id AND step_code = p_step_code;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'account_deletion_step_invalid'; END IF;
  IF p_outcome IN ('failed_retryable', 'manual_review') THEN
    UPDATE public.account_deletion_requests SET status = p_outcome,
      safe_error_code = p_safe_error_code,
      retry_count = retry_count + CASE WHEN p_outcome = 'failed_retryable' THEN 1 ELSE 0 END
    WHERE id = p_request_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_finalize_account_deletion(p_request_id uuid, p_lease_token text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.account_deletion_requests r WHERE r.id = p_request_id
    AND r.lease_token_hash = pg_catalog.encode(extensions.digest(p_lease_token, 'sha256'), 'hex')
    AND r.lease_expires_at > pg_catalog.clock_timestamp()) THEN RETURN 'lease_lost'; END IF;
  BEGIN
    UPDATE public.account_deletion_requests SET status = 'completed', active_actor_id = NULL,
      completed_at = pg_catalog.clock_timestamp(), lease_token_hash = NULL, lease_expires_at = NULL
    WHERE id = p_request_id;
  EXCEPTION WHEN check_violation THEN RETURN 'incomplete'; END;
  RETURN 'completed';
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_release_account_deletion_lease(p_request_id uuid, p_lease_token text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.account_deletion_requests SET lease_token_hash = NULL, lease_expires_at = NULL
  WHERE id = p_request_id
    AND lease_token_hash = pg_catalog.encode(extensions.digest(p_lease_token, 'sha256'), 'hex');
$$;

REVOKE ALL ON FUNCTION public.enforce_account_deletion_request_transition() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prevent_account_deletion_audit_mutation() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_account_deletion_request_transition() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.bff_read_account_deletion_request(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_create_account_deletion_request(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_claim_account_deletion_lease(uuid,text,timestamptz,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_record_account_deletion_step(uuid,text,text,text,integer,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_finalize_account_deletion(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_release_account_deletion_lease(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_read_account_deletion_request(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_create_account_deletion_request(uuid,text,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_claim_account_deletion_lease(uuid,text,timestamptz,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_record_account_deletion_step(uuid,text,text,text,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_finalize_account_deletion(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_release_account_deletion_lease(uuid,text) TO service_role;

-- The legacy authenticated destructive RPC must not remain reachable after this server-only cutover.
REVOKE EXECUTE ON FUNCTION public.delete_current_user_app_data() FROM authenticated;

COMMIT;
