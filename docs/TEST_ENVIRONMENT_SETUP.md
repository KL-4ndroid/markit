# 測試環境準備指南

## 📋 目的

本文檔指導如何準備測試環境，以安全地測試員工模式的實作。

---

## 🎯 測試環境要求

### 1. Supabase 測試專案

**選項 A：創建獨立測試專案（推薦）**

```bash
# 1. 登入 Supabase
npx supabase login

# 2. 創建新專案（測試用）
# 在 Supabase Dashboard 創建新專案：market-pulse-test

# 3. 連結到測試專案
npx supabase link --project-ref YOUR_TEST_PROJECT_REF
```

**選項 B：使用本地 Supabase（最安全）**

```bash
# 1. 安裝 Docker Desktop
# https://www.docker.com/products/docker-desktop

# 2. 啟動本地 Supabase
npx supabase start

# 3. 查看本地連接信息
npx supabase status

# 輸出示例：
# API URL: http://localhost:54321
# DB URL: postgresql://postgres:postgres@localhost:54322/postgres
# Studio URL: http://localhost:54323
```

---

## 🔧 環境配置

### 1. 創建測試環境變數

```bash
# 複製環境變數模板
cp .env.local .env.test

# 編輯 .env.test
```

**`.env.test` 內容**：

```bash
# Supabase 測試環境
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_test_anon_key

# 啟用員工模式（測試）
NEXT_PUBLIC_ENABLE_STAFF_MODE=true

# 啟用角色切換（開發模式）
NEXT_PUBLIC_ENABLE_ROLE_SWITCH=true

# 啟用調試日誌
NEXT_PUBLIC_DEBUG_MODE=true
```

---

## 📊 準備測試數據

### 1. 創建測試用戶

```sql
-- 在 Supabase SQL Editor 執行

-- 測試老闆帳號
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'owner@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- 測試員工帳號
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'staff@test.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW()
);

-- 創建 profiles
INSERT INTO profiles (id, email, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'owner@test.com', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', 'staff@test.com', NOW(), NOW());
```

### 2. 創建測試市集

```sql
-- 創建測試市集
INSERT INTO markets (
  id,
  name,
  location,
  start_date,
  end_date,
  status,
  owner_id,
  registration_fee,
  booth_cost,
  created_at,
  updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '測試市集 A',
  '台北市',
  '2024-02-25',
  '2024-02-25',
  'ongoing',
  '00000000-0000-0000-0000-000000000001',
  500,
  1000,
  NOW(),
  NOW()
);

-- 添加老闆為市集成員
INSERT INTO market_members (
  market_id,
  user_id,
  role,
  added_by,
  joined_at
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  '00000000-0000-0000-0000-000000000001',
  NOW()
);
```

### 3. 創建測試商品

```sql
-- 創建測試商品
INSERT INTO products (
  id,
  name,
  category,
  price,
  cost,
  stock,
  is_active,
  owner_id,
  created_at,
  updated_at
) VALUES 
  (
    '20000000-0000-0000-0000-000000000001',
    '測試商品 A',
    'handmade',
    100,
    50,
    10,
    true,
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '測試商品 B',
    'food',
    200,
    100,
    20,
    true,
    '00000000-0000-0000-0000-000000000001',
    NOW(),
    NOW()
  );
```

---

## 🧪 執行遷移

### 1. 備份現有數據（如果是測試專案可跳過）

```bash
# 導出現有數據
npx supabase db dump -f backup_before_migration.sql
```

### 2. 執行遷移腳本

**方法 A：使用 Supabase CLI**

```bash
# 執行遷移
npx supabase db push

# 或手動執行特定遷移
npx supabase db execute --file supabase/migrations/20240220_add_staff_roles.sql
```

**方法 B：使用 Supabase Dashboard**

1. 打開 Supabase Dashboard
2. 進入 SQL Editor
3. 複製 `20240220_add_staff_roles.sql` 的內容
4. 執行 SQL

### 3. 驗證遷移

```sql
-- 檢查表結構
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'market_members'
ORDER BY ordinal_position;

-- 預期輸出應包含：
-- role (text, NOT NULL, default 'owner')
-- added_by (uuid, NOT NULL)
-- created_at (timestamptz, default NOW())

-- 檢查索引
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'market_members';

-- 預期輸出應包含：
-- idx_market_members_user_role
-- idx_market_members_added_by
-- idx_market_members_staff_lookup

-- 檢查 RLS 政策
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'market_members';

-- 預期輸出應包含：
-- Users can view their own roles
-- Owners can manage staff
-- Users can view market members

-- 檢查數據
SELECT 
  user_id,
  market_id,
  role,
  added_by,
  created_at
FROM market_members
LIMIT 5;

-- 所有記錄應該都有 role = 'owner'
```

---

## 🧪 測試場景

### 場景 1：添加員工

```sql
-- 老闆添加員工
INSERT INTO market_members (
  user_id,
  market_id,
  role,
  added_by,
  joined_at
) VALUES (
  '00000000-0000-0000-0000-000000000002', -- 員工 ID
  NULL, -- NULL = 可訪問所有市集
  'staff',
  '00000000-0000-0000-0000-000000000001', -- 老闆 ID
  NOW()
);

-- 驗證
SELECT * FROM market_members WHERE role = 'staff';
```

### 場景 2：員工查詢市集

```sql
-- 設置當前用戶為員工
SET LOCAL jwt.claims.sub = '00000000-0000-0000-0000-000000000002';

-- 員工查詢自己的角色
SELECT * FROM market_members WHERE user_id = '00000000-0000-0000-0000-000000000002';

-- 員工查詢老闆的市集
SELECT m.* 
FROM markets m
WHERE m.owner_id = (
  SELECT added_by 
  FROM market_members 
  WHERE user_id = '00000000-0000-0000-0000-000000000002' 
  AND role = 'staff'
  LIMIT 1
);
```

### 場景 3：移除員工

```sql
-- 老闆移除員工
DELETE FROM market_members
WHERE user_id = '00000000-0000-0000-0000-000000000002'
AND role = 'staff';

-- 驗證
SELECT * FROM market_members WHERE role = 'staff';
-- 應該返回 0 筆記錄
```

---

## 🔄 回滾測試

### 1. 執行回滾腳本

```bash
# 使用 CLI
npx supabase db execute --file supabase/migrations/20240220_rollback_staff_roles.sql

# 或在 SQL Editor 執行
```

### 2. 驗證回滾

```sql
-- 檢查 role 欄位是否已刪除
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'market_members'
AND column_name = 'role';
-- 應該返回 0 筆記錄

-- 檢查 market_id 約束
SELECT 
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'market_members'
AND column_name = 'market_id';
-- is_nullable 應該為 'NO'

-- 檢查員工記錄是否已刪除
SELECT COUNT(*) FROM market_members;
-- 應該只剩下老闆記錄
```

---

## 📋 測試檢查清單

### 遷移前
- [ ] 已創建測試環境（本地或測試專案）
- [ ] 已配置測試環境變數
- [ ] 已備份現有數據
- [ ] 已創建測試用戶和數據

### 遷移中
- [ ] 遷移腳本執行成功（無錯誤）
- [ ] 所有 NOTICE 訊息正常顯示
- [ ] 數據驗證通過

### 遷移後
- [ ] 表結構正確（role, added_by, created_at 欄位存在）
- [ ] 索引已創建
- [ ] RLS 政策已設置
- [ ] 輔助函數可用
- [ ] 審計日誌表已創建
- [ ] 現有數據完整（role = 'owner'）

### 功能測試
- [ ] 可以添加員工
- [ ] 員工可以查詢市集
- [ ] 老闆可以移除員工
- [ ] RLS 政策正常工作

### 回滾測試
- [ ] 回滾腳本執行成功
- [ ] 新欄位已刪除
- [ ] 約束已恢復
- [ ] 員工記錄已刪除
- [ ] 老闆記錄保留

---

## 🚨 常見問題

### 問題 1：遷移失敗 - 外鍵約束錯誤

**錯誤訊息**：
```
ERROR: insert or update on table "market_members" violates foreign key constraint
```

**解決方案**：
```sql
-- 檢查 auth.users 表是否有對應用戶
SELECT id, email FROM auth.users;

-- 如果缺少用戶，先創建用戶
```

### 問題 2：RLS 政策阻止查詢

**錯誤訊息**：
```
ERROR: new row violates row-level security policy
```

**解決方案**：
```sql
-- 暫時禁用 RLS（僅測試環境）
ALTER TABLE market_members DISABLE ROW LEVEL SECURITY;

-- 執行操作

-- 重新啟用 RLS
ALTER TABLE market_members ENABLE ROW LEVEL SECURITY;
```

### 問題 3：索引創建失敗

**錯誤訊息**：
```
ERROR: could not create unique index
```

**解決方案**：
```sql
-- 檢查是否有重複數據
SELECT user_id, role, COUNT(*)
FROM market_members
GROUP BY user_id, role
HAVING COUNT(*) > 1;

-- 刪除重複記錄
```

---

## 📞 需要幫助？

如果遇到問題：

1. 檢查 Supabase 日誌
2. 查看 `docs/EMPLOYEE_MODE_RISKS.md` 的故障排除部分
3. 執行回滾腳本恢復環境
4. 聯絡技術負責人

---

## ✅ 測試環境準備完成

完成以上步驟後，你的測試環境已準備就緒，可以開始 Phase 1.2（Dexie Schema 升級）的實作。

**下一步**：
```bash
# 開始 Phase 1.2
# 修改 lib/db/index.ts，添加 version 5
```
