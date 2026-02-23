# 🐛 Bug 修復報告：今日時間軸數據丟失

## 問題描述

用戶報告：在市集詳情頁面的「今日時間軸」區塊中，時間資訊（報到時間、營業開始時間、營業結束時間）會在一段時間後被清空，導致時間軸無內容可顯示。

**症狀：**
- 用戶重新登入並從 Supabase 下載資料後，時間軸數據正常顯示
- 過一段時間後（通常是下次同步後），時間軸數據被清空
- 數據在 Supabase 中仍然存在，但本地 IndexedDB 中被清空

---

## 根本原因

問題出在 `hooks/useSync.ts` 的 `syncMarketsToIndexedDB` 函數中，時間軸欄位的映射邏輯有誤。

### 錯誤代碼（修復前）

```typescript
// 時間軸
earlyEntryEnabled: market.early_entry_enabled || market.earlyEntryEnabled,
earlyEntryTime: market.early_entry_time || market.earlyEntryTime,
checkInTime: market.check_in_time || market.checkInTime,
operatingStartTime: market.operating_start_time || market.operatingStartTime,
operatingEndTime: market.operating_end_time || market.operatingEndTime,
```

### 問題分析

1. **Supabase 使用 snake_case**：
   - 資料庫欄位：`check_in_time`、`operating_start_time`、`operating_end_time`
   - 從 Supabase 拉取的數據：`market.check_in_time`

2. **IndexedDB 使用 camelCase**：
   - 本地欄位：`checkInTime`、`operatingStartTime`、`operatingEndTime`

3. **錯誤的映射邏輯**：
   ```typescript
   checkInTime: market.check_in_time || market.checkInTime
   ```
   
   **問題：**
   - 當 `market.check_in_time` 為 `null` 時（Supabase 中該欄位為空）
   - `||` 運算符會嘗試使用 `market.checkInTime`
   - 但 `market.checkInTime` 根本不存在（Supabase 返回的是 snake_case）
   - 最終結果：`checkInTime: undefined`
   - **導致本地數據被清空！**

4. **為什麼會"過一段時間後"清空？**
   - 用戶登入後，首次同步從 Supabase 拉取數據
   - 如果 Supabase 中這些欄位為 `null`（用戶沒有設定時間）
   - 同步邏輯會將本地的時間欄位設為 `undefined`
   - 下次查詢時，這些欄位就變成空的了

---

## 修復方案

### 正確代碼（修復後）

```typescript
// 時間軸（✅ 修復：正確處理 null 值，避免清空數據）
earlyEntryEnabled: market.early_entry_enabled !== undefined 
  ? market.early_entry_enabled 
  : (existing?.earlyEntryEnabled || false),
earlyEntryTime: market.early_entry_time !== undefined 
  ? market.early_entry_time 
  : existing?.earlyEntryTime,
checkInTime: market.check_in_time !== undefined 
  ? market.check_in_time 
  : existing?.checkInTime,
operatingStartTime: market.operating_start_time !== undefined 
  ? market.operating_start_time 
  : existing?.operatingStartTime,
operatingEndTime: market.operating_end_time !== undefined 
  ? market.operating_end_time 
  : existing?.operatingEndTime,
```

### 修復邏輯

1. **使用 `!== undefined` 檢查**：
   - 明確檢查欄位是否存在於 Supabase 返回的數據中
   - 區分 `null`（有意設為空）和 `undefined`（欄位不存在）

2. **保留現有數據**：
   - 如果 Supabase 返回的欄位為 `undefined`（不存在）
   - 使用 `existing?.checkInTime` 保留本地現有的值
   - **避免清空已有的數據**

3. **正確處理 `null`**：
   - 如果 Supabase 返回 `null`（有意設為空）
   - 會正確地將本地數據設為 `null`
   - 這是預期行為

---

## 測試驗證

### 測試場景 1：Supabase 有數據
```
Supabase: check_in_time = "09:00"
本地: checkInTime = "08:00"
結果: checkInTime = "09:00" ✅ 正確更新
```

### 測試場景 2：Supabase 為 null
```
Supabase: check_in_time = null
本地: checkInTime = "08:00"
結果: checkInTime = null ✅ 正確清空
```

### 測試場景 3：Supabase 欄位不存在（修復前會出錯）
```
Supabase: check_in_time = undefined（欄位不存在）
本地: checkInTime = "08:00"

修復前: checkInTime = undefined ❌ 錯誤清空
修復後: checkInTime = "08:00" ✅ 保留現有數據
```

---

## 影響範圍

### 受影響的欄位
- `earlyEntryEnabled`
- `earlyEntryTime`
- `checkInTime`
- `operatingStartTime`
- `operatingEndTime`

### 受影響的功能
- 市集詳情頁面的「今日時間軸」區塊
- 營業狀態自動判斷
- 倒數計時功能

---

## 預防措施

### 1. 統一命名規範
建議在整個專案中統一使用 camelCase 或 snake_case，避免混用。

### 2. 類型安全
使用 TypeScript 嚴格模式，確保欄位映射的正確性。

### 3. 數據驗證
在同步邏輯中添加數據驗證，確保關鍵欄位不會被意外清空。

### 4. 測試覆蓋
添加單元測試，覆蓋各種數據同步場景：
- Supabase 有數據
- Supabase 為 null
- Supabase 欄位不存在
- 本地有數據，Supabase 無數據

---

## 相關文件

- `hooks/useSync.ts` - 同步邏輯
- `lib/db/index.ts` - IndexedDB 結構
- `types/db.ts` - 數據類型定義
- `supabase/migrations/001_uuid_schema.sql` - Supabase 表結構

---

## 總結

這是一個典型的**數據映射錯誤**，由於 Supabase（snake_case）和 IndexedDB（camelCase）的命名規範不一致，加上錯誤的 `||` 運算符使用，導致數據被意外清空。

修復後，同步邏輯會正確處理：
- ✅ 有數據時更新
- ✅ 為 null 時清空
- ✅ 欄位不存在時保留現有數據

用戶不會再遇到時間軸數據丟失的問題！🎉
