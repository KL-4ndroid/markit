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

COMMENT ON FUNCTION public.sanitize_staff_event_payload(jsonb) IS
  'C2.29B-1: 給 staff branch 用的 payload 脫敏 helper。移除 top-level 敏感 key（含 camelCase + snake_case）並遞迴處理 items[] 陣列內的 object。tombstone key（deal_deleted / interaction_deleted）不在移除清單中。';


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
    NULL::numeric                  AS registration_fee,    -- 🛡️ 脫敏
    NULL::numeric                  AS booth_cost,          -- 🛡️ 脫敏
    m.deposit,                                                 -- 🟢 保留（保證金提醒）
    NULL::numeric                  AS table_rental,        -- 🛡️ 脫敏
    NULL::numeric                  AS chair_rental,        -- 🛡️ 脫敏
    NULL::numeric                  AS umbrella_rental,     -- 🛡️ 脫敏
    NULL::numeric                  AS tablecloth_rental,   -- 🛡️ 脫敏
    NULL::numeric                  AS commission_rate,     -- 🛡️ 脫敏
    m.table_free,
    m.chair_free,
    m.umbrella_free,
    m.tablecloth_free,
    m.total_revenue,
    NULL::numeric                  AS total_profit,        -- 🛡️ 脫敏
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

COMMENT ON VIEW public.staff_accessible_markets IS
  'C2.29B-1: 員工可訪問的市集 view。Staff branch 敏感費用欄位輸出 NULL，Owner branch 保留完整。UNION ALL 結構維持欄位一致。';


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
    NULL::numeric                  AS cost,                -- 🛡️ 脫敏
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

COMMENT ON VIEW public.staff_accessible_products IS
  'C2.29B-1: 員工可訪問的商品 view。Staff branch cost 輸出 NULL，Owner branch 保留完整。UNION ALL 結構維持欄位一致。';


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

COMMENT ON VIEW public.staff_accessible_events IS
  'C2.29B-1: 員工可訪問的事件 view。Staff branch payload 呼叫 sanitize_staff_event_payload() 脫敏，Owner branch 保留完整 payload。tombstone 事件（deal_deleted / interaction_deleted）保留可見。';


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
