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

COMMENT ON VIEW staff_accessible_events IS 
'員工可訪問的事件視圖：包含老闆市集的事件和老闆的全局事件';

-- ==================== 完成 ====================

DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 員工事件視圖創建完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '新增內容：';
  RAISE NOTICE '- ✅ staff_accessible_events 視圖';
  RAISE NOTICE '========================================';
END;
$$;
