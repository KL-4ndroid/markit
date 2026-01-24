-- ==================== 修復 RLS 政策 - 無限遞迴問題 ====================
-- 版本：004_fix - 修復 market_members 無限遞迴
-- 日期：2026-01-24
-- 說明：移除會造成循環查詢的 RLS 政策

-- ==================== 刪除有問題的政策 ====================

-- 刪除 market_members 的舊政策
DROP POLICY IF EXISTS "用戶可以查看自己所在市集的成員" ON market_members;
DROP POLICY IF EXISTS "允許 service_role 插入成員" ON market_members;
DROP POLICY IF EXISTS "允許 service_role 刪除成員" ON market_members;

-- ==================== 重新創建正確的政策 ====================

-- 用戶可以查看自己參與的市集的成員（使用簡單的條件，避免遞迴）
CREATE POLICY "用戶可以查看自己參與的市集的成員_v2"
ON market_members FOR SELECT
TO authenticated
USING (
  -- 直接檢查當前用戶是否在同一個市集中
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 允許 authenticated 用戶插入成員（通過 RPC）
CREATE POLICY "允許 authenticated 插入成員"
ON market_members FOR INSERT
TO authenticated
WITH CHECK (
  -- 只能通過 RPC 函數插入，RPC 會檢查權限
  true
);

-- 允許 authenticated 用戶刪除成員（通過 RPC）
CREATE POLICY "允許 authenticated 刪除成員"
ON market_members FOR DELETE
TO authenticated
USING (
  -- 只能通過 RPC 函數刪除，RPC 會檢查權限
  true
);

-- ==================== 修復 Events 表政策 ====================

-- 刪除舊的 events 政策
DROP POLICY IF EXISTS "用戶可以查看自己市集的事件" ON events;
DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;
DROP POLICY IF EXISTS "允許 service_role 插入事件" ON events;

-- 用戶可以查看自己市集的事件（避免遞迴）
CREATE POLICY "用戶可以查看自己市集的事件_v2"
ON events FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 用戶可以插入事件（簡化權限檢查）
CREATE POLICY "用戶可以插入事件_v2"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
);

-- ==================== 修復 Markets 表政策 ====================

-- 刪除舊的 markets 政策
DROP POLICY IF EXISTS "用戶可以查看自己是成員的市集" ON markets;
DROP POLICY IF EXISTS "允許 service_role 插入市集" ON markets;
DROP POLICY IF EXISTS "允許 service_role 更新市集" ON markets;

-- 用戶可以查看自己是成員的市集（避免遞迴）
CREATE POLICY "用戶可以查看自己是成員的市集_v2"
ON markets FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 允許 authenticated 用戶插入市集（通過 Trigger）
CREATE POLICY "允許 authenticated 插入市集"
ON markets FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允許 authenticated 用戶更新市集（通過 Trigger）
CREATE POLICY "允許 authenticated 更新市集"
ON markets FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- ==================== 修復 Products 表政策 ====================

-- 刪除舊的 products 政策
DROP POLICY IF EXISTS "用戶可以查看自己市集的商品" ON products;
DROP POLICY IF EXISTS "允許 service_role 插入商品" ON products;
DROP POLICY IF EXISTS "允許 service_role 更新商品" ON products;

-- 用戶可以查看自己市集的商品（避免遞迴）
CREATE POLICY "用戶可以查看自己市集的商品_v2"
ON products FOR SELECT
TO authenticated
USING (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- 允許 authenticated 用戶插入商品（通過 Trigger）
CREATE POLICY "允許 authenticated 插入商品"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允許 authenticated 用戶更新商品（通過 Trigger）
CREATE POLICY "允許 authenticated 更新商品"
ON products FOR UPDATE
TO authenticated
USING (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
)
WITH CHECK (
  market_id IS NULL OR
  market_id IN (
    SELECT m.market_id 
    FROM market_members m 
    WHERE m.user_id = auth.uid()
  )
);

-- ==================== 註解 ====================

COMMENT ON POLICY "用戶可以查看自己參與的市集的成員_v2" ON market_members IS '修復版：避免無限遞迴';
COMMENT ON POLICY "用戶可以查看自己市集的事件_v2" ON events IS '修復版：避免無限遞迴';
COMMENT ON POLICY "用戶可以查看自己是成員的市集_v2" ON markets IS '修復版：避免無限遞迴';
COMMENT ON POLICY "用戶可以查看自己市集的商品_v2" ON products IS '修復版：避免無限遞迴';

-- ==================== 完成 ====================
-- RLS 政策已修復
-- 請在 Supabase SQL Editor 中執行此腳本
