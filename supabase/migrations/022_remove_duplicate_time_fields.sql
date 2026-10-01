-- ==================== Migration 022 (修正版) ====================
-- 日期：2026-02-22
-- 說明：移除重複的時間欄位（start_time & end_time）
-- 原因：與 operating_start_time & operating_end_time 重複，造成程式邏輯混亂
-- 修正：先更新依賴的視圖，再安全刪除欄位

-- ==================== 問題說明 ====================
-- 當前 markets 表有兩組幾乎相同的時間欄位：
-- 1. start_time & end_time（幾乎沒有使用）
-- 2. operating_start_time & operating_end_time（實際在使用）
--
-- 依賴關係：
-- - staff_accessible_markets 視圖使用 m.* 包含了所有欄位
-- - 需要先更新視圖，明確列出欄位，排除 start_time 和 end_time

-- ==================== 風險評估 ====================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '🔍 Migration 022 風險評估';
  RAISE NOTICE '========================================';
  RAISE NOTICE '風險等級：低';
  RAISE NOTICE '影響範圍：';
  RAISE NOTICE '  - staff_accessible_markets 視圖（需要重建）';
  RAISE NOTICE '  - staff_accessible_products 視圖（需要重建）';
  RAISE NOTICE '  - markets 表（移除 2 個欄位）';
  RAISE NOTICE '';
  RAISE NOTICE '安全措施：';
  RAISE NOTICE '  1. 先備份數據到 operating_* 欄位';
  RAISE NOTICE '  2. 重建視圖，明確列出欄位';
  RAISE NOTICE '  3. 刪除欄位';
  RAISE NOTICE '  4. 完整驗證';
  RAISE NOTICE '========================================';
END $$;

-- ==================== 驗證當前數據 ====================
DO $$
DECLARE
  start_time_count INTEGER;
  end_time_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO start_time_count FROM markets WHERE start_time IS NOT NULL;
  SELECT COUNT(*) INTO end_time_count FROM markets WHERE end_time IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 數據統計：';
  RAISE NOTICE '  - 使用 start_time 的市集數量: %', start_time_count;
  RAISE NOTICE '  - 使用 end_time 的市集數量: %', end_time_count;
  
  IF start_time_count > 0 OR end_time_count > 0 THEN
    RAISE NOTICE '⚠️ 發現有市集使用舊欄位，將自動遷移數據';
  ELSE
    RAISE NOTICE '✅ 沒有市集使用舊欄位，可以安全移除';
  END IF;
END $$;

-- ==================== 步驟 1：備份數據 ====================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📦 步驟 1/4：備份數據';
END $$;

UPDATE markets
SET 
  operating_start_time = COALESCE(operating_start_time, start_time),
  operating_end_time = COALESCE(operating_end_time, end_time),
  updated_at = NOW()
WHERE 
  (start_time IS NOT NULL AND operating_start_time IS NULL)
  OR (end_time IS NOT NULL AND operating_end_time IS NULL);

DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count 
  FROM markets 
  WHERE operating_start_time IS NOT NULL OR operating_end_time IS NOT NULL;
  
  RAISE NOTICE '✅ 數據備份完成：% 個市集有營業時間設定', migrated_count;
END $$;

-- ==================== 步驟 2：重建視圖（明確列出欄位）====================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔧 步驟 2/4：重建視圖';
END $$;

-- 刪除舊視圖
DROP VIEW IF EXISTS staff_accessible_markets CASCADE;
DROP VIEW IF EXISTS staff_accessible_products CASCADE;

-- 重建 staff_accessible_markets 視圖（明確列出欄位，排除 start_time 和 end_time）
CREATE OR REPLACE VIEW staff_accessible_markets AS
SELECT 
  -- 明確列出所有需要的欄位（排除 start_time 和 end_time）
  m.id,
  m.owner_id,
  m.name,
  m.location,
  m.start_date,
  m.end_date,
  -- ❌ 不包含 m.start_time
  -- ❌ 不包含 m.end_time
  m.status,
  m.early_entry_enabled,
  m.early_entry_time,
  m.check_in_time,
  m.operating_start_time,  -- ✅ 保留
  m.operating_end_time,    -- ✅ 保留
  m.registration_fee,
  m.booth_cost,
  m.deposit,
  m.table_rental,
  m.chair_rental,
  m.umbrella_rental,
  m.tablecloth_rental,
  m.commission_rate,
  m.table_free,
  m.chair_free,
  m.umbrella_free,
  m.tablecloth_free,
  m.total_revenue,
  m.total_profit,
  m.total_interactions,
  m.total_deals,
  m.notes,
  m.created_at,
  m.updated_at,
  -- 員工關係欄位
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

SELECT 
  -- 明確列出所有需要的欄位（排除 start_time 和 end_time）
  m.id,
  m.owner_id,
  m.name,
  m.location,
  m.start_date,
  m.end_date,
  -- ❌ 不包含 m.start_time
  -- ❌ 不包含 m.end_time
  m.status,
  m.early_entry_enabled,
  m.early_entry_time,
  m.check_in_time,
  m.operating_start_time,  -- ✅ 保留
  m.operating_end_time,    -- ✅ 保留
  m.registration_fee,
  m.booth_cost,
  m.deposit,
  m.table_rental,
  m.chair_rental,
  m.umbrella_rental,
  m.tablecloth_rental,
  m.commission_rate,
  m.table_free,
  m.chair_free,
  m.umbrella_free,
  m.tablecloth_free,
  m.total_revenue,
  m.total_profit,
  m.total_interactions,
  m.total_deals,
  m.notes,
  m.created_at,
  m.updated_at,
  -- 老闆關係欄位
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
WHERE mm.user_id = auth.uid();

-- 重建 staff_accessible_products 視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN markets m ON p.market_id = m.id
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

SELECT 
  p.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
JOIN market_members mm ON mm.market_id = p.market_id
WHERE mm.user_id = auth.uid();

DO $$
BEGIN
  RAISE NOTICE '✅ 視圖重建完成';
  RAISE NOTICE '  - staff_accessible_markets（已排除 start_time 和 end_time）';
  RAISE NOTICE '  - staff_accessible_products';
END $$;

-- ==================== 步驟 3：移除重複欄位 ====================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🗑️ 步驟 3/4：移除重複欄位';
END $$;

ALTER TABLE markets DROP COLUMN IF EXISTS start_time;
ALTER TABLE markets DROP COLUMN IF EXISTS end_time;

DO $$ 
BEGIN 
  RAISE NOTICE '✅ 已移除 start_time 和 end_time 欄位'; 
END $$;

-- ==================== 步驟 4：更新註解 ====================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '📝 步驟 4/4：更新註解';
END $$;

COMMENT ON COLUMN markets.operating_start_time IS '營業開始時間（HH:MM，24小時制）';
COMMENT ON COLUMN markets.operating_end_time IS '營業結束時間（HH:MM，24小時制）';

COMMENT ON TABLE markets IS '市集資料表（讀取模型，由 Trigger 自動維護）
統一使用 operating_start_time 和 operating_end_time 表示營業時間';

COMMENT ON VIEW staff_accessible_markets IS '員工可訪問的市集視圖（已排除廢棄的 start_time 和 end_time 欄位）';

DO $$
BEGIN
  RAISE NOTICE '✅ 註解更新完成';
END $$;

-- ==================== 驗證結果 ====================
DO $$
DECLARE
  column_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 驗證結果：';
  RAISE NOTICE '';
  
  -- 檢查 start_time 是否還存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'start_time'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE EXCEPTION '❌ start_time 欄位仍然存在，移除失敗';
  ELSE
    RAISE NOTICE '✅ start_time 欄位已成功移除';
  END IF;
  
  -- 檢查 end_time 是否還存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'end_time'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE EXCEPTION '❌ end_time 欄位仍然存在，移除失敗';
  ELSE
    RAISE NOTICE '✅ end_time 欄位已成功移除';
  END IF;
  
  -- 檢查 operating_start_time 是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'operating_start_time'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ operating_start_time 欄位不存在';
  ELSE
    RAISE NOTICE '✅ operating_start_time 欄位存在';
  END IF;
  
  -- 檢查 operating_end_time 是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'markets' 
    AND column_name = 'operating_end_time'
  ) INTO column_exists;
  
  IF NOT column_exists THEN
    RAISE EXCEPTION '❌ operating_end_time 欄位不存在';
  ELSE
    RAISE NOTICE '✅ operating_end_time 欄位存在';
  END IF;
  
  -- 檢查視圖是否存在
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_name = 'staff_accessible_markets'
  ) INTO view_exists;
  
  IF NOT view_exists THEN
    RAISE EXCEPTION '❌ staff_accessible_markets 視圖不存在';
  ELSE
    RAISE NOTICE '✅ staff_accessible_markets 視圖存在';
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_name = 'staff_accessible_products'
  ) INTO view_exists;
  
  IF NOT view_exists THEN
    RAISE EXCEPTION '❌ staff_accessible_products 視圖不存在';
  ELSE
    RAISE NOTICE '✅ staff_accessible_products 視圖存在';
  END IF;
END $$;

-- ==================== 完成 ====================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '🎉 Migration 022 完成';
  RAISE NOTICE '========================================';
  RAISE NOTICE '📝 變更摘要：';
  RAISE NOTICE '  - 已移除：start_time';
  RAISE NOTICE '  - 已移除：end_time';
  RAISE NOTICE '  - 保留：operating_start_time';
  RAISE NOTICE '  - 保留：operating_end_time';
  RAISE NOTICE '  - 已更新：staff_accessible_markets 視圖';
  RAISE NOTICE '  - 已更新：staff_accessible_products 視圖';
  RAISE NOTICE '';
  RAISE NOTICE '✅ 統一使用 operating_start_time 和 operating_end_time';
  RAISE NOTICE '✅ 程式邏輯更清晰，降低錯誤風險';
  RAISE NOTICE '✅ 視圖已更新，不再依賴廢棄欄位';
  RAISE NOTICE '========================================';
END $$;

-- ==================== 回滾腳本（如需要）====================
-- 如果需要回滾，執行以下 SQL：
/*
-- 1. 重新添加欄位
ALTER TABLE markets ADD COLUMN start_time TIME;
ALTER TABLE markets ADD COLUMN end_time TIME;

-- 2. 複製數據
UPDATE markets
SET 
  start_time = operating_start_time,
  end_time = operating_end_time;

-- 3. 重建視圖（使用 m.*）
DROP VIEW IF EXISTS staff_accessible_markets CASCADE;
DROP VIEW IF EXISTS staff_accessible_products CASCADE;

CREATE OR REPLACE VIEW staff_accessible_markets AS
SELECT 
  m.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
UNION ALL
SELECT 
  m.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
WHERE mm.user_id = auth.uid();

CREATE OR REPLACE VIEW staff_accessible_products AS
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN markets m ON p.market_id = m.id
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
UNION ALL
SELECT 
  p.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
JOIN market_members mm ON mm.market_id = p.market_id
WHERE mm.user_id = auth.uid();

-- 4. 更新註解
COMMENT ON COLUMN markets.start_time IS '開始時間（已廢棄，請使用 operating_start_time）';
COMMENT ON COLUMN markets.end_time IS '結束時間（已廢棄，請使用 operating_end_time）';
*/
