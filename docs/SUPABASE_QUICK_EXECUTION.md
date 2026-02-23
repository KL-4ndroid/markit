# Supabase Dashboard 執行快速指南

## 🚀 5 步驟執行遷移

### 步驟 1：打開 Supabase Dashboard
- 訪問：https://supabase.com/dashboard
- 登入你的帳號
- 選擇你的專案

### 步驟 2：進入 SQL Editor
- 左側選單點擊 **SQL Editor**
- 或點擊 **New query** 按鈕

### 步驟 3：複製遷移代碼
- 打開檔案：`supabase/migrations/20240220_add_staff_roles.sql`
- 全選（Ctrl + A）
- 複製（Ctrl + C）

### 步驟 4：貼上並執行
- 在 SQL Editor 中貼上（Ctrl + V）
- 點擊右下角綠色的 **Run** 按鈕
- 或按 Ctrl + Enter

### 步驟 5：確認成功
- 查看底部 Results 面板
- 應該看到：
  ```
  ✅ 遷移完成！
  總成員數：X
  老闆數：X
  員工數：0
  ```

---

## ✅ 驗證步驟

執行成功後，在 SQL Editor 執行以下查詢驗證：

### 1. 檢查新欄位
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'market_members'
AND column_name IN ('role', 'added_by', 'created_at');
```
應該返回 3 筆記錄。

### 2. 檢查視圖
```sql
SELECT table_name 
FROM information_schema.views 
WHERE table_name LIKE '%staff_view';
```
應該返回 2 筆記錄：
- markets_staff_view
- products_staff_view

### 3. 檢查函數
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_user_role',
  'is_staff',
  'cleanup_old_audit_logs'
);
```
應該返回 3 筆記錄。

---

## ⚠️ 常見問題

### Q: 執行時間很長？
A: 正常！腳本有 500+ 行，需要 10-30 秒。

### Q: 看到很多 NOTICE？
A: 正常！這些是執行日誌，顯示進度。

### Q: 執行失敗？
A: 
1. 查看紅色錯誤訊息
2. 確認你是專案 Owner
3. 確認代碼完整複製
4. 可執行回滾腳本恢復

---

## 🔄 如果需要回滾

1. 打開 `supabase/migrations/20240220_rollback_staff_roles.sql`
2. 複製全部內容
3. 在 SQL Editor 貼上並執行
4. 確認看到 "✅ 回滾完成！"

---

## 📞 需要幫助？

- 完整指南：`docs/SUPABASE_EXECUTION_GUIDE.md`
- 測試環境：`docs/TEST_ENVIRONMENT_SETUP.md`
- 快速開始：`docs/QUICK_START.md`

---

**準備好了嗎？開始執行吧！** 🚀
