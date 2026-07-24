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

COMMENT ON VIEW staff_accessible_products IS 
'員工可訪問的商品視圖：員工可以看到老闆的所有商品（透過 owner_id 連接）';

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
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 員工商品視圖修復完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '修復內容：';
  RAISE NOTICE '- ✅ 修復 staff_accessible_products 視圖';
  RAISE NOTICE '- ✅ 商品透過 owner_id 連接（不是 market_id）';
  RAISE NOTICE '- ✅ 員工可以看到老闆的所有商品';
  RAISE NOTICE '- ✅ 自動排除已刪除的商品（is_active = FALSE）';
  RAISE NOTICE '========================================';
END;
$$;
