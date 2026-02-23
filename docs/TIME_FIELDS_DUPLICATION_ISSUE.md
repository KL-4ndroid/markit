# 時間欄位重複問題分析與解決方案

## 問題描述

在 `markets` 資料表中存在兩組幾乎相同的時間欄位：

### 第一組：`start_time` & `end_time`
```sql
start_time TIME,
end_time TIME,
```

### 第二組：`operating_start_time` & `operating_end_time`
```sql
operating_start_time TIME,
operating_end_time TIME,
```

## 問題分析

### 1. 當前使用情況

**Supabase 數據庫（PostgreSQL）：**
- ✅ 有 `start_time` & `end_time`
- ✅ 有 `operating_start_time` & `operating_end_time`
- 兩組欄位都存在

**本地 IndexedDB（TypeScript）：**
```typescript
export interface Market {
  startTime?: string;          // 開始時間（HH:mm）
  endTime?: string;            // 結束時間（HH:mm）
  operatingStartTime?: string; // 營業開始時間（HH:mm）
  operatingEndTime?: string;   // 營業結束時間（HH:mm）
}
```

**實際使用：**
- ❌ `startTime` & `endTime` - **幾乎沒有使用**
- ✅ `operatingStartTime` & `operatingEndTime` - **實際在使用**

### 2. 代碼中的使用情況

**營業狀態判斷（主要邏輯）：**
```typescript
// app/markets/[id]/page.tsx
const startTime = market.checkInTime || market.operatingStartTime;  // ✅ 使用 operatingStartTime
const endTime = market.operatingEndTime;                            // ✅ 使用 operatingEndTime

// components/markets/StaffMarketDetailView.tsx
if (market.operatingStartTime && market.operatingEndTime &&        // ✅ 使用 operating*
    currentTime >= market.operatingStartTime && 
    currentTime < market.operatingEndTime) {
  return { status: 'operating', ... };
}
```

**表單編輯：**
```typescript
// components/markets/EditMarketForm.tsx
// 只有 operatingStartTime 和 operatingEndTime 的輸入欄位
// 沒有 startTime 和 endTime 的輸入欄位
```

**時間軸顯示：**
```typescript
// 只顯示 operatingStartTime 和 operatingEndTime
// 沒有顯示 startTime 和 endTime
```

### 3. 設計初衷推測

可能的原因：

1. **早期設計遺留**：
   - `startTime` & `endTime` 可能是最初設計時的欄位
   - 後來發現需要更明確的「營業時間」概念
   - 添加了 `operatingStartTime` & `operatingEndTime`
   - 但忘記移除舊欄位

2. **語意區分嘗試**：
   - `startTime` & `endTime` - 市集整體時間（包含準備、收攤）
   - `operatingStartTime` & `operatingEndTime` - 實際營業時間
   - 但實際上這個區分並不明確，也沒有被使用

3. **向後兼容**：
   - 為了保持向後兼容而保留舊欄位
   - 但實際上沒有舊數據依賴這些欄位

## 問題影響

### 1. 程式邏輯混亂 ⚠️

**開發者困惑：**
- 不清楚應該使用哪組欄位
- 可能在不同地方使用不同的欄位
- 增加維護成本

**數據不一致風險：**
- 兩組欄位可能有不同的值
- 不清楚哪個是「正確」的值
- 可能導致營業狀態判斷錯誤

### 2. 數據庫冗餘 ⚠️

**儲存空間浪費：**
- 每個市集記錄多儲存 2 個 TIME 欄位
- 雖然空間不大，但不必要

**查詢複雜度：**
- 需要記住使用哪組欄位
- SQL 查詢可能誤用錯誤的欄位

### 3. 同步複雜度 ⚠️

**欄位轉換：**
```typescript
// 需要同時處理兩組欄位
if (updates.startTime !== undefined) snakeCaseUpdates.start_time = updates.startTime;
if (updates.endTime !== undefined) snakeCaseUpdates.end_time = updates.endTime;
if (updates.operatingStartTime !== undefined) snakeCaseUpdates.operating_start_time = updates.operatingStartTime;
if (updates.operatingEndTime !== undefined) snakeCaseUpdates.operating_end_time = updates.operatingEndTime;
```

## 解決方案

### 方案 1：移除 `start_time` & `end_time`（推薦）✅

**優點：**
- 徹底解決混亂
- 減少數據庫欄位
- 簡化代碼邏輯
- 降低錯誤風險

**缺點：**
- 需要執行 Migration
- 需要更新所有相關代碼（但實際上幾乎沒有使用）

**實施步驟：**

1. **檢查是否有數據依賴**
   ```sql
   -- 檢查是否有市集使用了 start_time 或 end_time
   SELECT COUNT(*) FROM markets 
   WHERE start_time IS NOT NULL OR end_time IS NOT NULL;
   ```

2. **創建 Migration**
   ```sql
   -- 022_remove_duplicate_time_fields.sql
   ALTER TABLE markets DROP COLUMN IF EXISTS start_time;
   ALTER TABLE markets DROP COLUMN IF EXISTS end_time;
   ```

3. **更新 TypeScript 類型**
   ```typescript
   export interface Market {
     // ❌ 移除
     // startTime?: string;
     // endTime?: string;
     
     // ✅ 保留
     operatingStartTime?: string;
     operatingEndTime?: string;
   }
   ```

4. **更新事件處理器**
   ```typescript
   // lib/db/events.ts
   // 移除 start_time 和 end_time 的處理
   ```

### 方案 2：重命名 `operating_*` 為 `start_time` & `end_time`（不推薦）❌

**優點：**
- 欄位名稱更簡潔
- 符合直覺

**缺點：**
- 需要大量代碼修改
- 可能破壞現有功能
- 風險較高

### 方案 3：保持現狀，添加文檔說明（不推薦）❌

**優點：**
- 不需要修改代碼
- 零風險

**缺點：**
- 問題依然存在
- 未來可能造成更多混亂

## 推薦方案：方案 1

### 理由

1. **實際使用情況**：
   - `startTime` & `endTime` 幾乎沒有被使用
   - 所有營業邏輯都使用 `operatingStartTime` & `operatingEndTime`
   - 移除不會影響現有功能

2. **語意清晰**：
   - `operatingStartTime` & `operatingEndTime` 語意更明確
   - 明確表示「營業時間」
   - 避免與「市集整體時間」混淆

3. **簡化維護**：
   - 減少欄位數量
   - 降低混亂風險
   - 提高代碼可讀性

## 實施計劃

### 階段 1：驗證（立即執行）

```sql
-- 在 Supabase SQL Editor 中執行
SELECT 
  COUNT(*) as total_markets,
  COUNT(start_time) as has_start_time,
  COUNT(end_time) as has_end_time,
  COUNT(operating_start_time) as has_operating_start_time,
  COUNT(operating_end_time) as has_operating_end_time
FROM markets;
```

**預期結果：**
- `has_start_time` = 0 或很少
- `has_end_time` = 0 或很少
- `has_operating_start_time` > 0
- `has_operating_end_time` > 0

### 階段 2：創建 Migration

**文件：** `supabase/migrations/022_remove_duplicate_time_fields.sql`

```sql
-- ==================== Migration 022 ====================
-- 日期：2026-02-22
-- 說明：移除重複的時間欄位（start_time & end_time）
-- 原因：與 operating_start_time & operating_end_time 重複，造成混亂

-- ==================== 備份數據（如果有的話）====================
-- 如果 start_time 或 end_time 有數據，先複製到 operating_* 欄位
UPDATE markets
SET 
  operating_start_time = COALESCE(operating_start_time, start_time),
  operating_end_time = COALESCE(operating_end_time, end_time)
WHERE 
  (start_time IS NOT NULL AND operating_start_time IS NULL)
  OR (end_time IS NOT NULL AND operating_end_time IS NULL);

-- ==================== 移除重複欄位 ====================
ALTER TABLE markets DROP COLUMN IF EXISTS start_time;
ALTER TABLE markets DROP COLUMN IF EXISTS end_time;

-- ==================== 註解 ====================
COMMENT ON COLUMN markets.operating_start_time IS '營業開始時間（HH:MM）';
COMMENT ON COLUMN markets.operating_end_time IS '營業結束時間（HH:MM）';

-- ==================== 完成 ====================
-- Migration 022 完成
-- start_time 和 end_time 已移除
-- 統一使用 operating_start_time 和 operating_end_time
```

### 階段 3：更新 TypeScript 類型

**文件：** `types/db.ts`

```typescript
export interface Market {
  // ... 其他欄位 ...
  
  // ❌ 移除這兩行
  // startTime?: string;
  // endTime?: string;
  
  // ✅ 保留這兩行（已存在）
  operatingStartTime?: string; // 營業開始時間（HH:mm）
  operatingEndTime?: string;   // 營業結束時間（HH:mm）
  
  // ... 其他欄位 ...
}

export interface MarketCreatedPayload {
  // ... 其他欄位 ...
  
  // ❌ 移除這兩行
  // startTime?: string;
  // endTime?: string;
  
  // ✅ 保留這兩行（已存在）
  operatingStartTime?: string;
  operatingEndTime?: string;
  
  // ... 其他欄位 ...
}
```

### 階段 4：更新事件處理器

**文件：** `lib/db/events.ts`

```typescript
// 在 market_created 事件處理器中
registerEventHandler('market_created', async (event: Event<MarketCreatedPayload>, db) => {
  const market: Market = {
    // ... 其他欄位 ...
    
    // ❌ 移除這兩行
    // startTime: payload.startTime,
    // endTime: payload.endTime,
    
    // ✅ 保留這兩行（已存在）
    operatingStartTime: payload.operatingStartTime,
    operatingEndTime: payload.operatingEndTime,
    
    // ... 其他欄位 ...
  };
});

// 在 market_updated 事件處理器中
registerEventHandler('market_updated', async (event, db) => {
  // ❌ 移除這兩行
  // if (updates.startTime !== undefined) snakeCaseUpdates.start_time = updates.startTime;
  // if (updates.endTime !== undefined) snakeCaseUpdates.end_time = updates.endTime;
  
  // ✅ 保留這兩行（已存在）
  if (updates.operatingStartTime !== undefined) 
    snakeCaseUpdates.operating_start_time = updates.operatingStartTime;
  if (updates.operatingEndTime !== undefined) 
    snakeCaseUpdates.operating_end_time = updates.operatingEndTime;
});
```

### 階段 5：更新同步邏輯

**文件：** `hooks/useSync.ts`

在 `market_updated` 事件的 payload 轉換中：

```typescript
// ❌ 移除這兩行
// if (updates.start_time !== undefined) camelCaseUpdates.startTime = updates.start_time;
// if (updates.end_time !== undefined) camelCaseUpdates.endTime = updates.end_time;

// ✅ 保留這兩行（已存在）
if (updates.operating_start_time !== undefined) 
  camelCaseUpdates.operatingStartTime = updates.operating_start_time;
if (updates.operating_end_time !== undefined) 
  camelCaseUpdates.operatingEndTime = updates.operating_end_time;
```

### 階段 6：測試

1. **執行 Migration**
   ```bash
   # 在 Supabase Dashboard 的 SQL Editor 中執行 Migration 022
   ```

2. **測試創建市集**
   - 創建新市集
   - 設定營業時間
   - 確認數據正確儲存

3. **測試編輯市集**
   - 編輯營業時間
   - 確認更新正確同步

4. **測試營業狀態判斷**
   - 確認營業狀態正確顯示
   - 確認互動和交易功能正常

5. **測試員工模式**
   - 確認員工端營業狀態正確
   - 確認功能正常顯示

## 預期效果

### 修改前 ❌

```typescript
// 混亂：兩組欄位
interface Market {
  startTime?: string;          // ❓ 這是什麼時間？
  endTime?: string;            // ❓ 這是什麼時間？
  operatingStartTime?: string; // ❓ 這又是什麼時間？
  operatingEndTime?: string;   // ❓ 這又是什麼時間？
}

// 開發者困惑：應該用哪個？
const time = market.startTime || market.operatingStartTime; // ❓
```

### 修改後 ✅

```typescript
// 清晰：只有一組欄位
interface Market {
  operatingStartTime?: string; // ✅ 營業開始時間
  operatingEndTime?: string;   // ✅ 營業結束時間
}

// 開發者明確：只有一個選擇
const time = market.operatingStartTime; // ✅
```

## 總結

### 問題

- ❌ 兩組重複的時間欄位造成混亂
- ❌ 不清楚應該使用哪組欄位
- ❌ 增加維護成本和錯誤風險

### 解決方案

- ✅ 移除 `start_time` & `end_time`
- ✅ 統一使用 `operating_start_time` & `operating_end_time`
- ✅ 簡化代碼邏輯，降低錯誤風險

### 優點

1. **語意清晰**：明確表示「營業時間」
2. **減少混亂**：只有一組欄位，不會搞錯
3. **簡化維護**：減少代碼複雜度
4. **降低風險**：避免使用錯誤的欄位

### 風險評估

- **風險等級**：低
- **影響範圍**：小（幾乎沒有使用 `startTime` & `endTime`）
- **回滾難度**：容易（可以重新添加欄位）

---

**建議：立即執行方案 1，移除重複欄位**

**最後更新：** 2026-02-22  
**作者：** AI Assistant (Grok)
