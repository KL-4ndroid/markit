# Cloud-first Cache Boundary Audit

更新日期：2026-06-13
狀態：C3.1A 審查完成
目的：盤點目前哪些流程仍把 IndexedDB 當作長期真相資料庫，並定義最小改造順序。

## 一、審查範圍

檢查檔案：
- `hooks/useSync.ts`
- `lib/db/clear-user-data.ts`
- `lib/db/hooks.ts`
- `lib/db/index.ts`
- `lib/sync/*`
- `app/markets/page.tsx`
- `app/markets/[id]/page.tsx`
- `app/products/page.tsx`
- `app/recovery/page.tsx`
- `lib/supabase/auth-context.tsx`
- `hooks/useUserRole.ts`

---

## 二、流程審查總表

| 流程 | 檔案 | 目前是否依賴長期 IndexedDB | 身份切換風險 | Cloud-first 改造建議 | 優先級 |
|------|------|:------------------------:|:----------:|----------------------|:------:|
| Auth 被動登出 | `auth-context.tsx` | 部分：`clearAllData()` 全清 | 低（已正確清除） | 已符合 C3 要求，無需改 | — |
| Owner→Staff 身份切換 | `auth-context.tsx` | 是：`clearOtherUsersData()` 只清跨用戶殘留 | 中（只清別人、不清自己） | 見 C3.2 | P0 |
| 手動登出 | `auth-context.tsx` | 是：`clearAllData()` 全清 | 低 | 已符合 C3 | — |
| Role cache 清理 | `auth-context.tsx` + `useUserRole.ts` | 是：依賴 localStorage `user_role_cache` | 中（TTL=5min，舊角色殘留） | 見 C3.2 | P0 |
| Owner pull events | `useSync.ts` `pullIncrementalEvents` | 是：本地事件是 truth source for projection | 高（`existing` skip 後不重跑 handler） | 見 C3.3/C3.4 | P0 |
| Staff pull events | `useSync.ts` `pullEventsFromViews` | 是：本地事件 via view replay | 高（`existing` skip 不重跑 handler） | 見 C3.3 | P0 |
| Staff preflight | `lib/sync/staff-event-preflight.ts` | 否：僅檢查本機 market/product | 中（依賴 market 是否已寫入） | 見 C3.3 | P0 |
| Owner sync reconciliation | `lib/sync/projection-reconciliation.ts` | 是：Observation-only，已降級 | 低（不自動重建） | 見 C3.3 | P1 |
| Local projection repair | `lib/sync/local-projection-repair.ts` | 是：直接寫入 `db.dailyStats` / `db.markets` | 中 | 見 C3.3 | P1 |
| Owner revenue gap repair | `lib/sync/owner-revenue-gap-repair.ts` | 是：讀本地 events，修本地 projection | 高 | 見 C3.3/C3.4 | P0 |
| Owner missing market hydration | `useSync.ts` | 否：僅 fetch→write，無本地 truth 依賴 | 低 | 已符合 C3 | — |
| Market list | `app/markets/page.tsx` | 是：直接呼叫 `useMarkets()` → `db.markets` | 中 | 見 C3.5 | P1 |
| Market detail | `app/markets/[id]/page.tsx` | 是：直接呼叫 `useMarket()` + `getActiveDealEvents()` | 中 | 見 C3.5 | P1 |
| Products list | `app/products/page.tsx` | 是：直接呼叫 `useProducts()` → `db.products` | 中 | 見 C3.5 | P1 |
| Recovery 頁 | `app/recovery/page.tsx` | 是：直接讀 `db.events` / `db.dailyStats` | 低 | 維持（維修工具，非日常流程） | — |
| Active event service | `lib/db/event-tombstones.ts` | 是：`db.events` 是 truth source | 中 | 見 C3.5 | P1 |
| DailyStats 寫入 | `lib/db/events.ts` handler | 是：每次事件 replay 都寫入 | 中 | 見 C3.3 | P1 |
| DB init with profile | `app/markets/page.tsx` / `app/products/page.tsx` | 是：`initializeDatabaseSafely()` + `owner_full`/`staff_scoped` | 中 | 見 C3.2 | P0 |

---

## 三、七個關鍵問題回答

### Q1. 登入 / 登出 / 切換帳號目前是否清理 authenticated cache？

**部分正確。**

| 情境 | 目前行為 | 是否清理 | 符合 C3 |
|------|---------|:------:|:------:|
| 主動登出 | `clearAllData()` → 清所有表 + `localStorage` | ✅ | ✅ |
| 被動登出（token 過期） | `clearUserData('passive_signout')` → `clearAllData()` | ✅ | ✅ |
| Owner→Staff 身份切換 | `clearOtherUsersData(newUserId)` → 只清 `owner_id ≠ newUserId` 的資料 | ⚠️ 部分 | ❌ |
| Staff→Owner 身份切換 | 同上邏輯 | ⚠️ 部分 | ❌ |
| Same user refresh | 無清除 | ✅ | ✅ |

**核心缺口**：身份切換時，`clearOtherUsersData` 只清「別人的資料」，但新的 Staff 用戶可能同時有：
- 自己作為 Staff 看到的 owner 資料
- 自己之前作為 Owner 的殘留資料（如果用同一瀏覽器/裝置）
- `db.markets` 中尚未刪除的上一個 owner 的市場

### Q2. 哪些表應在 userId 或 roleMode 改變時清空？

| 表 | 改變時是否應清空 | 目前是否清空 |
|----|:---------------:|:-----------:|
| `db.markets` | ✅ 是（owner/scope 不同） | ⚠️ 只清別人，不清自己 |
| `db.products` | ✅ 是（owner/scope 不同） | ⚠️ 只清別人，不清自己 |
| `db.events` | ✅ 是（owner/scope 不同） | ⚠️ 只清別人，不清自己 |
| `db.dailyStats` | ✅ 是（依賴 market 存在） | ⚠️ 只清別人，不清自己 |
| `db.settings` | ❌ 否（跨身份保留） | ❌ 未清（正確） |
| `localStorage['user_role_cache']` | ✅ 是 | ⚠️ 只在登出/role change 清，TTL=5min |
| `localStorage['lastSyncAt']` | ✅ 是 | ⚠️ 只在登出清，切換帳號不清 |

### Q3. `settings.lastSyncAt` 是否應在 cache reset 時清除？

**是。** 目前只在 `clearUserData()` 中清除（登出時），但在 Owner→Staff 切換時**不清除**。

若 Staff 使用同一 `lastSyncAt` cursor 拉取，會拿到 Owner 的 sync 資料（Staff view 會過濾，但 cursor 污染）。

### Q4. Owner pull 是否可能先寫 events、但缺 markets？

**是潛在風險。** 現有 `pullIncrementalEvents` 寫入 `db.events` 後，event handler 嘗試讀取 `db.markets.get(market_id)`。若市場尚未寫入，handler 中的 `if (market)` 保護會讓 market stats 不更新。

目前 Staff preflight 已對 `deal_closed` / `deal_deleted` 加入 market 存在性檢查，但 Owner pull 沒有類似保護。

### Q5. Staff pull 是否仍可能留下上一身份資料？

**是。** `clearOtherUsersData` 邏輯：清除 `owner_id ≠ currentUserId` 的資料。Staff 的 `owner_id` 永遠是 staff 自己的 ID，不是 owner 的 ID。

因此：
- Staff 的 `db.markets` → owner 的市場（有 `owner_id = ownerId`）
- Staff 的 `db.products` → owner 的商品
- Staff 的 `db.events` → 來自 `staff_accessible_events` view

若 Staff 切換到另一個 owner（或切換回 Owner 角色），`clearOtherUsersData(currentUserId)` 會清除：
- `owner_id = oldOwnerId` 的 markets
- `owner_id = oldOwnerId` 的 products
- `actor_id = oldOwnerId` 的 events

但**不會**清除 Staff 自己創建的事件（如員工做的成交）。

### Q6. 哪些 UI 仍會把 stale local cache 當真相？

| 頁面 | 目前行為 | 風險 |
|------|---------|------|
| 市集列表 | `useMarkets()` → `db.markets`，全量讀取 | 中：舊資料殘留 |
| 市集詳情 | `useMarket()` + `getActiveDealEvents()` → `db.events` | 高：舊資料殘留 |
| 每日收入明細 | `useDateRangeStats()` → `db.dailyStats` | 高：projection stale |
| 成交記錄列表 | `getActiveDealEvents()` → `db.events` | 高：依賴本機 tombstone |
| 商品列表 | `useProducts()` → `db.products` | 中：舊資料殘留 |
| 分析頁 | `db.dailyStats` + `db.events` 混合 | 高：口徑不一致 |

### Q7. 最小 C3.2 實作應碰哪些檔案？

| 檔案 | 變更類型 | 說明 |
|------|---------|------|
| `lib/db/clear-user-data.ts` | 修改 | `clearOtherUsersData` 加入 `clearAllRoleBasedCache` 模式 |
| `lib/supabase/auth-context.tsx` | 修改 | 調用新的全域清理（見下節設計） |
| `hooks/useSync.ts` | 修改 | `pullIncrementalEvents` 前對 Owner 加 market preflight |
| `lib/db/hooks.ts` | 修改 | `useMarkets` / `useProducts` 對 Staff 加 ownerId filter |

---

## 四、最小 C3.2 設計

### 設計原則

身份改變時：
1. **Owner→Staff**：清 `db.markets/products/events/dailyStats`，觸發 Staff pull from view
2. **Staff→Owner**：清 `db.markets/products/events/dailyStats`，觸發 Owner pull from cloud
3. **不**清 `db.settings`（使用者偏好應保留）
4. **不**清 `localStorage` 通用設定（theme 等）
5. **清除** `localStorage['user_role_cache']` 和 `localStorage['lastSyncAt']`

### 最小改動：新增統一的 cache reset 函式

```ts
// lib/db/clear-user-data.ts

export type CacheResetScope = 
  | 'full'           // 清所有表（登出）
  | 'role_switch'    // 身份切換：清 markets/products/events/dailyStats
  | 'other_users'    // 清除別人的資料（現有邏輯）

export async function resetAuthenticatedCache(
  scope: CacheResetScope,
  options: { userId?: string; ownerId?: string } = {}
): Promise<void> {
  const {
    clearMarkets = true,
    clearProducts = true,
    clearEvents = true,
    clearStats = true,
  } = getScopeDefaults(scope);

  // 清表邏輯
  if (clearMarkets) await db.markets.clear();
  if (clearProducts) await db.products.clear();
  if (clearEvents) await db.events.clear();
  if (clearStats) await db.dailyStats.clear();

  // 清 sync 相關 localStorage
  if (scope === 'role_switch' || scope === 'full') {
    localStorage.removeItem('user_role_cache');
    localStorage.removeItem('lastSyncAt');
    localStorage.removeItem('hasCompletedInitialSync');
  }

  // 不清 db.settings
}
```

### Auth context 接入點

```tsx
// lib/supabase/auth-context.tsx

// SIGNED_IN + userId changed
if (previousUserId && newUserId && previousUserId !== newUserId) {
  // 新增：身份切換時，清除所有 authenticated cache
  await resetAuthenticatedCache('role_switch', { userId: newUserId });
}

// 不再用 clearOtherUsersData
```

---

## 五、最小 C3.3 設計

### Owner Pull 加 Market Preflight

```ts
// hooks/useSync.ts

// pullIncrementalEvents 中，寫入 event 前檢查 market 是否存在
async function ensureMarketExistsForEvent(event: Event) {
  const marketId = getEventMarketId(event);
  if (!marketId) return;

  const exists = await db.markets.get(marketId);
  if (!exists) {
    // fetch from cloud and write first
    const { data } = await supabase.from('markets').select('*').eq('id', marketId).single();
    if (data) {
      const mapped = marketRowToLocal(data);
      await db.markets.put({ ...mapped, id: marketId });
    }
  }
}
```

---

## 六、絕對禁止事項（維持現狀）

- ❌ 不要刪除 `db.events` 中的任何事件
- ❌ 不要直接刪除雲端資料
- ❌ 不要恢復 snapshot sync / auto-create / manual create
- ❌ 不要把 `owner_full` integrity missing market 降級成 warning
- ❌ 不要一次重構整個 `useSync.ts`
- ❌ 不要刪除 `db/settings`

---

## 七、建議後續任務順序

| 優先 | 任務 | 預估風險 | 預估複雜度 |
|:----:|------|:-------:|:---------:|
| P0 | **C3.2A** Login/Role Switch Cache Reset 實作 | 中 | 小 |
| P0 | **C3.3A** Owner Missing Market Hydration 實作 | 中 | 小 |
| P1 | **C3.5A** UI View Model 接入（Market Detail） | 中 | 中 |
| P2 | **C3.4** Cloud Summary View Model | 高 | 中 |

### C3.2A 和 C3.3A 的先後關係

C3.2A（cache reset）和 C3.3A（missing market hydration）是**獨立的**，可以並行實作或按順序執行。

建議：**C3.2A 先**，因為身份切換導致的 stale data 是更高頻的觸發場景。C3.3A 作為 Owner pull 的安全網。

---

## 八、C3.1A 審查結論

### 已符合 C3 原則的流程
1. 被動登出清除 cache ✅
2. 主動登出清除 cache ✅
3. `db.settings` 跨身份保留 ✅
4. `useSync.ts` 中 Staff 不使用 `lastSyncAt` ✅
5. Snapshot 功能已暫停 ✅

### 需要改造的高風險流程
1. **身份切換 cache reset 不完整**（只清別人、不清自己）
2. **Owner pull 可能缺 market**
3. **Staff pull 的 `existing` event skip 不補足 tombstone key**（已由 C2.13A Fix B.2 部分修復）

### 可維持現狀的流程
1. Recovery 頁（維修工具，非日常流程）
2. DB init 搭配 `owner_full` / `staff_scoped` profile
3. Auth 被動/主動登出 cache 清除
