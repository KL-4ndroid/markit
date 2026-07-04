-- ============================================================
-- 055_add_sales_photo_evidence_schema.sql
-- Date: 2026-07-04
--
-- Scope:
--   - Add sales photo evidence metadata schema.
--   - Add owner default and market-level requirement flags.
--   - Add conservative owner/staff RLS for metadata rows.
--   - Store R2 object keys only; no image binary data in Postgres.
--
-- Non-goals:
--   - Do not change deal_closed persistence or event type constraints.
--   - Do not add R2 upload/read runtime.
--   - Do not add UI or sales-flow behavior.
--   - Do not backfill existing sales.
-- ============================================================

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS default_sales_photo_evidence_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.user_settings.default_sales_photo_evidence_required IS
  'Owner default for whether newly created markets should require sales photo evidence. Does not mutate existing markets.';

ALTER TABLE public.markets
  ADD COLUMN IF NOT EXISTS sales_photo_evidence_required BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.markets.sales_photo_evidence_required IS
  'Market-level sales photo evidence requirement. Applies to future sales only.';

CREATE TABLE IF NOT EXISTS public.sale_photo_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  captured_by_staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (
    status IN (
      'not_required',
      'pending_capture',
      'capture_skipped',
      'captured_local',
      'uploading',
      'uploaded',
      'upload_failed',
      'expired',
      'waived_by_owner'
    )
  ),
  r2_object_key TEXT CHECK (
    r2_object_key IS NULL
    OR (
      r2_object_key LIKE 'sales-evidence/7d/%'
      AND r2_object_key NOT LIKE '%..%'
      AND r2_object_key NOT LIKE '%//%'
    )
  ),
  r2_thumbnail_key TEXT CHECK (
    r2_thumbnail_key IS NULL
    OR (
      r2_thumbnail_key LIKE 'sales-evidence-thumbs/7d/%'
      AND r2_thumbnail_key NOT LIKE '%..%'
      AND r2_thumbnail_key NOT LIKE '%//%'
    )
  ),
  mime_type TEXT CHECK (
    mime_type IS NULL OR mime_type IN ('image/webp', 'image/jpeg')
  ),
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  file_size_bytes INTEGER CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  content_hash TEXT,
  skipped_reason TEXT,
  failure_reason TEXT,
  sale_completed_at TIMESTAMPTZ NOT NULL,
  captured_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  waived_by_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  waived_reason TEXT,
  waived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (
    status <> 'waived_by_owner'
    OR (
      waived_by_owner_id IS NOT NULL
      AND waived_reason IS NOT NULL
      AND length(trim(waived_reason)) > 0
      AND waived_at IS NOT NULL
    )
  ),
  CHECK (
    status <> 'uploaded'
    OR (
      r2_object_key IS NOT NULL
      AND r2_thumbnail_key IS NOT NULL
      AND uploaded_at IS NOT NULL
      AND expires_at IS NOT NULL
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sale_photo_evidence_active_sale
ON public.sale_photo_evidence(sale_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sale_photo_evidence_owner_market_status
ON public.sale_photo_evidence(owner_id, market_id, status);

CREATE INDEX IF NOT EXISTS idx_sale_photo_evidence_owner_market_sale_completed
ON public.sale_photo_evidence(owner_id, market_id, sale_completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_sale_photo_evidence_sale_id
ON public.sale_photo_evidence(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_photo_evidence_expires_at
ON public.sale_photo_evidence(expires_at);

DROP TRIGGER IF EXISTS update_sale_photo_evidence_updated_at ON public.sale_photo_evidence;
CREATE TRIGGER update_sale_photo_evidence_updated_at
  BEFORE UPDATE ON public.sale_photo_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.is_sale_photo_evidence_sale_event(
  p_sale_id UUID,
  p_market_id UUID,
  p_owner_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.events e
    JOIN public.markets m
      ON m.id = e.market_id
    WHERE e.id = p_sale_id
      AND e.market_id = p_market_id
      AND e.type = 'deal_closed'
      AND m.id = p_market_id
      AND m.owner_id = p_owner_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_sale_photo_evidence_sale_event(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_sale_photo_evidence_sale_event(UUID, UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.is_sale_photo_evidence_sale_event(UUID, UUID, UUID) IS
  'Returns whether a sale_photo_evidence row references a deal_closed event in the same owner market. SECURITY DEFINER avoids exposing base events rows to staff clients.';

ALTER TABLE public.sale_photo_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sale_photo_evidence_select_owner_or_own_staff" ON public.sale_photo_evidence;
CREATE POLICY "sale_photo_evidence_select_owner_or_own_staff"
ON public.sale_photo_evidence FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR (
    captured_by_staff_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.staff_relationships sr
      WHERE sr.owner_id = sale_photo_evidence.owner_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "sale_photo_evidence_insert_owner_or_active_staff" ON public.sale_photo_evidence;
CREATE POLICY "sale_photo_evidence_insert_owner_or_active_staff"
ON public.sale_photo_evidence FOR INSERT
TO authenticated
WITH CHECK (
  public.is_sale_photo_evidence_sale_event(sale_id, market_id, owner_id)
  AND
  (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.markets m
      WHERE m.id = sale_photo_evidence.market_id
        AND m.owner_id = auth.uid()
        AND m.owner_id = sale_photo_evidence.owner_id
    )
  )
  OR (
    captured_by_staff_id = auth.uid()
    AND status IN (
      'pending_capture',
      'capture_skipped',
      'captured_local',
      'uploading',
      'upload_failed'
    )
    AND waived_by_owner_id IS NULL
    AND waived_reason IS NULL
    AND waived_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.markets m
      JOIN public.staff_relationships sr
        ON sr.owner_id = m.owner_id
      WHERE m.id = sale_photo_evidence.market_id
        AND m.owner_id = sale_photo_evidence.owner_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

DROP POLICY IF EXISTS "sale_photo_evidence_update_owner" ON public.sale_photo_evidence;
CREATE POLICY "sale_photo_evidence_update_owner"
ON public.sale_photo_evidence FOR UPDATE
TO authenticated
USING (
  owner_id = auth.uid()
)
WITH CHECK (
  owner_id = auth.uid()
  AND public.is_sale_photo_evidence_sale_event(sale_id, market_id, owner_id)
);

DROP POLICY IF EXISTS "sale_photo_evidence_update_own_staff_capture" ON public.sale_photo_evidence;
CREATE POLICY "sale_photo_evidence_update_own_staff_capture"
ON public.sale_photo_evidence FOR UPDATE
TO authenticated
USING (
  captured_by_staff_id = auth.uid()
  AND status IN (
    'pending_capture',
    'capture_skipped',
    'captured_local',
    'uploading',
    'upload_failed'
  )
  AND EXISTS (
    SELECT 1
    FROM public.staff_relationships sr
    WHERE sr.owner_id = sale_photo_evidence.owner_id
      AND sr.staff_id = auth.uid()
      AND sr.status = 'active'
  )
)
WITH CHECK (
  captured_by_staff_id = auth.uid()
  AND public.is_sale_photo_evidence_sale_event(sale_id, market_id, owner_id)
  AND status IN (
    'pending_capture',
    'capture_skipped',
    'captured_local',
    'uploading',
    'uploaded',
    'upload_failed'
  )
  AND waived_by_owner_id IS NULL
  AND waived_reason IS NULL
  AND waived_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.staff_relationships sr
    WHERE sr.owner_id = sale_photo_evidence.owner_id
      AND sr.staff_id = auth.uid()
      AND sr.status = 'active'
  )
);

REVOKE ALL ON TABLE public.sale_photo_evidence FROM anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.sale_photo_evidence TO authenticated;
REVOKE DELETE ON TABLE public.sale_photo_evidence FROM authenticated;

COMMENT ON TABLE public.sale_photo_evidence IS
  'Metadata-only sales photo evidence records. Image objects live in R2 and are accessed through short-lived signed URLs.';

COMMENT ON COLUMN public.sale_photo_evidence.sale_id IS
  'References the deal_closed event id for the first-version one-photo-per-sale evidence workflow.';

COMMENT ON COLUMN public.sale_photo_evidence.r2_object_key IS
  'Private R2 object key for the compressed evidence image. Never store a public URL here.';

COMMENT ON COLUMN public.sale_photo_evidence.r2_thumbnail_key IS
  'Private R2 object key for the evidence thumbnail. Never store a public URL here.';

-- Verification notes:
-- 1. This migration intentionally does not alter public.events.
-- 2. Existing sales are not backfilled.
-- 3. Existing pending evidence must not be deleted when a market-level toggle is later disabled.
-- 4. DELETE is not granted to authenticated users; use status changes or deleted_at in a future approved cleanup flow.
