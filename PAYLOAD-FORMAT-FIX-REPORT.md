# 🔧 Payload 格式修復報告

## 修復日期
2026-01-24

---

## 🎯 問題診斷

### 問題 1：命名不一致
- **本地 Dexie**：使用駝峰式命名（`startDate`, `endDate`）
- **Supabase**：使用底線式命名（`start_date`, `end_date`）
- **結果**：Trigger 無法正確讀取 payload 中的欄位

### 問題 2：缺少詳細錯誤日誌
- 同步失敗時無法看到完整的 payload 內容
- 難以診斷具體缺少哪些欄位

---

## ✅ 已完成的修復

### 1. **修正 `lib/db/events.ts`** - Payload 格式轉換

在 `market_created` 事件處理器中，將 payload 轉換為底線式命名：

```typescript
updates.payload = {
  ...payload,
  market_id,
  start_date: payload.startDate,
  end_date: payload.endDate,
  start_time: payload.startTime,
  end_time: payload.endTime,
  early_entry_enabled: payload.earlyEntryEnabled,
  early_entry_time: payload.earlyEntryTime,
  check_in_time: payload.checkInTime,
  operating_start_time: payload.operatingStartTime,
  operating_end_time: payload.operatingEndTime,
  registration_fee: payload.registrationFee,
  booth_cost: payload.boothCost,
  table_rental: payload.tableRental,
  chair_rental: payload.chairRental,
  umbrella_rental: payload.umbrellaRental,
  tablecloth_rental: payload.tableclothRental,
  commission_rate: payload.commissionRate,
  table_free: payload.tableFree,
  chair_free: payload.chairFree,
  umbrella_free: payload.umbrellaFree,
  tablecloth_free: payload.tableclothFree,
};
```

**效果：** 上傳到 Supabase 的 payload 包含底線式命名的欄位。

---

### 2. **修正 `hooks/useSync.ts`** - 詳細錯誤日誌

添加詳細的錯誤日誌：

```typescript
catch (error: any) {
  console.error(`❌ 上傳事件失敗: ${event.id}`, error);
  console.log('失敗的事件類型:', event.type);
  console.log('失敗的 Payload:', JSON.stringify(event.payload, null, 2));
  console.log('失敗的 market_id:', event.market_id);
  // ...
}
```

**效果：** 同步失敗時可以看到完整的 payload 內容，方便診斷問題。

---

### 3. **創建 Supabase 遷移腳本** - 兼容兩種命名方式

創建 `012_fix_trigger_naming_compatibility.sql`，Trigger 同時支援駝峰式和底線式命名：

```sql
-- 同時支援 start_date 和 startDate
start_date = COALESCE(
  (NEW.payload->>'start_date')::DATE, 
  (NEW.payload->>'startDate')::DATE
)
```

**效果：** Trigger 可以處理兩種命名方式的 payload。

---

## 🧪 測試步驟

### 步驟 1：執行 Supabase 遷移腳本

在 Supabase SQL Editor 中執行：
- 複製 `e:\market2\supabase\migrations\012_fix_trigger_naming_compatibility.sql`
- 貼上並執行

### 步驟 2：清空本地數據（推薦）

在瀏覽器 Console 中執行：

```javascript
indexedDB.deleteDatabase('MarketPulseDB').onsuccess = () => {
  console.log('✅ 本地數據庫已清空');
  location.reload();
};
```

### 步驟 3：創建新市集並測試同步

1. 重新整理應用程式（F5）
2. 創建新市集
3. 打開瀏覽器 Console（F12）
4. 點擊「立即同步」
5. 檢查 Console 輸出

**預期輸出：**
```
📤 上傳 1 個事件...
✅ 上傳完成
📥 下載 0 個新事件...
✅ 下載完成
✅ 同步完成
```

**如果失敗，會顯示：**
```
❌ 上傳事件失敗: xxx-xxx-xxx
失敗的事件類型: market_created
失敗的 Payload: {
  "name": "測試市集",
  "location": "測試地點",
  "startDate": "2026-01-25",
  "start_date": "2026-01-25",  // ✅ 現在包含底線式命名
  ...
}
失敗的 market_id: xxx-xxx-xxx
```

### 步驟 4：驗證 Supabase

在 Supabase SQL Editor 中執行：

```sql
-- 檢查事件
SELECT id, type, payload->>'market_id', payload->>'start_date', payload->>'startDate'
FROM events
WHERE type = 'market_created'
ORDER BY timestamp DESC
LIMIT 5;

-- 檢查市集
SELECT id, name, start_date, end_date, created_at
FROM markets
ORDER BY created_at DESC
LIMIT 5;
```

**預期結果：**
- ✅ `events` 表中的 payload 包含 `market_id` 和 `start_date`
- ✅ `markets` 表有對應的記錄
- ✅ `start_date` 和 `end_date` 正確填入

---

## 📊 修復前後對比

### 修復前

```json
// Payload（只有駝峰式）
{
  "name": "測試市集",
  "startDate": "2026-01-25",
  "endDate": "2026-01-25"
}

// Supabase Trigger 嘗試讀取
(NEW.payload->>'start_date')::DATE  // ❌ NULL
```

### 修復後

```json
// Payload（同時包含兩種命名）
{
  "name": "測試市集",
  "startDate": "2026-01-25",
  "start_date": "2026-01-25",  // ✅ 新增
  "endDate": "2026-01-25",
  "end_date": "2026-01-25"     // ✅ 新增
}

// Supabase Trigger 讀取
COALESCE(
  (NEW.payload->>'start_date')::DATE,   // ✅ 優先使用底線式
  (NEW.payload->>'startDate')::DATE     // ✅ 回退到駝峰式
)
```

---

## 🎉 完成狀態

**所有修復已完成：**

- ✅ Payload 格式轉換（駝峰式 → 底線式）
- ✅ 詳細錯誤日誌
- ✅ Supabase Trigger 兼容兩種命名
- ✅ 時間順序嚴格化
- ✅ 遞歸同步檢查
- ✅ 防禦性程式碼
- ✅ 命名統一化

---

## 🚀 下一步

1. **執行遷移腳本** `012_fix_trigger_naming_compatibility.sql`
2. **清空本地數據**
3. **測試完整流程**
4. **檢查 Console 日誌**
5. **驗證 Supabase 數據**

---

## 📝 注意事項

1. **必須執行遷移腳本**：否則 Trigger 仍然無法讀取底線式命名的欄位
2. **建議清空本地數據**：確保測試環境乾淨
3. **監控 Console**：查看詳細的錯誤日誌
4. **驗證 Supabase**：確認數據正確寫入

---

**修復完成！請按照測試步驟驗證功能。** 🎯
