# 階段 1 完成檢查清單

## ✅ 已完成的更新

### 1. TypeScript 類型定義 (`types/db.ts`)
- [x] `Event.id`: `number?` → `string?` (UUID)
- [x] `Event` 新增 `actor_id`, `market_id`, `sync_status` 欄位
- [x] `Market.id`: `number?` → `string?` (UUID)
- [x] `Market` 新增 `owner_id`, `is_collaborative`, `sync_status` 欄位
- [x] `Product.id`: `number?` → `string?` (UUID)
- [x] `Product` 新增 `market_id` 欄位
- [x] `DailyStats.marketId`: `number?` → `string?` (UUID)
- [x] `MarketStatusChangedPayload.marketId`: `number` → `string`
- [x] `ProductUpdatedPayload.productId`: `number` → `string`
- [x] `InteractionRecordedPayload.marketId`: `number` → `string`
- [x] `InteractionRecordedPayload.productIds`: `number[]?` → `string[]?`
- [x] `DealClosedPayload.marketId`: `number` → `string`
- [x] `DealClosedPayload.items[].productId`: `number` → `string`
- [x] `DealClosedPayload.items[]` 新增交易快照欄位：
  - `price_at_time_of_sale`
  - `cost_at_time_of_sale`
  - `product_name`

### 2. UUID 生成工具 (`lib/db/uuid.ts`)
- [x] `generateUUID()` - 生成 UUID v4
- [x] `isValidUUID()` - 驗證 UUID 格式
- [x] `generateShortUUID()` - 生成短 UUID（邀請碼用）
- [x] `getShortId()` - 從 UUID 取得短 ID

### 3. Dexie 資料庫 (`lib/db/index.ts`)
- [x] 更新資料表類型：`Table<Event, string>` 等
- [x] 新增 `SyncQueueItem` 介面
- [x] 新增 `syncQueue` 資料表
- [x] 實作版本 3 Schema（UUID 索引）
- [x] 實作 UUID 遷移邏輯：
  - Markets ID 映射
  - Products UUID 生成
  - Events UUID 生成 + payload 更新
  - DailyStats marketId 更新
- [x] 導出 `generateUUID` 函數

### 4. 事件處理器 (`lib/db/events.ts`)
- [x] `recordEvent()` 函數簽名：返回 `string` (UUID)
- [x] `recordEvent()` 新增 `eventId` 參數（用於同步）
- [x] `recordEvent()` 自動生成 UUID
- [x] `recordEvent()` 設置 `actor_id`, `market_id`, `sync_status`
- [x] `market_created` 處理器：生成市集 UUID
- [x] `product_created` 處理器：生成商品 UUID
- [x] `deal_closed` 處理器：儲存交易快照（價格、成本、商品名）
- [x] 所有處理器更新為 UUID 版本

### 5. React Hooks (`lib/db/hooks.ts`)
- [x] `useMarket(id)`: 參數從 `number` → `string`
- [x] `useProduct(id)`: 參數從 `number` → `string`
- [x] `createMarket()`: 返回 `string` (UUID)
- [x] `createProduct()`: 返回 `string` (UUID)
- [x] `updateMarketStatus()`: 參數從 `number` → `string`
- [x] `startMarket()`: 參數從 `number` → `string`
- [x] `endMarket()`: 參數從 `number` → `string`
- [x] `updateProduct()`: 參數從 `number` → `string`
- [x] `deleteProduct()`: 參數從 `number` → `string`
- [x] `recordInteraction()`: 參數從 `number` → `string`
- [x] `useMarketEvents()`: 使用索引查詢（更高效）

---

## 🚀 下一步：測試遷移

### 步驟 1: 重啟開發伺服器

```bash
# 停止當前伺服器（Ctrl+C）
# 重新啟動
npm run dev
```

### 步驟 2: 打開應用程式

1. 前往 http://localhost:3000
2. 打開瀏覽器 Console（F12）
3. 觀察遷移日誌

### 步驟 3: 預期輸出

你應該會看到類似以下的日誌：

```
🔄 開始遷移到 UUID...
📊 遷移 Markets...
✅ Markets 遷移完成：5 筆
📦 遷移 Products...
✅ Products 遷移完成：23 筆
📝 遷移 Events...
✅ Events 遷移完成：156 筆
📈 遷移 DailyStats...
✅ DailyStats 遷移完成：12 筆
✅ UUID 遷移完成！耗時：234ms
📊 遷移統計： {markets: 5, products: 23, events: 156, dailyStats: 12}
```

### 步驟 4: 驗證資料

在 Console 中執行：

```javascript
// 檢查 Markets
const markets = await db.markets.toArray();
console.log('Markets:', markets);
console.log('第一個市集 ID 類型:', typeof markets[0]?.id); // 應該是 "string"

// 檢查 Products
const products = await db.products.toArray();
console.log('Products:', products);
console.log('第一個商品 ID 類型:', typeof products[0]?.id); // 應該是 "string"

// 檢查 Events
const events = await db.events.toArray();
console.log('Events:', events);
console.log('第一個事件 ID 類型:', typeof events[0]?.id); // 應該是 "string"
```

### 步驟 5: 功能測試

- [ ] 可以查看市集列表
- [ ] 可以查看市集詳情
- [ ] 可以建立新市集
- [ ] 可以查看商品列表
- [ ] 可以建立新商品
- [ ] 可以記錄互動
- [ ] 可以記錄成交

---

## ⚠️ 如果遇到問題

### 問題 1: 遷移沒有執行

**症狀：** Console 沒有顯示遷移日誌

**解決方案：**
1. 清除瀏覽器快取（Ctrl+Shift+Delete）
2. 關閉所有瀏覽器分頁
3. 重新打開應用程式

### 問題 2: 遷移失敗

**症狀：** Console 顯示錯誤訊息

**解決方案：**
1. 複製完整的錯誤訊息
2. 告訴我錯誤內容
3. 使用階段 0 的備份恢復資料

### 問題 3: 資料顯示異常

**症狀：** 市集或商品無法正常顯示

**解決方案：**
1. 檢查 Console 是否有錯誤
2. 執行上述驗證腳本
3. 告訴我具體的異常情況

### 問題 4: TypeScript 錯誤

**症狀：** IDE 顯示類型錯誤

**解決方案：**
1. 重啟 TypeScript 伺服器（VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"）
2. 如果仍有錯誤，告訴我具體的錯誤位置

---

## 📊 遷移完成後

當遷移成功完成後，請告訴我：

**"階段 1 完成"** 或 **"遷移成功"**

我會為你準備階段 2：Supabase 資料庫設置！🎉

---

## 🔍 除錯工具

如果需要檢查 IndexedDB 資料：

1. 打開 Chrome DevTools（F12）
2. 切換到「Application」標籤
3. 左側選單：Storage → IndexedDB → MarketPulseDB
4. 查看各個資料表的內容

你可以看到所有 ID 都已經變成 UUID 格式（例如：`550e8400-e29b-41d4-a716-446655440000`）
