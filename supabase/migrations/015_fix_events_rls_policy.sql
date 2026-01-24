-- ==================== 修復 Events 表 RLS 政策 ====================
-- 版本：015 - 修復事件查詢政策（支援商品同步）
-- 日期：2026-01-25
-- 說明：
--   1. 修復 events 表的 SELECT 政策
--   2. 允許用戶查詢自己的全局事件（market_id = NULL）
--   3. 支援商品事件的跨設備同步

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以查看自己市集的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以查看：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. 自己參與的市集的事件
CREATE POLICY "用戶可以查看自己的事件和市集事件"
ON events FOR SELECT
TO authenticated
USING (
  -- 自己創建的事件（包括 market_id = NULL 的商品事件）
  actor_id = auth.uid()
  OR
  -- 自己參與的市集的事件
  (
    market_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);

-- ==================== 註解 ====================

COMMENT ON POLICY "用戶可以查看自己的事件和市集事件" ON events IS 
'允許用戶查看：1. 自己創建的所有事件（包括商品事件）2. 自己參與的市集的事件';

-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 測試查詢自己的商品事件
SELECT * FROM events 
WHERE type = 'product_created' 
  AND actor_id = auth.uid();
-- 應該返回自己創建的商品事件

-- 2. 測試查詢市集事件
SELECT * FROM events 
WHERE market_id IN (
  SELECT market_id FROM market_members WHERE user_id = auth.uid()
);
-- 應該返回自己參與的市集的事件

-- 3. 測試查詢其他人的商品事件（應該失敗）
SELECT * FROM events 
WHERE type = 'product_created' 
  AND actor_id != auth.uid();
-- 應該返回空結果
*/

-- ==================== 完成 ====================
-- Events 表 RLS 政策已修復
-- 現在支援商品事件的跨設備同步
