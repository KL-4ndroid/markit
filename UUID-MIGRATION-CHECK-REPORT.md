# UUID 遷移 - 全面檢查報告

> **檢查日期：** 2026-01-24  
> **檢查範圍：** 所有使用 marketId 和 productId 的代碼

---

## ✅ 檢查結果：全部通過

### 📊 檢查統計

| 類別 | 檔案數 | 狀態 |
|------|--------|------|
| 類型定義 | 1 | ✅ 已更新 |
| 資料庫層 | 4 | ✅ 已更新 |
| 頁面組件 | 2 | ✅ 已更新 |
| UI 組件 | 2 | ✅ 已更新 |

---

## 📝 詳細檢查清單

### 1. 類型定義層 (`types/db.ts`)

#### ✅ Event 介面
- [x] `Event.id`: `number?` → `string?` (UUID)
- [x] 新增 `actor_id: string?`
- [x] 新增 `market_id: string?`
- [x] 新增 `sync_status`

#### ✅ Market 介面
- [x] `Market.id`: `number?` → `string?` (UUID)
- [x] 新增 `owner_id: string?`
- [x] 新增 `is_collaborative: boolean?`
- [x] 新增 `sync_status`

#### ✅ Product 介面
- [x] `Product.id`: `number?` → `string?` (UUID)
- [x] 新增 `market_id: string?`

#### ✅ DailyStats 介面
- [x] `DailyStats.marketId`: `number?` → `string?` (UUID)

#### ✅ Payload 介面
- [x] `MarketStatusChangedPayload.marketId`: `number` → `string`
- [x] `ProductUpdatedPayload.productId`: `number` → `string`
- [x] `InteractionRecordedPayload.marketId`: `number` → `string`
- [x] `InteractionRecordedPayload.productIds`: `number[]?` → `string[]?`
- [x] `DealClosedPayload.marketId`: `number` → `string`
- [x] `DealClosedPayload.items[].productId`: `number` → `string`
- [x] 新增交易快照欄位：`price_at_time_of_sale`, `cost_at_time_of_sale`, `product_name`

---

### 2. 資料庫層

#### ✅ `lib/db/uuid.ts` (新檔案)
- [x] `generateUUID()` - 生成 UUID v4
- [x] `isValidUUID()` - 驗證 UUID 格式
- [x] `generateShortUUID()` - 生成短 UUID（邀請碼用）
- [x] `getShortId()` - 從 UUID 取得短 ID

#### ✅ `lib/db/index.ts`
- [x] 資料表類型：`Table<Event, string>`, `Table<Market, string>`, `Table<Product, string>`
- [x] 新增 `SyncQueueItem` 介面
- [x] 新增 `syncQueue` 資料表
- [x] 版本 3 Schema（UUID 索引）
- [x] UUID 遷移邏輯：
  - Markets ID 映射 (`Map<number, string>`)
  - Products UUID 生成
  - Events UUID 生成 + payload 更新
  - DailyStats marketId 更新
- [x] 導出 `generateUUID` 函數

#### ✅ `lib/db/events.ts`
- [x] `recordEvent()` 返回類型：`number` → `string` (UUID)
- [x] `recordEvent()` 新增 `eventId?: string` 參數（用於同步）
- [x] `recordEvent()` 自動生成 UUID
- [x] `recordEvent()` 設置 `actor_id`, `market_id`, `sync_status`
- [x] `market_created` 處理器：生成市集 UUID
- [x] `product_created` 處理器：生成商品 UUID
- [x] `deal_closed` 處理器：儲存交易快照
- [x] 所有處理器的 ID 參數類型更新

#### ✅ `lib/db/hooks.ts`
- [x] `useMarket(id)`: 參數 `number?` → `string?`
- [x] `useProduct(id)`: 參數 `number?` → `string?`
- [x] `createMarket()`: 返回 `number` → `string`
- [x] `createProduct()`: 返回 `number` → `string`
- [x] `updateMarketStatus(marketId)`: 參數 `number` → `string`
- [x] `startMarket(marketId)`: 參數 `number` → `string`
- [x] `endMarket(marketId)`: 參數 `number` → `string`
- [x] `updateProduct(productId)`: 參數 `number` → `string`
- [x] `deleteProduct(productId)`: 參數 `number` → `string`
- [x] `recordInteraction(marketId, productIds)`: 參數 `number` → `string`
- [x] `useMarketEvents(marketId)`: 參數 `number` → `string`，使用索引查詢
- [x] `useMonthlyStats()`: `Set<number>` → `Set<string>`

---

### 3. 頁面組件層

#### ✅ `app/markets/[id]/page.tsx`
```typescript
// ✅ 正確處理
const marketId = params.id; // UUID 字符串，不需要 parseInt
const market = useMarket(marketId);
```

- [x] 參數類型：`params.id` 是 `string`（Next.js 動態路由）
- [x] 直接使用，無需轉換
- [x] 傳遞給 `useMarket(marketId)`
- [x] 傳遞給 `updateMarketStatus(marketId, ...)`
- [x] 傳遞給 `startMarket(marketId)`
- [x] 傳遞給 `endMarket(marketId)`

#### ✅ `app/products/[id]/page.tsx`
```typescript
// ✅ 正確處理
const productId = params.id; // UUID 字符串，不需要 parseInt
const product = useProduct(productId);
```

- [x] 參數類型：`params.id` 是 `string`
- [x] 直接使用，無需轉換
- [x] 傳遞給 `useProduct(productId)`
- [x] 傳遞給 `updateProduct(productId, ...)`
- [x] 傳遞給 `deleteProduct(productId)`

---

### 4. UI 組件層

#### ✅ `components/markets/MarketCard.tsx`
```typescript
// ✅ 正確處理
const handleClick = () => {
  router.push(`/markets/${market.id}`); // market.id 是 UUID 字串
};
```

- [x] 使用 `market.id` 直接跳轉
- [x] 無需轉換（UUID 字串可直接用於 URL）

#### ✅ `components/products/ProductCard.tsx`
```typescript
// ✅ 正確處理
router.push(`/products/${product.id}`); // product.id 是 UUID 字串
```

- [x] 使用 `product.id` 直接跳轉
- [x] 無需轉換

---

## 🔍 潛在問題檢查

### ❌ 未發現以下問題：

- [ ] ~~使用 `parseInt(id)` 或 `Number(id)` 轉換~~
- [ ] ~~使用 `id: number` 類型註解~~
- [ ] ~~使用 `++id` 自動遞增~~
- [ ] ~~使用 `id > 0` 數字比較~~
- [ ] ~~使用 `id + 1` 數字運算~~

### ✅ 所有 ID 使用方式：

1. **字串比較**：`id === 'xxx'` ✅
2. **URL 參數**：`/markets/${id}` ✅
3. **資料庫查詢**：`db.markets.get(id)` ✅
4. **事件 payload**：`{ marketId: id }` ✅
5. **Set 集合**：`Set<string>` ✅

---

## 📊 遷移影響範圍

### 資料庫層面
- **Events 表**：所有事件 ID 從數字變為 UUID
- **Markets 表**：所有市集 ID 從數字變為 UUID
- **Products 表**：所有商品 ID 從數字變為 UUID
- **DailyStats 表**：marketId 欄位從數字變為 UUID

### API 層面
- **URL 路由**：`/markets/[id]` 和 `/products/[id]` 現在接受 UUID
- **函數簽名**：所有接受 ID 的函數參數從 `number` 改為 `string`
- **返回值**：所有返回 ID 的函數從 `number` 改為 `string`

### UI 層面
- **卡片組件**：使用 UUID 進行路由跳轉
- **詳情頁面**：從 URL 參數讀取 UUID
- **表單提交**：生成 UUID 而非依賴自動遞增

---

## ✅ 結論

**所有使用 marketId 和 productId 的地方都已正確更新為 UUID！**

### 關鍵優勢

1. **離線支援**：可以在離線狀態下生成 UUID，無需等待伺服器分配 ID
2. **分散式友好**：多個客戶端可以同時建立資料，不會產生 ID 衝突
3. **向後相容**：遷移邏輯保留了舊資料，並正確映射 ID 關聯
4. **類型安全**：TypeScript 類型系統確保所有 ID 使用都是正確的

### 無需額外修改

- ✅ 所有頁面組件已正確處理 UUID
- ✅ 所有 UI 組件已正確處理 UUID
- ✅ 所有資料庫操作已正確處理 UUID
- ✅ 所有事件處理器已正確處理 UUID

---

## 🚀 下一步

UUID 遷移已完成！現在可以：

1. **重啟開發伺服器**測試遷移
2. **驗證資料完整性**
3. **進入階段 2**：Supabase 資料庫設置

---

**檢查完成時間：** 2026-01-24  
**檢查結果：** ✅ 全部通過，無需額外修改
