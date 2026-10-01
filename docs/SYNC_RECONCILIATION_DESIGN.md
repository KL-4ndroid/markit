> **⚠️ ARCHIVED 2026-06-14**
> 本文件為 C2.18A/B 設計定稿，**內容凍結**。
> 單一權威入口已遷移至 [`docs/CONVERGENCE_ARCHIVE.md`](./CONVERGENCE_ARCHIVE.md) §2。
> `projection-reconciliation.ts` 已整合至 `useSync.ts`（observation-only 模式），詳見該檔。
> 禁止直接編輯本檔（僅可修 ARCHIVED 標記）。

# Sync 後 Projection Reconciliation 設計



更新日期：2026-06-13

階段：C2.18A / C2.18B

狀態：✅ 設計覆核完成。`lib/sync/projection-reconciliation.ts` 已實作並整合至 `useSync.ts`。Observation-only dry-run 模式已啟用。



## 一、設計目的



同步流程目前會把雲端事件匯入本機 IndexedDB，並透過 event handlers 更新 `markets` / `dailyStats` projection。但實務上已出現以下問題：



- snapshot 內已有 projection，後續 events replay 又累加，造成收入變 2 倍或 3 倍。

- 本機修復 projection 後，下一次 sync 又因 replay 或 stale snapshot 讓數據復發。

- Staff sync 如果 event 已存在會 skip，不重跑 handler；若第一次 handler 失敗，projection 可能永久 stale。

- `deal_deleted` tombstone 已存在，但 `dailyStats` / `market.totalRevenue` 未扣除。



C2.18 的目標是在 sync 完成後，針對「這次同步受影響的 market ids」做 projection comparison，必要時重建本機 projection。



## 二、核心原則



1. 不全量掃描所有 markets。

2. 只針對 touched market ids。

3. Reconciliation 只修本機 projection：

   - `market.totalRevenue`

   - `market.totalDeals`

   - `market.totalInteractions`

   - `dailyStats`

4. 不新增 events。

5. 不刪除 events。

6. 不修改雲端。

7. 不修改商品庫存。

8. Reconciliation 失敗不應讓登入或同步卡死，但需要明確 log。



## 三、已存在可用基礎



目前已有：



- `lib/events/active-event-service.ts`

  - 統一 active deal / interaction 讀取。

  - 套用 `deal_deleted` / `interaction_deleted` tombstone。



- `lib/projections/market-projection-service.ts`

  - `compareMarketProjectionWithEvents(marketId)`

  - `rebuildMarketStatsFromEvents(marketId, { dryRun })`

  - `repairMarketProjectionsFromEvents(options)`



- `lib/sync/projection-reconciliation.ts`（**已實作，C2.18A → C2.18B 完成**）

  - `reconcileTouchedMarketProjections(marketIds, options)` — 核心 reconciliation helper

  - `collectProjectionMarketId(marketIds, event)` — 從事件收集受影響 market ids

  - 支援 context: `owner-full` | `owner-incremental` | `staff-view` | `snapshot` | `manual`

  - 支援 `dryRun: true` observation-only 模式（目前 sync reconciliation 使用此模式）

  - 單一 market rebuild 失敗不 throw，不阻斷 sync 完成



因此 C2.18 不需要重新計算 projection，只需要在 sync 後收集 market ids 並呼叫 projection service。



## 四、需要接入的 sync 路徑



| 路徑 | 函式 | 角色 | reconciliation 接入 | 說明 |

|---|---|---|:---:|---|

| Owner 全量 / 增量事件同步 | `pullAllEvents` | Owner | ✅ 已接入（observation-only） | 匯入 cloud events 後 dry-run check |

| Owner snapshot 後增量 | `pullIncrementalEvents` | Owner | ✅ 已接入（observation-only） | snapshot projection + 增量 reconciliation |

| Staff view 同步 | `syncEventsToIndexedDB` | Staff | ✅ 已接入（observation-only） | Staff 全量拉 view reconciliation |

| Snapshot load | `loadSnapshot` | Owner | ❌ 未接入 | snapshot 直接覆寫 projection tables，暫不自動修 |

| Push local events | `pushEvents` | Owner / Staff | ❌ 不需要 | push 時本機 handler 已執行，projection 已更新 |



## 五、Touched Market Id 收集策略



### 1. 從事件收集



每次處理 event 時收集：



```ts

const marketId = getEventMarketId(localEvent);

if (marketId) touchedMarketIds.add(marketId);

```



應收集的事件類型：



- `deal_closed`

- `deal_deleted`

- `interaction_recorded`

- `interaction_deleted`

- `market_updated`

- `market_status_changed`

- `market_deleted`



第一版可只針對會影響統計 projection 的事件：



- `deal_closed`

- `deal_deleted`

- `interaction_recorded`

- `interaction_deleted`



### 2. Existing event 也要收集



Staff sync 現在有重要風險：



```ts

const existing = await db.events.get(event.id);

if (existing) {

  skippedCount++;

  continue;

}

```



若 existing event 是 `deal_deleted`，但之前 handler 失敗，projection 可能未扣除。

因此即使 event 已存在，也應把其 `marketId` 加入 touched set。



建議：



```ts

const localEvent = createCanonicalSyncedEvent(event);

const marketId = getEventMarketId(localEvent);

if (marketId && isProjectionEvent(localEvent.type)) {

  touchedMarketIds.add(marketId);

}



const existing = await db.events.get(event.id);

if (existing) {

  skippedCount++;

  continue;

}

```



### 3. Snapshot load 後收集



Snapshot 本身沒有單一 event list replay，但有 markets / dailyStats tables。

第一版可收集 snapshot 裡所有 market ids：



```ts

for (const market of snapshot.tables.markets) {

  if (market.id) touchedMarketIds.add(market.id);

}

```



若成本過高，可先只在 snapshot load 後讓 Recovery 提醒，不自動修。



## 六、Reconciliation 函式設計



建議新增在 `hooks/useSync.ts` 或獨立 service：



```ts

async function reconcileTouchedMarketProjections(

  marketIds: Iterable<string>,

  context: 'owner-full' | 'owner-incremental' | 'staff-view' | 'snapshot'

): Promise<void>

```



內部流程：



```ts

const uniqueMarketIds = Array.from(new Set(marketIds)).filter(Boolean);



for (const marketId of uniqueMarketIds) {

  try {

    const comparison = await compareMarketProjectionWithEvents(marketId);



    if (comparison.status === 'inflated') {

      await rebuildMarketStatsFromEvents(marketId, { dryRun: false });

      console.warn('[sync reconciliation] rebuilt inflated projection', { marketId, context });

      continue;

    }



    if (comparison.status === 'consistent') continue;



    console.warn('[sync reconciliation] skipped projection mismatch', {

      marketId,

      context,

      status: comparison.status,

    });

  } catch (error) {

    console.error('[sync reconciliation] failed', { marketId, context, error });

  }

}

```



## 七、哪些狀態可以自動修



| status | 是否自動修 | 原因 |

|---|---:|---|

| `consistent` | 否 | 已一致 |

| `inflated` | 是 | 本機 projection 高於 active events，通常是重複 replay，可安全重建 |

| `lower_than_events` | 第一版否 | 本機低於 events，可能是缺 replay 或權限視角差異，需更謹慎 |

| `different` | 第一版否 | 混合差異，需人工或 recovery 處理 |

| `missing_or_no_events` | 否 | 沒本機 market 或無事件，不能推斷 |



第一版只自動修 `inflated`，這最符合目前「收入重複累加」的問題。



## 八、Owner Sync 接入點



### pullAllEvents



目前會：



1. 從 Supabase events 拉資料。

2. canonicalize。

3. `db.events.add(localEvent)`。

4. handler replay。

5. update lastSyncAt。



建議：



- 在事件 loop 中收集 touched market ids。

- existing event skip 也收集。

- loop 結束後呼叫 reconciliation。



Pseudo:



```ts

const touchedMarketIds = new Set<string>();



for (const event of eventsToProcess) {

  const localEvent = createCanonicalSyncedEvent(event);

  addProjectionTouchedMarket(touchedMarketIds, localEvent);

  ...

}



await reconcileTouchedMarketProjections(touchedMarketIds, 'owner-full');

```



### pullIncrementalEvents



同 `pullAllEvents`。

注意 snapshot incremental currently uses `timestamp > snapshotAt` 避免 snapshot-covered events 被重播，這個策略不要改。



## 九、Staff Sync 接入點



### syncEventsToIndexedDB



這是最重要接入點。



建議調整：



```ts

const touchedMarketIds = new Set<string>();



for (const event of sanitizedEvents) {

  const localEvent = createCanonicalSyncedEvent(event);

  addProjectionTouchedMarket(touchedMarketIds, localEvent);



  const existing = await db.events.get(event.id);

  if (existing) {

    skippedCount++;

    continue;

  }



  ...

}



await reconcileTouchedMarketProjections(touchedMarketIds, 'staff-view');

```



原因：



- Staff 常見問題是 tombstone 已存在但 projection 未扣除。

- existing skip 仍需要加入 touched set。



## 十、錯誤處理



Reconciliation 不應 throw 到外層造成 sync 失敗。



建議：



- 單一 market 失敗，只 log error。

- 所有 market 失敗，不阻斷 sync 完成。

- 可累積 warnings，未來顯示於 `/recovery`。



## 十一、測試策略



### Service 層測試



已有：



- `tests/market-projection-service.test.ts`

- `tests/local-projection-repair.test.ts`



需要新增：



```text

tests/sync-reconciliation.test.ts

```



建議測：



1. `inflated` market 會呼叫 rebuild。

2. `consistent` market 不 rebuild。

3. `lower_than_events` 第一版不 rebuild。

4. 單一 market rebuild 失敗不會 throw。

5. duplicate market ids 只處理一次。



### useSync 整合測試



第一版不強求。

`useSync.ts` 依賴 Supabase / Dexie / dynamic imports，mock 成本較高。可先測獨立 reconciliation helper。



## 十二、建議實作拆分



### Commit 1：新增 reconciliation helper



檔案：



- `lib/sync/projection-reconciliation.ts`

- `tests/sync-reconciliation.test.ts`



不碰 `hooks/useSync.ts`。



Commit:



```text

refactor(sync): add projection reconciliation helper

```



### Commit 2：Owner sync 接入



檔案：



- `hooks/useSync.ts`



Commit:



```text

fix(sync): reconcile owner market projections after pull

```



### Commit 3：Staff sync 接入



檔案：



- `hooks/useSync.ts`



Commit:



```text

fix(sync): reconcile staff market projections after view sync

```



## 十三、禁止事項



實作 C2.18 時不要：



- 不要修改 Supabase schema / RLS / view。

- 不要修改 `created_at` cursor 策略。

- 不要改 snapshot incremental 的 `timestamp > snapshotAt` 防重播邏輯。

- 不要全量 rebuild 所有 markets。

- 不要在 sync 中刪除 events。

- 不要讓 reconciliation throw 導致登入失敗。



## 十四、C2.18A 覆核結論（2026-06-13）



**現狀：** `lib/sync/projection-reconciliation.ts` 已實作並整合至 `useSync.ts`。所有 sync 路徑（owner-full / owner-incremental / staff-view）均已接入 reconciliation，但均使用 `dryRun: true` observation-only 模式。



**Observation-only 理由：**

snapshot 內已有 projection，後續 events replay 又累加，造成收入變 2 倍或 3 倍。本機修復 projection 後，下一次 sync 又因 replay 或 stale snapshot 讓數據復發。因此第一版只 observation，不自動修。



**何時可升級為 auto-repair：**

- 能證明特定 market 的本機 events 完整性（例如有完整 event history、無 snapshot 覆寫風險）。

- staff sync existing-event skip 場景的 tombstone handler replay 已穩定。



**Snapshot load 未接入：**

snapshot 會直接覆寫 `markets` / `dailyStats` tables，reconciliation 應在 snapshot load 之後執行。但 snapshot load 目前繞過 event store，直接寫 projection，reconciliation 接入會複雜。建議由 Recovery 頁手動引導修復。
