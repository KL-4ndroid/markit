-- ============================================================
-- Gate D3c-2i: stale processing single-operation recovery RPC draft
-- Migration: 052_recover_stale_processing_pending_operation.sql
-- Date: 2026-06-22
--
-- Scope:
--   - Add one narrow SECURITY DEFINER RPC that recovers exactly one
--     stale processing pending operation.
--   - Restrict recovery to the owner of the pending operation's market.
--   - Inspect any existing final event before changing pending state.
--   - Keep runtime, UI, flags, RLS policies, cache replacement, revenue,
--     inventory, market, product, drain, retry execution, cleanup, and
--     worker behavior unchanged.
--
-- Not in scope:
--   - No runtime caller.
--   - No UI action.
--   - No event creation.
--   - No drain, retry, cleanup, batch worker, table, policy, view,
--     trigger, or feature-flag change.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.recover_stale_processing_pending_operation(TEXT);
-- ============================================================

CREATE OR REPLACE FUNCTION public.recover_stale_processing_pending_operation(
  p_operation_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''));
  v_operation public.pending_operations%ROWTYPE;
  v_event_id UUID;
  v_existing_event RECORD;
  v_is_owner BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation_id = '' THEN
    RAISE EXCEPTION 'operation_id is required.'
      USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_operation
  FROM public.pending_operations po
  WHERE po.operation_id = v_operation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending operation not found.'
      USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = v_operation.market_id
      AND m.owner_id = v_actor_id
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Only the market owner can recover stale processing pending operations.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation.status <> 'processing' THEN
    RAISE EXCEPTION 'Only processing pending operations can be recovered.'
      USING ERRCODE = '22023';
  END IF;

  IF v_operation.updated_at >= NOW() - INTERVAL '15 minutes' THEN
    RAISE EXCEPTION 'Processing pending operation is not stale.'
      USING ERRCODE = '22023';
  END IF;

  IF v_operation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_event_id := v_operation_id::UUID;

    SELECT
      e.type,
      e.payload,
      e.actor_id,
      e.market_id
    INTO v_existing_event
    FROM public.events e
    WHERE e.id = v_event_id;

    IF FOUND THEN
      IF v_operation.operation_type = 'checklist_item_toggle'
        AND v_operation.entity_type = 'checklist_item'
        AND v_existing_event.type = 'checklist_item_updated'
        AND v_existing_event.payload = v_operation.payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = 'synced',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;

        RETURN 'synced';
      END IF;

      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'event_id_collision',
        last_error_message = 'A different event already uses this operation_id'
      WHERE operation_id = v_operation_id;

      RETURN 'failed_permanent';
    END IF;
  END IF;

  UPDATE public.pending_operations
  SET
    status = 'failed_retryable',
    retry_count = retry_count + 1,
    last_error_code = 'stale_processing_reset',
    last_error_message = 'Stale processing operation reset to retryable without draining'
  WHERE operation_id = v_operation_id;

  RETURN 'failed_retryable';
END;
$$;

COMMENT ON FUNCTION public.recover_stale_processing_pending_operation(TEXT) IS
  'Gate D3c-2i draft RPC. Owner-only single-row stale processing recovery for pending_operations. It updates pending state only and does not create events, drain, retry, cleanup, or run workers.';

REVOKE ALL ON FUNCTION public.recover_stale_processing_pending_operation(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recover_stale_processing_pending_operation(TEXT)
  TO authenticated;
