-- Explicit one-fixture repair, separate from migration 073. No account-wide scan.
-- Keeps raw events, products, inventory and the market's business fields intact.
-- Applied 2026-10-22 before the UI round-trip. Later test events intentionally
-- invalidate its two-event guard: keep this as the receipt, not a reusable fix.
BEGIN;
SET LOCAL statement_timeout = '15s';
DO $repair$
DECLARE
  fixture public.markets%ROWTYPE;
  totals NUMERIC[];
  ids UUID[];
BEGIN
  SELECT * INTO STRICT fixture FROM public.markets
    WHERE id = 'f69d8d90-667c-4af0-ad00-4c52e60aafa8' FOR UPDATE;
  IF fixture.name <> '[驗收1022-BW10] 手機營業與離線測試'
    OR fixture.owner_id <> '35c253c0-540f-436f-abb5-c1b116e1f3df' THEN
    RAISE EXCEPTION 'Wrong disposable BW-10 fixture';
  END IF;
  SELECT array_agg(e.id ORDER BY e.id), ARRAY[SUM(t.revenue),SUM(t.revenue-t.cost),SUM(t.deal_count)]
    INTO ids, totals FROM public.events e
    CROSS JOIN LATERAL public.deal_projection_totals(e.payload) t
    WHERE e.market_id = fixture.id AND e.type = 'deal_closed';
  IF ids IS DISTINCT FROM ARRAY['3c7ba41e-907b-4251-abf3-ac1e61816788','d1edeb58-9c8e-4102-b7d2-b568db131cb7']::UUID[]
    OR totals IS DISTINCT FROM ARRAY[350,240,3]::NUMERIC[]
    OR EXISTS (SELECT 1 FROM public.events WHERE market_id=fixture.id AND type='deal_deleted') THEN
    RAISE EXCEPTION 'Fixture evidence changed; inspect rather than repair';
  END IF;
  IF ARRAY[fixture.total_revenue,fixture.total_profit,fixture.total_deals] IS DISTINCT FROM ARRAY[350,0,2]::NUMERIC[]
    AND ARRAY[fixture.total_revenue,fixture.total_profit,fixture.total_deals] IS DISTINCT FROM totals THEN
    RAISE EXCEPTION 'Unexpected stored totals; inspect rather than repair';
  END IF;
  UPDATE public.markets SET total_revenue=totals[1],total_profit=totals[2],total_deals=totals[3]
    WHERE id=fixture.id;
END;
$repair$;
COMMIT;
SELECT name,total_revenue,total_profit,total_deals FROM public.markets
  WHERE id='f69d8d90-667c-4af0-ad00-4c52e60aafa8';
