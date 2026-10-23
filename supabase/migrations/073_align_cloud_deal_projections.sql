-- BW-10: event snapshots are authoritative for sales totals. No history rewrite.
-- Keep all non-deal branches (including migration 072) and existing privileges.
BEGIN;

-- Match JS nullish precedence: an invalid non-null value uses the fallback,
-- rather than silently falling through to a lower-priority alias.
CREATE OR REPLACE FUNCTION public.deal_projection_number(VARIADIC candidates JSONB[])
RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE
SET search_path = pg_catalog, public AS $body$
DECLARE candidate JSONB;
BEGIN
  FOREACH candidate IN ARRAY candidates LOOP
    IF candidate IS NOT NULL AND candidate <> 'null'::JSONB THEN
      IF jsonb_typeof(candidate) = 'number' THEN RETURN candidate::TEXT::NUMERIC; END IF;
      RETURN NULL;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$body$;

CREATE OR REPLACE FUNCTION public.deal_projection_totals(payload JSONB)
RETURNS TABLE(revenue NUMERIC, cost NUMERIC, deal_count NUMERIC)
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog, public AS $body$
  SELECT
    COALESCE(public.deal_projection_number(payload->'manualRevenue', payload->'manual_revenue', payload->'totalAmount', payload->'total_amount'),
      SUM(COALESCE(public.deal_projection_number(item->'price_at_time_of_sale', item->'priceAtTimeOfSale', item->'price'), 0)
        * COALESCE(public.deal_projection_number(item->'quantity'), 0)), 0),
    COALESCE(public.deal_projection_number(payload->'manualCost', payload->'manual_cost', payload->'totalCost', payload->'total_cost'),
      SUM(COALESCE(public.deal_projection_number(item->'cost_at_time_of_sale', item->'costAtTimeOfSale', item->'cost'), 0)
        * COALESCE(public.deal_projection_number(item->'quantity'), 0)), 0),
    COALESCE(public.deal_projection_number(payload->'manualDealCount', payload->'manual_deal_count', payload->'dealCount', payload->'deal_count'), 1)
  FROM jsonb_array_elements(CASE WHEN jsonb_typeof(payload->'items') = 'array' THEN payload->'items' ELSE '[]'::JSONB END) AS items(item);
$body$;

-- Called only by the two existing SECURITY DEFINER triggers, never an RPC.
-- Both triggers acquire the same market row lock before examining tombstones.
CREATE OR REPLACE FUNCTION public.deal_projection_delta(event_id UUID, market UUID, event_type TEXT, event_payload JSONB)
RETURNS TABLE(revenue NUMERIC, cost NUMERIC, deal_count NUMERIC, items JSONB, direction INTEGER, stock_direction INTEGER)
LANGUAGE plpgsql VOLATILE SET search_path = pg_catalog, public AS $body$
DECLARE
  source_payload JSONB;
  target_id TEXT;
  backfill BOOLEAN;
  manual BOOLEAN;
  event_tx XID;
  event_command CID;
  source_tx XID;
  source_command CID;
BEGIN
  PERFORM 1 FROM public.markets WHERE id = market FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT e.xmin, e.cmin INTO event_tx, event_command FROM public.events e WHERE e.id = event_id;

  IF event_type = 'deal_closed' THEN
    target_id := event_id::TEXT;
    source_payload := event_payload;
    direction := 1;
  ELSIF event_type = 'deal_deleted' THEN
    target_id := COALESCE(event_payload->>'eventId', event_payload->>'event_id');
    SELECT e.payload, e.xmin, e.cmin INTO source_payload, source_tx, source_command FROM public.events e
      WHERE e.id::TEXT = target_id AND e.market_id = market AND e.type = 'deal_closed';
    IF NOT FOUND THEN RETURN; END IF;
    -- AFTER ROW triggers see every row inserted by the same SQL command.
    -- An original and its tombstone in one batch cancel without either delta.
    -- Compare current insertion MVCC identity, never wall-clock timestamps.
    IF source_tx = event_tx AND source_command = event_command THEN RETURN; END IF;
    direction := -1;
  ELSE RETURN;
  END IF;

  -- Duplicate deletion events and delete-before-original delivery are no-ops.
  -- Never trust deletion-supplied amounts, quantities or a cross-market target.
  IF EXISTS (SELECT 1 FROM public.events e WHERE e.market_id = market
    AND e.type = 'deal_deleted' AND e.id <> event_id
    -- For duplicate tombstones in one batch, exactly the lowest UUID wins.
    AND NOT (event_type = 'deal_deleted' AND e.xmin = event_tx AND e.cmin = event_command AND e.id > event_id)
    AND COALESCE(e.payload->>'eventId', e.payload->>'event_id') = target_id) THEN RETURN; END IF;

  SELECT t.revenue, t.cost, t.deal_count INTO revenue, cost, deal_count
    FROM public.deal_projection_totals(source_payload) t;
  manual := COALESCE(source_payload->'isManualEntry' = 'true'::JSONB, FALSE)
    OR COALESCE(source_payload->'is_manual_entry' = 'true'::JSONB, FALSE);
  backfill := COALESCE(source_payload->'isBackfill' = 'true'::JSONB, FALSE)
    OR COALESCE(source_payload->'is_backfill' = 'true'::JSONB, FALSE);
  items := CASE WHEN NOT manual AND jsonb_typeof(source_payload->'items') = 'array'
    THEN source_payload->'items' ELSE '[]'::JSONB END;
  stock_direction := CASE
    WHEN manual OR backfill THEN 0
    WHEN direction = 1 THEN -1
    -- Unknown legacy backfill mode must never increase inventory on deletion.
    WHEN jsonb_typeof(source_payload->'isBackfill') = 'boolean'
      OR jsonb_typeof(source_payload->'is_backfill') = 'boolean' THEN 1
    ELSE 0 END;
  RETURN NEXT;
END;
$body$;

REVOKE ALL ON FUNCTION public.deal_projection_number(JSONB[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deal_projection_totals(JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.deal_projection_delta(UUID, UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;

DO $migration$
DECLARE
  definition TEXT;
  previous_branch TEXT;
  next_branch TEXT;
BEGIN
  -- Normalize line endings/indentation only for the known branch comparison.
  definition := replace(pg_get_functiondef('public.update_market_read_model()'::regprocedure), E'\r', '');
  previous_branch := substring(definition FROM 'WHEN ''deal_closed'' THEN[\s\S]*?WHEN ''interaction_recorded'' THEN');
  IF position('BW10_DEAL_MARKET_V1' IN definition) = 0 THEN
    IF previous_branch IS NULL OR regexp_replace(previous_branch, '\s', '', 'g') <>
      regexp_replace($old$WHEN 'deal_closed' THEN
        UPDATE markets SET total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1, updated_at = NEW.timestamp WHERE id = NEW.market_id;
        WHEN 'interaction_recorded' THEN$old$, '\s', '', 'g') THEN
      RAISE EXCEPTION 'Unexpected market deal branch; inspect before migration 073';
    END IF;
    next_branch := $new$WHEN 'deal_closed', 'deal_deleted' THEN
      -- BW10_DEAL_MARKET_V1: products are projected by the product trigger only.
      UPDATE public.markets m SET
        total_revenue = GREATEST(0, COALESCE(m.total_revenue, 0) + d.direction * d.revenue),
        total_profit = COALESCE(m.total_profit, 0) + d.direction * (d.revenue - d.cost),
        total_deals = GREATEST(0, COALESCE(m.total_deals, 0) + d.direction * d.deal_count),
        updated_at = NEW.timestamp
      FROM public.deal_projection_delta(NEW.id, NEW.market_id, NEW.type, NEW.payload) d
      WHERE m.id = NEW.market_id;

    WHEN 'interaction_recorded' THEN$new$;
    definition := replace(definition, previous_branch, next_branch);
    EXECUTE definition;
  END IF;

  definition := replace(pg_get_functiondef('public.update_product_read_model()'::regprocedure), E'\r', '');
  previous_branch := substring(definition FROM 'WHEN ''deal_closed'' THEN[\s\S]*?END LOOP;');
  IF position('BW10_DEAL_PRODUCT_V1' IN definition) = 0 THEN
    IF previous_branch IS NULL OR regexp_replace(previous_branch, '\s', '', 'g') <>
      regexp_replace($old$WHEN 'deal_closed' THEN
        -- 遍歷 items 陣列更新每個商品
        FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.payload->'items') LOOP
        v_product_id := (v_item->>'productId')::UUID;
        UPDATE products SET total_sold = total_sold + (v_item->>'quantity')::INTEGER,
        stock = CASE WHEN NOT unlimited_stock THEN GREATEST(0, stock - (v_item->>'quantity')::INTEGER) ELSE stock END,
        updated_at = NEW.timestamp WHERE id = v_product_id;
        END LOOP;$old$, '\s', '', 'g') THEN
      RAISE EXCEPTION 'Unexpected product deal branch; inspect before migration 073';
    END IF;
    next_branch := $new$WHEN 'deal_closed', 'deal_deleted' THEN
      -- BW10_DEAL_PRODUCT_V1: group repeated product lines into one update.
      UPDATE public.products p SET
        total_sold = GREATEST(0, COALESCE(p.total_sold, 0) + sold.direction * sold.quantity),
        stock = CASE WHEN NOT p.unlimited_stock AND p.stock IS NOT NULL
          THEN GREATEST(0, p.stock + sold.stock_direction * sold.quantity) ELSE p.stock END,
        updated_at = NEW.timestamp
      FROM (
        SELECT COALESCE(item->>'productId', item->>'product_id') AS product_id,
          d.direction, d.stock_direction,
          SUM(public.deal_projection_number(item->'quantity')) AS quantity
        FROM public.deal_projection_delta(NEW.id, NEW.market_id, NEW.type, NEW.payload) d
        CROSS JOIN LATERAL jsonb_array_elements(d.items) AS lines(item)
        WHERE public.deal_projection_number(item->'quantity') > 0
        GROUP BY COALESCE(item->>'productId', item->>'product_id'), d.direction, d.stock_direction
      ) sold
      WHERE p.id::TEXT = sold.product_id
        AND p.owner_id = (SELECT m.owner_id FROM public.markets m WHERE m.id = NEW.market_id);$new$;
    definition := replace(definition, previous_branch, next_branch);
    EXECUTE definition;
  END IF;
END;
$migration$;
COMMIT;
