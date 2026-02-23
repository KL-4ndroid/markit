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

COMMENT ON TABLE staff_relationships IS '員工關係表：記錄老闆和員工的關係';
COMMENT ON COLUMN staff_relationships.owner_id IS '老闆的 user_id';
COMMENT ON COLUMN staff_relationships.staff_id IS '員工的 user_id';
COMMENT ON COLUMN staff_relationships.staff_email IS '員工的 Email（用於邀請）';
COMMENT ON COLUMN staff_relationships.status IS '狀態：pending（待接受）、active（已接受）、revoked（已撤銷）';
COMMENT ON COLUMN staff_relationships.permissions IS '員工權限設定（JSON）';

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
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 員工系統創建完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '新增內容：';
  RAISE NOTICE '- ✅ staff_relationships 表';
  RAISE NOTICE '- ✅ 3 個輔助函數';
  RAISE NOTICE '- ✅ 2 個員工專用視圖';
  RAISE NOTICE '- ✅ RLS 政策';
  RAISE NOTICE '========================================';
END;
$$;
