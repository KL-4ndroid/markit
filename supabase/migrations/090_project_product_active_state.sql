-- Project the existing authorized basic status field; no permission or data backfill.
BEGIN;
SET LOCAL lock_timeout = '5s';
DO $patch$
DECLARE v_definition text; v_branch text; v_next text;
BEGIN
  v_definition := replace(pg_get_functiondef('public.update_product_read_model()'::regprocedure), E'\r', '');
  IF position('FERIA_PRODUCT_ACTIVE_V1' IN v_definition) = 0 THEN
    v_branch := substring(v_definition FROM 'WHEN ''product_updated'' THEN[\s\S]*?WHEN ''product_deleted'' THEN');
    IF v_branch IS NULL OR v_branch !~ 'UPDATE[[:space:]]+(public\.)?products[[:space:]]+SET'
      OR v_branch ~ 'is_active[[:space:]]*=' THEN
      RAISE EXCEPTION 'Unexpected product active-state projection; inspect deployed function before 090';
    END IF;
    v_next := regexp_replace(v_branch, '(UPDATE[[:space:]]+(public\.)?products[[:space:]]+SET)',
      $replacement$\1
        -- FERIA_PRODUCT_ACTIVE_V1: explicit false must persist.
        is_active = COALESCE((NEW.payload->'updates'->>'isActive')::boolean,
          (NEW.payload->'updates'->>'is_active')::boolean, is_active),$replacement$);
    IF v_next = v_branch THEN RAISE EXCEPTION 'Product active-state patch did not apply'; END IF;
    EXECUTE replace(v_definition, v_branch, v_next);
  END IF;
END;
$patch$;
COMMIT;
