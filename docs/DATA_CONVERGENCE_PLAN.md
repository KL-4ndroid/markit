# 資料格式收斂計劃

更新日期：2026-06-11
目前狀態：進行中，核心資料讀取層已建立，分析與部分修復/同步流程已開始接入。

## 目標

此計劃的目標是把專案中同時存在的舊/新事件欄位格式逐步收斂，避免功能反覆因 `marketId` / `market_id`、`eventId` / `event_id`、`totalAmount` / `total_amount` 等格式差異而出錯。

最終希望達成：

- 從 Supabase 或 IndexedDB 讀到的事件，都能先被轉成一致格式。
- UI、分析、修復工具不再各自手寫 payload 判斷。
- 老闆與員工資料顯示使用同一套讀取規則。
- 舊資料可以被相容讀取，不要求使用者每次手動修復本機資料。
- 修復工具只處理 projection，不任意刪除或重寫 events。

## 核心策略

### 1. Canonicalization

雲端事件進入本機前先做格式補齊，讓本機事件同時保有必要的 camelCase / snake_case 相容欄位。

### 2. Shared Read Model

建立集中讀取 helper，由功能層呼叫 helper，而不是直接讀：

- `event.payload.marketId`
- `event.payload.market_id`
- `event.payload.eventId`
- `event.payload.event_id`
- `event.payload.totalAmount`
- `event.payload.total_amount`
- `event.payload.items`

### 3. Projection Repair

收入、成交數、互動數等統計 projection 以 events 為來源重建，不直接信任已被累加過的 `market.totalRevenue` 或 `dailyStats.revenue`。

### 4. Incremental Refactor

避免大規模重構。每次只收斂一個功能區，並補上測試。

## 目前完成進度

整體估計：約 90%。

| 區塊 | 狀態 | 說明 |
|---|---:|---|
| 本機資料格式修復工具 | 已完成 | 設定頁已有本機資料 canonicalization 工具。 |
| 雲端事件同步前 canonicalize | 已完成 | 雲端事件寫入本機與 replay 前先做格式補齊。 |
| 共用事件讀取 helper | 已完成 | `lib/events/event-read-model.ts` 已建立並逐步擴充。 |
| Tombstone / 刪除讀取收斂 | 已完成 | 成交/互動刪除流程已改用 shared helper，包含手動成交、商品項目與互動類型。 |
| 本機統計 projection repair | 已完成 | 可從本機 events 重建 market / dailyStats 統計。 |
| Owner revenue gap repair | 已完成 | 老闆漏拉舊 deal_closed 的修復工具已建立，並 canonicalize repair events。 |
| Local projection repair | 已完成 | 本機統計重建工具已改用 shared helper 讀手動成交與商品項目。 |
| Live metrics | 已完成 | 即時銷售數據已改用 shared helper。 |
| Analytics top products | 已完成 | 熱門商品排行已改用 shared helper。 |
| Product affinity | 已完成 | 商品關聯分析與每日收入計算已改用 shared helper。 |
| Analytics manual deal checks | 已完成 | 熱門商品與商品關聯分析已改用 `isManualDealEvent()`，可辨識 snake_case 手動成交。 |
| Analytics data completeness | 已完成 | 資料完整度判斷已改用 shared deal flag helper。 |
| Market detail transaction log | 已完成 | 每日交易紀錄已改用 shared helper 讀互動類型、手動成交、商品項目與成交筆數。 |
| Market detail revenue UI | 已完成 | 每日收入明細互動類型已改用 shared helper。 |
| Market detail interaction UI | 已完成 | 市集詳情互動偏好、互動詳情彈窗與互動統計已改用 shared helper。 |
| Market deal item UI | 已完成 | 成交列表項目的回補判斷已改用 shared helper。 |
| Market deal detail UI | 已完成 | 成交詳情 modal 已改用 shared helper 讀備註、商品數量、回補標記。 |
| Batch entry analytics | 已完成 | `batch-entry-detection-engine.ts` 已改用 shared helper 讀回補、手動成交、成交金額、成交筆數與商品項目。 |
| Metrics engine | 已完成 | `metrics-engine.ts` 已改用 `getDealEventCount()` 計算批次補登調整前的原始成交數。 |
| Event handler projection | 部分完成 | `deal_closed` 手動補登分支已改用 shared projection helper；商品項目 projection helper 與測試已建立；Step 4A tests 完成；C1 新增 handler-compatible item projection helper，維持 handler 語意，不接入 handler。 |
| Integrity / import validation | 部分完成 | 已有大量相容測試，但仍有部分舊格式與 staff-sanitized 資料情境可補。 |

## 已完成的主要 Commit

| Commit | 內容 |
|---|---|
| `b3b0393` | 新增本機資料 canonicalization 工具。 |
| `ef0b0a3` | 雲端 events replay 前 canonicalize。 |
| `a980f31` | 建立 `event-read-model.ts`。 |
| `bb3e655` | 本機 projection repair 改用 shared helper。 |
| `709a582` | owner revenue gap repair canonicalize events。 |
| `f8e53c0` | market event deletion 改用 shared helper。 |
| `373dbf1` | tombstone helper 收斂。 |
| `4310602` | sync 中 staff projection cleanup 改用 shared market helper。 |
| `010784e` | live metrics 改用 shared event helper。 |
| `1b17013` | analytics top products 改用 shared event helper。 |
| `27685b6` | product affinity / daily revenue 改用 shared event helper。 |
| `3a691e7` | data completeness deal flags 改用 shared helper。 |
| `a1ab5d3` | DailyTransactionLog 改用 shared helper 讀互動與成交資訊。 |
| `a3e6beb` | DailyRevenueStats 改用 shared helper 讀互動類型。 |
| `dd45ab3` | DealItem 改用 shared helper 判斷回補成交。 |
| `d22cfc8` | DealDetailModal 改用 shared helper 讀交易詳情欄位。 |
| `f1995c6` | Batch entry detection 改用 shared helper 讀回補、手動成交、成交金額與成交筆數。 |
| `2d4e149` | Metrics engine 改用 shared helper 讀批次補登原始成交數。 |
| `05cac92` | Top products / product affinity 改用 shared helper 判斷手動成交。 |
| `f1c42d0` | Local projection repair 改用 shared helper 讀手動成交與商品項目。 |
| `6a0349d` | Event deletion service 改用 shared helper 讀手動成交、商品項目與互動類型。 |
| `90aafd7` | Market detail interaction UI / local projection repair 改用 shared helper 讀互動類型。 |
| `f5b852a` | 新增 deal_closed 手動補登 projection helper 與測試，尚未替換 handler。 |
| `bb97027` | `deal_closed` 手動補登分支改用 projection helper，支援 snake_case / camelCase 補登欄位。 |
| `c0e285a` | 新增 deal_closed 商品項目 projection helper 與測試，尚未替換 handler。 |||
| `83767f3` | 新增 handler-compatible item projection helper 與測試，維持 handler 語意，payload.totalAmount 仍是 revenue source of truth，不接入 handler。 |
| `64f8e38` | 新增 deal_closed 商品模式 handler-level regression tests，確認 helper 與 handler revenue source of truth 不同，不可直接接入。

## 目前剩餘工作

### P1：市集詳情顯示層

目前已完成。每日收入明細、每日交易紀錄、成交列表項目、成交詳情 modal 已逐步改用 shared read model。

### P2：收斂分析引擎

主要分析引擎已完成收斂。剩餘項目為低風險、低急迫度，可先觀察。

1. `lib/analytics/product-recommendations.ts`
   - 目前主要讀 `dailyStats.productsSold`，風險較低。
   - 已有基本防呆與測試，暫不強行抽 helper；若未來其他模組也重複處理 productsSold，再抽成 normalization helper。

### P3：收斂修復工具內部細節

這些任務會碰修復邏輯，需更謹慎。

1. `lib/sync/owner-revenue-gap-repair.ts`
   - 已 canonicalize repair events，但仍有部分 local event 轉換與 revenue/count 計算可再統一。

### P4：高風險區，暫緩

以下區域先不要大幅修改，除非有明確 bug 與測試保護。

詳細拆分分析見：`docs/EVENT_HANDLER_CONVERGENCE_ANALYSIS.md`

1. `lib/db/events.ts`
   - 事件 handler / projection 核心。
   - 一次性大改很容易造成統計、庫存、刪除 replay 回歸。
   - 已完成 `deal_closed` 手動補登分支替換。
   - 已新增商品項目 projection helper 與測試。
   - Step 4A regression tests 確認：handler 直接信任 `payload.totalAmount` 作為 revenue source of truth，items loop 不重新計算 revenue；helper `getDealClosedItemsProjection()` 從 items 推導 revenue，兩者不等價。
   - **不可直接接入 helper**。下一步若要前進，需先決定 revenue source of truth 或提供與 handler 等價的 helper。

2. `hooks/useSync.ts`
   - 同步主流程。
   - 只做必要的小修，不做架構性重寫。

3. Supabase RLS / migration
   - 需先分析、產生 SQL、由使用者確認後再執行。

## 不建議採用的做法

### 不建議用日期 cutoff 決定舊資料邏輯

原因：

- 正常舊資料可能被誤修。
- 異常新資料可能漏修。
- 會長期留下兩套路徑。

### 不建議直接刪除或重寫 events

原因：

- events 是事實來源。
- projection 錯誤應透過重建 projection 修復。
- 只有確認為語義重複或孤兒資料時，才應有專門 migration / recovery 流程。

### 不建議在 UI 內手寫格式相容判斷

原因：

- UI 會越來越複雜。
- 老闆與員工資料邏輯容易分岔。
- 後續新增欄位會反覆漏修。

## 建議下一步

下一階段建議順序：

1. 評估 `lib/sync/owner-revenue-gap-repair.ts`
   - 目前不急著調整，避免修復工具與 handler 收斂交錯。
   - 若未來要處理，只能小範圍替換讀取 helper，不改修復條件與寫入流程。

2. 評估是否小範圍接入商品項目 projection helper
   - 只替換商品 ID、價格、成本、productsSold 計算讀取。
   - 不改庫存扣減。
   - 不改 event payload 寫回。
   - 不改 `deal_deleted`。

3. 評估 `dailyStats.productsSold` normalization helper
   - 目前重複程度不高，暫緩抽象。

## 每次任務完成標準

每個小任務都應符合：

- 僅修改一個功能區。
- 不修改 Supabase schema / RLS。
- 不重寫 events。
- 不混入 UI 文案大整理。
- 新增或更新測試。
- 通過：
  - `npm.cmd test`
  - `npx.cmd tsc --noEmit`
  - `npm.cmd run lint`
  - `npm.cmd run build`
  - `git diff --check`
- 單獨 commit 並 push。

## 目前判斷

收斂方向是正確的，而且已經從「修補單點 bug」進入「集中讀取規則」階段。

接下來最重要的是持續把 UI / analytics / repair 的 payload 讀取往 `event-read-model.ts` 集中。只要這條線繼續推進，舊資料、新資料、員工資料、老闆資料之間的格式差異會逐步被吸收，未來同步或重建 projection 時也會更穩定。