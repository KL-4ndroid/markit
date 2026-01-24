# 商品跨設備同步問題修復報告

## 🐛 問題描述

**症狀**：
- 商品已成功上傳到 Supabase
- 但其他設備無法同步下載商品
- 兩個設備始終只有自己本地端新增的商品

**用戶數據**：
```json
[
  {
    "id": "576befd3-81a3-4fa6-a980-4657598ac783",
    "owner_id": "d6ed468e-6331-4dbf-be02-1af3dec52f79",
    "market_id": null,  // ✅ 商品不綁定市集
    "name": "YY",
    "category": "food",
    "price": "55.00",
    "is_shared": false
  }
]
```

---

## 🔍 根本原因分析

### 問題 1：下載事件查詢邏輯錯誤

**位置**：`hooks/useSync.ts` - `pullEvents()` 函數

**錯誤代碼**：
```typescript
// ❌ 錯誤：只查詢市集事件，忽略了 market_id = null 的商品事件
const { data: newEvents } = await supabase
  .from('events')
  .select('*')
  .in('market_id', marketIds)  // ❌ 過濾掉了 market_id = null 的事件
  .order('timestamp', { ascending: true });
```

**問題**：
- 商品事件的 `market_id` 是 `null`（因為商品不綁定市集）
- 查詢條件 `.in('market_id', marketIds)` 會過濾掉 `null` 值
- 導致商品事件無法被下載

---

### 問題 2：RLS 政策限制過嚴

**位置**：`supabase/migrations/004_rls_policies.sql`

**錯誤政策**：
```sql
-- ❌ 錯誤：只允許查詢市集事件，不允許查詢用戶自己的全局事件
CREATE POLICY "用戶可以查看自己市集的事件"
ON events FOR SELECT
USING (
  market_id IS NULL OR  -- ✅ 允許 NULL
  EXISTS (
    SELECT 1 FROM market_members
    WHERE market_id = events.market_id
      AND user_id = auth.uid()
  )
);
```

**問題**：
- 雖然允許 `market_id IS NULL`，但沒有檢查 `actor_id`
- 導致用戶可以看到**所有人**的商品事件（安全問題）
- 或者在某些情況下無法查詢到自己的商品事件

---

## ✅ 解決方案

### 修復 1：更新下載事件查詢邏輯

**文件**：`hooks/useSync.ts`

**修改內容**：
```typescript
// ✅ 正確：查詢市集事件 + 用戶自己的全局事件
let query = supabase
  .from('events')
  .select('*')
  .order('timestamp', { ascending: true });

if (lastSyncAt) {
  query = query.gt('timestamp', new Date(lastSyncAt).toISOString());
}

// ✅ 過濾條件：市集事件 OR 用戶自己的事件
if (marketIds.length > 0) {
  query = query.or(
    `market_id.in.(${marketIds.join(',')}),` +
    `and(actor_id.eq.${userId},market_id.is.null)`
  );
} else {
  // 如果沒有參與任何市集，只拉取自己的全局事件
  query = query.eq('actor_id', userId).is('market_id', null);
}
```

**邏輯說明**：
1. 查詢條件 A：`market_id IN (市集列表)` - 市集事件
2. 查詢條件 B：`actor_id = 用戶ID AND market_id IS NULL` - 用戶自己的全局事件
3. 使用 `OR` 連接兩個條件

---

### 修復 2：更新 RLS 政策

**文件**：`supabase/migrations/015_fix_events_rls_policy.sql`

**修改內容**：
```sql
-- ✅ 正確：允許查詢自己的事件 + 市集事件
CREATE POLICY "用戶可以查看自己的事件和市集事件"
ON events FOR SELECT
TO authenticated
USING (
  -- 自己創建的事件（包括 market_id = NULL 的商品事件）
  actor_id = auth.uid()
  OR
  -- 自己參與的市集的事件
  (
    market_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);
```

**安全性**：
- ✅ 用戶只能看到自己創建的事件
- ✅ 用戶可以看到自己參與的市集的事件
- ✅ 用戶無法看到其他人的商品事件

---

### 修復 3：確保事件處理器傳遞完整數據

**文件**：`hooks/useSync.ts` - `pullEvents()` 函數

**修改內容**：
```typescript
// ✅ 確保傳遞 actor_id 和 market_id
if (handler) {
  await handler({
    id: event.id,
    type: event.type,
    payload: event.payload,
    timestamp: new Date(event.timestamp).getTime(),
    actor_id: event.actor_id,  // ✅ 添加
    market_id: event.market_id, // ✅ 添加
  } as Event, db);
}
```

---

## 📋 部署步驟

### 步驟 1：執行 Supabase Migrations

在 Supabase Dashboard 的 SQL Editor 依序執行：

1. **商品所有權功能**：
   ```sql
   -- 執行 014_products_ownership.sql
   ```

2. **修復事件 RLS 政策**：
   ```sql
   -- 執行 015_fix_events_rls_policy.sql
   ```

### 步驟 2：驗證 RLS 政策

```sql
-- 檢查政策是否正確
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'events';

-- 應該看到：
-- "用戶可以查看自己的事件和市集事件" (SELECT)
```

### 步驟 3：測試查詢

```sql
-- 測試查詢自己的商品事件
SELECT id, type, actor_id, market_id, payload->>'name' as product_name
FROM events
WHERE type = 'product_created'
  AND actor_id = auth.uid();

-- 應該返回自己創建的商品事件
```

### 步驟 4：清除本地數據（可選）

如果想要完全重新同步，可以清除本地數據：

```javascript
// 在瀏覽器 Console 執行
await indexedDB.deleteDatabase('MarketPulseDB');
location.reload();
```

### 步驟 5：測試同步

1. **設備 A**：
   - 登入帳號
   - 創建一個商品
   - 等待 10 秒（自動同步）
   - 檢查 Supabase `events` 表是否有該事件

2. **設備 B**：
   - 登入相同帳號
   - 等待 30 秒（自動同步間隔）
   - 或手動刷新頁面
   - 檢查是否看到設備 A 創建的商品

---

## 🧪 測試腳本

### 測試 1：檢查本地事件

```javascript
// 在瀏覽器 Console 執行
const { db } = await import('/lib/db/index.js');

// 檢查商品事件
const productEvents = await db.events
  .where('type')
  .equals('product_created')
  .toArray();

console.log('商品事件數量:', productEvents.length);
console.log('商品事件:', productEvents);

// 檢查商品
const products = await db.products.toArray();
console.log('本地商品數量:', products.length);
console.log('本地商品:', products);
```

### 測試 2：手動觸發同步

```javascript
// 手動觸發同步
window.dispatchEvent(new CustomEvent('trigger-sync'));

// 等待 5 秒後檢查
setTimeout(async () => {
  const { db } = await import('/lib/db/index.js');
  const products = await db.products.toArray();
  console.log('同步後商品數量:', products.length);
}, 5000);
```

### 測試 3：檢查 Supabase 數據

在 Supabase Dashboard 執行：

```sql
-- 檢查商品事件
SELECT 
  id,
  type,
  actor_id,
  market_id,
  payload->>'name' as product_name,
  timestamp
FROM events
WHERE type = 'product_created'
ORDER BY timestamp DESC;

-- 檢查商品
SELECT 
  id,
  name,
  owner_id,
  market_id,
  is_shared,
  created_at
FROM products
ORDER BY created_at DESC;
```

---

## 📊 預期結果

### 成功的同步流程

1. **設備 A 創建商品**：
   ```
   ✅ 本地 IndexedDB 有商品記錄
   ✅ 本地 events 表有 product_created 事件
   ✅ 事件的 market_id = null
   ✅ 事件的 actor_id = 用戶 ID
   ```

2. **上傳到 Supabase**：
   ```
   ✅ 10 秒內事件上傳到 Supabase
   ✅ Supabase events 表有該事件
   ✅ Supabase products 表有該商品（Trigger 自動創建）
   ✅ 商品的 owner_id = 用戶 ID
   ```

3. **設備 B 下載同步**：
   ```
   ✅ 30 秒內自動拉取新事件
   ✅ 查詢條件包含 actor_id = 用戶 ID 的事件
   ✅ RLS 政策允許查詢
   ✅ 本地重放事件，創建商品記錄
   ✅ 設備 B 顯示新商品
   ```

---

## 🎯 關鍵改進

### 1. 查詢邏輯優化

**之前**：只查詢市集事件
```typescript
.in('market_id', marketIds)
```

**現在**：查詢市集事件 + 用戶自己的全局事件
```typescript
.or(`market_id.in.(${marketIds.join(',')}),and(actor_id.eq.${userId},market_id.is.null)`)
```

### 2. RLS 政策優化

**之前**：允許查詢所有 `market_id = null` 的事件
```sql
market_id IS NULL OR ...
```

**現在**：只允許查詢自己的事件
```sql
actor_id = auth.uid() OR ...
```

### 3. 數據完整性

**之前**：事件處理器可能缺少 `actor_id` 和 `market_id`

**現在**：確保傳遞完整的事件數據
```typescript
{
  id: event.id,
  type: event.type,
  payload: event.payload,
  timestamp: new Date(event.timestamp).getTime(),
  actor_id: event.actor_id,  // ✅
  market_id: event.market_id, // ✅
}
```

---

## 🎉 總結

### 修復的文件

1. ✅ `hooks/useSync.ts` - 更新下載事件查詢邏輯
2. ✅ `supabase/migrations/015_fix_events_rls_policy.sql` - 修復 RLS 政策

### 解決的問題

1. ✅ 商品事件可以跨設備同步
2. ✅ RLS 政策正確限制權限
3. ✅ 事件處理器接收完整數據
4. ✅ 支援商品所有權和團隊共享

### 下一步

1. 執行 Supabase Migrations（014 和 015）
2. 測試跨設備同步
3. 驗證商品顯示正確
4. 推送代碼到 GitHub

---

## 📝 相關文檔

- `PRODUCT-OWNERSHIP.md` - 商品所有權功能說明
- `DEPLOYMENT-CHECKLIST.md` - 部署檢查清單
- `PRODUCT-SYNC-TEST-GUIDE.md` - 同步測試指南
