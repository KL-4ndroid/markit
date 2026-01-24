-- ==================== 修復 CQRS Trigger - Product ID 問題 ====================
-- 版本：007_fix_trigger_product_id
-- 日期：2026-01-24
-- 說明：修復 product_created 事件的 Trigger，確保 ID 正確設置

-- ==================== 重新創建 Product Trigger ====================

CREATE OR REPLACE FUNCTION update_product_read_model()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_item JSONB;
BEGIN
  CASE NEW.type
    
    -- 商品建立事件
    WHEN 'product_created' THEN
      -- 從 payload 獲取 productId，如果沒有則生成新的
      v_product_id := COALESCE(
        (NEW.payload->>'productId')::UUID,
        uuid_generate_v4()
      );
      
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
        v_product_id,  -- 使用確定的 UUID
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
      v_product_id := (NEW.payload->>'productId')::UUID;
      
      IF v_product_id IS NOT NULL THEN
        UPDATE products
        SET 
          name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
          price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
          cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
          stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
          updated_at = NEW.timestamp
        WHERE id = v_product_id;
      END IF;
    
    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      v_product_id := (NEW.payload->>'productId')::UUID;
      
      IF v_product_id IS NOT NULL THEN
        UPDATE products
        SET 
          is_active = FALSE,
          updated_at = NEW.timestamp
        WHERE id = v_product_id;
      END IF;
    
    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed' THEN
      -- 遍歷 items 陣列更新每個商品
      FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items')
      LOOP
        v_product_id := (v_item->>'productId')::UUID;
        
        IF v_product_id IS NOT NULL THEN
          UPDATE products
          SET 
            total_sold = total_sold + (v_item->>'quantity')::INTEGER,
            stock = CASE 
              WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER)
              ELSE stock
            END,
            updated_at = NEW.timestamp
          WHERE id = v_product_id;
        END IF;
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
-- Product Trigger 已修復
-- 現在會正確處理 productId
