-- ==================== CQRS Triggers ====================
-- 版本：002 - CQRS 模式 Trigger
-- 日期：2026-01-24
-- 說明：當 events 表插入事件時，自動更新讀取模型（markets 和 products 表）

-- ==================== Market 讀取模型更新 Trigger ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  market_data JSONB;
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

-- 創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- ==================== Product 讀取模型更新 Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      INSERT INTO products (
        id,
        market_id,
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'productId')::UUID,
        NEW.market_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        (NEW.payload->>'stock')::INTEGER,
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 商品更新事件
    WHEN 'product_updated' THEN
      UPDATE products
      SET 
        name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
        price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
        cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
        stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      UPDATE products
      SET 
        is_active = FALSE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;
    
    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed' THEN
      -- 遍歷 items 陣列更新每個商品
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items')
      LOOP
        v_product_id := (v_item->>'productId')::UUID;
        
        UPDATE products
        SET 
          total_sold = total_sold + (v_item->>'quantity')::INTEGER,
          stock = CASE 
            WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
            ELSE stock
          END,
          updated_at = NEW.timestamp
        WHERE id = v_product_id;
      END LOOP;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 註解 ====================
COMMENT ON FUNCTION update_market_read_model() IS 'CQRS: 當事件插入時自動更新 markets 讀取模型';
COMMENT ON FUNCTION update_product_read_model() IS 'CQRS: 當事件插入時自動更新 products 讀取模型';

-- ==================== 完成 ====================
-- CQRS Trigger 創建完成
-- 下一步：執行 003_rpc_functions.sql
