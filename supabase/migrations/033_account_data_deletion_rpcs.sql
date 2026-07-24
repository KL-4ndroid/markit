-- Move destructive account/team cleanup into SECURITY DEFINER RPCs.
-- This keeps cloud mutations atomic and lets clients clear local caches only after success.

CREATE OR REPLACE FUNCTION delete_current_user_app_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := '{}'::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = v_user_id;

  DELETE FROM staff_invitations
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_invitations', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = v_user_id
     OR staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_relationships', v_count);

  DELETE FROM market_members
  WHERE user_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('market_members', v_count);

  DELETE FROM events
  WHERE actor_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('events', v_count);

  DELETE FROM products
  WHERE owner_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('products', v_count);

  DELETE FROM snapshots
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('snapshots', v_count);

  DELETE FROM user_settings
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('user_settings', v_count);

  DELETE FROM events_archive
  WHERE actor_id = v_user_id
     OR archived_by = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('events_archive', v_count);

  DELETE FROM markets
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('markets', v_count);

  RETURN v_result || jsonb_build_object('user_id', v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION leave_current_staff_team(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := '{}'::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner id is required';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = p_owner_id;

  DELETE FROM market_members
  WHERE user_id = v_user_id
    AND role = 'staff'
    AND market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('market_members', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = p_owner_id
    AND staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_relationships', v_count);

  RETURN v_result || jsonb_build_object('owner_id', p_owner_id, 'staff_id', v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION delete_current_user_app_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION leave_current_staff_team(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION delete_current_user_app_data() TO authenticated;
GRANT EXECUTE ON FUNCTION leave_current_staff_team(UUID) TO authenticated;

COMMENT ON FUNCTION delete_current_user_app_data() IS
  'Deletes the authenticated user app data in one transaction; auth user removal is intentionally not handled here.';

COMMENT ON FUNCTION leave_current_staff_team(UUID) IS
  'Removes the authenticated staff user from a specific owner team in one transaction.';
