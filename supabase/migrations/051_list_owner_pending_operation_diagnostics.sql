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

COMMENT ON FUNCTION public.list_owner_pending_operation_diagnostics(UUID) IS
  'Gate D3c-2f draft RPC. Read-only owner diagnostics for pending_operations with explicit redacted columns. Not connected to runtime or UI by this migration.';

REVOKE ALL ON FUNCTION public.list_owner_pending_operation_diagnostics(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_owner_pending_operation_diagnostics(UUID)
  TO authenticated;
