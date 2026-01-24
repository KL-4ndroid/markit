# 市集軟刪除同步錯誤修復

## 🐛 問題描述

刪除市集後同步時出現錯誤：

```
new row for relation "events" violates check constraint "events_type_check"
```

**原因**：Supabase 的 `events` 表有 CHECK 約束限制允許的事件類型，而 `market_deleted` 不在列表中。

---

## ✅ 解決方案

已更新 `016_market_soft_delete.sql`，在開頭添加了更新 CHECK 約束的步驟：

```sql
-- 刪除舊的 CHECK 約束
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 添加新的 CHECK 約束（包含 market_deleted）
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    'market_created',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',        -- ✅ 新增
    'product_created',
    'product_updated',
    'product_deleted',
    'interaction_recorded',
    'deal_closed'
  )
);
```

---

## 🚀 部署步驟

### 步驟 1：執行完整的 Migration

在 Supabase Dashboard 的 SQL Editor 執行：

```sql
-- 複製並執行整個 016_market_soft_delete.sql 文件
```

這個 Migration 會：
1. ✅ 更新 events 表的 CHECK 約束（添加 `market_deleted`）
2. ✅ 添加 `is_deleted` 欄位到 markets 表
3. ✅ 添加索引
4. ✅ 更新 Trigger 處理 `market_deleted` 事件

### 步驟 2：驗證約束已更新

```sql
-- 檢查 CHECK 約束
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'events'::regclass
  AND conname = 'events_type_check';

-- 應該看到 market_deleted 在列表中
```

### 步驟 3：測試刪除功能

1. 打開市集詳情頁
2. 點擊「刪除記錄」
3. 確認刪除
4. 檢查是否有同步錯誤

---

## 🧪 測試腳本

### 測試事件類型約束

```sql
-- 測試插入 market_deleted 事件（應該成功）
INSERT INTO events (id, type, payload, actor_id, timestamp)
VALUES (
  gen_random_uuid(),
  'market_deleted',
  '{"marketId": "test-uuid", "reason": "測試"}'::jsonb,
  auth.uid(),
  NOW()
);

-- 清理測試數據
DELETE FROM events WHERE payload->>'marketId' = 'test-uuid';
```

---

## 📊 Migration 執行順序

如果你已經執行過部分 Migration，建議按以下順序：

1. ✅ `001_uuid_schema.sql` - 基礎結構（已執行）
2. ✅ `002_cqrs_triggers.sql` - Trigger（已執行）
3. ✅ `003_rpc_functions.sql` - RPC 函數（已執行）
4. ✅ `004_rls_policies.sql` - RLS 政策（已執行）
5. ✅ `013_user_settings.sql` - 用戶設定（如果需要）
6. ✅ `014_products_ownership.sql` - 商品所有權（如果需要）
7. ✅ `015_fix_events_rls_policy.sql` - 修復事件 RLS（如果需要）
8. ✅ **`016_market_soft_delete.sql`** - 市集軟刪除（現在執行）

---

## ⚠️ 注意事項

### 如果已經執行過舊版本的 016

如果你之前執行過不包含 CHECK 約束更新的版本，需要：

1. 手動執行約束更新：

```sql
-- 刪除舊約束
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 添加新約束
ALTER TABLE events ADD CONSTRAINT events_type_check CHECK (
  type IN (
    'market_created',
    'market_status_changed',
    'market_started',
    'market_ended',
    'market_deleted',
    'product_created',
    'product_updated',
    'product_deleted',
    'interaction_recorded',
    'deal_closed'
  )
);
```

2. 然後繼續使用軟刪除功能

---

## 🎉 完成

執行 Migration 後，市集軟刪除功能將完全正常工作：

- ✅ 可以刪除市集記錄
- ✅ 事件可以正常同步到 Supabase
- ✅ 其他設備會自動隱藏已刪除的市集
- ✅ 數據安全保留，可以恢復

---

## 📝 相關文件

- `016_market_soft_delete.sql` - 完整的 Migration（已修復）
- `MARKET-SOFT-DELETE.md` - 功能說明
- `MARKET-SOFT-DELETE-SUMMARY.md` - 實施總結
