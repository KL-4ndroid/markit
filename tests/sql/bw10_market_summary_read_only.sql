-- Read-only diagnostic for the explicitly named BW-10 fixture only.
-- Requires migration 073. Not a repair, migration, or general ledger query.
WITH fixture AS (
  SELECT id, total_revenue, total_profit, total_deals, booth_cost
  FROM public.markets
  WHERE id = 'f69d8d90-667c-4af0-ad00-4c52e60aafa8'
    AND name = '[驗收1022-BW10] 手機營業與離線測試'
), deals AS (
  SELECT e.id, e.payload
  FROM public.events e JOIN fixture f ON e.market_id = f.id
  WHERE e.type = 'deal_closed'
    AND NOT EXISTS (SELECT 1 FROM public.events deleted WHERE deleted.market_id=e.market_id
      AND deleted.type='deal_deleted' AND COALESCE(deleted.payload->>'eventId',deleted.payload->>'event_id')=e.id::TEXT)
), totals AS (
  SELECT COUNT(*) AS event_rows,
    SUM(t.revenue) AS revenue, SUM(t.deal_count) AS deal_count, SUM(t.cost) AS cost
  FROM deals CROSS JOIN LATERAL public.deal_projection_totals(payload) t
)
SELECT f.id, t.event_rows, t.revenue AS event_revenue, t.deal_count AS event_deal_count,
  t.revenue - t.cost AS event_sales_profit,
  t.revenue - t.cost - f.booth_cost AS event_net_profit,
  f.total_revenue AS stored_revenue, f.total_deals AS stored_deal_count, f.total_profit AS stored_profit,
  f.total_revenue = t.revenue AS revenue_matches,
  f.total_deals = t.deal_count AS deal_count_matches,
  f.total_profit = t.revenue-t.cost AS profit_matches,
  (SELECT COUNT(*) FROM public.events e WHERE e.market_id=f.id AND e.type='deal_deleted') AS deletion_events
FROM fixture f CROSS JOIN totals t;

SELECT position('BW10_DEAL_MARKET_V1' IN pg_get_functiondef('public.update_market_read_model()'::regprocedure)) > 0 AS market_patch_active,
  position('BW10_DEAL_PRODUCT_V1' IN pg_get_functiondef('public.update_product_read_model()'::regprocedure)) > 0 AS product_patch_active,
  position('manualDealCount' IN pg_get_functiondef('public.deal_projection_totals(jsonb)'::regprocedure)) > 0 AS reads_manual_deal_count,
  position('cost_at_time_of_sale' IN pg_get_functiondef('public.deal_projection_totals(jsonb)'::regprocedure)) > 0 AS reads_snapshot_cost;
