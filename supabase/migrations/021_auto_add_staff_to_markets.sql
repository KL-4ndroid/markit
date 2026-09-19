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

COMMENT ON FUNCTION auto_add_staff_to_new_market() IS '自動將老闆的員工添加到新創建的市集';
COMMENT ON TRIGGER trigger_auto_add_staff_to_new_market ON markets IS '當市集創建時自動添加員工權限';

-- ==================== 完成 ====================
-- Migration 021 完成
-- 現在老闆創建新市集時，員工會自動獲得訪問權限
