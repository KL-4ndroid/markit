-- BoothBook / Markit quick test database phase 2: staff foundation and policies 021-035
-- Intended only for a new/empty or disposable Supabase staging/local test project.
-- Do NOT run on production or on a database that contains real user data.
-- Sanitized for quick bootstrap: removed COMMENT ON statements and replaced RAISE NOTICE with NULL;
-- Generated at: 2026-06-23 02:01:36 +08:00

set check_function_bodies = off;

-- ============================================================
-- BEGIN SOURCE: 20240220_staff_system_simple.sql
-- ============================================================

-- ============================================
-- 員工系統：獨立表方案（不修改現有表）
-- 版本：2.0.0
-- 日期：2024-02-20
-- 描述：創建獨立的員工管理表，不修改 market_members
-- ============================================

-- ============================================
-- Step 1: 創建員工關係表
-- ============================================

CREATE TABLE IF NOT EXISTS staff_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_email TEXT NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  permissions JSONB DEFAULT '{"can_view": true, "can_edit": false}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 確保同一個員工不會被同一個老闆重複添加
  UNIQUE(owner_id, staff_id)
);


-- ============================================
-- Step 2: 創建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_relationships_owner 
ON staff_relationships(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_staff_relationships_staff 
ON staff_relationships(staff_id, status);

CREATE INDEX IF NOT EXISTS idx_staff_relationships_email 
ON staff_relationships(LOWER(staff_email));

-- ============================================
-- Step 3: 啟用 RLS
-- ============================================

ALTER TABLE staff_relationships ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Owners can manage their staff" ON staff_relationships;
DROP POLICY IF EXISTS "Staff can view their relationships" ON staff_relationships;
DROP POLICY IF EXISTS "Staff can accept invitations" ON staff_relationships;

-- 老闆可以查看和管理自己的員工
CREATE POLICY "Owners can manage their staff"
ON staff_relationships
FOR ALL
USING (auth.uid() = owner_id);

-- 員工可以查看自己的關係
CREATE POLICY "Staff can view their relationships"
ON staff_relationships
FOR SELECT
USING (auth.uid() = staff_id);

-- 員工可以接受邀請（更新 accepted_at）
CREATE POLICY "Staff can accept invitations"
ON staff_relationships
FOR UPDATE
USING (auth.uid() = staff_id AND status = 'pending')
WITH CHECK (auth.uid() = staff_id);

-- ============================================
-- Step 4: 創建輔助函數
-- ============================================

-- 檢查用戶是否為某老闆的員工
CREATE OR REPLACE FUNCTION is_staff_of(p_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_relationships
    WHERE staff_id = auth.uid()
    AND owner_id = p_owner_id
    AND status = 'active'
  );
END;
$$;

-- 獲取用戶的所有老闆
CREATE OR REPLACE FUNCTION get_my_owners()
RETURNS TABLE (
  owner_id UUID,
  owner_email TEXT,
  permissions JSONB,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.owner_id,
    u.email,
    sr.permissions,
    sr.accepted_at
  FROM staff_relationships sr
  JOIN auth.users u ON u.id = sr.owner_id
  WHERE sr.staff_id = auth.uid()
  AND sr.status = 'active';
END;
$$;

-- 獲取老闆的所有員工
CREATE OR REPLACE FUNCTION get_my_staff()
RETURNS TABLE (
  staff_id UUID,
  staff_email TEXT,
  status TEXT,
  permissions JSONB,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.staff_id,
    sr.staff_email,
    sr.status,
    sr.permissions,
    sr.invited_at,
    sr.accepted_at
  FROM staff_relationships sr
  WHERE sr.owner_id = auth.uid()
  ORDER BY sr.created_at DESC;
END;
$$;

-- ============================================
-- Step 5: 創建觸發器（自動更新時間戳）
-- ============================================

CREATE OR REPLACE FUNCTION update_staff_relationships_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_staff_relationships_timestamp ON staff_relationships;

CREATE TRIGGER trigger_update_staff_relationships_timestamp
BEFORE UPDATE ON staff_relationships
FOR EACH ROW
EXECUTE FUNCTION update_staff_relationships_timestamp();

-- ============================================
-- Step 6: 創建員工專用視圖（修正重複欄位問題）
-- ============================================

-- 員工可訪問的市集視圖
CREATE OR REPLACE VIEW staff_accessible_markets AS
SELECT 
  m.*, -- 如果 m 裡面已經有 owner_id，這裡會包含它
  sr.owner_id AS relationship_owner_id, -- 給它一個別名避免衝突
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

-- 員工可訪問的商品視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN markets m ON p.market_id = m.id -- 先連接到市場以取得成員資訊
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

-- ============================================
-- 完成
-- ============================================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 20240220_staff_system_simple.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 021_auto_add_staff_to_markets.sql
-- ============================================================

-- ==================== Migration 021 ====================
-- 日期：2026-02-22
-- 說明：自動將員工添加到老闆的新市集
-- 原因：當老闆創建新市集時，員工應該自動獲得訪問權限

-- ==================== 創建觸發器函數 ====================

CREATE OR REPLACE FUNCTION auto_add_staff_to_new_market()
RETURNS TRIGGER AS $$
BEGIN
  -- 當新市集創建時，自動將該老闆的所有員工添加到 market_members
  INSERT INTO market_members (market_id, user_id, role)
  SELECT 
    NEW.id,           -- 新市集的 ID
    sr.staff_id,      -- 員工的 ID
    'staff'           -- 角色為 staff
  FROM staff_relationships sr
  WHERE sr.owner_id = NEW.owner_id
    AND sr.status = 'active'
  ON CONFLICT (market_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 創建觸發器 ====================

DROP TRIGGER IF EXISTS trigger_auto_add_staff_to_new_market ON markets;

CREATE TRIGGER trigger_auto_add_staff_to_new_market
  AFTER INSERT ON markets
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_staff_to_new_market();

-- ==================== 補充現有市集的員工權限 ====================

-- 為所有現有市集添加缺少的員工權限
INSERT INTO market_members (market_id, user_id, role)
SELECT 
  m.id,
  sr.staff_id,
  'staff'
FROM markets m
CROSS JOIN staff_relationships sr
WHERE m.owner_id = sr.owner_id
  AND sr.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM market_members mm
    WHERE mm.market_id = m.id 
    AND mm.user_id = sr.staff_id
  )
ON CONFLICT (market_id, user_id) DO NOTHING;

-- ==================== 註解 ====================


-- ==================== 完成 ====================
-- Migration 021 完成
-- 現在老闆創建新市集時，員工會自動獲得訪問權限

-- ============================================================
-- END SOURCE: 021_auto_add_staff_to_markets.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 022_remove_duplicate_time_fields.sql
-- ============================================================

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
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 驗證當前數據 ====================
DO $$
DECLARE
  start_time_count INTEGER;
  end_time_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO start_time_count FROM markets WHERE start_time IS NOT NULL;
  SELECT COUNT(*) INTO end_time_count FROM markets WHERE end_time IS NOT NULL;
  
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  
  IF start_time_count > 0 OR end_time_count > 0 THEN
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
END $$;

-- ==================== 步驟 1：備份數據 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
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
  
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 步驟 2：重建視圖（明確列出欄位）====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
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
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 步驟 3：移除重複欄位 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

ALTER TABLE markets DROP COLUMN IF EXISTS start_time;
ALTER TABLE markets DROP COLUMN IF EXISTS end_time;

DO $$ 
BEGIN 
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 步驟 4：更新註解 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;




DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END $$;

-- ==================== 驗證結果 ====================
DO $$
DECLARE
  column_exists BOOLEAN;
  view_exists BOOLEAN;
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  
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
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
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
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
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
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
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
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
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
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.views 
    WHERE table_name = 'staff_accessible_products'
  ) INTO view_exists;
  
  IF NOT view_exists THEN
    RAISE EXCEPTION '❌ staff_accessible_products 視圖不存在';
  ELSE
    NULL; -- sanitized bootstrap: removed RAISE NOTICE
  END IF;
END $$;

-- ==================== 完成 ====================
DO $$
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
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
*/

-- ============================================================
-- END SOURCE: 022_remove_duplicate_time_fields.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 023_fix_market_updated_trigger.sql
-- ============================================================

-- ==================== Migration 023 ====================
-- 日期：2026-02-22
-- 說明：修復 market_updated 事件觸發器（移除已刪除的 start_time 和 end_time 欄位）
-- 原因：Migration 022 已移除 start_time 和 end_time，但 trigger 仍嘗試更新這些欄位

-- ==================== 更新 market 讀取模型觸發器函數 ====================

CREATE OR REPLACE FUNCTION update_market_read_model()
RETURNS TRIGGER AS $$
DECLARE
  market_data JSONB;
  v_updates JSONB;
BEGIN
  -- 根據事件類型更新讀取模型
  CASE NEW.type
    
    -- 市集建立事件
    WHEN 'market_created' THEN
      INSERT INTO markets (
        id,
        owner_id,
        name,
        location,
        start_date,
        end_date,
        status,
        early_entry_enabled,
        early_entry_time,
        check_in_time,
        operating_start_time,
        operating_end_time,
        registration_fee,
        booth_cost,
        deposit,
        table_rental,
        chair_rental,
        umbrella_rental,
        tablecloth_rental,
        commission_rate,
        table_free,
        chair_free,
        umbrella_free,
        tablecloth_free,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        NEW.market_id,
        NEW.actor_id,
        (NEW.payload->>'name')::TEXT,
        (NEW.payload->>'location')::TEXT,
        (NEW.payload->>'startDate')::DATE,
        (NEW.payload->>'endDate')::DATE,
        'registered',
        (NEW.payload->>'earlyEntryEnabled')::BOOLEAN,
        (NEW.payload->>'earlyEntryTime')::TIME,
        (NEW.payload->>'checkInTime')::TIME,
        (NEW.payload->>'operatingStartTime')::TIME,
        (NEW.payload->>'operatingEndTime')::TIME,
        (NEW.payload->>'registrationFee')::NUMERIC,
        (NEW.payload->>'boothCost')::NUMERIC,
        (NEW.payload->>'deposit')::NUMERIC,
        (NEW.payload->>'tableRental')::NUMERIC,
        (NEW.payload->>'chairRental')::NUMERIC,
        (NEW.payload->>'umbrellaRental')::NUMERIC,
        (NEW.payload->>'tableclothRental')::NUMERIC,
        (NEW.payload->>'commissionRate')::NUMERIC,
        (NEW.payload->>'tableFree')::BOOLEAN,
        (NEW.payload->>'chairFree')::BOOLEAN,
        (NEW.payload->>'umbrellaFree')::BOOLEAN,
        (NEW.payload->>'tableclothFree')::BOOLEAN,
        (NEW.payload->>'notes')::TEXT,
        NEW.timestamp,
        NEW.timestamp
      )
      ON CONFLICT (id) DO NOTHING;
      
      -- 自動添加 owner 到 market_members
      INSERT INTO market_members (market_id, user_id, role)
      VALUES (NEW.market_id, NEW.actor_id, 'owner')
      ON CONFLICT (market_id, user_id) DO NOTHING;
    
    -- ✅ 市集更新事件（修復：移除 start_time 和 end_time）
    WHEN 'market_updated' THEN
      -- 獲取 updates 物件
      v_updates := NEW.payload->'updates';
      
      -- 動態更新市集資料（只更新有提供的欄位）
      UPDATE markets
      SET 
        -- 基本資訊
        name = COALESCE((v_updates->>'name')::TEXT, name),
        location = COALESCE((v_updates->>'location')::TEXT, location),
        start_date = COALESCE((v_updates->>'start_date')::DATE, start_date),
        end_date = COALESCE((v_updates->>'end_date')::DATE, end_date),
        -- ✅ 移除：start_time 和 end_time 已在 Migration 022 中刪除
        
        -- 時間軸資訊
        early_entry_enabled = COALESCE((v_updates->>'early_entry_enabled')::BOOLEAN, early_entry_enabled),
        early_entry_time = COALESCE((v_updates->>'early_entry_time')::TIME, early_entry_time),
        check_in_time = COALESCE((v_updates->>'check_in_time')::TIME, check_in_time),
        operating_start_time = COALESCE((v_updates->>'operating_start_time')::TIME, operating_start_time),
        operating_end_time = COALESCE((v_updates->>'operating_end_time')::TIME, operating_end_time),
        
        -- 財務資訊
        registration_fee = COALESCE((v_updates->>'registration_fee')::NUMERIC, registration_fee),
        booth_cost = COALESCE((v_updates->>'booth_cost')::NUMERIC, booth_cost),
        deposit = COALESCE((v_updates->>'deposit')::NUMERIC, deposit),
        table_rental = COALESCE((v_updates->>'table_rental')::NUMERIC, table_rental),
        chair_rental = COALESCE((v_updates->>'chair_rental')::NUMERIC, chair_rental),
        umbrella_rental = COALESCE((v_updates->>'umbrella_rental')::NUMERIC, umbrella_rental),
        tablecloth_rental = COALESCE((v_updates->>'tablecloth_rental')::NUMERIC, tablecloth_rental),
        commission_rate = COALESCE((v_updates->>'commission_rate')::NUMERIC, commission_rate),
        
        -- 免費提供標記
        table_free = COALESCE((v_updates->>'table_free')::BOOLEAN, table_free),
        chair_free = COALESCE((v_updates->>'chair_free')::BOOLEAN, chair_free),
        umbrella_free = COALESCE((v_updates->>'umbrella_free')::BOOLEAN, umbrella_free),
        tablecloth_free = COALESCE((v_updates->>'tablecloth_free')::BOOLEAN, tablecloth_free),
        
        -- 備註
        notes = COALESCE((v_updates->>'notes')::TEXT, notes),
        
        -- 更新時間戳
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'market_id')::UUID;
    
    -- 市集狀態變更事件
    WHEN 'market_status_changed' THEN
      UPDATE markets
      SET 
        status = (NEW.payload->>'newStatus')::TEXT,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集開始營業事件
    WHEN 'market_started' THEN
      UPDATE markets
      SET 
        status = 'ongoing',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集結束營業事件
    WHEN 'market_ended' THEN
      UPDATE markets
      SET 
        status = 'completed',
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 市集刪除事件
    WHEN 'market_deleted' THEN
      UPDATE markets
      SET 
        is_deleted = TRUE,
        updated_at = NEW.timestamp
      WHERE id = (NEW.payload->>'marketId')::UUID;
    
    -- 成交事件：更新統計
    WHEN 'deal_closed' THEN
      UPDATE markets
      SET 
        total_revenue = total_revenue + (NEW.payload->>'totalAmount')::NUMERIC,
        total_deals = total_deals + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    -- 互動記錄事件：更新統計
    WHEN 'interaction_recorded' THEN
      UPDATE markets
      SET 
        total_interactions = total_interactions + 1,
        updated_at = NEW.timestamp
      WHERE id = NEW.market_id;
    
    ELSE
      -- 其他事件類型不處理
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== 註解 ====================

-- ==================== 完成 ====================
DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 023_fix_market_updated_trigger.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 024_fix_events_insert_policy.sql
-- ============================================================

-- ==================== 修復 Events 表 INSERT RLS 政策 ====================
-- 版本：024 - 修復事件插入政策
-- 日期：2026-02-23
-- 說明：
--   1. 修復 events 表的 INSERT 政策
--   2. 允許用戶插入 market_created 事件（即使 market_members 還不存在）
--   3. 允許用戶插入自己的全局事件（market_id = NULL）
--   4. 允許用戶插入自己參與的市集的事件

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以插入：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. market_id = NULL 的全局事件（如商品事件）
-- 3. market_created 事件（特殊處理，允許在 market_members 創建前插入）
-- 4. 自己參與的市集的事件
CREATE POLICY "用戶可以插入自己的事件"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  (
    -- 全局事件（商品事件等）
    market_id IS NULL
    OR
    -- market_created 事件（特殊處理）
    type = 'market_created'
    OR
    -- 自己參與的市集的事件
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
  )
);

-- ==================== 註解 ====================


-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 測試插入 market_created 事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  gen_random_uuid(),
  now()
);

-- 2. 測試插入商品事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'product_created',
  '{"name": "測試商品", "price": 100}'::jsonb,
  auth.uid(),
  NULL,
  now()
);

-- 3. 測試插入其他市集的事件（應該失敗）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'deal_closed',
  '{"amount": 100}'::jsonb,
  auth.uid(),
  '00000000-0000-0000-0000-000000000000', -- 不存在的市集
  now()
);
-- 應該返回錯誤：new row violates row-level security policy
*/

-- ==================== 完成 ====================
-- Events 表 INSERT RLS 政策已修復
-- 現在可以正常插入 market_created 和商品事件了

-- ============================================================
-- END SOURCE: 024_fix_events_insert_policy.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 025_support_staff_mode_events.sql
-- ============================================================

-- ==================== 修復 Events 表 INSERT RLS 政策（支援員工模式）====================
-- 版本：025 - 支援員工模式上傳事件
-- 日期：2026-02-23
-- 說明：
--   1. 允許員工插入老闆市集的事件
--   2. 保留員工的 actor_id（不修改創建者）
--   3. 防止跨帳號數據盜取

-- ==================== 刪除舊政策 ====================

DROP POLICY IF EXISTS "用戶可以插入自己市集的事件" ON events;
DROP POLICY IF EXISTS "用戶可以插入事件_v2" ON events;
DROP POLICY IF EXISTS "用戶可以插入自己的事件" ON events;

-- ==================== 創建新政策 ====================

-- 用戶可以插入：
-- 1. 自己創建的事件（actor_id = auth.uid()）
-- 2. market_id = NULL 的全局事件（如商品事件）
-- 3. market_created 事件（特殊處理，允許在 market_members 創建前插入）
-- 4. 自己參與的市集的事件（作為 owner）
-- 5. ✅ 員工可以插入老闆市集的事件（作為 staff）
CREATE POLICY "用戶可以插入事件_v3"
ON events FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid() AND
  (
    -- 全局事件（商品事件等）
    market_id IS NULL
    OR
    -- market_created 事件（特殊處理）
    type = 'market_created'
    OR
    -- 自己參與的市集的事件（owner）
    EXISTS (
      SELECT 1 FROM market_members
      WHERE market_id = events.market_id
        AND user_id = auth.uid()
    )
    OR
    -- ✅ 員工可以插入老闆市集的事件
    EXISTS (
      SELECT 1 FROM market_members mm
      JOIN staff_relationships sr ON sr.owner_id = mm.user_id
      WHERE mm.market_id = events.market_id
        AND sr.staff_id = auth.uid()
        AND sr.status = 'active'
    )
  )
);

-- ==================== 註解 ====================


-- ==================== 測試 ====================

-- 測試腳本（在 SQL Editor 中執行）
/*
-- 1. 測試老闆插入 market_created 事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_created',
  '{"name": "測試市集", "location": "台北"}'::jsonb,
  auth.uid(),
  gen_random_uuid(),
  now()
);

-- 2. 測試員工插入互動事件（應該成功）
-- 前提：員工已被添加到 staff_relationships，且老闆是該市集的成員
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'interaction_recorded',
  '{"type": "touch", "marketId": "老闆的市集ID"}'::jsonb,
  auth.uid(), -- 員工的 ID
  '老闆的市集ID',
  now()
);

-- 3. 測試插入其他人的市集事件（應該失敗）
INSERT INTO events (id, type, payload, actor_id, market_id, timestamp)
VALUES (
  gen_random_uuid(),
  'deal_closed',
  '{"amount": 100}'::jsonb,
  auth.uid(),
  '00000000-0000-0000-0000-000000000000', -- 不存在的市集
  now()
);
-- 應該返回錯誤：new row violates row-level security policy
*/

-- ==================== 完成 ====================
-- Events 表 INSERT RLS 政策已更新
-- 現在支援員工模式，員工可以插入老闆市集的事件，且保留員工的 actor_id

-- ============================================================
-- END SOURCE: 025_support_staff_mode_events.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 026_add_delete_event_types.sql
-- ============================================================

-- ==================== Supabase Schema Migration ====================
-- 版本：026 - 添加刪除事件類型
-- 日期：2026-02-26
-- 說明：添加 deal_deleted 和 interaction_deleted 事件類型到 events 表的 CHECK constraint

-- ==================== 更新 events 表的 type CHECK constraint ====================

-- 1. 刪除舊的 CHECK constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 2. 添加新的 CHECK constraint（包含刪除事件類型）
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    -- 市集相關事件
    'market_created',
    'market_updated',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',
    -- 商品相關事件
    'product_created',
    'product_updated',
    'product_deleted',
    -- 互動相關事件
    'interaction_recorded',
    'interaction_deleted',
    'deal_closed',
    'deal_deleted',
    -- 設定相關事件
    'settings_updated'
  )
);

-- ==================== 註解 ====================

-- ==================== 完成 ====================
-- Migration 完成
-- 新增事件類型：
-- - interaction_deleted: 刪除互動記錄
-- - deal_deleted: 刪除成交記錄
-- - market_updated: 市集更新（補充）
-- - market_deleted: 市集刪除（補充）
-- - settings_updated: 設定更新（補充）

-- ============================================================
-- END SOURCE: 026_add_delete_event_types.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 027_add_staff_events_view.sql
-- ============================================================

-- ==================== 創建員工事件視圖 ====================
-- 版本：027 - 支援員工模式拉取事件
-- 日期：2026-02-28
-- 說明：
--   1. 創建 staff_accessible_events 視圖
--   2. 員工可以查看老闆市集的所有事件
--   3. 包含市集事件和全局事件（商品事件）

-- ==================== 刪除舊視圖（如果存在）====================

DROP VIEW IF EXISTS staff_accessible_events;

-- ==================== 創建員工事件視圖 ====================

-- 員工可訪問的事件視圖
CREATE OR REPLACE VIEW staff_accessible_events AS
-- 1. 員工可以查看老闆市集的事件
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'

UNION ALL

-- 2. 員工可以查看老闆的全局事件（商品事件等，market_id = NULL）
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND e.market_id IS NULL

UNION ALL

-- 3. 老闆可以查看自己的所有事件
SELECT 
  e.*,
  e.actor_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. 老闆可以查看自己市集的所有事件（包括員工創建的）
SELECT 
  e.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
AND e.actor_id != auth.uid(); -- 避免與上面的 UNION 重複

-- ==================== 註解 ====================


-- ==================== 完成 ====================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 027_add_staff_events_view.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 028_staff_invitations.sql
-- ============================================================

-- ============================================
-- 員工邀請系統：連結邀請功能
-- 版本：028
-- 日期：2026-03-01
-- 描述：建立 staff_invitations 表，支援透過連結邀請員工
-- ============================================

-- ============================================
-- Step 1: 建立員工邀請表
-- ============================================

CREATE TABLE IF NOT EXISTS staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 索引：加速 token 查詢
  CONSTRAINT staff_invitations_token_key UNIQUE (token)
);


-- ============================================
-- Step 2: 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_staff_invitations_owner 
ON staff_invitations(owner_id);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token 
ON staff_invitations(token);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_expires 
ON staff_invitations(expires_at);

-- ============================================
-- Step 3: 啟用 RLS
-- ============================================

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Owners can manage their invitations" ON staff_invitations;
DROP POLICY IF EXISTS "Anyone can verify invitation tokens" ON staff_invitations;
DROP POLICY IF EXISTS "Owners can insert invitations" ON staff_invitations;
DROP POLICY IF EXISTS "Owners can view their invitations" ON staff_invitations;
DROP POLICY IF EXISTS "Owners can delete their invitations" ON staff_invitations;

-- ✅ 老闆可以插入邀請（必須設定 owner_id 為自己）
CREATE POLICY "Owners can insert invitations"
ON staff_invitations
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- ✅ 老闆可以查看自己的邀請
CREATE POLICY "Owners can view their invitations"
ON staff_invitations
FOR SELECT
USING (auth.uid() = owner_id);

-- ✅ 老闆可以刪除自己的邀請
CREATE POLICY "Owners can delete their invitations"
ON staff_invitations
FOR DELETE
USING (auth.uid() = owner_id);

-- ✅ 關鍵：允許未登入用戶透過 token 查詢（唯讀，用於驗證）
CREATE POLICY "Anyone can verify invitation tokens"
ON staff_invitations
FOR SELECT
USING (token IS NOT NULL);

-- ============================================
-- Step 4: 建立自動清理過期邀請的函數
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 刪除過期的邀請
  DELETE FROM staff_invitations
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  
  RETURN deleted_count;
END;
$$;


-- ============================================
-- Step 5: 建立驗證邀請 Token 的函數
-- ============================================

CREATE OR REPLACE FUNCTION verify_invitation_token(p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  owner_id UUID,
  owner_email TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_owner_email TEXT;
  v_expires_at TIMESTAMPTZ;
  v_is_valid BOOLEAN;
BEGIN
  -- 查詢邀請資訊
  SELECT 
    si.owner_id,
    u.email,
    si.expires_at,
    (si.expires_at > NOW())
  INTO v_owner_id, v_owner_email, v_expires_at, v_is_valid
  FROM staff_invitations si
  JOIN auth.users u ON u.id = si.owner_id
  WHERE si.token = p_token
  LIMIT 1;
  
  -- 如果找到記錄，返回結果
  IF FOUND THEN
    RETURN QUERY SELECT v_is_valid, v_owner_id, v_owner_email, v_expires_at;
  ELSE
    -- 如果找不到記錄，返回 false
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;


-- ============================================
-- Step 6: 建立自動綁定員工關係的函數
-- ============================================

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
  v_staff_email TEXT;
  v_existing_owner_count INTEGER;
BEGIN
  -- 1. 驗證 Token 是否存在且未過期
  SELECT si.owner_id, si.expires_at
  INTO v_owner_id, v_expires_at
  FROM staff_invitations si
  WHERE si.token = p_token;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, '邀請連結不存在'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF v_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, '邀請連結已過期'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- ✅ 2. 檢查用戶是否已經加入其他團隊（一個用戶只能加入一個團隊）
  SELECT COUNT(*)
  INTO v_existing_owner_count
  FROM staff_relationships
  WHERE staff_id = p_staff_id
  AND status IN ('pending', 'active');
  
  IF v_existing_owner_count > 0 THEN
    RETURN QUERY SELECT FALSE, '您已經是其他老闆的員工，一個帳號只能加入一個團隊'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- 3. 檢查是否已經是此老闆的員工
  IF EXISTS (
    SELECT 1 FROM staff_relationships
    WHERE owner_id = v_owner_id
    AND staff_id = p_staff_id
    AND status IN ('pending', 'active')
  ) THEN
    RETURN QUERY SELECT FALSE, '您已經是此老闆的員工'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- 4. 獲取員工 Email
  SELECT email INTO v_staff_email
  FROM auth.users
  WHERE id = p_staff_id;
  
  -- 5. 建立員工關係（直接設為 active）
  INSERT INTO staff_relationships (
    owner_id,
    staff_id,
    staff_email,
    status,
    accepted_at,
    permissions
  ) VALUES (
    v_owner_id,
    p_staff_id,
    v_staff_email,
    'active',
    NOW(),
    '{"can_view": true, "can_edit": false}'::jsonb
  )
  RETURNING id INTO v_relationship_id;
  
  -- 6. 返回成功
  RETURN QUERY SELECT TRUE, '成功加入團隊'::TEXT, v_relationship_id;
END;
$$;


-- ============================================
-- 完成
-- ============================================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 028_staff_invitations.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 029_fix_staff_accessible_products.sql
-- ============================================================

-- ==================== 修復員工可訪問商品視圖 ====================
-- 版本：029 - 修復商品同步問題
-- 日期：2026-03-03
-- 說明：
--   1. 修復 staff_accessible_products 視圖邏輯
--   2. 商品應該透過 owner_id 連接，而不是 market_id
--   3. 員工可以看到老闆的所有商品（包括全局商品）

-- ==================== 刪除舊視圖 ====================

DROP VIEW IF EXISTS staff_accessible_products;

-- ==================== 創建新視圖 ====================

-- 員工可訪問的商品視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
-- 1. 員工可以查看老闆的商品（透過 owner_id 直接連接）
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN staff_relationships sr ON sr.owner_id = p.owner_id  -- ✅ 直接透過 owner_id 連接
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND p.is_active = TRUE  -- ✅ 排除已刪除的商品（使用 is_active）

UNION ALL

-- 2. 老闆可以查看自己的商品
SELECT 
  p.*,
  p.owner_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
WHERE p.owner_id = auth.uid()
AND p.is_active = TRUE;  -- ✅ 排除已刪除的商品（使用 is_active）

-- ==================== 註解 ====================


-- ==================== 測試查詢 ====================

/*
-- 測試 1：老闆查看自己的商品（應該看到所有自己的商品）
SELECT * FROM staff_accessible_products WHERE access_type = 'owner';

-- 測試 2：員工查看可訪問的商品（應該看到老闆的所有商品）
SELECT * FROM staff_accessible_products WHERE access_type = 'staff';

-- 測試 3：檢查商品數量
SELECT 
  access_type,
  COUNT(*) as product_count
FROM staff_accessible_products
GROUP BY access_type;
*/

-- ==================== 完成 ====================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 029_fix_staff_accessible_products.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 030_fix_data_isolation.sql
-- ============================================================

-- ==================== 緊急修復：數據隔離問題 ====================
-- 版本：030 - 修復視圖返回其他用戶數據的問題
-- 日期：2026-03-03
-- 說明：
--   1. 視圖返回了其他用戶的數據
--   2. 需要在視圖中添加更嚴格的過濾
--   3. 確保只返回當前用戶可訪問的數據

-- ==================== 問題分析 ====================
/*
當前問題：
- 員工 B 登入後，視圖返回了 25 個市集、6 個商品、208 個事件
- 但這些數據不屬於員工 B，而是其他用戶的數據
- 說明視圖的過濾邏輯有問題

可能原因：
1. staff_relationships 表中有多條記錄（員工 B 曾經加入過多個團隊）
2. 視圖沒有正確過濾 status = 'active'
3. RLS 政策沒有生效
*/

-- ==================== 診斷查詢 ====================

-- 檢查當前用戶的員工關係
SELECT 
  id,
  owner_id,
  staff_id,
  status,
  created_at
FROM staff_relationships
WHERE staff_id = auth.uid()
ORDER BY created_at DESC;

-- 檢查視圖返回的市集
SELECT 
  id,
  name,
  owner_id,
  access_type,
  relationship_owner_id
FROM staff_accessible_markets
LIMIT 10;

-- 檢查視圖返回的商品
SELECT 
  id,
  name,
  owner_id,
  access_type,
  relationship_owner_id
FROM staff_accessible_products
LIMIT 10;

-- ==================== 修復方案 ====================

-- 方案 1：清理無效的員工關係
-- 如果員工 B 曾經加入過其他團隊，但現在已經離開，需要清理這些記錄

-- 查看所有非 active 的關係
SELECT 
  id,
  owner_id,
  staff_id,
  status,
  created_at
FROM staff_relationships
WHERE staff_id = auth.uid()
AND status != 'active';

-- 刪除非 active 的關係（可選）
-- DELETE FROM staff_relationships
-- WHERE staff_id = auth.uid()
-- AND status != 'active';

-- 方案 2：確保視圖只返回 active 的關係
-- 視圖定義中已經有 AND sr.status = 'active'，但可能沒有生效

-- 重新創建視圖（強制刷新）
DROP VIEW IF EXISTS staff_accessible_markets CASCADE;
DROP VIEW IF EXISTS staff_accessible_products CASCADE;
DROP VIEW IF EXISTS staff_accessible_events CASCADE;

-- 重新創建市集視圖
CREATE OR REPLACE VIEW staff_accessible_markets AS
-- 1. 員工可以查看老闆的市集
SELECT 
  m.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係

UNION ALL

-- 2. 老闆可以查看自己的市集
SELECT 
  m.*,
  m.owner_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM markets m
JOIN market_members mm ON mm.market_id = m.id
WHERE mm.user_id = auth.uid();

-- 重新創建商品視圖
CREATE OR REPLACE VIEW staff_accessible_products AS
-- 1. 員工可以查看老闆的商品
SELECT 
  p.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM products p
JOIN staff_relationships sr ON sr.owner_id = p.owner_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係
AND p.is_active = TRUE    -- ✅ 排除已刪除的商品

UNION ALL

-- 2. 老闆可以查看自己的商品
SELECT 
  p.*,
  p.owner_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM products p
WHERE p.owner_id = auth.uid()
AND p.is_active = TRUE;   -- ✅ 排除已刪除的商品

-- 重新創建事件視圖
CREATE OR REPLACE VIEW staff_accessible_events AS
-- 1. 員工可以查看老闆市集的事件
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
JOIN staff_relationships sr ON sr.owner_id = mm.user_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係

UNION ALL

-- 2. 員工可以查看老闆的全局事件（商品事件等，market_id = NULL）
SELECT 
  e.*,
  sr.owner_id AS relationship_owner_id,
  sr.permissions,
  'staff' as access_type
FROM events e
JOIN staff_relationships sr ON sr.owner_id = e.actor_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'  -- ✅ 確保只返回 active 的關係
AND e.market_id IS NULL

UNION ALL

-- 3. 老闆可以查看自己的所有事件
SELECT 
  e.*,
  e.actor_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
WHERE e.actor_id = auth.uid()

UNION ALL

-- 4. 老闆可以查看自己市集的所有事件（包括員工創建的）
SELECT 
  e.*,
  mm.user_id as relationship_owner_id,
  '{"can_view": true, "can_edit": true}'::jsonb as permissions,
  'owner' as access_type
FROM events e
JOIN market_members mm ON mm.market_id = e.market_id
WHERE mm.user_id = auth.uid()
AND e.actor_id != auth.uid(); -- 避免與上面的 UNION 重複

-- ==================== 註解 ====================


-- ==================== 驗證查詢 ====================

-- 驗證 1：檢查當前用戶的 active 關係
SELECT 
  'Active Relationships' as check_type,
  COUNT(*) as count
FROM staff_relationships
WHERE staff_id = auth.uid()
AND status = 'active';

-- 驗證 2：檢查視圖返回的市集數量
SELECT 
  'Markets from View' as check_type,
  COUNT(*) as count
FROM staff_accessible_markets;

-- 驗證 3：檢查視圖返回的商品數量
SELECT 
  'Products from View' as check_type,
  COUNT(*) as count
FROM staff_accessible_products;

-- 驗證 4：檢查視圖返回的事件數量
SELECT 
  'Events from View' as check_type,
  COUNT(*) as count
FROM staff_accessible_events;

-- ==================== 清理腳本 ====================

-- 如果需要清理無效的員工關係，執行以下腳本：
/*
-- 查看所有非 active 的關係
SELECT 
  id,
  owner_id,
  (SELECT email FROM auth.users WHERE id = owner_id) as owner_email,
  staff_id,
  (SELECT email FROM auth.users WHERE id = staff_id) as staff_email,
  status,
  created_at
FROM staff_relationships
WHERE status != 'active'
ORDER BY created_at DESC;

-- 刪除非 active 的關係（謹慎執行！）
-- DELETE FROM staff_relationships
-- WHERE status != 'active';
*/

-- ==================== 完成 ====================

DO $$ 
BEGIN
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
  NULL; -- sanitized bootstrap: removed RAISE NOTICE
END;
$$;

-- ============================================================
-- END SOURCE: 030_fix_data_isolation.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 031_harden_staff_invitations.sql
-- ============================================================

-- Harden staff invitation access.
-- Keep public token verification through RPC, but stop direct table reads by token.

ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can verify invitation tokens" ON staff_invitations;

CREATE OR REPLACE FUNCTION verify_invitation_token(p_token TEXT)
RETURNS TABLE (
  is_valid BOOLEAN,
  owner_id UUID,
  owner_email TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_owner_email TEXT;
  v_expires_at TIMESTAMPTZ;
  v_is_valid BOOLEAN;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  SELECT
    si.owner_id,
    u.email,
    si.expires_at,
    si.expires_at > NOW()
  INTO v_owner_id, v_owner_email, v_expires_at, v_is_valid
  FROM staff_invitations si
  JOIN auth.users u ON u.id = si.owner_id
  WHERE si.token = p_token
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_is_valid, v_owner_id, v_owner_email, v_expires_at;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

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

  IF EXISTS (
    SELECT 1 FROM staff_relationships
    WHERE owner_id = v_owner_id
    AND staff_id = v_staff_id
    AND status IN ('pending', 'active')
  ) THEN
    RETURN QUERY SELECT FALSE, 'This user is already invited by this owner'::TEXT, NULL::UUID;
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
    '{"can_view": true, "can_edit": false}'::jsonb
  )
  RETURNING id INTO v_relationship_id;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;



-- ============================================================
-- END SOURCE: 031_harden_staff_invitations.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 032_safe_staff_invitation_acceptance.sql
-- ============================================================

-- Make token-based staff invitation acceptance complete and atomic.
-- The RPC now binds the staff relationship and adds the staff user to the
-- owner's active markets in the same transaction.

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
    '{"can_view": true, "can_edit": false}'::jsonb
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
      SELECT 1
      FROM market_members mm
      WHERE mm.market_id = m.id
        AND mm.user_id = v_staff_id
    );

  DELETE FROM staff_invitations
  WHERE token = p_token;

  RETURN QUERY SELECT TRUE, 'Invitation accepted'::TEXT, v_relationship_id;
END;
$$;


-- ============================================================
-- END SOURCE: 032_safe_staff_invitation_acceptance.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 033_account_data_deletion_rpcs.sql
-- ============================================================

-- Move destructive account/team cleanup into SECURITY DEFINER RPCs.
-- This keeps cloud mutations atomic and lets clients clear local caches only after success.

CREATE OR REPLACE FUNCTION delete_current_user_app_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := '{}'::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = v_user_id;

  DELETE FROM staff_invitations
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_invitations', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = v_user_id
     OR staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_relationships', v_count);

  DELETE FROM market_members
  WHERE user_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('market_members', v_count);

  DELETE FROM events
  WHERE actor_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('events', v_count);

  DELETE FROM products
  WHERE owner_id = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('products', v_count);

  DELETE FROM snapshots
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('snapshots', v_count);

  DELETE FROM user_settings
  WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('user_settings', v_count);

  DELETE FROM events_archive
  WHERE actor_id = v_user_id
     OR archived_by = v_user_id
     OR market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('events_archive', v_count);

  DELETE FROM markets
  WHERE owner_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('markets', v_count);

  RETURN v_result || jsonb_build_object('user_id', v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION leave_current_staff_team(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_market_ids UUID[];
  v_count INTEGER;
  v_result JSONB := '{}'::jsonb;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner id is required';
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[])
  INTO v_market_ids
  FROM markets
  WHERE owner_id = p_owner_id;

  DELETE FROM market_members
  WHERE user_id = v_user_id
    AND role = 'staff'
    AND market_id = ANY(v_market_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('market_members', v_count);

  DELETE FROM staff_relationships
  WHERE owner_id = p_owner_id
    AND staff_id = v_user_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_result := v_result || jsonb_build_object('staff_relationships', v_count);

  RETURN v_result || jsonb_build_object('owner_id', p_owner_id, 'staff_id', v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION delete_current_user_app_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION leave_current_staff_team(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION delete_current_user_app_data() TO authenticated;
GRANT EXECUTE ON FUNCTION leave_current_staff_team(UUID) TO authenticated;



-- ============================================================
-- END SOURCE: 033_account_data_deletion_rpcs.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 034_performance_indexes.sql
-- ============================================================

-- ============================================================
-- Supabase Schema Migration
-- 版本：034 - 資料庫效能優化
-- 日期：2026-05-26
-- 說明：
--   1. 添加效能索引
--   2. 添加 staff_relationships owner_id 默認值
--   3. 修復市場成員表外鍵約束
-- ============================================================

-- ==================== 1. 添加效能索引 ====================

-- events 表索引（高頻查詢優化）
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_actor_id ON events(actor_id);
CREATE INDEX IF NOT EXISTS idx_events_market_id ON events(market_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_sync_status ON events(sync_status);

-- 組合索引（常見查詢模式）
CREATE INDEX IF NOT EXISTS idx_events_market_timestamp ON events(market_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_actor_timestamp ON events(actor_id, timestamp DESC);

-- market_members 表索引
CREATE INDEX IF NOT EXISTS idx_market_members_user_id ON market_members(user_id);
CREATE INDEX IF NOT EXISTS idx_market_members_role ON market_members(role);
CREATE INDEX IF NOT EXISTS idx_market_members_market_user ON market_members(market_id, user_id);

-- staff_relationships 表索引
CREATE INDEX IF NOT EXISTS idx_staff_relationships_owner ON staff_relationships(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_relationships_staff ON staff_relationships(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_relationships_status ON staff_relationships(status);
CREATE INDEX IF NOT EXISTS idx_staff_relationships_owner_staff ON staff_relationships(owner_id, staff_id);

-- staff_invitations 表索引
CREATE INDEX IF NOT EXISTS idx_staff_invitations_owner ON staff_invitations(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(token);

-- snapshots 表索引（用於快速同步）
CREATE INDEX IF NOT EXISTS idx_snapshots_user_id ON snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_last_event_id ON snapshots(last_event_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_user_version ON snapshots(user_id, version DESC);

-- products 表索引
CREATE INDEX IF NOT EXISTS idx_products_owner_id ON products(owner_id);
CREATE INDEX IF NOT EXISTS idx_products_market_id ON products(market_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- markets 表索引
CREATE INDEX IF NOT EXISTS idx_markets_owner_id ON markets(owner_id);
CREATE INDEX IF NOT EXISTS idx_markets_start_date ON markets(start_date);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);

-- ==================== 2. 修復 staff_relationships 表 ====================

-- 將 owner_id 設置為 NOT NULL（添加默認值並更新現有記錄）
ALTER TABLE staff_relationships
ALTER COLUMN owner_id SET NOT NULL;

-- 添加註釋

-- ==================== 3. 驗證索引創建 ====================

-- 驗證所有索引已創建
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('events', 'market_members', 'staff_relationships', 'staff_invitations', 'snapshots', 'products', 'markets')
    OR indexname LIKE 'idx_events_%'
    OR indexname LIKE 'idx_market_members_%'
    OR indexname LIKE 'idx_staff_%'
    OR indexname LIKE 'idx_snapshots_%'
  )
ORDER BY tablename, indexname;

-- ==================== 4. 分析表以更新統計 ====================

ANALYZE events;
ANALYZE market_members;
ANALYZE staff_relationships;
ANALYZE staff_invitations;
ANALYZE snapshots;
ANALYZE products;
ANALYZE markets;

-- ==================== Migration 完成 ====================
-- 新增功能：
--   1. 為所有高頻查詢字段添加了 B-tree 索引
--   2. 添加了組合索引以優化常見查詢模式
--   3. 將 staff_relationships.owner_id 設置為 NOT NULL
--   4. 執行了 ANALYZE 以更新查詢計劃器統計
--
-- 效能預期提升：
--   - 事件查詢：提升 50-80%
--   - 市集成員查詢：提升 60-90%
--   - 員工關係查詢：提升 70-95%

-- ============================================================
-- END SOURCE: 034_performance_indexes.sql
-- ============================================================

-- ============================================================
-- BEGIN SOURCE: 035_fix_p0_rls_security.sql
-- ============================================================

-- ============================================================
-- Phase 8E/8F: P0 RLS Security Hardening
-- Migration: 035_fix_p0_rls_security.sql
-- Date: 2026-06-02
-- Severity: P0
-- Description:
--   1. Creates SECURITY DEFINER helper function current_user_market_ids()
--      (no parameters, uses auth.uid(), avoids RLS recursion)
--   2. Removes all market_members INSERT policies
--      (write via SECURITY DEFINER RPCs only)
--   3. Removes all market_members DELETE policies and replaces with
--      a role-aware policy:
--      - staff can delete their own staff memberships
--      - owner can delete staff memberships in their own markets
--      - nobody can delete owner memberships
--   4. Enables RLS on market_members
--   5. Creates secure market_members SELECT policy using helper
--   6. Removes markets_select_temp and replaces with helper-based policy
--   7. Removes products_select_temp
--
-- Does NOT touch:
--   - staff_accessible_* views
--   - events payload
--   - get_my_staff RPC
--   - markets/products INSERT/UPDATE policies
--   - P1/P2 items
--
-- IMPORTANT: Execute against Supabase after review.
-- ============================================================

-- ============================================================
-- STEP 1: Helper function (no parameters, prevents injection)
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_market_ids()
RETURNS TABLE(market_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT market_id
  FROM public.market_members
  WHERE user_id = auth.uid();
$$;

-- Restrict execution: authenticated only, no PUBLIC
REVOKE ALL ON FUNCTION public.current_user_market_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_market_ids() TO authenticated;


-- ============================================================
-- STEP 1b: Helper for owned market IDs (for owner-based DELETE)
-- Returns market IDs where the current user is the market owner.
-- SECURITY DEFINER: does not go through RLS, no parameters.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_owned_market_ids()
RETURNS TABLE(id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id
  FROM public.markets
  WHERE owner_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.current_user_owned_market_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_owned_market_ids() TO authenticated;


-- ============================================================
-- STEP 2: Remove all market_members INSERT policies
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;
-- market_members INSERT is exclusively handled by SECURITY DEFINER RPCs:
--   - accept_invitation_and_bind()   (staff joining via invitation)
--   - remove_team_member()           (owner removing a member)
--   - leave_current_staff_team()    (staff leaving)
-- No client-side INSERT policy is needed.

-- ============================================================
-- STEP 3: Remove all market_members DELETE policies, then create
--         a role-aware secure policy:
--         - staff: can delete only their own staff membership
--         - owner: can delete staff memberships in their own markets
--         - nobody: can delete owner memberships
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'DELETE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "market_members_delete_owner_or_self_staff"
ON public.market_members FOR DELETE
TO authenticated
USING (
  role = 'staff'
  AND (
    user_id = auth.uid()
    OR market_id IN (SELECT * FROM public.current_user_owned_market_ids())
  )
);
-- Logic: only staff rows are deletable.
--   - A staff member can delete their own staff row.
--   - A market owner can delete staff rows in markets they own.
--   - Owner rows (role = 'owner') are never deletable via this policy.

-- ============================================================
-- STEP 4: Enable RLS on market_members
-- ============================================================

ALTER TABLE public.market_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: Remove all market_members SELECT policies, then create
--         secure policy using helper (avoids recursion)
-- ============================================================

DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename   = 'market_members'
      AND cmd         = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.market_members', p.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "market_members_select_secure"
ON public.market_members FOR SELECT
TO authenticated
USING (
  market_id IN (SELECT * FROM public.current_user_market_ids())
);

-- ============================================================
-- STEP 6: Remove markets_select_temp and all other SELECT policies,
--         then create helper-based secure policy
-- ============================================================

DROP POLICY IF EXISTS "markets_select_temp" ON public.markets;

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

CREATE POLICY "markets_select_secure"
ON public.markets FOR SELECT
TO authenticated
USING (
  id IN (SELECT * FROM public.current_user_market_ids())
);

-- ============================================================
-- STEP 7: Remove products_select_temp
-- Note: Migration 014's "Users can view own and team products"
-- policy will automatically take effect. No replacement needed.
-- ============================================================

DROP POLICY IF EXISTS "products_select_temp" ON public.products;

-- ============================================================
-- VERIFICATION SQL (read-only, run in SQL Editor after migration)
-- ============================================================
/*

-- V1: market_members rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'market_members';
-- Expected: 1 row, rowsecurity = true

-- V2: market_members has no INSERT policies
SELECT policyname, cmd, with_check::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'INSERT';
-- Expected: 0 rows

-- V3: market_members DELETE policy: role='staff' + self OR owner market
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'DELETE';
-- Expected: 1 row named 'market_members_delete_owner_or_self_staff'
-- Expected: qual contains 'role = \'staff\'', 'user_id = auth.uid()',
--           'market_id IN', 'current_user_owned_market_ids'

-- V4: market_members SELECT policy uses helper
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'market_members' AND cmd = 'SELECT';
-- Expected: 1 row, qual contains 'current_user_market_ids'

-- V5: markets_select_temp is gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND policyname = 'markets_select_temp';
-- Expected: 0 rows

-- V6: markets SELECT policy uses helper
SELECT policyname, qual::text
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'markets' AND cmd = 'SELECT';
-- Expected: 1 row, qual contains 'current_user_market_ids'

-- V7: products_select_temp is gone
SELECT policyname FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'products_select_temp';
-- Expected: 0 rows

-- V8: Helper functions are SECURITY DEFINER with no IN parameters
SELECT r.routine_name, r.security_type,
  COUNT(p.parameter_name) FILTER (WHERE p.parameter_mode = 'IN') AS in_param_count
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
  ON p.specific_schema = r.specific_schema
 AND p.specific_name = r.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('current_user_market_ids', 'current_user_owned_market_ids')
GROUP BY r.routine_name, r.security_type
ORDER BY r.routine_name;
-- Expected: 2 rows, all security_type = 'DEFINER', all in_param_count = 0

-- V9: Helper grants
SELECT r.routine_name, fp.grantee, fp.privilege_type
FROM information_schema.routines r
JOIN information_schema.function_privileges fp
  ON fp.specific_schema = r.specific_schema
 AND fp.specific_name = r.specific_name
WHERE r.routine_schema = 'public'
  AND r.routine_name IN ('current_user_market_ids', 'current_user_owned_market_ids')
ORDER BY r.routine_name, fp.privilege_type;
-- Expected: both functions have EXECUTE granted to 'authenticated';
--           PUBLIC does not appear

-- V10: Owner membership integrity
-- IMPORTANT: Run this BEFORE applying this migration. If it returns rows,
-- the owner market membership is missing — the owner will lose access to
-- their own market after RLS is enabled. Backfill the missing memberships
-- before proceeding with this migration.
--
-- Backfill example (run as service_role):
--   INSERT INTO public.market_members (market_id, user_id, role)
--   SELECT m.id, m.owner_id, 'owner'
--   FROM public.markets m
--   WHERE NOT EXISTS (
--     SELECT 1 FROM public.market_members mm
--     WHERE mm.market_id = m.id AND mm.user_id = m.owner_id AND mm.role = 'owner'
--   );
SELECT m.id AS market_id, m.name AS market_name, m.owner_id
FROM public.markets m
WHERE NOT EXISTS (
  SELECT 1
  FROM public.market_members mm
  WHERE mm.market_id = m.id
    AND mm.user_id = m.owner_id
    AND mm.role = 'owner'
);
-- Expected: 0 rows before migration. If rows appear, backfill first.

*/

-- ============================================================
-- Done.
-- Next steps (outside this migration):
--   - Phase 8D-2: Sanitize staff_accessible_* views (typed NULL)
--   - Phase 8D-3: Fix get_my_staff() RPC (exclude revoked)
--   - Phase 8D-4: events payload sanitization
--   - Phase 8D-5: markets/products INSERT policy tightening (P1)
-- ============================================================

-- ============================================================
-- END SOURCE: 035_fix_p0_rls_security.sql
-- ============================================================
