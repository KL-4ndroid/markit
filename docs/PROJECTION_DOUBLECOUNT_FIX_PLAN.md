# C3.4 Projection Double-Count 修復計畫

更新日期：2026-06-14
任務類型：設計 + 實作
狀態：分析完成，待使用者確認後實作

## 一、問題陳述

### 1.1 觀察症狀

- **市集列表卡片收入**（`MarketCard`）：顯示看似合理（用 `useMarketStatsBatch` 從 `dailyStats` projection 算）
- **詳情頁每日卡片**（`DailyRevenueStats`）：每日數字正確（過濾 `marketId + date`）
- **詳情頁下方總計**（`DailyRevenueStats` line 232-256）：❌ 直接讀 `market.totalRevenue`，**與每日卡片加總嚴重不一致**
- **修復後再同步**：污染復發

### 1.2 案例資料

- 市集：水水市集
- 列表卡片：$100,376 / 6 筆
- 4/11 單日卡片：$6,450 / 1 筆
- 詳情頁下方總計：$12,900 / 2 筆
- **UI 內部矛盾**：$100,376 ≠ $12,900

### 1.3 截圖推測的真實情境

- 本地 `db.dailyStats` 在某次 sync 期間被多次 `deal_closed` replay 累積到 $100,376（多日總和）
- 本地 `db.markets.totalRevenue` 從雲端 `markets.total_revenue` 帶入後又被 replay 二次累加到 $12,900（雲端 markets 表還沒更新到一致）
- 或反之：本地 `market.totalRevenue` 是被雲端 hydrate 後又 replay 過相同 event 的 $12,900

**兩者口徑不同、來源不同步** → UI 內部矛盾。

---

## 二、根因確認

### 2.1 三個根因

| # | 根因 | 程式碼位置 | 影響範圍 |
|---:|---|---|---|
| **A** | `DailyRevenueStats` 下方總計直接讀被污染的 `market.totalRevenue`，**不**從 `dailyData.reduce()` 算 | `components/markets/DailyRevenueStats.tsx:232-256` | UI 內部矛盾 |
| **B** | Owner 同步：`batchHydrateMarkets` 把雲端 `markets.total_revenue` 帶入本地，replay `deal_closed` 後 `+= totalAmount` 二次累加 | `hooks/useSync.ts:945-950` + `:1137-1144` + `lib/db/events.ts:850` | Owner 所有 market |
| **C** | Staff 同步：`syncMarketsToIndexedDB` + `syncProductsToIndexedDB` 同樣把雲端 `total_revenue` / `total_sold` 帶入本地，replay 後二次累加 | `hooks/useSync.ts:1547` + `:1611` + `lib/db/events.ts:826, 839` | Staff 所有 market + product |
| **D** | `reconcileSyncedProjectionMarkets` 是 `dryRun: true`，即使偵測到 `inflated` 也不 auto-repair | `hooks/useSync.ts:106` | 長期無法自癒 |

### 2.2 為什麼 A 是 UI 矛盾的「表現」、B+C 是「原因」

- A 是**症狀**：`DailyRevenueStats` 應該從 `dailyData` 算總計（如同 `MarketCard` 用 `useMarketStatsBatch`），**但程式沒這麼做**
- B+C 是**真正根因**：即使把 A 修了，如果 B+C 不修，未來仍有：
  - 其他直接讀 `market.totalRevenue` 的地方（如 `MarketDetail` 的 `commissionRate` 計算 line 1712）會污染
  - 修復後再 sync 又會污染
  - `product.totalSold` / `product.stock` 也有同樣問題

### 2.3 為什麼 D 是「無法長期自癒」

- P0（修 A）讓 UI 內部一致
- P1（修 B+C）讓下一次 sync 不再污染本地 `db.markets.totalRevenue`
- 但若**之前**的污染還在 `db.markets`（用戶已累積的錯誤值），需要 P2 (D) 自動 rebuild
- 沒有 P2：用戶要手動進 Recovery 頁按「本機統計投影修復」才能修

---

## 三、修復計畫

### 3.1 整體策略

```
P0  UI 內部一致性             → DailyRevenueStats 總計改 dailyData.reduce()
P1  Sync 不污染本地 projection → hydrate 時 reset projection 欄位
P2  Owner auto-repair         → reconcileSyncedProjectionMarkets 依 context 決定 dryRun
P3  防禦性補強                → useMarketStatsBatch 加上 marketId 過濾
```

P0+P1+P2 是「**必修**」，P3 是「**強烈建議**」，P2 必須等 P1 修好才安全。

### 3.2 詳細實作

#### P0：UI 內部一致性

**修改檔案**：`components/markets/DailyRevenueStats.tsx`

**現況**（line 232-256）：
```tsx
{!isSingleDay && (
  <div className="mt-4 pt-4 border-t border-[#7B9FA6]/10">
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <div className="text-xs text-[#6B6B6B] mb-1">總收入</div>
        <div className="text-xl font-bold text-[#7B9FA6]">
          {formatCurrency(market.totalRevenue || 0)}   // ❌ 污染
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-[#6B6B6B] mb-1">總利潤</div>
        <div className={...}>
          {formatCurrency(market.totalProfit || 0)}    // ❌ 污染
        </div>
      </div>
      <div className="text-center">
        <div className="text-xs text-[#6B6B6B] mb-1">總成交</div>
        <div className="text-xl font-bold text-[#D4A574]">
          {market.totalDeals || 0}                     // ❌ 污染
        </div>
      </div>
    </div>
  </div>
)}
```

**修法**：把 `dailyData` 已有結構 reduce 出 totals。

**改為**：
```tsx
const dailyTotals = useMemo(() => ({
  totalRevenue: dailyData.reduce((sum, d) => sum + (d.revenue || 0), 0),
  totalProfit:  dailyData.reduce((sum, d) => sum + (d.profit || 0), 0),
  totalDeals:   dailyData.reduce((sum, d) => sum + (d.deals || 0), 0),
}), [dailyData]);

// ...在 line 232 區塊：
{!isSingleDay && (
  <div className="mt-4 pt-4 border-t border-[#7B9FA6]/10">
    <div className="grid grid-cols-3 gap-3">
      <div className="text-center">
        <div className="text-xs text-[#6B6B6B] mb-1">總收入</div>
        <div className="text-xl font-bold text-[#7B9FA6]">
          {formatCurrency(dailyTotals.totalRevenue)}   // ✅ 來自 dailyData
        </div>
      </div>
      {/* 總利潤、總成交同樣改為 dailyTotals.totalProfit / totalDeals */}
    </div>
  </div>
)}
```

**驗證**：
- 跑回水水市集詳情頁 → 下方總收入應等於所有 daily cards 加總
- 每日明細 4/11 = $6,450，下方總計 = $6,450 + 其他日期 = $100,376（與列表卡片一致）

**Commit 訊息**：
```
fix(ui): derive DailyRevenueStats total from dailyData.reduce

- 下方總計改為 dailyData.reduce() 計算
- 確保 UI 內部每日卡片加總 === 下方總計
- 避免讀取被污染的 market.totalRevenue
- 修改：components/markets/DailyRevenueStats.tsx
```

**風險**：**零**。純 UI 計算邏輯變更，不影響資料。

---

#### P1：Sync 不污染本地 projection

**修改檔案**：`hooks/useSync.ts`（3 處）

**現況 1 — Owner**（line 945-950）：
```ts
const localMarket = marketRowToLocal(market);
// 經 PermissionGate 脫敏（員工視角下 cost/profit 等敏感欄位會被移除）
const sanitized = marketGateForLevel(infoLevel).sanitizeMarketProjection(
  localMarket as unknown as Record<string, unknown>
);
await db.markets.put(sanitized as unknown as typeof localMarket);  // ❌ totalRevenue 一併寫入
hydrated.add(market.id);
```

**修法**：put 之前 reset projection 欄位
```ts
const sanitized = marketGateForLevel(infoLevel).sanitizeMarketProjection(
  localMarket as unknown as Record<string, unknown>
) as typeof localMarket;
// ✅ 重要：雲端 markets 表的 projection 欄位不應作為本地 replay 累加基底
// 本地 totalRevenue / totalDeals / totalInteractions 應由 events replay 得出
await db.markets.put({
  ...sanitized,
  totalRevenue: 0,
  totalProfit: 0,
  totalDeals: 0,
  totalInteractions: 0,
});
hydrated.add(market.id);
```

**現況 2 — Staff sync markets**（line 1536-1547）：
```ts
const marketData = {
  ...mappedMarket,
  sync_status: 'synced' as const,
  earlyEntryEnabled: mappedMarket.earlyEntryEnabled ?? existing?.earlyEntryEnabled ?? false,
  // ... 等等
};

await db.markets.put({ ...marketData, id: market.id } as Market);  // ❌ 包含 totalRevenue
```

**修法**：同上，put 之前 reset
```ts
const marketData = {
  ...mappedMarket,
  // ... 既有欄位
  totalRevenue: 0,         // ✅ reset
  totalProfit: 0,
  totalDeals: 0,
  totalInteractions: 0,
};

await db.markets.put({ ...marketData, id: market.id } as Market);
```

**現況 3 — Staff sync products**（line 1604-1611）：
```ts
const productData = {
  ...mappedProduct,
  unlimitedStock: mappedProduct.unlimitedStock ?? false,
  isActive: mappedProduct.isActive ?? true,
};

await db.products.put({ ...productData, id: product.id } as Product);  // ❌ 包含 totalSold, stock
```

**修法**：reset 累加型欄位，**保留** stock（商品初始化時 stock 是真實值，不重算）
```ts
const productData = {
  ...mappedProduct,
  unlimitedStock: mappedProduct.unlimitedStock ?? false,
  isActive: mappedProduct.isActive ?? true,
  // ✅ totalSold 應由 deal_closed events 累加得出，不從雲端帶入
  totalSold: 0,
  // stock 保留：商品補貨時 stock 來自雲端，不應 reset
};
```

**為什麼 stock 保留**：stock 是「絕對剩餘量」，從雲端帶入是正確的（雲端 = truth source）。`deal_closed` 會扣 stock，若 events 已被雲端帶入且本地有對應 event replay，會造成「雙重扣減」。但 P1 只 reset `totalSold`，**不** reset stock。

**更深層的 stock 問題**（不在 P1 修）：若雲端 stock 已被 `deal_closed` 扣過，replay 又會扣一次。修法是「先比較 events list 完整性，缺少的 events 不 replay」或「stock 不扣，只在雲端扣」。這個風險**目前未觀察到用戶回報**，留為後續 P4 議題。

**驗證**：
- Owner：mock 雲端 `markets.total_revenue = 10000` + 1 筆 `deal_closed` totalAmount = 1000
  - 跑 `batchHydrateMarkets` + replay handler
  - 預期：本地 `market.totalRevenue = 1000`（從 0 開始加），`dailyStats` 對應日期 = 1000
- Owner：跑第二次 sync（不應有 new events）
  - 預期：本地 `market.totalRevenue` = 1000（**不**再累加）
- Staff：mock 雲端 `products.total_sold = 50` + 1 筆 `deal_closed` quantity = 3
  - 跑 `syncProductsToIndexedDB` + `syncEventsToIndexedDB` replay
  - 預期：本地 `product.totalSold = 3`（從 0 開始加）

**Commit 訊息**：
```
fix(sync): reset market and product projection fields on cloud hydration

- batchHydrateMarkets (owner): put 之前把 totalRevenue/totalProfit/
  totalDeals/totalInteractions 歸零
- syncMarketsToIndexedDB (staff): 同步 reset
- syncProductsToIndexedDB (staff): 同步把 totalSold 歸零
- 理由：雲端 projection 不應作為本地 replay 累加基底
- 修改：hooks/useSync.ts (3 處)
```

**風險**：
- **Owner first sync**：會丟失雲端累積的 projection，但 events 重算後等於雲端值（假設 events 完整）
- **跨設備切換**：同上
- **Staff view**：partial events 風險仍存在（但比「含雲端污染」更輕微）

---

#### P2：Owner auto-repair

**修改檔案**：`hooks/useSync.ts`

**現況**（line 94-114）：
```ts
async function reconcileSyncedProjectionMarkets(
  marketIds: Set<string>,
  context: ProjectionReconciliationContext
): Promise<void> {
  if (marketIds.size === 0) return;

  try {
    // ... 註解
    const result = await reconcileTouchedMarketProjections(marketIds, { context, dryRun: true });
    // ...
  } catch (error) { ... }
}
```

**修法**：根據 context 決定 dryRun
```ts
async function reconcileSyncedProjectionMarkets(
  marketIds: Set<string>,
  context: ProjectionReconciliationContext
): Promise<void> {
  if (marketIds.size === 0) return;

  try {
    // ✅ Owner 路徑：events 完整，可信 auto-repair
    // Staff 路徑：partial events 風險，保持 observation-only
    const dryRun = context === 'staff-view' || context === 'snapshot';

    const result = await reconcileTouchedMarketProjections(marketIds, { context, dryRun });
    // ...
  } catch (error) { ... }
}
```

**注意**：
- P2 必須等 P1 修好才安全
- 修好 P1 之後，hydrate 帶入的 `market.totalRevenue = 0` + replay 累加 = **正確值**
- P2 此時會 no-op（無 inflated）
- 但**老用戶**（在 P1 修好前已累積污染的）跑 P2 會自動 rebuild
- Staff view 與 snapshot 保持 observation-only

**為什麼 snapshot 保持 observation-only**：
- Snapshot 載入直接覆寫 `markets / dailyStats`，reconciliation 邏輯複雜
- 修法是「由 Recovery 頁手動引導」，**不在自動 repair 範圍**

**驗證**：
- mock 本地 `market.totalRevenue = 999`（已污染） + 雲端 1 筆 `deal_closed` 1000 + events 完整
- 跑 `pullAllEvents` → 預期 reconcile 偵測到 inflated → rebuild → `market.totalRevenue = 1000`
- mock staff view partial events → 預期 reconcile 仍 observation-only，不 rebuild

**Commit 訊息**：
```
fix(sync): enable auto-repair for owner-full and owner-incremental contexts

- reconcileSyncedProjectionMarkets 根據 context 決定 dryRun
- owner-full / owner-incremental: dryRun=false（已驗證 events 完整）
- staff-view / snapshot: 保持 dryRun=true（partial events 風險）
- 修改：hooks/useSync.ts
```

**風險**：
- 若 owner 端某 market 確實有 `local_events_incomplete`（同步期間 events 尚未全部下載），rebuild 會覆蓋真實值
- 緩解：`compareMarketProjectionWithEvents` 已有 `local_events_incomplete` 狀態判斷（market-projection-service.ts:93）
- 進一步緩解：只在 `status === 'inflated'` 時 rebuild（已實作 line 91-92）

---

#### P3：防禦性補強（可選但強烈建議）

**修改檔案**：`lib/db/hooks.ts`

**現況**（line 662）：
```ts
const filteredStats = allStats.filter(s => dates.includes(s.date));
//                                       ↑ 沒加 s.marketId === market.id
```

**修法**：加上 marketId 過濾
```ts
const filteredStats = allStats.filter(
  s => s.marketId === market.id && dates.includes(s.date)
);
```

**為什麼這是 P3**：
- `anyOf(marketIds)` 已縮限為該批 markets，**理論上**不會跨市集污染
- 但若未來 `useMarketStatsBatch` 改為「全 markets 一次查」或 `allStats` 來源改變，此 filter 就是 latent bug
- 純防禦性，5 分鐘修，風險為零

**Commit 訊息**：
```
fix(hooks): add defensive marketId filter in useMarketStatsBatch
```

---

## 四、測試計畫

### 4.1 P0 測試

**檔案**：`tests/daily-revenue-stats-totals.test.ts`（新建）

**場景**：
1. 每日卡片顯示 `[{date: '4/11', revenue: 6450, deals: 1}, {date: '4/12', revenue: 6450, deals: 1}]` → 下方總計應 = $12,900 / 2 筆
2. 單日市集 → 不顯示總計區塊
3. 空 dailyData → 下方總計 = 0
4. `market.totalRevenue` 故意污染為 $999,999 → 下方總計**仍**等於 dailyData 加總（不讀污染值）

**測試類型**：component testing + 純函式 reduce 邏輯
**注意**：`DailyRevenueStats` 是 React component，測試需要 jsdom 或 React Testing Library。檢查 `package.json` 是否已有 test utilities。

### 4.2 P1 測試

**檔案 A**：`tests/sync-hydration-resets-projection.test.ts`（新建）

**場景**：
1. Owner：`batchHydrateMarkets` 後 `db.markets.get(marketId).totalRevenue === 0`
2. Owner：replay 1 筆 `deal_closed` totalAmount = 1000 → `market.totalRevenue === 1000`
3. Owner：連續跑兩次 hydrate + replay（無新 events）→ `market.totalRevenue === 1000`（不倍增）
4. Staff：`syncMarketsToIndexedDB` 後 `db.markets.get(marketId).totalRevenue === 0`
5. Staff：`syncProductsToIndexedDB` 後 `db.products.get(productId).totalSold === 0`
6. Staff：replay 1 筆 `deal_closed` quantity = 3 → `product.totalSold === 3`

**測試類型**：mock supabase + Dexie fake-indexeddb。參考 `tests/event-sync-service.test.ts` 與 `tests/local-projection-repair.test.ts` 的 mock 風格。

**檔案 B**：`tests/batch-hydrate-markets.test.ts`（新建，純函式部分）

**場景**：把 hydrate + reset 邏輯抽出為純函式 `resetProjectionFields(market): Market` 並測試。

### 4.3 P2 測試

**檔案**：`tests/sync-reconciliation-context-dryrun.test.ts`（新建）

**場景**：
1. `context = 'owner-full'` + `status = 'inflated'` → 應呼叫 `rebuild` 函式
2. `context = 'owner-incremental'` + `status = 'inflated'` → 應呼叫 `rebuild` 函式
3. `context = 'staff-view'` + `status = 'inflated'` → **不**應呼叫 `rebuild`（dryRun）
4. `context = 'snapshot'` + `status = 'inflated'` → **不**應呼叫 `rebuild`（dryRun）
5. 任何 context + `status = 'consistent'` → 不呼叫 `rebuild`
6. 任何 context + `status = 'lower_than_events'` → 不呼叫 `rebuild`（第一版保守）
7. 任何 context + `status = 'local_events_incomplete'` → 不呼叫 `rebuild`（避免誤刪）

**測試類型**：mock injection（傳入 `compare` / `rebuild`）。參考 `tests/sync-reconciliation.test.ts:23-46`。

### 4.4 P3 測試

**檔案**：整合到 `tests/daily-stats-repair.test.ts` 或新建

**場景**：
1. 兩個市集日期重疊時，`useMarketStatsBatch([marketA, marketB])` 結果中：
   - `batchStats[marketA.id].totalRevenue` 不包含 marketB 的 dailyStats
   - `batchStats[marketB.id].totalRevenue` 不包含 marketA 的 dailyStats

---

## 五、Commit 切法

| # | 訊息 | 範圍 | 風險 |
|---:|---|---|---|
| 1 | `fix(ui): derive DailyRevenueStats total from dailyData.reduce` | 1 檔 | **零** |
| 2 | `test(ui): cover DailyRevenueStats total consistency` | 1 檔（測試） | **零** |
| 3 | `refactor(sync): extract resetProjectionFields helper` | 1 檔（純函式） | **低** |
| 4 | `test(sync): cover projection reset on hydration` | 1 檔（測試） | **零** |
| 5 | `fix(sync): reset market and product projection fields on cloud hydration` | 1 檔（hook） | **中** |
| 6 | `fix(sync): enable auto-repair for owner-full and owner-incremental contexts` | 1 檔（hook） | **中** |
| 7 | `test(sync): cover reconcile context-based dryRun` | 1 檔（測試） | **零** |
| 8 | `fix(hooks): add defensive marketId filter in useMarketStatsBatch` | 1 檔（hook） | **零** |

每個 commit 前：
- `npx tsc --noEmit` 通過
- `npm test` 通過
- `git diff --check` exit 0

**Phase 1 建議（修水水市集問題）**：commit 1+2（P0）
**Phase 2 建議（長期不再復發）**：commit 3+4+5+6+7（P1+P2）
**Phase 3 建議（防禦）**：commit 8（P3）

---

## 六、禁止事項

P0-P3 實作時**不要**：

- ❌ 不要修改 `lib/db/events.ts` 的 handler 邏輯（`+= totalAmount` 保留，這是 event sourcing 正當行為）
- ❌ 不要刪除任何事件
- ❌ 不要修改 Supabase schema / RLS
- ❌ 不要恢復 snapshot 功能
- ❌ 不要在 sync 中刪除 events
- ❌ 不要讓 reconciliation throw 導致登入失敗
- ❌ 不要對 staff view 做 destructive rebuild（P2 已守住此限制）

---

## 七、復發時的 debug 步驟

若 P0-P3 都修好但用戶回報「水水市集又污染」：

1. 確認 commit hash 與 pushed main 一致
2. 開啟 DevTools console，過濾 `[useSync] projection reconciliation`、`[hydration]`
3. 檢查雲端 `markets.total_revenue` 是否與本地 `db.markets.totalRevenue` 一致
4. 若雲端本身有污染 → 跑 `docs/CLOUD_DATA_CONSISTENCY_AUDIT.md` A 查詢
5. 若本地有 `local_events_incomplete` → 進 Recovery 頁「本機統計投影修復」
6. 若 P2 邏輯有 bug → 檢查 `reconcileSyncedProjectionMarkets` 的 `dryRun` 判斷

---

## 八、相關文件

- 上游分析：本對話中「收入倍增 / 雲端同步後 projection 重複累加」唯讀分析
- 整合入口：[`docs/CONVERGENCE_ARCHIVE.md`](./CONVERGENCE_ARCHIVE.md)
- 員工脫敏主軸：[`docs/OWNER_STAFF_REVENUE_HARDENING_PLAN.md`](./OWNER_STAFF_REVENUE_HARDENING_PLAN.md)（C2.30C/D、C2.31 已有脫敏三層，P1 屬於「雲端 → 本地補回脫敏」的延伸）
- 既有設計文件：
  - [`docs/SYNC_RECONCILIATION_DESIGN.md`](./SYNC_RECONCILIATION_DESIGN.md)（C2.18A/B 設計）
  - [`docs/OWNER_MARKET_HYDRATION_DESIGN.md`](./OWNER_MARKET_HYDRATION_DESIGN.md)（C3.3A 設計）
  - [`docs/MARKET_PROJECTION_CACHE_DESIGN.md`](./MARKET_PROJECTION_CACHE_DESIGN.md)（C2.16A 覆核）
- 既有測試：
  - `tests/sync-reconciliation.test.ts`
  - `tests/local-projection-repair.test.ts`
  - `tests/deal-closed-projection.test.ts`
  - `tests/owner-revenue-gap-repair.test.ts`
  - `tests/data-sanitization.test.ts`
  - `tests/event-handlers.test.ts`

---

## 九、附錄：本次發現的延伸議題

### 9.1 Stock 雙重扣減風險（**不在 P1 修，列為 P4**）

`deal_closed` handler 在 L831-839 對 `product.stock` 做 `currentStock - item.quantity`。
若雲端 `products.stock` 已被雲端 handler 扣過，本地 replay 同一個 event 又會扣一次。
**問題**：本地 `stock` 可能變負數（handler 有拋錯保護 L833-836）→ 拋出「庫存不足」錯誤。

**修法**（P4 候選）：
- 方案 A：staff view 不執行 `db.products.update(stock)`，只更新 `totalSold`
- 方案 B：先比對本地 events list 完整性，缺的不 replay
- 方案 C：在 `db.products` 寫入時不帶 stock，由本地 handler 從 0 開始維護

**目前未觀察到用戶回報**，留為後續 P4 議題。

### 9.2 `interaction_recorded` 也有類似問題（**不在本次修**）

`interaction_recorded` handler L707-709 對 `market.totalInteractions += 1`。
若雲端 `markets.total_interactions` 帶入本地，replay 同一個 event 又累加一次。

**P1 已涵蓋**：`batchHydrateMarkets` reset `totalInteractions = 0` 解決 owner 端。
**Staff 端**：`syncMarketsToIndexedDB` P1 修好後也 reset。
**`interaction_deleted` handler**（L928-929）扣 `Math.max(0, totalInteractions - 1)` —— 對稱行為，不會變 negative。
