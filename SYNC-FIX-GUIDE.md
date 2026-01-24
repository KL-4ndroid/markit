# 🔧 同步錯誤修復指南

## 問題診斷

### 錯誤 1：Product ID 為 null
```
null value in column "id" of relation "products" violates not-null constraint
```

**原因：** 本地事件處理器生成了 `productId`，但沒有將其寫入 `payload`，導致上傳到 Supabase 時 `payload` 中缺少 `productId`。

### 錯誤 2：Market 外鍵約束
```
insert or update on table "events" violates foreign key constraint "events_market_id_fkey"
```

**原因：** 事件引用的 `market_id` 在 `markets` 表中不存在（同樣是 ID 同步問題）。

---

## 🚀 修復步驟

### 步驟 1：更新本地代碼（已完成）

✅ 已修改 `lib/db/events.ts`：
- `market_created` 事件處理器現在會將生成的 `marketId` 寫回 `payload`
- `product_created` 事件處理器現在會將生成的 `productId` 寫回 `payload`

### 步驟 2：執行 Supabase 遷移腳本（最終修復版本）

1. **打開 Supabase Dashboard**
   - 前往 https://supabase.com/dashboard
   - 選擇你的專案

2. **打開 SQL Editor**
   - 點擊左側選單的 **SQL Editor**
   - 點擊 **New Query**

3. **執行最終修復腳本**
   - 打開檔案：`e:\market2\supabase\migrations\010_final_fix_all_issues.sql`
   - **全選並複製**（Ctrl+A, Ctrl+C）
   - 在 SQL Editor 中**貼上**（Ctrl+V）
   - 點擊 **Run** 按鈕

4. **等待執行完成**
   - 應該會顯示 `Success. No rows returned`

**這個腳本做了什麼？**
- ✅ 將外鍵約束設置為 `DEFERRABLE`（延遲檢查，允許 Trigger 先執行）
- ✅ 修復 Market Trigger 從 `payload.marketId` 讀取 ID
- ✅ 修復 Product Trigger 從 `payload.productId` 讀取 ID
- ✅ 添加錯誤檢查（如果 payload 缺少 ID 則拋出異常）

### 步驟 3：清理本地錯誤事件（重要！）

由於之前的事件 `payload` 中沒有 ID，需要清理這些錯誤事件：

**選項 A：清理所有待同步事件（推薦）**

在瀏覽器 Console 中執行：

```javascript
// 打開 IndexedDB
const request = indexedDB.open('MarketPulseDB');

request.onsuccess = async (event) => {
  const db = event.target.result;
  const tx = db.transaction(['events'], 'readwrite');
  const store = tx.objectStore('events');
  
  // 刪除所有待同步的事件
  const index = store.index('sync_status');
  const pendingEvents = await index.getAll('pending');
  
  for (const event of pendingEvents) {
    await store.delete(event.id);
  }
  
  console.log(`✅ 已清理 ${pendingEvents.length} 個待同步事件`);
};
```

**選項 B：重新創建測試數據**

如果你的數據不重要，可以：
1. 在應用中刪除所有市集和商品
2. 重新創建測試數據
3. 新的數據會包含正確的 ID

### 步驟 4：測試同步

1. **重新整理應用程式**（F5）
2. **創建新的測試數據**：
   - 創建一個新市集
   - 創建一個新商品
3. **點擊「立即同步」**
4. **檢查 Console**：
   - 應該顯示 `✅ 同步完成`
   - 不應該有任何錯誤

---

## 🎯 修復原理

### 修復前的流程（有問題）

```
本地創建商品
  ↓
recordEvent('product_created', { name, price, ... })  // ❌ 沒有 productId
  ↓
事件處理器生成 productId = uuid()
  ↓
寫入本地 products 表
  ↓
上傳事件到 Supabase（payload 中沒有 productId）
  ↓
Supabase Trigger 嘗試讀取 payload.productId
  ↓
❌ 讀取到 null，插入失敗
```

### 修復後的流程（正確）

```
本地創建商品
  ↓
recordEvent('product_created', { name, price, ... })
  ↓
事件處理器生成 productId = uuid()
  ↓
寫入本地 products 表
  ↓
✅ 將 productId 寫回 event.payload
  ↓
上傳事件到 Supabase（payload 包含 productId）
  ↓
Supabase Trigger 讀取 payload.productId
  ↓
✅ 成功插入 products 表
```

---

## ✅ 驗證修復成功

執行以下檢查：

### 1. 檢查本地事件

在瀏覽器 Console 中執行：

```javascript
// 查看最新的 product_created 事件
const db = await window.indexedDB.open('MarketPulseDB');
// ... 查詢邏輯
```

確認 `payload` 中包含 `productId`。

### 2. 檢查 Supabase

在 Supabase SQL Editor 中執行：

```sql
-- 查看最新的事件
SELECT id, type, payload->>'productId' as product_id, payload->>'marketId' as market_id
FROM events
ORDER BY timestamp DESC
LIMIT 10;
```

確認 `product_id` 和 `market_id` 不為 null。

### 3. 檢查同步狀態

在應用中：
- 創建新市集 → 同步 → 檢查 Supabase `markets` 表
- 創建新商品 → 同步 → 檢查 Supabase `products` 表

---

## 🐛 如果還有問題

### 問題：仍然出現 "null value in column id"

**解決方案：** 確認你已經：
1. ✅ 重新整理了應用程式（F5）
2. ✅ 清理了舊的待同步事件
3. ✅ 執行了 Supabase 遷移腳本
4. ✅ 創建的是**新的**測試數據（不是舊的）

### 問題：外鍵約束錯誤

**解決方案：** 確保同步順序正確：
1. 先同步 `market_created` 事件
2. 再同步 `product_created` 事件

如果順序錯誤，可以手動觸發重新同步。

---

## 📊 修復完成後的狀態

- ✅ RLS 無限遞迴問題已解決
- ✅ Product ID null 問題已解決
- ✅ Market 外鍵約束問題已解決
- ✅ 本地與雲端 ID 同步機制已建立
- ✅ 離線優先架構完整運作

**Phase 3 完成度：100%** 🎉

---

## 下一步

修復完成後，你可以：

1. **測試多設備同步**：在不同瀏覽器登入同一帳號，測試數據同步
2. **測試離線模式**：關閉網路，創建數據，重新連線後同步
3. **進入 Phase 4**：團隊協作功能（邀請碼、成員管理）
4. **進入 Phase 5**：測試與優化（性能優化、安全測試）
