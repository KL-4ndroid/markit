# C3.3A Owner Missing Market Hydration 設計

更新日期：2026-06-13
任務類型：純分析 / 設計
狀態：設計完成，待使用者確認後實作

## 一、現況分析

### 現有 Owner Pull 流程

`hooks/useSync.ts` 的 `pullAllEvents` 函式：

```ts
// 1. 從 Supabase 查詢新事件（用 market_id 過濾）
const marketIds = await getOwnerAccessibleMarketIds(userId);
let query = supabase.from('events').select('*').or(
  `market_id.in.(${marketIds.join(',')}),and(actor_id.in.(${teamMemberIds.join(',')}),market_id.is.null)`
);

// 2. 寫入本地 db.events
await db.events.add(localEvent);

// 3. Replay handler（假設 market 已存在）
const processedPayload = normalizeEventPayloadForLocal(localEvent.payload);
await handler({ /* event */ } as Event, db);

// 4. Reconciliation
await reconcileSyncedProjectionMarkets(touchedMarketIds, 'owner-full');
```

### 缺口：事件先於市場寫入

`marketIds` 從 Supabase 查得，`events` 從 Supabase 查得，但 `db.markets` 是本地 IndexedDB。

若三件事同時發生：
1. 用戶 A 建立了市場（`market_created` event）
2. 用戶 B 加入了該市場（`market_members` 表更新）
3. 用戶 B 的瀏覽器同步——**查詢時市場可見，但本地 IndexedDB `db.markets` 仍是空的**

此時：
- `getOwnerAccessibleMarketIds(userId)` 返回該市場 ID ✅
- 事件查詢會返回 `market_created` 和後續事件 ✅
- `db.events.add()` 成功寫入 ✅
- `handler({ type: 'deal_closed' })` 執行時，`db.markets.get(marketId)` **返回 `undefined`** ❌

### Handler 失敗的實際影響

`lib/db/events.ts` 的 handler 失敗時：

```ts:hooks/useSync.ts (行 1026-1034)
} catch (error: any) {
  if (error.name === 'ConstraintError') {
    continue;
  }
  console.error(`❌ 重放事件失敗: ${event.type}`, error);
  // 繼續處理下一個事件，不中斷同步
  continue;
}
```

- 寫入 `db.events`（成功）✅
- Replay handler（失敗）→ `continue` → 跳過
- 下一個事件繼續處理 ✅

**後果**：用戶看到事件存在（成交記錄有），但 `dailyStats` 和 `market.totalRevenue` 沒有更新，因為 handler 執行失敗。

### 現有 C3.1A 審查結論

`docs/CLOUD_FIRST_CACHE_AUDIT.md` 行 38 的評估：

> | Owner missing market hydration | `useSync.ts` | 否：僅 fetch→write，無本地 truth 依賴 | 低 | 已符合 C3 | — |

**此評估需要修正**。`fetch→write` 是對的，但 **replay handler 的 handler 執行依賴 market 存在**，這是真正的缺口。

---

## 二、Root Cause

### 根本原因：寫入時序

Cloud-first 架構下，`pullAllEvents` 的邏輯是：

```
Cloud events (via Supabase)
  ↓ (marketIds from Supabase)
Filter events by marketId
  ↓ (event.id check)
db.events.add()
  ↓ (replay handler)
db.markets.get(marketId) ← 假設已存在
  ↓ (fails if missing)
handler skips, continue
```

問題：**`db.markets` 是 local cache，不是 Cloud canonical source**。若本地從未同步過該市場（首次登入、跨設備登入、cache reset 後），market 尚未寫入本地，handler 就會失敗。

### 為何 `market_created` handler 也可能失敗

`market_created` handler：

```ts
// lib/db/events.ts
case 'market_created': {
  // 寫入 db.markets
  await db.markets.put({ id, name, location, /* ... */ });
  break;
}
```

`market_created` 本身寫入自己的 market，不依賴現有市場存在。但若同步並發：
- `market_created` 先被 replay（寫入 `db.markets`）
- `deal_closed` 跟著被 replay（依賴 `db.markets`）
- **時序正確** ✅

真正危險的是 `deal_closed` 等事件在 `market_created` **之前**被處理，或 `market_created` handler 先前執行失敗。

### 現有 `reconcileSyncedProjectionMarkets` 是否能補救？

```ts
// hooks/useSync.ts 行 1041
await reconcileSyncedProjectionMarkets(touchedMarketIds, 'owner-full');
```

`reconcileSyncedProjectionMarkets` 內部呼叫 `rebuildMarketStatsFromEvents(marketId, { dryRun: false })`，該函式同樣依賴 `db.markets.get(marketId)`。若市場從未寫入，修復也會失敗。

---

## 三、設計方案

### 核心原則

在 replay handler 之前，確保事件依賴的 market 已寫入本地 cache。

### 方案 A（最小）：Event Replay 前置 Hydration

在 `pullAllEvents` 的 event replay 迴圈中，每個事件 replay 前，先確保 market 已寫入。

```ts
// hooks/useSync.ts
async function ensureMarketHydrated(marketId: string): Promise<void> {
  const exists = await db.markets.get(marketId);
  if (exists) return;

  // 從 Cloud 補寫
  const { data: market } = await supabase
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (!market) {
    // Market 已刪除，不補寫（但記錄 warning）
    console.warn(`[hydration] Market ${marketId} not found in Cloud, skipping`);
    return;
  }

  const localMarket = marketRowToLocal(market);
  await db.markets.put(localMarket);
  console.log(`[hydration] Hydrated market ${marketId}`);
}
```

在 replay loop 中呼叫：

```ts
for (const event of eventsToProcess) {
  // 先確保 market 已寫入
  const marketId = getEventMarketId(event);
  if (marketId) {
    await ensureMarketHydrated(marketId);
  }

  // 再 replay handler
  await db.events.add(localEvent);
  const handler = eventHandlers[event.type];
  if (handler) {
    const processedPayload = normalizeEventPayloadForLocal(event.payload);
    await handler({ /* event */ } as Event, db);
  }
}
```

**優點**：
- 最小改動，只改 `useSync.ts` 一個檔案
- 非阻塞，失敗時優雅降級（warning log，繼續處理）

**缺點**：
- 每個事件都檢查 market，可能有多餘查詢（可加 batch 優化）

### 方案 B（推薦）：Batch Hydration + 錯誤分類

先批次收集所有需要的 market IDs，一次從 Cloud 查詢，再批次寫入，最後 replay handlers。

```ts
async function batchHydrateMarkets(marketIds: Set<string>): Promise<{
  hydrated: Set<string>;
  missing: Set<string>;
  failed: Set<string>;
}> {
  const hydrated = new Set<string>();
  const missing = new Set<string>();
  const failed = new Set<string>();

  const toFetch = [...marketIds];
  if (toFetch.length === 0) return { hydrated, missing, failed };

  const { data: markets, error } = await supabase
    .from('markets')
    .select('*')
    .in('id', toFetch);

  if (error) {
    console.error('[hydration] Failed to fetch markets:', error);
    for (const id of marketIds) failed.add(id);
    return { hydrated, missing, failed };
  }

  const foundIds = new Set<string>();
  if (markets) {
    for (const market of markets) {
      foundIds.add(market.id);
      const localMarket = marketRowToLocal(market);
      await db.markets.put(localMarket);
      hydrated.add(market.id);
    }
  }

  for (const id of marketIds) {
    if (!foundIds.has(id)) missing.add(id);
  }

  if (missing.size > 0) {
    console.warn(`[hydration] Markets not found in Cloud: ${[...missing].join(', ')}`);
  }

  return { hydrated, missing, failed };
}
```

在 `pullAllEvents` 中呼叫：

```ts
// 先批次 hydration（只針對尚未寫入的 markets）
const touchedMarketIds = new Set<string>();
for (const event of eventsToProcess) {
  collectProjectionMarketId(touchedMarketIds, event);
}

const { hydrated, missing } = await batchHydrateMarkets(touchedMarketIds);

// 標記缺失市場中的事件為 hydration-missing，handler 失敗不影響同步進度
const skippedByHydration: any[] = [];
for (const event of eventsToProcess) {
  const marketId = getEventMarketId(event);
  if (marketId && missing.has(marketId)) {
    skippedByHydration.push(event);
  }
}

// 過濾掉 hydration-missing 事件後再 replay
const replayableEvents = eventsToProcess.filter(
  e => !skippedByHydration.includes(e)
);

// Replay loop 保持不變（market 已 hydration）
```

**優點**：
- 一次網路往返完成所有 market hydration
- 分離 concerns：hydration → filtering → replay
- 明確區分「Cloud 找不到的市場」和「本地尚未寫入的市場」

**缺點**：
- 需要多一次 Supabase 查詢（但市場表通常很小）

### 方案 C（過度設計）：Hydration-as-event-source

將 market hydration 視為事件同步的前置條件。若市場不在本地，先完整同步該市場的 `market_created` → 寫入 `db.markets` → 再同步其他事件。

**過度複雜**，不推薦。

---

## 四、選擇方案

**推薦方案 B（Batch Hydration + 錯誤分類）**。

理由：
1. 最小網路開銷（一次查詢取代每事件檢查）
2. 明確區分 missing（Cloud 找不到）和 hydrated（已寫入）
3. 不改 handler 邏輯，只改 sync 流程
4. 錯誤隔離：hydration 失敗不阻斷同步，但會留下 warning

---

## 五、實作細節

### 修改檔案

- `hooks/useSync.ts`：新增 `batchHydrateMarkets` + 在 `pullAllEvents` 的 replay loop 前呼叫

### 函式簽名

```ts
async function batchHydrateMarkets(
  marketIds: Set<string>
): Promise<{
  hydrated: Set<string>;  // 成功寫入的市場
  missing: Set<string>;   // Cloud 找不到的市場（已刪除或無權限）
  failed: Set<string>;    // 查詢失敗的市場
}>;
```

### 現有函式複用

- `marketRowToLocal`：從 Cloud `markets` row 轉換為本地 `Market` 格式
- `getEventMarketId`：從 event 提取 market ID
- `collectProjectionMarketId`：現有用於 reconciliation 的函式

### 不修改的範圍

- `lib/db/events.ts` handlers — 不改
- `lib/sync/projection-reconciliation.ts` — 不改
- `lib/db/integrity.ts` — 不改（`owner_full` integrity 保持不變）
- Supabase schema / RLS — 不改

### 錯誤處理策略

| 情境 | 行為 |
|------|------|
| Market 在 Cloud 存在 | 寫入 `db.markets`，繼續 |
| Market 在 Cloud 不存在 | 記 warning，該 market 相關事件跳過 replay |
| Supabase 查詢失敗 | 記 error，該 market 相關事件跳過 replay |
| Market 已寫入本地 | 跳過，直接繼續 |

---

## 六、測試清單

1. **首次登入 Owner**：驗證所有市場的 `market_created` 先於 `deal_closed` 被 hydration
2. **Market 已存在本地**：驗證 hydration 跳過
3. **Market 在 Cloud 不存在**：驗證 warning 記錄，相關事件跳過
4. **並發 sync**：驗證 hydration 和 replay 的順序正確
5. **跨設備登入**：驗證新設備上所有市場被正確 hydration

---

## 七、建議 commit 切法

```text
feat(sync): add batch market hydration before owner event replay
test(sync): cover market hydration edge cases
```
