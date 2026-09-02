-- ==================== 修復 Events 表 INSERT RLS 政策（支援員工模式）====================
-- 版本：025 - 支援員工模式上傳事件
-- 日期：2026-02-23
-- 說明：
--   1. 允許員工插入老闆市集的事件
--   2. 保留員工的 actor_id（不修改創建者）
--   3. 防止跨帳號數據盜取

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;
DROP POLICY IF EXISTS "用戶可以插入事件_v2" ON events;
DROP POLICY IF EXISTS "用戶可以插入自己的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以插入：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. market_id = NULL 的全局事件（如商品事件）
-- 3. market_created 事件（特殊處理，允許在 market_members 創建前插入）
-- 4. 自己參與的市集的事件（作為 owner）
-- 5. ✅ 員工可以插入老闆市集的事件（作為 staff）
CREATE POLICY "用戶可以插入事件_v3"
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
    -- 自己參與的市集的事件（owner）
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
    OR
    -- ✅ 員工可以插入老闆市集的事件
    EXISTS (
      SELECT 1 FROM market_members mm
      JOIN staff_relationships sr ON sr.owner_id = mm.user_id
      WHERE mm.market_id = events.market_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

-- ==================== 註解 ====================

COMMENT ON POLICY "用戶可以插入事件_v3" ON events IS 
'允許用戶插入：1. 自己創建的全局事件（商品等）2. market_created 事件 3. 自己參與的市集的事件 4. 員工可以插入老闆市集的事件';

-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 測試老闆插入 market_created 事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  gen_random_uuid(),
  now()
);

-- 2. 測試員工插入互動事件（應該成功）
-- 前提：員工已被添加到 staff_relationships，且老闆是該市集的成員
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'interaction_recorded',
  '{"type": "touch", "marketId": "老闆的市集ID"}'::jsonb,
  auth.uid(), -- 員工的 ID
  '老闆的市集ID',
  now()
);

-- 3. 測試插入其他人的市集事件（應該失敗）
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
-- Events 表 INSERT RLS 政策已更新
-- 現在支援員工模式，員工可以插入老闆市集的事件，且保留員工的 actor_id
