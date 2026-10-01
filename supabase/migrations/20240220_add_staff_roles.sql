-- ============================================
-- 員工模式：市集成員角色系統
-- 版本：1.0.0
-- 日期：2024-02-20
-- 描述：擴展 market_members 表以支持老闆/員工角色
-- ============================================

-- ============================================
-- Step 1: 添加新欄位（允許 NULL，向後兼容）
-- ============================================

-- 添加角色欄位
ALTER TABLE market_members 
ADD COLUMN IF NOT EXISTS role TEXT;

-- 添加添加者欄位（記錄誰添加的員工）
ALTER TABLE market_members 
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id);

-- 添加創建時間欄位
ALTER TABLE market_members 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN market_members.role IS '用戶角色：owner（老闆）或 staff（員工）';
COMMENT ON COLUMN market_members.added_by IS '添加者的 user_id（老闆添加員工時記錄）';
COMMENT ON COLUMN market_members.created_at IS '記錄創建時間';

-- ============================================
-- Step 2: 遷移現有數據
-- ============================================

-- 為現有記錄設置預設值（所有現有用戶都是老闆）
UPDATE market_members 
SET role = 'owner' 
WHERE role IS NULL;

-- 為現有記錄設置 added_by（自己添加自己）
UPDATE market_members 
SET added_by = user_id 
WHERE added_by IS NULL;

-- ============================================
-- Step 3: 添加約束（確保數據完整性）
-- ============================================

-- 設置 role 為 NOT NULL
ALTER TABLE market_members 
ALTER COLUMN role SET NOT NULL;

-- 設置 role 預設值
ALTER TABLE market_members 
ALTER COLUMN role SET DEFAULT 'owner';

-- 添加 CHECK 約束（只允許 owner 或 staff）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'market_members_role_check'
  ) THEN
    ALTER TABLE market_members 
    ADD CONSTRAINT market_members_role_check 
    CHECK (role IN ('owner', 'staff'));
  END IF;
END;
$$;

-- 設置 added_by 為 NOT NULL
ALTER TABLE market_members 
ALTER COLUMN added_by SET NOT NULL;

-- ============================================
-- Step 4: 修改 market_id 約束
-- ============================================

-- 允許 market_id 為 NULL（表示員工可訪問所有市集）
ALTER TABLE market_members 
ALTER COLUMN market_id DROP NOT NULL;

COMMENT ON COLUMN market_members.market_id IS '市集 ID，NULL 表示可訪問所有市集（員工模式）';

-- ============================================
-- Step 5: 創建索引（優化查詢性能）
-- ============================================

-- 用戶角色查詢索引
CREATE INDEX IF NOT EXISTS idx_market_members_user_role 
ON market_members(user_id, role);

-- 添加者查詢索引（查詢某老闆添加的所有員工）
CREATE INDEX IF NOT EXISTS idx_market_members_added_by 
ON market_members(added_by);

-- 員工查詢優化索引（只索引員工記錄）
CREATE INDEX IF NOT EXISTS idx_market_members_staff_lookup 
ON market_members(user_id, role, added_by) 
WHERE role = 'staff';

-- 市集成員查詢索引
CREATE INDEX IF NOT EXISTS idx_market_members_market_user 
ON market_members(market_id, user_id) 
WHERE market_id IS NOT NULL;

-- ============================================
-- Step 6: 設置 RLS 政策
-- ============================================

-- 啟用 RLS（如果尚未啟用）
ALTER TABLE market_members ENABLE ROW LEVEL SECURITY;

-- 刪除舊政策（如果存在）
DROP POLICY IF EXISTS "Users can view their own roles" ON market_members;
DROP POLICY IF EXISTS "Owners can manage staff" ON market_members;
DROP POLICY IF EXISTS "Users can view their memberships" ON market_members;
DROP POLICY IF EXISTS "Users can manage their own memberships" ON market_members;

-- 政策 1: 用戶可以查看自己的角色
CREATE POLICY "Users can view their own roles"
ON market_members FOR SELECT
USING (auth.uid() = user_id);

-- 政策 2: 老闆可以管理員工（添加、移除、更新）
CREATE POLICY "Owners can manage staff"
ON market_members FOR ALL
USING (
  auth.uid() = added_by 
  OR auth.uid() = user_id
);

-- 政策 3: 用戶可以查看同一市集的其他成員
CREATE POLICY "Users can view market members"
ON market_members FOR SELECT
USING (
  market_id IN (
    SELECT market_id 
    FROM market_members 
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- Step 7: 創建輔助函數
-- ============================================

-- 函數：獲取用戶角色
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM market_members
  WHERE user_id = p_user_id
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'owner');
END;
$$;

COMMENT ON FUNCTION get_user_role(UUID) IS '獲取用戶角色（owner 或 staff）';

-- 函數：檢查用戶是否為員工
CREATE OR REPLACE FUNCTION is_staff(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM market_members 
    WHERE user_id = p_user_id 
    AND role = 'staff'
  );
END;
$$;

COMMENT ON FUNCTION is_staff(UUID) IS '檢查用戶是否為員工';

-- 函數：獲取員工的老闆 ID
CREATE OR REPLACE FUNCTION get_owner_id_by_staff(p_staff_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT added_by INTO v_owner_id
  FROM market_members
  WHERE user_id = p_staff_id
  AND role = 'staff'
  LIMIT 1;
  
  RETURN v_owner_id;
END;
$$;

COMMENT ON FUNCTION get_owner_id_by_staff(UUID) IS '獲取員工的老闆 ID';

-- ============================================
-- Step 8: 創建審計日誌表（可選）
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp 
ON audit_logs(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_allowed 
ON audit_logs(allowed, timestamp DESC);

COMMENT ON TABLE audit_logs IS '審計日誌：記錄所有權限檢查和敏感操作';

-- 啟用 RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 只有系統管理員可以查看審計日誌
CREATE POLICY "Only admins can view audit logs"
ON audit_logs FOR SELECT
USING (false); -- 暫時禁用，後續可以添加管理員角色

-- 所有用戶都可以插入審計日誌
CREATE POLICY "Users can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Step 9: 創建觸發器（自動記錄變更）
-- ============================================

-- 函數：記錄角色變更
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 記錄到審計日誌
  INSERT INTO audit_logs (user_id, action, resource, allowed)
  VALUES (
    NEW.user_id,
    TG_OP || '_role',
    'market_members',
    true
  );
  
  RETURN NEW;
END;
$$;

-- 創建觸發器
DROP TRIGGER IF EXISTS trigger_log_role_change ON market_members;
CREATE TRIGGER trigger_log_role_change
AFTER INSERT OR UPDATE OR DELETE ON market_members
FOR EACH ROW
EXECUTE FUNCTION log_role_change();

-- ============================================
-- Step 10: 數據驗證
-- ============================================

-- 驗證所有記錄都有 role
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM market_members
  WHERE role IS NULL;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION '發現 % 筆記錄沒有 role，遷移失敗', v_count;
  END IF;
  
  RAISE NOTICE '✅ 數據驗證通過：所有記錄都有 role';
END;
$$;

-- 驗證所有記錄都有 added_by
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM market_members
  WHERE added_by IS NULL;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION '發現 % 筆記錄沒有 added_by，遷移失敗', v_count;
  END IF;
  
  RAISE NOTICE '✅ 數據驗證通過：所有記錄都有 added_by';
END;
$$;

-- ============================================
-- Step 11: 創建員工專用視圖（解決 IndexedDB 洩露問題）
-- ============================================

-- 市集視圖：員工只能看到允許的欄位
CREATE OR REPLACE VIEW markets_staff_view AS
SELECT 
  id,
  name,
  location,
  dates,
  start_date,
  end_date,
  start_time,
  end_time,
  status,
  operation_phase,
  owner_id,
  is_collaborative,
  sync_status,
  is_deleted,
  -- 時間軸資訊
  early_entry_enabled,
  early_entry_time,
  check_in_time,
  operating_start_time,
  operating_end_time,
  -- 財務資訊（員工可見）
  registration_fee,
  booth_cost,
  deposit,
  table_rental,
  chair_rental,
  umbrella_rental,
  tablecloth_rental,
  -- 免費提供標記
  table_free,
  chair_free,
  umbrella_free,
  tablecloth_free,
  -- 統計資訊（員工可見）
  total_revenue,        -- ✅ 可見
  total_interactions,   -- ✅ 可見
  total_deals,          -- ✅ 可見
  -- 敏感資訊（員工不可見）
  -- total_profit,      -- ❌ 不包含
  -- commission_rate,   -- ❌ 不包含
  -- 備註
  notes,
  -- 時間戳
  created_at,
  updated_at
FROM markets
WHERE is_deleted = false;

COMMENT ON VIEW markets_staff_view IS '員工視圖：只包含員工可見的市集欄位';

-- 商品視圖：員工只能看到允許的欄位
CREATE OR REPLACE VIEW products_staff_view AS
SELECT 
  id,
  owner_id,
  market_id,
  name,
  category,
  price,              -- ✅ 可見
  -- cost,            -- ❌ 不包含（商品成本）
  icon_name,
  color_code,
  stock,
  unlimited_stock,
  is_active,
  is_shared,
  total_sold,
  description,
  created_at,
  updated_at
FROM products
WHERE is_active = true;

COMMENT ON VIEW products_staff_view IS '員工視圖：只包含員工可見的商品欄位';

-- 為視圖設置 RLS 政策
ALTER VIEW markets_staff_view SET (security_invoker = true);
ALTER VIEW products_staff_view SET (security_invoker = true);

-- 輸出日誌
DO $$
BEGIN
  RAISE NOTICE '✅ 已創建員工專用視圖';
END;
$$;

-- ============================================
-- Step 12: 審計日誌自動清理（解決存儲開銷問題）
-- ============================================

-- 創建清理函數
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- 刪除 30 天前的日誌
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE '已清理 % 條舊審計日誌', v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_audit_logs() IS '清理 30 天前的審計日誌';

-- 創建定時任務（需要 pg_cron 擴展）
-- 注意：如果 pg_cron 未安裝，此步驟會失敗但不影響其他功能
DO $$
BEGIN
  -- 檢查 pg_cron 是否可用
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- 每天凌晨 2 點執行清理
    PERFORM cron.schedule(
      'cleanup-audit-logs',
      '0 2 * * *',
      'SELECT cleanup_old_audit_logs();'
    );
    RAISE NOTICE '✅ 已設置審計日誌自動清理（每天凌晨 2 點）';
  ELSE
    RAISE NOTICE '⚠️ pg_cron 未安裝，請手動定期執行 cleanup_old_audit_logs()';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 無法設置定時任務，請手動定期執行 cleanup_old_audit_logs()';
END;
$$;

-- ============================================
-- Step 13: 權限驗證輔助函數（解決離線競態條件）
-- ============================================

-- 函數：檢查用戶在特定時間點是否有權限
CREATE OR REPLACE FUNCTION was_permission_valid_at(
  p_user_id UUID,
  p_timestamp TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_permission_granted_at TIMESTAMPTZ;
  v_permission_revoked_at TIMESTAMPTZ;
BEGIN
  -- 查詢權限記錄
  SELECT 
    created_at,
    COALESCE(
      (SELECT timestamp FROM audit_logs 
       WHERE user_id = p_user_id 
       AND action = 'DELETE_role' 
       AND timestamp > created_at 
       ORDER BY timestamp ASC 
       LIMIT 1),
      'infinity'::TIMESTAMPTZ
    )
  INTO v_permission_granted_at, v_permission_revoked_at
  FROM market_members
  WHERE user_id = p_user_id
  AND role = 'staff'
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- 檢查時間戳是否在權限有效期內
  IF v_permission_granted_at IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN p_timestamp >= v_permission_granted_at 
     AND p_timestamp < v_permission_revoked_at;
END;
$$;

COMMENT ON FUNCTION was_permission_valid_at(UUID, TIMESTAMPTZ) IS '檢查用戶在特定時間點是否有權限';

-- ============================================
-- Step 14: Email 大小寫不敏感索引（解決邀請邊界問題）
-- ============================================

-- 為 profiles 表的 email 創建大小寫不敏感索引
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
ON profiles(LOWER(email));

COMMENT ON INDEX idx_profiles_email_lower IS 'Email 大小寫不敏感查詢索引';

-- 輸出日誌
DO $$
BEGIN
  RAISE NOTICE '✅ 已創建 Email 大小寫不敏感索引';
END;
$$;

-- ============================================
-- 遷移完成
-- ============================================

-- 記錄遷移版本
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') THEN
    CREATE TABLE schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END;
$$;

INSERT INTO schema_migrations (version, name, executed_at)
VALUES (
  '20240220_add_staff_roles',
  '員工模式：市集成員角色系統',
  NOW()
)
ON CONFLICT (version) DO NOTHING;

-- 輸出遷移摘要
DO $$
DECLARE
  v_total_members INTEGER;
  v_owners INTEGER;
  v_staff INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_members FROM market_members;
  SELECT COUNT(*) INTO v_owners FROM market_members WHERE role = 'owner';
  SELECT COUNT(*) INTO v_staff FROM market_members WHERE role = 'staff';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ 遷移完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '總成員數：%', v_total_members;
  RAISE NOTICE '老闆數：%', v_owners;
  RAISE NOTICE '員工數：%', v_staff;
  RAISE NOTICE '========================================';
  RAISE NOTICE '新增功能：';
  RAISE NOTICE '- ✅ 員工專用視圖（markets_staff_view, products_staff_view）';
  RAISE NOTICE '- ✅ 審計日誌自動清理（cleanup_old_audit_logs）';
  RAISE NOTICE '- ✅ 權限時間驗證（was_permission_valid_at）';
  RAISE NOTICE '- ✅ Email 大小寫不敏感索引';
  RAISE NOTICE '========================================';
END;
$$;
