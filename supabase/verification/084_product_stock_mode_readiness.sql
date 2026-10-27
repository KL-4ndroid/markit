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
