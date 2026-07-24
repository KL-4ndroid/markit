-- ============================================================
-- Migration: 046_align_staff_permissions_with_role.sql
-- Date: 2026-06-18
-- Phase: P3 legacy align（純資料回填 + DDL default + RPC literal 修正）
--
-- 目標：
-- 讓 staff_relationships.permissions 與 staff_relationships.role 對齊
-- 解決既有 viewer 員工 runtime fallback L2（無 infoLevel）造成的資料落差。
--
-- 此 migration 會讓 viewer 從舊 fallback L2 收斂為明確 L0。
-- Production audit 顯示受影響 active viewer 為 2 筆，revoked viewer 1 筆。
--
-- Role matrix（與 043_staff_role_foundation.sql update_staff_role RPC CASE 對齊）：
--   viewer   → can_view=true, can_edit=false, infoLevel=0
--   operator → can_view=true, can_edit=true,  infoLevel=2
--   manager  → can_view=true, can_edit=true,  infoLevel=2
--
-- 設計原則：
--   - 純資料 / DDL / RPC literal 修補，不引入新 runtime 行為
--   - 不改 update_staff_role RPC 行為（043 已正確）
--   - 不改 RLS policy
--   - 不改 function signature
-- ============================================================

-- ============================================================
-- A. 將 permissions DDL DEFAULT 改為 viewer + L0
--    影響：未來 INSERT 未指定 permissions 的 row 會拿到含 infoLevel=0 的完整 JSON
-- ============================================================

ALTER TABLE staff_relationships
  ALTER COLUMN permissions SET DEFAULT
  '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb;

COMMENT ON COLUMN staff_relationships.permissions IS
  '員工權限設定（JSON）。viewer=L0、operator/manager=L2。請以 role 為主，permissions 由 update_staff_role RPC 同步。';

-- ============================================================
-- B. 回填所有既有 staff_relationships，讓 permissions 與 role 一致
--
-- 規則（與 043 update_staff_role RPC CASE 對齊）：
--   role = 'viewer'   → infoLevel=0, can_edit=false
--   role = 'operator' → infoLevel=2, can_edit=true
--   role = 'manager'  → infoLevel=2, can_edit=true
--   其他 / NULL         → infoLevel=0, can_edit=false（保守預設）
--
-- 影響：
--   - 既有缺 infoLevel 的 active viewer：L2 → L0（會感知到收入/價格/成交統計被隱藏）
--   - 既有缺 infoLevel 的 revoked viewer：同上，但 revoked 已無 active session
--   - 既有 operator / manager：已是 L2 回填為 noop
--   - 既有 row 若有其他自訂 key：會被整個覆蓋為 role matrix 對應 JSON
-- ============================================================

UPDATE staff_relationships
SET permissions = jsonb_build_object(
      'can_view', true,
      'can_edit', (role IN ('operator', 'manager')),
      'infoLevel', CASE
        WHEN role = 'viewer' THEN 0
        WHEN role IN ('operator', 'manager') THEN 2
        ELSE 0
      END
    )
WHERE role IN ('viewer', 'operator', 'manager');

-- ============================================================
-- C. 重建 accept_invitation_and_bind RPC
--
-- 031 / 032 已是最終覆寫版本（028 為初始），重建 032 body 即可。
-- 唯一變更：permissions literal 加入 infoLevel=0。
-- 不改：function signature、回傳型別、RLS 權限、業務流程。
-- ============================================================

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
    '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
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
      SELECT 1 FROM market_members mm
      WHERE mm.market_id = m.id
        AND mm.user_id = v_staff_id
    );

  DELETE FROM staff_invitations
  WHERE token = p_token;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;

COMMENT ON FUNCTION accept_invitation_and_bind(TEXT, UUID) IS
  'Accepts an invitation for auth.uid(), creates the staff relationship, and grants market membership atomically. 046 補上 infoLevel=0。';

-- ============================================================
-- End of 046_align_staff_permissions_with_role.sql
-- ============================================================

-- ============================================================
-- 驗證 SQL（套用後人工執行，預期結果如下）
-- ============================================================
--
-- (1) 預期所有 row has_info_level = true
-- SELECT
--   status,
--   role,
--   permissions ? 'infoLevel' AS has_info_level,
--   permissions->>'infoLevel' AS info_level,
--   COUNT(*) AS count
-- FROM staff_relationships
-- GROUP BY status, role, has_info_level, info_level
-- ORDER BY status, role, has_info_level, info_level;
--
-- 預期：每個 (status, role) 群組都有 has_info_level=true 的 row
--      不應有 has_info_level=false 的 row
--
-- (2) 預期 can_edit 與 infoLevel 對齊 role matrix
-- SELECT
--   role,
--   permissions->>'can_edit' AS can_edit,
--   permissions->>'infoLevel' AS info_level,
--   COUNT(*) AS count
-- FROM staff_relationships
-- GROUP BY role, can_edit, info_level
-- ORDER BY role, can_edit, info_level;
--
-- 預期：
--   viewer   / can_edit=false / infoLevel=0
--   operator / can_edit=true  / infoLevel=2
--   manager  / can_edit=true  / infoLevel=2
-- ============================================================
