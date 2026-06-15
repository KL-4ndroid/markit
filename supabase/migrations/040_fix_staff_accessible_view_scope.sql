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

COMMENT ON VIEW public.staff_accessible_markets IS
  'C2.29B-1.1: 員工可訪問的市集 view。Owner branch 改用 m.owner_id 嚴格判斷（避免員工誤命中）；Staff branch 加 is_deleted 過濾；Staff branch 改用 m.owner_id 串 staff_relationships（不依賴 market_members）。';


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

COMMENT ON VIEW public.staff_accessible_events IS
  'C2.29B-1.1: 員工可訪問的事件 view。Owner branch 4 改用 m.owner_id 嚴格判斷（避免員工誤命中）；Staff branch 1 改用 m.owner_id 串 staff_relationships（不依賴 market_members）；加 is_deleted 過濾。Branch 2 保留 product_created / product_deleted 結構（前端 useSync 會以 missing_market_id 跳過）。tombstone 事件保留可見。';


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
