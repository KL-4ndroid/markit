BEGIN;

CREATE OR REPLACE FUNCTION public.verify_invitation_token(p_token text)
RETURNS TABLE (
  is_valid boolean,
  owner_id uuid,
  owner_email text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_token IS NULL OR pg_catalog.length(pg_catalog.btrim(p_token)) < 16 THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (
      si.expires_at > pg_catalog.now()
      AND public.has_authoritative_team_entitlement(si.owner_id)
    )::boolean,
    si.owner_id::uuid,
    u.email::text,
    si.expires_at::timestamptz
  FROM public.staff_invitations AS si
  JOIN auth.users AS u ON u.id = si.owner_id
  WHERE si.token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamptz;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_invitation_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invitation_token(text) TO anon, authenticated;

COMMENT ON FUNCTION public.verify_invitation_token(text) IS
  'Verifies an invitation without exposing table access. 065 explicitly casts auth.users.email to the declared TEXT return type.';

COMMIT;
