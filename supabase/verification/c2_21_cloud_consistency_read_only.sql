-- C2.21 Cloud Data Consistency Read-Only Verification
-- Date prepared: 2026-06-29
--
-- Safety boundary:
-- - Read-only SELECT statements only.
-- - No INSERT / UPDATE / DELETE / UPSERT / TRUNCATE.
-- - No schema, RLS, policy, function, or migration changes.
-- - Non-zero rows are audit findings, not repair approval.
--
-- Recommended use:
-- 1. Open Supabase SQL Editor for the target environment.
-- 2. Run this file section by section.
-- 3. Record the row counts and notable rows in:
--    docs/C2.21_READ_ONLY_VERIFICATION_RESULT_TEMPLATE.md

-- ---------------------------------------------------------------------------
-- C2.21-A: Markets projection vs active deal events
-- Purpose:
--   Find markets where cloud projection totals differ from active deal_closed
--   events after deal_deleted tombstones are applied.
-- Expected:
--   Zero rows is ideal.
-- ---------------------------------------------------------------------------

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
    id AS tombstone_id
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

-- ---------------------------------------------------------------------------
-- C2.21-B: Tombstone completeness
-- Purpose:
--   Confirm deletion tombstones have root market ids and target event ids.
-- Expected:
--   missing_root_market_id = 0
--   missing_target_event_id = 0
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- C2.21-C: Tombstone target integrity
-- Purpose:
--   Find tombstones whose target event no longer exists.
-- Expected:
--   Zero rows is ideal.
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- C2.21-D: Duplicate semantic deal check
-- Purpose:
--   Find same-market, same-day, same-revenue deal_closed clusters.
-- Expected:
--   Zero rows is ideal, but non-zero rows may be legitimate and require
--   manual classification before any repair is considered.
-- ---------------------------------------------------------------------------

WITH deal_values AS (
  SELECT
    id,
    market_id,
    COALESCE(
      payload->>'dealDate',
      payload->>'deal_date',
      to_char(timestamp AT TIME ZONE 'Asia/Taipei', 'YYYY-MM-DD')
    ) AS deal_date,
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

-- ---------------------------------------------------------------------------
-- C2.21-E: Snapshot shape check
-- Purpose:
--   Understand current snapshot JSON shape before any future rebuild or
--   replacement-cache decision.
-- Expected:
--   Snapshot shape is known and documented. No repair is approved here.
-- ---------------------------------------------------------------------------

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
