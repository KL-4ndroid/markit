-- ============================================================
-- 059_enforce_sales_photo_evidence_server_mutation_boundary.sql
-- Date: 2026-07-17
--
-- Phase 2 server-only mutation cutover. Apply only after migration 058 and
-- the Vercel BFF RPC path have passed staging smoke tests.
--
-- This migration:
--   1. Rejects unresolved legacy uploading rows before cutover.
--   2. Enforces the upload-attempt lease invariant.
--   3. Removes authenticated write policies and every direct table grant.
--   4. Preserves authenticated read access and service_role RPC execution.
-- ============================================================

DO $$
DECLARE
  v_claim REGPROCEDURE := pg_catalog.to_regprocedure(
    'public.bff_claim_sale_photo_evidence_upload(uuid,uuid,uuid,uuid,uuid,uuid,timestamp with time zone)'
  );
  v_finalize REGPROCEDURE := pg_catalog.to_regprocedure(
    'public.bff_finalize_sale_photo_evidence_upload(uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,integer,integer,integer,timestamp with time zone,timestamp with time zone,timestamp with time zone)'
  );
  v_fail REGPROCEDURE := pg_catalog.to_regprocedure(
    'public.bff_mark_sale_photo_evidence_upload_failed(uuid,uuid,uuid,uuid,uuid,uuid,text)'
  );
BEGIN
  IF v_claim IS NULL OR v_finalize IS NULL OR v_fail IS NULL THEN
    RAISE EXCEPTION 'Migration 058 server mutation RPCs are required before 059.';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM pg_catalog.pg_proc AS p
    INNER JOIN pg_catalog.pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'bff_claim_sale_photo_evidence_upload',
        'bff_finalize_sale_photo_evidence_upload',
        'bff_mark_sale_photo_evidence_upload_failed'
      )
  ) <> 3 THEN
    RAISE EXCEPTION 'Unexpected BFF mutation RPC overload exists before 059.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS p
    WHERE p.oid IN (v_claim::OID, v_finalize::OID, v_fail::OID)
      AND pg_catalog.pg_get_userbyid(p.proowner) <> 'postgres'
  ) THEN
    RAISE EXCEPTION 'Migration 058 server mutation RPC owner is not trusted.';
  END IF;
END
$$;

-- The migration runner must keep this lock through the transaction so a
-- legacy writer cannot create a lease-less uploading row during cutover.
LOCK TABLE public.sale_photo_evidence IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.sale_photo_evidence AS spe
    WHERE spe.status = 'uploading'
      AND (
        spe.upload_attempt_id IS NULL
        OR spe.upload_lease_expires_at IS NULL
      )
  ) THEN
    RAISE EXCEPTION
      'Resolve legacy uploading sale_photo_evidence rows before applying 059.';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conname = 'sale_photo_evidence_upload_lease_state_check'
      AND conrelid = 'public.sale_photo_evidence'::regclass
  ) THEN
    ALTER TABLE public.sale_photo_evidence
      ADD CONSTRAINT sale_photo_evidence_upload_lease_state_check
      CHECK (
        (
          status = 'uploading'
          AND upload_attempt_id IS NOT NULL
          AND upload_lease_expires_at IS NOT NULL
        )
        OR (
          status <> 'uploading'
          AND upload_lease_expires_at IS NULL
        )
      ) NOT VALID;
  END IF;
END
$$;

ALTER TABLE public.sale_photo_evidence
  VALIDATE CONSTRAINT sale_photo_evidence_upload_lease_state_check;

ALTER TABLE public.sale_photo_evidence
  DROP CONSTRAINT IF EXISTS sale_photo_evidence_upload_lease_shape_check;

DROP POLICY IF EXISTS "sale_photo_evidence_insert_owner_or_active_staff"
ON public.sale_photo_evidence;

DROP POLICY IF EXISTS "sale_photo_evidence_update_owner"
ON public.sale_photo_evidence;

DROP POLICY IF EXISTS "sale_photo_evidence_update_own_staff_capture"
ON public.sale_photo_evidence;

-- Revoke PUBLIC defensively: PostgreSQL may otherwise retain grants inherited
-- from an earlier schema/default-privilege configuration.
REVOKE ALL ON TABLE public.sale_photo_evidence
FROM PUBLIC, anon, authenticated, service_role;

DO $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT pg_catalog.string_agg(pg_catalog.quote_ident(a.attname), ', ' ORDER BY a.attnum)
  INTO v_columns
  FROM pg_catalog.pg_attribute AS a
  WHERE a.attrelid = 'public.sale_photo_evidence'::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped;

  IF v_columns IS NOT NULL THEN
    EXECUTE pg_catalog.format(
      'REVOKE ALL PRIVILEGES (%s) ON TABLE public.sale_photo_evidence FROM PUBLIC, anon, authenticated, service_role',
      v_columns
    );
  END IF;
END
$$;

GRANT SELECT ON TABLE public.sale_photo_evidence TO authenticated, service_role;

-- This helper existed only for the legacy authenticated write policies.
REVOKE ALL ON FUNCTION public.is_sale_photo_evidence_sale_event(UUID, UUID, UUID)
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.bff_claim_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_claim_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TIMESTAMPTZ
) TO service_role;

REVOKE ALL ON FUNCTION public.bff_finalize_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_finalize_sale_photo_evidence_upload(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER,
  TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;

REVOKE ALL ON FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bff_mark_sale_photo_evidence_upload_failed(
  UUID, UUID, UUID, UUID, UUID, UUID, TEXT
) TO service_role;

COMMENT ON CONSTRAINT sale_photo_evidence_upload_lease_state_check
ON public.sale_photo_evidence IS
  'Uploading rows must carry a BFF attempt id and bounded lease; non-uploading rows cannot retain a live lease.';

COMMENT ON TABLE public.sale_photo_evidence IS
  'Metadata-only sales photo evidence records. Reads remain RLS-scoped; mutations are restricted to the three service_role BFF RPC capabilities.';
