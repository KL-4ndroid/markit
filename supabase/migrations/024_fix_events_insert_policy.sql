-- ==================== 修復 Events 表 INSERT RLS 政策 ====================
-- 版本：024 - 修復事件插入政策
-- 日期：2026-02-23
-- 說明：
--   1. 修復 events 表的 INSERT 政策
--   2. 允許用戶插入 market_created 事件（即使 market_members 還不存在）
--   3. 允許用戶插入自己的全局事件（market_id = NULL）
--   4. 允許用戶插入自己參與的市集的事件

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以插入：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. market_id = NULL 的全局事件（如商品事件）
-- 3. market_created 事件（特殊處理，允許在 market_members 創建前插入）
-- 4. 自己參與的市集的事件
CREATE POLICY "用戶可以插入自己的事件"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  (
    -- 全局事件（商品事件等）
    market_id IS NULL
    OR
    -- market_created 事件（特殊處理）
    type = 'market_created'
    OR
    -- 自己參與的市集的事件
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);

-- ==================== 註解 ====================

COMMENT ON POLICY "用戶可以插入自己的事件" ON events IS 
'允許用戶插入：1. 自己創建的全局事件（商品等）2. market_created 事件 3. 自己參與的市集的事件';

-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 測試插入 market_created 事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  gen_random_uuid(),
  now()
);

-- 2. 測試插入商品事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'product_created',
  '{"name": "測試商品", "price": 100}'::jsonb,
  auth.uid(),
  NULL,
  now()
);

-- 3. 測試插入其他市集的事件（應該失敗）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'deal_closed',
  '{"amount": 100}'::jsonb,
  auth.uid(),
  '00000000-0000-0000-0000-000000000000', -- 不存在的市集
  now()
);
-- 應該返回錯誤：new row violates row-level security policy
*/

-- ==================== 完成 ====================
-- Events 表 INSERT RLS 政策已修復
-- 現在可以正常插入 market_created 和商品事件了
