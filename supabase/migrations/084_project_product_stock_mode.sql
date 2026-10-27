-- Fix one omitted product_updated projection field. No history replay or bulk repair.
-- Preserve all deployed trigger branches, authorization, role checks and SQL privileges.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $patch$
DECLARE
 v_definition text;
 v_branch text;
 v_next text;
BEGIN
 v_definition := replace(pg_get_functiondef('public.update_product_read_model()'::regprocedure),E'\r','');
 IF position('FERIA_PRODUCT_STOCK_MODE_V1' IN v_definition)=0 THEN
  v_branch := substring(v_definition FROM 'WHEN ''product_updated'' THEN[\s\S]*?WHEN ''product_deleted'' THEN');
  IF v_branch IS NULL OR v_branch !~ 'UPDATE[[:space:]]+(public\.)?products[[:space:]]+SET'
    OR position('unlimited_stock' IN v_branch)>0 OR position('unlimitedStock' IN v_branch)>0 THEN
    RAISE EXCEPTION 'Unexpected product update branch; inspect before migration 084';
  END IF;
  v_next := regexp_replace(v_branch,'(UPDATE[[:space:]]+(public\.)?products[[:space:]]+SET)',
    $replacement$\1
        -- FERIA_PRODUCT_STOCK_MODE_V1: explicit false must survive projection.
        unlimited_stock = COALESCE(
          (NEW.payload->'updates'->>'unlimitedStock')::boolean,
          (NEW.payload->'updates'->>'unlimited_stock')::boolean,
          unlimited_stock),$replacement$);
  IF v_next=v_branch THEN RAISE EXCEPTION 'Product inventory mode patch did not apply'; END IF;
  EXECUTE replace(v_definition,v_branch,v_next);
 END IF;
END
$patch$;

-- Read-only readiness check for unlimited-stock update projection.
DO $verify$
DECLARE v_definition text;
BEGIN
 v_definition := pg_get_functiondef('public.update_product_read_model()'::regprocedure);
 IF position('FERIA_PRODUCT_STOCK_MODE_V1' IN v_definition)=0 THEN
  RAISE EXCEPTION 'Inventory mode projection patch is missing';
 END IF;
 IF position('unlimitedStock' IN v_definition)=0 OR position('unlimited_stock' IN v_definition)=0 THEN
  RAISE EXCEPTION 'Both inventory mode payload names must be handled';
 END IF;
END
$verify$;

COMMIT;
