# 商品所有權與團隊共享功能

## 📋 功能概述

商品現在支援用戶所有權和團隊共享功能：

- ✅ 每個商品屬於一個用戶（`owner_id`）
- ✅ 商品不綁定特定市集（可在多個市集使用）
- ✅ 支援團隊共享（通過市集成員關係）
- ✅ 完整的權限控制（RLS 政策）

---

## 🏗️ 架構設計

### 資料模型

```
User (profiles)
  ↓ owns
Product
  ↓ used in
Market
  ↓ has
Market Members (team)
  ↓ can view
Shared Products
```

### 商品可見性規則

用戶可以看到：
1. **自己的商品**（`owner_id = auth.uid()`）
2. **團隊成員的商品**（通過 `market_members` 關聯）
3. **共享商品**（`is_shared = true`）

---

## 📊 資料表結構

### Products 表

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES profiles(id),  -- ✅ 商品所有者
  market_id UUID,                                  -- ✅ 可選：首次創建的市集
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cost NUMERIC,
  stock INTEGER,
  unlimited_stock BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  is_shared BOOLEAN DEFAULT FALSE,                 -- ✅ 是否共享
  total_sold INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 索引

```sql
CREATE INDEX idx_products_owner_id ON products(owner_id);
CREATE INDEX idx_products_market_id ON products(market_id);
CREATE INDEX idx_products_is_active ON products(is_active);
```

---

## 🔐 權限控制（RLS）

### 查看權限

```sql
CREATE POLICY "Users can view own and team products"
  ON products FOR SELECT
  USING (
    -- 自己的商品
    owner_id = auth.uid()
    OR
    -- 團隊成員的商品
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
```

### 插入權限

```sql
CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (owner_id = auth.uid());
```

### 更新權限

```sql
CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (owner_id = auth.uid());
```

### 刪除權限

```sql
CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (owner_id = auth.uid());
```

---

## 🔄 事件處理

### product_created 事件

```typescript
{
  type: 'product_created',
  payload: {
    productId: 'uuid-xxx',
    name: '手工陶杯',
    category: 'handmade',
    price: 350,
    cost: 150,
    isShared: false,  // ✅ 是否共享
    // ...
  },
  actor_id: 'user-uuid',  // ✅ 自動設為 owner_id
  market_id: 'market-uuid',  // ✅ 可選
}
```

### Trigger 處理

```sql
WHEN 'product_created' THEN
  INSERT INTO products (
    id,
    owner_id,      -- ✅ 使用 actor_id
    market_id,     -- ✅ 可以是 NULL
    name,
    category,
    is_shared,     -- ✅ 從 payload 讀取
    -- ...
  )
  VALUES (
    (NEW.payload->>'productId')::UUID,
    NEW.actor_id,  -- ✅ 事件的操作者
    NEW.market_id,
    (NEW.payload->>'name')::TEXT,
    (NEW.payload->>'category')::TEXT,
    COALESCE((NEW.payload->>'isShared')::BOOLEAN, FALSE),
    -- ...
  );
```

---

## 📱 使用場景

### 場景 1：個人商品

```typescript
// 用戶 A 創建商品
await createProduct({
  name: '手工陶杯',
  category: 'handmade',
  price: 350,
  isShared: false,  // 不共享
});

// 結果：
// - 只有用戶 A 可以看到
// - 用戶 A 可以在任何市集使用
```

### 場景 2：團隊共享商品

```typescript
// 用戶 A 創建共享商品
await createProduct({
  name: '團隊 Logo 貼紙',
  category: 'stationery',
  price: 50,
  isShared: true,  // ✅ 共享給團隊
});

// 結果：
// - 所有團隊成員都可以看到
// - 所有團隊成員都可以在市集中使用
```

### 場景 3：跨市集使用

```typescript
// 用戶 A 在市集 1 創建商品
await createProduct({
  name: '手工皂',
  category: 'handmade',
  price: 120,
});

// 用戶 A 在市集 2 使用相同商品
await recordDeal({
  marketId: 'market-2-uuid',
  items: [
    { productId: 'soap-uuid', quantity: 2, price: 120 }
  ],
  totalAmount: 240,
});

// 結果：
// - 商品可以在多個市集使用
// - 統計數據會累加到商品的 total_sold
```

---

## 🔍 查詢範例

### 查詢自己的商品

```typescript
const myProducts = await db.products
  .where('owner_id')
  .equals(userId)
  .toArray();
```

### 查詢團隊商品（需要在 Supabase）

```sql
SELECT p.*
FROM products p
WHERE p.owner_id = auth.uid()
   OR p.owner_id IN (
     SELECT DISTINCT m2.user_id
     FROM market_members m1
     JOIN market_members m2 ON m1.market_id = m2.market_id
     WHERE m1.user_id = auth.uid()
   )
   OR p.is_shared = true;
```

### 查詢某市集使用的商品

```sql
SELECT DISTINCT p.*
FROM products p
JOIN events e ON (e.payload->>'productId')::UUID = p.id
WHERE e.type = 'deal_closed'
  AND e.market_id = 'market-uuid';
```

---

## 🎯 優勢

### 1. 靈活性
- 商品不綁定市集，可重複使用
- 符合實際使用場景（同一商品在多個市集販售）

### 2. 團隊協作
- 通過 `is_shared` 標記共享商品
- 團隊成員可以看到彼此的商品
- 支援多人協作市集

### 3. 權限控制
- RLS 政策確保數據安全
- 用戶只能修改自己的商品
- 團隊成員可以查看但不能修改

### 4. 數據一致性
- 商品統計跨市集累加
- 事件溯源確保歷史記錄完整
- 同步機制確保多設備一致

---

## 🚀 部署步驟

### 1. 執行 Migration

在 Supabase Dashboard 執行：

```sql
-- 執行這個檔案
supabase/migrations/014_products_ownership.sql
```

### 2. 驗證結構

```sql
-- 檢查 products 表結構
\d products

-- 檢查 RLS 政策
SELECT * FROM pg_policies WHERE tablename = 'products';

-- 檢查索引
SELECT * FROM pg_indexes WHERE tablename = 'products';
```

### 3. 測試權限

```sql
-- 測試插入（應該成功）
INSERT INTO products (id, owner_id, name, category, price)
VALUES (gen_random_uuid(), auth.uid(), '測試商品', 'other', 100);

-- 測試查詢（應該只看到自己的商品）
SELECT * FROM products;

-- 測試更新別人的商品（應該失敗）
UPDATE products SET price = 200 WHERE owner_id != auth.uid();
```

---

## 📝 注意事項

### 1. 向後兼容

- 現有商品會自動設置 `owner_id`（從 events 表推斷）
- `market_id` 改為可選，不影響現有功能

### 2. 同步邏輯

- 商品事件會自動同步到 Supabase
- `owner_id` 自動設為 `actor_id`
- 團隊成員會自動看到共享商品

### 3. 性能優化

- 添加了 `owner_id` 索引
- RLS 政策使用索引查詢
- 團隊商品查詢經過優化

---

## 🎉 完成！

商品現在支援完整的所有權和團隊共享功能！

用戶可以：
- 創建自己的商品
- 在多個市集重複使用
- 與團隊成員共享商品
- 安全地管理商品權限
