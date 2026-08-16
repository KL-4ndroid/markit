-- ============================================================
-- P1: DB Role Foundation
-- Migration: 043_staff_role_foundation.sql
-- Date: 2026-06-18
-- Phase: P1（純 DB + RPC，零前端 / runtime 行為變動）
--
-- 目標：
-- 讓 staff_relationships 表具備 role-based 員工權限的基礎能力，
-- 但前端目前不讀取、不顯示、不使用這個 role。
--
-- 角色：
--   viewer   - 基礎查看者（純只查看，不可寫入）
--   operator - 出攤助手（可記錄互動 / 成交 / 編輯自己當日紀錄）
--   manager  - 管理員（operator 額外 + 協助編輯市集 / 商品基本資料）
--
-- 設計原則：
--   - role 為 Primary Source of Truth
--   - permissions JSON 仍保留（過渡用），由 RPC 同步更新
--   - DEFAULT 'viewer' 確保新記錄與既有邀請流程安全
--   - CHECK 限制合法 enum
--   - 回填既有資料：can_edit=true → operator，false → viewer
--   - update_staff_role RPC 為唯一受控寫入路徑
--   - 不 DROP 任何 RLS policy
--   - 不加固 WITH CHECK（保留既有 "Staff can accept invitations"）
--   - 不動其他 TS / UI / sync / Dexie
-- ============================================================

-- ============================================================
-- A. 新增 role 欄位
-- ============================================================

ALTER TABLE staff_relationships
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

-- ============================================================
-- B. 新增 CHECK constraint（用 DO $$ 避免重複新增）
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_relationships_role_check'
  ) THEN
    ALTER TABLE staff_relationships
      ADD CONSTRAINT staff_relationships_role_check
      CHECK (role IN ('viewer', 'operator', 'manager'));
  END IF;
END $$;

COMMENT ON COLUMN staff_relationships.role IS
  '員工角色：viewer（查看者，僅可看）、operator（出攤助手，可記錄）、manager（管理員，可協助編輯基本資料）';

-- ============================================================
-- C. 回填舊資料
-- 規則：
--   permissions.can_edit = true  → operator
--   其他 / false / null          → viewer
-- DEFAULT 'viewer' 已經處理了新增列，UPDATE 處理既有列
-- ============================================================

UPDATE staff_relationships
SET role = CASE
  WHEN COALESCE((permissions->>'can_edit')::boolean, false) = true THEN 'operator'
  ELSE 'viewer'
END;

-- ============================================================
-- D. 建立 update_staff_role RPC
-- 唯一受控寫入路徑（owner 才能調整自己 active 員工的角色）
-- ============================================================

CREATE OR REPLACE FUNCTION update_staff_role(
  p_relationship_id UUID,
  p_role TEXT
)
RETURNS staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_staff_id UUID;
  v_status   TEXT;
  v_record   staff_relationships%ROWTYPE;
BEGIN
  -- (1) 驗證 role 參數（enum gate）
  IF p_role NOT IN ('viewer', 'operator', 'manager') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be viewer, operator, or manager.', p_role
      USING ERRCODE = '22023';
  END IF;

  -- (2) 讀取目標記錄
  SELECT owner_id, staff_id, status
    INTO v_owner_id, v_staff_id, v_status
    FROM staff_relationships
   WHERE id = p_relationship_id;

  -- (3) 驗證存在性
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff relationship not found: %', p_relationship_id
      USING ERRCODE = 'P0002';
  END IF;

  -- (4) 驗證呼叫者為 owner
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: you are not the owner of this staff relationship.'
      USING ERRCODE = '42501';
  END IF;

  -- (5) 驗證 status = active
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Cannot change role for % relationship; only active relationships are editable.', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- (6) 禁止 staff 自己改自己
  IF v_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: staff cannot change their own role.'
      USING ERRCODE = '42501';
  END IF;

  -- (7) 執行更新（只允許 role + 過渡用 permissions）
  -- updated_at 由既有 trigger (update_staff_relationships_timestamp) 自動更新
  UPDATE staff_relationships
     SET role = p_role,
         permissions = jsonb_build_object(
           'can_view', true,
           'can_edit', (p_role IN ('operator', 'manager')),
           'infoLevel', CASE p_role
                          WHEN 'viewer'   THEN 0
                          WHEN 'operator' THEN 2
                          WHEN 'manager'  THEN 2
                        END
         )
   WHERE id = p_relationship_id
   RETURNING * INTO v_record;

  -- (8) 回傳更新後記錄
  RETURN v_record;
END;
$$;

COMMENT ON FUNCTION update_staff_role IS
  '更新員工角色。只有 owner 可呼叫，且只能改自己團隊中 status=active 的員工角色。';

-- ============================================================
-- E. 收緊 RPC 權限
-- Supabase 預設 PUBLIC 有 EXECUTE，必須明確 revoke
-- ============================================================

REVOKE EXECUTE ON FUNCTION update_staff_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION update_staff_role(UUID, TEXT) TO authenticated;

-- ============================================================
-- End of 043_staff_role_foundation.sql
-- ============================================================
