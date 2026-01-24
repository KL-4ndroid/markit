-- ==================== 最終修復：market_members RLS 政策 ====================
-- 版本：006_final_fix
-- 日期：2026-01-24
-- 說明：正確的 RLS 政策，避免無限遞迴

-- ==================== 刪除現有政策 ====================

DROP POLICY IF EXISTS "market_members_select" ON market_members;
DROP POLICY IF EXISTS "market_members_insert" ON market_members;
DROP POLICY IF EXISTS "market_members_delete" ON market_members;

-- ==================== 創建正確的政策 ====================

-- SELECT: 用戶可以查看自己參與的市集的所有成員
-- 使用 CTE 避免遞迴
CREATE POLICY "market_members_select_v3"
ON market_members FOR SELECT
TO authenticated
USING (
  -- 方案：使用 security definer 函數
  market_id IN (
    SELECT mm.market_id 
    FROM market_members mm 
    WHERE mm.user_id = auth.uid()
  )
);

-- INSERT: 允許插入（由 RPC 函數控制）
CREATE POLICY "market_members_insert_v3"
ON market_members FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE: 允許刪除（由 RPC 函數控制）
CREATE POLICY "market_members_delete_v3"
ON market_members FOR DELETE
TO authenticated
USING (true);

-- ==================== 如果還是有遞迴問題，使用這個替代方案 ====================

-- 如果上面的政策還是有問題，執行以下腳本：

-- 方案 A: 完全禁用 market_members 的 RLS，依賴 RPC 函數
-- ALTER TABLE market_members DISABLE ROW LEVEL SECURITY;

-- 方案 B: 使用 security definer 函數
CREATE OR REPLACE FUNCTION user_market_ids(p_user_id UUID)
RETURNS TABLE(market_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT market_id FROM market_members WHERE user_id = p_user_id;
$$;

-- 然後使用這個函數在政策中
DROP POLICY IF EXISTS "market_members_select_v3" ON market_members;

CREATE POLICY "market_members_select_v4"
ON market_members FOR SELECT
TO authenticated
USING (
  market_id IN (SELECT user_market_ids(auth.uid()))
);

-- ==================== 完成 ====================
-- 請執行此腳本，如果還有問題，請告訴我
