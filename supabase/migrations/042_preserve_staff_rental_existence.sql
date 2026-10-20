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

COMMENT ON VIEW public.staff_accessible_markets IS
  'C2.30A-1.1: 員工可訪問的市集 view。Staff branch 敏感費用欄位（boothCost / registrationFee / commissionRate / totalProfit）脫敏為 NULL，設備 rental 金額（table_rental / chair_rental / umbrella_rental / tablecloth_rental）保留。Owner branch 保留完整金額。UNION ALL 結構維持欄位一致。';


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
