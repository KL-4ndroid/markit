# C2.15A Active Event Service 設計覆核

更新日期：2026-06-13
任務類型：純分析 / 設計覆核
狀態：服務已存在，設計評估完成

## 一、現況評估

### 現有服務結構

`lib/events/active-event-service.ts` 已有完整服務，結構良好：

```
getActiveDealEvents()           → 從 IndexedDB 讀取所有 active deal events
  ↓
filterActiveDealEventsForMarket()  → 按 marketId 過濾
filterActiveDealEventsForDate()     → 按 marketId + date 過濾
  ↓
buildDealSummaryFromActiveEvents() → 聚合為 DealSummary
```

### API 表面積

| 函式 | 簽名 | 用途 |
|------|------|------|
| `getActiveDealEventsForMarket` | `(marketId) => Promise<Event[]>` | 單一市場所有 active deals |
| `getActiveDealEventsForMarkets` | `(marketIds) => Promise<Event[]>` | 多市場 active deals |
| `getActiveDealEventsForDate` | `(marketId, date) => Promise<Event[]>` | 單一市場單日 active deals |
| `getActiveInteractionEventsForMarket` | `(marketId) => Promise<Event[]>` | 單一市場 interactions |
| `getActiveInteractionEventsForDate` | `(marketId, date) => Promise<Event[]>` | 單一市場單日 interactions |
| `getDealSummaryFromEvents` | `(marketId) => Promise<DealSummary>` | 聚合 revenue/dealCount |
| `getRawDealEventsForMarket` | `(marketId) => Promise<Event[]>` | 無 tombstone 過濾的 raw events |

### 已通過的測試

`tests/active-event-service.test.ts` 已覆蓋 6 個場景：
- ✅ full/manual backfill 在同 market/date 都出現
- ✅ exact tombstone target 被移除
- ✅ semantic tombstone fallback 只移除一筆
- ✅ interaction 依 timestamp date 過濾
- ✅ 多市場 interaction 排序正確

---

## 二、發現的缺口

### 缺口 A：`getRawDealEventsForMarket` 沒有 tombstone 過濾

```ts:lib/events/active-event-service.ts (行 225-234)
export async function getRawDealEventsForMarket(
  marketId: string
): Promise<Event<DealClosedPayload>[]> {
  if (!marketId) return [];
  const events = await db.events
    .where('type')
    .equals('deal_closed')
    .toArray() as Event<DealClosedPayload>[];
  return filterDealEventsForMarket(events, marketId); // ← 沒有呼叫 withoutDeletedDealEvents
}
```

**用途**：需要讀取包含已刪除記錄的完整歷史時使用。但若 UI 意外呼叫此函式，會看到已刪除的成交。

**建議**：保留，但加上 `@deprecated` 註解說明應使用 `getActiveDealEventsForMarket`。

### 缺口 B：Async 函式無法在隔離環境測試

`getActiveDealEventsForMarket()` 等 async 函式依賴 `db.events`（Dexie），無法在不 mock IndexedDB 的情況下測試。

**現有測試策略**：只測試純函式（filter / build），async wrapper 不測試。

**建議**：維持現有策略，不需要改變。

### 缺口 C：Semantic Tombstone Fallback 未隔離為可測純函式

Semantic tombstone fallback 邏輯在 `lib/db/event-tombstones.ts` 的 `withoutDeletedDealEvents()` 內部：

```ts
// lib/db/event-tombstones.ts
export function withoutDeletedDealEvents(
  events: Event<DealClosedPayload>[],
  deletedEvents: DealDeletedEventView[]
): Event<DealClosedPayload>[] {
  // 1. exact match by eventId
  // 2. semantic fallback (date + revenue + marketId)
  // ...
}
```

**問題**：`withoutDeletedDealEvents` 依賴 `getTombstoneTargetEventId()` 和 `getDeletedEventIds()`，後者從 Dexie 讀取，難以隔離測試。

**建議**：將 semantic fallback 邏輯提取為可測純函式（見下節）。

### 缺口 D：full backfill / simple backfill / normal deal 判斷分散

`isManualEntry` 和 `isBackfill` 的判斷在 payload 中：

| 模式 | `isBackfill` | `isManualEntry` | 行為 |
|------|:------------:|:---------------:|------|
| Normal deal | `false` | `false` | 扣庫存、正常計算 |
| Manual backfill | `true` | `true` | 不扣庫存、讀 `manualRevenue` |
| Full backfill | `true` | `false` | 扣庫存、讀 `items` |

**現有行為**：三者都出現在 `getActiveDealEvents()` 中，視為 active deal。這是正確行為。

---

## 三、評估結果：服務已足夠

經過完整覆核，現有 `lib/events/active-event-service.ts` 結構良好、命名清晰、測試充分。**不需要大規模重構**。

### 建議改動（可選，小型）

1. **`getRawDealEventsForMarket` 加上 `@deprecated`**：標記為內部使用，不建議外部呼叫。

2. **將 semantic fallback 提取為可測純函式**：

```ts
// 新檔案：lib/events/semantic-tombstone-fallback.ts

/**
 * 測試 pure semantic matching logic，不依賴 Dexie。
 */
export function matchSemanticDeal(
  deletedTombstone: DealDeletedEventView,
  candidateDeal: Event<DealClosedPayload>
): boolean {
  const deletedDate = getDealEventDate(deletedTombstone);
  const deletedRevenue = getDealEventRevenue(deletedTombstone);
  const candidateDate = getDealEventDate(candidateDeal);
  const candidateRevenue = getDealEventRevenue(candidateDeal);
  const candidateMarketId = getEventMarketId(candidateDeal);

  return (
    deletedDate === candidateDate &&
    deletedRevenue === candidateRevenue &&
    getEventMarketId(deletedTombstone) === candidateMarketId
  );
}
```

此純函式可獨立測試，確保 semantic matching 的邊界條件（不同 date、revenue、marketId 不會匹配）。

3. **不新增 API**：現有 API 已覆蓋所有使用場景。

---

## 四、與 UI 的接入狀況

`app/markets/[id]/page.tsx` 已正確使用 Active Event Service：

```tsx
import {
  getActiveDealEventsForMarket,
  getActiveInteractionEventsForMarket,
} from '@/lib/events/active-event-service';

// 在 useEffect 中呼叫
const activeDeals = await getActiveDealEventsForMarket(marketId);
const activeInteractions = await getActiveInteractionEventsForMarket(marketId);
```

---

## 五、結論

**服務現狀滿足 C2.15 的目標**，不需要新增 service 檔案。

唯一可選的小改動是：
1. 對 `getRawDealEventsForMarket` 加上 `@deprecated` 標記
2. 將 semantic matching 提取為可測純函式

**不需要實作任何改動**。C2.15A 設計覆核完成，服務狀態：**已就緒**。

---

## 六、C2.15B 實作建議

C2.15B 的實作需求（來自 HANDOFF.md）：

- `lib/events/active-event-service.ts` — 允許修改
- `tests/active-event-service.test.ts` — 允許新增測試

**建議 C2.15B 只做一件事**：對 `getRawDealEventsForMarket` 加上 `@deprecated` 標記，並為 semantic matching 新增純函式測試。

**禁止修改**：
- UI
- sync
- Supabase
- `lib/db/events.ts`
