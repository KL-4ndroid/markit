# C2.16A Market Projection Cache 設計覆核

更新日期：2026-06-13
任務類型：純分析 / 設計覆核
狀態：分析完成，服務無需重構，現有 Hook 已足夠

## 一、現況評估

### 現有 Projection Cache 架構

```
lib/db/hooks.ts
  ├── useDateRangeStats(startDate, endDate)
  │   → db.dailyStats.where('date').between(startDate, endDate)
  │
  ├── useDailyStats(date, marketId)
  │   → db.dailyStats.where('[date+marketId]').equals([date, marketId])
  │
  └── useMonthlyStats(ownerId)
      → db.markets（直接累加 market.totalRevenue/profit/deals）

lib/sync/local-projection-repair.ts
  ├── rebuildMarketStatsFromEvents(marketId, { dryRun })
  │   → 從 db.events 重算 projection，寫入 db.dailyStats + db.markets
  │
  └── repairLocalMarketProjections(options)
      → 比較 projection 和 events，找出 inflated/lower/consistent
```

### 資料流向

```
事件寫入（recordEvent）
  ↓
Handler 更新 db.dailyStats（Projection Cache）
  ↓
Handler 更新 db.markets（totalRevenue/totalDeals/totalProfit）
  ↓
UI 透過 useLiveQuery 讀取 db.dailyStats / db.markets
  ↓
reconcileSyncedProjectionMarkets()（同步後比對並修復）
```

---

## 二、發現的缺口

### 缺口 A：`dailyStats` 和 `events` 的時序不一致

`DailyRevenueStats.tsx` 顯示的數字來自 `db.dailyStats`（Projection Cache）。

問題：
- `deal_closed` handler 寫入 `db.dailyStats` ✅
- `deal_deleted` handler 更新 `db.dailyStats` ✅
- 但 **`reconcileSyncedProjectionMarkets`** 在同步後才呼叫
- 若同步完成後有新事件寫入，`dailyStats` 和 raw events 可能瞬間不一致

**影響範圍**：使用者可能在 sync 完成後、短暫看到落後的 projection。

**現有緩解**：`reconcileSyncedProjectionMarkets` 在每次 sync pull 完成後呼叫，確保 eventually consistent。

### 缺口 B：`DailyRevenueStats` 同時讀 projection cache 和 raw events

```tsx:components/markets/DailyRevenueStats.tsx (行 58)
const interactions = (await getActiveInteractionEventsForMarket(market.id))
  .filter(e => marketDates.includes(getLocalDateStringFromTimestamp(e.timestamp)));
```

此處讀 raw events 來計算互動次數，但 revenue/dealCount 從 `useDateRangeStats`（`db.dailyStats`）讀取。

**問題**：同一張卡片混合 projection cache 和 raw events，邏輯上不一致。

**實際影響**：若 `db.dailyStats` 落後，`revenue` 顯示舊值，但 `interactions` 顯示新值。

### 缺口 C：`rebuildMarketStatsFromEvents` 和 handler 的計算是否一致？

`lib/sync/local-projection-repair.ts` 的 `rebuildMarketStatsFromEvents` 從 raw events 重算 projection。`lib/db/events.ts` 的 handler 也寫入 projection。

需要確認兩者對以下情境的處理是否一致：

| 情境 | Handler 行為 | rebuildMarketStatsFromEvents 行為 |
|------|-------------|-----------------------------------|
| `isBackfill=false, isManualEntry=false` | 正常計算 | 正常計算 |
| `isBackfill=true, isManualEntry=true` | 不扣 stock，讀 manualRevenue | 同左 ✅ |
| `isBackfill=true, isManualEntry=false` | 扣 stock，讀 items | 同左 ✅ |
| `deal_deleted` tombstone | 回補 stock，扣 revenue | 同左 ✅ |
| snake_case payload | 透過 normalizeEventPayloadForLocal | 直接讀 payload |

### 缺口 D：`useMonthlyStats` 繞過 dailyStats 直接讀 markets

```ts:lib/db/hooks.ts (行 503-509)
for (const market of validMarkets) {
  summary.totalRevenue += market.totalRevenue || 0;
  summary.totalProfit += market.totalProfit || 0;
  summary.totalDeals += market.totalDeals || 0;
  summary.totalInteractions += market.totalInteractions || 0;
}
```

此函式直接從 `db.markets` 累加 totals，不依賴 `db.dailyStats`。

**這是正確的設計**：月統計要的是 market 維度的累加值，不是 daily 維度。

---

## 三、評估結論：現有 Hook 足夠，Projection Cache 服務不需要新增

### 現有 Hook 的職責已經清晰

| Hook | 職責 | 風險 |
|------|------|------|
| `useDateRangeStats` | 讀 `db.dailyStats` 的日期範圍 projection | 中：可能落後 |
| `useDailyStats` | 讀 `db.dailyStats` 的單日單市場 projection | 中：可能落後 |
| `useMonthlyStats` | 從 `db.markets` 直接累加 | 低：直接讀 truth source |
| `rebuildMarketStatsFromEvents` | 從 raw events 重算 projection | 低：用於維修 |

### Projection Cache 服務已經存在

`lib/sync/local-projection-repair.ts` + `lib/projections/market-projection-service.ts` 已經構成 Projection Cache 服務層。沒有必要在 `lib/db/hooks.ts` 之上再包一層。

---

## 四、可選的小改動

### 改動 1：`DailyRevenueStats` 統一讀取來源

將互動次數也從 `db.dailyStats.extraInteractions` 讀取，而非每次都查 raw events：

```tsx
// 現有：每次 render 都查 raw events
const interactions = (await getActiveInteractionEventsForMarket(market.id))
  .filter(e => marketDates.includes(getLocalDateStringFromTimestamp(e.timestamp)));

// 改為：從 extraInteractions 直接讀
const dailyData = stats?.map(stat => ({
  ...stat,
  interactions: stat.extraInteractions || {},
}));
```

**代價**：需要確認 `extraInteractions` 是否在 handler 中正確維護。若 handler 已寫入，則可讀取。

### 改動 2：新增 Projection Cache Validation Hook

```ts
// lib/db/projection-cache.ts
export function useProjectionCacheStatus(marketId: string) {
  return useLiveQuery(async () => {
    const [market, events, stats] = await Promise.all([
      db.markets.get(marketId),
      db.events.where('market_id').equals(marketId).toArray(),
      db.dailyStats.where('marketId').equals(marketId).toArray(),
    ]);

    const comparison = await compareMarketProjectionWithEvents(marketId);
    return {
      status: comparison.status, // 'consistent' | 'inflated' | 'lower_than_events'
      lastValidated: Date.now(),
    };
  }, [marketId]);
}
```

**用處**：在 UI 顯示 projection 的一致性狀態，讓用戶知道數據是否需要維修。

### 改動 3：`compareMarketProjectionWithEvents` 在 sync 後自動呼叫

目前 `reconcileSyncedProjectionMarkets` 已經做到這件事（行 89-103，`lib/sync/projection-reconciliation.ts`）。不需要額外改動。

---

## 五、結論

**現有 Projection Cache 架構滿足 C2.16 的目標**：

1. `db.dailyStats` 是 Projection Cache
2. `lib/db/events.ts` handler 維護 projection
3. `lib/sync/local-projection-repair.ts` 提供維修能力
4. `lib/db/hooks.ts` 的 `useDateRangeStats` / `useDailyStats` 提供讀取介面
5. `DailyRevenueStats` 混合讀取 projection 和 raw events，但實際可接受

**不需要新增 service 檔案或重構現有程式碼**。

唯一值得做的可選改動是：
1. **改動 1**：統一 `DailyRevenueStats` 的讀取來源（從 `extraInteractions` 而非 raw events）
2. **改動 2**：新增 `useProjectionCacheStatus` hook 顯示一致性狀態

---

## 六、C2.16B 實作建議

C2.16B 唯一有意義的實作是**改動 1**：讓 `DailyRevenueStats` 從 `db.dailyStats.extraInteractions` 讀取互動次數，而非每次查 raw events。

**實作步驟**：
1. 確認 `deal_closed` / `interaction_recorded` handler 是否已將互動寫入 `db.dailyStats.extraInteractions`
2. 若已寫入：將 `interactionEvents` 的 fetch 改為從 `stats` 中的 `extraInteractions` 讀取
3. 若未寫入：需修改 handler 以寫入 `extraInteractions`

**禁止修改**：
- UI 結構
- sync 邏輯
- handler 的其他行為
- Supabase schema
