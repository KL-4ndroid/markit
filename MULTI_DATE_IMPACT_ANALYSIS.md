# 多選日期功能 - 影響分析報告

## 📊 現況分析

### 當前資料結構
```typescript
interface Market {
  startDate: string;  // 單一開始日期 (YYYY-MM-DD)
  endDate: string;    // 單一結束日期 (YYYY-MM-DD)
}
```

### 目標資料結構
```typescript
interface Market {
  dates: string[];    // 日期陣列 ['2024-02-15', '2024-02-16', '2024-02-17']
  // 保留 startDate 和 endDate 作為最早和最晚日期（向後兼容）
  startDate: string;  // dates 中的最早日期
  endDate: string;    // dates 中的最晚日期
}
```

---

## 🔍 影響範圍分析

### 1. **資料庫層 (Database Layer)**

#### 影響文件：
- `types/db.ts` - 類型定義
- `lib/db/index.ts` - 資料庫 Schema
- `lib/db/events.ts` - 事件處理器
- `lib/db/hooks.ts` - React Hooks

#### 需要修改的地方：

**A. 類型定義 (`types/db.ts`)**
```typescript
// 修改前
export interface Market {
  startDate: string;
  endDate: string;
}

// 修改後
export interface Market {
  dates?: string[];           // ✅ 新增：日期陣列（可選，向後兼容）
  startDate: string;          // 保留：最早日期
  endDate: string;            // 保留：最晚日期
}

export interface MarketCreatedPayload {
  dates?: string[];           // ✅ 新增
  startDate: string;          // 保留
  endDate: string;            // 保留
}
```

**B. 資料庫 Schema (`lib/db/index.ts`)**
```typescript
markets: '&id, name, location, startDate, endDate, status, owner_id, createdAt, updatedAt, isDeleted',
// 需要添加 dates 欄位（但不需要索引）
```

**C. 事件處理器 (`lib/db/events.ts`)**
- `market_created` 處理器需要處理 `dates` 欄位
- 自動計算 `startDate` 和 `endDate`（取最早和最晚）

---

### 2. **UI 組件層 (UI Components)**

#### 影響文件：
- `components/markets/AddMarketForm.tsx` - 新增市集表單 ⚠️ **重點**
- `components/markets/EditMarketForm.tsx` - 編輯市集表單 ⚠️ **重點**
- `components/markets/MarketCard.tsx` - 市集卡片顯示
- `app/markets/[id]/page.tsx` - 市集詳情頁

#### 需要修改的地方：

**A. 新增市集表單**
- 替換 `DatePicker` 為新的 `DateMultiPicker`
- 顯示選中的日期（智能合併格式）
- 表單驗證邏輯調整

**B. 編輯市集表單**
- 同上

**C. 市集卡片**
- 日期顯示邏輯調整（智能合併）
- 保持現有的日期範圍顯示邏輯

**D. 市集詳情頁**
- 日期顯示調整
- 每日統計功能已經支持（按 `date` 查詢）

---

### 3. **日期選擇器組件 (DatePicker)**

#### 影響文件：
- `lib/date-time-picker/DateTimePicker.js` - 核心邏輯 ⚠️ **重點**
- `components/ui/DatePicker.tsx` - React 包裝器
- `lib/date-time-picker/DateTimePicker.css` - 樣式

#### 需要新增：
- 多選模式支持
- 選中狀態管理
- 確認/取消按鈕（已有，但需要調整邏輯）

---

### 4. **工具函數 (Utilities)**

#### 影響文件：
- `lib/utils.ts` - 格式化函數

#### 需要新增：
```typescript
/**
 * 智能合併日期顯示
 * 例：['2024-02-15', '2024-02-16', '2024-02-17', '2024-02-22', '2024-02-23']
 * 輸出：'2024-02-15~17, 2024-02-22~23'
 */
export function formatDateRanges(dates: string[]): string;
```

---

## ⚠️ 風險評估

### 高風險區域

#### 1. **資料遷移**
**風險等級**: 🔴 **高**

**問題**：
- 現有市集資料只有 `startDate` 和 `endDate`
- 需要生成 `dates` 陣列（填充連續日期）

**解決方案**：
```typescript
// 自動遷移邏輯
function migrateMarketDates(market: Market): Market {
  if (!market.dates || market.dates.length === 0) {
    // 生成連續日期陣列
    market.dates = generateDateRange(market.startDate, market.endDate);
  }
  return market;
}
```

**測試計劃**：
- 在開發環境測試遷移邏輯
- 備份現有資料
- 提供回滾機制

---

#### 2. **向後兼容性**
**風險等級**: 🟡 **中**

**問題**：
- 舊代碼可能只讀取 `startDate` 和 `endDate`
- 新代碼需要同時支持兩種格式

**解決方案**：
```typescript
// 統一的日期獲取函數
function getMarketDates(market: Market): string[] {
  if (market.dates && market.dates.length > 0) {
    return market.dates;
  }
  // 降級：生成連續日期
  return generateDateRange(market.startDate, market.endDate);
}
```

---

#### 3. **UI 顯示邏輯**
**風險等級**: 🟢 **低**

**問題**：
- 日期顯示可能過長
- 需要智能合併顯示

**解決方案**：
- 實作 `formatDateRanges()` 函數
- 提供展開/折疊功能（如果日期過多）

---

## 📋 實作計劃

### 階段一：基礎設施（不影響現有功能）

**目標**：添加新欄位和工具函數，但不修改現有邏輯

1. ✅ 修改類型定義（添加可選的 `dates` 欄位）
2. ✅ 添加工具函數（`formatDateRanges`, `generateDateRange`）
3. ✅ 添加資料遷移邏輯（自動執行，不影響現有資料）

**測試**：
- 確認現有功能正常運作
- 確認遷移邏輯正確

---

### 階段二：DatePicker 改進（獨立功能）

**目標**：修復 Bug 並添加多選模式

1. ✅ 修復切換月份關閉的 Bug
2. ✅ 電腦版改為置中顯示
3. ✅ 添加多選模式（`mode: 'multiple'`）
4. ✅ 創建 `DateMultiPicker` React 組件

**測試**：
- 單選模式正常運作（不影響現有功能）
- 多選模式正確運作

---

### 階段三：表單整合（逐步替換）

**目標**：在表單中使用新的多選功能

1. ✅ 修改 `AddMarketForm` 使用 `DateMultiPicker`
2. ✅ 修改 `EditMarketForm` 使用 `DateMultiPicker`
3. ✅ 更新事件處理器處理 `dates` 欄位

**測試**：
- 新增市集功能正常
- 編輯市集功能正常
- 資料正確保存

---

### 階段四：顯示優化（視覺改進）

**目標**：優化日期顯示

1. ✅ 更新 `MarketCard` 日期顯示
2. ✅ 更新市集詳情頁日期顯示
3. ✅ 確保每日統計功能正常

**測試**：
- 日期顯示正確
- 每日統計正確

---

## 🔄 資料遷移策略

### 自動遷移（推薦）

```typescript
// 在應用啟動時自動執行
async function autoMigrateDates() {
  const markets = await db.markets.toArray();
  
  for (const market of markets) {
    if (!market.dates || market.dates.length === 0) {
      const dates = generateDateRange(market.startDate, market.endDate);
      await db.markets.update(market.id!, { dates });
      console.log(`✅ 遷移市集: ${market.name} (${dates.length} 天)`);
    }
  }
}
```

### 手動遷移（備用）

提供一個設定頁面的「資料遷移」按鈕，讓用戶手動觸發。

---

## ✅ 安全檢查清單

在每個階段完成後，確認以下項目：

- [ ] 現有市集資料完整無損
- [ ] 新增市集功能正常
- [ ] 編輯市集功能正常
- [ ] 市集列表顯示正常
- [ ] 市集詳情頁顯示正常
- [ ] 每日統計功能正常
- [ ] 收入/成交記錄正常
- [ ] 資料庫查詢性能正常
- [ ] 沒有 TypeScript 錯誤
- [ ] 沒有 Console 錯誤

---

## 🎯 總結

### 優點
✅ 功能更靈活（支持不連續日期）
✅ 向後兼容（保留 startDate/endDate）
✅ 分階段實作（降低風險）
✅ 自動遷移（用戶無感知）

### 風險
⚠️ 資料遷移需要謹慎測試
⚠️ 需要確保所有顯示邏輯正確更新
⚠️ 需要充分測試向後兼容性

### 建議
💡 先在開發環境完整測試
💡 備份現有資料
💡 分階段部署，每階段充分測試
💡 保留回滾機制
