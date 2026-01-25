-- =====================================================
-- Migration 012: 更新 deal_closed 事件處理，支持補登標記
-- =====================================================
-- 目的：在處理 deal_closed 事件時，檢查 isBackfill 標記
--       如果是補登交易，則跳過庫存扣除
-- 日期：2025-01-25
-- =====================================================

-- 備份現有函數（可選）
-- CREATE OR REPLACE FUNCTION update_market_read_model_backup AS ...

-- 更新 update_market_read_model 函數
CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_market_id UUID;
  v_payload JSONB;
  v_is_backfill BOOLEAN;
  v_is_manual_entry BOOLEAN;
BEGIN
  -- 提取 payload
  v_payload := NEW.payload;
  
  -- 提取 market_id（支持兩種命名方式）
  v_market_id := COALESCE(
    (v_payload->>'market_id')::UUID,
    (v_payload->>'marketId')::UUID
  );
  
  -- 提取補登標記
  v_is_backfill := COALESCE((v_payload->>'isBackfill')::BOOLEAN, FALSE);
  v_is_manual_entry := COALESCE((v_payload->>'isManualEntry')::BOOLEAN, FALSE);

  -- 根據事件類型處理
  CASE NEW.type
    
    -- ==================== 市集建立 ====================
    WHEN 'market_created' THEN
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
        sync_status,
        -- 時間軸資訊
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        -- 財務資訊
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        -- 免費提供標記
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        -- 統計資訊
        total_revenue,
        total_profit,
        total_interactions,
        total_deals,
        -- 時間戳
        created_at,
        updated_at
      ) VALUES (
        v_market_id,
        v_payload->>'name',
        v_payload->>'location',
        (v_payload->>'start_date')::DATE,
        (v_payload->>'end_date')::DATE,
        v_payload->>'start_time',
        v_payload->>'end_time',
        'registered',
        COALESCE(NEW.actor_id, 'local'),
        FALSE,
        'synced',
        -- 時間軸
        COALESCE((v_payload->>'early_entry_enabled')::BOOLEAN, FALSE),
        v_payload->>'early_entry_time',
        v_payload->>'check_in_time',
        v_payload->>'operating_start_time',
        v_payload->>'operating_end_time',
        -- 財務
        COALESCE((v_payload->>'registration_fee')::NUMERIC, 0),
        COALESCE((v_payload->>'booth_cost')::NUMERIC, 0),
        (v_payload->>'deposit')::NUMERIC,
        (v_payload->>'table_rental')::NUMERIC,
        (v_payload->>'chair_rental')::NUMERIC,
        (v_payload->>'umbrella_rental')::NUMERIC,
        (v_payload->>'tablecloth_rental')::NUMERIC,
        (v_payload->>'commission_rate')::NUMERIC,
        -- 免費提供
        COALESCE((v_payload->>'table_free')::BOOLEAN, FALSE),
        COALESCE((v_payload->>'chair_free')::BOOLEAN, FALSE),
        COALESCE((v_payload->>'umbrella_free')::BOOLEAN, FALSE),
        COALESCE((v_payload->>'tablecloth_free')::BOOLEAN, FALSE),
        v_payload->>'notes',
        -- 統計
        0, 0, 0, 0,
        -- 時間戳
        NEW.timestamp,
        NEW.timestamp
      );

    -- ==================== 成交事件 ====================
    WHEN 'deal_closed' THEN
      DECLARE
        v_item JSONB;
        v_product_id UUID;
        v_quantity INTEGER;
        v_total_amount NUMERIC;
        v_total_cost NUMERIC := 0;
        v_deal_count INTEGER := 1;
      BEGIN
        -- ✅ 檢查是否為簡化補登模式
        IF v_is_manual_entry THEN
          -- 簡化模式：直接使用手動輸入的金額
          v_total_amount := COALESCE((v_payload->>'manualRevenue')::NUMERIC, 0);
          v_total_cost := COALESCE((v_payload->>'manualCost')::NUMERIC, 0);
          v_deal_count := COALESCE((v_payload->>'manualDealCount')::INTEGER, 1);
          
        ELSE
          -- 完整模式：處理商品項目
          v_total_amount := COALESCE((v_payload->>'totalAmount')::NUMERIC, 0);
          
          -- 遍歷商品項目
          FOR v_item IN SELECT * FROM jsonb_array_elements(v_payload->'items')
          LOOP
            v_product_id := (v_item->>'productId')::UUID;
            v_quantity := (v_item->>'quantity')::INTEGER;
            
            -- 更新商品銷售統計
            UPDATE products
            SET 
              total_sold = COALESCE(total_sold, 0) + v_quantity,
              updated_at = NEW.timestamp
            WHERE id = v_product_id;
            
            -- ✅ 關鍵：只有非補登交易才扣除庫存
            IF NOT v_is_backfill THEN
              UPDATE products
              SET 
                stock = GREATEST(0, COALESCE(stock, 0) - v_quantity),
                updated_at = NEW.timestamp
              WHERE id = v_product_id
                AND unlimited_stock = FALSE;
            END IF;
            
            -- 累加成本
            SELECT COALESCE(cost, 0) * v_quantity INTO v_total_cost
            FROM products
            WHERE id = v_product_id;
          END LOOP;
        END IF;
        
        -- 更新市集統計
        UPDATE markets
        SET
          total_revenue = COALESCE(total_revenue, 0) + v_total_amount,
          total_profit = COALESCE(total_profit, 0) + (v_total_amount - v_total_cost),
          total_deals = COALESCE(total_deals, 0) + v_deal_count,
          updated_at = NEW.timestamp
        WHERE id = v_market_id;
      END;

    -- ==================== 其他事件類型 ====================
    -- 互動記錄
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET
        total_interactions = COALESCE(total_interactions, 0) + 1,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集狀態變更
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET
        status = (v_payload->>'newStatus')::market_status,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集開始營業
    WHEN 'market_started' THEN
      UPDATE markets
      SET
        status = 'ongoing',
        operation_phase = 'operating',
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集結束營業
    WHEN 'market_ended' THEN
      UPDATE markets
      SET
        status = 'completed',
        operation_phase = NULL,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    -- 市集刪除（軟刪除）
    WHEN 'market_deleted' THEN
      UPDATE markets
      SET
        is_deleted = TRUE,
        updated_at = NEW.timestamp
      WHERE id = v_market_id;

    ELSE
      -- 未知事件類型，記錄日誌
      RAISE NOTICE '未處理的事件類型: %', NEW.type;
  END CASE;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 確保觸發器存在
DROP TRIGGER IF EXISTS trigger_update_market_read_model ON events;
CREATE TRIGGER trigger_update_market_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_market_read_model();

-- 添加註釋
COMMENT ON FUNCTION update_market_read_model() IS '
更新市集讀取模型（Read Model）
支持補登標記（isBackfill）：
- 當 isBackfill = true 時，不扣除商品庫存
- 支持簡化補登（isManualEntry = true）和完整補登
更新日期：2025-01-25
';
