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

COMMENT ON TABLE public.pending_operations IS
  'Gate D2a draft table for future pending write pilots. Not connected to production sync or UI by this migration.';

COMMENT ON COLUMN public.pending_operations.operation_id IS
  'Client-created operation id. TEXT is intentional so local-only models are not forced into a UUID format.';

COMMENT ON COLUMN public.pending_operations.idempotency_key IS
  'Logical de-duplication key. Unique per actor to prevent duplicate retries from creating duplicate cloud operations.';

COMMENT ON COLUMN public.pending_operations.role_snapshot IS
  'Role/capability snapshot captured when the operation was queued. Future routing must re-check live permissions before writing events.';

-- Verification notes:
-- 1. This migration must not be paired with production write routing.
-- 2. No DELETE policy is created. Cleanup/retention requires a later explicit Gate D approval.
-- 3. Owner visibility is SELECT-only through market ownership; owners cannot mutate staff rows through user RLS.
-- 4. Future service-role workers may bypass RLS, but must be separately approved and tested.
