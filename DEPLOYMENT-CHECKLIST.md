# 商品所有權功能 - 部署檢查清單

## ✅ 已完成的修改

### 1. 資料庫 Migration
- [x] 創建 `014_products_ownership.sql`
  - 移除 `market_id` 外鍵約束
  - 添加 `owner_id` 欄位（必填）
  - 添加 `is_shared` 欄位
  - 更新 RLS 政策
  - 更新 Trigger 函數

### 2. TypeScript 類型定義
- [x] 更新 `types/db.ts`
  - `Product` 介面添加 `owner_id`
  - `Product` 介面添加 `is_shared`
  - `ProductCreatedPayload` 添加 `isShared`

### 3. 本地資料庫
- [x] 更新 `lib/db/index.ts`
  - 添加 `owner_id` 索引

### 4. 事件處理器
- [x] 更新 `lib/db/events.ts`
  - `product_created` 處理器添加 `owner_id`
  - `product_created` 處理器添加 `isShared`

### 5. 文檔
- [x] 創建 `PRODUCT-OWNERSHIP.md`
- [x] 創建 `DEPLOYMENT-CHECKLIST.md`

---

## 🚀 部署步驟

### 步驟 1：執行 Supabase Migration

1. 登入 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `supabase/migrations/014_products_ownership.sql` 內容
4. 執行 SQL
5. 確認執行成功（無錯誤訊息）

### 步驟 2：驗證資料庫結構

執行以下 SQL 驗證：

```sql
-- 1. 檢查 products 表結構
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;

-- 應該看到：
-- - owner_id (uuid, NOT NULL)
-- - is_shared (boolean, DEFAULT false)
-- - market_id (uuid, NULL) ← 注意：現在可以是 NULL

-- 2. 檢查索引
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'products';

-- 應該看到：
-- - idx_products_owner_id
-- - idx_products_market_id

-- 3. 檢查 RLS 政策
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'products';

-- 應該看到 4 個政策：
-- - Users can view own and team products (SELECT)
-- - Users can insert own products (INSERT)
-- - Users can update own products (UPDATE)
-- - Users can delete own products (DELETE)

-- 4. 檢查現有商品的 owner_id
SELECT 
  COUNT(*) as total_products,
  COUNT(owner_id) as products_with_owner,
  COUNT(market_id) as products_with_market
FROM products;

-- 應該看到：
-- - total_products = products_with_owner (所有商品都有 owner_id)
```

### 步驟 3：測試權限

```sql
-- 1. 測試插入自己的商品（應該成功）
INSERT INTO products (id, owner_id, name, category, price, is_active)
VALUES (
  gen_random_uuid(),
  auth.uid(),
  '測試商品',
  'other',
  100,
  true
);

-- 2. 測試查詢（應該只看到自己的商品和團隊商品）
SELECT id, name, owner_id, is_shared
FROM products
ORDER BY created_at DESC
LIMIT 10;

-- 3. 測試更新自己的商品（應該成功）
UPDATE products
SET price = 150
WHERE owner_id = auth.uid()
LIMIT 1;

-- 4. 清理測試數據
DELETE FROM products
WHERE name = '測試商品' AND owner_id = auth.uid();
```

### 步驟 4：測試本地應用

1. 清除本地資料庫（可選）：
   ```javascript
   // 在瀏覽器 Console 執行
   await indexedDB.deleteDatabase('MarketPulseDB');
   location.reload();
   ```

2. 創建新商品：
   - 打開商品管理頁面
   - 創建一個新商品
   - 檢查 IndexedDB 中的 `products` 表
   - 確認有 `owner_id` 欄位

3. 檢查事件：
   - 打開 IndexedDB 的 `events` 表
   - 找到 `product_created` 事件
   - 確認 `actor_id` 有值

4. 測試同步：
   - 登入帳號
   - 創建商品
   - 點擊「同步」按鈕
   - 到 Supabase Dashboard 檢查 `products` 表
   - 確認商品已同步且 `owner_id` 正確

### 步驟 5：測試團隊共享

1. 創建兩個測試帳號（A 和 B）

2. 帳號 A 創建市集並邀請 B：
   ```typescript
   // 在市集設定中添加成員
   // 或執行 SQL：
   INSERT INTO market_members (market_id, user_id, role)
   VALUES ('market-uuid', 'user-b-uuid', 'member');
   ```

3. 帳號 A 創建共享商品：
   ```typescript
   await createProduct({
     name: '團隊共享商品',
     category: 'other',
     price: 100,
     isShared: true,  // ✅ 設為共享
   });
   ```

4. 帳號 B 登入：
   - 應該能看到帳號 A 的共享商品
   - 可以在成交時使用該商品
   - 但不能修改該商品

### 步驟 6：測試跨市集使用

1. 創建商品（不指定市集）：
   ```typescript
   const product = await createProduct({
     name: '跨市集商品',
     category: 'handmade',
     price: 200,
   });
   ```

2. 在市集 1 使用：
   ```typescript
   await recordDeal({
     marketId: 'market-1-uuid',
     items: [{ productId: product.id, quantity: 1, price: 200 }],
     totalAmount: 200,
   });
   ```

3. 在市集 2 使用：
   ```typescript
   await recordDeal({
     marketId: 'market-2-uuid',
     items: [{ productId: product.id, quantity: 2, price: 200 }],
     totalAmount: 400,
   });
   ```

4. 檢查商品統計：
   ```sql
   SELECT id, name, total_sold, market_id
   FROM products
   WHERE id = 'product-uuid';
   
   -- total_sold 應該是 3 (1 + 2)
   -- market_id 可能是 NULL 或第一次創建的市集
   ```

---

## 🔍 常見問題排查

### 問題 1：Migration 執行失敗

**錯誤訊息**：`column "owner_id" does not exist`

**解決方案**：
```sql
-- 手動添加欄位
ALTER TABLE products ADD COLUMN owner_id UUID;

-- 更新現有數據
UPDATE products p
SET owner_id = (
  SELECT e.actor_id 
  FROM events e 
  WHERE e.type = 'product_created' 
    AND (e.payload->>'productId')::UUID = p.id
  LIMIT 1
);

-- 設為必填
ALTER TABLE products ALTER COLUMN owner_id SET NOT NULL;
```

### 問題 2：RLS 政策阻止查詢

**錯誤訊息**：`new row violates row-level security policy`

**解決方案**：
```sql
-- 檢查當前用戶
SELECT auth.uid();

-- 檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'products';

-- 暫時禁用 RLS（僅用於測試）
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- 測試完成後重新啟用
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
```

### 問題 3：商品同步失敗

**錯誤訊息**：`null value in column "owner_id" violates not-null constraint`

**原因**：事件的 `actor_id` 為空

**解決方案**：
```typescript
// 確保創建事件時有 actor_id
const event = {
  type: 'product_created',
  payload: { /* ... */ },
  actor_id: userId || 'local',  // ✅ 必須有值
  timestamp: Date.now(),
};
```

### 問題 4：看不到團隊商品

**原因**：RLS 政策查詢失敗或沒有加入市集

**解決方案**：
```sql
-- 檢查是否為市集成員
SELECT m.market_id, m.user_id, m.role
FROM market_members m
WHERE m.user_id = auth.uid();

-- 檢查團隊成員的商品
SELECT p.id, p.name, p.owner_id, p.is_shared
FROM products p
WHERE p.owner_id IN (
  SELECT DISTINCT m2.user_id
  FROM market_members m1
  JOIN market_members m2 ON m1.market_id = m2.market_id
  WHERE m1.user_id = auth.uid()
);
```

---

## 📊 驗證指標

### 資料完整性
- [ ] 所有商品都有 `owner_id`
- [ ] `owner_id` 對應到有效的 `profiles.id`
- [ ] 索引已正確創建

### 權限控制
- [ ] 用戶只能看到自己的商品
- [ ] 用戶可以看到團隊成員的商品
- [ ] 用戶可以看到共享商品
- [ ] 用戶只能修改自己的商品

### 功能測試
- [ ] 可以創建商品（有 `owner_id`）
- [ ] 可以在多個市集使用同一商品
- [ ] 商品統計正確累加
- [ ] 同步功能正常

### 性能測試
- [ ] 查詢商品速度正常（< 100ms）
- [ ] 團隊商品查詢速度正常（< 200ms）
- [ ] 索引被正確使用

---

## 🎯 回滾計劃

如果部署出現問題，可以執行以下 SQL 回滾：

```sql
-- 1. 移除新增的欄位
ALTER TABLE products DROP COLUMN IF EXISTS owner_id;
ALTER TABLE products DROP COLUMN IF EXISTS is_shared;

-- 2. 恢復 market_id 外鍵約束
ALTER TABLE products 
ALTER COLUMN market_id SET NOT NULL;

ALTER TABLE products
ADD CONSTRAINT products_market_id_fkey
FOREIGN KEY (market_id) REFERENCES markets(id) ON DELETE CASCADE;

-- 3. 恢復舊的 RLS 政策
DROP POLICY IF EXISTS "Users can view own and team products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

CREATE POLICY "Users can view all products"
  ON products FOR SELECT USING (true);

CREATE POLICY "Users can insert products"
  ON products FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update products"
  ON products FOR UPDATE USING (true);

CREATE POLICY "Users can delete products"
  ON products FOR DELETE USING (true);

-- 4. 恢復舊的 Trigger 函數
-- （需要從 Git 歷史中恢復）
```

---

## 📝 部署記錄

### 部署日期：_____________

### 執行人：_____________

### 檢查項目：

- [ ] Migration 執行成功
- [ ] 資料庫結構驗證通過
- [ ] 權限測試通過
- [ ] 本地應用測試通過
- [ ] 團隊共享測試通過
- [ ] 跨市集使用測試通過
- [ ] 性能測試通過

### 問題記錄：

```
（記錄部署過程中遇到的問題和解決方案）
```

### 備註：

```
（其他需要記錄的資訊）
```

---

## 🎉 部署完成！

所有檢查項目通過後，商品所有權功能即可正式上線！
