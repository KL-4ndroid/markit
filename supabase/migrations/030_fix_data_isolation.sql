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

COMMENT ON VIEW staff_accessible_markets IS '員工可訪問的市集視圖（只返回 active 關係）';
COMMENT ON VIEW staff_accessible_products IS '員工可訪問的商品視圖（只返回 active 關係）';
COMMENT ON VIEW staff_accessible_events IS '員工可訪問的事件視圖（只返回 active 關係）';

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
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 數據隔離修復完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '修復內容：';
  RAISE NOTICE '- ✅ 重新創建所有視圖';
  RAISE NOTICE '- ✅ 確保只返回 active 關係';
  RAISE NOTICE '- ✅ 添加更嚴格的過濾條件';
  RAISE NOTICE '========================================';
  RAISE NOTICE '下一步：';
  RAISE NOTICE '1. 執行驗證查詢檢查結果';
  RAISE NOTICE '2. 如果還有問題，執行清理腳本';
  RAISE NOTICE '3. 前端重新同步數據';
  RAISE NOTICE '========================================';
END;
$$;
