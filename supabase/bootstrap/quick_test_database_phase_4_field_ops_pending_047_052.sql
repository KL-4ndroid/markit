-- Féria quick test database phase 4: field ops and pending operations 047-052
-- Intended only for a new/empty or disposable Supabase staging/local test project.
-- Do NOT run on production or on a database that contains real user data.
-- Sanitized for quick bootstrap: removed COMMENT ON statements and replaced RAISE NOTICE with NULL;
-- Generated at: 2026-06-23 02:01:36 +08:00

set check_function_bodies = off;

-- ============================================================
-- BEGIN SOURCE: 047_add_note_checklist_event_types.sql
-- ============================================================

-- Migration: 047_add_note_checklist_event_types
-- Date: 2026-06-20
-- Purpose:
--   Allow market-scoped Field notes and Checklist events to sync to Supabase.
--
-- Safety notes:
--   - This migration only updates the events.type CHECK constraint.
--   - It does not change RLS policies.
--   - It does not widen staff base-table SELECT access.
--   - staff_accessible_events already exposes market-scoped events through
--     the events -> markets -> staff_relationships branch.

ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;

ALTER TABLE public.events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    -- Market events
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',

    -- Product events
    'product_created',
    'product_updated',
    'product_deleted',

    -- Interaction and deal events
    'interaction_recorded',
    'interaction_deleted',
    'deal_closed',
    'deal_deleted',

    -- Field notes
    'field_note_created',
    'field_note_updated',
    'field_note_deleted',

    -- Checklist
    'checklist_item_created',
    'checklist_item_updated',
    'checklist_item_deleted',

    -- Settings
    'settings_updated'
  )
);



-- ============================================================
-- END SOURCE: 047_add_note_checklist_event_types.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 048_add_pending_operations_schema.sql
-- ============================================================

-- ============================================================
-- Gate D2a: pending_operations schema draft
-- Migration: 048_add_pending_operations_schema.sql
-- Date: 2026-06-21
--
-- Scope:
--   - Add the cloud table shape for future pending-operation pilots.
--   - Add conservative RLS policies and indexes.
--   - Do NOT route any production writes through this table.
--   - Do NOT change events, sync, cache replacement, projections, or UI.
--
-- Approved pilot domain for future discussion only:
--   - field notes
--   - checklist items
--
-- Rollback:
--   - If this migration has been applied but no production code is writing
--     to the table, rollback is simply:
--       DROP TABLE IF EXISTS public.pending_operations;
--   - If future production write routing is later approved and rows exist,
--     do not drop the table until queued rows are drained, ignored by flag,
--     or exported according to the Gate D decision record.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pending_operations (
  operation_id TEXT PRIMARY KEY CHECK (length(trim(operation_id)) > 0),
  operation_type TEXT NOT NULL CHECK (
    operation_type IN (
      'field_note_create',
      'field_note_update',
      'field_note_delete',
      'checklist_item_create',
      'checklist_item_update',
      'checklist_item_delete',
      'checklist_item_toggle'
    )
  ),
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('field_note', 'checklist_item')
  ),
  entity_id TEXT NOT NULL CHECK (length(trim(entity_id)) > 0),
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  payload JSONB NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  idempotency_key TEXT NOT NULL CHECK (length(trim(idempotency_key)) > 0),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_snapshot JSONB NOT NULL CHECK (jsonb_typeof(role_snapshot) = 'object'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'processing',
      'synced',
      'failed_retryable',
      'failed_permanent',
      'blocked_permission'
    )
  ),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A single actor must not enqueue the same logical operation twice.
CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_operations_actor_idempotency
ON public.pending_operations(actor_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_pending_operations_actor_status
ON public.pending_operations(actor_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_pending_operations_market_status
ON public.pending_operations(market_id, status, created_at);

DROP TRIGGER IF EXISTS update_pending_operations_updated_at ON public.pending_operations;
CREATE TRIGGER update_pending_operations_updated_at
  BEFORE UPDATE ON public.pending_operations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.pending_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pending_operations_select_actor_or_owner" ON public.pending_operations;
CREATE POLICY "pending_operations_select_actor_or_owner"
ON public.pending_operations FOR SELECT
TO authenticated
USING (
  actor_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.markets m
    WHERE m.id = pending_operations.market_id
      AND m.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "pending_operations_insert_actor_market_member" ON public.pending_operations;
CREATE POLICY "pending_operations_insert_actor_market_member"
ON public.pending_operations FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1
      FROM public.markets m
      WHERE m.id = pending_operations.market_id
        AND m.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.markets m
      JOIN public.staff_relationships sr
        ON sr.owner_id = m.owner_id
      WHERE m.id = pending_operations.market_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "pending_operations_update_actor_only" ON public.pending_operations;
CREATE POLICY "pending_operations_update_actor_only"
ON public.pending_operations FOR UPDATE
TO authenticated
USING (
  actor_id = auth.uid()
)
WITH CHECK (
  actor_id = auth.uid()
);

REVOKE ALL ON TABLE public.pending_operations FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.pending_operations TO authenticated;
REVOKE DELETE ON TABLE public.pending_operations FROM authenticated;





-- Verification notes:
-- 1. This migration must not be paired with production write routing.
-- 2. No DELETE policy is created. Cleanup/retention requires a later explicit Gate D approval.
-- 3. Owner visibility is SELECT-only through market ownership; owners cannot mutate staff rows through user RLS.
-- 4. Future service-role workers may bypass RLS, but must be separately approved and tested.

-- ============================================================
-- END SOURCE: 048_add_pending_operations_schema.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 049_enqueue_checklist_toggle_pending_operation.sql
-- ============================================================

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


REVOKE ALL ON FUNCTION public.enqueue_checklist_toggle_pending_operation(TEXT, UUID, TEXT, BOOLEAN, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enqueue_checklist_toggle_pending_operation(TEXT, UUID, TEXT, BOOLEAN, TEXT)
  TO authenticated;

-- ============================================================
-- END SOURCE: 049_enqueue_checklist_toggle_pending_operation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 050_drain_checklist_toggle_pending_operation.sql
-- ============================================================

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


REVOKE ALL ON FUNCTION public.drain_checklist_toggle_pending_operation(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.drain_checklist_toggle_pending_operation(TEXT)
  TO authenticated;

-- ============================================================
-- END SOURCE: 050_drain_checklist_toggle_pending_operation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 051_list_owner_pending_operation_diagnostics.sql
-- ============================================================

-- ============================================================
-- Gate D3c-2f: owner-only pending-operation diagnostics read RPC
-- Migration: 051_list_owner_pending_operation_diagnostics.sql
-- Date: 2026-06-22
--
-- Scope:
--   - Add one read-only SECURITY DEFINER RPC for owner diagnostics.
--   - Return an explicit, redacted diagnostics column list.
--   - Restrict results to markets owned by auth.uid().
--   - Keep runtime, UI, flags, RLS policies, cache replacement, revenue,
--     inventory, market, product, retry, drain, cleanup, and worker
--     behavior unchanged.
--
-- Not in scope:
--   - No UI or runtime caller.
--   - No staff diagnostics inbox.
--   - No retry, drain, update, delete, cleanup, recovery, or worker action.
--   - No table, policy, view, trigger, event, or feature-flag change.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.list_owner_pending_operation_diagnostics(UUID);
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_owner_pending_operation_diagnostics(
  p_owner_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  operation_id TEXT,
  operation_type TEXT,
  entity_type TEXT,
  entity_id TEXT,
  market_id UUID,
  status TEXT,
  retry_count INTEGER,
  actor_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  safe_metadata JSONB,
  age_bucket TEXT,
  state_group TEXT,
  final_event_id UUID,
  final_event_type TEXT,
  has_final_event BOOLEAN,
  final_event_mismatch BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_owner_id UUID := COALESCE(p_owner_id, auth.uid());
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.'
      USING ERRCODE = '42501';
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'owner_id is required.'
      USING ERRCODE = '22023';
  END IF;

  IF v_owner_id <> v_actor_id THEN
    RAISE EXCEPTION 'Owner diagnostics can only be read by the authenticated owner.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    po.operation_id,
    po.operation_type,
    po.entity_type,
    po.entity_id,
    po.market_id,
    po.status,
    po.retry_count,
    po.actor_id,
    po.created_at,
    po.updated_at,
    po.last_error_code,
    po.last_error_message,
    jsonb_strip_nulls(jsonb_build_object(
      'source', e.metadata->>'source',
      'idempotencyKey', e.metadata->>'idempotencyKey',
      'pendingOperationId', e.metadata->>'pendingOperationId',
      'drainedAt', e.metadata->>'drainedAt'
    )) AS safe_metadata,
    CASE
      WHEN NOW() - po.updated_at < INTERVAL '15 minutes' THEN 'fresh'
      WHEN NOW() - po.updated_at < INTERVAL '1 hour' THEN 'recent'
      WHEN NOW() - po.updated_at < INTERVAL '1 day' THEN 'stale'
      ELSE 'old'
    END AS age_bucket,
    CASE
      WHEN po.status = 'synced' THEN 'healthy'
      WHEN po.status IN ('failed_retryable', 'blocked_permission', 'failed_permanent') THEN 'needs_attention'
      WHEN po.status IN ('pending', 'processing') THEN 'in_progress'
      ELSE 'unknown'
    END AS state_group,
    e.id AS final_event_id,
    e.type AS final_event_type,
    e.id IS NOT NULL AS has_final_event,
    CASE
      WHEN e.id IS NULL THEN FALSE
      WHEN po.status = 'synced'
        AND e.type = 'checklist_item_updated'
        AND e.actor_id = po.actor_id
        AND e.market_id = po.market_id
      THEN FALSE
      ELSE TRUE
    END AS final_event_mismatch
  FROM public.pending_operations po
  JOIN public.markets m
    ON m.id = po.market_id
  LEFT JOIN public.events e
    ON e.id = CASE
      WHEN po.operation_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN po.operation_id::UUID
      ELSE NULL
    END
  WHERE m.owner_id = v_owner_id
  ORDER BY po.updated_at DESC, po.created_at DESC
  LIMIT 100;
END;
$$;


REVOKE ALL ON FUNCTION public.list_owner_pending_operation_diagnostics(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_owner_pending_operation_diagnostics(UUID)
  TO authenticated;

-- ============================================================
-- END SOURCE: 051_list_owner_pending_operation_diagnostics.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 052_recover_stale_processing_pending_operation.sql
-- ============================================================

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


REVOKE ALL ON FUNCTION public.recover_stale_processing_pending_operation(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recover_stale_processing_pending_operation(TEXT)
  TO authenticated;

-- ============================================================
-- END SOURCE: 052_recover_stale_processing_pending_operation.sql
-- ============================================================
