# Event Handler 收斂分析

更新日期：2026-06-11

## 分析範圍

本文件只分析 `lib/db/events.ts` 中的事件 handler，尤其是 `deal_closed` handler。

本階段不修改 production code，原因是 `deal_closed` 同時負責：

- 市集收入與成交數 projection。
- 商品銷售數與庫存扣減。
- 交易當下商品價格與成本快照。
- 每日統計 `dailyStats`。
- `productsSold` 聚合。

這一段是資料層核心，任何一次性大改都可能造成收入、庫存、刪除 replay、補登資料回歸。

## 目前已完成的低風險收斂

以下讀取層已逐步改用 `lib/events/event-read-model.ts`：

- 市集詳情 UI。
- 每日收入與成交列表。
- 成交詳情 modal。
- 互動詳情 modal。
- 本機 projection repair。
- owner revenue gap repair。
- event deletion service。
- top products / product affinity / batch entry / metrics analytics。

因此目前剩下最主要的高風險直接 payload 讀取點集中在：

- `lib/db/events.ts`
- `lib/db/integrity.ts`
- `lib/db/index.ts` 的 legacy migration
- `lib/data-mappers.ts`

其中 `integrity.ts` 和 `data-mappers.ts` 本來就是驗證/轉換邊界，直接讀取 payload 是合理的。真正需要謹慎規劃的是 `lib/db/events.ts`。

## `deal_closed` Handler 目前直接讀取點

目前 `deal_closed` handler 直接讀取：

| 欄位 | 用途 | 建議 |
|---|---|---|
| `event.payload.dealDate` | 決定交易日期 | 可改用 `getDealEventDate()`，但要確認 timestamp fallback 行為一致。 |
| `event.payload.isBackfill` | 補登時不扣庫存 | 可改用 `isBackfillDealEvent()`。 |
| `event.payload.isManualEntry` | 簡化補登 vs 商品模式 | 可改用 `isManualDealEvent()`。 |
| `event.payload.totalAmount` | 成交收入 | 可改用 `getDealEventRevenue()`，但完整商品模式仍需小心 item fallback。 |
| `event.payload.manualRevenue` | 手動收入 | 已由 `getDealEventRevenue()` 支援。 |
| `event.payload.manualCost` | 手動成本 | 已由 `getDealEventCost()` 支援。 |
| `event.payload.manualDealCount` | 手動成交筆數 | 已由 `getDealEventCount()` 支援。 |
| `event.payload.items` | 商品模式商品列表 | 可改用 `getDealItems()`。 |
| `item.productId` | 商品 ID | 可改用 `getDealItemProductId()`。 |
| `item.price` / `item.quantity` | 商品收入與庫存 | 可改用 item helper，但 handler 仍需要寫回快照欄位。 |

## 高風險點

### 1. Handler 會修改 payload item

目前商品模式中會寫入：

- `item.price_at_time_of_sale`
- `item.cost_at_time_of_sale`
- `item.product_name`

這代表 handler 不只是讀取，也會補上交易快照。未來若要完全保持 event immutable，這段要另外設計，不應和 read-model 收斂混在同一個 commit。

### 2. 商品庫存與收入投影耦合

同一段 loop 內同時處理：

- 商品成本。
- 商品收入。
- 商品銷售數。
- 庫存扣減。
- `productsSold`。

這部分不適合一次抽出太大函式。建議先建立純函式測試，再替換 handler。

### 3. `deal_deleted` 依賴 `productsSold`

刪除成交時會用 `productsSold` 回補庫存與扣除 dailyStats。若 `deal_closed` 的 `productsSold` 計算改錯，刪除成交會跟著出錯。

### 4. Replay / rebuild 依賴 handler

`rebuildSnapshots()` 和 staff replay 都依賴同一組 handler。任何 handler 行為改變都會影響：

- 本機重建。
- 雲端同步後投影。
- repair 工具。

## 建議拆分計畫

### Step 1：新增純函式，不接 handler

新增一個小型純函式，例如：

```ts
projectDealClosedPayloadForStats(event, productLookupResult)
```

或先更保守地只新增：

```ts
getDealClosedMode(event)
getDealClosedTransactionDate(event)
getDealClosedManualProjection(event)
```

此階段只新增函式與測試，不替換 handler。

狀態：已完成。

完成 commit：

```txt
f5b852a test(events): cover deal closed manual projection helpers
```

已新增：

- `lib/db/deal-closed-projection.ts`
- `tests/deal-closed-projection.test.ts`

必須測試：

- camelCase 手動補登。
- snake_case 手動補登。
- `dealDate` / `deal_date` / timestamp fallback。
- `manualRevenue` / `manual_revenue`。
- `manualCost` / `manual_cost`。
- `manualDealCount` / `manual_deal_count`。

### Step 2：只替換手動補登分支

替換範圍限於：

- `isManualEntry`
- `totalAmount`
- `totalCost`
- `dealCount`
- `transactionDate`

不碰商品模式、不碰庫存、不碰 productsSold。

這是最安全的第一個 production code commit。

狀態：尚未開始。

### Step 3：抽商品項目 projection，仍不改庫存

建立純函式計算：

- `productsSold`
- 商品模式 totalAmount fallback
- 商品模式 totalCost

但庫存扣減仍留在 handler 內。

必須測試：

- camelCase item。
- snake_case `product_id`。
- `price_at_time_of_sale` / `priceAtTimeOfSale` / `price` fallback。
- `cost_at_time_of_sale` / `costAtTimeOfSale` / product cost fallback。
- quantity NaN 或缺失時的現有行為是否保持。

### Step 4：小範圍替換商品讀取

替換 handler 裡的：

- `event.payload.items`
- `item.productId`
- `item.quantity`
- `item.price`

但保留：

- 商品 lookup。
- 庫存扣減。
- payload 快照寫回。
- db.products.update。

### Step 5：重新評估 event immutability

這是另一個主題，不應與 Step 1-4 混在一起。

若未來要處理，需先回答：

- 是否允許 handler 繼續補寫 item 快照？
- 若不允許，快照應在 `recordEvent()` 前完成，還是在 canonicalization 階段完成？
- 舊事件缺少快照時，replay 是否允許從目前商品資料補值？

## 不建議現在做的事

- 不建議直接整段重寫 `deal_closed` handler。
- 不建議現在修改庫存扣減邏輯。
- 不建議在同一個 commit 同時處理 event immutable。
- 不建議同時修改 `deal_deleted`。
- 不建議修改 Supabase schema / RLS。

## 建議下一個可執行任務

下一個最安全任務：

1. 新增純函式測試，覆蓋手動補登 projection。
2. 不接 handler。
3. 測試通過後，再決定是否進入 Step 2。

建議 commit：

```txt
test(events): cover deal closed manual projection helpers
```

若 Step 2 再執行，建議 commit：

```txt
refactor(events): centralize manual deal projection reads
```

## 目前判斷

低風險 UI / analytics / repair 收斂已接近完成。接下來若繼續推進資料格式收斂，必須進入「先測試、再替換」模式。

`deal_closed` handler 可以收斂，但不能用一次性重構方式處理。最穩定的路徑是先建立純函式與測試，逐步讓 handler 改用這些 helper。
