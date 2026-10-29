-- User approved all-account rollout on 2026-10-29.
-- Run ONLY after the compatible owner_accessible_* client is production Ready.
-- Changes rollout switches only; no business records, photos, or memberships deleted.
BEGIN;
DO $check$
BEGIN
 IF to_regprocedure('public.read_subscription_data_scope()') IS NULL
  OR to_regclass('public.owner_accessible_markets') IS NULL
  OR to_regclass('public.owner_accessible_events') IS NULL THEN RAISE EXCEPTION '092 prerequisite missing'; END IF;
END;
$check$;
UPDATE public.subscription_read_guard_settings SET enforce_all=true WHERE singleton;
UPDATE public.subscription_write_guard_settings SET enforce_all=true WHERE singleton;
COMMIT;
SELECT r.enforce_all AS read_enforced,w.enforce_all AS write_enforced
 FROM public.subscription_read_guard_settings r CROSS JOIN public.subscription_write_guard_settings w WHERE r.singleton AND w.singleton;
