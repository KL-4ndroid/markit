-- ==================== Migration 020 ====================
-- 日期：2026-02-22
-- 說明：添加 market_updated 事件的觸發器處理邏輯
-- 原因：修復市集編輯後無法同步到 Supabase 的問題

-- ==================== 更新 market 讀取模型觸發器函數 ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  market_data JSONB;
  v_updates JSONB;
BEGIN
  -- 根據事件類型更新讀取模型
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      INSERT INTO markets (
        id,
        owner_id,
        name,
        location,
        start_date,
        end_date,
        start_time,
        end_time,
        status,
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
        NEW.market_id,
        NEW.actor_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        (NEW.payload->>'startTime')::TIME,
        (NEW.payload->>'endTime')::TIME,
        'registered',
        (NEW.payload->>'earlyEntryEnabled')::BOOLEAN,
        (NEW.payload->>'earlyEntryTime')::TIME,
        (NEW.payload->>'checkInTime')::TIME,
        (NEW.payload->>'operatingStartTime')::TIME,
        (NEW.payload->>'operatingEndTime')::TIME,
        (NEW.payload->>'registrationFee')::NUMERIC,
        (NEW.payload->>'boothCost')::NUMERIC,
        (NEW.payload->>'deposit')::NUMERIC,
        (NEW.payload->>'tableRental')::NUMERIC,
        (NEW.payload->>'chairRental')::NUMERIC,
        (NEW.payload->>'umbrellaRental')::NUMERIC,
        (NEW.payload->>'tableclothRental')::NUMERIC,
        (NEW.payload->>'commissionRate')::NUMERIC,
        (NEW.payload->>'tableFree')::BOOLEAN,
        (NEW.payload->>'chairFree')::BOOLEAN,
        (NEW.payload->>'umbrellaFree')::BOOLEAN,
        (NEW.payload->>'tableclothFree')::BOOLEAN,
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- 自動添加 owner 到 market_members
      INSERT INTO market_members (market_id, user_id, role)
      VALUES (NEW.market_id, NEW.actor_id, 'owner')
      ON CONFLICT (market_id, user_id) DO NOTHING;
    
    -- ✅ 新增：市集更新事件
    WHEN 'market_updated' THEN
      -- 獲取 updates 物件
      v_updates := NEW.payload->'updates';
      
      -- 動態更新市集資料（只更新有提供的欄位）
      UPDATE markets
      SET 
        -- 基本資訊
        name = COALESCE((v_updates->>'name')::TEXT, name),
        location = COALESCE((v_updates->>'location')::TEXT, location),
        start_date = COALESCE((v_updates->>'start_date')::DATE, start_date),
        end_date = COALESCE((v_updates->>'end_date')::DATE, end_date),
        -- ❌ 移除：start_time 和 end_time 已在 Migration 022 中刪除
        -- start_time = COALESCE((v_updates->>'start_time')::TIME, start_time),
        -- end_time = COALESCE((v_updates->>'end_time')::TIME, end_time),
        
        -- 時間軸資訊
        early_entry_enabled = COALESCE((v_updates->>'early_entry_enabled')::BOOLEAN, early_entry_enabled),
        early_entry_time = COALESCE((v_updates->>'early_entry_time')::TIME, early_entry_time),
        check_in_time = COALESCE((v_updates->>'check_in_time')::TIME, check_in_time),
        operating_start_time = COALESCE((v_updates->>'operating_start_time')::TIME, operating_start_time),
        operating_end_time = COALESCE((v_updates->>'operating_end_time')::TIME, operating_end_time),
        
        -- 財務資訊
        registration_fee = COALESCE((v_updates->>'registration_fee')::NUMERIC, registration_fee),
        booth_cost = COALESCE((v_updates->>'booth_cost')::NUMERIC, booth_cost),
        deposit = COALESCE((v_updates->>'deposit')::NUMERIC, deposit),
        table_rental = COALESCE((v_updates->>'table_rental')::NUMERIC, table_rental),
        chair_rental = COALESCE((v_updates->>'chair_rental')::NUMERIC, chair_rental),
        umbrella_rental = COALESCE((v_updates->>'umbrella_rental')::NUMERIC, umbrella_rental),
        tablecloth_rental = COALESCE((v_updates->>'tablecloth_rental')::NUMERIC, tablecloth_rental),
        commission_rate = COALESCE((v_updates->>'commission_rate')::NUMERIC, commission_rate),
        
        -- 免費提供標記
        table_free = COALESCE((v_updates->>'table_free')::BOOLEAN, table_free),
        chair_free = COALESCE((v_updates->>'chair_free')::BOOLEAN, chair_free),
        umbrella_free = COALESCE((v_updates->>'umbrella_free')::BOOLEAN, umbrella_free),
        tablecloth_free = COALESCE((v_updates->>'tablecloth_free')::BOOLEAN, tablecloth_free),
        
        -- 備註
        notes = COALESCE((v_updates->>'notes')::TEXT, notes),
        
        -- 更新時間戳
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'market_id')::UUID;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
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
      -- 其他事件類型不處理
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 註解 ====================
COMMENT ON FUNCTION update_market_read_model() IS 'CQRS: 當事件插入時自動更新 markets 讀取模型（包含 market_updated 事件）';

-- ==================== 完成 ====================
-- Migration 020 完成
-- 現在 market_updated 事件會自動更新 markets 表
