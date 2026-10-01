# Staff Data Flow Audit

更新日期：2026-06-12

目的：確認 Staff 從 Supabase 讀取資料、寫入 IndexedDB、套用 sanitizer、重放 event handler、以及 sync 後 reconciliation 的資料流，不會漏掉刪除 tombstone 或破壞 replay 必要欄位。

## 目前結論

| 項目 | 狀態 | 說明 |
|---|---|---|
| Staff sanitizer 保留 `deal_deleted` replay 必要欄位 | 通過 | `tests/data-sanitization.test.ts` 已覆蓋 camelCase / snake_case tombstone payload |
| Staff sanitizer 保留 `interaction_deleted` replay 必要欄位 | 通過 | `eventId` / `event_id` / `marketId` / `market_id` 均保留 |
| Staff sanitizer 移除成本敏感欄位 | 通過 | `totalCost` / `total_cost` 被移除，`totalAmount` / `total_amount` 保留 |
| `npm test` 是否執行 sanitizer 測試 | 通過 | `package.json` 已把 `tests/data-sanitization.test.ts` 接回 test script |
| Staff sync 後 projection reconciliation | 通過 | `syncEventsToIndexedDB()` 後呼叫 `reconcileSyncedProjectionMarkets(touchedMarketIds, 'staff-view')` |
| Repo 內 latest `staff_accessible_events` view 是否使用 `e.*` | 通過 | `supabase/migrations/030_fix_data_isolation.sql` 中 view 使用 `SELECT e.*`，未依 type 過濾 |
| 線上 Supabase view 是否與 repo 定義一致 | 待確認 | 需用下方唯讀 SQL 在 Supabase SQL Editor 驗證 |

## Repo 定義審查

目前 repo 內最後一次重建 `staff_accessible_events` 的 migration 是：

```text
supabase/migrations/030_fix_data_isolation.sql
```

關鍵定義：

```sql
CREATE OR REPLACE VIEW staff_accessible_events AS
SELECT
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
...
```

這代表：

- `e.*` 會保留 `id`、`type`、`payload`、`actor_id`、`market_id`、`timestamp`、`metadata`、`created_at` 等事件欄位。
- 沒有 `WHERE e.type IN (...)` 或 `WHERE e.type NOT IN (...)`，因此不應排除 `deal_deleted` / `interaction_deleted`。
- `market_id` 來自 `events.market_id`，只要 cloud event 寫入時有 `market_id`，view 會保留。

## 仍可能發生的風險

### 1. 線上 view 與 repo migration 不一致

過去曾多次手動套用 SQL，因此 repo 內 migration 不是 100% 等於線上資料庫狀態。必須直接查線上 view definition。

### 2. Cloud tombstone event 本身缺 `market_id`

即使 view 使用 `e.*`，如果 `events.market_id` 為 null，Staff view 的第一段 market join 不會抓到該事件。`deal_deleted` / `interaction_deleted` 必須有 root `market_id`，不能只藏在 payload 裡。

### 3. Staff 被 revoke 後 view 行為不同步

view 依賴 `staff_relationships.status = 'active'`。若 revoke 只清 `market_members`，但 `staff_relationships` 狀態未更新，Staff 仍可能透過 view 看到資料。

### 4. Existing event skip 造成 projection stale

Staff sync 遇到已存在 event 會 skip handler。這已透過 sync 後 reconciliation 緩解，但仍需要瀏覽器 smoke test 確認：

- Owner 補登成交。
- Staff 同步後可見。
- Owner 刪除該補登。
- Staff 同步後成交消失，dailyStats / market totals 扣除。

## Supabase 唯讀驗證 SQL

以下 SQL 只讀，不會修改 Supabase。

### A. 檢查線上 view definition

```sql
SELECT pg_get_viewdef('public.staff_accessible_events'::regclass, true) AS view_definition;
```

確認結果應包含：

- `SELECT e.id`
或 `SELECT e.*`
- `e.type`
- `e.payload`
- `e.market_id`
- `sr.status = 'active'`

確認結果不應包含：

- `WHERE e.type IN (...)` 且清單漏掉 `deal_deleted` / `interaction_deleted`
- `WHERE e.type NOT IN ('deal_deleted', 'interaction_deleted')`

### B. 檢查 tombstone event 是否有 root market_id

```sql
SELECT
  type,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE market_id IS NULL) AS missing_root_market_id
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;
```

期望：

- `missing_root_market_id = 0`

若不為 0，代表 Staff view 可能漏拉 tombstone。

### C. 列出缺 root market_id 的 tombstone

```sql
SELECT
  id,
  type,
  market_id,
  payload->>'marketId' AS payload_market_id_camel,
  payload->>'market_id' AS payload_market_id_snake,
  payload->>'eventId' AS payload_event_id_camel,
  payload->>'event_id' AS payload_event_id_snake,
  timestamp,
  created_at
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
  AND market_id IS NULL
ORDER BY created_at DESC NULLS LAST, timestamp DESC
LIMIT 50;
```

如果有結果，下一步才評估 migration 或資料修補。不要直接更新。

### D. 用特定 owner / staff 驗證 view join 會抓到 tombstone

把 `<OWNER_ID>` 與 `<STAFF_ID>` 換成實際 UUID。

```sql
SELECT
  e.type,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE e.market_id IS NULL) AS missing_root_market_id
FROM public.events e
JOIN public.market_members mm ON mm.market_id = e.market_id
JOIN public.staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.owner_id = '<OWNER_ID>'
  AND sr.staff_id = '<STAFF_ID>'
  AND sr.status = 'active'
  AND e.type IN ('deal_closed', 'deal_deleted', 'interaction_recorded', 'interaction_deleted')
GROUP BY e.type
ORDER BY e.type;
```

期望：

- 若 owner 曾刪除成交，應看到 `deal_deleted`。
- 若 owner 曾刪除互動，應看到 `interaction_deleted`。
- `missing_root_market_id` 應為 0。

### E. 檢查 Staff view 實際輸出是否包含 tombstone

Supabase SQL Editor 中 `auth.uid()` 通常為 null，因此直接查 view 不一定能模擬登入中的 staff。若要透過 SQL 模擬，優先使用 D 的 join 查詢。若在前端 staff session 中查，則可用：

```ts
const { data, error } = await supabase
  .from('staff_accessible_events')
  .select('id,type,market_id,payload,timestamp,created_at')
  .in('type', ['deal_deleted', 'interaction_deleted'])
  .order('created_at', { ascending: false })
  .limit(50);
console.table(data);
console.error(error);
```

期望：

- Staff 看得到授權 owner 的 tombstone。
- 每筆 tombstone 都有 `market_id`。

## 下一步建議

1. 先跑 A、B。
2. 若 B 顯示缺 root `market_id`，先輸出 C 給 AI 分析，不要直接修。
3. 若 B 正常，再用 D 驗證指定 owner/staff pair 是否會透過 join 看到 tombstone。
4. 若 D 正常，但前端 Staff 仍看不到刪除效果，問題較可能在前端 sync/replay/reconciliation，而不是 Supabase view。
5. 若 D 漏掉 `deal_deleted` / `interaction_deleted`，再設計 migration 修正 `staff_accessible_events`，但需獨立審查，不要混入本機資料修復。

