-- ==================== 員工商品同步問題診斷 SQL ====================
-- 用途：逐步檢查員工為什麼看不到老闆的商品
-- 執行方式：在 Supabase SQL Editor 中逐個執行以下查詢

-- ==================== 步驟 1：檢查當前用戶 ID ====================
-- 目的：確認你當前登入的是哪個帳號

SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_email;

-- 預期結果：應該顯示當前登入用戶的 ID 和 Email

-- ==================== 步驟 2：檢查員工關係 ====================
-- 目的：確認員工關係是否正確建立

SELECT 
  id,
  owner_id,
  staff_id,
  staff_email,
  status,
  permissions,
  created_at
FROM staff_relationships
WHERE staff_id = auth.uid() OR owner_id = auth.uid()
ORDER BY created_at DESC;

-- 預期結果：
-- - 如果你是員工，應該看到 staff_id = 你的 ID 的記錄
-- - 如果你是老闆，應該看到 owner_id = 你的 ID 的記錄
-- - status 應該是 'active'

-- ==================== 步驟 3：檢查商品表 ====================
-- 目的：確認商品是否存在，以及 owner_id 是否正確

SELECT 
  id,
  name,
  owner_id,
  (SELECT email FROM auth.users WHERE id = products.owner_id) as owner_email,
  is_active,
  created_at
FROM products
WHERE is_active = TRUE
ORDER BY created_at DESC
LIMIT 10;

-- 預期結果：
-- - 應該看到老闆創建的商品
-- - owner_id 應該是老闆的 ID
-- - is_active 應該是 TRUE

-- ==================== 步驟 4：檢查視圖是否存在 ====================
-- 目的：確認 staff_accessible_products 視圖是否正確創建

SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views
WHERE viewname = 'staff_accessible_products';

-- 預期結果：
-- - 應該看到視圖的定義
-- - 如果沒有結果，說明視圖沒有創建成功

-- ==================== 步驟 5：測試視圖查詢（員工身份）====================
-- 目的：檢查員工是否能透過視圖看到商品

SELECT 
  id,
  name,
  owner_id,
  relationship_owner_id,
  access_type,
  permissions,
  is_active
FROM staff_accessible_products
ORDER BY created_at DESC;

-- 預期結果：
-- - 如果你是員工，應該看到 access_type = 'staff' 的商品
-- - 如果你是老闆，應該看到 access_type = 'owner' 的商品
-- - 如果沒有結果，說明視圖邏輯有問題

-- ==================== 步驟 6：手動測試連接邏輯 ====================
-- 目的：手動執行視圖的 JOIN 邏輯，看看哪裡出問題

-- 6.1 檢查員工可以看到的商品（手動 JOIN）
SELECT 
  p.id,
  p.name,
  p.owner_id,
  sr.staff_id,
  sr.owner_id as relationship_owner_id,
  sr.status,
  p.is_active
FROM products p
JOIN staff_relationships sr ON sr.owner_id = p.owner_id
WHERE sr.staff_id = auth.uid()
AND sr.status = 'active'
AND p.is_active = TRUE;

-- 預期結果：
-- - 如果你是員工，應該看到老闆的商品
-- - 如果沒有結果，檢查：
--   1. staff_relationships 中是否有你的記錄
--   2. products 中的 owner_id 是否匹配 staff_relationships 的 owner_id

-- 6.2 檢查老闆的商品
SELECT 
  id,
  name,
  owner_id,
  is_active
FROM products
WHERE owner_id = (
  SELECT owner_id 
  FROM staff_relationships 
  WHERE staff_id = auth.uid() 
  AND status = 'active'
  LIMIT 1
);

-- 預期結果：
-- - 應該看到老闆的所有商品

-- ==================== 步驟 7：檢查 RLS 政策 ====================
-- 目的：確認 RLS 政策是否阻止了查詢

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('products', 'staff_relationships')
ORDER BY tablename, policyname;

-- 預期結果：
-- - 應該看到相關的 RLS 政策
-- - 檢查政策是否允許員工查看商品

-- ==================== 步驟 8：檢查前端使用的 API ====================
-- 目的：確認前端是否正確使用 staff_accessible_products 視圖

-- 這個需要在前端代碼中檢查：
-- 文件：lib/supabase/products.ts
-- 函數：getAccessibleProducts()
-- 
-- 應該使用：
-- supabase.from('staff_accessible_products').select('*')
-- 
-- 而不是：
-- supabase.from('products').select('*')

-- ==================== 診斷總結 ====================
/*
根據以上查詢結果，可以判斷問題出在哪裡：

1. 如果步驟 2 沒有結果 → 員工關係沒有建立
   解決方案：重新邀請員工或檢查邀請流程

2. 如果步驟 3 沒有結果 → 老闆沒有創建商品
   解決方案：老闆需要先創建商品

3. 如果步驟 3 有結果，但 owner_id 是 NULL → 商品的 owner_id 沒有設置
   解決方案：執行 Migration 014 更新 owner_id

4. 如果步驟 4 沒有結果 → 視圖沒有創建
   解決方案：執行 Migration 029

5. 如果步驟 5 沒有結果 → 視圖邏輯有問題
   解決方案：檢查步驟 6 的手動 JOIN 結果

6. 如果步驟 6 有結果，但步驟 5 沒有結果 → 視圖定義錯誤
   解決方案：重新執行 Migration 029

7. 如果所有 SQL 查詢都正常，但前端看不到 → 前端 API 問題
   解決方案：檢查前端是否使用正確的視圖
*/

-- ==================== 快速診斷（一次性查詢）====================
-- 執行這個查詢可以一次看到所有關鍵信息

SELECT 
  '當前用戶' as info_type,
  auth.uid()::text as value,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as detail
UNION ALL
SELECT 
  '員工關係數量',
  COUNT(*)::text,
  STRING_AGG(status, ', ')
FROM staff_relationships
WHERE staff_id = auth.uid()
UNION ALL
SELECT 
  '可訪問商品數量（視圖）',
  COUNT(*)::text,
  STRING_AGG(DISTINCT access_type, ', ')
FROM staff_accessible_products
UNION ALL
SELECT 
  '老闆的商品數量',
  COUNT(*)::text,
  STRING_AGG(DISTINCT owner_id::text, ', ')
FROM products
WHERE owner_id IN (
  SELECT owner_id FROM staff_relationships WHERE staff_id = auth.uid()
)
AND is_active = TRUE;

-- 預期結果：
-- - 當前用戶：你的 ID 和 Email
-- - 員工關係數量：至少 1，狀態應該是 active
-- - 可訪問商品數量：應該 > 0
-- - 老闆的商品數量：應該 > 0
