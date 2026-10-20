-- ============================================================
-- 058_add_sales_photo_evidence_server_mutation_rpcs.sql
-- Date: 2026-07-17
--
-- Phase 2 server-only mutation capability:
--   1. Add bounded upload-attempt lease metadata while allowing legacy writes
--      until migration 059 performs the cutover.
--   2. Expose three narrowly scoped RPCs only to service_role.
--   3. Recheck owner/staff and sale identity inside each database transaction.
--   4. Leave the old authenticated write path intact for staging RPC smoke.
--
-- After the BFF server-secret path passes staging smoke, apply migration 059
-- to revoke the old authenticated and direct service-role mutation paths.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'sale_photo_evidence_r2_object_key_identity_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'sale_photo_evidence_r2_thumbnail_key_identity_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) OR NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'sale_photo_evidence_file_size_ceiling_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) THEN
    RAISE EXCEPTION 'Migration 057 sales photo evidence constraints are required before 058.';
  END IF;
END
$$;

ALTER TABLE public.sale_photo_evidence
  ADD COLUMN IF NOT EXISTS upload_attempt_id UUID,
  ADD COLUMN IF NOT EXISTS upload_lease_expires_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'sale_photo_evidence_upload_lease_shape_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) THEN
    ALTER TABLE public.sale_photo_evidence
      ADD CONSTRAINT sale_photo_evidence_upload_lease_shape_check
      CHECK (
        (
          status = 'uploading'
          AND (
            (
              upload_attempt_id IS NULL
              AND upload_lease_expires_at IS NULL
            )
            OR (
              upload_attempt_id IS NOT NULL
              AND upload_lease_expires_at IS NOT NULL
            )
          )
        )
        OR (
          status <> 'uploading'
          AND upload_lease_expires_at IS NULL
        )
      ) NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_sale_photo_evidence_upload_lease_expires_at
ON public.sale_photo_evidence(upload_lease_expires_at)
WHERE status = 'uploading';

CREATE OR REPLACE FUNCTION public.bff_claim_sale_photo_evidence_upload(
  p_actor_id UUID,
  p_owner_id UUID,
  p_market_id UUID,
  p_sale_id UUID,
  p_expected_evidence_id UUID,
  p_attempt_id UUID,
  p_captured_at TIMESTAMPTZ
)
RETURNS public.sale_photo_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
  v_event_completed_at TIMESTAMPTZ;
  v_existing_found BOOLEAN := FALSE;
  v_is_owner BOOLEAN := FALSE;
  v_is_active_staff BOOLEAN := FALSE;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_actor_id IS NULL
    OR p_owner_id IS NULL
    OR p_market_id IS NULL
    OR p_sale_id IS NULL
    OR p_attempt_id IS NULL
    OR p_captured_at IS NULL
  THEN
    RAISE EXCEPTION 'Invalid sales photo evidence claim input.'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize one active claim per sale, including the no-row-yet case.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_sale_id::TEXT, 0)
  );

  SELECT e.timestamp
  INTO v_event_completed_at
  FROM public.events AS e
  INNER JOIN public.markets AS m
    ON m.id = e.market_id
  WHERE e.id = p_sale_id
    AND e.market_id = p_market_id
    AND e.type = 'deal_closed'
    AND m.id = p_market_id
    AND m.owner_id = p_owner_id
  FOR SHARE OF e, m;

  IF NOT FOUND OR v_event_completed_at IS NULL THEN
    RAISE EXCEPTION 'Sales photo evidence sale scope is invalid.'
      USING ERRCODE = '22023';
  END IF;

  v_is_owner := p_actor_id = p_owner_id;
  IF NOT v_is_owner THEN
    SELECT TRUE
    INTO v_is_active_staff
    FROM public.staff_relationships AS sr
    WHERE sr.owner_id = p_owner_id
      AND sr.staff_id = p_actor_id
      AND sr.status = 'active'
    FOR SHARE;
    v_is_active_staff := FOUND;
  END IF;

  IF NOT v_is_owner AND NOT v_is_active_staff THEN
    RAISE EXCEPTION 'Sales photo evidence actor is not authorized.'
      USING ERRCODE = '42501';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
  FOR UPDATE;
  v_existing_found := FOUND;
  v_now := pg_catalog.clock_timestamp();

  IF v_existing_found THEN
    IF p_expected_evidence_id IS NOT NULL
      AND v_evidence.id <> p_expected_evidence_id
    THEN
      RAISE EXCEPTION 'Sales photo evidence claim identity changed.'
        USING ERRCODE = '40001';
    END IF;

    IF NOT v_is_owner
      AND v_evidence.captured_by_staff_id IS DISTINCT FROM p_actor_id
    THEN
      RAISE EXCEPTION 'Sales photo evidence row belongs to another actor.'
        USING ERRCODE = '42501';
    END IF;

    IF v_evidence.status = 'uploading' THEN
      IF v_evidence.upload_lease_expires_at IS NOT NULL
        AND v_evidence.upload_lease_expires_at > v_now
        AND v_evidence.upload_attempt_id IS DISTINCT FROM p_attempt_id
      THEN
        RAISE EXCEPTION 'Sales photo evidence upload lease is still active.'
          USING ERRCODE = '55000';
      END IF;
    ELSIF v_evidence.status NOT IN (
        'pending_capture',
        'capture_skipped',
        'captured_local',
        'upload_failed'
      ) THEN
      RAISE EXCEPTION 'Sales photo evidence row is not uploadable.'
        USING ERRCODE = '55000';
    END IF;

    UPDATE public.sale_photo_evidence AS spe
    SET status = 'uploading',
        captured_by_staff_id = CASE WHEN v_is_owner THEN NULL ELSE p_actor_id END,
        captured_at = p_captured_at,
        failure_reason = NULL,
        upload_attempt_id = p_attempt_id,
        upload_lease_expires_at = v_now + INTERVAL '2 minutes'
    WHERE spe.id = v_evidence.id
      AND spe.owner_id = p_owner_id
      AND spe.market_id = p_market_id
      AND spe.sale_id = p_sale_id
      AND spe.deleted_at IS NULL
    RETURNING spe.* INTO v_evidence;
  ELSE
    IF p_expected_evidence_id IS NOT NULL THEN
      RAISE EXCEPTION 'Expected sales photo evidence row was not found.'
        USING ERRCODE = '40001';
    END IF;

    INSERT INTO public.sale_photo_evidence (
      owner_id,
      market_id,
      sale_id,
      captured_by_staff_id,
      status,
      sale_completed_at,
      captured_at,
      upload_attempt_id,
      upload_lease_expires_at
    )
    VALUES (
      p_owner_id,
      p_market_id,
      p_sale_id,
      CASE WHEN v_is_owner THEN NULL ELSE p_actor_id END,
      'uploading',
      v_event_completed_at,
      p_captured_at,
      p_attempt_id,
      v_now + INTERVAL '2 minutes'
    )
    RETURNING * INTO v_evidence;
  END IF;

  RETURN v_evidence;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_finalize_sale_photo_evidence_upload(
  p_actor_id UUID,
  p_evidence_id UUID,
  p_owner_id UUID,
  p_market_id UUID,
  p_sale_id UUID,
  p_attempt_id UUID,
  p_image_object_key TEXT,
  p_thumbnail_object_key TEXT,
  p_mime_type TEXT,
  p_width INTEGER,
  p_height INTEGER,
  p_file_size_bytes INTEGER,
  p_captured_at TIMESTAMPTZ,
  p_uploaded_at TIMESTAMPTZ,
  p_expires_at TIMESTAMPTZ
)
RETURNS public.sale_photo_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
  v_is_owner BOOLEAN := FALSE;
  v_is_active_staff BOOLEAN := FALSE;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_actor_id IS NULL
    OR p_evidence_id IS NULL
    OR p_owner_id IS NULL
    OR p_market_id IS NULL
    OR p_sale_id IS NULL
    OR p_attempt_id IS NULL
    OR p_captured_at IS NULL
    OR p_uploaded_at IS NULL
    OR p_expires_at IS NULL
    OR p_expires_at <= p_uploaded_at
    OR p_mime_type IS NULL
    OR p_mime_type NOT IN ('image/webp', 'image/jpeg')
    OR p_width IS NULL OR p_width <= 0
    OR p_height IS NULL OR p_height <= 0
    OR p_file_size_bytes IS NULL
    OR p_file_size_bytes < 0
    OR p_file_size_bytes > 1000000
    OR p_image_object_key IS NULL OR p_image_object_key = ''
    OR p_thumbnail_object_key IS NULL OR p_thumbnail_object_key = ''
  THEN
    RAISE EXCEPTION 'Invalid sales photo evidence finalize input.'
      USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM public.events AS e
  INNER JOIN public.markets AS m
    ON m.id = e.market_id
  WHERE e.id = p_sale_id
    AND e.market_id = p_market_id
    AND e.type = 'deal_closed'
    AND m.id = p_market_id
    AND m.owner_id = p_owner_id
  FOR SHARE OF e, m;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence sale scope is invalid.'
      USING ERRCODE = '22023';
  END IF;

  v_is_owner := p_actor_id = p_owner_id;
  IF NOT v_is_owner THEN
    SELECT TRUE
    INTO v_is_active_staff
    FROM public.staff_relationships AS sr
    WHERE sr.owner_id = p_owner_id
      AND sr.staff_id = p_actor_id
      AND sr.status = 'active'
    FOR SHARE;
    v_is_active_staff := FOUND;
  END IF;

  IF NOT v_is_owner AND NOT v_is_active_staff THEN
    RAISE EXCEPTION 'Sales photo evidence actor is not authorized.'
      USING ERRCODE = '42501';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence row was not found.'
      USING ERRCODE = '22023';
  END IF;

  v_now := pg_catalog.clock_timestamp();

  IF NOT v_is_owner
    AND v_evidence.captured_by_staff_id IS DISTINCT FROM p_actor_id
  THEN
    RAISE EXCEPTION 'Sales photo evidence row belongs to another actor.'
      USING ERRCODE = '42501';
  END IF;

  IF v_evidence.upload_attempt_id IS DISTINCT FROM p_attempt_id THEN
    RAISE EXCEPTION 'Sales photo evidence upload attempt changed.'
      USING ERRCODE = '40001';
  END IF;

  IF v_evidence.status = 'uploaded' THEN
    IF v_evidence.r2_object_key = p_image_object_key
      AND v_evidence.r2_thumbnail_key = p_thumbnail_object_key
      AND v_evidence.mime_type = p_mime_type
      AND v_evidence.width = p_width
      AND v_evidence.height = p_height
      AND v_evidence.file_size_bytes = p_file_size_bytes
      AND v_evidence.captured_at = p_captured_at
      AND v_evidence.uploaded_at = p_uploaded_at
      AND v_evidence.expires_at = p_expires_at
    THEN
      RETURN v_evidence;
    END IF;

    RAISE EXCEPTION 'Uploaded sales photo evidence does not match retry input.'
      USING ERRCODE = '55000';
  END IF;

  IF v_evidence.status <> 'uploading' THEN
    RAISE EXCEPTION 'Sales photo evidence row is not awaiting finalize.'
      USING ERRCODE = '55000';
  END IF;

  IF v_evidence.upload_lease_expires_at IS NULL
    OR v_evidence.upload_lease_expires_at <= v_now
  THEN
    RAISE EXCEPTION 'Sales photo evidence upload lease expired before finalize.'
      USING ERRCODE = '55000';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET status = 'uploaded',
      r2_object_key = p_image_object_key,
      r2_thumbnail_key = p_thumbnail_object_key,
      mime_type = p_mime_type,
      width = p_width,
      height = p_height,
      file_size_bytes = p_file_size_bytes,
      captured_at = p_captured_at,
      uploaded_at = p_uploaded_at,
      expires_at = p_expires_at,
      failure_reason = NULL,
      upload_lease_expires_at = NULL
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
    AND spe.status = 'uploading'
    AND spe.upload_attempt_id = p_attempt_id
    AND spe.upload_lease_expires_at > v_now
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence finalize lost its state guard.'
      USING ERRCODE = '40001';
  END IF;

  RETURN v_evidence;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(
  p_actor_id UUID,
  p_evidence_id UUID,
  p_owner_id UUID,
  p_market_id UUID,
  p_sale_id UUID,
  p_attempt_id UUID,
  p_failure_reason TEXT
)
RETURNS public.sale_photo_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
  v_actor_matches_row BOOLEAN := FALSE;
BEGIN
  IF p_actor_id IS NULL
    OR p_evidence_id IS NULL
    OR p_owner_id IS NULL
    OR p_market_id IS NULL
    OR p_sale_id IS NULL
    OR p_attempt_id IS NULL
    OR p_failure_reason IS NULL
    OR p_failure_reason NOT IN (
      'r2_image_upload_failed',
      'r2_thumbnail_upload_failed',
      'metadata_finalize_failed'
    )
  THEN
    RAISE EXCEPTION 'Invalid sales photo evidence failure input.'
      USING ERRCODE = '22023';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence row was not found.'
      USING ERRCODE = '22023';
  END IF;

  -- Failure cleanup may finish an already-authorized in-flight upload after a
  -- staff relationship is revoked. It can only downgrade that actor's own row.
  v_actor_matches_row := p_actor_id = p_owner_id
    OR v_evidence.captured_by_staff_id = p_actor_id;

  IF NOT v_actor_matches_row THEN
    RAISE EXCEPTION 'Sales photo evidence actor cannot mark this row failed.'
      USING ERRCODE = '42501';
  END IF;

  IF v_evidence.upload_attempt_id IS DISTINCT FROM p_attempt_id THEN
    RAISE EXCEPTION 'Sales photo evidence upload attempt changed.'
      USING ERRCODE = '40001';
  END IF;

  IF v_evidence.status = 'upload_failed' THEN
    RETURN v_evidence;
  END IF;

  IF v_evidence.status <> 'uploading' THEN
    RAISE EXCEPTION 'Sales photo evidence row cannot transition to upload_failed.'
      USING ERRCODE = '55000';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET status = 'upload_failed',
      failure_reason = p_failure_reason,
      upload_lease_expires_at = NULL
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_owner_id
    AND spe.market_id = p_market_id
    AND spe.sale_id = p_sale_id
    AND spe.deleted_at IS NULL
    AND spe.status = 'uploading'
    AND spe.upload_attempt_id = p_attempt_id
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence failure update lost its state guard.'
      USING ERRCODE = '40001';
  END IF;

  RETURN v_evidence;
END;
$$;

ALTER FUNCTION public.bff_claim_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TIMESTAMPTZ
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.bff_claim_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_claim_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TIMESTAMPTZ
) TO service_role;

ALTER FUNCTION public.bff_finalize_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.bff_finalize_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_finalize_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;

ALTER FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT
) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT
) TO service_role;

COMMENT ON FUNCTION public.bff_claim_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TIMESTAMPTZ
) IS 'Server-only claim transition. Derives staff attribution from the verified actor and rechecks live authorization.';

COMMENT ON FUNCTION public.bff_finalize_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) IS 'Server-only uploading-to-uploaded transition with live actor and sale-scope checks.';

COMMENT ON FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT
) IS 'Server-only failure cleanup restricted to the owner or the staff actor already bound to the row.';
