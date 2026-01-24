-- ==================== 修復 Trigger：使用 Payload 中的 ID ====================
-- 版本：008_fix_trigger_use_payload_ids
-- 日期：2026-01-24
-- 說明：修復 Trigger，從 payload 中讀取 marketId 和 productId

-- ==================== Market Trigger ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      -- 從 payload 中讀取 marketId（必須存在）
      IF (NEW.payload->>'marketId') IS NULL THEN
        RAISE EXCEPTION 'market_created event missing marketId in payload';
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
        (NEW.payload->>'marketId')::UUID,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        (NEW.payload->>'startTime')::TIME,
        (NEW.payload->>'endTime')::TIME,
        'registered',
        NEW.actor_id,
        FALSE,
        COALESCE((NEW.payload->>'earlyEntryEnabled')::BOOLEAN, FALSE),
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
        COALESCE((NEW.payload->>'tableFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'chairFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'umbrellaFree')::BOOLEAN, FALSE),
        COALESCE((NEW.payload->>'tableclothFree')::BOOLEAN, FALSE),
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        operation_phase = 'operating',
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        operation_phase = NULL,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
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

-- ==================== Product Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      -- 從 payload 中讀取 productId（必須存在）
      IF (NEW.payload->>'productId') IS NULL THEN
        RAISE EXCEPTION 'product_created event missing productId in payload';
      END IF;
      
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
        COALESCE((NEW.payload->>'stock')::INTEGER, 0),
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
        UPDATE products
        SET 
          total_sold = total_sold + (v_item->>'quantity')::INTEGER,
          stock = CASE 
            WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
            ELSE stock
          END,
          updated_at = NEW.timestamp
        WHERE id = (v_item->>'productId')::UUID;
      END LOOP;
    
    ELSE
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 重新創建 Trigger
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 完成 ====================
-- Trigger 已修復，現在會從 payload 中讀取 ID
