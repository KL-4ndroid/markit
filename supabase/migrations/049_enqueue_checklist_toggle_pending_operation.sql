-- ============================================================
-- Gate D3c-0: checklist toggle enqueue RPC draft
-- Migration: 049_enqueue_checklist_toggle_pending_operation.sql
-- Date: 2026-06-21
--
-- Scope:
--   - Add one narrow SECURITY DEFINER RPC for the future checklist
--     toggle pending-operation pilot.
--   - Validate the actor from auth.uid(), not from client payload.
--   - Validate owner or active operator/manager membership live.
--   - Keep the RPC disconnected from production runtime in this slice.
--
-- Not in scope:
--   - No UI or sync runtime connection.
--   - No field note, checklist text, revenue, inventory, market, or
--     product routing.
--   - No policy/table/view/event changes.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.enqueue_checklist_toggle_pending_operation(
--     TEXT,
--     UUID,
--     TEXT,
--     BOOLEAN,
--     TEXT
--   );
-- ============================================================

CREATE OR REPLACE FUNCTION public.enqueue_checklist_toggle_pending_operation(
  p_operation_id TEXT,
  p_market_id UUID,
  p_item_id TEXT,
  p_completed BOOLEAN,
  p_idempotency_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_operation_id TEXT := trim(COALESCE(p_operation_id, ''));
  v_item_id TEXT := trim(COALESCE(p_item_id, ''));
  v_idempotency_key TEXT := trim(COALESCE(p_idempotency_key, ''));
  v_is_owner BOOLEAN := FALSE;
  v_staff_role TEXT;
  v_role_snapshot JSONB;
  v_payload JSONB;
  v_inserted_operation_id TEXT;
  v_existing_operation_id TEXT;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF v_operation_id = '' THEN
    RAISE EXCEPTION 'operation_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_market_id IS NULL THEN
    RAISE EXCEPTION 'market_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF v_item_id = '' THEN
    RAISE EXCEPTION 'item_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_completed IS NULL THEN
    RAISE EXCEPTION 'completed is required.'
      USING ERRCODE = '22023';
  END IF;

  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'idempotency_key is required.'
      USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = p_market_id
      AND m.owner_id = v_actor_id
  )
  INTO v_is_owner;

  IF v_is_owner THEN
    v_role_snapshot := jsonb_build_object(
      'isOwner', true,
      'staffRole', NULL,
      'capabilities', jsonb_build_array('canToggleChecklistItem')
    );
  ELSE
    SELECT sr.role
    INTO v_staff_role
    FROM public.markets m
    JOIN public.staff_relationships sr
      ON sr.owner_id = m.owner_id
    WHERE m.id = p_market_id
      AND sr.staff_id = v_actor_id
      AND sr.status = 'active'
    LIMIT 1;

    IF v_staff_role IS NULL OR v_staff_role NOT IN ('operator', 'manager') THEN
      RAISE EXCEPTION 'Not authorized to toggle checklist items for this market.'
        USING ERRCODE = '42501';
    END IF;

    v_role_snapshot := jsonb_build_object(
      'isOwner', false,
      'staffRole', v_staff_role,
      'capabilities', jsonb_build_array('canToggleChecklistItem')
    );
  END IF;

  v_payload := jsonb_build_object(
    'market_id', p_market_id::TEXT,
    'itemId', v_item_id,
    'completed', p_completed
  );

  INSERT INTO public.pending_operations (
    operation_id,
    operation_type,
    entity_type,
    entity_id,
    market_id,
    payload,
    idempotency_key,
    actor_id,
    role_snapshot,
    status,
    retry_count,
    last_error_code,
    last_error_message
  )
  VALUES (
    v_operation_id,
    'checklist_item_toggle',
    'checklist_item',
    v_item_id,
    p_market_id,
    v_payload,
    v_idempotency_key,
    v_actor_id,
    v_role_snapshot,
    'pending',
    0,
    NULL,
    NULL
  )
  ON CONFLICT (actor_id, idempotency_key) DO NOTHING
  RETURNING operation_id INTO v_inserted_operation_id;

  IF v_inserted_operation_id IS NOT NULL THEN
    RETURN v_inserted_operation_id;
  END IF;

  SELECT po.operation_id
  INTO v_existing_operation_id
  FROM public.pending_operations po
  WHERE po.actor_id = v_actor_id
    AND po.idempotency_key = v_idempotency_key
    AND po.operation_type = 'checklist_item_toggle'
    AND po.entity_type = 'checklist_item'
    AND po.entity_id = v_item_id
    AND po.market_id = p_market_id
    AND po.payload = v_payload;

  IF v_existing_operation_id IS NOT NULL THEN
    RETURN v_existing_operation_id;
  END IF;

  RAISE EXCEPTION 'Idempotency key already used for a different pending operation.'
    USING ERRCODE = '23505';
END;
$$;

COMMENT ON FUNCTION public.enqueue_checklist_toggle_pending_operation(TEXT, UUID, TEXT, BOOLEAN, TEXT) IS
  'Gate D3c-0 draft RPC. Enqueues checklist toggle pending operations after live owner/operator/manager validation. Not connected to production runtime by this migration.';

REVOKE ALL ON FUNCTION public.enqueue_checklist_toggle_pending_operation(TEXT, UUID, TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_checklist_toggle_pending_operation(TEXT, UUID, TEXT, BOOLEAN, TEXT)
  TO authenticated;
