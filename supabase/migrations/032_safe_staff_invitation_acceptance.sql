-- Make token-based staff invitation acceptance complete and atomic.
-- The RPC now binds the staff relationship and adds the staff user to the
-- owner's active markets in the same transaction.

CREATE OR REPLACE FUNCTION accept_invitation_and_bind(
  p_token TEXT,
  p_staff_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  relationship_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_relationship_id UUID;
  v_staff_id UUID;
  v_staff_email TEXT;
  v_existing_owner_count INTEGER;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_staff_id IS NOT NULL AND p_staff_id <> v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Authenticated user does not match staff id'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM staff_invitations si
  WHERE si.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Invitation has expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_owner_id = v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Owner cannot accept their own invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_owner_count
  FROM staff_relationships
  WHERE staff_id = v_staff_id
  AND status IN ('pending', 'active');

  IF v_existing_owner_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'This user is already bound to an owner'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT email INTO v_staff_email
  FROM auth.users
  WHERE id = v_staff_id;

  INSERT INTO staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_staff_email,
    'active',
    NOW(),
    '{"can_view": true, "can_edit": false}'::jsonb
  )
  ON CONFLICT (owner_id, staff_id)
  DO UPDATE SET
    staff_email = EXCLUDED.staff_email,
    status = 'active',
    accepted_at = NOW(),
    permissions = EXCLUDED.permissions,
    updated_at = NOW()
  RETURNING id INTO v_relationship_id;

  INSERT INTO market_members (
    market_id,
    user_id,
    role,
    joined_at
  )
  SELECT
    m.id,
    v_staff_id,
    'staff',
    NOW()
  FROM markets m
  WHERE m.owner_id = v_owner_id
    AND m.status IN ('ongoing', 'registered', 'accepted', 'paid')
    AND NOT EXISTS (
      SELECT 1
      FROM market_members mm
      WHERE mm.market_id = m.id
        AND mm.user_id = v_staff_id
    );

  DELETE FROM staff_invitations
  WHERE token = p_token;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;

COMMENT ON FUNCTION accept_invitation_and_bind(TEXT, UUID) IS
  'Accepts an invitation for auth.uid(), creates the staff relationship, and grants market membership atomically.';
