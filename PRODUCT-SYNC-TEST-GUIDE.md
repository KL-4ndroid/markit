# 商品同步測試指南

## ✅ 問題已解決！

**方案 A 已實施：商品所有權與團隊共享**

- ✅ 商品不再綁定特定市集（移除外鍵約束）
- ✅ 商品屬於用戶（`owner_id`）
- ✅ 支援團隊共享（`is_shared`）
- ✅ 可在多個市集重複使用

詳細說明請參考：`PRODUCT-OWNERSHIP.md`

---

## 🔍 原問題分析

商品沒有被同步的**根本原因**：
1. ❌ 商品創建時沒有 `market_id`
2. ❌ Supabase 的外鍵約束要求 `market_id` 必填
3. ❌ 導致 Trigger 插入失敗（違反外鍵約束）

**解決方案**：
- 移除 `market_id` 外鍵約束
- 添加 `owner_id` 欄位（商品所有者）
- 商品可在多個市集使用

---

## 🧪 測試方案

### 方案 1：檢查本地事件記錄

**步驟：**

1. 打開瀏覽器開發者工具（F12）
2. 切換到 Console 標籤
3. 執行以下代碼：

```javascript
// 檢查商品事件
const { db } = await import('/lib/db/index.js');
const productEvents = await db.events
  .where('type')
  .equals('product_created')
  .toArray();

console.log('=== 商品事件 ===');
console.log('數量:', productEvents.length);
console.log('事件列表:', productEvents);

// 檢查每個事件的詳細資訊
productEvents.forEach((event, index) => {
  console.log(`\n事件 ${index + 1}:`);
  console.log('  ID:', event.id);
  console.log('  market_id:', event.market_id);
  console.log('  sync_status:', event.sync_status);
  console.log('  payload:', event.payload);
  console.log('  timestamp:', new Date(event.timestamp).toLocaleString());
});

// 檢查待同步的事件
const pendingEvents = await db.events
  .where('sync_status')
  .anyOf(['pending', 'local_only'])
  .toArray();

console.log('\n=== 待同步事件 ===');
console.log('數量:', pendingEvents.length);
console.log('類型分布:', pendingEvents.reduce((acc, e) => {
  acc[e.type] = (acc[e.type] || 0) + 1;
  return acc;
}, {}));
```

**預期結果：**
- ✅ 應該看到 `product_created` 事件
- ✅ 每個事件應該有 `market_id`
- ✅ `sync_status` 應該是 `pending` 或 `local_only`

---

### 方案 2：檢查 Supabase 事件表

**步驟：**

1. 登入 Supabase Dashboard
2. 進入 Table Editor
3. 查看 `events` 表
4. 篩選 `type = 'product_created'`

**檢查項目：**
- ✅ 是否有商品事件？
- ✅ `market_id` 是否正確？
- ✅ `payload` 是否包含商品資訊？

---

### 方案 3：檢查 Supabase products 表

**步驟：**

1. 在 Supabase Dashboard
2. 查看 `products` 表
3. 檢查是否有新增的商品

**如果沒有商品：**
- 可能是 trigger 沒有執行
- 檢查 Supabase Logs 查看錯誤訊息

---

### 方案 4：手動觸發同步

**步驟：**

1. 在瀏覽器 Console 執行：

```javascript
// 手動觸發同步
window.dispatchEvent(new CustomEvent('trigger-sync'));

// 等待 5 秒後檢查結果
setTimeout(async () => {
  const { db } = await import('/lib/db/index.js');
  const pendingCount = await db.events
    .where('sync_status')
    .anyOf(['pending', 'local_only'])
    .count();
  
  console.log('待同步事件數量:', pendingCount);
  
  if (pendingCount === 0) {
    console.log('✅ 所有事件已同步');
  } else {
    console.log('⚠️ 還有事件未同步');
  }
}, 5000);
```

---

### 方案 5：檢查網路請求

**步驟：**

1. 打開開發者工具（F12）
2. 切換到 Network 標籤
3. 篩選 `events`
4. 新增一個商品
5. 觀察是否有 POST 請求到 Supabase

**檢查項目：**
- ✅ 是否有請求發送？
- ✅ 請求狀態碼是否為 200 或 201？
- ✅ 請求 payload 是否正確？
- ❌ 如果是 4xx 或 5xx，查看錯誤訊息

---

### 方案 6：檢查 RLS 政策

**可能原因：** Row Level Security 阻止了商品插入

**檢查步驟：**

1. 在 Supabase Dashboard
2. 進入 Authentication > Policies
3. 檢查 `products` 表的政策
4. 確認用戶有 INSERT 權限

**修復方法：**

如果沒有政策，執行以下 SQL：

```sql
-- 允許用戶插入商品
CREATE POLICY "Users can insert products"
  ON products
  FOR INSERT
  WITH CHECK (true);

-- 允許用戶查看所有商品
CREATE POLICY "Users can view all products"
  ON products
  FOR SELECT
  USING (true);
```

---

### 方案 7：檢查 Trigger 是否正常

**步驟：**

1. 在 Supabase SQL Editor 執行：

```sql
-- 檢查 trigger 是否存在
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%product%';

-- 手動測試 trigger
INSERT INTO events (
  id,
  type,
  payload,
  actor_id,
  market_id,
  timestamp
) VALUES (
  gen_random_uuid(),
  'product_created',
  '{"productId": "test-123", "name": "測試商品", "category": "food", "price": 100, "cost": 50}'::jsonb,
  auth.uid(),
  (SELECT id FROM markets LIMIT 1),
  NOW()
);

-- 檢查是否有新商品
SELECT * FROM products WHERE id = 'test-123';
```

---

## 🔧 常見問題修復

### 問題 1：market_id 為 null

**原因：** 商品事件沒有關聯市集

**修復：** 確保創建商品時傳入 `market_id`

```typescript
// 錯誤
await createProduct({
  name: '商品名稱',
  category: 'food',
  price: 100,
});

// 正確
await createProduct({
  name: '商品名稱',
  category: 'food',
  price: 100,
  market_id: marketId,  // ✅ 必須傳入
});
```

### 問題 2：sync_status 一直是 local_only

**原因：** 用戶未登入，無法同步

**修復：** 登入 Supabase 帳號

### 問題 3：Trigger 沒有執行

**原因：** Trigger 函數有錯誤

**修復：** 檢查 Supabase Logs

```sql
-- 查看最近的錯誤
SELECT * FROM postgres_logs 
WHERE level = 'ERROR' 
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 📊 完整測試流程

### 設備 A（電腦）

1. 登入帳號
2. 創建一個市集
3. 在該市集下創建一個商品
4. 打開 Console 檢查事件：
   ```javascript
   const { db } = await import('/lib/db/index.js');
   const events = await db.events.where('type').equals('product_created').toArray();
   console.log('商品事件:', events);
   ```
5. 等待 10 秒（同步延遲）
6. 檢查 Supabase `events` 表是否有該事件
7. 檢查 Supabase `products` 表是否有該商品

### 設備 B（手機）

1. 登入相同帳號
2. 等待 30 秒（自動同步間隔）
3. 檢查是否看到設備 A 創建的商品
4. 如果沒有，手動刷新頁面
5. 打開 Console 檢查本地商品：
   ```javascript
   const { db } = await import('/lib/db/index.js');
   const products = await db.products.toArray();
   console.log('本地商品:', products);
   ```

---

## 🎯 預期結果

✅ **成功的同步流程：**

1. 設備 A 創建商品
2. 本地 IndexedDB 有商品記錄
3. 本地 events 表有 `product_created` 事件
4. 10 秒內事件上傳到 Supabase
5. Supabase trigger 自動創建商品記錄
6. 設備 B 在 30 秒內自動拉取新事件
7. 設備 B 本地重放事件，創建商品記錄
8. 設備 B 顯示新商品

---

## 🐛 如果還是不行

請提供以下資訊：

1. 設備 A 的 Console 輸出（商品事件）
2. Supabase `events` 表截圖
3. Supabase `products` 表截圖
4. Network 標籤的請求記錄
5. 是否有錯誤訊息？

我會根據這些資訊進一步診斷問題！
