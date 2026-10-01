-- Migration: 061_add_sales_photo_evidence_expiration_rpcs
-- Purpose: server-only expiration reconciliation after private R2 objects are deleted.

BEGIN;

CREATE OR REPLACE FUNCTION public.bff_list_expired_sale_photo_evidence(
  p_limit INTEGER DEFAULT 25
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  market_id UUID,
  sale_id UUID,
  r2_object_key TEXT,
  r2_thumbnail_key TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Sales photo evidence expiration limit is invalid.'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    spe.id,
    spe.owner_id,
    spe.market_id,
    spe.sale_id,
    spe.r2_object_key,
    spe.r2_thumbnail_key,
    spe.expires_at
  FROM public.sale_photo_evidence AS spe
  WHERE spe.deleted_at IS NULL
    AND spe.status = 'uploaded'
    AND spe.expires_at IS NOT NULL
    AND spe.expires_at <= pg_catalog.clock_timestamp()
    AND spe.r2_object_key IS NOT NULL
    AND spe.r2_thumbnail_key IS NOT NULL
  ORDER BY spe.expires_at ASC, spe.id ASC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_finalize_sale_photo_evidence_expiration(
  p_evidence_id UUID,
  p_expected_image_object_key TEXT,
  p_expected_thumbnail_object_key TEXT
)
RETURNS public.sale_photo_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
BEGIN
  IF p_evidence_id IS NULL
    OR p_expected_image_object_key IS NULL
    OR p_expected_thumbnail_object_key IS NULL
  THEN
    RAISE EXCEPTION 'Sales photo evidence expiration scope is invalid.'
      USING ERRCODE = '22023';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
  FOR UPDATE;

  IF NOT FOUND OR v_evidence.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Sales photo evidence row was not found.'
      USING ERRCODE = '22023';
  END IF;

  IF v_evidence.status = 'expired' THEN
    RETURN v_evidence;
  END IF;

  IF v_evidence.status <> 'uploaded'
    OR v_evidence.expires_at IS NULL
    OR v_evidence.expires_at > pg_catalog.clock_timestamp()
    OR v_evidence.r2_object_key IS DISTINCT FROM p_expected_image_object_key
    OR v_evidence.r2_thumbnail_key IS DISTINCT FROM p_expected_thumbnail_object_key
  THEN
    RAISE EXCEPTION 'Sales photo evidence row changed before expiration finalize.'
      USING ERRCODE = '40001';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET
    status = 'expired',
    r2_object_key = NULL,
    r2_thumbnail_key = NULL
  WHERE spe.id = p_evidence_id
    AND spe.deleted_at IS NULL
    AND spe.status = 'uploaded'
    AND spe.expires_at <= pg_catalog.clock_timestamp()
    AND spe.r2_object_key = p_expected_image_object_key
    AND spe.r2_thumbnail_key = p_expected_thumbnail_object_key
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence expiration finalize lost its state guard.'
      USING ERRCODE = '40001';
  END IF;

  RETURN v_evidence;
END;
$$;

ALTER FUNCTION public.bff_list_expired_sale_photo_evidence(INTEGER)
OWNER TO postgres;
ALTER FUNCTION public.bff_finalize_sale_photo_evidence_expiration(UUID, TEXT, TEXT)
OWNER TO postgres;

REVOKE ALL ON FUNCTION public.bff_list_expired_sale_photo_evidence(INTEGER)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_finalize_sale_photo_evidence_expiration(UUID, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bff_list_expired_sale_photo_evidence(INTEGER)
TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_finalize_sale_photo_evidence_expiration(UUID, TEXT, TEXT)
TO service_role;

COMMENT ON FUNCTION public.bff_list_expired_sale_photo_evidence(INTEGER)
IS 'Lists a bounded server-only batch of uploaded evidence whose read retention has expired.';
COMMENT ON FUNCTION public.bff_finalize_sale_photo_evidence_expiration(UUID, TEXT, TEXT)
IS 'Marks evidence expired and clears stale object keys only after both private R2 objects are deleted.';

COMMIT;
