# 階段 2: Supabase 資料庫設置 - 執行指南

> **預計時間：** 30-60 分鐘  
> **難度：** ⭐⭐ 簡單  
> **狀態：** 🟡 準備執行

---

## 📋 概述

本階段將在 Supabase 中創建所有資料表、Trigger、RPC 函數和 RLS 政策。

### 🎯 目標
- ✅ 創建 UUID 版本的資料表結構
- ✅ 設置 CQRS Trigger（自動更新讀取模型）
- ✅ 創建 RPC 函數（邀請碼、團隊管理）
- ✅ 設置 RLS 政策（資料安全）

---

## 📝 已生成的 SQL 腳本

我已經為你生成了 4 個 SQL 遷移腳本：

1. **`supabase/migrations/001_uuid_schema.sql`** (約 200 行)
   - 創建所有資料表（UUID 主鍵）
   - 設置索引和約束
   - 添加註解

2. **`supabase/migrations/002_cqrs_triggers.sql`** (約 180 行)
   - Market 讀取模型 Trigger
   - Product 讀取模型 Trigger
   - 自動更新統計資訊

3. **`supabase/migrations/003_rpc_functions.sql`** (約 250 行)
   - `join_market_by_code()` - 使用邀請碼加入
   - `generate_invite_code()` - 生成邀請碼
   - `remove_team_member()` - 移除成員
   - `get_market_members()` - 獲取成員列表

4. **`supabase/migrations/004_rls_policies.sql`** (約 200 行)
   - 所有資料表的 RLS 政策
   - 權限檢查函數
   - 安全性設置

---

## 🚀 執行步驟

### 步驟 1: 登入 Supabase Dashboard

1. 前往：https://supabase.com/dashboard
2. 選擇你的專案：`market-pulse-collab`

### 步驟 2: 打開 SQL Editor

1. 點擊左側選單的 **SQL Editor**
2. 點擊 **New Query**

### 步驟 3: 執行 SQL 腳本（按順序）

#### 3.1 執行 001_uuid_schema.sql

1. 打開 `e:\market2\supabase\migrations\001_uuid_schema.sql`
2. **複製全部內容**（Ctrl+A, Ctrl+C）
3. 在 SQL Editor 中**貼上**（Ctrl+V）
4. 點擊 **Run** 或按 **Ctrl+Enter**
5. 等待執行完成（約 5-10 秒）

**預期結果：**
```
Success. No rows returned
```

**如果出現錯誤：**
- 複製錯誤訊息告訴我
- 不要繼續執行下一個腳本

#### 3.2 執行 002_cqrs_triggers.sql

1. 打開 `e:\market2\supabase\migrations\002_cqrs_triggers.sql`
2. **複製全部內容**
3. 在 SQL Editor 中**貼上**（建議新建一個 Query）
4. 點擊 **Run**
5. 等待執行完成

**預期結果：**
```
Success. No rows returned
```

#### 3.3 執行 003_rpc_functions.sql

1. 打開 `e:\market2\supabase\migrations\003_rpc_functions.sql`
2. **複製全部內容**
3. 在 SQL Editor 中**貼上**
4. 點擊 **Run**
5. 等待執行完成

**預期結果：**
```
Success. No rows returned
```

#### 3.4 執行 004_rls_policies.sql

1. 打開 `e:\market2\supabase\migrations\004_rls_policies.sql`
2. **複製全部內容**
3. 在 SQL Editor 中**貼上**
4. 點擊 **Run**
5. 等待執行完成

**預期結果：**
```
Success. No rows returned
```

---

## ✅ 驗證安裝

### 驗證 1: 檢查資料表

1. 點擊左側選單的 **Table Editor**
2. 你應該會看到以下資料表：
   - ✅ `profiles`
   - ✅ `markets`
   - ✅ `products`
   - ✅ `market_members`
   - ✅ `market_invitations`
   - ✅ `events`

### 驗證 2: 檢查 RPC 函數

1. 點擊左側選單的 **Database** → **Functions**
2. 你應該會看到：
   - ✅ `join_market_by_code`
   - ✅ `generate_invite_code`
   - ✅ `remove_team_member`
   - ✅ `get_market_members`
   - ✅ `check_user_market_permission`

### 驗證 3: 檢查 Trigger

1. 在 SQL Editor 中執行：
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

2. 你應該會看到：
   - ✅ `trigger_update_market_read_model` on `events`
   - ✅ `trigger_update_product_read_model` on `events`
   - ✅ `update_profiles_updated_at` on `profiles`
   - ✅ `update_markets_updated_at` on `markets`
   - ✅ `update_products_updated_at` on `products`

---

## 🧪 測試資料庫

### 測試 1: 測試 Trigger（可選）

在 SQL Editor 中執行：

```sql
-- 插入測試事件
INSERT INTO events (
  id,
  type,
  payload,
  actor_id,
  market_id,
  timestamp
) VALUES (
  uuid_generate_v4(),
  'market_created',
  '{"name": "測試市集", "location": "台北", "startDate": "2026-02-01", "endDate": "2026-02-01", "registrationFee": 500, "boothCost": 1000}'::jsonb,
  (SELECT id FROM auth.users LIMIT 1), -- 需要先有用戶
  uuid_generate_v4(),
  NOW()
);

-- 檢查 markets 表是否自動新增
SELECT * FROM markets ORDER BY created_at DESC LIMIT 1;
```

**如果沒有用戶，先跳過這個測試。**

---

## ⚠️ 常見問題

### 問題 1: "relation already exists"

**原因：** 資料表已經存在

**解決方案：**
```sql
-- 刪除所有資料表（⚠️ 危險操作！）
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS market_invitations CASCADE;
DROP TABLE IF EXISTS market_members CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS markets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 然後重新執行 001_uuid_schema.sql
```

### 問題 2: "function already exists"

**原因：** 函數已經存在

**解決方案：**
腳本中已經使用 `CREATE OR REPLACE FUNCTION`，應該不會出現此問題。如果出現，請告訴我。

### 問題 3: "permission denied"

**原因：** 權限不足

**解決方案：**
確保你使用的是專案的 Owner 帳號登入。

---

## 📊 完成檢查清單

執行完成後，請確認：

- [ ] ✅ 所有 4 個 SQL 腳本都執行成功
- [ ] ✅ Table Editor 中可以看到 6 個資料表
- [ ] ✅ Database → Functions 中可以看到 5 個函數
- [ ] ✅ 沒有錯誤訊息

---

## 🎉 完成！

當所有檢查都通過後，請告訴我：

**"階段 2 完成"** 或 **"Supabase 資料庫設置完成"**

我會為你準備**階段 3：Supabase 客戶端整合**！🚀

---

## 📞 需要協助？

如果遇到任何問題：
1. 複製完整的錯誤訊息
2. 告訴我你執行到哪一步
3. 截圖（如果有的話）

我會立即協助你解決！😊
