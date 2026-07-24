BEGIN;

CREATE TABLE IF NOT EXISTS public.account_entitlements (
  owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_cover_photo_enabled boolean NOT NULL DEFAULT false,
  source text NOT NULL DEFAULT 'free',
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  CONSTRAINT account_entitlements_source_check CHECK (source IN ('free', 'admin', 'billing'))
);

ALTER TABLE public.account_entitlements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_entitlements FROM anon, authenticated;
GRANT SELECT ON public.account_entitlements TO authenticated;

DROP POLICY IF EXISTS account_entitlements_owner_read ON public.account_entitlements;
CREATE POLICY account_entitlements_owner_read ON public.account_entitlements
FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.product_cover_photos (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'uploading',
  display_object_key text,
  thumbnail_object_key text,
  display_content_hash text,
  thumbnail_content_hash text,
  display_mime_type text,
  thumbnail_mime_type text,
  display_size_bytes integer,
  thumbnail_size_bytes integer,
  width integer,
  height integer,
  version integer NOT NULL DEFAULT 1,
  pending_photo_id uuid,
  pending_version integer,
  upload_lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.clock_timestamp(),
  deleted_at timestamptz,
  CONSTRAINT product_cover_photos_status_check CHECK (status IN ('uploading', 'uploaded', 'upload_failed', 'deleting')),
  CONSTRAINT product_cover_photos_version_check CHECK (version > 0),
  CONSTRAINT product_cover_photos_pending_version_check CHECK (pending_version IS NULL OR pending_version > 0),
  CONSTRAINT product_cover_photos_size_check CHECK (
    (display_size_bytes IS NULL OR display_size_bytes BETWEEN 1 AND 600000)
    AND (thumbnail_size_bytes IS NULL OR thumbnail_size_bytes BETWEEN 1 AND 150000)
  ),
  CONSTRAINT product_cover_photos_dimensions_check CHECK (
    (width IS NULL OR width BETWEEN 1 AND 1600)
    AND (height IS NULL OR height BETWEEN 1 AND 1600)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS product_cover_photos_one_active_per_product
ON public.product_cover_photos(product_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS product_cover_photos_owner_idx ON public.product_cover_photos(owner_id);

ALTER TABLE public.product_cover_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.product_cover_photos FROM anon, authenticated;
GRANT SELECT ON public.product_cover_photos TO authenticated;

DROP POLICY IF EXISTS product_cover_photos_accessible_read ON public.product_cover_photos;
CREATE POLICY product_cover_photos_accessible_read ON public.product_cover_photos
FOR SELECT TO authenticated USING (
  deleted_at IS NULL
  AND (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.staff_relationships sr
      WHERE sr.owner_id = product_cover_photos.owner_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

CREATE OR REPLACE FUNCTION public.claim_product_cover_photo_upload(
  p_actor_id uuid,
  p_product_id uuid,
  p_photo_id uuid,
  p_version integer,
  p_requested_bytes integer,
  p_max_account_bytes bigint
) RETURNS public.product_cover_photos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_row public.product_cover_photos%ROWTYPE;
  v_allowed boolean := false;
  v_used_bytes bigint := 0;
BEGIN
  SELECT * INTO v_product FROM public.products
  WHERE id = p_product_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'product_not_found'; END IF;

  v_allowed := v_product.owner_id = p_actor_id OR EXISTS (
    SELECT 1 FROM public.staff_relationships sr
    WHERE sr.owner_id = v_product.owner_id AND sr.staff_id = p_actor_id
      AND sr.status = 'active' AND sr.role = 'manager'
  );
  IF NOT v_allowed THEN RAISE EXCEPTION 'permission_denied'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.account_entitlements ae
    WHERE ae.owner_id = v_product.owner_id AND ae.product_cover_photo_enabled = true
  ) THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;

  IF p_requested_bytes NOT BETWEEN 2 AND 750000 OR p_max_account_bytes < 750000 THEN
    RAISE EXCEPTION 'invalid_storage_limit';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_product.owner_id::text, 0));
  SELECT COALESCE(SUM(COALESCE(display_size_bytes, 0) + COALESCE(thumbnail_size_bytes, 0)), 0)
    INTO v_used_bytes
  FROM public.product_cover_photos
  WHERE owner_id = v_product.owner_id AND product_id <> p_product_id
    AND status = 'uploaded' AND deleted_at IS NULL;
  IF v_used_bytes + p_requested_bytes > p_max_account_bytes THEN
    RAISE EXCEPTION 'storage_quota_exceeded';
  END IF;

  INSERT INTO public.product_cover_photos(id, owner_id, product_id, status, version, upload_lease_expires_at)
  VALUES (p_photo_id, v_product.owner_id, p_product_id, 'uploading', p_version, pg_catalog.clock_timestamp() + interval '10 minutes')
  ON CONFLICT (product_id) WHERE deleted_at IS NULL DO UPDATE SET
    status = CASE WHEN product_cover_photos.status = 'uploaded' THEN 'uploaded' ELSE 'uploading' END,
    pending_photo_id = CASE WHEN product_cover_photos.status = 'uploaded' THEN p_photo_id ELSE NULL END,
    pending_version = CASE WHEN product_cover_photos.status = 'uploaded' THEN p_version ELSE NULL END,
    id = CASE WHEN product_cover_photos.status = 'uploaded' THEN product_cover_photos.id ELSE p_photo_id END,
    version = CASE WHEN product_cover_photos.status = 'uploaded' THEN product_cover_photos.version ELSE p_version END,
    upload_lease_expires_at = pg_catalog.clock_timestamp() + interval '10 minutes',
    last_error_code = NULL, updated_at = pg_catalog.clock_timestamp()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_product_cover_photo_upload(
  p_actor_id uuid, p_product_id uuid, p_photo_id uuid, p_version integer,
  p_display_object_key text, p_thumbnail_object_key text,
  p_display_content_hash text, p_thumbnail_content_hash text,
  p_display_mime_type text, p_thumbnail_mime_type text,
  p_display_size_bytes integer, p_thumbnail_size_bytes integer,
  p_width integer, p_height integer
) RETURNS public.product_cover_photos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_row public.product_cover_photos%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.product_cover_photos p
    JOIN public.account_entitlements ae ON ae.owner_id = p.owner_id
    WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
      AND ae.product_cover_photo_enabled = true
  ) THEN RAISE EXCEPTION 'paid_entitlement_required'; END IF;

  UPDATE public.product_cover_photos p SET
    id = p_photo_id, status = 'uploaded', version = p_version,
    display_object_key = p_display_object_key, thumbnail_object_key = p_thumbnail_object_key,
    display_content_hash = p_display_content_hash, thumbnail_content_hash = p_thumbnail_content_hash,
    display_mime_type = p_display_mime_type, thumbnail_mime_type = p_thumbnail_mime_type,
    display_size_bytes = p_display_size_bytes, thumbnail_size_bytes = p_thumbnail_size_bytes,
    width = p_width, height = p_height, pending_photo_id = NULL, pending_version = NULL,
    upload_lease_expires_at = NULL, last_error_code = NULL,
    updated_at = pg_catalog.clock_timestamp()
  WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
    AND (
      (p.status = 'uploading' AND p.id = p_photo_id AND p.version = p_version)
      OR (p.status = 'uploaded' AND p.pending_photo_id = p_photo_id AND p.pending_version = p_version)
    )
    AND (p.owner_id = p_actor_id OR EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id = p.owner_id
      AND sr.staff_id = p_actor_id AND sr.status = 'active' AND sr.role = 'manager'
    ))
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'cover_photo_not_claimed'; END IF;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_product_cover_photo_upload_failed(
  p_actor_id uuid, p_product_id uuid, p_photo_id uuid, p_error_code text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.product_cover_photos p SET
    status = CASE WHEN p.status = 'uploaded' THEN 'uploaded' ELSE 'upload_failed' END,
    pending_photo_id = NULL, pending_version = NULL, upload_lease_expires_at = NULL,
    last_error_code = left(p_error_code, 80), updated_at = pg_catalog.clock_timestamp()
  WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
    AND (p.id = p_photo_id OR p.pending_photo_id = p_photo_id)
    AND (p.owner_id = p_actor_id OR EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id = p.owner_id
      AND sr.staff_id = p_actor_id AND sr.status = 'active' AND sr.role = 'manager'
    ));
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_product_cover_photo(
  p_actor_id uuid, p_product_id uuid
) RETURNS public.product_cover_photos
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_row public.product_cover_photos%ROWTYPE;
BEGIN
  UPDATE public.product_cover_photos p SET status = 'deleting', deleted_at = pg_catalog.clock_timestamp(),
    updated_at = pg_catalog.clock_timestamp()
  WHERE p.product_id = p_product_id AND p.deleted_at IS NULL
    AND (p.owner_id = p_actor_id OR EXISTS (
      SELECT 1 FROM public.staff_relationships sr WHERE sr.owner_id = p.owner_id
      AND sr.staff_id = p_actor_id AND sr.status = 'active' AND sr.role = 'manager'
    ))
  RETURNING * INTO v_row;
  IF NOT FOUND THEN RAISE EXCEPTION 'cover_photo_not_found'; END IF;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_product_cover_photo_upload(uuid, uuid, uuid, integer, integer, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_product_cover_photo_upload(uuid, uuid, uuid, integer, text, text, text, text, text, text, integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_product_cover_photo_upload_failed(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_product_cover_photo(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_product_cover_photo_upload(uuid, uuid, uuid, integer, integer, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_product_cover_photo_upload(uuid, uuid, uuid, integer, text, text, text, text, text, text, integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_product_cover_photo_upload_failed(uuid, uuid, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_product_cover_photo(uuid, uuid) TO service_role;

COMMIT;
