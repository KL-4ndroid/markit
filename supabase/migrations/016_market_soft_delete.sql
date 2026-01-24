-- ==================== 市集軟刪除功能 ====================
-- 版本：016 - 市集軟刪除
-- 日期：2026-01-25
-- 說明：
--   1. 添加 is_deleted 欄位到 markets 表
--   2. 添加 market_deleted 事件類型到 events 表的 CHECK 約束
--   3. 添加 market_deleted 事件處理
--   4. 區分「已取消」和「已刪除」狀態
--      - 已取消（status = 'cancelled'）：市集狀態，仍顯示在列表中
--      - 已刪除（is_deleted = true）：軟刪除標記，不顯示在列表中

-- ==================== 更新 events 表的 CHECK 約束 ====================

-- 刪除舊的 CHECK 約束
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 添加新的 CHECK 約束（包含 market_deleted）
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    'market_created',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',        -- ✅ 新增：市集刪除事件
    'product_created',
    'product_updated',
    'product_deleted',
    'interaction_recorded',
    'deal_closed'
  )
);

-- ==================== 修改 markets 表結構 ====================

-- 添加 is_deleted 欄位
ALTER TABLE markets 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- 添加索引（用於快速過濾）
CREATE INDEX IF NOT EXISTS idx_markets_is_deleted ON markets(is_deleted);

-- 添加註解
COMMENT ON COLUMN markets.is_deleted IS '軟刪除標記：true = 已刪除（不顯示），false = 正常顯示';

-- ==================== 更新 Market Trigger ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      -- 從 payload 中讀取 marketId 或 market_id
      IF (NEW.payload->>'marketId') IS NULL AND (NEW.payload->>'market_id') IS NULL THEN
        RAISE EXCEPTION 'market_created event missing marketId/market_id in payload';
      END IF;
      
      INSERT INTO markets (
        id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
        owner_id,
        is_collaborative,
        is_deleted,  -- ✅ 新增：預設為 false
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID),
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        COALESCE((NEW.payload->>'start_date')::DATE, (NEW.payload->>'startDate')::DATE),
        COALESCE((NEW.payload->>'end_date')::DATE, (NEW.payload->>'endDate')::DATE),
        COALESCE((NEW.payload->>'start_time')::TIME, (NEW.payload->>'startTime')::TIME),
        COALESCE((NEW.payload->>'end_time')::TIME, (NEW.payload->>'endTime')::TIME),
        'registered',
        NEW.actor_id,
        FALSE,
        FALSE,  -- ✅ 預設為未刪除
        COALESCE((NEW.payload->>'early_entry_enabled')::BOOLEAN, (NEW.payload->>'earlyEntryEnabled')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'early_entry_time')::TIME, (NEW.payload->>'earlyEntryTime')::TIME),
        COALESCE((NEW.payload->>'check_in_time')::TIME, (NEW.payload->>'checkInTime')::TIME),
        COALESCE((NEW.payload->>'operating_start_time')::TIME, (NEW.payload->>'operatingStartTime')::TIME),
        COALESCE((NEW.payload->>'operating_end_time')::TIME, (NEW.payload->>'operatingEndTime')::TIME),
        COALESCE((NEW.payload->>'registration_fee')::NUMERIC, (NEW.payload->>'registrationFee')::NUMERIC),
        COALESCE((NEW.payload->>'booth_cost')::NUMERIC, (NEW.payload->>'boothCost')::NUMERIC),
        (NEW.payload->>'deposit')::NUMERIC,
        COALESCE((NEW.payload->>'table_rental')::NUMERIC, (NEW.payload->>'tableRental')::NUMERIC),
        COALESCE((NEW.payload->>'chair_rental')::NUMERIC, (NEW.payload->>'chairRental')::NUMERIC),
        COALESCE((NEW.payload->>'umbrella_rental')::NUMERIC, (NEW.payload->>'umbrellaRental')::NUMERIC),
        COALESCE((NEW.payload->>'tablecloth_rental')::NUMERIC, (NEW.payload->>'tableclothRental')::NUMERIC),
        COALESCE((NEW.payload->>'commission_rate')::NUMERIC, (NEW.payload->>'commissionRate')::NUMERIC),
        COALESCE((NEW.payload->>'table_free')::BOOLEAN, (NEW.payload->>'tableFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'chair_free')::BOOLEAN, (NEW.payload->>'chairFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'umbrella_free')::BOOLEAN, (NEW.payload->>'umbrellaFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'tablecloth_free')::BOOLEAN, (NEW.payload->>'tableclothFree')::BOOLEAN, FALSE),
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- 自動添加 owner 到 market_members
      INSERT INTO market_members (market_id, user_id, role)
      VALUES (
        COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID),
        NEW.actor_id,
        'owner'
      )
      ON CONFLICT (market_id, user_id) DO NOTHING;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID);
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        operation_phase = 'operating',
        updated_at = NEW.timestamp
      WHERE id = COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID);
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        operation_phase = NULL,
        updated_at = NEW.timestamp
      WHERE id = COALESCE((NEW.payload->>'market_id')::UUID, (NEW.payload->>'marketId')::UUID);
    
    -- ✅ 市集刪除事件（軟刪除）
    WHEN 'market_deleted' THEN
      UPDATE markets
      SET 
        is_deleted = TRUE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 成交事件：更新統計
    WHEN 'deal_closed' THEN
      UPDATE markets
      SET 
        total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 互動記錄事件：更新統計
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET 
        total_interactions = total_interactions + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 創建測試市集
INSERT INTO events (id, type, payload, actor_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  jsonb_build_object(
    'marketId', gen_random_uuid(),
    'name', '測試市集',
    'location', '台北',
    'startDate', '2026-02-01',
    'endDate', '2026-02-01',
    'registrationFee', 500,
    'boothCost', 1000
  ),
  auth.uid(),
  NOW()
);

-- 2. 查詢市集（應該看到 is_deleted = false）
SELECT id, name, status, is_deleted
FROM markets
WHERE name = '測試市集';

-- 3. 刪除市集（軟刪除）
INSERT INTO events (id, type, payload, actor_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_deleted',
  jsonb_build_object(
    'marketId', (SELECT id FROM markets WHERE name = '測試市集'),
    'reason', '測試刪除'
  ),
  auth.uid(),
  NOW()
);

-- 4. 再次查詢（應該看到 is_deleted = true）
SELECT id, name, status, is_deleted
FROM markets
WHERE name = '測試市集';

-- 5. 查詢未刪除的市集（應該不包含測試市集）
SELECT id, name, status
FROM markets
WHERE is_deleted = FALSE
ORDER BY created_at DESC;
*/

-- ==================== 完成 ====================
-- 市集軟刪除功能已完成
-- 
-- 使用方式：
-- 1. 前端調用 deleteMarket(marketId) 函數
-- 2. 系統記錄 market_deleted 事件
-- 3. Trigger 自動設置 is_deleted = true
-- 4. 前端查詢時過濾 is_deleted = true 的市集
