-- Captured through authorized SQL Editor, no operational data.
CREATE OR REPLACE FUNCTION public.update_product_read_model()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_product_id UUID;
  v_item JSONB;
BEGIN
  CASE NEW.type

    -- 商品建立事件
    WHEN 'product_created' THEN
      INSERT INTO products (
        id,
        owner_id,           -- ✅ 新增：商品所有者
        market_id,          -- ✅ 可選：首次創建的市集
        name,
        category,
        price,
        cost,
        icon_name,
        color_code,
        stock,
        unlimited_stock,
        is_active,
        is_shared,          -- ✅ 新增：是否共享
        description,
        created_at,
        updated_at
      )
      VALUES (
        (NEW.payload->>'productId')::UUID,
        NEW.actor_id,       -- ✅ 使用事件的 actor_id 作為所有者
        NEW.market_id,      -- ✅ 可以是 NULL
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'category')::TEXT,
        (NEW.payload->>'price')::NUMERIC,
        (NEW.payload->>'cost')::NUMERIC,
        (NEW.payload->>'iconName')::TEXT,
        (NEW.payload->>'colorCode')::TEXT,
        (NEW.payload->>'stock')::INTEGER,
        COALESCE((NEW.payload->>'unlimitedStock')::BOOLEAN, FALSE),
        TRUE,
        COALESCE((NEW.payload->>'isShared')::BOOLEAN, FALSE),
        (NEW.payload->>'description')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;

    -- 商品更新事件
    WHEN 'product_updated' THEN
      UPDATE products
      SET
        name = COALESCE((NEW.payload->'updates'->>'name')::TEXT, name),
        price = COALESCE((NEW.payload->'updates'->>'price')::NUMERIC, price),
        cost = COALESCE((NEW.payload->'updates'->>'cost')::NUMERIC, cost),
        stock = COALESCE((NEW.payload->'updates'->>'stock')::INTEGER, stock),
        is_shared = COALESCE((NEW.payload->'updates'->>'isShared')::BOOLEAN, is_shared),
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;

    -- 商品刪除事件
    WHEN 'product_deleted' THEN
      UPDATE products
      SET
        is_active = FALSE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'productId')::UUID;

    -- 成交事件：更新商品銷售統計
    WHEN 'deal_closed', 'deal_deleted' THEN

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

        AND p.owner_id = (SELECT m.owner_id FROM public.markets m WHERE m.id = NEW.market_id);

    ELSE
      NULL;
  END CASE;

  RETURN NEW;
END;
$function$;
