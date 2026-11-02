-- Local-only request workflow on top of the existing 071 foundation.
-- NOT a remote migration. Normal execution rolls back. No cleanup or auth/R2 writes.
BEGIN;

CREATE OR REPLACE FUNCTION public.bff_read_account_deletion_request(p_actor_id uuid)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at,
    CASE WHEN r.status = 'failed_retryable' THEN r.lease_expires_at ELSE NULL END
  FROM public.account_deletion_requests r
  WHERE r.active_actor_id = p_actor_id
  ORDER BY r.requested_at DESC, r.id DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.bff_confirm_account_deletion_request(
  p_actor_id uuid, p_request_id uuid, p_expected_status text)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.account_deletion_requests r
    WHERE r.id = p_request_id AND r.active_actor_id = p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'account_deletion_not_found'; END IF;
  IF p_expected_status IS DISTINCT FROM 'requested' OR v_row.status NOT IN ('requested', 'identity_confirmed')
    OR v_row.lease_token_hash IS NOT NULL OR v_row.lease_expires_at IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.account_deletion_cleanup_steps s WHERE s.request_id = v_row.id AND s.status <> 'pending')
  THEN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'account_deletion_conflict'; END IF;
  IF v_row.status = 'requested' THEN
    UPDATE public.account_deletion_requests r SET status = 'identity_confirmed', identity_confirmed_at = pg_catalog.clock_timestamp()
      WHERE r.id = p_request_id;
  END IF;
  RETURN QUERY SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at, NULL::timestamptz
    FROM public.account_deletion_requests r WHERE r.id = p_request_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_cancel_account_deletion_request(
  p_actor_id uuid, p_request_id uuid, p_expected_status text)
RETURNS TABLE (request_id uuid, status text, safe_error_code text, requested_at timestamptz,
  updated_at timestamptz, next_action_after timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row public.account_deletion_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.account_deletion_requests r
    WHERE r.id = p_request_id AND r.active_actor_id = p_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'account_deletion_not_found'; END IF;
  IF p_expected_status IS NULL OR p_expected_status NOT IN ('requested', 'identity_confirmed')
    OR v_row.lease_token_hash IS NOT NULL OR v_row.lease_expires_at IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.account_deletion_cleanup_steps s WHERE s.request_id = v_row.id AND s.status <> 'pending')
    OR (v_row.status <> 'cancelled' AND v_row.status IS DISTINCT FROM p_expected_status)
  THEN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'account_deletion_conflict'; END IF;
  IF v_row.status <> 'cancelled' THEN
    UPDATE public.account_deletion_requests r SET status = 'cancelled', cancelled_at = pg_catalog.clock_timestamp(), safe_error_code = NULL
      WHERE r.id = p_request_id;
  END IF;
  RETURN QUERY SELECT r.id, r.status, r.safe_error_code, r.requested_at, r.updated_at, NULL::timestamptz
    FROM public.account_deletion_requests r WHERE r.id = p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.bff_confirm_account_deletion_request(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_cancel_account_deletion_request(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_confirm_account_deletion_request(uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_cancel_account_deletion_request(uuid, uuid, text) TO service_role;

ROLLBACK;
