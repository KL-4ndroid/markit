# Supabase 執行代碼總結

**日期**：2024-02-20
**版本**：1.0.0 (穩定版)
**狀態**：✅ 已採用最穩定方案

---

## 🎯 採用的穩定方案

| 問題 | 採用方案 | 理由 |
|------|---------|------|
| IndexedDB 洩露 | Supabase Views | 純 SQL，無需額外服務 |
| 權限撤銷即時性 | 定期驗證 + 上傳驗證 | 不依賴 Realtime |
| 雙重身分衝突 | Context Scope | 前端狀態管理 |
| 邀請邊界情況 | 簡化版 | 無額外表 |
| 離線競態條件 | 時間戳判定 | 寬鬆策略 |
| 審計日誌開銷 | 自動清理 | 定時任務 |

---

## 📋 執行步驟

### 方法 1：在 Supabase Dashboard 執行（推薦）⭐

**這是最簡單直觀的方式！**

#### 步驟：

1. **打開 Supabase Dashboard**
   - 登入 https://supabase.com
   - 選擇你的專案

2. **進入 SQL Editor**
   - 左側選單點擊 **SQL Editor**
   - 或直接訪問：`https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql`

3. **新增查詢**
   - 點擊 **New query** 按鈕
   - 或使用快捷鍵 `Ctrl + Enter`

4. **複製遷移代碼**
   - 打開 `supabase/migrations/20240220_add_staff_roles.sql`
   - 全選並複製所有內容（Ctrl + A, Ctrl + C）

5. **貼上並執行**
   - 在 SQL Editor 中貼上代碼（Ctrl + V）
   - 點擊右下角的 **Run** 按鈕
   - 或使用快捷鍵 `Ctrl + Enter`

6. **查看結果**
   - 執行成功會顯示綠色的成功訊息
   - 底部會顯示執行日誌（NOTICE 訊息）

#### 預期輸出：

執行成功後，在 SQL Editor 底部的 **Results** 面板會顯示：

```
Success. No rows returned

========================================
✅ 遷移完成！
========================================
總成員數：X
老闆數：X
員工數：0
========================================
新增功能：
- ✅ 員工專用視圖（markets_staff_view, products_staff_view）
- ✅ 審計日誌自動清理（cleanup_old_audit_logs）
- ✅ 權限時間驗證（was_permission_valid_at）
- ✅ Email 大小寫不敏感索引
========================================
```

#### 常見問題：

**Q: 執行時間很長，正常嗎？**
A: 正常！遷移腳本有 500+ 行，包含多個步驟，通常需要 10-30 秒。

**Q: 看到很多 NOTICE 訊息？**
A: 這是正常的！這些是腳本的執行日誌，顯示每個步驟的進度。

**Q: 如何確認執行成功？**
A: 查看底部是否有 "✅ 遷移完成！" 訊息，並且沒有紅色的 ERROR。

**Q: 執行失敗怎麼辦？**
A: 
1. 查看錯誤訊息（紅色文字）
2. 如果是權限問題，確認你是專案的 Owner
3. 如果是語法錯誤，確認複製的代碼完整
4. 可以執行回滾腳本恢復：`20240220_rollback_staff_roles.sql`

#### 提示：

- ✅ 可以保存查詢以便日後重複執行（點擊 Save）
- ✅ 可以查看執行歷史（History 標籤）
- ✅ 執行前可以先在測試專案試運行
- ✅ 建議在非高峰時段執行（如凌晨）

---

### 方法 2：使用 Supabase CLI（進階）

```bash
# 1. 確保 Supabase 已啟動
npx supabase status

# 2. 執行遷移
npx supabase db push

# 或手動執行特定檔案
npx supabase db execute --file supabase/migrations/20240220_add_staff_roles.sql
```

---

## 💾 完整 SQL 代碼

### 核心功能（必須執行）

```sql
-- ============================================
-- 1. 添加角色欄位
-- ============================================
ALTER TABLE market_members 
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 遷移現有數據
UPDATE market_members SET role = 'owner' WHERE role IS NULL;
UPDATE market_members SET added_by = user_id WHERE added_by IS NULL;

-- 添加約束
ALTER TABLE market_members 
ALTER COLUMN role SET NOT NULL,
ALTER COLUMN role SET DEFAULT 'owner',
ADD CONSTRAINT market_members_role_check CHECK (role IN ('owner', 'staff'));

ALTER TABLE market_members 
ALTER COLUMN added_by SET NOT NULL;

-- 允許 market_id 為 NULL
ALTER TABLE market_members 
ALTER COLUMN market_id DROP NOT NULL;

-- ============================================
-- 2. 創建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_market_members_user_role 
ON market_members(user_id, role);

CREATE INDEX IF NOT EXISTS idx_market_members_added_by 
ON market_members(added_by);

CREATE INDEX IF NOT EXISTS idx_market_members_staff_lookup 
ON market_members(user_id, role, added_by) 
WHERE role = 'staff';

CREATE INDEX IF NOT EXISTS idx_market_members_market_user 
ON market_members(market_id, user_id) 
WHERE market_id IS NOT NULL;

-- ============================================
-- 3. 設置 RLS 政策
-- ============================================
ALTER TABLE market_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON market_members;
DROP POLICY IF EXISTS "Owners can manage staff" ON market_members;
DROP POLICY IF EXISTS "Users can view market members" ON market_members;

CREATE POLICY "Users can view their own roles"
ON market_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage staff"
ON market_members FOR ALL
USING (auth.uid() = added_by OR auth.uid() = user_id);

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
-- 4. 創建輔助函數
-- ============================================
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

-- ============================================
-- 5. 創建審計日誌表
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

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. 創建觸發器
-- ============================================
CREATE OR REPLACE FUNCTION log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trigger_log_role_change ON market_members;
CREATE TRIGGER trigger_log_role_change
AFTER INSERT OR UPDATE OR DELETE ON market_members
FOR EACH ROW
EXECUTE FUNCTION log_role_change();
```

---

### 安全增強功能（強烈推薦）

```sql
-- ============================================
-- 7. 員工專用視圖（解決 IndexedDB 洩露）
-- ============================================
CREATE OR REPLACE VIEW markets_staff_view AS
SELECT 
  id, name, location, dates, start_date, end_date,
  start_time, end_time, status, operation_phase,
  owner_id, is_collaborative, sync_status, is_deleted,
  early_entry_enabled, early_entry_time, check_in_time,
  operating_start_time, operating_end_time,
  registration_fee, booth_cost, deposit,
  table_rental, chair_rental, umbrella_rental, tablecloth_rental,
  table_free, chair_free, umbrella_free, tablecloth_free,
  total_revenue,        -- ✅ 員工可見
  total_interactions,   -- ✅ 員工可見
  total_deals,          -- ✅ 員工可見
  -- total_profit,      -- ❌ 員工不可見
  -- commission_rate,   -- ❌ 員工不可見
  notes, created_at, updated_at
FROM markets
WHERE is_deleted = false;

CREATE OR REPLACE VIEW products_staff_view AS
SELECT 
  id, owner_id, market_id, name, category,
  price,              -- ✅ 員工可見
  -- cost,            -- ❌ 員工不可見
  icon_name, color_code, stock, unlimited_stock,
  is_active, is_shared, total_sold, description,
  created_at, updated_at
FROM products
WHERE is_active = true;

-- ============================================
-- 8. 審計日誌自動清理（解決存儲開銷）
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RAISE NOTICE '已清理 % 條舊審計日誌', v_deleted_count;
END;
$$;

-- ============================================
-- 9. 權限時間驗證（解決離線競態條件）
-- ============================================
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
  
  IF v_permission_granted_at IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN p_timestamp >= v_permission_granted_at 
     AND p_timestamp < v_permission_revoked_at;
END;
$$;

-- ============================================
-- 10. Email 大小寫不敏感索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
ON profiles(LOWER(email));
```

---

### 可選功能（建議執行）

```sql
-- ============================================
-- 11. 設置定時清理任務（需要 pg_cron）
-- ============================================
-- 注意：如果 pg_cron 未安裝，此步驟會失敗但不影響其他功能
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-audit-logs',
      '0 2 * * *',  -- 每天凌晨 2 點
      'SELECT cleanup_old_audit_logs();'
    );
    RAISE NOTICE '✅ 已設置審計日誌自動清理';
  ELSE
    RAISE NOTICE '⚠️ pg_cron 未安裝，請手動定期執行 cleanup_old_audit_logs()';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 無法設置定時任務';
END;
$$;
```

---

## ✅ 驗證步驟

### 1. 檢查表結構

```sql
-- 檢查 market_members 表
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'market_members'
ORDER BY ordinal_position;

-- 應該看到：
-- role (text, NOT NULL, default 'owner')
-- added_by (uuid, NOT NULL)
-- created_at (timestamptz, default NOW())
```

### 2. 檢查索引

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'market_members';

-- 應該看到 4 個索引：
-- idx_market_members_user_role
-- idx_market_members_added_by
-- idx_market_members_staff_lookup
-- idx_market_members_market_user
```

### 3. 檢查視圖

```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_name LIKE '%staff_view';

-- 應該看到：
-- markets_staff_view
-- products_staff_view
```

### 4. 檢查函數

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_user_role',
  'is_staff',
  'get_owner_id_by_staff',
  'cleanup_old_audit_logs',
  'was_permission_valid_at'
);

-- 應該看到 5 個函數
```

### 5. 檢查 RLS 政策

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'market_members';

-- 應該看到 3 個政策：
-- Users can view their own roles
-- Owners can manage staff
-- Users can view market members
```

---

## 🧪 測試查詢

### 測試 1：查詢員工視圖

```sql
-- 員工視圖應該不包含敏感欄位
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'markets_staff_view';

-- 確認不包含：total_profit, commission_rate
```

### 測試 2：測試輔助函數

```sql
-- 測試 get_user_role
SELECT get_user_role('your-user-id');

-- 測試 is_staff
SELECT is_staff('your-user-id');
```

### 測試 3：測試權限驗證

```sql
-- 測試時間戳驗證
SELECT was_permission_valid_at(
  'staff-user-id',
  NOW() - INTERVAL '1 hour'
);
```

---

## 🔄 回滾方案

如果需要回滾，執行：

```bash
npx supabase db execute --file supabase/migrations/20240220_rollback_staff_roles.sql
```

或在 SQL Editor 執行回滾腳本。

---

## 📊 執行結果

執行成功後，你應該看到：

```
========================================
✅ 遷移完成！
========================================
總成員數：X
老闆數：X
員工數：0
========================================
新增功能：
- ✅ 員工專用視圖（markets_staff_view, products_staff_view）
- ✅ 審計日誌自動清理（cleanup_old_audit_logs）
- ✅ 權限時間驗證（was_permission_valid_at）
- ✅ Email 大小寫不敏感索引
========================================
```

---

## 🎯 下一步

執行完成後：

1. ✅ 驗證所有功能正常
2. ✅ 開始 Phase 1.2（Dexie Schema 升級）
3. ✅ 更新前端代碼使用新視圖

---

## 📞 需要幫助？

- 遷移腳本：`supabase/migrations/20240220_add_staff_roles.sql`
- 回滾腳本：`supabase/migrations/20240220_rollback_staff_roles.sql`
- 測試環境：`docs/TEST_ENVIRONMENT_SETUP.md`

---

**最後更新**：2024-02-20
**版本**：1.0.0 (穩定版)
