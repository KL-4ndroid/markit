# Migration 022 風險評估與執行指南

## 問題分析

### 錯誤訊息
```
ERROR: 2BP01: cannot drop column start_time of table markets because other objects depend on it
DETAIL: view staff_accessible_markets depends on column start_time of table markets
HINT: Use DROP ... CASCADE to drop the dependent objects too.
```

### 根本原因

`staff_accessible_markets` 視圖使用了 `SELECT m.*`，這會包含 `markets` 表的所有欄位，包括：
- `start_time` ❌
- `end_time` ❌
- `operating_start_time` ✅
- `operating_end_time` ✅

當我們嘗試刪除 `start_time` 和 `end_time` 時，PostgreSQL 檢測到視圖依賴這些欄位，因此拒絕刪除。

## 解決方案

### 方案對比

#### 方案 1：使用 CASCADE（不推薦）❌

```sql
ALTER TABLE markets DROP COLUMN start_time CASCADE;
ALTER TABLE markets DROP COLUMN end_time CASCADE;
```

**優點：**
- 簡單快速

**缺點：**
- 會刪除所有依賴的視圖
- 需要手動重建視圖
- 風險較高，可能遺漏某些視圖

#### 方案 2：先更新視圖，再刪除欄位（推薦）✅

```sql
-- 1. 重建視圖，明確列出欄位（排除 start_time 和 end_time）
DROP VIEW IF EXISTS staff_accessible_markets CASCADE;
CREATE OR REPLACE VIEW staff_accessible_markets AS
SELECT 
  m.id,
  m.owner_id,
  m.name,
  -- ... 明確列出所有需要的欄位 ...
  m.operating_start_time,  -- ✅ 保留
  m.operating_end_time,    -- ✅ 保留
  -- ❌ 不包含 m.start_time
  -- ❌ 不包含 m.end_time
  ...
FROM markets m
...

-- 2. 刪除欄位
ALTER TABLE markets DROP COLUMN start_time;
ALTER TABLE markets DROP COLUMN end_time;
```

**優點：**
- 安全可控
- 明確知道哪些視圖被更新
- 可以驗證每一步

**缺點：**
- 需要明確列出所有欄位（較繁瑣）

## 風險評估

### 風險等級：低 ✅

### 影響範圍

1. **數據庫結構**
   - `markets` 表：移除 2 個欄位
   - `staff_accessible_markets` 視圖：重建
   - `staff_accessible_products` 視圖：重建（預防性）

2. **數據安全**
   - ✅ 所有數據已備份到 `operating_start_time` 和 `operating_end_time`
   - ✅ 沒有數據丟失風險

3. **功能影響**
   - ✅ 前端代碼不使用 `start_time` 和 `end_time`
   - ✅ 所有邏輯都使用 `operating_start_time` 和 `operating_end_time`
   - ✅ 視圖重建後功能完全相同

### 依賴關係

```
markets 表
  ├── start_time (要刪除) ❌
  ├── end_time (要刪除) ❌
  ├── operating_start_time (保留) ✅
  └── operating_end_time (保留) ✅
       │
       └── staff_accessible_markets 視圖
            └── 使用 m.* (包含所有欄位)
                 └── 需要重建，明確列出欄位
```

## 執行步驟

### 步驟 1：備份當前狀態（可選但推薦）

```sql
-- 在 Supabase SQL Editor 中執行
-- 檢查當前視圖定義
SELECT definition 
FROM pg_views 
WHERE viewname = 'staff_accessible_markets';

-- 檢查是否有數據使用舊欄位
SELECT 
  COUNT(*) as total_markets,
  COUNT(start_time) as has_start_time,
  COUNT(end_time) as has_end_time,
  COUNT(operating_start_time) as has_operating_start_time,
  COUNT(operating_end_time) as has_operating_end_time
FROM markets;
```

**預期結果：**
- `has_start_time` = 0（或很少）
- `has_end_time` = 0（或很少）
- `has_operating_start_time` > 0
- `has_operating_end_time` > 0

### 步驟 2：執行 Migration 022（修正版）

在 Supabase Dashboard 的 SQL Editor 中執行修正版的 Migration 022。

**執行過程會顯示：**
```
🔍 Migration 022 風險評估
📊 數據統計
📦 步驟 1/4：備份數據
🔧 步驟 2/4：重建視圖
🗑️ 步驟 3/4：移除重複欄位
📝 步驟 4/4：更新註解
🔍 驗證結果
🎉 Migration 022 完成
```

### 步驟 3：驗證結果

```sql
-- 1. 檢查欄位是否已移除
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'markets' 
AND column_name IN ('start_time', 'end_time', 'operating_start_time', 'operating_end_time')
ORDER BY column_name;

-- 預期結果：只有 operating_start_time 和 operating_end_time

-- 2. 檢查視圖是否正常
SELECT * FROM staff_accessible_markets LIMIT 1;

-- 預期結果：正常返回數據，沒有錯誤

-- 3. 檢查視圖欄位
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'staff_accessible_markets'
AND column_name IN ('start_time', 'end_time', 'operating_start_time', 'operating_end_time')
ORDER BY column_name;

-- 預期結果：只有 operating_start_time 和 operating_end_time
```

### 步驟 4：測試功能

1. **老闆模式測試**
   - 創建新市集 → 設定營業時間 → 確認儲存成功
   - 編輯市集 → 修改營業時間 → 確認更新成功
   - 查看市集詳情 → 確認營業狀態判斷正確

2. **員工模式測試**
   - 查看市集列表 → 確認能看到市集
   - 進入市集詳情 → 確認營業狀態正確
   - 確認互動和交易功能正常

## 回滾計劃

如果執行後發現問題，可以執行回滾腳本（已包含在 Migration 文件末尾）：

```sql
-- 1. 重新添加欄位
ALTER TABLE markets ADD COLUMN start_time TIME;
ALTER TABLE markets ADD COLUMN end_time TIME;

-- 2. 複製數據
UPDATE markets
SET 
  start_time = operating_start_time,
  end_time = operating_end_time;

-- 3. 重建視圖（使用 m.*）
-- ... (完整腳本見 Migration 文件)
```

## 常見問題

### Q1: 為什麼不直接使用 CASCADE？

**A:** CASCADE 會自動刪除所有依賴的對象，但：
- 我們不知道還有哪些對象依賴這些欄位
- 刪除後需要手動重建，容易遺漏
- 風險較高，不可控

明確重建視圖更安全可控。

### Q2: 如果有其他視圖也依賴這些欄位怎麼辦？

**A:** 執行 Migration 時會報錯，我們可以：
1. 查看錯誤訊息，找出依賴的視圖
2. 更新 Migration，添加該視圖的重建邏輯
3. 重新執行

目前已知的依賴：
- `staff_accessible_markets` ✅ 已處理
- `staff_accessible_products` ✅ 已處理（預防性）

### Q3: 會影響現有數據嗎？

**A:** 不會。Migration 會：
1. 先備份數據到 `operating_*` 欄位
2. 然後才刪除舊欄位
3. 所有數據都保留在 `operating_start_time` 和 `operating_end_time`

### Q4: 前端代碼需要修改嗎？

**A:** 不需要。前端代碼已經在使用 `operatingStartTime` 和 `operatingEndTime`，沒有使用 `startTime` 和 `endTime`。

### Q5: 如果執行失敗怎麼辦？

**A:** Migration 使用了事務（transaction），如果任何步驟失敗：
- 所有變更會自動回滾
- 數據庫狀態恢復到執行前
- 不會有部分完成的情況

## 執行檢查清單

執行前確認：
- [ ] 已閱讀風險評估
- [ ] 已備份當前視圖定義（可選）
- [ ] 已檢查數據統計
- [ ] 確認沒有其他依賴

執行中：
- [ ] 觀察執行過程的日誌輸出
- [ ] 確認每個步驟都顯示 ✅

執行後：
- [ ] 驗證欄位已移除
- [ ] 驗證視圖正常工作
- [ ] 測試老闆模式功能
- [ ] 測試員工模式功能

## 總結

### 安全性評估

- **數據安全**：✅ 高（有備份，不會丟失數據）
- **功能影響**：✅ 無（前端不使用舊欄位）
- **回滾難度**：✅ 低（有完整回滾腳本）
- **執行風險**：✅ 低（使用事務，失敗自動回滾）

### 建議

**立即執行修正版 Migration 022** ✅

這是一個安全、可控、低風險的操作，能夠：
- 徹底解決欄位重複問題
- 簡化程式邏輯
- 降低未來的錯誤風險
- 提高代碼可維護性

---

**最後更新：** 2026-02-22  
**作者：** AI Assistant (Grok)
