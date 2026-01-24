-- ==================== Products Schema Update ====================
-- 版本：014 - 商品表結構更新
-- 日期：2026-01-25
-- 說明：
--   1. 移除 market_id 外鍵約束（商品不綁定市集）
--   2. 添加 owner_id（商品所有者）
--   3. 添加協作相關欄位
--   4. 更新 RLS 政策支援團隊共享

-- ==================== 修改 products 表結構 ====================

-- 1. 移除 market_id 外鍵約束
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_market_id_fkey;

-- 2. 將 market_id 改為可選（用於標記商品首次創建的市集，但不強制）
ALTER TABLE products 
ALTER COLUMN market_id DROP NOT NULL;

-- 3. 添加 owner_id 欄位（商品所有者）
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. 添加協作相關欄位
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;

-- 5. 更新現有商品的 owner_id（從 events 表推斷）
UPDATE products p
SET owner_id = (
  SELECT e.actor_id 
  FROM events e 
  WHERE e.type = 'product_created' 
    AND (e.payload->>'productId')::UUID = p.id
  LIMIT 1
)
WHERE owner_id IS NULL;

-- 6. 設置 owner_id 為必填（在更新現有數據後）
ALTER TABLE products 
ALTER COLUMN owner_id SET NOT NULL;

-- ==================== 更新索引 ====================

-- 添加 owner_id 索引
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);

-- 保留 market_id 索引（用於查詢某市集使用的商品）
-- 已存在：idx_products_market_id

-- ==================== 更新 RLS 政策 ====================

-- 刪除舊的政策
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Users can insert products" ON products;
DROP POLICY IF EXISTS "Users can update products" ON products;
DROP POLICY IF EXISTS "Users can delete products" ON products;

-- 1. 查看政策：用戶可以查看自己的商品 + 團隊成員的商品
CREATE POLICY "Users can view own and team products"
  ON products
  FOR SELECT
  USING (
    -- 自己的商品
    owner_id = auth.uid()
    OR
    -- 團隊成員的商品（通過 market_members 關聯）
    owner_id IN (
      SELECT DISTINCT m2.user_id
      FROM market_members m1
      JOIN market_members m2 ON m1.market_id = m2.market_id
      WHERE m1.user_id = auth.uid()
    )
    OR
    -- 共享商品
    is_shared = true
  );

-- 2. 插入政策：用戶只能創建自己的商品
CREATE POLICY "Users can insert own products"
  ON products
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- 3. 更新政策：用戶只能更新自己的商品
CREATE POLICY "Users can update own products"
  ON products
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- 4. 刪除政策：用戶只能刪除自己的商品
CREATE POLICY "Users can delete own products"
  ON products
  FOR DELETE
  USING (owner_id = auth.uid());

-- ==================== 更新 Trigger ====================

-- 更新 product_created 事件處理
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
        owner_id,           -- ✅ 新增：商品所有者
        market_id,          -- ✅ 可選：首次創建的市集
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        is_shared,          -- ✅ 新增：是否共享
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'productId')::UUID,
        NEW.actor_id,       -- ✅ 使用事件的 actor_id 作為所有者
        NEW.market_id,      -- ✅ 可以是 NULL
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        (NEW.payload->>'stock')::INTEGER,
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        COALESCE((NEW.payload->>'isShared')::BOOLEAN, FALSE),
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
        is_shared = COALESCE((NEW.payload->'updates'->>'isShared')::BOOLEAN, is_shared),
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

-- 重新創建 Trigger（如果已存在會先刪除）
DROP TRIGGER IF EXISTS trigger_update_product_read_model ON events;
CREATE TRIGGER trigger_update_product_read_model
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_product_read_model();

-- ==================== 註解 ====================
COMMENT ON COLUMN products.owner_id IS '商品所有者（必填）';
COMMENT ON COLUMN products.market_id IS '可選：商品首次創建的市集（不強制綁定）';
COMMENT ON COLUMN products.is_shared IS '是否為共享商品（團隊可見）';

-- ==================== 完成 ====================
-- Products 表結構更新完成
-- 商品現在屬於用戶，可通過團隊共享，不綁定特定市集
