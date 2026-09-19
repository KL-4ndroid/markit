-- ============================================
-- 員工模式回滾腳本
-- 版本：1.0.0
-- 日期：2024-02-20
-- 描述：回滾員工模式的所有變更
-- ⚠️ 警告：此操作將刪除所有員工數據！
-- ============================================

-- 開始事務
BEGIN;

-- ============================================
-- Step 1: 刪除觸發器
-- ============================================

DROP TRIGGER IF EXISTS trigger_log_role_change ON market_members;
DROP FUNCTION IF EXISTS log_role_change();

DO $$ BEGIN
  RAISE NOTICE '✅ 已刪除觸發器';
END; $$;

-- ============================================
-- Step 2: 刪除輔助函數
-- ============================================

DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS is_staff(UUID);
DROP FUNCTION IF EXISTS get_owner_id_by_staff(UUID);

DO $$ BEGIN
  RAISE NOTICE '✅ 已刪除輔助函數';
END; $$;

-- ============================================
-- Step 3: 刪除審計日誌表
-- ============================================

DROP TABLE IF EXISTS audit_logs CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✅ 已刪除審計日誌表';
END; $$;

-- ============================================
-- Step 4: 刪除 RLS 政策
-- ============================================

DROP POLICY IF EXISTS "Users can view their own roles" ON market_members;
DROP POLICY IF EXISTS "Owners can manage staff" ON market_members;
DROP POLICY IF EXISTS "Users can view market members" ON market_members;

DO $$ BEGIN
  RAISE NOTICE '✅ 已刪除 RLS 政策';
END; $$;

-- ============================================
-- Step 5: 刪除索引
-- ============================================

DROP INDEX IF EXISTS idx_market_members_user_role;
DROP INDEX IF EXISTS idx_market_members_added_by;
DROP INDEX IF EXISTS idx_market_members_staff_lookup;
DROP INDEX IF EXISTS idx_market_members_market_user;

DO $$ BEGIN
  RAISE NOTICE '✅ 已刪除索引';
END; $$;

-- ============================================
-- Step 6: 刪除員工記錄（保留老闆記錄）
-- ============================================

-- 記錄刪除的員工數量
DO $$
DECLARE
  v_staff_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_staff_count
  FROM market_members
  WHERE role = 'staff';
  
  RAISE NOTICE '⚠️ 即將刪除 % 筆員工記錄', v_staff_count;
END;
$$;

-- 刪除員工記錄
DELETE FROM market_members
WHERE role = 'staff';

DO $$ BEGIN
  RAISE NOTICE '✅ 已刪除員工記錄';
END; $$;

-- ============================================
-- Step 7: 恢復 market_id 約束
-- ============================================

-- 刪除 market_id 為 NULL 的記錄（如果有）
DELETE FROM market_members
WHERE market_id IS NULL;

-- 恢復 NOT NULL 約束
ALTER TABLE market_members 
ALTER COLUMN market_id SET NOT NULL;

DO $$ BEGIN
  RAISE NOTICE '✅ 已恢復 market_id NOT NULL 約束';
END; $$;

-- ============================================
-- Step 8: 刪除新欄位
-- ============================================

-- 刪除約束
ALTER TABLE market_members 
DROP CONSTRAINT IF EXISTS market_members_role_check;

-- 刪除欄位
ALTER TABLE market_members 
DROP COLUMN IF EXISTS role;

ALTER TABLE market_members 
DROP COLUMN IF EXISTS added_by;

ALTER TABLE market_members 
DROP COLUMN IF EXISTS created_at;

DO $$ BEGIN
  RAISE NOTICE '✅ 已刪除新欄位';
END; $$;

-- ============================================
-- Step 9: 恢復原有 RLS 政策（如果有）
-- ============================================

-- 這裡可以添加原有的 RLS 政策
-- 根據你的實際情況調整

-- ============================================
-- Step 10: 數據驗證
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- 驗證沒有 NULL market_id
  SELECT COUNT(*) INTO v_count
  FROM market_members
  WHERE market_id IS NULL;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION '發現 % 筆記錄的 market_id 為 NULL，回滾失敗', v_count;
  END IF;
  
  -- 驗證沒有 role 欄位
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'market_members' 
    AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'role 欄位仍然存在，回滾失敗';
  END IF;
  
  RAISE NOTICE '✅ 數據驗證通過';
END;
$$;

-- ============================================
-- 回滾完成
-- ============================================

DO $$
DECLARE
  v_remaining_members INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_remaining_members FROM market_members;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 回滾完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '剩餘成員數：%', v_remaining_members;
  RAISE NOTICE '⚠️ 所有員工數據已被刪除';
  RAISE NOTICE '========================================';
END;
$$;

-- 提交事務
COMMIT;

-- 如果出現錯誤，自動回滾
-- ROLLBACK;
