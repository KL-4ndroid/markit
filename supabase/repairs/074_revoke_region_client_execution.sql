-- One-time repair for migration 074 applied before explicit role revocations.
-- Changes only function EXECUTE privileges. No market/event/financial data writes.
BEGIN;
REVOKE ALL ON FUNCTION public.market_region_code_is_valid(TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.market_region_code_is_valid(TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.guard_market_region_change() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.project_market_region_event() FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
