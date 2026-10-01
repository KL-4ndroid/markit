BEGIN;

-- Team downgrade keeps staff history but removes workspace access.
ALTER TABLE public.staff_relationships
  DROP CONSTRAINT IF EXISTS staff_relationships_status_check;
ALTER TABLE public.staff_relationships
  ADD CONSTRAINT staff_relationships_status_check
  CHECK (status IN ('pending', 'active', 'suspended_by_plan', 'revoked'));

COMMENT ON COLUMN public.staff_relationships.status IS
  'pending, active, suspended_by_plan (retained after Team downgrade), or revoked.';

CREATE OR REPLACE FUNCTION public.has_authoritative_team_entitlement(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscription_accounts AS sa
    WHERE sa.owner_id = p_owner_id
      AND sa.plan_code = 'team'
      AND sa.plan_source = 'admin'
      AND sa.billing_status = 'none'
      AND sa.entitlement_status IN ('active', 'grace')
      AND (sa.entitlement_ends_at IS NULL OR sa.entitlement_ends_at >= pg_catalog.now())
  );
$$;

REVOKE ALL ON FUNCTION public.has_authoritative_team_entitlement(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.suspend_owner_staff_for_plan(p_owner_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_suspended_count integer := 0;
BEGIN
  IF p_owner_id IS NULL THEN
    RETURN 0;
  END IF;

  UPDATE public.staff_relationships
  SET status = 'suspended_by_plan'
  WHERE owner_id = p_owner_id
    AND status = 'active';

  GET DIAGNOSTICS v_suspended_count = ROW_COUNT;

  DELETE FROM public.market_members AS mm
  USING public.markets AS m
  WHERE m.id = mm.market_id
    AND m.owner_id = p_owner_id
    AND mm.role = 'staff'
    AND EXISTS (
      SELECT 1
      FROM public.staff_relationships AS sr
      WHERE sr.owner_id = p_owner_id
        AND sr.staff_id = mm.user_id
        AND sr.status = 'suspended_by_plan'
    );

  RETURN v_suspended_count;
END;
$$;

REVOKE ALL ON FUNCTION public.suspend_owner_staff_for_plan(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_team_plan_staff_suspension()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  v_owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;

  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    PERFORM public.suspend_owner_staff_for_plan(v_owner_id);
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_team_plan_staff_suspension()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sync_team_plan_staff_suspension ON public.subscription_accounts;
CREATE TRIGGER sync_team_plan_staff_suspension
AFTER INSERT OR UPDATE OR DELETE ON public.subscription_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_team_plan_staff_suspension();

-- Existing pre-subscription staff relationships are retained but suspended.
DO $$
DECLARE
  v_owner_id uuid;
BEGIN
  FOR v_owner_id IN
    SELECT DISTINCT sr.owner_id
    FROM public.staff_relationships AS sr
    WHERE sr.status = 'active'
      AND NOT public.has_authoritative_team_entitlement(sr.owner_id)
  LOOP
    PERFORM public.suspend_owner_staff_for_plan(v_owner_id);
  END LOOP;
END;
$$;

-- Direct client mutations would bypass a presentation-only subscription gate.
-- Keep reads under RLS and route every mutation through the RPCs below.
DROP POLICY IF EXISTS "Owners can manage their staff" ON public.staff_relationships;
DROP POLICY IF EXISTS "Staff can accept invitations" ON public.staff_relationships;
DROP POLICY IF EXISTS "Owners can view their staff" ON public.staff_relationships;
DROP POLICY IF EXISTS "Staff can view their relationships" ON public.staff_relationships;

CREATE OR REPLACE FUNCTION public.can_current_staff_read_relationship(
  p_owner_id uuid,
  p_status text
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.staff_relationships AS sr
      WHERE sr.owner_id = p_owner_id
        AND sr.staff_id = auth.uid()
        AND sr.status = p_status
    )
    AND (
      p_status <> 'active'
      OR public.has_authoritative_team_entitlement(p_owner_id)
    );
$$;

REVOKE ALL ON FUNCTION public.can_current_staff_read_relationship(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_current_staff_read_relationship(uuid, text)
  TO authenticated;

CREATE POLICY "Owners can view their staff"
ON public.staff_relationships
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

CREATE POLICY "Staff can view their relationships"
ON public.staff_relationships
FOR SELECT
TO authenticated
USING (
  auth.uid() = staff_id
  AND public.can_current_staff_read_relationship(owner_id, status)
);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.staff_relationships
  FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Owners can insert invitations" ON public.staff_invitations;
DROP POLICY IF EXISTS "Owners can delete their invitations" ON public.staff_invitations;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.staff_invitations
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.current_user_market_ids()
RETURNS TABLE(market_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT mm.market_id
  FROM public.market_members AS mm
  JOIN public.markets AS m ON m.id = mm.market_id
  WHERE mm.user_id = auth.uid()
    AND (
      mm.role = 'owner'
      OR (
        mm.role = 'staff'
        AND public.has_authoritative_team_entitlement(m.owner_id)
        AND EXISTS (
          SELECT 1
          FROM public.staff_relationships AS sr
          WHERE sr.owner_id = m.owner_id
            AND sr.staff_id = auth.uid()
            AND sr.status = 'active'
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.current_user_market_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_market_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_staff_of(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT public.has_authoritative_team_entitlement(p_owner_id)
    AND EXISTS (
      SELECT 1
      FROM public.staff_relationships AS sr
      WHERE sr.staff_id = auth.uid()
        AND sr.owner_id = p_owner_id
        AND sr.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.get_my_owners()
RETURNS TABLE (
  owner_id uuid,
  owner_email text,
  permissions jsonb,
  accepted_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT sr.owner_id, u.email, sr.permissions, sr.accepted_at
  FROM public.staff_relationships AS sr
  JOIN auth.users AS u ON u.id = sr.owner_id
  WHERE sr.staff_id = auth.uid()
    AND sr.status = 'active'
    AND public.has_authoritative_team_entitlement(sr.owner_id);
$$;

REVOKE ALL ON FUNCTION public.is_staff_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_owners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_owners() TO authenticated;

CREATE OR REPLACE FUNCTION public.invite_staff_member(p_staff_email text)
RETURNS public.staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
  v_staff_id uuid;
  v_email text := pg_catalog.lower(pg_catalog.btrim(p_staff_email));
  v_existing public.staff_relationships%ROWTYPE;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION 'An active Team subscription is required.' USING ERRCODE = '42501';
  END IF;
  IF v_email IS NULL OR v_email = '' OR pg_catalog.length(v_email) > 320 THEN
    RAISE EXCEPTION 'Invalid staff email.' USING ERRCODE = '22023';
  END IF;

  SELECT p.id
  INTO v_staff_id
  FROM public.profiles AS p
  WHERE pg_catalog.lower(p.email) = v_email
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Registered staff account not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_staff_id = v_owner_id THEN
    RAISE EXCEPTION 'Owner cannot invite their own account.' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.staff_relationships
  WHERE owner_id = v_owner_id AND staff_id = v_staff_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.status = 'revoked' THEN
      UPDATE public.staff_relationships
      SET status = 'pending',
          staff_email = v_email,
          accepted_at = NULL,
          role = 'viewer',
          permissions = '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
      WHERE id = v_existing.id
      RETURNING * INTO v_record;
      RETURN v_record;
    END IF;

    IF v_existing.status = 'suspended_by_plan' THEN
      RAISE EXCEPTION 'Restore the retained staff relationship instead of inviting again.'
        USING ERRCODE = 'P0001';
    END IF;

    RAISE EXCEPTION 'This user is already invited or active staff.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.staff_relationships (
    owner_id, staff_id, staff_email, status, role, permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_email,
    'pending',
    'viewer',
    '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_staff_invitation()
RETURNS public.staff_invitations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
  v_record public.staff_invitations%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION 'An active Team subscription is required.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.staff_invitations (owner_id, token, expires_at)
  VALUES (
    v_owner_id,
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', ''),
    pg_catalog.now() + interval '3 days'
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_staff_invitation(p_invitation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.staff_invitations
  WHERE id = p_invitation_id AND owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_staff_email_invitation(p_relationship_id uuid)
RETURNS public.staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_staff_id uuid := auth.uid();
  v_owner_id uuid;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id
  INTO v_owner_id
  FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND staff_id = v_staff_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending staff invitation not found.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION 'The owner does not have an active Team subscription.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.staff_relationships
  SET status = 'active', accepted_at = pg_catalog.now()
  WHERE id = p_relationship_id
  RETURNING * INTO v_record;

  INSERT INTO public.market_members (market_id, user_id, role, joined_at)
  SELECT m.id, v_staff_id, 'staff', pg_catalog.now()
  FROM public.markets AS m
  WHERE m.owner_id = v_owner_id
    AND m.status IN ('ongoing', 'registered', 'accepted', 'paid')
  ON CONFLICT DO NOTHING;

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation_and_bind(
  p_token text,
  p_staff_id uuid
)
RETURNS TABLE (success boolean, message text, relationship_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid;
  v_expires_at timestamptz;
  v_relationship_id uuid;
  v_staff_id uuid := auth.uid();
  v_staff_email text;
BEGIN
  IF v_staff_id IS NULL THEN
    RETURN QUERY SELECT false, 'Authentication required'::text, NULL::uuid;
    RETURN;
  END IF;
  IF p_staff_id IS NOT NULL AND p_staff_id <> v_staff_id THEN
    RETURN QUERY SELECT false, 'Authenticated user does not match staff id'::text, NULL::uuid;
    RETURN;
  END IF;
  IF p_token IS NULL OR pg_catalog.length(pg_catalog.btrim(p_token)) < 16 THEN
    RETURN QUERY SELECT false, 'Invalid invitation token'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM public.staff_invitations AS si
  WHERE si.token = p_token
  FOR UPDATE;

  IF NOT FOUND OR v_expires_at < pg_catalog.now() THEN
    RETURN QUERY SELECT false, 'Invalid or expired invitation token'::text, NULL::uuid;
    RETURN;
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RETURN QUERY SELECT false, 'The owner does not have an active Team subscription'::text, NULL::uuid;
    RETURN;
  END IF;
  IF v_owner_id = v_staff_id THEN
    RETURN QUERY SELECT false, 'Owner cannot accept their own invitation'::text, NULL::uuid;
    RETURN;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.staff_relationships
    WHERE staff_id = v_staff_id
      AND status IN ('pending', 'active', 'suspended_by_plan')
  ) THEN
    RETURN QUERY SELECT false, 'This user is already bound to an owner'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT u.email INTO v_staff_email
  FROM auth.users AS u
  WHERE u.id = v_staff_id;

  INSERT INTO public.staff_relationships (
    owner_id, staff_id, staff_email, status, accepted_at, role, permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_staff_email,
    'active',
    pg_catalog.now(),
    'viewer',
    '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
  )
  ON CONFLICT (owner_id, staff_id)
  DO UPDATE SET
    staff_email = EXCLUDED.staff_email,
    status = 'active',
    accepted_at = pg_catalog.now(),
    role = 'viewer',
    permissions = EXCLUDED.permissions
  WHERE public.staff_relationships.status = 'revoked'
  RETURNING id INTO v_relationship_id;

  IF v_relationship_id IS NULL THEN
    RETURN QUERY SELECT false, 'Retained relationship requires owner restoration'::text, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.market_members (market_id, user_id, role, joined_at)
  SELECT m.id, v_staff_id, 'staff', pg_catalog.now()
  FROM public.markets AS m
  WHERE m.owner_id = v_owner_id
    AND m.status IN ('ongoing', 'registered', 'accepted', 'paid')
  ON CONFLICT DO NOTHING;

  DELETE FROM public.staff_invitations WHERE token = p_token;
  RETURN QUERY SELECT true, 'Invitation accepted'::text, v_relationship_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_staff_email_invitation(p_relationship_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND staff_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending staff invitation not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_staff_relationship(p_relationship_id uuid)
RETURNS public.staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
  v_staff_id uuid;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION 'An active Team subscription is required.' USING ERRCODE = '42501';
  END IF;

  SELECT staff_id
  INTO v_staff_id
  FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status = 'suspended_by_plan'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suspended staff relationship not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.staff_relationships
  SET status = 'active'
  WHERE id = p_relationship_id
  RETURNING * INTO v_record;

  INSERT INTO public.market_members (market_id, user_id, role, joined_at)
  SELECT m.id, v_staff_id, 'staff', pg_catalog.now()
  FROM public.markets AS m
  WHERE m.owner_id = v_owner_id
    AND m.status IN ('ongoing', 'registered', 'accepted', 'paid')
  ON CONFLICT DO NOTHING;

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_staff_member(p_staff_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.staff_relationships
  SET status = 'revoked'
  WHERE owner_id = v_owner_id
    AND staff_id = p_staff_id
    AND status IN ('pending', 'active', 'suspended_by_plan');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff relationship not found.' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.market_members AS mm
  USING public.markets AS m
  WHERE m.id = mm.market_id
    AND m.owner_id = v_owner_id
    AND mm.user_id = p_staff_id
    AND mm.role = 'staff';

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_staff_relationship(p_relationship_id uuid)
RETURNS public.staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
  v_staff_id uuid;
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.staff_relationships
  SET status = 'revoked'
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status IN ('pending', 'active', 'suspended_by_plan')
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff relationship not found.' USING ERRCODE = 'P0002';
  END IF;

  v_staff_id := v_record.staff_id;

  DELETE FROM public.market_members AS mm
  USING public.markets AS m
  WHERE m.id = mm.market_id
    AND m.owner_id = v_owner_id
    AND mm.user_id = v_staff_id
    AND mm.role = 'staff';

  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_role(
  p_relationship_id uuid,
  p_role text
)
RETURNS public.staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION 'An active Team subscription is required.' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('viewer', 'operator', 'manager') THEN
    RAISE EXCEPTION 'Invalid staff role.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.staff_relationships
  SET role = p_role,
      permissions = pg_catalog.jsonb_build_object(
        'can_view', true,
        'can_edit', p_role IN ('operator', 'manager'),
        'infoLevel', CASE p_role WHEN 'viewer' THEN 0 ELSE 2 END
      )
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status = 'active'
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active staff relationship not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_staff_permissions(
  p_relationship_id uuid,
  p_permissions jsonb
)
RETURNS public.staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_owner_id uuid := auth.uid();
  v_record public.staff_relationships%ROWTYPE;
BEGIN
  IF v_owner_id IS NULL OR NOT public.has_authoritative_team_entitlement(v_owner_id) THEN
    RAISE EXCEPTION 'An active Team subscription is required.' USING ERRCODE = '42501';
  END IF;
  IF pg_catalog.jsonb_typeof(p_permissions) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid staff permissions.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.staff_relationships
  SET permissions = p_permissions
  WHERE id = p_relationship_id
    AND owner_id = v_owner_id
    AND status = 'active'
  RETURNING * INTO v_record;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active staff relationship not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_record;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_revoked_staff_relationship(p_relationship_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.staff_relationships
  WHERE id = p_relationship_id
    AND owner_id = auth.uid()
    AND status = 'revoked';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Revoked staff relationship not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN true;
END;
$$;

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
    si.expires_at > pg_catalog.now()
      AND public.has_authoritative_team_entitlement(si.owner_id),
    si.owner_id,
    u.email,
    si.expires_at
  FROM public.staff_invitations AS si
  JOIN auth.users AS u ON u.id = si.owner_id
  WHERE si.token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::timestamptz;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.invite_staff_member(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_staff_invitation() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_staff_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_staff_email_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_invitation_and_bind(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decline_staff_email_invitation(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_staff_relationship(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_staff_member(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_staff_relationship(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_staff_role(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_staff_permissions(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_revoked_staff_relationship(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.invite_staff_member(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_staff_invitation() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_staff_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_staff_email_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_and_bind(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_staff_email_invitation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_staff_relationship(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_staff_relationship(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_staff_permissions(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_revoked_staff_relationship(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_invitation_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invitation_token(text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.cleanup_expired_invitations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_invitations() TO service_role;

REVOKE ALL ON FUNCTION public.get_my_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_staff() TO authenticated;

COMMENT ON FUNCTION public.has_authoritative_team_entitlement(uuid) IS
  'Authoritative Team check for the currently connected admin source. Simulation, billing, and promotion never authorize database writes.';
COMMENT ON FUNCTION public.restore_staff_relationship(uuid) IS
  'Explicitly restores one suspended_by_plan relationship after Team entitlement returns; upgrade never auto-restores staff access.';

COMMIT;
