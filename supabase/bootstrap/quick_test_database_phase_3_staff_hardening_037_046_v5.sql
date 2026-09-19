-- Féria quick test database phase 3 v5: staff hardening 037-046 with precise view-shape compatibility drops
-- Intended only for a new/empty or disposable Supabase staging/local test project.
-- Do NOT run on production or on a database that contains real user data.
-- Sanitized for quick bootstrap: removed COMMENT ON statements and replaced RAISE NOTICE with NULL;
-- Generated at: 2026-06-23 02:06:06 +08:00

set check_function_bodies = off;

-- ============================================================
-- BEGIN SOURCE: 037_add_events_created_at_cursor.sql
-- ============================================================

-- ============================================
-- Migration: 037_add_events_created_at_cursor
-- Date: 2026-06-03
-- ============================================
-- Purpose:
--   Add created_at column to events table to serve as a reliable sync cursor.
--
-- Design rationale:
--   - timestamp: Business event time, may be backfilled with historical dates
--     (e.g. deal_closed backfilled to 2026-05-23 while inserted today).
--     Using timestamp as sync cursor causes these events to be skipped
--     when lastSyncAt > timestamp, which is the root cause of owner sync miss.
--
--   - created_at: Cloud-side INSERT/write time. Always >= actual INSERT time
--     (PostgreSQL default NOW()). Cannot be backfilled to arbitrary historical
--     dates by design, making it a reliable cursor for incremental sync.
--
--   - Existing rows: Backfilled to migration time (NOW()) so that any events
--     previously missed due to the timestamp cursor bug will have
--     created_at > lastSyncAt, and will be re-discovered on the next sync.
--
--   - Replay ordering: All replay logic (pullAllEvents, pullIncrementalEvents)
--     continues to use ORDER BY timestamp ASC to preserve business chronology.
--     created_at is only used as a WHERE cursor filter, never for sorting.
-- ============================================

-- Step 1: Add column (nullable initially)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

-- Step 2: Backfill existing rows to NOW()
-- All existing rows get created_at = migration execution time.
-- This ensures they will be re-evaluated by the created_at cursor on next sync.
UPDATE public.events
SET created_at = NOW()
WHERE created_at IS NULL;

-- Step 3: Set default for future inserts
ALTER TABLE public.events
ALTER COLUMN created_at SET DEFAULT NOW();

-- Step 4: Enforce NOT NULL
ALTER TABLE public.events
ALTER COLUMN created_at SET NOT NULL;

-- Step 5: Create index for created_at > lastSyncAt queries
CREATE INDEX IF NOT EXISTS idx_events_created_at
ON public.events(created_at DESC);

-- ============================================
-- Verification queries (can be run manually)
-- ============================================

-- Check 1: created_at column exists
-- Expected: 1 row
-- SELECT 1 FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'events'
--   AND column_name = 'created_at';

-- Check 2: created_at NULL count = 0
-- Expected: 0
-- SELECT COUNT(*) FROM public.events WHERE created_at IS NULL;

-- Check 3: index idx_events_created_at exists
-- Expected: 1 row
-- SELECT 1 FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'events'
--   AND indexname = 'idx_events_created_at';

-- Check 4: Verify target market's deal_closed events have created_at
-- Expected: 2 rows with non-null created_at
-- SELECT id, type, market_id, timestamp, created_at
-- FROM public.events
-- WHERE market_id = '5bfb9ff4-15b3-4b5e-831c-d96439b4d0bb'
--   AND type = 'deal_closed';

-- ============================================================
-- END SOURCE: 037_add_events_created_at_cursor.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: quick_test_database_compat_drop_staff_accessible_events_view.sql
-- ============================================================

-- Disposable bootstrap compatibility patch.
drop view if exists public.staff_accessible_events;

-- ============================================================
-- END SOURCE: quick_test_database_compat_drop_staff_accessible_events_view.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 038_ensure_staff_tombstone_events_visible.sql
-- ============================================================

-- ============================================================
-- Migration: 038_ensure_staff_tombstone_events_visible
-- Date: 2026-06-13
-- Purpose:
--   Ensure deal_deleted and interaction_deleted tombstone events
--   are explicitly included in staff_accessible_events so that
--   staff-side tombstone logic can correctly filter out
--   deleted deals after pulling from the view.
--
-- Background:
--   The existing view (030_fix_data_isolation.sql) has 4 UNION
--   branches using "e.*", which in theory includes all event
--   types including tombstones. However, the join path for
--   deal_deleted events (owner creates them with market_id =
--   market UUID) depends on market_members containing a row for
--   that market + owner combination.
--
--   This migration adds an explicit dedicated branch for
--   tombstone events, making the intent unambiguous and
--   resilient to edge cases in the market_members join chain.
--
-- Verification SQL (run as authenticated staff user):
--   SELECT type, COUNT(*)
--   FROM staff_accessible_events
--   WHERE market_id = 'YOUR_MARKET_UUID'
--   GROUP BY type;
--   -- Should show non-zero counts for deal_deleted and
--   -- interaction_deleted if tombstones exist for that market.
-- ============================================================

CREATE OR REPLACE VIEW staff_accessible_events AS

-- 1. Staff sees owner's market-scoped events (all types including tombstones)
SELECT
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' AS access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'

UNION ALL

-- 2. Staff sees owner's global events (market_id IS NULL, all types)
SELECT
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' AS access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active'
  AND e.market_id IS NULL

UNION ALL

-- 3. Owner sees own events (all types)
SELECT
  e.*,
  e.actor_id AS relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb AS permissions,
  'owner' AS access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. Owner sees all events in own markets (all types, including tombstones
--    created by staff)
SELECT
  e.*,
  mm.user_id AS relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb AS permissions,
  'owner' AS access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
  AND e.actor_id != auth.uid();

-- ============================================================
-- Verification: Ensure deal_deleted is visible in the view
-- Run this as a staff user with an active relationship:
--
-- SELECT type, COUNT(*) AS cnt
-- FROM staff_accessible_events
-- WHERE type IN ('deal_deleted', 'interaction_deleted')
--   AND market_id = 'YOUR_MARKET_UUID'
-- GROUP BY type;
-- ============================================================

-- ============================================================
-- END SOURCE: 038_ensure_staff_tombstone_events_visible.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: quick_test_database_compat_drop_staff_accessible_views.sql
-- ============================================================

-- Féria quick test database compatibility patch
--
-- PostgreSQL cannot CREATE OR REPLACE VIEW when the replacement changes
-- existing column names or order. Historical staff hardening migrations reshape
-- staff_accessible_* views several times, so disposable bootstrap needs to drop
-- the old view shape before recreating the next one.

drop view if exists public.staff_accessible_events;
drop view if exists public.staff_accessible_products;
drop view if exists public.staff_accessible_markets;

-- ============================================================
-- END SOURCE: quick_test_database_compat_drop_staff_accessible_views.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 039_staff_view_hardening.sql
-- ============================================================

-- =============================================================================
-- 039_staff_view_hardening.sql
-- =============================================================================
--
-- C2.29B-1: Staff accessible view hardening (?阮)
-- 撱箇??交?: 2026-06-15
-- 撱箇??? Cursor (Codex)
-- ??? ? ?阮嚗歇 commit ??repo嚗?*?芸??典 Supabase**嚗?
--
-- 撠??餅??ｇ?C2.29 蝺?撖行葫蝣箄?嚗?
--   #1 staff_accessible_markets    ??booth_cost / commission_rate / total_profit / 4 ??rental
--   #2 staff_accessible_products   ??cost
--   #3 staff_accessible_events     ?怠???payload嚗oothCost / cost / supplier / profitMargin 蝑?
--
-- 撠? E1-E3 蝺?撖行葫:
--   E2: ?∪極?? RLS ?湔 SELECT markets ? booth_cost / total_profit
--   E3: ?∪極?? staff_accessible_events view ? 10 蝑?boothCost=3000/3500
--
-- 閮剛???:
--   - ? view 雿輻 UNION ALL嚗wner branch ??staff branch 敹?蝬剜??詨?甈?蝯?
--   - Staff branch 靽????雿?蝔梧???甈?頛詨 NULL
--   - Owner branch 靽?摰甈?????payload
--   - ?格??航? Staff ?乩??啁?撖行??潘?銝霈?雿?摮
--
-- 蝭??嚗??摰?:
--   - 039 ?芾靽?staff_accessible_* view 撅?
--   - 039 銝耨?孵?銵?RLS嚗? #4 ? C2.29B-2 閬?嚗?
--   - 039 銝耨?寞??migration
--   - 039 銝耨?孵?蝡?/ PermissionGate / useUserRole
--
-- 憟??霈:
--   1. ?Ⅱ隤?隞賣?隞?docs/C2.29_VIEW_BACKUP_2026_06_15.md 撌脣遣蝡?
--   2. ? Supabase SQL Editor 憟?祆?
--   3. 憟敺銵蝘駁?霅?SQL嚗?瑼偏嚗?
--   4. 撽???敺? commit 憟蝝??
--
-- 憟?孵?嚗犖撌伐?:
--   - ??Supabase Dashboard > SQL Editor
--   - 鞎潔??祆?摰?批捆
--   - 暺 Run
--   - 蝣箄??⊿隤文?頝?霅?SQL
--   - 蝣箄? owner / staff ?亥岷蝯?蝚血???
--
-- -----------------------------------------------------------------------------
-- ? 甇??憟撱箄降嚗ransactional safety嚗?
-- -----------------------------------------------------------------------------
--
-- 撱箄降甇??憟?蝙??transaction嚗???migration body + 撽? SQL 銝甈∟票??
-- SQL Editor嚗畾萄???BEGIN ... COMMIT嚗?憟??霅???漱?ㄐ??
-- 隞颱?撽?憭望? ??ROLLBACK 銝甈⊥折???銝????? view??
--
-- 璅?瘚?嚗?
--
--   BEGIN;
--   -- (1) 鞎潔? Section 1 ~ 4 ??migration body
--   --     (sanitize_staff_event_payload + 3 ??view ?遣)
--
--   -- (2) 蝡頝?Staff 撽? SQL嚗? Section 5嚗?
--   --     ??嚗ooth_cost / cost / payload ?? key ?券 NULL / 蝻箸?
--
--   -- (3) 頝?Owner 撽? SQL
--   --     ??嚗ooth_cost / cost / payload 隞?祕??
--
--   -- (4) 頝?tombstone 撽? SQL
--   --     ??嚗eal_deleted / interaction_deleted 隞閬?
--
--   -- (5) ?券??嚗?
--   COMMIT;
--   --     (6) 隞颱?憭望?嚗?
--   --     ROLLBACK;
--
-- ??嚗?
--   - 銝??冽撽???COMMIT??
--   - 撽???嚗? Staff branch ????Owner branch ???敺?tombstone??
--   - 撽?摰?敺?閮?憟蝯?嚗遣霅啣 docs/C2.29_REANALYSIS_2026_06_15.md
--     鋆?憟?交? + commit hash嚗?
--
-- ?箔?閬 transaction嚗?
--   - CREATE OR REPLACE VIEW / FUNCTION 銝??芸? rollback ?Ｘ? session ?摮?
--   - 憟敺 Owner 蝡舀閰Ｙ??撣賂??閬?甈⊥折???3 ??view
--   - Supabase SQL Editor 撠?BEGIN/COMMIT ?舀摰?
--
-- Rollback ?孵?嚗犖撌伐?:
--   - ??docs/C2.29_VIEW_BACKUP_2026_06_15.md 禮1.1 / 禮2.1 / 禮3.1
--   - 蝳迫?芸? rollback嚗?鈭箏極蝣箄?
--
-- =============================================================================


-- =============================================================================
-- Section 1: Helper function for payload sanitization
-- =============================================================================
--
-- ?箔??閬?helper function:
--   - top-level `payload - 'cost'` ?芾蝘駁?憭惜
--   - deal_closed.payload.items[] ?批?賢 cost / costAtTimeOfSale / supplierInfo
--     / profit / profitMargin / grossMargin / totalCost
--   - 敹???jsonb ?艘???皜嗾瘛?
--
-- 閮剛?:
--   - SECURITY INVOKER嚗???caller ????銝憭改?
--   - 銝??游? payload key ??
--   - 靽?????? key嚗 tombstone: deal_deleted / interaction_deleted嚗?
--   - 撠?jsonb ????抒? object ?艘??
--
-- ??蝑:
--   - top-level 蝘駁 15+ ????key嚗amelCase + snake_case嚗?
--   - 撠?jsonb ????抒?瘥?object ?瑁??見??key ?蕪
--   - 撠?jsonb ?拐辣?抒?撌Ｙ? object 銝楛撅日?餈湛??踹??漲??嚗??閬??游?嚗?
--
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sanitize_staff_event_payload(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
AS $$
DECLARE
  -- top-level ?? key ?”嚗amelCase + snake_case ?拍車?賢??賣項??
  sensitive_keys text[] := ARRAY[
    -- ?支?鞎餌
    'boothCost', 'booth_cost',
    'registrationFee', 'registration_fee',
    'commissionRate', 'commission_rate',
    'tableRental', 'table_rental',
    'chairRental', 'chair_rental',
    'umbrellaRental', 'umbrella_rental',
    'tableclothRental', 'tablecloth_rental',
    -- ??? / ?桀?
    'cost',
    'costAtTimeOfSale', 'cost_at_time_of_sale',
    'supplierInfo', 'supplier_info',
    'totalCost', 'total_cost',
    -- ?拇膜 / 瘥 / 瘛典
    'profitMargin', 'profit_margin',
    'grossMargin', 'gross_margin',
    'totalProfit', 'total_profit',
    'netProfit', 'net_profit',
    'profit'
  ];
  result jsonb;
  arr jsonb;
  cleaned_item jsonb;
  i int;
BEGIN
  -- ??嚗ull ?? object ?湔???
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RETURN payload;
  END IF;

  -- Step 1: 蝘駁 top-level ?? key
  result := payload;
  FOR i IN 1..array_length(sensitive_keys, 1) LOOP
    result := result - sensitive_keys[i];
  END LOOP;

  -- Step 2: ?? items[] ???嚗eal_closed 蝑?隞嗆???items嚗?
  -- 撠?????object嚗?餈游??典?璅?? key 蝘駁
  IF result ? 'items' AND jsonb_typeof(result->'items') = 'array' THEN
    arr := '[]'::jsonb;
    FOR i IN 0..jsonb_array_length(result->'items') - 1 LOOP
      cleaned_item := sanitize_staff_event_payload(result->'items'->i);
      arr := arr || jsonb_build_array(cleaned_item);
    END LOOP;
    result := jsonb_set(result, '{items}', arr, false);
  END IF;

  RETURN result;
END;
$$;



-- =============================================================================
-- Section 2: ?遣 staff_accessible_markets
-- =============================================================================
--
-- Staff branch ??甈? ??NULL
--   - booth_cost, registration_fee, commission_rate, total_profit
--   - table_rental, chair_rental, umbrella_rental, tablecloth_rental
--
-- Staff branch 靽?嚗?捱蝑?:
--   - deposit嚗?霅???嚗?
--   - table_free / chair_free / umbrella_free / tablecloth_free
--   - total_revenue / total_deals / total_interactions
--   - ?箸撣?鞈?
--
-- Owner branch 靽?摰甈?
--
-- ??嚗NION ALL 閬??拙?branch 甈???+ ?摰銝??
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF嚗???雿?NULL嚗?
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    NULL::numeric(10,2)                  AS registration_fee,    -- ?儭??急?
    NULL::numeric(10,2)                  AS booth_cost,          -- ?儭??急?
    m.deposit,                                                 -- ? 靽?嚗?霅???嚗?
    NULL::numeric(10,2)                  AS table_rental,        -- ?儭??急?
    NULL::numeric(10,2)                  AS chair_rental,        -- ?儭??急?
    NULL::numeric(10,2)                  AS umbrella_rental,     -- ?儭??急?
    NULL::numeric(10,2)                  AS tablecloth_rental,   -- ?儭??急?
    NULL::numeric(5,2)                   AS commission_rate,     -- ?儭??急?
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- ?儭??急?
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM ((markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
    JOIN staff_relationships sr ON ((sr.owner_id = mm.user_id)))
WHERE ((sr.staff_id = auth.uid()) AND (sr.status = 'active'::text))

UNION ALL

-- Branch 2: OWNER嚗??湔?雿?
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    m.registration_fee,                                       -- ??摰
    m.booth_cost,                                             -- ??摰
    m.deposit,                                                -- ??摰
    m.table_rental,                                           -- ??摰
    m.chair_rental,                                           -- ??摰
    m.umbrella_rental,                                        -- ??摰
    m.tablecloth_rental,                                      -- ??摰
    m.commission_rate,                                        -- ??摰
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ??摰
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    m.owner_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
WHERE (mm.user_id = auth.uid());



-- =============================================================================
-- Section 3: ?遣 staff_accessible_products
-- =============================================================================
--
-- Staff branch:
--   - cost ??NULL
--
-- Staff branch 靽?:
--   - price / stock / total_sold / category / name / market_id
--   - is_active / is_shared / description
--   - icon_name / color_code
--
-- Owner branch 靽?摰甈?
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_products AS
-- Branch 1: STAFF嚗ost ??NULL嚗?
SELECT
    p.id,
    p.market_id,
    p.name,
    p.category,
    p.price,
    NULL::numeric(10,2)                  AS cost,                -- ?儭??急?
    p.icon_name,
    p.color_code,
    p.stock,
    p.unlimited_stock,
    p.is_active,
    p.total_sold,
    p.description,
    p.created_at,
    p.updated_at,
    p.owner_id,
    p.is_shared,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (products p
    JOIN staff_relationships sr ON ((sr.owner_id = p.owner_id)))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (p.is_active = true))

UNION ALL

-- Branch 2: OWNER嚗??湔?雿?
SELECT
    p.id,
    p.market_id,
    p.name,
    p.category,
    p.price,
    p.cost,                                                    -- ??摰
    p.icon_name,
    p.color_code,
    p.stock,
    p.unlimited_stock,
    p.is_active,
    p.total_sold,
    p.description,
    p.created_at,
    p.updated_at,
    p.owner_id,
    p.is_shared,
    p.owner_id                   AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                 AS access_type
FROM products p
WHERE ((p.owner_id = auth.uid()) AND (p.is_active = true));



-- =============================================================================
-- Section 4: ?遣 staff_accessible_events
-- =============================================================================
--
-- Staff branch payload ??scrubbed嚗??sanitize_staff_event_payload嚗?
-- Staff branch ?園?甈?靽?嚗 tombstone: deal_deleted / interaction_deleted嚗?
-- Owner branch 靽?摰 payload
--
-- 4 ??UNION branch:
--   1. STAFF 撣?鈭辣
--   2. STAFF ?典?鈭辣嚗arket_id IS NULL嚗?
--   3. OWNER ?芸楛????隞?
--   4. OWNER 撣??鈭辣
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_events AS
-- Branch 1: STAFF嚗???隞塚?payload ?急?嚗?
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- ?儭??急?
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM ((events e
    JOIN market_members mm ON ((mm.market_id = e.market_id)))
    JOIN staff_relationships sr ON ((sr.owner_id = mm.user_id)))
WHERE ((sr.staff_id = auth.uid()) AND (sr.status = 'active'::text))

UNION ALL

-- Branch 2: STAFF嚗撅鈭辣嚗ayload ?急?嚗?
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- ?儭??急?
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (events e
    JOIN staff_relationships sr ON ((sr.owner_id = e.actor_id)))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (e.market_id IS NULL))

UNION ALL

-- Branch 3: OWNER嚗撌梁????隞塚?payload 摰嚗?
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ??摰
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    e.actor_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM events e
WHERE (e.actor_id = auth.uid())

UNION ALL

-- Branch 4: OWNER嚗????∩?隞塚?payload 摰嚗?
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ??摰
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    mm.user_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (events e
    JOIN market_members mm ON ((mm.market_id = e.market_id)))
WHERE ((mm.user_id = auth.uid()) AND (e.actor_id <> auth.uid()));



-- =============================================================================
-- Section 5: 憟敺?霅?SQL嚗犖撌亙銵?
-- =============================================================================
--
-- 憟??migration 敺???Supabase SQL Editor 頝誑銝?霅?SQL??
-- ??嚗taff ?亥岷??甈???NULL嚗wner ?亥岷摰??
--
-- ?? 撽? SQL ?券??transaction ??嚗?
--
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);
--   -- verification query
--   ROLLBACK;
--
-- - BEGIN/ROLLBACK 蝣箔?撽?蝯?敺?role ??jwt claim 銝?瘙⊥? session??
-- - 瘥?霅?block ?銝??transaction嚗?閬毽?剁???
-- - 撽???嚗? Staff嚗?-4嚗? ??Owner嚗?嚗?
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 撽? 1: Staff ??staff_accessible_markets嚗???雿???NULL嚗?
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);  -- ??撖阡? staff UUID

SELECT
    name,
    booth_cost,            -- ??嚗ULL
    commission_rate,       -- ??嚗ULL
    total_profit,          -- ??嚗ULL
    table_rental,          -- ??嚗ULL
    chair_rental,          -- ??嚗ULL
    umbrella_rental,       -- ??嚗ULL
    tablecloth_rental,     -- ??嚗ULL
    registration_fee,      -- ??嚗ULL
    deposit,               -- ??嚗???靽?????
    total_revenue,         -- ??嚗???
    total_deals,           -- ??嚗???
    total_interactions     -- ??嚗???
FROM staff_accessible_markets
LIMIT 1;

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 撽? 2: Staff ??staff_accessible_products嚗ost ? NULL嚗?
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT
    name,
    price,                 -- ??嚗???
    cost,                  -- ??嚗ULL
    stock,
    total_sold
FROM staff_accessible_products
LIMIT 1;

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 撽? 3: Staff ??staff_accessible_events.payload嚗???key ?◤蝘駁嚗?
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 3a. 瑼Ｘ top-level ?? key 銝???
SELECT
    type,
    payload ? 'boothCost'            AS has_boothCost,        -- ??嚗alse
    payload ? 'cost'                 AS has_cost,             -- ??嚗alse
    payload ? 'costAtTimeOfSale'     AS has_costAtTimeOfSale, -- ??嚗alse
    payload ? 'supplierInfo'         AS has_supplierInfo,     -- ??嚗alse
    payload ? 'profitMargin'         AS has_profitMargin,     -- ??嚗alse
    payload ? 'grossMargin'          AS has_grossMargin,      -- ??嚗alse
    payload ? 'totalProfit'          AS has_totalProfit,      -- ??嚗alse
    payload ? 'booth_cost'           AS has_booth_cost,       -- ??嚗alse
    payload ? 'commissionRate'       AS has_commissionRate    -- ??嚗alse
FROM staff_accessible_events
WHERE type = 'market_created'
LIMIT 5;

-- 3b. 瑼Ｘ deal_closed ?抒? items[] 撌Ｙ?蝯?銋歇?急?
SELECT
    type,
    jsonb_path_query_array(payload, '$.items[*]') AS items_array
FROM staff_accessible_events
WHERE type = 'deal_closed'
LIMIT 5;
-- ??嚗???item ?抒? cost / costAtTimeOfSale / supplierInfo / profit 蝑?key 銝???

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 撽? 4: Staff 隞?? tombstone 鈭辣
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT type, count(*)
FROM staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type;
-- ??嚗eal_deleted / interaction_deleted ?? row嚗ombstone 隞閬?

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 撽? 5: Owner ?亥岷隞????渲???
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);  -- ??撖阡? owner UUID

-- 5a. Owner ????
SELECT name, booth_cost, total_profit, commission_rate
FROM staff_accessible_markets
LIMIT 1;
-- ??嚗ooth_cost / total_profit / commission_rate ?賣?祕??

-- 5b. Owner ????
SELECT name, cost, price
FROM staff_accessible_products
LIMIT 1;
-- ??嚗ost ?舐?撖血?

-- 5c. Owner ??隞?payload
SELECT type, payload
FROM staff_accessible_events
LIMIT 1;
-- ??嚗ayload ?臬???JSONB

ROLLBACK;
*/


-- =============================================================================
-- Section 6: 撌脩?
-- =============================================================================
--
-- 1. 039 ?芾靽?staff_accessible_* view 撅?
--    E2 撌脰???Staff 隞?賡?摨” RLS ?湔 SELECT markets ????甈?
--    ?迨 C2.29B-2 敹?閬? base table RLS tightening
--    ??蝡臬??券蝘餃 staff-safe view / RPC 敺??嗥?摨”
--
-- 2. sanitize_staff_event_payload ?桀??芾???
--    - top-level ?? key 蝘駁
--    - items[] ????抒? object ?艘??
--    ?芣楛撅方??隞楷? object嚗? metadata ?抒? object嚗?
--    閬?蝥?曄??餅??Ｗ??游?
--
-- 3. 銝耨?孵?銵?RLS嚗2.29B-2 蝭?嚗?
--    銝耨?孵?蝡?
--    銝耨??PermissionGate / useUserRole
--    銝耨??C2.28 撌脣???頛?
--
-- 4. 憟敺撌?UI 隞甇?虜??嚗ermissionGate 撌?fail-closed嚗?
--    ? PermissionGate 撌脩???UI 撅斗? cost / profit ?蕪
--    039 ?臬 Supabase 蝡臬???撅日霅?
--
-- =============================================================================

-- ============================================================
-- END SOURCE: 039_staff_view_hardening.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: quick_test_database_compat_drop_staff_accessible_market_event_views.sql
-- ============================================================

-- Disposable bootstrap compatibility patch.
drop view if exists public.staff_accessible_events;
drop view if exists public.staff_accessible_markets;

-- ============================================================
-- END SOURCE: quick_test_database_compat_drop_staff_accessible_market_event_views.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 040_fix_staff_accessible_view_scope.sql
-- ============================================================

-- =============================================================================
-- 040_fix_staff_accessible_view_scope.sql
-- =============================================================================
--
-- C2.29B-1.1: Fix staff accessible view scope bug
-- 撱箇??交?: 2026-06-16
-- 撱箇??? Cursor (Codex)
-- ??? ? ?阮嚗?*撌?commit ??repo嚗?*?芸??典 Supabase**\*\*嚗?
--
-- ?? ??嚗遢?阮**撠憟**???典?隢?嚗?
--   1. 蝣箄? C2.29B-1 (039) 撌脫?????
--   2. 蝣箄? C2.29B-1 Post-Apply Smoke Test 摰?
--   3. 鈭箏極??Supabase SQL Editor 憟?祆?
--   4. 憟敺? 禮5 撽? SQL
--   5. 撽???敺? commit 憟蝝??
--
-- 撠??餅??ｇ?C2.29B-1 Post-Apply 蝺?撖行葫?潛嚗?
--   #A staff_accessible_markets.owner_branch scope leak
--      ?∪極??market_members ??row (role='staff')嚗?
--      039 owner branch ??`mm.user_id = auth.uid()` 瘝炎??role嚗?
--      ?∪極?銝?owner branch嚗ccess_type='owner' ?踹摰??甈?
--      ??039 staff branch ?急?摰鋡怎???
--   #B staff_accessible_events.owner_branch_4 scope leak
--      ?見??bug嚗撌亙 market_members ??row
--      ???∪極?賭葉 owner branch 4 ?踹摰 payload
--   #C deleted markets 隞◤ Staff ?脖?
--      4 ??view 蝯??賣??蕪 is_deleted
--   #D global product_created / product_deleted events
--      staff_accessible_events Branch 2 霈撌亦???market_id IS NULL
--      ??product_created / product_deleted 鈭辣
--      ???垢 useSync ? missing_market_id ?歲??撌脩??嚗?
--
-- 撠???SQL 閫撖??冽鋆? 2026-06-16嚗?
--   1. staff_accessible_markets ????market id ???箇 staff + owner branch
--   2. 憭?is_deleted=true ??market 隞◤ Staff ?脖?
--   3. staff_accessible_events market_id IS NULL 鈭辣銝哨?
--      - product_deleted: 13 ??
--      - product_created: 8 ??
--   4. ?垢 useSync log ?啣
--      `Skipping event outside local scoped dataset
--       reason: missing_market_id
--       eventType: product_created`
--
-- 閮剛???:
--   - 040 ?芾靽?staff_accessible_* view 撅?
--   - 040 銝耨?孵?銵?RLS嚗? #4 direct SELECT 隞? C2.29B-2嚗?
--   - 040 銝耨?寞??migration
--   - 040 銝耨?孵?蝡?/ PermissionGate / useUserRole
--
-- 靽格迤蝑嚗wner branch 敹??湔??m.owner_id = auth.uid()嚗?
--   1. staff_accessible_markets
--      - Owner branch ?寧 `m.owner_id = auth.uid()`嚗?靘陷 market_members嚗?
--      - Staff branch ?? `COALESCE(m.is_deleted, false) = false`
--   2. staff_accessible_events
--      - Branch 4 (OWNER team events) ?寧 `m.owner_id = auth.uid()` JOIN
--      - Branch 1 (STAFF market events) ?寧 `m.owner_id` JOIN staff_relationships
--        ?踹??撌亙 market_members ?賭葉 owner branch 4?◢??
--      - ??`is_deleted = false` ?蕪
--      - Branch 2 (STAFF global events) ?寧 `e.actor_id = m.owner_id JOIN staff`
--        ?踹? product_created / product_deleted ?賭葉?⊿? owner
--   3. staff_accessible_products
--      - 040 蝣箄? Owner branch ??`p.owner_id = auth.uid()`嚗歇?舫見嚗 bug嚗?
--      - Staff branch ?? `p.is_active = true`嚗歇?舫見嚗 bug嚗?
--      - 040 銝甇?view嚗 bug嚗?
--
-- ?箔? Owner branch ??`m.owner_id` 瘥?`mm.user_id + mm.role='owner'` 憟?
--   - m.owner_id ??markets 銵函?鈭祕甈?嚗 trigger 蝬剛風
--   - mm.role ??market_members 銵函?甈?嚗?鞈?trigger (002 / 021) 甇?Ⅱ?
--   - 憒? 021 trigger 瞍? owner row嚗wner branch ?? owner ????
--   - 035 撌脩???`current_user_owned_market_ids()` helper嚗?湔??
--
-- ?箔? Staff branch ?寧 m.owner_id JOIN staff_relationships:
--   - ?∪極?航銋? is_collaborative 撣?鋡怠???market_members (role='staff')
--   - 039 Staff branch ?? `sr.owner_id = mm.user_id` 銝????∪極?芾??
--     "?芸楛鋡怠??脣" ???銝???雿撌乩??航??mm 銝剜 staff嚗銝?Branch 4
--   - 040 ?寧 `sr.owner_id = m.owner_id` ?湔?? owner_id 銝莎?
--     銝?鞈?market_members ??membership
--
-- 蝭??嚗??摰?:
--   - 040 ?芾靽?staff_accessible_* view 撅?
--   - 040 銝耨?孵?銵?RLS嚗2.29B-2 蝭?嚗?
--   - 040 銝耨?寞??migration
--   - 040 銝耨?孵?蝡?/ PermissionGate / useUserRole
--   - 040 銝?亙??典 Supabase
--   - 040 銝?支遙雿?view branch嚗?摰??芯耨璇辣嚗?
--
-- =============================================================================


-- =============================================================================
-- Section 1: ?遣 staff_accessible_markets
-- =============================================================================
--
-- 靽格迤閬?:
--   - Owner branch: WHERE m.owner_id = auth.uid()嚗?靘陷 market_members嚗?
--   - Staff branch: ??is_deleted = false ?蕪
--   - Staff branch: ?寧 m.owner_id 銝?staff_relationships
--     嚗??is_collaborative 撣??撌亙???market_members ?賭葉 owner branch嚗?
--
-- 瘜冽?嚗NION ALL 閬??拙?branch 甈???+ ?摰銝??
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF嚗???雿?NULL + ? deleted market + ?? owner_id 銝莎?
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    NULL::numeric(10,2)                  AS registration_fee,    -- ?儭??急?
    NULL::numeric(10,2)                  AS booth_cost,          -- ?儭??急?
    m.deposit,                                                 -- ? 靽?
    NULL::numeric(10,2)                  AS table_rental,        -- ?儭??急?
    NULL::numeric(10,2)                  AS chair_rental,        -- ?儭??急?
    NULL::numeric(10,2)                  AS umbrella_rental,     -- ?儭??急?
    NULL::numeric(10,2)                  AS tablecloth_rental,   -- ?儭??急?
    NULL::numeric(5,2)                   AS commission_rate,     -- ?儭??急?
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- ?儭??急?
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (markets m
    JOIN staff_relationships sr ON (sr.owner_id = m.owner_id))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (COALESCE(m.is_deleted, false) = false))                   -- ?? ?撌脣?文???

UNION ALL

-- Branch 2: OWNER嚗??湔?雿?+ ?湔 owner ?斗嚗?
-- ?? 敺?`mm.user_id = auth.uid()` ?寧 `m.owner_id = auth.uid()`
--   ??嚗撌亙 market_members ??role='staff' row嚗?隤文銝?owner branch
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    m.registration_fee,                                       -- ??摰
    m.booth_cost,                                             -- ??摰
    m.deposit,                                                -- ??摰
    m.table_rental,                                           -- ??摰
    m.chair_rental,                                           -- ??摰
    m.umbrella_rental,                                        -- ??摰
    m.tablecloth_rental,                                      -- ??摰
    m.commission_rate,                                        -- ??摰
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ??摰
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    m.owner_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM markets m
WHERE (m.owner_id = auth.uid());                                -- ?? ?湔 owner ?斗



-- =============================================================================
-- Section 2: staff_accessible_products嚗?霈嚗?
-- =============================================================================
--
-- 040 撖拇蝯?嚗迨 view ??owner-branch scope bug
--   - Owner branch: WHERE p.owner_id = auth.uid()嚗歇甇?Ⅱ嚗?靘陷 market_members嚗?
--   - Staff branch: ?? sr.staff_id = auth.uid() ?斗
--   - ??branch ?賜 p.is_active = true ?蕪頠??
--
-- 040 銝?甇?view嚗??敹????湧◢?迎?
-- =============================================================================

-- 嚗霈嚗?


-- =============================================================================
-- Section 3: ?遣 staff_accessible_events
-- =============================================================================
--
-- 靽格迤閬?:
--   - Branch 1 (STAFF market events): ?寧 m.owner_id 銝?staff_relationships
--     ??is_deleted ?蕪
--   - Branch 2 (STAFF global events): ?寧 m.owner_id 銝?staff_relationships
--     嚗??舐 actor_id嚗??product_created with market_id=NULL 隤文銝哨?
--     ?? 040 靽???嚗???Branch 2 蝯?嚗??is_deleted + ?酉閫?
--   - Branch 3 (OWNER self events): 靽?
--   - Branch 4 (OWNER team events): ?寧 m.owner_id ?湔?斗
--     嚗? mm.user_id = auth.uid() ?寧 JOIN markets m ON m.id = e.market_id
--       WHERE m.owner_id = auth.uid()嚗?
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_events AS
-- Branch 1: STAFF嚗???隞塚?payload ?急?嚗? owner_id 銝莎?
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- ?儭??急?
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (events e
    JOIN markets m ON (m.id = e.market_id)                       -- ?? ?? markets JOIN
    JOIN staff_relationships sr ON (sr.owner_id = m.owner_id))  -- ?? ?? owner_id 銝?
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (COALESCE(m.is_deleted, false) = false))                  -- ?? ?撌脣?文???

UNION ALL

-- Branch 2: STAFF嚗撅鈭辣嚗ayload ?急?嚗?
-- ?? 040 靽???嚗???蝯?嚗??酉閫?牧?◢??
--   - ?∪極?? `e.actor_id = owner_id JOIN staff_relationships` ?賭葉
--   - product_created / product_deleted 瘝? market_id 隞??賭葉
--   - ?垢 useSync ?誑 missing_market_id 頝喲?嚗歇?亥??綽?
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- ?儭??急?
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (events e
    JOIN staff_relationships sr ON (sr.owner_id = e.actor_id))
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (e.market_id IS NULL))

UNION ALL

-- Branch 3: OWNER嚗撌梁????隞塚?payload 摰嚗?
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ??摰
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    e.actor_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM events e
WHERE (e.actor_id = auth.uid())

UNION ALL

-- Branch 4: OWNER嚗????∩?隞塚?payload 摰嚗??owner ?斗嚗?
-- ?? 敺?`mm.user_id = auth.uid()` ?寧 `m.owner_id = auth.uid()`
--   ??嚗撌亙 market_members ??row嚗?隤文銝?owner branch 4
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ??摰
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    m.owner_id                    AS relationship_owner_id,    -- ?? ?寧 m.owner_id
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (events e
    JOIN markets m ON (m.id = e.market_id))                    -- ?? JOIN markets
WHERE ((m.owner_id = auth.uid())                                -- ?? ?湔 owner
  AND (e.actor_id <> auth.uid()));



-- =============================================================================
-- Section 4: 憟敺?霅?SQL嚗犖撌亙銵?
-- =============================================================================
--
-- ?? 撽? SQL ?券??transaction ??嚗?
--
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);
--   -- verification query
--   ROLLBACK;
--
-- 撽???嚗?
--   1. Staff 銝???access_type='owner' ?賭葉
--   2. Staff 銝???銴?market id
--   3. Staff 銝???is_deleted=true market
--   4. Owner 隞?摰鞈?
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 撽? 1: Staff 銝??賭葉 owner branch嚗cope leak ?脰風嚗?
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 1a. 銝???access_type='owner'
SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;
-- ??嚗??1 row嚗ccess_type='staff'嚗ount = (閰?owner ??撣???- 撌脣?斗)

-- 1b. 銝???銝 market id ?箇?拇活
SELECT id, count(*)
FROM staff_accessible_markets
GROUP BY id
HAVING count(*) > 1;
-- ??嚗? rows

-- 1c. 銝???is_deleted=true
SELECT id, name, is_deleted
FROM staff_accessible_markets
WHERE COALESCE(is_deleted, false) = true;
-- ??嚗? rows

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 撽? 2: Staff events 銝??賭葉 owner branch
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 2a. 銝???access_type='owner'
SELECT access_type, count(*)
FROM staff_accessible_events
GROUP BY access_type;
-- ??嚗??1 row嚗ccess_type='staff'

-- 2b. payload 隞? scrubbed嚗oothCost 銝?摮嚗?
SELECT
  type,
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost')      AS has_cost,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo
FROM staff_accessible_events
WHERE type IN ('market_created', 'product_created', 'deal_closed')
GROUP BY type;
-- ??嚗???has_* = 0

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 撽? 3: Staff 銝?? global product_created / product_deleted 隤文銝?
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 3a. 蝣箄? staff global events ?賊?
SELECT type, count(*)
FROM staff_accessible_events
WHERE market_id IS NULL
GROUP BY type;
-- ??嚗roduct_created / product_deleted 隞??賭葉嚗ranch 2 靽?嚗?
--   雿?owner 撌?verify ???垢 useSync ?誑 missing_market_id 頝喲?

-- 3b. 蝣箄? staff market events嚗arket_id NOT NULL嚗? access_type
SELECT
  COUNT(*) FILTER (WHERE access_type = 'staff')  AS staff_branch,
  COUNT(*) FILTER (WHERE access_type = 'owner')  AS owner_branch
FROM staff_accessible_events
WHERE market_id IS NOT NULL;
-- ??嚗wner_branch = 0嚗撌亙?賢銝?staff branch嚗?

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 撽? 4: Owner 隞?摰鞈?
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);  -- ??撖阡? owner UUID

-- 4a. Owner ????
SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;
-- ??嚗ccess_type='owner'嚗ount = (閰?owner ??撣???

-- 4b. Owner ??markets ?祕??甈?
SELECT name, booth_cost, total_profit, commission_rate
FROM staff_accessible_markets
WHERE access_type = 'owner'
LIMIT 1;
-- ??嚗ooth_cost / total_profit / commission_rate ?賣?祕??

-- 4c. Owner ????cost
SELECT name, cost, price
FROM staff_accessible_products
WHERE access_type = 'owner'
LIMIT 1;
-- ??嚗ost ?舐?撖血?

-- 4d. Owner ??events payload
SELECT type, payload->>'boothCost' AS booth_cost
FROM staff_accessible_events
WHERE access_type = 'owner' AND type = 'market_created'
LIMIT 1;
-- ??嚗ayload ?臬???JSONB嚗ooth_cost 銝 NULL

-- 4e. Owner 隞?撣??鈭辣嚗隞?嗥?嚗?
SELECT type, count(*)
FROM staff_accessible_events
WHERE access_type = 'owner' AND actor_id <> auth.uid()
GROUP BY type;
-- ??嚗?憭車憿?嚗arket_created / deal_closed / interaction_recorded / 蝑?

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 撽? 5: 040 憟??vs 憟敺??改???markets ?賊?撌桃蝣箄? scope ?嗆?嚗?
-- -----------------------------------------------------------------------------
/*
-- 憟 040 ??頝?甈∴???staff_id嚗?
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);
SELECT count(*) AS pre_040_markets FROM staff_accessible_markets;
SELECT count(*) AS pre_040_events FROM staff_accessible_events;
ROLLBACK;

-- 憟 040 敺?頝?甈?
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);
SELECT count(*) AS post_040_markets FROM staff_accessible_markets;
SELECT count(*) AS post_040_events FROM staff_accessible_events;
ROLLBACK;

-- ??嚗ost_040_markets << pre_040_markets嚗??owner branch ?賭葉嚗?
--       post_040_events ?亥? pre_040_events - (owner branch 4 ?賭葉??
*/


-- =============================================================================
-- Section 5: 撌脩?
-- =============================================================================
--
-- 1. 040 ?芾靽?staff_accessible_* view 撅?
--    E2 撌脰???Staff 隞?賡?摨” RLS ?湔 SELECT markets ????甈?
--    ?迨 C2.29B-2 隞?閬? base table RLS tightening
--    ??蝡臬??券蝘餃 staff-safe view / RPC 敺??嗥?摨”
--
-- 2. Branch 2 (STAFF global events) 040 靽?銝
--    ?∪極隞?? market_id IS NULL ??product_created / product_deleted
--    ?垢 useSync 撌脩 missing_market_id 頝喲?嚗歇?伐?
--    憸券嚗?亙? owner ?寧 global product_created 撖怠?? payload嚗?
--          ?∪極 Branch 2 隞??嚗? payload 撌?scrubbed嚗?
--    撱箄降嚗2.29B-2 閰摯?臬??Branch 2 ? Branch 2 ??is_active ?蕪
--
-- 3. staff_accessible_products 040 銝??湛???bug嚗?
--    蝬剜??Ｘ? `p.owner_id = auth.uid()` + `p.is_active = true` 蝯?
--
-- 4. 040 銝耨?孵?銵?RLS
--    銝耨?孵?蝡?
--    銝耨??PermissionGate / useUserRole
--    銝耨??C2.28 撌脣???頛?
--
-- 5. 憟敺撌?UI 隞甇?虜??嚗ermissionGate 撌?fail-closed嚗?
--    040 ?舀蝺?scope嚗撌亦??唳撠?嚗??舀撖?
--    ?亙?蝡?useSync 撠撌亦?銝?典? market???迤蝣綽?UI 銝? regression
--
-- =============================================================================


-- =============================================================================
-- Section 6: 憟?孵?嚗犖撌伐?
-- =============================================================================
--
-- 撱箄降甇??憟?蝙??transaction嚗?
--
--   BEGIN;
--   -- 鞎潔? Section 1 + 3 ??migration body
--   -- (staff_accessible_markets ?遣 + staff_accessible_events ?遣)
--   -- staff_accessible_products 040 銝???
--
--   -- 蝡頝?禮4 撽? SQL
--   -- ??嚗?
--   --   1a. ?∪極?芸銝?access_type='staff'
--   --   1b. 瘝??? market id
--   --   1c. 瘝? is_deleted=true market
--   --   2a. ?∪極 events ?芸銝?access_type='staff'
--   --   4a-4e. Owner 隞?摰鞈?
--
--   -- ?券??嚗?
--   COMMIT;
--   -- 隞颱?憭望?嚗?
--   --   ROLLBACK;
--
-- ??嚗?
--   - 銝??冽撽???COMMIT
--   - 撽???嚗? Staff嚗?-3嚗? ??Owner嚗?嚗? ?敺?敺??改?5嚗?
--   - 撽?摰?敺????函????湔 docs/C2.29B_VIEW_SCOPE_AUDIT_2026_06_15.md嚗?
--
-- =============================================================================

-- ============================================================
-- END SOURCE: 040_fix_staff_accessible_view_scope.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 041_tighten_base_table_select_rls.sql
-- ============================================================

-- ============================================================
-- Phase C2.29B-2.1: Base Table SELECT RLS Tightening
-- Migration: 041_tighten_base_table_select_rls.sql
-- Date: 2026-06-16
-- Severity: P0 (Owner / Staff data isolation)
-- Description:
--   1. markets: replace markets_select_secure (uses current_user_market_ids)
--      with markets_select_owner_only (uses owner_id = auth.uid()).
--      ??Staff SELECT markets = 0 row.
--      ??Staff must go through staff_accessible_markets view.
--   2. products: drop "Users can view own and team products" (014, includes
--      team + is_shared path that exposes cost to staff) and any other
--      staff-friendly SELECT policy; replace with products_select_owner_only.
--      ??Staff SELECT products = 0 row.
--      ??Staff must go through staff_accessible_products view.
--   3. events: drop both legacy SELECT policies
--      - "?冽?臭誑?亦??芸楛??隞嗅?撣?鈭辣" (015, uses market_members)
--      - "users_can_view_events" (online-only, simplified)
--      Replace with events_select_owner_only that is STRICTLY owner-only:
--        - market_id IN (owned markets)  --  owner ??撣?鈭辣
--        - market_id IS NULL AND actor_id = auth.uid()
--          AND EXISTS (markets.owner_id = auth.uid())  --  owner ?芸楛撖怎??典?鈭辣
--      Note: actor_id = auth.uid() alone is REMOVED ??staff who wrote
--      an event (e.g. via the 025 staff_relationships insert path) would
--      otherwise still be able to SELECT events directly with
--      actor_id = auth.uid(). The new condition ties global events to
--      the actor being an owner of at least one market.
--      ??Staff SELECT events = 0 row.
--      ??Staff must go through staff_accessible_events view.
--
-- Helper format reminder:
--   current_user_owned_market_ids()  returns  TABLE(id UUID)
--   (per 035_fix_p0_rls_security.sql line 60-70)
--   ??market_id IN (SELECT id FROM public.current_user_owned_market_ids())
--   The alternate form SELECT * also works but is less explicit.
--
-- View security mode reminder (CRITICAL):
--   staff_accessible_* views must be SECURITY DEFINER for 041 to work
--   as designed. If they are SECURITY INVOKER, the view's internal
--   queries inherit the caller's RLS context, and 041 will break
--   staff_accessible_* in the following ways:
--     - Staff reading staff_accessible_markets will see 0 rows (the
--       view's JOIN to markets will hit markets_select_owner_only
--       which requires owner_id = auth.uid()).
--     - Owner reading staff_accessible_events Branch 3
--       (actor_id = auth.uid()) will miss market_id IS NULL events
--       because the new events policy requires actor IS owner.
--   Run the preflight in STEP 0 before applying. If any view is
--   INVOKER, STOP and add 042 to fix view ownership first
--   (out of scope for 041).
--
-- Does NOT touch:
--   - staff_accessible_markets / products / events views (039 + 040)
--   - sanitize_staff_event_payload() (039)
--   - market_members / staff_relationships / staff_invitations RLS
--   - INSERT / UPDATE / DELETE policies on markets / products / events
--   - profiles / market_invitations RLS
--   - Existing trigger / function / RPC
--
-- IMPORTANT:
--   - This is a DESTRUCTIVE migration for the staff SELECT path.
--   - Staff clients MUST go through staff_accessible_* view.
--   - Owner clients (and services running with auth.uid() == owner) must
--     either SELECT base tables directly or call staff_accessible_* view.
--   - The following service / repair paths run with the user's auth.uid()
--     and thus are subject to the new RLS. Each MUST be owner-only:
--       lib/db/recovery.ts:240                       (.from('products'))
--       lib/sync/owner-revenue-gap-repair.ts:328/347 (.from('markets' / 'events'))
--       lib/supabase/migration.ts:204-208            (.from('events'))
--     If any of these are ever invoked from a staff session, they will
--     silently return 0 rows. Pre-apply audit required.
--   - This migration is NOT yet applied to Supabase. Execute only after
--     review and the pre-apply checklist in
--     docs/C2.29B-2_1_RLS_MIGRATION_DRAFT_2026_06_16.md
-- ============================================================

-- ============================================================
-- STEP 0: Preflight ??verify view security mode + helper format
-- Refuses to proceed if any staff_accessible_* view is SECURITY INVOKER.
-- Run each query manually, then if all pass, mark a session variable
-- to acknowledge the preflight. The DO block below checks for that
-- acknowledgment and RAISES otherwise.
-- ============================================================

-- P0.1: Helper return type
-- Expected: TABLE (id uuid)
SELECT pg_get_function_result('public.current_user_owned_market_ids()'::regprocedure) AS owned_market_ids_return_type;
-- If this returns 'TABLE (id uuid)' ??OK.
-- If it returns 'SETOF uuid' ??use SELECT * instead of SELECT id (both work
-- for TABLE return; for SETOF they are equivalent; current code uses
-- SELECT id which is correct for the current 035 implementation).

-- P0.2: Helper is SECURITY DEFINER
SELECT p.prosecdef AS is_security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'current_user_owned_market_ids';
-- Expected: t

-- P0.3: View security mode
--   In PostgreSQL 15+, CREATE OR REPLACE VIEW preserves the existing
--   view's security_invoker flag. If a view was created on PG14 as
--   SECURITY DEFINER (the PG14 default) and never re-created with
--   security_invoker = true, it stays DEFINER. We need DEFINER for
--   041 to work.
SELECT
  c.relname AS view_name,
  CASE
    WHEN c.reloptions IS NULL THEN 'security_definer (default for PG14-created views)'
    WHEN c.reloptions::text LIKE '%security_invoker%' THEN 'SECURITY INVOKER (BREAKS 041)'
    ELSE 'security_definer (custom options)'
  END AS security_mode,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'staff_accessible_markets',
    'staff_accessible_products',
    'staff_accessible_events'
  )
ORDER BY c.relname;
-- Expected: all 3 rows show security_definer.
-- If any row shows "SECURITY INVOKER (BREAKS 041)" ??STOP, do not apply.
--   The user must run a follow-up migration to flip the view to DEFINER
--   (out of scope for 041).

-- P0.4: Hard gate ??refuse to run STEP 2-5 if any view is INVOKER.
DO $$
DECLARE
  v_invoker_count int;
BEGIN
  SELECT count(*) INTO v_invoker_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN (
      'staff_accessible_markets',
      'staff_accessible_products',
      'staff_accessible_events'
    )
    AND c.reloptions IS NOT NULL
    AND c.reloptions::text LIKE '%security_invoker%';

  IF v_invoker_count > 0 THEN
    RAISE EXCEPTION
      'Preflight P0.4 failed: % staff_accessible_* view(s) are SECURITY INVOKER. 041 will break staff views. Aborting. Fix view security mode first (out of scope for 041).',
      v_invoker_count;
  END IF;

  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- STEP 1: Helper function (no parameters, prevents injection)
-- Reuse current_user_owned_market_ids() (already created in 035).
-- ============================================================

-- Verify the helper still exists and is SECURITY DEFINER
DO $$
DECLARE
  v_security_type boolean;
BEGIN
  SELECT p.prosecdef INTO v_security_type
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'current_user_owned_market_ids';

  IF v_security_type IS NULL THEN
    RAISE EXCEPTION 'current_user_owned_market_ids() does not exist. Run 035 first.';
  ELSIF v_security_type = false THEN
    RAISE EXCEPTION 'current_user_owned_market_ids() is not SECURITY DEFINER. Refusing to use it.';
  END IF;

  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- STEP 2: Drop all markets SELECT policies, then create owner-only
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'markets'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.markets', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "markets_select_owner_only"
ON public.markets FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);


-- ============================================================
-- STEP 3: Drop all products SELECT policies, then create owner-only
-- Note: 014 created "Users can view own and team products" with three
-- OR branches (own / team via market_members / is_shared = true).
-- The team and shared branches both leak cost to staff. Drop everything
-- and replace with strict owner check.
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'products'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "products_select_owner_only"
ON public.products FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
);


-- ============================================================
-- STEP 4: Drop all events SELECT policies, then create owner-only
-- Note: 015 created "?冽?臭誑?亦??芸楛??隞嗅?撣?鈭辣" with
--   actor_id = auth.uid()
--   OR market_id IN (SELECT market_id FROM market_members WHERE user_id = auth.uid())
-- Plus the online-only "users_can_view_events" simplified version.
-- Both let staff SELECT events via market_members. Drop and replace.
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'events'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.events', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "events_select_owner_only"
ON public.events FOR SELECT
TO authenticated
USING (
  -- ?芸楛撣???隞塚??? markets.owner_id ?湔 owner ?斗嚗?
  market_id IN (SELECT id FROM public.current_user_owned_market_ids())
  OR
  -- ?芸楛撱箇??撅鈭辣嚗arket_id IS NULL嚗?銝撌勗?????? owner
  -- ?箔?閬?EXISTS嚗蝝?actor_id = auth.uid() ?? staff ?? 025
  -- staff_relationships 撖怠??隞嗡???SELECT嚗? EXISTS ?葬??owner??
  (
    market_id IS NULL
    AND actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.markets m WHERE m.owner_id = auth.uid())
  )
);


-- ============================================================
-- STEP 5: Note about INSERT / UPDATE / DELETE (intentionally untouched)
-- ============================================================

-- events INSERT: "?冽?臭誑?鈭辣_v3" (025) is preserved as-is.
--   It allows staff to insert events into markets they are bound to via
--   staff_relationships (acting as staff), which is required for the
--   staff sync flow. actor_id is preserved as the staff's own UUID.
-- markets INSERT / UPDATE: "authenticated_can_insert_markets" (and any
--   other authenticated INSERT / UPDATE) are preserved as-is. Triggers
--   gate actual writes (002 / 008 / 021).
-- products INSERT / UPDATE / DELETE: 014 owner-only policies are
--   preserved as-is.
-- market_members / staff_relationships / staff_invitations: 035 P0 RLS
--   is preserved as-is.

-- ============================================================
-- VERIFICATION SQL (read-only, run in SQL Editor after migration)
-- ============================================================

/*

-- V1: markets has exactly one SELECT policy, owner-only
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND cmd = 'SELECT';
-- Expected: 1 row named 'markets_select_owner_only', qual contains 'owner_id = auth.uid()'

-- V2: products has exactly one SELECT policy, owner-only
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND cmd = 'SELECT';
-- Expected: 1 row named 'products_select_owner_only', qual contains 'owner_id = auth.uid()'

-- V3: events has exactly one SELECT policy, owner-only (no naked actor_id)
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'events' AND cmd = 'SELECT';
-- Expected: 1 row named 'events_select_owner_only', qual contains
--           'current_user_owned_market_ids' AND 'EXISTS' AND
--           'market_id IS NULL'
-- qual must NOT contain a bare 'actor_id = auth.uid()' without EXISTS.

-- V4: All legacy staff-friendly SELECT policies are gone
SELECT tablename, policyname FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT'
  AND tablename IN ('markets', 'products', 'events')
  AND policyname IN (
    'markets_select_secure',
    'Users can view own and team products',
    'products_select_temp',
    '?冽?臭誑?亦??芸楛??隞嗅?撣?鈭辣',
    'users_can_view_events'
  );
-- Expected: 0 rows

-- ============================================================
-- STAFF DIRECT TABLE SELECT (must be 0 rows)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- Staff direct markets SELECT ??expected 0
SELECT count(*) AS staff_markets_direct FROM markets;

-- Staff direct products SELECT ??expected 0
SELECT count(*) AS staff_products_direct FROM products;

-- Staff direct events SELECT ??expected 0
SELECT count(*) AS staff_events_direct FROM events;

ROLLBACK;

-- ============================================================
-- STAFF VIEW STILL WORKS (?望???)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT count(*) AS staff_markets_view FROM staff_accessible_markets;
SELECT count(*) AS staff_products_view FROM staff_accessible_products;
SELECT count(*) AS staff_events_view FROM staff_accessible_events;

-- spot-check: staff markets financial fields are NULL
SELECT
  count(*) FILTER (WHERE booth_cost IS NULL) AS booth_cost_null,
  count(*) FILTER (WHERE total_profit IS NULL) AS total_profit_null,
  count(*) FILTER (WHERE commission_rate IS NULL) AS commission_rate_null
FROM staff_accessible_markets;

-- spot-check: staff products cost is NULL
SELECT
  count(*) FILTER (WHERE cost IS NULL) AS cost_null
FROM staff_accessible_products;

-- spot-check: staff events payload has no sensitive top-level keys
SELECT
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost') AS has_cost,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo
FROM staff_accessible_events;

ROLLBACK;

-- ============================================================
-- OWNER DIRECT TABLE SELECT (must work, no regression)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '0d21abfe-136f-4c42-987b-14928593f323', true);

-- Owner markets direct SELECT ??expected > 0
SELECT count(*) AS owner_markets_direct FROM markets;

-- Owner products direct SELECT ??expected > 0
SELECT count(*) AS owner_products_direct FROM products;

-- Owner events direct SELECT ??expected > 0
SELECT count(*) AS owner_events_direct FROM events;

-- Owner can see full financial fields
SELECT id, name, booth_cost, total_profit, commission_rate
FROM markets
LIMIT 5;

-- Owner can see full product cost
SELECT id, name, cost, price
FROM products
LIMIT 5;

-- Owner can see full event payload
SELECT id, type, payload
FROM events
LIMIT 5;

ROLLBACK;

-- ============================================================
-- OWNER VIEW STILL WORKS
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '0d21abfe-136f-4c42-987b-14928593f323', true);

SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;

SELECT access_type, count(*)
FROM staff_accessible_events
GROUP BY access_type;

ROLLBACK;

*/

-- ============================================================
-- Done.
-- Next steps (outside this migration):
--   - C2.29B-2.2: Frontend type-level guard (prevent future code from
--     re-introducing staff ??base-table queries)
--   - C2.29B-2.3: Full chain E1-E5 verification (re-run E1-E3 from
--     C2.29 + add E4 base-table direct SELECT + E5 build-time guard)
--   - Conditional 042: ONLY if STEP 0 P0.3 reports any view as
--     SECURITY INVOKER, create a follow-up migration to flip that
--     view to SECURITY DEFINER before re-applying 041. Out of scope
--     for 041 (do not create 042 proactively).
-- ============================================================

-- ============================================================
-- END SOURCE: 041_tighten_base_table_select_rls.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: quick_test_database_compat_drop_staff_accessible_markets_view.sql
-- ============================================================

-- Disposable bootstrap compatibility patch.
drop view if exists public.staff_accessible_markets;

-- ============================================================
-- END SOURCE: quick_test_database_compat_drop_staff_accessible_markets_view.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 042_preserve_staff_rental_existence.sql
-- ============================================================

-- ============================================================
-- Phase C2.30A-1.1: Staff Rental Amount Preservation
-- Migration: 042_preserve_staff_rental_existence.sql
-- Date: 2026-06-17
-- Severity: P1嚗撌亥身???炊?歹?
-- 撱箇??? Cursor (Codex)
--
-- ??嚗?
-- staff_accessible_markets view 撠撌?branch ??table_rental / chair_rental /
-- umbrella_rental / tablecloth_rental ?券閮剔 NULL嚗窒镼?039_staff_view_hardening嚗?
-- ???游撌亦??啣???嚗arket.tableRental ??undefined嚗?
-- StaffMarketDetailView ??瘀?tableFree || tableRental > 0 || ?芸?嚗?
-- 瘞賊??賢???
--
-- 閮剛?靽格迤嚗?
-- ?∪極?閬身??行蝘????冽 UI 憿舐內?歇?輻? / ?芸? / ?祥??????
-- ???祈澈撠撌亦靽?敹?嚗撌交靘停閬?撌梯?銝?撣嗉身??嚗?
-- ?湔靽? owner 閮剔???嚗?
-- - ??閮?tableRental = 500 ???∪極? table_rental = 500 ??UI 憿舐內?歇?輻???
-- - ??閮?tableRental = 0   ???∪極? table_rental = 0   ??UI 憿舐內???
-- - ??閮?tableFree = true   ???∪極? table_free = true   ??UI 憿舐內??鞎餅?靘?
--
-- ?? PermissionGate.ts嚗arket + event entity ??rental 甈?銝??箸???
-- 蝣箔? events replay ??payload.tableRental 隞神?亙???snapshot??
--
-- Owner branch 銝?嚗????湧?憿???
-- ============================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF嚗???雿??閮剖?摮?找???
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    NULL::numeric(10,2)                  AS registration_fee,    -- ?儭??急?
    NULL::numeric(10,2)                  AS booth_cost,          -- ?儭??急?
    m.deposit,                                                 -- ? 靽?嚗?霅???嚗?
    -- ??閮剖?蝘???靽?嚗撌仿??仿??歇?輻? / ?芸? / ?祥????
    -- UI ?斗嚗ableFree=true ???祥?? / tableRental > 0 ??撌脫蝘?/ ?嗡? ???芸?
    -- ???祈澈撠撌亦靽?敹?嚗??急?嚗?平???改?銝?鋡怎奎?剖???敺?
    m.table_rental,
    m.chair_rental,
    m.umbrella_rental,
    m.tablecloth_rental,
    NULL::numeric(5,2)                   AS commission_rate,     -- ?儭??急?
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- ?儭??急?
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM ((markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
    JOIN staff_relationships sr ON ((sr.owner_id = mm.user_id)))
WHERE ((sr.staff_id = auth.uid()) AND (sr.status = 'active'::text))

UNION ALL

-- Branch 2: OWNER嚗??湔?雿?
SELECT
    m.id,
    m.owner_id,
    m.name,
    m.location,
    m.start_date,
    m.end_date,
    m.status,
    m.early_entry_enabled,
    m.early_entry_time,
    m.check_in_time,
    m.operating_start_time,
    m.operating_end_time,
    m.registration_fee,                                       -- ??摰
    m.booth_cost,                                             -- ??摰
    m.deposit,                                                -- ??摰
    m.table_rental,                                           -- ??摰
    m.chair_rental,                                           -- ??摰
    m.umbrella_rental,                                        -- ??摰
    m.tablecloth_rental,                                      -- ??摰
    m.commission_rate,                                        -- ??摰
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ??摰
    m.total_interactions,
    m.total_deals,
    m.notes,
    m.created_at,
    m.updated_at,
    m.is_collaborative,
    m.operation_phase,
    m.is_deleted,
    m.sync_status,
    m.owner_id                    AS relationship_owner_id,
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (markets m
    JOIN market_members mm ON ((mm.market_id = m.id)))
WHERE (mm.user_id = auth.uid());



-- -----------------------------------------------------------------------------
-- Verification ROLLBACK example嚗?霅?1嚗taff ??staff_accessible_markets嚗?
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT
    name,
    table_rental,         -- ??嚗???owner 閮剔???嚗? 0 銵函內撌脫蝘?
    chair_rental,         -- ??嚗???
    umbrella_rental,      -- ??嚗???
    tablecloth_rental,    -- ??嚗???
    table_free,           -- ??嚗???
    registration_fee,     -- ??嚗ULL
    total_revenue         -- ??嚗???
FROM staff_accessible_markets
LIMIT 1;

ROLLBACK;
*/

-- ============================================================
-- End of 042_preserve_staff_rental_existence.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 042_preserve_staff_rental_existence.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 043_staff_role_foundation.sql
-- ============================================================

-- ============================================================
-- P1: DB Role Foundation
-- Migration: 043_staff_role_foundation.sql
-- Date: 2026-06-18
-- Phase: P1嚗? DB + RPC嚗?垢 / runtime 銵霈?嚗?
--
-- ?格?嚗?
-- 霈?staff_relationships 銵典??role-based ?∪極甈??蝷??
-- 雿?蝡舐??霈??憿舐內??雿輻??role??
--
-- 閫嚗?
--   viewer   - ?箇??亦???蝝?亦?嚗??臬神?伐?
--   operator - ?箸?拇?嚗閮?鈭? / ?漱 / 蝺刻摩?芸楛?嗆蝝??
--   manager  - 蝞∠??∴?operator 憿? + ?蝺刻摩撣? / ???箸鞈?嚗?
--
-- 閮剛???嚗?
--   - role ??Primary Source of Truth
--   - permissions JSON 隞????腹?剁?嚗 RPC ?郊?湔
--   - DEFAULT 'viewer' 蝣箔??啗????Ｘ??隢?蝔???
--   - CHECK ??? enum
--   - ?‵?Ｘ?鞈?嚗an_edit=true ??operator嚗alse ??viewer
--   - update_staff_role RPC ?箏銝?撖怠頝臬?
--   - 銝?DROP 隞颱? RLS policy
--   - 銝???WITH CHECK嚗????"Staff can accept invitations"嚗?
--   - 銝??嗡? TS / UI / sync / Dexie
-- ============================================================

-- ============================================================
-- A. ?啣? role 甈?
-- ============================================================

ALTER TABLE staff_relationships
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

-- ============================================================
-- B. ?啣? CHECK constraint嚗 DO $$ ?踹????啣?嚗?
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_relationships_role_check'
  ) THEN
    ALTER TABLE staff_relationships
      ADD CONSTRAINT staff_relationships_role_check
      CHECK (role IN ('viewer', 'operator', 'manager'));
  END IF;
END $$;


-- ============================================================
-- C. ?‵????
-- 閬?嚗?
--   permissions.can_edit = true  ??operator
--   ?嗡? / false / null          ??viewer
-- DEFAULT 'viewer' 撌脩???鈭憓?嚗PDATE ???Ｘ???
-- ============================================================

UPDATE staff_relationships
SET role = CASE
  WHEN COALESCE((permissions->>'can_edit')::boolean, false) = true THEN 'operator'
  ELSE 'viewer'
END;

-- ============================================================
-- D. 撱箇? update_staff_role RPC
-- ?臭??撖怠頝臬?嚗wner ?隤踵?芸楛 active ?∪極???莎?
-- ============================================================

CREATE OR REPLACE FUNCTION update_staff_role(
  p_relationship_id UUID,
  p_role TEXT
)
RETURNS staff_relationships
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_staff_id UUID;
  v_status   TEXT;
  v_record   staff_relationships%ROWTYPE;
BEGIN
  -- (1) 撽? role ?嚗num gate嚗?
  IF p_role NOT IN ('viewer', 'operator', 'manager') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be viewer, operator, or manager.', p_role
      USING ERRCODE = '22023';
  END IF;

  -- (2) 霈?璅???
  SELECT owner_id, staff_id, status
    INTO v_owner_id, v_staff_id, v_status
    FROM staff_relationships
   WHERE id = p_relationship_id;

  -- (3) 撽?摮??
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff relationship not found: %', p_relationship_id
      USING ERRCODE = 'P0002';
  END IF;

  -- (4) 撽??澆? owner
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: you are not the owner of this staff relationship.'
      USING ERRCODE = '42501';
  END IF;

  -- (5) 撽? status = active
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Cannot change role for % relationship; only active relationships are editable.', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- (6) 蝳迫 staff ?芸楛?寡撌?
  IF v_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: staff cannot change their own role.'
      USING ERRCODE = '42501';
  END IF;

  -- (7) ?瑁??湔嚗?迂 role + ?腹??permissions嚗?
  -- updated_at ?望??trigger (update_staff_relationships_timestamp) ?芸??湔
  UPDATE staff_relationships
     SET role = p_role,
         permissions = jsonb_build_object(
           'can_view', true,
           'can_edit', (p_role IN ('operator', 'manager')),
           'infoLevel', CASE p_role
                          WHEN 'viewer'   THEN 0
                          WHEN 'operator' THEN 2
                          WHEN 'manager'  THEN 2
                        END
         )
   WHERE id = p_relationship_id
   RETURNING * INTO v_record;

  -- (8) ??湔敺???
  RETURN v_record;
END;
$$;


-- ============================================================
-- E. ?嗥? RPC 甈?
-- Supabase ?身 PUBLIC ??EXECUTE嚗???蝣?revoke
-- ============================================================

REVOKE EXECUTE ON FUNCTION update_staff_role(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION update_staff_role(UUID, TEXT) TO authenticated;

-- ============================================================
-- End of 043_staff_role_foundation.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 043_staff_role_foundation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 044_get_my_staff_add_role.sql
-- ============================================================

-- ============================================================
-- Migration: 044_get_my_staff_add_role.sql
-- Purpose:   Include staff_relationships.role in get_my_staff() RPC result.
-- Date:      2026-06-18
-- Severity:  Yellow (DB RPC compatibility change)
-- Phase:     P3a 敹??蔭嚗??垢?臬??刻???role嚗?
--
-- ?嚗?
-- 043_staff_role_foundation.sql 撌脣遣蝡?staff_relationships.role 甈?
-- 銝血?憛急??? 'viewer' / 'operator' / 'manager'??
-- 雿?043 瘝 get_my_staff()嚗?甇?owner 蝡?staff list 隞銝 role??
-- P3a 閮??StaffManagement 憿舐內 role badge嚗?
-- ?蔭璇辣??get_my_staff() ? role 甈???
--
-- ?孵?蝭?嚗?
--   - ?遣 get_my_staff() RETURNS TABLE嚗憓?role TEXT 甈?
--   - 銝?嗡? RPC嚗et_my_owners / is_staff_of / accept_invitation_and_bind嚗?
--   - 銝 RLS policy
--   - 銝?垢 runtime 銵嚗??嫣遙雿?TS / UI嚗?
--   - 銝? GRANT / REVOKE嚗??20240220_staff_system_simple.sql 瘝??孵??嚗?
--     蝬剜? Postgres ?身 PUBLIC EXECUTE ???
--
-- 摰?改?
--   - 靽? SECURITY DEFINER
--   - ?? SET search_path = public嚗? 043 憸冽銝?湛??踹? search_path ?餅?嚗?
--   - DROP FUNCTION 銝 CASCADE嚗et_my_staff 瘝??訾??拐辣嚗?
--   - SQL ?折銝? owner_id ?典??摩嚗? WHERE sr.owner_id = auth.uid()嚗?
-- ============================================================

-- 1. ?芷??function嚗eturn type ?寡?嚗REATE OR REPLACE ?仃??
--    銝蝙??CASCADE嚗et_my_staff 瘝??訾??拐辣嚗iew / trigger / ?嗡? function嚗?
DROP FUNCTION IF EXISTS public.get_my_staff();

-- 2. ?遣 function嚗憓?role 甈?
CREATE OR REPLACE FUNCTION public.get_my_staff()
RETURNS TABLE (
  staff_id      UUID,
  staff_email   TEXT,
  status        TEXT,
  permissions   JSONB,
  role          TEXT,         -- ???啣?嚗?43 銋? owner ?舐??啣撌亥???
  invited_at    TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.role,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;

-- 3. ?湔 function 閮餉圾

-- ============================================================
-- 撽? SQL嚗犖撌亙??典??瑁?嚗?
-- ============================================================
/*
-- 1. function 摮銝??單迤蝣箸?雿?
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid)     AS result_definition,
  p.prosecdef                        AS is_security_definer,
  p.proconfig                        AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_my_staff';

-- ??嚗?
--   result_definition ??"role text"
--   is_security_definer = true
--   config_settings ??{search_path=public}

-- 2. 撽? owner ?舀迤撣豢閰?
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<owner_user_id>', true);
SELECT staff_id, role, status FROM public.get_my_staff();
-- ??嚗?蝑?role ?賣 'viewer' / 'operator' / 'manager'

-- 3. 撽??嗡? RPC 瘝◤??
SELECT proname FROM pg_proc
WHERE proname IN ('get_my_staff', 'get_my_owners', 'is_staff_of', 'accept_invitation_and_bind')
ORDER BY proname;
-- ??嚗? ?摮
*/

-- ============================================================
-- End of 044_get_my_staff_add_role.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 044_get_my_staff_add_role.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- 045_get_my_staff_add_relationship_id.sql
-- Purpose:   Include relationship_id in get_my_staff() RPC result.
-- Date:      2026-06-18
-- Severity:  Yellow (DB RPC return type change)
-- Phase:     P4 敹??蔭嚗? update_staff_role() ?臭誑敺?蝡舀 relationship id嚗?
--
-- ?嚗?
-- 043_staff_role_foundation.sql 撱箇? staff_relationships.role
-- 044_get_my_staff_add_role.sql 霈?get_my_staff() ? role
-- 045 鋆? relationship_id 甈?嚗taff_relationships.id 銝駁嚗?
-- 靘靘?update_staff_role(p_relationship_id, p_role) 雿輻
--
-- ?孵?蝭?嚗?
--   - ?遣 get_my_staff() RETURNS TABLE嚗憓?relationship_id UUID 甈?
--   - 銝?嗡? RPC嚗et_my_owners / is_staff_of / accept_invitation_and_bind / update_staff_role嚗?
--   - 銝 RLS policy
--   - 銝?垢 runtime 銵嚗??嫣遙雿?TS / UI嚗?
--   - 銝? GRANT / REVOKE嚗??20240220_staff_system_simple.sql 瘝??孵??嚗?
--     蝬剜? Postgres ?身 PUBLIC EXECUTE ???044 銋 GRANT / REVOKE嚗?
--
-- 摰?改?
--   - 靽? SECURITY DEFINER
--   - ?? SET search_path = public嚗? 043 / 044 憸冽銝?湛??踹? search_path ?餅?嚗?
--   - DROP FUNCTION 銝 CASCADE嚗et_my_staff 瘝??訾??拐辣嚗?
--   - SQL ?折銝? owner_id ?典??摩嚗? WHERE sr.owner_id = auth.uid()嚗?
-- ============================================================

-- 1. ?芷??function嚗eturn type ?寡?嚗REATE OR REPLACE ?仃??
--    銝蝙??CASCADE嚗et_my_staff 瘝??訾??拐辣嚗iew / trigger / ?嗡? function嚗?
DROP FUNCTION IF EXISTS public.get_my_staff();

-- 2. ?遣 function嚗憓?relationship_id 甈?
CREATE OR REPLACE FUNCTION public.get_my_staff()
RETURNS TABLE (
  relationship_id  UUID,        -- ???啣?嚗taff_relationships.id嚗蜓?蛛?
  staff_id         UUID,
  staff_email      TEXT,
  status           TEXT,
  permissions      JSONB,
  role             TEXT,
  invited_at       TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id          AS relationship_id,
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.role,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;

-- 3. ?湔 function 閮餉圾

-- ============================================================
-- 撽? SQL嚗犖撌亙??典??瑁?嚗?
-- ============================================================
/*
-- 1. function 摮銝??單迤蝣箸?雿?
SELECT
  p.proname,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid)     AS result_definition,
  p.prosecdef                        AS is_security_definer,
  p.proconfig                        AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'get_my_staff';

-- ??嚗?
--   result_definition ??"relationship_id uuid, staff_id uuid, ..., role text"
--   is_security_definer = true
--   config_settings ??{search_path=public}

-- 2. 撽? owner ?舀迤撣豢閰?
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<owner_user_id>', true);
SELECT relationship_id, staff_id, role, status FROM public.get_my_staff();
-- ??嚗?蝑?relationship_id ?賣??潘?role ?賣 'viewer' / 'operator' / 'manager'

-- 3. 撽??嗡? RPC 瘝◤??
SELECT proname FROM pg_proc
WHERE proname IN ('get_my_staff', 'get_my_owners', 'is_staff_of', 'accept_invitation_and_bind', 'update_staff_role')
ORDER BY proname;
-- ??嚗? ?摮
*/

-- ============================================================
-- End of 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: quick_test_database_compat_staff_permissions_046_clean.sql
-- ============================================================

-- Féria quick test database compatibility patch
-- Clean bootstrap version of migration 046_align_staff_permissions_with_role.
--
-- This preserves the intended 046 effects:
--   - permissions default includes infoLevel=0
--   - existing staff_relationships permissions align to role
--   - accept_invitation_and_bind returns viewer/L0 permissions
--
-- It avoids the archived function body's v_* variable names because some SQL
-- Editor bootstrap executions have parsed v_owner_id as a relation outside the
-- plpgsql body after earlier errors.

alter table public.staff_relationships
  alter column permissions set default
  '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb;

update public.staff_relationships
set permissions = jsonb_build_object(
      'can_view', true,
      'can_edit', (role in ('operator', 'manager')),
      'infoLevel', case
        when role = 'viewer' then 0
        when role in ('operator', 'manager') then 2
        else 0
      end
    )
where role in ('viewer', 'operator', 'manager');

create or replace function public.accept_invitation_and_bind(
  p_token text,
  p_staff_id uuid
)
returns table (
  success boolean,
  message text,
  relationship_id uuid
)
language plpgsql
security definer
set search_path = public
as $accept_invitation_and_bind$
declare
  invitation_owner_id uuid;
  invitation_expires_at timestamptz;
  accepted_relationship_id uuid;
  authenticated_staff_id uuid;
  authenticated_staff_email text;
  existing_owner_count integer;
begin
  authenticated_staff_id := auth.uid();

  if authenticated_staff_id is null then
    return query select false, 'Authentication required'::text, null::uuid;
    return;
  end if;

  if p_staff_id is not null and p_staff_id <> authenticated_staff_id then
    return query select false, 'Authenticated user does not match staff id'::text, null::uuid;
    return;
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    return query select false, 'Invalid invitation token'::text, null::uuid;
    return;
  end if;

  select si.owner_id, si.expires_at
  into invitation_owner_id, invitation_expires_at
  from public.staff_invitations si
  where si.token = p_token;

  if not found then
    return query select false, 'Invalid invitation token'::text, null::uuid;
    return;
  end if;

  if invitation_expires_at < now() then
    return query select false, 'Invitation has expired'::text, null::uuid;
    return;
  end if;

  if invitation_owner_id = authenticated_staff_id then
    return query select false, 'Owner cannot accept their own invitation'::text, null::uuid;
    return;
  end if;

  select count(*)
  into existing_owner_count
  from public.staff_relationships sr
  where sr.staff_id = authenticated_staff_id
    and sr.status in ('pending', 'active');

  if existing_owner_count > 0 then
    return query select false, 'This user is already bound to an owner'::text, null::uuid;
    return;
  end if;

  select u.email
  into authenticated_staff_email
  from auth.users u
  where u.id = authenticated_staff_id;

  insert into public.staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  )
  values (
    invitation_owner_id,
    authenticated_staff_id,
    authenticated_staff_email,
    'active',
    now(),
    '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
  )
  on conflict (owner_id, staff_id)
  do update set
    staff_email = excluded.staff_email,
    status = 'active',
    accepted_at = now(),
    permissions = excluded.permissions,
    updated_at = now()
  returning id into accepted_relationship_id;

  insert into public.market_members (
    market_id,
    user_id,
    role,
    joined_at
  )
  select
    m.id,
    authenticated_staff_id,
    'staff',
    now()
  from public.markets m
  where m.owner_id = invitation_owner_id
    and m.status in ('ongoing', 'registered', 'accepted', 'paid')
    and not exists (
      select 1
      from public.market_members mm
      where mm.market_id = m.id
        and mm.user_id = authenticated_staff_id
    );

  delete from public.staff_invitations si
  where si.token = p_token;

  return query select true, 'Invitation accepted'::text, accepted_relationship_id;
end;
$accept_invitation_and_bind$;

revoke all on function public.accept_invitation_and_bind(text, uuid) from public, anon;
grant execute on function public.accept_invitation_and_bind(text, uuid) to authenticated;

-- ============================================================
-- END SOURCE: quick_test_database_compat_staff_permissions_046_clean.sql
-- ============================================================
