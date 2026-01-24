-- ==================== Row Level Security (RLS) Policies ====================
-- 版本：004 - RLS 政策
-- 日期：2026-01-24
-- 說明：設置 Row Level Security 政策，確保資料安全

-- ==================== 啟用 RLS ====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ==================== Profiles 表政策 ====================

-- 用戶可以查看所有 profiles（用於顯示成員資訊）
CREATE POLICY "用戶可以查看所有 profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- 用戶只能更新自己的 profile
CREATE POLICY "用戶只能更新自己的 profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 用戶可以插入自己的 profile（註冊時）
CREATE POLICY "用戶可以插入自己的 profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- ==================== Markets 表政策 ====================

-- 用戶可以查看自己是成員的市集
CREATE POLICY "用戶可以查看自己是成員的市集"
ON markets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = markets.id
      AND user_id = auth.uid()
  )
);

-- 用戶可以插入市集（通過事件）
-- 注意：實際插入由 Trigger 完成，這裡允許 service_role
CREATE POLICY "允許 service_role 插入市集"
ON markets FOR INSERT
TO service_role
WITH CHECK (true);

-- 用戶可以更新自己擁有的市集（通過事件）
-- 注意：實際更新由 Trigger 完成，這裡允許 service_role
CREATE POLICY "允許 service_role 更新市集"
ON markets FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ==================== Products 表政策 ====================

-- 用戶可以查看自己市集的商品
CREATE POLICY "用戶可以查看自己市集的商品"
ON products FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = products.market_id
      AND user_id = auth.uid()
  )
);

-- 允許 service_role 插入商品（通過 Trigger）
CREATE POLICY "允許 service_role 插入商品"
ON products FOR INSERT
TO service_role
WITH CHECK (true);

-- 允許 service_role 更新商品（通過 Trigger）
CREATE POLICY "允許 service_role 更新商品"
ON products FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ==================== Market Members 表政策 ====================

-- 用戶可以查看自己所在市集的成員
CREATE POLICY "用戶可以查看自己所在市集的成員"
ON market_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM market_members mm
    WHERE mm.market_id = market_members.market_id
      AND mm.user_id = auth.uid()
  )
);

-- 允許 service_role 插入成員（通過 RPC）
CREATE POLICY "允許 service_role 插入成員"
ON market_members FOR INSERT
TO service_role
WITH CHECK (true);

-- 允許 service_role 刪除成員（通過 RPC）
CREATE POLICY "允許 service_role 刪除成員"
ON market_members FOR DELETE
TO service_role
USING (true);

-- ==================== Market Invitations 表政策 ====================

-- 用戶只能查看自己創建的邀請碼
CREATE POLICY "用戶只能查看自己創建的邀請碼"
ON market_invitations FOR SELECT
TO authenticated
USING (created_by = auth.uid());

-- 市集 owner 可以創建邀請碼（通過 RPC）
CREATE POLICY "允許 service_role 插入邀請碼"
ON market_invitations FOR INSERT
TO service_role
WITH CHECK (true);

-- 允許 service_role 更新邀請碼（通過 RPC）
CREATE POLICY "允許 service_role 更新邀請碼"
ON market_invitations FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- ==================== Events 表政策 ====================

-- 用戶可以查看自己市集的事件
CREATE POLICY "用戶可以查看自己市集的事件"
ON events FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = events.market_id
      AND user_id = auth.uid()
  )
);

-- 用戶可以插入自己市集的事件
CREATE POLICY "用戶可以插入自己市集的事件"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  (
    market_id IS NULL OR
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);

-- 允許 service_role 插入事件（用於 Trigger）
CREATE POLICY "允許 service_role 插入事件"
ON events FOR INSERT
TO service_role
WITH CHECK (true);

-- ==================== 特殊政策：Trigger 執行權限 ====================

-- 授予 Trigger 函數執行權限
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, service_role;

-- 授予 authenticated 用戶查詢權限
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT ON events TO authenticated;

-- ==================== 安全函數：檢查用戶權限 ====================

CREATE OR REPLACE FUNCTION check_user_market_permission(
  p_market_id UUID,
  p_required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 查詢用戶角色
  SELECT role INTO v_user_role
  FROM market_members
  WHERE market_id = p_market_id
    AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- 如果需要特定角色
  IF p_required_role IS NOT NULL THEN
    RETURN v_user_role = p_required_role;
  END IF;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION check_user_market_permission(UUID, TEXT) TO authenticated;

-- ==================== 註解 ====================

COMMENT ON POLICY "用戶可以查看所有 profiles" ON profiles IS '允許查看所有用戶資料（用於顯示成員資訊）';
COMMENT ON POLICY "用戶可以查看自己是成員的市集" ON markets IS '只能查看自己參與的市集';
COMMENT ON POLICY "用戶可以查看自己市集的商品" ON products IS '只能查看自己市集的商品';
COMMENT ON POLICY "用戶可以查看自己市集的事件" ON events IS '只能查看自己市集的事件';
COMMENT ON POLICY "用戶可以插入自己市集的事件" ON events IS '只能插入自己市集的事件';

COMMENT ON FUNCTION check_user_market_permission(UUID, TEXT) IS '檢查用戶是否有市集權限';

-- ==================== 測試 RLS 政策 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 創建測試用戶（需要先在 Authentication 中創建）
-- 2. 測試查詢權限
SELECT * FROM markets; -- 應該只返回用戶是成員的市集

-- 3. 測試插入權限
INSERT INTO events (type, payload, actor_id, market_id)
VALUES (
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  uuid_generate_v4()
); -- 應該成功

-- 4. 測試 RPC 函數
SELECT generate_invite_code('市集UUID'); -- 應該成功（如果是 owner）
SELECT join_market_by_code('邀請碼'); -- 應該成功
*/

-- ==================== 完成 ====================
-- RLS 政策設置完成
-- 所有 SQL 遷移腳本已完成！
-- 
-- 執行順序：
-- 1. 001_uuid_schema.sql
-- 2. 002_cqrs_triggers.sql
-- 3. 003_rpc_functions.sql
-- 4. 004_rls_policies.sql
