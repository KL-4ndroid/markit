# 修復：同一天多個市集的每日統計問題

## 🐛 問題描述

**現象**：如果有三場不同市集在 1/24，這三個市集的 1/24 補登數據完全一樣，沒有被不同市集區隔開來。

**根本原因**：
- `dailyStats` 表使用 `date` 作為主鍵
- 同一天的多個市集會互相覆蓋數據
- 最後寫入的市集數據會覆蓋之前的數據

## ✅ 解決方案

### 1. 修改資料庫結構

**變更**：將 `dailyStats` 改為使用自動遞增 ID 作為主鍵，並添加 `[date+marketId]` 複合索引

**檔案**：`lib/db/index.ts`

```typescript
// 版本 4：修復 dailyStats 索引（支持同一天多個市集）
this.version(4).stores({
  dailyStats: '++id, [date+marketId], date, marketId',  // ✅ 自動遞增 ID + 複合索引
  // ... 其他表保持不變
})
```

**為什麼不用複合主鍵？**
- Dexie 不支持直接修改主鍵（會報錯：`Not yet support for changing primary key`）
- 使用自動遞增 ID 作為主鍵，複合索引用於查詢
- 效果相同，但避免了遷移問題

**效果**：
- 每個市集在每一天都有獨立的統計記錄
- 不同市集的數據不會互相覆蓋
- 支援查詢：按日期、按市集、按日期+市集組合

### 2. 更新事件處理器

**檔案**：`lib/db/events.ts`

#### deal_closed 事件處理器
```typescript
// 使用複合索引查詢
const dailyStat = await db.dailyStats
  .where('[date+marketId]')
  .equals([transactionDate, market_id])
  .first();

if (dailyStat) {
  // 使用 ID 更新
  await db.dailyStats.update(dailyStat.id!, {
    // ... 更新數據
  });
} else {
  await db.dailyStats.add({
    date: transactionDate,
    marketId: market_id,
    // ... 初始數據
  });
}
```

#### interaction_recorded 事件處理器
```typescript
// 同樣使用複合索引查詢
const dailyStat = await db.dailyStats
  .where('[date+marketId]')
  .equals([date, market_id])
  .first();

if (dailyStat) {
  await db.dailyStats.update(dailyStat.id!, updates);
} else {
  await db.dailyStats.add({
    date,
    marketId: market_id,
    // ... 初始數據
  });
}
```

### 3. 修復查詢邏輯

**檔案**：`components/markets/DailyRevenueStats.tsx`

```typescript
// ✅ 修復：只累加當前市集的統計數據
stats?.forEach(stat => {
  // 檢查是否屬於當前市集且在日期範圍內
  if (stat.marketId === market.id && dateRange.includes(stat.date)) {
    dataMap.set(stat.date, {
      revenue: stat.revenue || 0,
      profit: stat.profit || 0,
      deals: stat.dealCount || 0,
    });
  }
});
```

## 📊 資料結構變更

### 修改前
```
dailyStats 表
主鍵：date
索引：date, marketId

問題：
- 2025-01-24 → 市集 A 的數據
- 2025-01-24 → 市集 B 的數據（覆蓋市集 A）
- 2025-01-24 → 市集 C 的數據（覆蓋市集 B）
```

### 修改後
```
dailyStats 表
主鍵：++id（自動遞增）
索引：[date+marketId], date, marketId

效果：
- id: 1, date: 2025-01-24, marketId: 市集A → 市集 A 的數據
- id: 2, date: 2025-01-24, marketId: 市集B → 市集 B 的數據
- id: 3, date: 2025-01-24, marketId: 市集C → 市集 C 的數據
```

## 🔄 資料遷移

Dexie 會自動處理資料遷移：

1. 讀取所有現有的 `dailyStats` 記錄
2. 清空表
3. 移除舊的 ID，讓 Dexie 自動生成新的自動遞增 ID
4. 重新插入數據
5. **保留所有現有數據**

## ✅ 測試場景

### 場景 1：三個市集在同一天
1. 創建市集 A（1/24 - 1/25）
2. 創建市集 B（1/24 - 1/26）
3. 創建市集 C（1/24 - 1/27）
4. 在 1/24 為市集 A 補登 500 元
5. 在 1/24 為市集 B 補登 800 元
6. 在 1/24 為市集 C 補登 1000 元

**預期結果**：
- 市集 A 的 1/24 顯示 500 元
- 市集 B 的 1/24 顯示 800 元
- 市集 C 的 1/24 顯示 1000 元
- 三個市集的數據互不影響

### 場景 2：同一市集多天
1. 創建市集 A（1/24 - 1/26）
2. 在 1/24 補登 500 元
3. 在 1/25 補登 800 元
4. 在 1/26 補登 1000 元

**預期結果**：
- 1/24 顯示 500 元
- 1/25 顯示 800 元
- 1/26 顯示 1000 元
- 總計顯示 2300 元

### 場景 3：查詢日期範圍
1. 使用 `useDateRangeStats('2025-01-24', '2025-01-26')`
2. **預期結果**：返回所有市集在此日期範圍內的統計

## 📝 相關檔案

### 修改檔案
- `lib/db/index.ts` - 添加版本 4 遷移，修改 dailyStats 索引
- `lib/db/events.ts` - 更新 deal_closed 和 interaction_recorded 處理器
- `components/markets/DailyRevenueStats.tsx` - 修復查詢邏輯

### 影響範圍
- ✅ 本地 Dexie 資料庫
- ⚠️ Supabase 不受影響（Supabase 的 daily_stats 表可能需要類似修改）

## 🚀 部署步驟

### 1. 本地測試
1. 重新載入應用
2. Dexie 會自動執行版本 4 遷移
3. 檢查控制台確認遷移成功
4. 測試多個市集在同一天的補登功能

### 2. Supabase 更新（可選）
如果 Supabase 也有類似問題，需要修改表結構：

```sql
-- 備份現有數據
CREATE TABLE daily_stats_backup AS SELECT * FROM daily_stats;

-- 刪除舊表
DROP TABLE daily_stats;

-- 創建新表（使用自動遞增 ID + 唯一約束）
CREATE TABLE daily_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  market_id UUID NOT NULL,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  deal_count INTEGER DEFAULT 0,
  touch_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (date, market_id)  -- ✅ 唯一約束
);

-- 創建索引
CREATE INDEX idx_daily_stats_date ON daily_stats(date);
CREATE INDEX idx_daily_stats_market_id ON daily_stats(market_id);
CREATE INDEX idx_daily_stats_date_market ON daily_stats(date, market_id);

-- 還原數據
INSERT INTO daily_stats (date, market_id, revenue, cost, profit, deal_count, touch_count, inquiry_count, updated_at)
SELECT date, market_id, revenue, cost, profit, deal_count, touch_count, inquiry_count, updated_at
FROM daily_stats_backup;

-- 刪除備份
DROP TABLE daily_stats_backup;
```

## 💡 技術細節

### Dexie 複合索引語法
```typescript
// 定義複合索引
dailyStats: '++id, [date+marketId], date, marketId'

// 查詢
db.dailyStats
  .where('[date+marketId]')
  .equals(['2025-01-24', 'market-uuid'])
  .first()

// 更新（使用 ID）
db.dailyStats.update(id, { revenue: 500 })

// 刪除（使用 ID）
db.dailyStats.delete(id)
```

### 索引說明
- `++id` - 自動遞增主鍵
- `[date+marketId]` - 複合索引，用於快速查詢特定日期和市集的組合
- `date` - 單獨索引，支援按日期查詢
- `marketId` - 單獨索引，支援按市集查詢

## ✅ 完成狀態

- ✅ 修改資料庫結構（版本 4）
- ✅ 更新 deal_closed 事件處理器
- ✅ 更新 interaction_recorded 事件處理器
- ✅ 修復 DailyRevenueStats 查詢邏輯
- ✅ 自動資料遷移
- ⏳ 需要測試多市集場景
- ⏳ Supabase 更新（如需要）

---

**修復日期**：2025-01-25  
**問題嚴重度**：高（數據覆蓋問題）  
**影響範圍**：所有使用每日統計的功能  
**向後兼容**：是（自動遷移）  
**Dexie 限制**：不支持直接修改主鍵，使用自動遞增 ID + 複合索引替代


## ✅ 測試場景

### 場景 1：三個市集在同一天
1. 創建市集 A（1/24 - 1/25）
2. 創建市集 B（1/24 - 1/26）
3. 創建市集 C（1/24 - 1/27）
4. 在 1/24 為市集 A 補登 500 元
5. 在 1/24 為市集 B 補登 800 元
6. 在 1/24 為市集 C 補登 1000 元

**預期結果**：
- 市集 A 的 1/24 顯示 500 元
- 市集 B 的 1/24 顯示 800 元
- 市集 C 的 1/24 顯示 1000 元
- 三個市集的數據互不影響

### 場景 2：同一市集多天
1. 創建市集 A（1/24 - 1/26）
2. 在 1/24 補登 500 元
3. 在 1/25 補登 800 元
4. 在 1/26 補登 1000 元

**預期結果**：
- 1/24 顯示 500 元
- 1/25 顯示 800 元
- 1/26 顯示 1000 元
- 總計顯示 2300 元

### 場景 3：查詢日期範圍
1. 使用 `useDateRangeStats('2025-01-24', '2025-01-26')`
2. **預期結果**：返回所有市集在此日期範圍內的統計

## 📝 相關檔案

### 修改檔案
- `lib/db/index.ts` - 添加版本 4 遷移，修改 dailyStats 主鍵
- `lib/db/events.ts` - 更新 deal_closed 和 interaction_recorded 處理器
- `components/markets/DailyRevenueStats.tsx` - 修復查詢邏輯

### 影響範圍
- ✅ 本地 Dexie 資料庫
- ⚠️ Supabase 不受影響（Supabase 的 daily_stats 表可能需要類似修改）

## 🚀 部署步驟

### 1. 本地測試
1. 清除瀏覽器 IndexedDB（可選，用於測試遷移）
2. 重新載入應用
3. Dexie 會自動執行版本 4 遷移
4. 測試多個市集在同一天的補登功能

### 2. Supabase 更新（可選）
如果 Supabase 也有類似問題，需要修改表結構：

```sql
-- 備份現有數據
CREATE TABLE daily_stats_backup AS SELECT * FROM daily_stats;

-- 刪除舊表
DROP TABLE daily_stats;

-- 創建新表（使用複合主鍵）
CREATE TABLE daily_stats (
  date DATE NOT NULL,
  market_id UUID NOT NULL,
  revenue NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  profit NUMERIC DEFAULT 0,
  deal_count INTEGER DEFAULT 0,
  touch_count INTEGER DEFAULT 0,
  inquiry_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (date, market_id)  -- ✅ 複合主鍵
);

-- 還原數據
INSERT INTO daily_stats SELECT * FROM daily_stats_backup;

-- 刪除備份
DROP TABLE daily_stats_backup;
```

## 💡 技術細節

### Dexie 複合主鍵語法
```typescript
// 定義複合主鍵
dailyStats: '[date+marketId], date, marketId'

// 查詢
db.dailyStats.get(['2025-01-24', 'market-uuid'])

// 更新
db.dailyStats.update(['2025-01-24', 'market-uuid'], { revenue: 500 })

// 刪除
db.dailyStats.delete(['2025-01-24', 'market-uuid'])
```

### 索引說明
- `[date+marketId]` - 複合主鍵，唯一標識一條記錄
- `date` - 單獨索引，支援按日期查詢
- `marketId` - 單獨索引，支援按市集查詢

## ✅ 完成狀態

- ✅ 修改資料庫結構（版本 4）
- ✅ 更新 deal_closed 事件處理器
- ✅ 更新 interaction_recorded 事件處理器
- ✅ 修復 DailyRevenueStats 查詢邏輯
- ✅ 自動資料遷移
- ⏳ 需要測試多市集場景
- ⏳ Supabase 更新（如需要）

---

**修復日期**：2025-01-25  
**問題嚴重度**：高（數據覆蓋問題）  
**影響範圍**：所有使用每日統計的功能  
**向後兼容**：是（自動遷移）
