# Cloud Data Consistency Audit

更新日期：2026-06-12

目的：用唯讀 SQL 判斷 Supabase 雲端資料是否仍有 projection 污染，尤其是：

- `markets.total_revenue` / `markets.total_deals` 是否與 active `deal_closed` events 不一致。
- `deal_deleted` tombstone 是否完整存在且能扣除目標成交。
- `snapshots.data` 是否仍帶有舊的錯誤 projection。
- `staff_accessible_events` 是否漏 tombstone。

本文件只提供診斷，不提供直接修復 SQL。若查詢發現異常，應先回報結果，再設計獨立 migration 或資料修復流程。

## 使用原則

1. 只執行 `SELECT`。
2. 不直接 `UPDATE` / `DELETE` / `INSERT`。
3. 不用市集日期 cutoff 猜測異常。
4. 先用 events/tombstones 算出 active revenue，再與 projection 對帳。
5. snapshots 若污染，優先刪除或重建 snapshot，而不是修改 events。

## A. Cloud markets vs active deal events

這段查詢把 `deal_deleted` 當作 tombstone，排除已刪除的 `deal_closed`，再對比 `markets.total_revenue` / `markets.total_deals`。

```sql
WITH deal_closed AS (
  SELECT
    e.id,
    e.market_id,
    e.timestamp,
    e.created_at,
    e.payload,
    COALESCE(
      NULLIF(e.payload->>'manualRevenue', '')::numeric,
      NULLIF(e.payload->>'manual_revenue', '')::numeric,
      NULLIF(e.payload->>'totalAmount', '')::numeric,
      NULLIF(e.payload->>'total_amount', '')::numeric,
      0
    ) AS revenue,
    COALESCE(
      NULLIF(e.payload->>'manualDealCount', '')::integer,
      NULLIF(e.payload->>'manual_deal_count', '')::integer,
      NULLIF(e.payload->>'dealCount', '')::integer,
      NULLIF(e.payload->>'deal_count', '')::integer,
      1
    ) AS deal_count
  FROM public.events e
  WHERE e.type = 'deal_closed'
),
deal_deleted AS (
  SELECT
    COALESCE(payload->>'eventId', payload->>'event_id') AS target_event_id,
    market_id,
    id AS tombstone_id,
    timestamp,
    created_at
  FROM public.events
  WHERE type = 'deal_deleted'
),
active_deals AS (
  SELECT dc.*
  FROM deal_closed dc
  LEFT JOIN deal_deleted dd ON dd.target_event_id = dc.id::text
  WHERE dd.tombstone_id IS NULL
),
event_totals AS (
  SELECT
    market_id,
    COUNT(*) AS active_deal_event_count,
    COALESCE(SUM(revenue), 0) AS active_event_revenue,
    COALESCE(SUM(deal_count), 0) AS active_event_deal_count
  FROM active_deals
  GROUP BY market_id
)
SELECT
  m.id AS market_id,
  m.name,
  m.start_date,
  m.total_revenue AS cloud_market_total_revenue,
  COALESCE(et.active_event_revenue, 0) AS active_event_revenue,
  m.total_revenue - COALESCE(et.active_event_revenue, 0) AS revenue_diff,
  m.total_deals AS cloud_market_total_deals,
  COALESCE(et.active_event_deal_count, 0) AS active_event_deal_count,
  m.total_deals - COALESCE(et.active_event_deal_count, 0) AS deal_diff,
  COALESCE(et.active_deal_event_count, 0) AS active_deal_event_count
FROM public.markets m
LEFT JOIN event_totals et ON et.market_id = m.id
WHERE
  COALESCE(m.total_revenue, 0) <> COALESCE(et.active_event_revenue, 0)
  OR COALESCE(m.total_deals, 0) <> COALESCE(et.active_event_deal_count, 0)
ORDER BY ABS(COALESCE(m.total_revenue, 0) - COALESCE(et.active_event_revenue, 0)) DESC;
```

判讀：

- 無結果：cloud market projection 與 active events 一致。
- 有結果且 `revenue_diff > 0`：cloud market projection 可能比事件真相高，可能曾經重複累加。
- 有結果且 `revenue_diff < 0`：cloud market projection 可能漏算事件。

## B. Tombstone 完整性

檢查所有 tombstone 是否缺目標 id 或 root `market_id`。

```sql
SELECT
  type,
  COUNT(*) AS tombstone_count,
  COUNT(*) FILTER (WHERE market_id IS NULL) AS missing_root_market_id,
  COUNT(*) FILTER (
    WHERE COALESCE(payload->>'eventId', payload->>'event_id') IS NULL
  ) AS missing_target_event_id
FROM public.events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type
ORDER BY type;
```

期望：

- `missing_root_market_id = 0`
- `missing_target_event_id = 0`

## C. Tombstone target 是否存在

```sql
WITH tombstones AS (
  SELECT
    id AS tombstone_id,
    type AS tombstone_type,
    market_id,
    COALESCE(payload->>'eventId', payload->>'event_id') AS target_event_id,
    timestamp,
    created_at
  FROM public.events
  WHERE type IN ('deal_deleted', 'interaction_deleted')
)
SELECT
  t.tombstone_id,
  t.tombstone_type,
  t.market_id,
  t.target_event_id,
  target.id AS target_id,
  target.type AS target_type,
  t.timestamp,
  t.created_at
FROM tombstones t
LEFT JOIN public.events target ON target.id::text = t.target_event_id
WHERE target.id IS NULL
ORDER BY t.created_at DESC NULLS LAST, t.timestamp DESC
LIMIT 100;
```

判讀：

- 無結果：tombstone 都找得到目標事件。
- 有結果：可能是 staff view / snapshot 範圍過濾造成 target missing，或 cloud events 本身不完整。

## D. Duplicate semantic deal check

檢查同一市場、同一天、同收入金額是否有多筆不同 id 的 `deal_closed`。這不是一定錯，但可幫助判斷舊資料是否曾被重複寫入。

```sql
WITH deal_values AS (
  SELECT
    id,
    market_id,
    COALESCE(payload->>'dealDate', payload->>'deal_date', to_char(timestamp AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD')) AS deal_date,
    COALESCE(
      NULLIF(payload->>'manualRevenue', '')::numeric,
      NULLIF(payload->>'manual_revenue', '')::numeric,
      NULLIF(payload->>'totalAmount', '')::numeric,
      NULLIF(payload->>'total_amount', '')::numeric,
      0
    ) AS revenue
  FROM public.events
  WHERE type = 'deal_closed'
)
SELECT
  market_id,
  deal_date,
  revenue,
  COUNT(*) AS duplicate_count,
  array_agg(id ORDER BY id) AS event_ids
FROM deal_values
GROUP BY market_id, deal_date, revenue
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, deal_date DESC
LIMIT 100;
```

判讀：

- 有結果不一定代表錯誤，因為同一天可能真的有相同金額成交。
- 若 `duplicate_count` 很高，或對應 UI 明顯重複，才需要進一步人工確認。

## E. Snapshot 結構探測

先不要假設 `snapshots.data` 的格式。用這段看資料形狀。

```sql
SELECT
  id,
  user_id,
  snapshot_at,
  version,
  event_count,
  jsonb_typeof(data) AS data_type,
  jsonb_object_keys(data) AS top_level_key
FROM public.snapshots
ORDER BY snapshot_at DESC
LIMIT 50;
```

如果 `top_level_key` 包含 `markets`、`events`、`dailyStats`，可以繼續跑 F。

## F. Snapshot markets projection 對帳

僅在 E 顯示 `data.markets` 是 array 時使用。

```sql
WITH snapshot_markets AS (
  SELECT
    s.id AS snapshot_id,
    s.user_id,
    s.snapshot_at,
    market->>'id' AS market_id,
    market->>'name' AS market_name,
    NULLIF(market->>'totalRevenue', '')::numeric AS snapshot_total_revenue,
    NULLIF(market->>'totalDeals', '')::integer AS snapshot_total_deals
  FROM public.snapshots s,
  LATERAL jsonb_array_elements(s.data->'markets') AS market
),
deal_closed AS (
  SELECT
    e.id,
    e.market_id,
    COALESCE(
      NULLIF(e.payload->>'manualRevenue', '')::numeric,
      NULLIF(e.payload->>'manual_revenue', '')::numeric,
      NULLIF(e.payload->>'totalAmount', '')::numeric,
      NULLIF(e.payload->>'total_amount', '')::numeric,
      0
    ) AS revenue,
    COALESCE(
      NULLIF(e.payload->>'manualDealCount', '')::integer,
      NULLIF(e.payload->>'manual_deal_count', '')::integer,
      NULLIF(e.payload->>'dealCount', '')::integer,
      NULLIF(e.payload->>'deal_count', '')::integer,
      1
    ) AS deal_count
  FROM public.events e
  WHERE e.type = 'deal_closed'
),
deal_deleted AS (
  SELECT COALESCE(payload->>'eventId', payload->>'event_id') AS target_event_id
  FROM public.events
  WHERE type = 'deal_deleted'
),
active_deals AS (
  SELECT dc.*
  FROM deal_closed dc
  LEFT JOIN deal_deleted dd ON dd.target_event_id = dc.id::text
  WHERE dd.target_event_id IS NULL
),
event_totals AS (
  SELECT
    market_id::text AS market_id,
    COALESCE(SUM(revenue), 0) AS active_event_revenue,
    COALESCE(SUM(deal_count), 0) AS active_event_deal_count
  FROM active_deals
  GROUP BY market_id
)
SELECT
  sm.snapshot_id,
  sm.user_id,
  sm.snapshot_at,
  sm.market_id,
  sm.market_name,
  sm.snapshot_total_revenue,
  et.active_event_revenue,
  sm.snapshot_total_revenue - COALESCE(et.active_event_revenue, 0) AS revenue_diff,
  sm.snapshot_total_deals,
  et.active_event_deal_count,
  sm.snapshot_total_deals - COALESCE(et.active_event_deal_count, 0) AS deals_diff
FROM snapshot_markets sm
LEFT JOIN event_totals et ON et.market_id = sm.market_id
WHERE
  COALESCE(sm.snapshot_total_revenue, 0) <> COALESCE(et.active_event_revenue, 0)
  OR COALESCE(sm.snapshot_total_deals, 0) <> COALESCE(et.active_event_deal_count, 0)
ORDER BY sm.snapshot_at DESC, ABS(COALESCE(sm.snapshot_total_revenue, 0) - COALESCE(et.active_event_revenue, 0)) DESC;
```

判讀：

- 若 A 無異常但 F 有異常：cloud markets 已正確，但 snapshots 仍污染。新裝置可能透過 snapshot 把錯誤 projection 帶回本機。
- 若 A 和 F 都有異常：cloud market projection 與 snapshot 都可能污染。

## G. Staff view tombstone coverage

`docs/STAFF_DATA_FLOW_AUDIT.md` 已提供 Staff view 專用 SQL。若 C2.21 檢查顯示 tombstone 缺失，請同步跑該文件的 D/E 查詢。

## 建議處理順序

1. 跑 A，確認 cloud market projection 是否和 active events 一致。
2. 跑 B/C，確認 tombstone 本身是否完整。
3. 跑 E，確認 snapshot 格式。
4. 若 snapshot 是可讀 JSON array，跑 F。
5. 若 A 正常、F 異常，優先考慮清除/重建 snapshots。
6. 若 A 異常，先不要更新 `markets`，需要獨立 migration 方案與備份。
7. 若 tombstone 缺 `market_id` 或 target，先回報資料列，由 AI 判斷是否能用 payload 補 root 欄位。

