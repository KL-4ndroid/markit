-- ============================================================
-- 045_get_my_staff_add_relationship_id.sql
-- Purpose:   Include relationship_id in get_my_staff() RPC result.
-- Date:      2026-06-18
-- Severity:  Yellow (DB RPC return type change)
-- Phase:     P4 必要前置（讓 update_staff_role() 可以從前端拿 relationship id）
--
-- 背景：
-- 043_staff_role_foundation.sql 建立 staff_relationships.role
-- 044_get_my_staff_add_role.sql 讓 get_my_staff() 回傳 role
-- 045 補上 relationship_id 欄位（staff_relationships.id 主鍵）
-- 供未來 update_staff_role(p_relationship_id, p_role) 使用
--
-- 改動範圍：
--   - 重建 get_my_staff() RETURNS TABLE，新增 relationship_id UUID 欄位
--   - 不改其他 RPC（get_my_owners / is_staff_of / accept_invitation_and_bind / update_staff_role）
--   - 不改 RLS policy
--   - 不改前端 runtime 行為（沒改任何 TS / UI）
--   - 不加 GRANT / REVOKE（既有 20240220_staff_system_simple.sql 沒做特別授權，
--     維持 Postgres 預設 PUBLIC EXECUTE 狀態；044 也無 GRANT / REVOKE）
--
-- 安全性：
--   - 保留 SECURITY DEFINER
--   - 加上 SET search_path = public（與 043 / 044 風格一致，避免 search_path 攻擊）
--   - DROP FUNCTION 不用 CASCADE（get_my_staff 沒有相依物件）
--   - SQL 內部不動 owner_id 推導邏輯（仍 WHERE sr.owner_id = auth.uid()）
-- ============================================================

-- 1. 刪除舊 function（return type 改變，CREATE OR REPLACE 會失敗）
--    不使用 CASCADE：get_my_staff 沒有相依物件（view / trigger / 其他 function）
DROP FUNCTION IF EXISTS public.get_my_staff();

-- 2. 重建 function，新增 relationship_id 欄位
CREATE OR REPLACE FUNCTION public.get_my_staff()
RETURNS TABLE (
  relationship_id  UUID,        -- ✅ 新增：staff_relationships.id（主鍵）
  staff_id         UUID,
  staff_email      TEXT,
  status           TEXT,
  permissions      JSONB,
  role             TEXT,
  invited_at       TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id          AS relationship_id,
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.role,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;

-- 3. 更新 function 註解
COMMENT ON FUNCTION public.get_my_staff() IS
  'Returns staff members for the current owner. After 045, includes relationship_id (staff_relationships.id) and role (043). SECURITY DEFINER + SET search_path = public. Privileges: Postgres default PUBLIC EXECUTE (no explicit GRANT/REVOKE in 20240220_staff_system_simple.sql, 044, or 045).';

-- ============================================================
-- 驗證 SQL（人工套用後執行）
-- ============================================================
/*
-- 1. function 存在且回傳正確欄位
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid)     AS result_definition,
  p.prosecdef                        AS is_security_definer,
  p.proconfig                        AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_my_staff';

-- 預期：
--   result_definition 含 "relationship_id uuid, staff_id uuid, ..., role text"
--   is_security_definer = true
--   config_settings 含 {search_path=public}

-- 2. 驗證 owner 可正常查詢
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<owner_user_id>', true);
SELECT relationship_id, staff_id, role, status FROM public.get_my_staff();
-- 預期：每筆 relationship_id 都有值，role 都是 'viewer' / 'operator' / 'manager'

-- 3. 驗證其他 RPC 沒被改
SELECT proname FROM pg_proc
WHERE proname IN ('get_my_staff', 'get_my_owners', 'is_staff_of', 'accept_invitation_and_bind', 'update_staff_role')
ORDER BY proname;
-- 預期：5 個都存在
*/

-- ============================================================
-- End of 045_get_my_staff_add_relationship_id.sql
-- ============================================================
