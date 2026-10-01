-- ============================================================
-- 057_harden_sales_photo_evidence_api_boundary.sql
-- Date: 2026-07-17
--
-- Phase 2 hardening for the Vercel BFF boundary:
--   1. Make the sale-event invariant apply to both owner and staff inserts.
--   2. Bind stored private object keys to the row identity.
--   3. Enforce the server upload size ceiling for newly written metadata.
--
-- Existing rows are protected by the BFF key-binding check immediately. The
-- new CHECK constraints are added NOT VALID so deployment does not fail before
-- an explicit read-only audit of historical rows; PostgreSQL still enforces
-- them for new INSERT/UPDATE operations.
-- ============================================================

DROP POLICY IF EXISTS "sale_photo_evidence_insert_owner_or_active_staff"
ON public.sale_photo_evidence;

CREATE POLICY "sale_photo_evidence_insert_owner_or_active_staff"
ON public.sale_photo_evidence FOR INSERT
TO authenticated
WITH CHECK (
  public.is_sale_photo_evidence_sale_event(sale_id, market_id, owner_id)
  AND (
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
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_photo_evidence_r2_object_key_identity_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) THEN
    ALTER TABLE public.sale_photo_evidence
      ADD CONSTRAINT sale_photo_evidence_r2_object_key_identity_check
      CHECK (
        r2_object_key IS NULL
        OR r2_object_key IN (
          'sales-evidence/7d/' || owner_id::text || '/' || market_id::text || '/' || sale_id::text || '/' || id::text || '.webp',
          'sales-evidence/7d/' || owner_id::text || '/' || market_id::text || '/' || sale_id::text || '/' || id::text || '.jpg',
          'sales-evidence/7d/' || owner_id::text || '/' || market_id::text || '/' || sale_id::text || '/' || id::text || '.jpeg'
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_photo_evidence_r2_thumbnail_key_identity_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) THEN
    ALTER TABLE public.sale_photo_evidence
      ADD CONSTRAINT sale_photo_evidence_r2_thumbnail_key_identity_check
      CHECK (
        r2_thumbnail_key IS NULL
        OR r2_thumbnail_key IN (
          'sales-evidence-thumbs/7d/' || owner_id::text || '/' || market_id::text || '/' || sale_id::text || '/' || id::text || '.webp',
          'sales-evidence-thumbs/7d/' || owner_id::text || '/' || market_id::text || '/' || sale_id::text || '/' || id::text || '.jpg',
          'sales-evidence-thumbs/7d/' || owner_id::text || '/' || market_id::text || '/' || sale_id::text || '/' || id::text || '.jpeg'
        )
      ) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sale_photo_evidence_file_size_ceiling_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) THEN
    ALTER TABLE public.sale_photo_evidence
      ADD CONSTRAINT sale_photo_evidence_file_size_ceiling_check
      CHECK (file_size_bytes IS NULL OR file_size_bytes <= 1000000) NOT VALID;
  END IF;
END
$$;

COMMENT ON CONSTRAINT sale_photo_evidence_r2_object_key_identity_check
ON public.sale_photo_evidence IS
  'Binds an image object key to this row owner, market, sale, and evidence id.';

COMMENT ON CONSTRAINT sale_photo_evidence_r2_thumbnail_key_identity_check
ON public.sale_photo_evidence IS
  'Binds a thumbnail object key to this row owner, market, sale, and evidence id.';

COMMENT ON CONSTRAINT sale_photo_evidence_file_size_ceiling_check
ON public.sale_photo_evidence IS
  'Matches the one-megabyte compressed image ceiling enforced by the BFF.';
