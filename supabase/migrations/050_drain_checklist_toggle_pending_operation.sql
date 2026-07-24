-- ============================================================
-- Gate D3c-2b: checklist toggle single-operation drain RPC draft
-- Migration: 050_drain_checklist_toggle_pending_operation.sql
-- Date: 2026-06-21
--
-- Scope:
--   - Add one narrow SECURITY DEFINER RPC that drains exactly one
--     checklist toggle pending operation into one final event.
--   - Re-check the actor from auth.uid().
--   - Re-check live owner/operator/manager permission.
--   - Keep runtime, UI, flags, RLS policies, cache replacement, revenue,
--     inventory, market, and product behavior unchanged.
--
-- Not in scope:
--   - No runtime caller.
--   - No batch worker.
--   - No table, policy, view, trigger, or feature-flag change.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.drain_checklist_toggle_pending_operation(TEXT);
-- ============================================================

CREATE OR REPLACE FUNCTION public.drain_checklist_toggle_pending_operation(
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
  v_payload JSONB;
  v_item_id TEXT;
  v_event_id UUID;
  v_inserted_event_id UUID;
  v_is_authorized BOOLEAN := FALSE;
  v_staff_role TEXT;
  v_existing_event RECORD;
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

  IF v_operation.actor_id <> v_actor_id THEN
    RAISE EXCEPTION 'Not authorized to drain this pending operation.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation.status IN (
    'synced',
    'processing',
    'blocked_permission',
    'failed_permanent'
  ) THEN
    RETURN v_operation.status;
  END IF;

  IF v_operation.status NOT IN ('pending', 'failed_retryable') THEN
    RETURN v_operation.status;
  END IF;

  UPDATE public.pending_operations
  SET
    status = 'processing',
    last_error_code = NULL,
    last_error_message = NULL
  WHERE operation_id = v_operation_id;

  BEGIN
    IF v_operation_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'invalid_operation_id',
        last_error_message = 'operation_id must be a UUID to become an event id'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    v_event_id := v_operation_id::UUID;

    IF v_operation.operation_type <> 'checklist_item_toggle'
      OR v_operation.entity_type <> 'checklist_item'
    THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'unsupported_operation',
        last_error_message = 'Only checklist_item_toggle can be drained by this RPC'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    v_payload := v_operation.payload;

    IF jsonb_typeof(v_payload) <> 'object'
      OR v_payload->>'market_id' IS DISTINCT FROM v_operation.market_id::TEXT
      OR jsonb_typeof(v_payload->'completed') <> 'boolean'
      OR v_payload ? 'text'
    THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'invalid_payload',
        last_error_message = 'Checklist toggle payload must be completed-only and market-scoped'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    v_item_id := trim(COALESCE(v_payload->>'itemId', ''));

    IF v_item_id = ''
      OR v_operation.entity_id <> v_item_id
    THEN
      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'invalid_entity',
        last_error_message = 'Checklist toggle entity_id must match payload.itemId'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.markets m
      WHERE m.id = v_operation.market_id
        AND m.owner_id = v_operation.actor_id
    )
    INTO v_is_authorized;

    IF NOT v_is_authorized THEN
      SELECT sr.role
      INTO v_staff_role
      FROM public.markets m
      JOIN public.staff_relationships sr
        ON sr.owner_id = m.owner_id
      WHERE m.id = v_operation.market_id
        AND sr.staff_id = v_operation.actor_id
        AND sr.status = 'active'
      LIMIT 1;

      IF v_staff_role IS NULL OR v_staff_role NOT IN ('operator', 'manager') THEN
        UPDATE public.pending_operations
        SET
          status = 'blocked_permission',
          last_error_code = 'permission_denied',
          last_error_message = 'Actor no longer has checklist toggle permission'
        WHERE operation_id = v_operation_id;
        RETURN 'blocked_permission';
      END IF;
    END IF;

    SELECT
      e.type,
      e.payload,
      e.actor_id,
      e.market_id
    INTO v_existing_event
    FROM public.events e
    WHERE e.id = v_event_id;

    IF FOUND THEN
      IF v_existing_event.type = 'checklist_item_updated'
        AND v_existing_event.payload = v_payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = 'synced',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;
        RETURN v_event_id::TEXT;
      END IF;

      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'event_id_collision',
        last_error_message = 'A different event already uses this operation_id'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    INSERT INTO public.events (
      id,
      type,
      payload,
      actor_id,
      market_id,
      timestamp,
      metadata
    )
    VALUES (
      v_event_id,
      'checklist_item_updated',
      v_payload,
      v_operation.actor_id,
      v_operation.market_id,
      v_operation.created_at,
      jsonb_build_object(
        'source', 'pending_operations',
        'pendingOperationId', v_operation.operation_id,
        'idempotencyKey', v_operation.idempotency_key,
        'drainedAt', NOW()
      )
    )
    ON CONFLICT (id) DO NOTHING
    RETURNING id INTO v_inserted_event_id;

    IF v_inserted_event_id IS NULL THEN
      SELECT
        e.type,
        e.payload,
        e.actor_id,
        e.market_id
      INTO v_existing_event
      FROM public.events e
      WHERE e.id = v_event_id;

      IF FOUND
        AND v_existing_event.type = 'checklist_item_updated'
        AND v_existing_event.payload = v_payload
        AND v_existing_event.actor_id = v_operation.actor_id
        AND v_existing_event.market_id = v_operation.market_id
      THEN
        UPDATE public.pending_operations
        SET
          status = 'synced',
          last_error_code = NULL,
          last_error_message = NULL
        WHERE operation_id = v_operation_id;
        RETURN v_event_id::TEXT;
      END IF;

      UPDATE public.pending_operations
      SET
        status = 'failed_permanent',
        last_error_code = 'event_id_collision',
        last_error_message = 'A different event already uses this operation_id'
      WHERE operation_id = v_operation_id;
      RETURN 'failed_permanent';
    END IF;

    UPDATE public.pending_operations
    SET
      status = 'synced',
      last_error_code = NULL,
      last_error_message = NULL
    WHERE operation_id = v_operation_id;

    RETURN v_event_id::TEXT;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.pending_operations
    SET
      status = 'failed_retryable',
      retry_count = retry_count + 1,
      last_error_code = SQLSTATE,
      last_error_message = SQLERRM
    WHERE operation_id = v_operation_id;

    RETURN 'failed_retryable';
  END;
END;
$$;

COMMENT ON FUNCTION public.drain_checklist_toggle_pending_operation(TEXT) IS
  'Gate D3c-2b draft RPC. Drains one checklist toggle pending operation into one idempotent checklist_item_updated event after live permission validation. Not connected to production runtime by this migration.';

REVOKE ALL ON FUNCTION public.drain_checklist_toggle_pending_operation(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.drain_checklist_toggle_pending_operation(TEXT)
  TO authenticated;
