# 執行 Supabase Migrations 指南

## 問題

當你編輯市集資料並儲存後，出現以下錯誤：

```
❌ 未知錯誤：23514 - new row for relation "events" violates check constraint "events_type_check"
```

**原因**：Supabase 的 `events` 表有一個 CHECK 約束，限制了允許的事件類型，但沒有包含新增的 `market_updated` 事件類型。

## 解決方案

需要執行兩個新的 migrations：

1. **019_add_market_updated_event.sql** - 更新 CHECK 約束，允許 `market_updated` 事件類型
2. **020_add_market_updated_trigger.sql** - 添加觸發器處理邏輯，當 `market_updated` 事件插入時自動更新 `markets` 表

## 執行步驟

### 方法 1：使用 Supabase CLI（推薦）

如果你已經安裝了 Supabase CLI：

```bash
# 1. 確保你在專案根目錄
cd e:/market2

# 2. 連接到你的 Supabase 專案
supabase link --project-ref your-project-ref

# 3. 執行 migrations
supabase db push
```

### 方法 2：使用 Supabase Dashboard（手動執行）

1. **登入 Supabase Dashboard**
   - 前往 https://supabase.com/dashboard
   - 選擇你的專案

2. **打開 SQL Editor**
   - 點擊左側選單的「SQL Editor」

3. **執行 Migration 019**
   - 點擊「New query」
   - 複製 `supabase/migrations/019_add_market_updated_event.sql` 的內容
   - 貼上到編輯器
   - 點擊「Run」執行

4. **執行 Migration 020**
   - 再次點擊「New query」
   - 複製 `supabase/migrations/020_add_market_updated_trigger.sql` 的內容
   - 貼上到編輯器
   - 點擊「Run」執行

5. **驗證執行結果**
   - 應該看到「Success. No rows returned」的訊息
   - 如果有錯誤，請檢查錯誤訊息

## 驗證 Migrations 是否成功

### 1. 檢查 CHECK 約束

在 SQL Editor 中執行：

```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'events'::regclass 
AND conname = 'events_type_check';
```

應該看到 `market_updated` 在允許的類型列表中。

### 2. 檢查觸發器函數

在 SQL Editor 中執行：

```sql
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'update_market_read_model';
```

應該看到函數中包含 `WHEN 'market_updated' THEN` 的處理邏輯。

### 3. 測試市集編輯功能

1. 在應用中編輯一個市集的時間軸
2. 點擊「儲存變更」
3. 觀察同步狀態（應該顯示「同步中...」→「已同步」）
4. 檢查 Supabase Dashboard 的 `events` 表，應該看到新的 `market_updated` 事件
5. 檢查 `markets` 表，確認資料已更新

## 如果執行失敗

### 錯誤：約束已存在

如果看到類似「constraint "events_type_check" already exists」的錯誤：

```sql
-- 先刪除舊約束
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- 然後重新執行 migration 019
```

### 錯誤：函數已存在

如果看到類似「function "update_market_read_model" already exists」的錯誤：

- 這是正常的，`CREATE OR REPLACE FUNCTION` 會自動覆蓋舊函數
- 直接執行 migration 020 即可

### 錯誤：權限不足

如果看到權限相關的錯誤：

- 確保你使用的是專案的 service_role key 或有足夠權限的帳號
- 在 Supabase Dashboard 中執行 SQL 通常有足夠的權限

## 完成後的測試

執行 migrations 後，請測試以下功能：

1. ✅ 編輯市集基本資訊（名稱、地點）
2. ✅ 編輯市集時間軸（報到時間、營業時間）
3. ✅ 編輯市集成本資訊（攤位費、設備租金）
4. ✅ 編輯市集備註
5. ✅ 檢查同步狀態（應該成功同步到 Supabase）
6. ✅ 在另一台設備登入，確認資料已同步

## 相關檔案

- `supabase/migrations/019_add_market_updated_event.sql` - 更新 CHECK 約束
- `supabase/migrations/020_add_market_updated_trigger.sql` - 添加觸發器處理邏輯
- `docs/MARKET_UPDATE_FIX.md` - 完整的修復文檔

## 注意事項

1. **執行順序**：必須先執行 019，再執行 020
2. **備份**：建議在執行前備份資料庫（Supabase Dashboard → Database → Backups）
3. **測試環境**：如果有測試環境，建議先在測試環境執行
4. **回滾**：如果需要回滾，可以刪除約束和函數，但不建議這樣做

## 常見問題

### Q: 為什麼需要兩個 migrations？

A: 
- Migration 019 更新資料庫約束，允許新的事件類型
- Migration 020 添加處理邏輯，當事件插入時自動更新資料

### Q: 執行後舊的 market_updated 事件會怎樣？

A: 如果之前有嘗試記錄 `market_updated` 事件但失敗了，這些事件不會自動重試。但執行 migrations 後，新的編輯操作會正常同步。

### Q: 需要重新部署前端嗎？

A: 不需要。前端程式碼已經修改完成，只需要執行 Supabase migrations 即可。

### Q: 如何確認 migrations 已經執行？

A: 在 Supabase Dashboard → Database → Migrations 中可以看到執行歷史。
