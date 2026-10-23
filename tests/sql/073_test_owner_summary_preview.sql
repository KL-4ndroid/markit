-- Read-only preview for the explicitly identified TEST owner. Never a repair.
-- Missing history or snapshots must be reviewed before any historical rewrite.
WITH scope AS (
  SELECT * FROM public.markets WHERE owner_id='35c253c0-540f-436f-abb5-c1b116e1f3df' AND NOT COALESCE(is_deleted,FALSE)
), active AS (
  SELECT e.* FROM public.events e JOIN scope m ON m.id=e.market_id WHERE e.type='deal_closed'
    AND NOT EXISTS (SELECT 1 FROM public.events d WHERE d.type='deal_deleted' AND d.market_id=e.market_id
      AND COALESCE(d.payload->>'eventId',d.payload->>'event_id')=e.id::TEXT)
), totals AS (
  SELECT e.market_id,COUNT(*) AS active_events,SUM(t.revenue) AS revenue,SUM(t.revenue-t.cost) AS profit,SUM(t.deal_count) AS deals,
    COUNT(*) FILTER (WHERE jsonb_typeof(e.payload->'isBackfill') IS DISTINCT FROM 'boolean'
      AND jsonb_typeof(e.payload->'is_backfill') IS DISTINCT FROM 'boolean') AS unknown_backfill_events
  FROM active e CROSS JOIN LATERAL public.deal_projection_totals(e.payload) t GROUP BY e.market_id
)
SELECT m.id,m.name,COALESCE(t.active_events,0) AS active_events,
  ARRAY[m.total_revenue,m.total_profit,m.total_deals] AS stored_revenue_profit_deals,
  ARRAY[COALESCE(t.revenue,0),COALESCE(t.profit,0),COALESCE(t.deals,0)] AS event_revenue_profit_deals,
  COALESCE(t.unknown_backfill_events,0) AS unknown_backfill_events,
  CASE WHEN t.active_events IS NULL THEN 'no event history: do not overwrite from zero'
    ELSE 'review event completeness and snapshots before repair' END AS review_note
FROM scope m LEFT JOIN totals t ON t.market_id=m.id
WHERE ARRAY[m.total_revenue,m.total_profit,m.total_deals] IS DISTINCT FROM
  ARRAY[COALESCE(t.revenue,0),COALESCE(t.profit,0),COALESCE(t.deals,0)]
ORDER BY m.id;
