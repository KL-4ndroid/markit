-- BoothBook / Markit quick test database phase 3 v2: staff hardening 037-046 with view-shape compatibility drops
-- Intended only for a new/empty or disposable Supabase staging/local test project.
-- Do NOT run on production or on a database that contains real user data.
-- Sanitized for quick bootstrap: removed COMMENT ON statements and replaced RAISE NOTICE with NULL;
-- Generated at: 2026-06-23 02:05:15 +08:00

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
-- BEGIN SOURCE: quick_test_database_compat_drop_staff_accessible_views.sql
-- ============================================================

-- BoothBook / Markit quick test database compatibility patch
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

-- BoothBook / Markit quick test database compatibility patch
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
-- C2.29B-1: Staff accessible view hardening (草稿)
-- 建立日期: 2026-06-15
-- 建立者: Cursor (Codex)
-- 狀態: 🟡 草稿（已 commit 到 repo，**未套用到 Supabase**）
--
-- 對應攻擊面（C2.29 線上實測確認）:
--   #1 staff_accessible_markets    含 booth_cost / commission_rate / total_profit / 4 個 rental
--   #2 staff_accessible_products   含 cost
--   #3 staff_accessible_events     含完整 payload（boothCost / cost / supplier / profitMargin 等）
--
-- 對應 E1-E3 線上實測:
--   E2: 員工透過 RLS 直接 SELECT markets 拉到 booth_cost / total_profit
--   E3: 員工透過 staff_accessible_events view 拉到 10 筆 boothCost=3000/3500
--
-- 設計原則:
--   - 因為 view 使用 UNION ALL，owner branch 與 staff branch 必須維持相同欄位結構
--   - Staff branch 保留所有欄位名稱，敏感欄位輸出 NULL
--   - Owner branch 保留完整欄位與完整 payload
--   - 目標是讓 Staff 查不到真實敏感值，不是讓欄位不存在
--
-- 範圍限制（必須遵守）:
--   - 039 只能修 staff_accessible_* view 層
--   - 039 不修改底表 RLS（攻擊面 #4 需 C2.29B-2 規劃）
--   - 039 不修改既有 migration
--   - 039 不修改前端 / PermissionGate / useUserRole
--
-- 套用前必讀:
--   1. 先確認備份文件 docs/C2.29_VIEW_BACKUP_2026_06_15.md 已建立
--   2. 先在 Supabase SQL Editor 套用本檔
--   3. 套用後執行遷移驗證 SQL（見檔尾）
--   4. 驗證通過後再 commit 套用紀錄
--
-- 套用方式（人工）:
--   - 在 Supabase Dashboard > SQL Editor
--   - 貼上本檔完整內容
--   - 點選 Run
--   - 確認無錯誤後跑驗證 SQL
--   - 確認 owner / staff 查詢結果符合預期
--
-- -----------------------------------------------------------------------------
-- 🚦 正式套用建議（transactional safety）
-- -----------------------------------------------------------------------------
--
-- 建議正式套用時使用 transaction，所有 migration body + 驗證 SQL 一次貼到
-- SQL Editor，整段包進 BEGIN ... COMMIT，讓套用與驗證在同一個交易裡。
-- 任何驗證失敗 → ROLLBACK 一次性還原，不會留下半套 view。
--
-- 標準流程：
--
--   BEGIN;
--   -- (1) 貼上 Section 1 ~ 4 的 migration body
--   --     (sanitize_staff_event_payload + 3 個 view 重建)
--
--   -- (2) 立即跑 Staff 驗證 SQL（見 Section 5）
--   --     預期：booth_cost / cost / payload 敏感 key 全部 NULL / 缺漏
--
--   -- (3) 跑 Owner 驗證 SQL
--   --     預期：booth_cost / cost / payload 仍為真實值
--
--   -- (4) 跑 tombstone 驗證 SQL
--   --     預期：deal_deleted / interaction_deleted 仍可見
--
--   -- (5) 全部通過：
--   COMMIT;
--   --     (6) 任一失敗：
--   --     ROLLBACK;
--
-- 提醒：
--   - 不要在未驗證前 COMMIT。
--   - 驗證順序：先 Staff branch → 再 Owner branch → 最後 tombstone。
--   - 驗證完成後再記錄套用結果（建議在 docs/C2.29_REANALYSIS_2026_06_15.md
--     補上套用日期 + commit hash）。
--
-- 為何要用 transaction：
--   - CREATE OR REPLACE VIEW / FUNCTION 不會自動 rollback 既有 session 的暫存
--   - 套用後若 Owner 端查詢結果異常，需要一次性還原 3 個 view
--   - Supabase SQL Editor 對 BEGIN/COMMIT 支援完善
--
-- Rollback 方式（人工）:
--   - 參考 docs/C2.29_VIEW_BACKUP_2026_06_15.md §1.1 / §2.1 / §3.1
--   - 禁止自動 rollback，需人工確認
--
-- =============================================================================


-- =============================================================================
-- Section 1: Helper function for payload sanitization
-- =============================================================================
--
-- 為何需要 helper function:
--   - top-level `payload - 'cost'` 只能移除最外層
--   - deal_closed.payload.items[] 內可能含 cost / costAtTimeOfSale / supplierInfo
--     / profit / profitMargin / grossMargin / totalCost
--   - 必須用 jsonb 遞迴處理才能清乾淨
--
-- 設計:
--   - SECURITY INVOKER（跟著 caller 的權限，不放大）
--   - 不變更原 payload key 順序
--   - 保留所有非敏感 key（含 tombstone: deal_deleted / interaction_deleted）
--   - 對 jsonb 陣列內的 object 遞迴處理
--
-- 處理策略:
--   - top-level 移除 15+ 個敏感 key（camelCase + snake_case）
--   - 對 jsonb 陣列內的每個 object 執行同樣的 key 過濾
--   - 對 jsonb 物件內的巢狀 object 不深層遞迴（避免過度處理，視需要再擴充）
--
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sanitize_staff_event_payload(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
AS $$
DECLARE
  -- top-level 敏感 key 列表（camelCase + snake_case 兩種命名都涵蓋）
  sensitive_keys text[] := ARRAY[
    -- 攤位費用
    'boothCost', 'booth_cost',
    'registrationFee', 'registration_fee',
    'commissionRate', 'commission_rate',
    'tableRental', 'table_rental',
    'chairRental', 'chair_rental',
    'umbrellaRental', 'umbrella_rental',
    'tableclothRental', 'tablecloth_rental',
    -- 商品成本 / 售價成本
    'cost',
    'costAtTimeOfSale', 'cost_at_time_of_sale',
    'supplierInfo', 'supplier_info',
    'totalCost', 'total_cost',
    -- 利潤 / 毛利 / 淨利
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
  -- 邊界：null 或非 object 直接回傳原值
  IF payload IS NULL OR jsonb_typeof(payload) <> 'object' THEN
    RETURN payload;
  END IF;

  -- Step 1: 移除 top-level 敏感 key
  result := payload;
  FOR i IN 1..array_length(sensitive_keys, 1) LOOP
    result := result - sensitive_keys[i];
  END LOOP;

  -- Step 2: 處理 items[] 陣列（deal_closed 等事件會含 items）
  -- 對陣列內的每個 object，遞迴套用同樣的 key 移除
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
-- Section 2: 重建 staff_accessible_markets
-- =============================================================================
--
-- Staff branch 敏感欄位 → NULL
--   - booth_cost, registration_fee, commission_rate, total_profit
--   - table_rental, chair_rental, umbrella_rental, tablecloth_rental
--
-- Staff branch 保留（產品決策）:
--   - deposit（保證金提醒）
--   - table_free / chair_free / umbrella_free / tablecloth_free
--   - total_revenue / total_deals / total_interactions
--   - 基本市集資訊
--
-- Owner branch 保留完整欄位
--
-- 重要：UNION ALL 要求兩個 branch 欄位數 + 型別完全一致
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF（敏感欄位 NULL）
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
    NULL::numeric(10,2)                  AS registration_fee,    -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS booth_cost,          -- 🛡️ 脫敏
    m.deposit,                                                 -- 🟢 保留（保證金提醒）
    NULL::numeric(10,2)                  AS table_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS chair_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS umbrella_rental,     -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS tablecloth_rental,   -- 🛡️ 脫敏
    NULL::numeric(5,2)                   AS commission_rate,     -- 🛡️ 脫敏
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- 🛡️ 脫敏
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

-- Branch 2: OWNER（完整欄位）
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
    m.registration_fee,                                       -- ✅ 完整
    m.booth_cost,                                             -- ✅ 完整
    m.deposit,                                                -- ✅ 完整
    m.table_rental,                                           -- ✅ 完整
    m.chair_rental,                                           -- ✅ 完整
    m.umbrella_rental,                                        -- ✅ 完整
    m.tablecloth_rental,                                      -- ✅ 完整
    m.commission_rate,                                        -- ✅ 完整
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ✅ 完整
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
-- Section 3: 重建 staff_accessible_products
-- =============================================================================
--
-- Staff branch:
--   - cost → NULL
--
-- Staff branch 保留:
--   - price / stock / total_sold / category / name / market_id
--   - is_active / is_shared / description
--   - icon_name / color_code
--
-- Owner branch 保留完整欄位
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_products AS
-- Branch 1: STAFF（cost 為 NULL）
SELECT
    p.id,
    p.market_id,
    p.name,
    p.category,
    p.price,
    NULL::numeric(10,2)                  AS cost,                -- 🛡️ 脫敏
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

-- Branch 2: OWNER（完整欄位）
SELECT
    p.id,
    p.market_id,
    p.name,
    p.category,
    p.price,
    p.cost,                                                    -- ✅ 完整
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
-- Section 4: 重建 staff_accessible_events
-- =============================================================================
--
-- Staff branch payload → scrubbed（呼叫 sanitize_staff_event_payload）
-- Staff branch 其餘欄位保留（含 tombstone: deal_deleted / interaction_deleted）
-- Owner branch 保留完整 payload
--
-- 4 個 UNION branch:
--   1. STAFF 市集事件
--   2. STAFF 全局事件（market_id IS NULL）
--   3. OWNER 自己的所有事件
--   4. OWNER 市集成員事件
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_events AS
-- Branch 1: STAFF（市集事件，payload 脫敏）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
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

-- Branch 2: STAFF（全局事件，payload 脫敏）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
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

-- Branch 3: OWNER（自己的所有事件，payload 完整）
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
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

-- Branch 4: OWNER（市集成員事件，payload 完整）
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
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
-- Section 5: 套用後驗證 SQL（人工執行）
-- =============================================================================
--
-- 套用本 migration 後，在 Supabase SQL Editor 跑以下驗證 SQL。
-- 預期：staff 查詢敏感欄位為 NULL，owner 查詢完整。
--
-- ⚠️ 驗證 SQL 全部用 transaction 包住：
--
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);
--   -- verification query
--   ROLLBACK;
--
-- - BEGIN/ROLLBACK 確保驗證結束後 role 與 jwt claim 不會污染 session。
-- - 每個驗證 block 各自一個 transaction（不要混用）。
-- - 驗證順序：先 Staff（1-4）→ 再 Owner（5）。
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 驗證 1: Staff 查 staff_accessible_markets（敏感欄位應為 NULL）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);  -- 換成實際 staff UUID

SELECT
    name,
    booth_cost,            -- 預期：NULL
    commission_rate,       -- 預期：NULL
    total_profit,          -- 預期：NULL
    table_rental,          -- 預期：NULL
    chair_rental,          -- 預期：NULL
    umbrella_rental,       -- 預期：NULL
    tablecloth_rental,     -- 預期：NULL
    registration_fee,      -- 預期：NULL
    deposit,               -- 預期：保留（保證金提醒）
    total_revenue,         -- 預期：保留
    total_deals,           -- 預期：保留
    total_interactions     -- 預期：保留
FROM staff_accessible_markets
LIMIT 1;

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 2: Staff 查 staff_accessible_products（cost 應為 NULL）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT
    name,
    price,                 -- 預期：保留
    cost,                  -- 預期：NULL
    stock,
    total_sold
FROM staff_accessible_products
LIMIT 1;

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 3: Staff 查 staff_accessible_events.payload（敏感 key 應被移除）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 3a. 檢查 top-level 敏感 key 不存在
SELECT
    type,
    payload ? 'boothCost'            AS has_boothCost,        -- 預期：false
    payload ? 'cost'                 AS has_cost,             -- 預期：false
    payload ? 'costAtTimeOfSale'     AS has_costAtTimeOfSale, -- 預期：false
    payload ? 'supplierInfo'         AS has_supplierInfo,     -- 預期：false
    payload ? 'profitMargin'         AS has_profitMargin,     -- 預期：false
    payload ? 'grossMargin'          AS has_grossMargin,      -- 預期：false
    payload ? 'totalProfit'          AS has_totalProfit,      -- 預期：false
    payload ? 'booth_cost'           AS has_booth_cost,       -- 預期：false
    payload ? 'commissionRate'       AS has_commissionRate    -- 預期：false
FROM staff_accessible_events
WHERE type = 'market_created'
LIMIT 5;

-- 3b. 檢查 deal_closed 內的 items[] 巢狀結構也已脫敏
SELECT
    type,
    jsonb_path_query_array(payload, '$.items[*]') AS items_array
FROM staff_accessible_events
WHERE type = 'deal_closed'
LIMIT 5;
-- 預期：每個 item 內的 cost / costAtTimeOfSale / supplierInfo / profit 等 key 不存在

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 4: Staff 仍應看到 tombstone 事件
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT type, count(*)
FROM staff_accessible_events
WHERE type IN ('deal_deleted', 'interaction_deleted')
GROUP BY type;
-- 預期：deal_deleted / interaction_deleted 各有 row（tombstone 仍可見）

ROLLBACK;
*/

-- -----------------------------------------------------------------------------
-- 驗證 5: Owner 查詢仍保留完整資料
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);  -- 換成實際 owner UUID

-- 5a. Owner 看市集
SELECT name, booth_cost, total_profit, commission_rate
FROM staff_accessible_markets
LIMIT 1;
-- 預期：booth_cost / total_profit / commission_rate 都是真實值

-- 5b. Owner 看商品
SELECT name, cost, price
FROM staff_accessible_products
LIMIT 1;
-- 預期：cost 是真實值

-- 5c. Owner 看事件 payload
SELECT type, payload
FROM staff_accessible_events
LIMIT 1;
-- 預期：payload 是完整 JSONB

ROLLBACK;
*/


-- =============================================================================
-- Section 6: 已知限制
-- =============================================================================
--
-- 1. 039 只能修 staff_accessible_* view 層
--    E2 已證明 Staff 仍可能透過底表 RLS 直接 SELECT markets 取得敏感欄位
--    因此 C2.29B-2 必須規劃 base table RLS tightening
--    或前端完全遷移到 staff-safe view / RPC 後再收緊底表
--
-- 2. sanitize_staff_event_payload 目前只處理:
--    - top-level 敏感 key 移除
--    - items[] 陣列內的 object 遞迴處理
--    未深層處理其他巢狀 object（如 metadata 內的 object）
--    視後續發現的攻擊面再擴充
--
-- 3. 不修改底表 RLS（C2.29B-2 範圍）
--    不修改前端
--    不修改 PermissionGate / useUserRole
--    不修改 C2.28 已完成邏輯
--
-- 4. 套用後員工 UI 仍可正常運作（PermissionGate 已 fail-closed）
--    因為 PermissionGate 已經在 UI 層把 cost / profit 過濾
--    039 是在 Supabase 端多加一層防護
--
-- =============================================================================

-- ============================================================
-- END SOURCE: 039_staff_view_hardening.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: quick_test_database_compat_drop_staff_accessible_views.sql
-- ============================================================

-- BoothBook / Markit quick test database compatibility patch
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
-- BEGIN SOURCE: 040_fix_staff_accessible_view_scope.sql
-- ============================================================

-- =============================================================================
-- 040_fix_staff_accessible_view_scope.sql
-- =============================================================================
--
-- C2.29B-1.1: Fix staff accessible view scope bug
-- 建立日期: 2026-06-16
-- 建立者: Cursor (Codex)
-- 狀態: 🟡 草稿（**已 commit 到 repo，**未套用到 Supabase**\*\*）
--
-- ⚠️ 重要：這份草稿**尚未套用**。套用前請先：
--   1. 確認 C2.29B-1 (039) 已成功套用
--   2. 確認 C2.29B-1 Post-Apply Smoke Test 完成
--   3. 人工在 Supabase SQL Editor 套用本檔
--   4. 套用後跑 §5 驗證 SQL
--   5. 驗證通過後才 commit 套用紀錄
--
-- 對應攻擊面（C2.29B-1 Post-Apply 線上實測發現）:
--   #A staff_accessible_markets.owner_branch scope leak
--      員工在 market_members 有 row (role='staff')，
--      039 owner branch 用 `mm.user_id = auth.uid()` 沒檢查 role，
--      員工會命中 owner branch，access_type='owner' 拿到完整敏感欄位
--      → 039 staff branch 脫敏完全被繞過
--   #B staff_accessible_events.owner_branch_4 scope leak
--      同樣的 bug：員工在 market_members 有 row
--      → 員工命中 owner branch 4 拿到完整 payload
--   #C deleted markets 仍被 Staff 拉進來
--      4 個 view 結構都沒過濾 is_deleted
--   #D global product_created / product_deleted events
--      staff_accessible_events Branch 2 讓員工看到 market_id IS NULL
--      的 product_created / product_deleted 事件
--      → 前端 useSync 看到 missing_market_id 而跳過（已知問題）
--
-- 對應的 SQL 觀察（用戶補跑 2026-06-16）:
--   1. staff_accessible_markets 同一個 market id 同時出現 staff + owner branch
--   2. 多個 is_deleted=true 的 market 仍被 Staff 拉進來
--   3. staff_accessible_events market_id IS NULL 事件中：
--      - product_deleted: 13 個
--      - product_created: 8 個
--   4. 前端 useSync log 印出
--      `Skipping event outside local scoped dataset
--       reason: missing_market_id
--       eventType: product_created`
--
-- 設計原則:
--   - 040 只能修 staff_accessible_* view 層
--   - 040 不修改底表 RLS（攻擊面 #4 direct SELECT 仍需 C2.29B-2）
--   - 040 不修改既有 migration
--   - 040 不修改前端 / PermissionGate / useUserRole
--
-- 修正策略（owner branch 必須嚴格用 m.owner_id = auth.uid()）:
--   1. staff_accessible_markets
--      - Owner branch 改用 `m.owner_id = auth.uid()`（不依賴 market_members）
--      - Staff branch 加上 `COALESCE(m.is_deleted, false) = false`
--   2. staff_accessible_events
--      - Branch 4 (OWNER team events) 改用 `m.owner_id = auth.uid()` JOIN
--      - Branch 1 (STAFF market events) 改用 `m.owner_id` JOIN staff_relationships
--        避免「員工在 market_members 命中 owner branch 4」風險
--      - 加 `is_deleted = false` 過濾
--      - Branch 2 (STAFF global events) 改用 `e.actor_id = m.owner_id JOIN staff`
--        避免 product_created / product_deleted 命中無關 owner
--   3. staff_accessible_products
--      - 040 確認 Owner branch 用 `p.owner_id = auth.uid()`（已是這樣，無 bug）
--      - Staff branch 加上 `p.is_active = true`（已是這樣，無 bug）
--      - 040 不改此 view（無 bug）
--
-- 為何 Owner branch 用 `m.owner_id` 比 `mm.user_id + mm.role='owner'` 好:
--   - m.owner_id 是 markets 表的事實欄位，由 trigger 維護
--   - mm.role 是 market_members 表的欄位，依賴 trigger (002 / 021) 正確加入
--   - 如果 021 trigger 漏加 owner row，owner branch 會漏 owner 的市集
--   - 035 已經有 `current_user_owned_market_ids()` helper，可直接用
--
-- 為何 Staff branch 改用 m.owner_id JOIN staff_relationships:
--   - 員工可能也透過 is_collaborative 市集被加進 market_members (role='staff')
--   - 039 Staff branch 透過 `sr.owner_id = mm.user_id` 串 → 員工只能在
--     "自己被加進去" 的市集命中 → 但員工也可能在 mm 中是 staff，命中 Branch 4
--   - 040 改用 `sr.owner_id = m.owner_id` 直接透過 owner_id 串，
--     不依賴 market_members 的 membership
--
-- 範圍限制（必須遵守）:
--   - 040 只能修 staff_accessible_* view 層
--   - 040 不修改底表 RLS（C2.29B-2 範圍）
--   - 040 不修改既有 migration
--   - 040 不修改前端 / PermissionGate / useUserRole
--   - 040 不直接套用到 Supabase
--   - 040 不刪除任何 view branch（保守，只修條件）
--
-- =============================================================================


-- =============================================================================
-- Section 1: 重建 staff_accessible_markets
-- =============================================================================
--
-- 修正要點:
--   - Owner branch: WHERE m.owner_id = auth.uid()（不依賴 market_members）
--   - Staff branch: 加 is_deleted = false 過濾
--   - Staff branch: 改用 m.owner_id 串 staff_relationships
--     （避免 is_collaborative 市集把員工加進 market_members 命中 owner branch）
--
-- 注意：UNION ALL 要求兩個 branch 欄位數 + 型別完全一致
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF（敏感欄位 NULL + 排除 deleted market + 透過 owner_id 串）
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
    NULL::numeric(10,2)                  AS registration_fee,    -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS booth_cost,          -- 🛡️ 脫敏
    m.deposit,                                                 -- 🟢 保留
    NULL::numeric(10,2)                  AS table_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS chair_rental,        -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS umbrella_rental,     -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS tablecloth_rental,   -- 🛡️ 脫敏
    NULL::numeric(5,2)                   AS commission_rate,     -- 🛡️ 脫敏
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- 🛡️ 脫敏
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
  AND (COALESCE(m.is_deleted, false) = false))                   -- 🆕 排除已刪除市集

UNION ALL

-- Branch 2: OWNER（完整欄位 + 嚴格 owner 判斷）
-- 🆕 從 `mm.user_id = auth.uid()` 改為 `m.owner_id = auth.uid()`
--   原因：員工在 market_members 有 role='staff' row，會誤命中 owner branch
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
    m.registration_fee,                                       -- ✅ 完整
    m.booth_cost,                                             -- ✅ 完整
    m.deposit,                                                -- ✅ 完整
    m.table_rental,                                           -- ✅ 完整
    m.chair_rental,                                           -- ✅ 完整
    m.umbrella_rental,                                        -- ✅ 完整
    m.tablecloth_rental,                                      -- ✅ 完整
    m.commission_rate,                                        -- ✅ 完整
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ✅ 完整
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
WHERE (m.owner_id = auth.uid());                                -- 🆕 嚴格 owner 判斷



-- =============================================================================
-- Section 2: staff_accessible_products（不變更）
-- =============================================================================
--
-- 040 審查結果：此 view 無 owner-branch scope bug
--   - Owner branch: WHERE p.owner_id = auth.uid()（已正確，不依賴 market_members）
--   - Staff branch: 透過 sr.staff_id = auth.uid() 判斷
--   - 兩 branch 都用 p.is_active = true 過濾軟刪除
--
-- 040 不動此 view（避免不必要的變更風險）
-- =============================================================================

-- （無變更）


-- =============================================================================
-- Section 3: 重建 staff_accessible_events
-- =============================================================================
--
-- 修正要點:
--   - Branch 1 (STAFF market events): 改用 m.owner_id 串 staff_relationships
--     加 is_deleted 過濾
--   - Branch 2 (STAFF global events): 改用 m.owner_id 串 staff_relationships
--     （不是用 actor_id，避免 product_created with market_id=NULL 誤命中）
--     ⚠️ 040 保守做法：保留 Branch 2 結構，只加 is_deleted + 加註解
--   - Branch 3 (OWNER self events): 保留
--   - Branch 4 (OWNER team events): 改用 m.owner_id 嚴格判斷
--     （從 mm.user_id = auth.uid() 改為 JOIN markets m ON m.id = e.market_id
--       WHERE m.owner_id = auth.uid()）
-- =============================================================================

CREATE OR REPLACE VIEW public.staff_accessible_events AS
-- Branch 1: STAFF（市集事件，payload 脫敏，透過 owner_id 串）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    sr.owner_id                    AS relationship_owner_id,
    sr.permissions,
    'staff'::text                  AS access_type
FROM (events e
    JOIN markets m ON (m.id = e.market_id)                       -- 🆕 透過 markets JOIN
    JOIN staff_relationships sr ON (sr.owner_id = m.owner_id))  -- 🆕 透過 owner_id 串
WHERE ((sr.staff_id = auth.uid())
  AND (sr.status = 'active'::text)
  AND (COALESCE(m.is_deleted, false) = false))                  -- 🆕 排除已刪除市集

UNION ALL

-- Branch 2: STAFF（全局事件，payload 脫敏）
-- ⚠️ 040 保守做法：保留原結構，但加註解說明風險
--   - 員工透過 `e.actor_id = owner_id JOIN staff_relationships` 命中
--   - product_created / product_deleted 沒有 market_id 仍會命中
--   - 前端 useSync 會以 missing_market_id 跳過（已知行為）
SELECT
    e.id,
    e.type,
    public.sanitize_staff_event_payload(e.payload) AS payload,  -- 🛡️ 脫敏
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

-- Branch 3: OWNER（自己的所有事件，payload 完整）
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
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

-- Branch 4: OWNER（市集成員事件，payload 完整，嚴格 owner 判斷）
-- 🆕 從 `mm.user_id = auth.uid()` 改為 `m.owner_id = auth.uid()`
--   原因：員工在 market_members 有 row，會誤命中 owner branch 4
SELECT
    e.id,
    e.type,
    e.payload,                                                  -- ✅ 完整
    e.actor_id,
    e.market_id,
    e."timestamp",
    e.metadata,
    e.sync_status,
    m.owner_id                    AS relationship_owner_id,    -- 🆕 改用 m.owner_id
    '{"can_edit": true, "can_view": true}'::jsonb AS permissions,
    'owner'::text                  AS access_type
FROM (events e
    JOIN markets m ON (m.id = e.market_id))                    -- 🆕 JOIN markets
WHERE ((m.owner_id = auth.uid())                                -- 🆕 嚴格 owner
  AND (e.actor_id <> auth.uid()));



-- =============================================================================
-- Section 4: 套用後驗證 SQL（人工執行）
-- =============================================================================
--
-- ⚠️ 驗證 SQL 全部用 transaction 包住：
--
--   BEGIN;
--   SET LOCAL ROLE authenticated;
--   SELECT set_config('request.jwt.claim.sub', 'STAFF_USER_UUID', true);
--   -- verification query
--   ROLLBACK;
--
-- 驗證順序：
--   1. Staff 不應有 access_type='owner' 命中
--   2. Staff 不應有重複 market id
--   3. Staff 不應有 is_deleted=true market
--   4. Owner 仍可看到完整資料
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 驗證 1: Staff 不應命中 owner branch（scope leak 防護）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 1a. 不應有 access_type='owner'
SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;
-- 預期：只有 1 row，access_type='staff'，count = (該 owner 旗下市集數 - 已刪除數)

-- 1b. 不應有同一 market id 出現兩次
SELECT id, count(*)
FROM staff_accessible_markets
GROUP BY id
HAVING count(*) > 1;
-- 預期：0 rows

-- 1c. 不應有 is_deleted=true
SELECT id, name, is_deleted
FROM staff_accessible_markets
WHERE COALESCE(is_deleted, false) = true;
-- 預期：0 rows

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 2: Staff events 不應命中 owner branch
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 2a. 不應有 access_type='owner'
SELECT access_type, count(*)
FROM staff_accessible_events
GROUP BY access_type;
-- 預期：只有 1 row，access_type='staff'

-- 2b. payload 仍應 scrubbed（boothCost 不應存在）
SELECT
  type,
  count(*) FILTER (WHERE payload ? 'boothCost') AS has_boothCost,
  count(*) FILTER (WHERE payload ? 'cost')      AS has_cost,
  count(*) FILTER (WHERE payload ? 'supplierInfo') AS has_supplierInfo
FROM staff_accessible_events
WHERE type IN ('market_created', 'product_created', 'deal_closed')
GROUP BY type;
-- 預期：所有 has_* = 0

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 3: Staff 不應拉到 global product_created / product_deleted 誤命中
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- 3a. 確認 staff global events 數量
SELECT type, count(*)
FROM staff_accessible_events
WHERE market_id IS NULL
GROUP BY type;
-- 預期：product_created / product_deleted 仍會命中（Branch 2 保留）
--   但 owner 已 verify 過，前端 useSync 會以 missing_market_id 跳過

-- 3b. 確認 staff market events（market_id NOT NULL）的 access_type
SELECT
  COUNT(*) FILTER (WHERE access_type = 'staff')  AS staff_branch,
  COUNT(*) FILTER (WHERE access_type = 'owner')  AS owner_branch
FROM staff_accessible_events
WHERE market_id IS NOT NULL;
-- 預期：owner_branch = 0（員工只能命中 staff branch）

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 4: Owner 仍可看到完整資料
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'OWNER_USER_UUID', true);  -- 換成實際 owner UUID

-- 4a. Owner 看市集
SELECT access_type, count(*)
FROM staff_accessible_markets
GROUP BY access_type;
-- 預期：access_type='owner'，count = (該 owner 旗下市集數)

-- 4b. Owner 看 markets 真實敏感欄位
SELECT name, booth_cost, total_profit, commission_rate
FROM staff_accessible_markets
WHERE access_type = 'owner'
LIMIT 1;
-- 預期：booth_cost / total_profit / commission_rate 都是真實值

-- 4c. Owner 看商品 cost
SELECT name, cost, price
FROM staff_accessible_products
WHERE access_type = 'owner'
LIMIT 1;
-- 預期：cost 是真實值

-- 4d. Owner 看 events payload
SELECT type, payload->>'boothCost' AS booth_cost
FROM staff_accessible_events
WHERE access_type = 'owner' AND type = 'market_created'
LIMIT 1;
-- 預期：payload 是完整 JSONB，booth_cost 不是 NULL

-- 4e. Owner 仍可看到市集成員事件（其他用戶的）
SELECT type, count(*)
FROM staff_accessible_events
WHERE access_type = 'owner' AND actor_id <> auth.uid()
GROUP BY type;
-- 預期：有多種類型（market_created / deal_closed / interaction_recorded / 等）

ROLLBACK;
*/


-- -----------------------------------------------------------------------------
-- 驗證 5: 040 套用前 vs 套用後對照（用 markets 數量差異確認 scope 收斂）
-- -----------------------------------------------------------------------------
/*
-- 套用 040 前先跑一次（用 staff_id）
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);
SELECT count(*) AS pre_040_markets FROM staff_accessible_markets;
SELECT count(*) AS pre_040_events FROM staff_accessible_events;
ROLLBACK;

-- 套用 040 後再跑一次
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);
SELECT count(*) AS post_040_markets FROM staff_accessible_markets;
SELECT count(*) AS post_040_events FROM staff_accessible_events;
ROLLBACK;

-- 預期：post_040_markets << pre_040_markets（刪除 owner branch 命中）
--       post_040_events 接近 pre_040_events - (owner branch 4 命中數)
*/


-- =============================================================================
-- Section 5: 已知限制
-- =============================================================================
--
-- 1. 040 只能修 staff_accessible_* view 層
--    E2 已證明 Staff 仍可能透過底表 RLS 直接 SELECT markets 取得敏感欄位
--    因此 C2.29B-2 仍需規劃 base table RLS tightening
--    或前端完全遷移到 staff-safe view / RPC 後再收緊底表
--
-- 2. Branch 2 (STAFF global events) 040 保守不刪
--    員工仍會拉到 market_id IS NULL 的 product_created / product_deleted
--    前端 useSync 已用 missing_market_id 跳過（已知）
--    風險：若日後 owner 改用 global product_created 寫入敏感 payload，
--          員工 Branch 2 仍會看到（雖 payload 已 scrubbed）
--    建議：C2.29B-2 評估是否刪 Branch 2 或在 Branch 2 加 is_active 過濾
--
-- 3. staff_accessible_products 040 不變更（無 bug）
--    維持既有 `p.owner_id = auth.uid()` + `p.is_active = true` 結構
--
-- 4. 040 不修改底表 RLS
--    不修改前端
--    不修改 PermissionGate / useUserRole
--    不修改 C2.28 已完成邏輯
--
-- 5. 套用後員工 UI 仍可正常運作（PermissionGate 已 fail-closed）
--    040 是收緊 scope（員工看到更少），不是放寬
--    若前端 useSync 對「員工看不到部分 market」處理正確，UI 不會 regression
--
-- =============================================================================


-- =============================================================================
-- Section 6: 套用方式（人工）
-- =============================================================================
--
-- 建議正式套用時使用 transaction：
--
--   BEGIN;
--   -- 貼上 Section 1 + 3 的 migration body
--   -- (staff_accessible_markets 重建 + staff_accessible_events 重建)
--   -- staff_accessible_products 040 不變更
--
--   -- 立即跑 §4 驗證 SQL
--   -- 預期：
--   --   1a. 員工只命中 access_type='staff'
--   --   1b. 沒有重複 market id
--   --   1c. 沒有 is_deleted=true market
--   --   2a. 員工 events 只命中 access_type='staff'
--   --   4a-4e. Owner 仍可看到完整資料
--
--   -- 全部通過：
--   COMMIT;
--   -- 任一失敗：
--   --   ROLLBACK;
--
-- 提醒：
--   - 不要在未驗證前 COMMIT
--   - 驗證順序：先 Staff（1-3）→ 再 Owner（4）→ 最後前後對照（5）
--   - 驗證完成後記錄套用結果（更新 docs/C2.29B_VIEW_SCOPE_AUDIT_2026_06_15.md）
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
--      → Staff SELECT markets = 0 row.
--      → Staff must go through staff_accessible_markets view.
--   2. products: drop "Users can view own and team products" (014, includes
--      team + is_shared path that exposes cost to staff) and any other
--      staff-friendly SELECT policy; replace with products_select_owner_only.
--      → Staff SELECT products = 0 row.
--      → Staff must go through staff_accessible_products view.
--   3. events: drop both legacy SELECT policies
--      - "用戶可以查看自己的事件和市集事件" (015, uses market_members)
--      - "users_can_view_events" (online-only, simplified)
--      Replace with events_select_owner_only that is STRICTLY owner-only:
--        - market_id IN (owned markets)  --  owner 旗下市集事件
--        - market_id IS NULL AND actor_id = auth.uid()
--          AND EXISTS (markets.owner_id = auth.uid())  --  owner 自己寫的全局事件
--      Note: actor_id = auth.uid() alone is REMOVED — staff who wrote
--      an event (e.g. via the 025 staff_relationships insert path) would
--      otherwise still be able to SELECT events directly with
--      actor_id = auth.uid(). The new condition ties global events to
--      the actor being an owner of at least one market.
--      → Staff SELECT events = 0 row.
--      → Staff must go through staff_accessible_events view.
--
-- Helper format reminder:
--   current_user_owned_market_ids()  returns  TABLE(id UUID)
--   (per 035_fix_p0_rls_security.sql line 60-70)
--   → market_id IN (SELECT id FROM public.current_user_owned_market_ids())
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
-- STEP 0: Preflight — verify view security mode + helper format
-- Refuses to proceed if any staff_accessible_* view is SECURITY INVOKER.
-- Run each query manually, then if all pass, mark a session variable
-- to acknowledge the preflight. The DO block below checks for that
-- acknowledgment and RAISES otherwise.
-- ============================================================

-- P0.1: Helper return type
-- Expected: TABLE (id uuid)
SELECT pg_get_function_result('public.current_user_owned_market_ids()'::regprocedure) AS owned_market_ids_return_type;
-- If this returns 'TABLE (id uuid)' → OK.
-- If it returns 'SETOF uuid' → use SELECT * instead of SELECT id (both work
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
-- If any row shows "SECURITY INVOKER (BREAKS 041)" → STOP, do not apply.
--   The user must run a follow-up migration to flip the view to DEFINER
--   (out of scope for 041).

-- P0.4: Hard gate — refuse to run STEP 2-5 if any view is INVOKER.
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
  v_security_type text;
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
-- Note: 015 created "用戶可以查看自己的事件和市集事件" with
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
  -- 自己市集的事件（透過 markets.owner_id 嚴格 owner 判斷）
  market_id IN (SELECT id FROM public.current_user_owned_market_ids())
  OR
  -- 自己建立的全局事件（market_id IS NULL），且自己必須是某個市集的 owner
  -- 為何要 EXISTS：單純 actor_id = auth.uid() 會讓 staff 透過 025
  -- staff_relationships 寫入的事件仍可 SELECT；加 EXISTS 限縮為 owner。
  (
    market_id IS NULL
    AND actor_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.markets m WHERE m.owner_id = auth.uid())
  )
);


-- ============================================================
-- STEP 5: Note about INSERT / UPDATE / DELETE (intentionally untouched)
-- ============================================================

-- events INSERT: "用戶可以插入事件_v3" (025) is preserved as-is.
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
    '用戶可以查看自己的事件和市集事件',
    'users_can_view_events'
  );
-- Expected: 0 rows

-- ============================================================
-- STAFF DIRECT TABLE SELECT (must be 0 rows)
-- ============================================================

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

-- Staff direct markets SELECT → expected 0
SELECT count(*) AS staff_markets_direct FROM markets;

-- Staff direct products SELECT → expected 0
SELECT count(*) AS staff_products_direct FROM products;

-- Staff direct events SELECT → expected 0
SELECT count(*) AS staff_events_direct FROM events;

ROLLBACK;

-- ============================================================
-- STAFF VIEW STILL WORKS (脱敏有效)
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

-- Owner markets direct SELECT → expected > 0
SELECT count(*) AS owner_markets_direct FROM markets;

-- Owner products direct SELECT → expected > 0
SELECT count(*) AS owner_products_direct FROM products;

-- Owner events direct SELECT → expected > 0
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
--     re-introducing staff → base-table queries)
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
-- BEGIN SOURCE: quick_test_database_compat_drop_staff_accessible_views.sql
-- ============================================================

-- BoothBook / Markit quick test database compatibility patch
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
-- BEGIN SOURCE: 042_preserve_staff_rental_existence.sql
-- ============================================================

-- ============================================================
-- Phase C2.30A-1.1: Staff Rental Amount Preservation
-- Migration: 042_preserve_staff_rental_existence.sql
-- Date: 2026-06-17
-- Severity: P1（員工設備狀態誤判）
-- 建立者: Cursor (Codex)
--
-- 問題：
-- staff_accessible_markets view 對員工 branch 把 table_rental / chair_rental /
-- umbrella_rental / tablecloth_rental 全部設為 NULL（沿襲 039_staff_view_hardening）。
-- 這導致員工看到市集時，market.tableRental 為 undefined，
-- StaffMarketDetailView 的判斷（tableFree || tableRental > 0 || 自備）
-- 永遠落到「自備」。
--
-- 設計修正：
-- 員工需要「設備是否承租」這個狀態（用於 UI 顯示「已承租 / 自備 / 免費提供」）。
-- 金額本身對員工無保密必要（員工本來就要知道自己要不要帶設備），
-- 直接保留 owner 設的金額：
-- - 老闆設 tableRental = 500 → 員工看到 table_rental = 500 → UI 顯示「已承租」
-- - 老闆設 tableRental = 0   → 員工看到 table_rental = 0   → UI 顯示「自備」
-- - 老闆設 tableFree = true   → 員工看到 table_free = true   → UI 顯示「免費提供」
--
-- 配合 PermissionGate.ts：market + event entity 的 rental 欄位不視為敏感，
-- 確保 events replay 時 payload.tableRental 仍寫入市集 snapshot。
--
-- Owner branch 不變（保留完整金額）。
-- ============================================================

CREATE OR REPLACE VIEW public.staff_accessible_markets AS
-- Branch 1: STAFF（敏感欄位脫敏；設備存在性保留）
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
    NULL::numeric(10,2)                  AS registration_fee,    -- 🛡️ 脫敏
    NULL::numeric(10,2)                  AS booth_cost,          -- 🛡️ 脫敏
    m.deposit,                                                 -- 🟢 保留（保證金提醒）
    -- ✅ 設備租金金額保留（員工需知道「已承租 / 自備 / 免費提供」）
    -- UI 判斷：tableFree=true → 免費提供 / tableRental > 0 → 已承租 / 其他 → 自備
    -- 金額本身對員工無保密必要，無需脫敏（無商業敏感性，不會被競爭對手取得）
    m.table_rental,
    m.chair_rental,
    m.umbrella_rental,
    m.tablecloth_rental,
    NULL::numeric(5,2)                   AS commission_rate,     -- 🛡️ 脫敏
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric(10,2)                  AS total_profit,        -- 🛡️ 脫敏
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

-- Branch 2: OWNER（完整欄位）
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
    m.registration_fee,                                       -- ✅ 完整
    m.booth_cost,                                             -- ✅ 完整
    m.deposit,                                                -- ✅ 完整
    m.table_rental,                                           -- ✅ 完整
    m.chair_rental,                                           -- ✅ 完整
    m.umbrella_rental,                                        -- ✅ 完整
    m.tablecloth_rental,                                      -- ✅ 完整
    m.commission_rate,                                        -- ✅ 完整
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    m.total_profit,                                           -- ✅ 完整
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
-- Verification ROLLBACK example（驗證 1：Staff 查 staff_accessible_markets）
-- -----------------------------------------------------------------------------
/*
BEGIN;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '5e92b457-1eaf-49eb-9295-ba47b5a3e575', true);

SELECT
    name,
    table_rental,         -- 預期：保留 owner 設的金額（> 0 表示已承租）
    chair_rental,         -- 預期：保留
    umbrella_rental,      -- 預期：保留
    tablecloth_rental,    -- 預期：保留
    table_free,           -- 預期：保留
    registration_fee,     -- 預期：NULL
    total_revenue         -- 預期：保留
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
-- Phase: P1（純 DB + RPC，零前端 / runtime 行為變動）
--
-- 目標：
-- 讓 staff_relationships 表具備 role-based 員工權限的基礎能力，
-- 但前端目前不讀取、不顯示、不使用這個 role。
--
-- 角色：
--   viewer   - 基礎查看者（純只查看，不可寫入）
--   operator - 出攤助手（可記錄互動 / 成交 / 編輯自己當日紀錄）
--   manager  - 管理員（operator 額外 + 協助編輯市集 / 商品基本資料）
--
-- 設計原則：
--   - role 為 Primary Source of Truth
--   - permissions JSON 仍保留（過渡用），由 RPC 同步更新
--   - DEFAULT 'viewer' 確保新記錄與既有邀請流程安全
--   - CHECK 限制合法 enum
--   - 回填既有資料：can_edit=true → operator，false → viewer
--   - update_staff_role RPC 為唯一受控寫入路徑
--   - 不 DROP 任何 RLS policy
--   - 不加固 WITH CHECK（保留既有 "Staff can accept invitations"）
--   - 不動其他 TS / UI / sync / Dexie
-- ============================================================

-- ============================================================
-- A. 新增 role 欄位
-- ============================================================

ALTER TABLE staff_relationships
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'viewer';

-- ============================================================
-- B. 新增 CHECK constraint（用 DO $$ 避免重複新增）
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
-- C. 回填舊資料
-- 規則：
--   permissions.can_edit = true  → operator
--   其他 / false / null          → viewer
-- DEFAULT 'viewer' 已經處理了新增列，UPDATE 處理既有列
-- ============================================================

UPDATE staff_relationships
SET role = CASE
  WHEN COALESCE((permissions->>'can_edit')::boolean, false) = true THEN 'operator'
  ELSE 'viewer'
END;

-- ============================================================
-- D. 建立 update_staff_role RPC
-- 唯一受控寫入路徑（owner 才能調整自己 active 員工的角色）
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
  -- (1) 驗證 role 參數（enum gate）
  IF p_role NOT IN ('viewer', 'operator', 'manager') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be viewer, operator, or manager.', p_role
      USING ERRCODE = '22023';
  END IF;

  -- (2) 讀取目標記錄
  SELECT owner_id, staff_id, status
    INTO v_owner_id, v_staff_id, v_status
    FROM staff_relationships
   WHERE id = p_relationship_id;

  -- (3) 驗證存在性
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff relationship not found: %', p_relationship_id
      USING ERRCODE = 'P0002';
  END IF;

  -- (4) 驗證呼叫者為 owner
  IF v_owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: you are not the owner of this staff relationship.'
      USING ERRCODE = '42501';
  END IF;

  -- (5) 驗證 status = active
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'Cannot change role for % relationship; only active relationships are editable.', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- (6) 禁止 staff 自己改自己
  IF v_staff_id = auth.uid() THEN
    RAISE EXCEPTION 'Not authorized: staff cannot change their own role.'
      USING ERRCODE = '42501';
  END IF;

  -- (7) 執行更新（只允許 role + 過渡用 permissions）
  -- updated_at 由既有 trigger (update_staff_relationships_timestamp) 自動更新
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

  -- (8) 回傳更新後記錄
  RETURN v_record;
END;
$$;


-- ============================================================
-- E. 收緊 RPC 權限
-- Supabase 預設 PUBLIC 有 EXECUTE，必須明確 revoke
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
-- Phase:     P3a 必要前置（讓前端可安全讀取 role）
--
-- 背景：
-- 043_staff_role_foundation.sql 已建立 staff_relationships.role 欄位
-- 並回填既有資料為 'viewer' / 'operator' / 'manager'。
-- 但 043 沒改 get_my_staff()，因此 owner 端 staff list 仍拿不到 role。
-- P3a 計畫在 StaffManagement 顯示 role badge，
-- 前置條件是 get_my_staff() 回傳 role 欄位。
--
-- 改動範圍：
--   - 重建 get_my_staff() RETURNS TABLE，新增 role TEXT 欄位
--   - 不改其他 RPC（get_my_owners / is_staff_of / accept_invitation_and_bind）
--   - 不改 RLS policy
--   - 不改前端 runtime 行為（沒改任何 TS / UI）
--   - 不加 GRANT / REVOKE（既有 20240220_staff_system_simple.sql 沒做特別授權，
--     維持 Postgres 預設 PUBLIC EXECUTE 狀態）
--
-- 安全性：
--   - 保留 SECURITY DEFINER
--   - 加上 SET search_path = public（與 043 風格一致，避免 search_path 攻擊）
--   - DROP FUNCTION 不用 CASCADE（get_my_staff 沒有相依物件）
--   - SQL 內部不動 owner_id 推導邏輯（仍 WHERE sr.owner_id = auth.uid()）
-- ============================================================

-- 1. 刪除舊 function（return type 改變，CREATE OR REPLACE 會失敗）
--    不使用 CASCADE：get_my_staff 沒有相依物件（view / trigger / 其他 function）
DROP FUNCTION IF EXISTS public.get_my_staff();

-- 2. 重建 function，新增 role 欄位
CREATE OR REPLACE FUNCTION public.get_my_staff()
RETURNS TABLE (
  staff_id      UUID,
  staff_email   TEXT,
  status        TEXT,
  permissions   JSONB,
  role          TEXT,         -- ✅ 新增：043 之後 owner 可看到員工角色
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

-- 3. 更新 function 註解

-- ============================================================
-- 驗證 SQL（人工套用後執行）
-- ============================================================
/*
-- 1. function 存在且回傳正確欄位
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

-- 預期：
--   result_definition 含 "role text"
--   is_security_definer = true
--   config_settings 含 {search_path=public}

-- 2. 驗證 owner 可正常查詢
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<owner_user_id>', true);
SELECT staff_id, role, status FROM public.get_my_staff();
-- 預期：每筆 role 都是 'viewer' / 'operator' / 'manager'

-- 3. 驗證其他 RPC 沒被改
SELECT proname FROM pg_proc
WHERE proname IN ('get_my_staff', 'get_my_owners', 'is_staff_of', 'accept_invitation_and_bind')
ORDER BY proname;
-- 預期：4 個都存在
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
-- Phase:     P4 必要前置（讓 update_staff_role() 可以從前端拿 relationship id）
--
-- 背景：
-- 043_staff_role_foundation.sql 建立 staff_relationships.role
-- 044_get_my_staff_add_role.sql 讓 get_my_staff() 回傳 role
-- 045 補上 relationship_id 欄位（staff_relationships.id 主鍵）
-- 供未來 update_staff_role(p_relationship_id, p_role) 使用
--
-- 改動範圍：
--   - 重建 get_my_staff() RETURNS TABLE，新增 relationship_id UUID 欄位
--   - 不改其他 RPC（get_my_owners / is_staff_of / accept_invitation_and_bind / update_staff_role）
--   - 不改 RLS policy
--   - 不改前端 runtime 行為（沒改任何 TS / UI）
--   - 不加 GRANT / REVOKE（既有 20240220_staff_system_simple.sql 沒做特別授權，
--     維持 Postgres 預設 PUBLIC EXECUTE 狀態；044 也無 GRANT / REVOKE）
--
-- 安全性：
--   - 保留 SECURITY DEFINER
--   - 加上 SET search_path = public（與 043 / 044 風格一致，避免 search_path 攻擊）
--   - DROP FUNCTION 不用 CASCADE（get_my_staff 沒有相依物件）
--   - SQL 內部不動 owner_id 推導邏輯（仍 WHERE sr.owner_id = auth.uid()）
-- ============================================================

-- 1. 刪除舊 function（return type 改變，CREATE OR REPLACE 會失敗）
--    不使用 CASCADE：get_my_staff 沒有相依物件（view / trigger / 其他 function）
DROP FUNCTION IF EXISTS public.get_my_staff();

-- 2. 重建 function，新增 relationship_id 欄位
CREATE OR REPLACE FUNCTION public.get_my_staff()
RETURNS TABLE (
  relationship_id  UUID,        -- ✅ 新增：staff_relationships.id（主鍵）
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

-- 3. 更新 function 註解

-- ============================================================
-- 驗證 SQL（人工套用後執行）
-- ============================================================
/*
-- 1. function 存在且回傳正確欄位
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

-- 預期：
--   result_definition 含 "relationship_id uuid, staff_id uuid, ..., role text"
--   is_security_definer = true
--   config_settings 含 {search_path=public}

-- 2. 驗證 owner 可正常查詢
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<owner_user_id>', true);
SELECT relationship_id, staff_id, role, status FROM public.get_my_staff();
-- 預期：每筆 relationship_id 都有值，role 都是 'viewer' / 'operator' / 'manager'

-- 3. 驗證其他 RPC 沒被改
SELECT proname FROM pg_proc
WHERE proname IN ('get_my_staff', 'get_my_owners', 'is_staff_of', 'accept_invitation_and_bind', 'update_staff_role')
ORDER BY proname;
-- 預期：5 個都存在
*/

-- ============================================================
-- End of 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- END SOURCE: 045_get_my_staff_add_relationship_id.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 046_align_staff_permissions_with_role.sql
-- ============================================================

-- ============================================================
-- Migration: 046_align_staff_permissions_with_role.sql
-- Date: 2026-06-18
-- Phase: P3 legacy align（純資料回填 + DDL default + RPC literal 修正）
--
-- 目標：
-- 讓 staff_relationships.permissions 與 staff_relationships.role 對齊
-- 解決既有 viewer 員工 runtime fallback L2（無 infoLevel）造成的資料落差。
--
-- 此 migration 會讓 viewer 從舊 fallback L2 收斂為明確 L0。
-- Production audit 顯示受影響 active viewer 為 2 筆，revoked viewer 1 筆。
--
-- Role matrix（與 043_staff_role_foundation.sql update_staff_role RPC CASE 對齊）：
--   viewer   → can_view=true, can_edit=false, infoLevel=0
--   operator → can_view=true, can_edit=true,  infoLevel=2
--   manager  → can_view=true, can_edit=true,  infoLevel=2
--
-- 設計原則：
--   - 純資料 / DDL / RPC literal 修補，不引入新 runtime 行為
--   - 不改 update_staff_role RPC 行為（043 已正確）
--   - 不改 RLS policy
--   - 不改 function signature
-- ============================================================

-- ============================================================
-- A. 將 permissions DDL DEFAULT 改為 viewer + L0
--    影響：未來 INSERT 未指定 permissions 的 row 會拿到含 infoLevel=0 的完整 JSON
-- ============================================================

ALTER TABLE staff_relationships
  ALTER COLUMN permissions SET DEFAULT
  '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb;


-- ============================================================
-- B. 回填所有既有 staff_relationships，讓 permissions 與 role 一致
--
-- 規則（與 043 update_staff_role RPC CASE 對齊）：
--   role = 'viewer'   → infoLevel=0, can_edit=false
--   role = 'operator' → infoLevel=2, can_edit=true
--   role = 'manager'  → infoLevel=2, can_edit=true
--   其他 / NULL         → infoLevel=0, can_edit=false（保守預設）
--
-- 影響：
--   - 既有缺 infoLevel 的 active viewer：L2 → L0（會感知到收入/價格/成交統計被隱藏）
--   - 既有缺 infoLevel 的 revoked viewer：同上，但 revoked 已無 active session
--   - 既有 operator / manager：已是 L2 回填為 noop
--   - 既有 row 若有其他自訂 key：會被整個覆蓋為 role matrix 對應 JSON
-- ============================================================

UPDATE staff_relationships
SET permissions = jsonb_build_object(
      'can_view', true,
      'can_edit', (role IN ('operator', 'manager')),
      'infoLevel', CASE
        WHEN role = 'viewer' THEN 0
        WHEN role IN ('operator', 'manager') THEN 2
        ELSE 0
      END
    )
WHERE role IN ('viewer', 'operator', 'manager');

-- ============================================================
-- C. 重建 accept_invitation_and_bind RPC
--
-- 031 / 032 已是最終覆寫版本（028 為初始），重建 032 body 即可。
-- 唯一變更：permissions literal 加入 infoLevel=0。
-- 不改：function signature、回傳型別、RLS 權限、業務流程。
-- ============================================================

CREATE OR REPLACE FUNCTION accept_invitation_and_bind(
  p_token TEXT,
  p_staff_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  relationship_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_relationship_id UUID;
  v_staff_id UUID;
  v_staff_email TEXT;
  v_existing_owner_count INTEGER;
BEGIN
  v_staff_id := auth.uid();

  IF v_staff_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_staff_id IS NOT NULL AND p_staff_id <> v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Authenticated user does not match staff id'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM staff_invitations si
  WHERE si.token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid invitation token'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, 'Invitation has expired'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF v_owner_id = v_staff_id THEN
    RETURN QUERY SELECT FALSE, 'Owner cannot accept their own invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO v_existing_owner_count
  FROM staff_relationships
  WHERE staff_id = v_staff_id
  AND status IN ('pending', 'active');

  IF v_existing_owner_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'This user is already bound to an owner'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT email INTO v_staff_email
  FROM auth.users
  WHERE id = v_staff_id;

  INSERT INTO staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  ) VALUES (
    v_owner_id,
    v_staff_id,
    v_staff_email,
    'active',
    NOW(),
    '{"can_view": true, "can_edit": false, "infoLevel": 0}'::jsonb
  )
  ON CONFLICT (owner_id, staff_id)
  DO UPDATE SET
    staff_email = EXCLUDED.staff_email,
    status = 'active',
    accepted_at = NOW(),
    permissions = EXCLUDED.permissions,
    updated_at = NOW()
  RETURNING id INTO v_relationship_id;

  INSERT INTO market_members (
    market_id,
    user_id,
    role,
    joined_at
  )
  SELECT
    m.id,
    v_staff_id,
    'staff',
    NOW()
  FROM markets m
  WHERE m.owner_id = v_owner_id
    AND m.status IN ('ongoing', 'registered', 'accepted', 'paid')
    AND NOT EXISTS (
      SELECT 1 FROM market_members mm
      WHERE mm.market_id = m.id
        AND mm.user_id = v_staff_id
    );

  DELETE FROM staff_invitations
  WHERE token = p_token;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;


-- ============================================================
-- End of 046_align_staff_permissions_with_role.sql
-- ============================================================

-- ============================================================
-- 驗證 SQL（套用後人工執行，預期結果如下）
-- ============================================================
--
-- (1) 預期所有 row has_info_level = true
-- SELECT
--   status,
--   role,
--   permissions ? 'infoLevel' AS has_info_level,
--   permissions->>'infoLevel' AS info_level,
--   COUNT(*) AS count
-- FROM staff_relationships
-- GROUP BY status, role, has_info_level, info_level
-- ORDER BY status, role, has_info_level, info_level;
--
-- 預期：每個 (status, role) 群組都有 has_info_level=true 的 row
--      不應有 has_info_level=false 的 row
--
-- (2) 預期 can_edit 與 infoLevel 對齊 role matrix
-- SELECT
--   role,
--   permissions->>'can_edit' AS can_edit,
--   permissions->>'infoLevel' AS info_level,
--   COUNT(*) AS count
-- FROM staff_relationships
-- GROUP BY role, can_edit, info_level
-- ORDER BY role, can_edit, info_level;
--
-- 預期：
--   viewer   / can_edit=false / infoLevel=0
--   operator / can_edit=true  / infoLevel=2
--   manager  / can_edit=true  / infoLevel=2
-- ============================================================

-- ============================================================
-- END SOURCE: 046_align_staff_permissions_with_role.sql
-- ============================================================
