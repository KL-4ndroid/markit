-- Migration: 060_add_sales_photo_evidence_owner_delete_rpcs
-- Purpose: add an owner-only, server-mediated two-step deletion boundary.
-- R2 objects are deleted by the BFF between prepare and finalize.

BEGIN;

CREATE OR REPLACE FUNCTION public.bff_prepare_sale_photo_evidence_delete(
  p_actor_id UUID,
  p_evidence_id UUID
)
RETURNS public.sale_photo_evidence
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.sale_photo_evidence%ROWTYPE;
BEGIN
  IF p_actor_id IS NULL OR p_evidence_id IS NULL THEN
    RAISE EXCEPTION 'Sales photo evidence delete scope is invalid.'
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

  IF v_evidence.owner_id <> p_actor_id THEN
    RAISE EXCEPTION 'Only the market owner may delete sales photo evidence.'
      USING ERRCODE = '42501';
  END IF;

  IF v_evidence.status <> 'uploaded'
    OR v_evidence.r2_object_key IS NULL
    OR v_evidence.r2_thumbnail_key IS NULL
  THEN
    RAISE EXCEPTION 'Sales photo evidence row is not deletable.'
      USING ERRCODE = '55000';
  END IF;

  RETURN v_evidence;
END;
$$;

CREATE OR REPLACE FUNCTION public.bff_finalize_sale_photo_evidence_delete(
  p_actor_id UUID,
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
  IF p_actor_id IS NULL
    OR p_evidence_id IS NULL
    OR p_expected_image_object_key IS NULL
    OR p_expected_thumbnail_object_key IS NULL
  THEN
    RAISE EXCEPTION 'Sales photo evidence delete finalize scope is invalid.'
      USING ERRCODE = '22023';
  END IF;

  SELECT spe.*
  INTO v_evidence
  FROM public.sale_photo_evidence AS spe
  WHERE spe.id = p_evidence_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence row was not found.'
      USING ERRCODE = '22023';
  END IF;

  IF v_evidence.owner_id <> p_actor_id THEN
    RAISE EXCEPTION 'Only the market owner may delete sales photo evidence.'
      USING ERRCODE = '42501';
  END IF;

  IF v_evidence.deleted_at IS NOT NULL THEN
    RETURN v_evidence;
  END IF;

  IF v_evidence.status <> 'uploaded'
    OR v_evidence.r2_object_key IS DISTINCT FROM p_expected_image_object_key
    OR v_evidence.r2_thumbnail_key IS DISTINCT FROM p_expected_thumbnail_object_key
  THEN
    RAISE EXCEPTION 'Sales photo evidence row changed before delete finalize.'
      USING ERRCODE = '40001';
  END IF;

  UPDATE public.sale_photo_evidence AS spe
  SET deleted_at = pg_catalog.clock_timestamp()
  WHERE spe.id = p_evidence_id
    AND spe.owner_id = p_actor_id
    AND spe.deleted_at IS NULL
    AND spe.status = 'uploaded'
    AND spe.r2_object_key = p_expected_image_object_key
    AND spe.r2_thumbnail_key = p_expected_thumbnail_object_key
  RETURNING spe.* INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sales photo evidence delete finalize lost its state guard.'
      USING ERRCODE = '40001';
  END IF;

  RETURN v_evidence;
END;
$$;

ALTER FUNCTION public.bff_prepare_sale_photo_evidence_delete(UUID, UUID)
OWNER TO postgres;
ALTER FUNCTION public.bff_finalize_sale_photo_evidence_delete(UUID, UUID, TEXT, TEXT)
OWNER TO postgres;

REVOKE ALL ON FUNCTION public.bff_prepare_sale_photo_evidence_delete(UUID, UUID)
FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.bff_finalize_sale_photo_evidence_delete(UUID, UUID, TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.bff_prepare_sale_photo_evidence_delete(UUID, UUID)
TO service_role;
GRANT EXECUTE ON FUNCTION public.bff_finalize_sale_photo_evidence_delete(UUID, UUID, TEXT, TEXT)
TO service_role;

COMMENT ON FUNCTION public.bff_prepare_sale_photo_evidence_delete(UUID, UUID)
IS 'Server-only owner authorization and immutable object-key preflight before R2 deletion.';
COMMENT ON FUNCTION public.bff_finalize_sale_photo_evidence_delete(UUID, UUID, TEXT, TEXT)
IS 'Server-only soft-delete finalize after both bound R2 objects have been deleted.';
COMMENT ON TABLE public.sale_photo_evidence IS
  'Metadata-only sales photo evidence records. Reads remain RLS-scoped; mutations are restricted to approved service_role BFF RPC capabilities.';

COMMIT;

