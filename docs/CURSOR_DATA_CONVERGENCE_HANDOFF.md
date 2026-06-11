# Cursor Data Convergence Handoff

更新日期：2026-06-11

## 交接目標

請接續 `docs/DATA_CONVERGENCE_PLAN.md` 的資料格式收斂計畫，以最小風險方式完成剩餘工作。

目前整體進度約 88%。核心方向不是大重構，而是逐步把事件 payload 讀取集中到 shared read model / projection helper，降低 `marketId` / `market_id`、`eventId` / `event_id`、`totalAmount` / `total_amount` 等欄位差異造成的反覆錯誤。

## 必讀文件

開始前請先讀：

1. `docs/DATA_CONVERGENCE_PLAN.md`
2. `docs/EVENT_HANDLER_CONVERGENCE_ANALYSIS.md`
3. `lib/events/event-read-model.ts`
4. `lib/db/deal-closed-projection.ts`
5. `tests/deal-closed-projection.test.ts`
6. `tests/event-handlers.test.ts`

## 目前最新狀態

最新已推送 commit：

```txt
0f67546 docs: update deal item projection progress
c0e285a test(events): cover deal closed item projection helpers
997022a docs: update manual deal projection progress
bb97027 refactor(events): centralize manual deal projection reads
```

已完成：

- `deal_closed` 手動補登分支已改用 `getDealClosedManualProjection()`。
- `deal_closed` 商品項目 projection helper 已建立並有測試。
- 商品項目 helper 目前尚未接進 `lib/db/events.ts` handler。
- 目前 handler 的商品模式、庫存扣減、`productsSold`、event payload 寫回仍維持舊邏輯。

## 絕對禁止事項

除非使用者明確同意，不要做以下事情：

- 不要修改 Supabase schema / migration / RLS。
- 不要大幅重寫 `lib/db/events.ts`。
- 不要修改 `deal_deleted`。
- 不要修改庫存扣減邏輯。
- 不要改 event immutability 或移除 handler 內的 payload item 快照寫回。
- 不要刪除或重寫 events。
- 不要混入 UI 文案調整、登入流程、分析頁重構等非本任務內容。
- 不要一次 commit 多個功能區。

## 工作規則

每次只做一個最小任務。每個任務完成後必須通過：

```powershell
npm.cmd test
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
git diff --check
```

通過後才可以 commit。每個 commit 必須是單一目的。

若有任何檢查未通過，不要 commit，先回報失敗原因與建議。

## 下一個最安全任務：Step 4 分析

請先不要直接修改 production code。

第一個任務請只做分析：

目標：評估是否能把 `lib/db/events.ts` 中 `deal_closed` 商品模式的「商品讀取與 projection 計算」小範圍接入 `getDealClosedItemsProjection()`。

請分析：

1. `deal_closed` 商品模式目前直接讀取哪些欄位：
   - `event.payload.items`
   - `item.productId`
   - `item.quantity`
   - `item.price`
   - `product.price`
   - `product.cost`
2. 現有 handler 會寫回哪些 item 快照：
   - `item.price_at_time_of_sale`
   - `item.cost_at_time_of_sale`
   - `item.product_name`
3. `getDealClosedItemsProjection()` 與現有 handler 行為是否完全等價。
4. 若不完全等價，差異在哪裡：
   - `item.price || product.price` 與 helper 的 nullish / finite fallback 是否一致。
   - `product.cost` 為 `0`、`undefined`、`NaN` 時行為是否一致。
   - `item.quantity` 缺失或 NaN 時行為是否一致。
   - 空白 product id 是否會改變既有結果。
5. 若要接 handler，最小安全替換範圍是什麼。
6. 是否需要先新增 handler-level regression test。

此任務只輸出分析報告，不修改檔案。

## 若分析結果允許，第二個任務才可實作

若第一個任務確認可以安全前進，下一步只能做以下最小修改：

### 允許修改

- `lib/db/events.ts`
- `tests/event-handlers.test.ts`
- 必要時 `lib/db/deal-closed-projection.ts`
- 必要時 `tests/deal-closed-projection.test.ts`

### 允許的行為改動

只替換商品模式中的讀取與計算：

- 商品 ID 讀取。
- 商品名稱讀取。
- 交易價格讀取。
- 交易成本讀取。
- 商品模式 `totalAmount` / `totalCost` / `productsSold` 計算。

### 不允許的行為改動

- 不改庫存扣減。
- 不改超賣檢查。
- 不改 `db.products.update()`。
- 不改 `deal_deleted`。
- 不改 event payload 寫回。
- 不改 `recordEvent()`。
- 不改 sync 流程。

### 必須新增或更新的測試

至少補上 handler-level regression：

1. camelCase item：
   - `productId`
   - `price`
   - `quantity`
2. snake_case item：
   - `product_id`
   - `price_at_time_of_sale`
   - `cost_at_time_of_sale`
3. product snapshot fallback：
   - item 缺價格時使用 product price。
   - item 缺成本時使用 product cost。
4. 不扣庫存的補登：
   - `isBackfill` / `is_backfill` 不應扣 stock。
5. 正常交易仍需檢查庫存不足。
6. `productsSold` 應維持相同 shape：
   - `{ productId, quantity, revenue }`

建議 commit：

```txt
refactor(events): centralize deal item projection reads
```

## 不要急著做的任務

以下任務先不要做，除非使用者明確要求：

- `dailyStats.productsSold` normalization helper。
- `owner-revenue-gap-repair` 內部再收斂。
- `deal_deleted` handler 重構。
- 全面 event immutability。
- rebuildSnapshots 大重構。
- Supabase migration / RLS。

## 完成後需要更新文件

若完成 Step 4 實作，請更新：

- `docs/DATA_CONVERGENCE_PLAN.md`
- `docs/EVENT_HANDLER_CONVERGENCE_ANALYSIS.md`

更新內容需包含：

- 新 commit hash。
- 已完成範圍。
- 明確列出未觸碰項目，例如庫存、`deal_deleted`、event immutability。
- 整體進度可從 88% 調整到 89% 或 90%，視實際範圍而定。

文件 commit 建議另開：

```txt
docs: update deal item handler convergence progress
```

## 回報格式

每次任務完成後請回報：

1. 修改檔案。
2. 是否碰到禁止事項。
3. 行為是否與舊 handler 等價。
4. 測試新增或修改內容。
5. 驗證結果：
   - `npm.cmd test`
   - `npx.cmd tsc --noEmit`
   - `npm.cmd run lint`
   - `npm.cmd run build`
   - `git diff --check`
6. commit hash。
7. 是否已 push。

## 最重要提醒

這個階段的目標是「收斂讀取規則」，不是「重寫事件系統」。

只要遇到以下狀況，請停止並回報，不要硬改：

- helper 行為與 handler 現有行為不等價。
- 需要修改庫存邏輯才可接入。
- 需要修改 `deal_deleted` 才可接入。
- 測試需要大量 mock 才能通過。
- 改動超過單一 handler 分支。

