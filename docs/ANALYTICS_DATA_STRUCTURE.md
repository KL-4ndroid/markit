# 分析功能 - 可用數據參數與變數說明

> 本文檔詳細說明 Market Pulse 系統中所有可用於數據分析的參數、變數和數據結構。
> 
> **最後更新**: 2024-02-08

---

## 📊 目錄

1. [數據來源概覽](#數據來源概覽)
2. [市集數據 (Market)](#市集數據-market)
3. [商品數據 (Product)](#商品數據-product)
4. [事件數據 (Event)](#事件數據-event)
5. [每日統計數據 (DailyStats)](#每日統計數據-dailystats)
6. [互動行為數據](#互動行為數據)
7. [成交數據](#成交數據)
8. [可計算的衍生指標](#可計算的衍生指標)
9. [數據查詢方式](#數據查詢方式)

---

## 數據來源概覽

Market Pulse 使用 **事件溯源 (Event Sourcing)** 架構，所有數據變更都以事件形式記錄。

### 主要數據表

| 表名 | 說明 | 主鍵類型 | 用途 |
|------|------|----------|------|
| `markets` | 市集快照 | UUID (string) | 存儲市集當前狀態 |
| `products` | 商品快照 | UUID (string) | 存儲商品資訊 |
| `events` | 事件日誌 | UUID (string) | 記錄所有業務事件 |
| `dailyStats` | 每日統計 | Auto-increment (number) | 快速查詢每日數據 |
| `settings` | 系統設定 | Auto-increment (number) | 用戶偏好設定 |

---

## 市集數據 (Market)

### 基本資訊

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `id` | string (UUID) | 市集唯一識別碼 | 關聯其他數據 |
| `name` | string | 市集名稱 | 分組、標籤 |
| `location` | string | 地點 | 地理分析 |
| `startDate` | string (YYYY-MM-DD) | 開始日期 | 時間序列分析 |
| `endDate` | string (YYYY-MM-DD) | 結束日期 | 計算市集天數 |
| `status` | MarketStatus | 市集狀態 | 狀態分布分析 |

**MarketStatus 枚舉值**:
- `registered` - 已報名
- `accepted` - 已錄取
- `paid` - 已繳費
- `ongoing` - 如期舉行
- `completed` - 已完成
- `postponed` - 已延期
- `cancelled` - 已取消

### 時間軸資訊

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `earlyEntryEnabled` | boolean | 是否提前進場 | 時間規劃分析 |
| `earlyEntryTime` | string (HH:mm) | 提前進場時間 | 時間分布 |
| `checkInTime` | string (HH:mm) | 報到時間 | 時間分布 |
| `operatingStartTime` | string (HH:mm) | 營業開始時間 | 營業時段分析 |
| `operatingEndTime` | string (HH:mm) | 營業結束時間 | 營業時長計算 |

### 財務資訊

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `registrationFee` | number | 報名費用 | 成本分析 |
| `boothCost` | number | 攤位成本 | 成本分析 |
| `deposit` | number | 保證金 | 現金流分析 |
| `tableRental` | number | 桌子租金 | 設備成本分析 |
| `chairRental` | number | 椅子租金 | 設備成本分析 |
| `umbrellaRental` | number | 傘租金 | 設備成本分析 |
| `commissionRate` | number | 抽成比例 (%) | 變動成本計算 |

### 免費提供標記

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `tableFree` | boolean | 桌子免費提供 | 成本優化分析 |
| `chairFree` | boolean | 椅子免費提供 | 成本優化分析 |
| `umbrellaFree` | boolean | 傘免費提供 | 成本優化分析 |

### 統計資訊（聚合數據）

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `totalRevenue` | number | 總收入 | 營收分析 |
| `totalProfit` | number | 總利潤 | 獲利分析 |
| `totalInteractions` | number | 總互動數 | 顧客行為分析 |
| `totalDeals` | number | 總成交數 | 轉換率分析 |

### 時間戳

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `createdAt` | number (timestamp) | 建立時間 | 時間序列分析 |
| `updatedAt` | number (timestamp) | 最後更新時間 | 活躍度分析 |

---

## 商品數據 (Product)

### 基本資訊

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `id` | string (UUID) | 商品唯一識別碼 | 關聯銷售數據 |
| `name` | string | 商品名稱 | 商品排行 |
| `category` | ProductCategory | 商品分類 | 分類分析 |
| `price` | number | 售價 | 定價分析 |
| `cost` | number | 成本 | 利潤率分析 |

**ProductCategory 枚舉值**:
- `handmade` - 手作
- `food` - 食品
- `accessory` - 飾品
- `clothing` - 服飾
- `art` - 藝術品
- `stationery` - 文具
- `other` - 其他

### 庫存管理

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `stock` | number | 庫存數量 | 庫存周轉率 |
| `unlimitedStock` | boolean | 不限庫存 | 商品類型分析 |
| `isActive` | boolean | 是否啟用 | 商品活躍度 |

### 統計資訊

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `totalSold` | number | 總銷售數量 | 銷售排行 |

### 時間戳

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `createdAt` | number (timestamp) | 建立時間 | 商品生命週期 |
| `updatedAt` | number (timestamp) | 最後更新時間 | 更新頻率 |

---

## 事件數據 (Event)

### 基本結構

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `id` | string (UUID) | 事件唯一識別碼 | 事件追蹤 |
| `type` | EventType | 事件類型 | 事件分類統計 |
| `payload` | object | 事件資料 | 詳細分析 |
| `timestamp` | number | 事件發生時間戳 | 時間序列分析 |
| `market_id` | string (UUID) | 關聯市集 ID | 市集關聯分析 |

### 事件類型 (EventType)

#### 市集相關事件
- `market_created` - 市集建立
- `market_status_changed` - 市集狀態變更
- `market_started` - 市集開始營業
- `market_ended` - 市集結束營業
- `market_deleted` - 市集刪除

#### 商品相關事件
- `product_created` - 商品建立
- `product_updated` - 商品更新
- `product_deleted` - 商品刪除

#### 互動相關事件
- `interaction_recorded` - 記錄互動
- `deal_closed` - 成交

#### 設定相關事件
- `settings_updated` - 設定更新

---

## 每日統計數據 (DailyStats)

### 結構

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `id` | number | 自動遞增 ID | 主鍵 |
| `date` | string (YYYY-MM-DD) | 日期 | 日期篩選 |
| `marketId` | string (UUID) | 關聯市集 ID | 市集關聯 |

### 互動統計

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `touchCount` | number | 摸摸次數 | 互動分析（已移除） |
| `inquiryCount` | number | 詢問次數 | 互動分析（已移除） |
| `dealCount` | number | 成交次數 | 轉換率分析 |

### 財務統計

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `revenue` | number | 收入 | 每日營收趨勢 |
| `cost` | number | 成本 | 成本控制 |
| `profit` | number | 利潤 | 獲利分析 |

### 商品統計

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `productsSold` | array | 商品銷售明細 | 商品排行 |
| `productsSold[].productId` | string (UUID) | 商品 ID | 商品關聯 |
| `productsSold[].quantity` | number | 銷售數量 | 銷量統計 |
| `productsSold[].revenue` | number | 銷售收入 | 商品營收 |

---

## 互動行為數據

### InteractionRecordedPayload

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `marketId` | string (UUID) | 所屬市集 | 市集關聯 |
| `type` | string | 互動類型（按鈕 ID） | 互動偏好分析 |
| `productIds` | string[] | 相關商品 ID | 商品興趣分析 |
| `notes` | string | 備註 | 質性分析 |

### 可分析維度

1. **互動頻率**: 統計各類型互動的次數
2. **互動時段**: 分析互動發生的時間分布
3. **互動轉換**: 計算從互動到成交的轉換率
4. **商品興趣**: 分析哪些商品獲得最多互動

---

## 成交數據

### DealClosedPayload

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `marketId` | string (UUID) | 所屬市集 | 市集關聯 |
| `dealDate` | string (YYYY-MM-DD) | 成交日期 | 多天市集日期區分 |
| `isBackfill` | boolean | 是否為補登 | 數據來源分析 |
| `isManualEntry` | boolean | 是否手動輸入 | 數據錄入方式 |

### 簡化模式（手動輸入）

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `manualRevenue` | number | 手動輸入的收入 | 快速營收統計 |
| `manualCost` | number | 手動輸入的成本 | 快速成本統計 |
| `manualDealCount` | number | 手動輸入的成交次數 | 成交量統計 |

### 完整模式（商品選擇）

| 欄位 | 類型 | 說明 | 分析用途 |
|------|------|------|----------|
| `items` | array | 成交商品列表 | 商品銷售分析 |
| `items[].productId` | string (UUID) | 商品 ID | 商品關聯 |
| `items[].quantity` | number | 數量 | 銷量統計 |
| `items[].price` | number | 實際售價 | 折扣分析 |
| `items[].price_at_time_of_sale` | number | 成交時售價 | 價格變動追蹤 |
| `items[].cost_at_time_of_sale` | number | 成交時成本 | 成本變動追蹤 |
| `items[].product_name` | string | 成交時商品名稱 | 歷史記錄 |
| `totalAmount` | number | 總金額 | 客單價分析 |
| `paymentMethod` | string | 支付方式 | 支付偏好分析 |

**PaymentMethod 枚舉值**:
- `cash` - 現金
- `card` - 轉帳
- `mobile` - 電子支付
- `other` - 其他

---

## 可計算的衍生指標

### 營收指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 總收入 | `SUM(market.totalRevenue)` | 所有市集的總收入 |
| 平均收入 | `AVG(market.totalRevenue)` | 每場市集平均收入 |
| 收入成長率 | `(本期收入 - 上期收入) / 上期收入 * 100%` | 收入增長趨勢 |

### 成本指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 固定成本 | `boothCost + tableRental + chairRental + umbrellaRental` | 每場市集固定成本 |
| 變動成本 | `totalRevenue * commissionRate / 100` | 抽成成本 |
| 總成本 | `固定成本 + 變動成本 + 商品成本` | 完整成本 |
| 成本率 | `總成本 / 總收入 * 100%` | 成本佔比 |

### 獲利指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 毛利潤 | `總收入 - 商品成本` | 扣除商品成本的利潤 |
| 淨利潤 | `總收入 - 總成本` | 扣除所有成本的利潤 |
| 毛利率 | `毛利潤 / 總收入 * 100%` | 毛利潤佔比 |
| 淨利率 | `淨利潤 / 總收入 * 100%` | 淨利潤佔比 |
| ROI | `淨利潤 / 總成本 * 100%` | 投資回報率 |

### 銷售指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 總成交數 | `SUM(market.totalDeals)` | 所有成交筆數 |
| 平均客單價 | `總收入 / 總成交數` | 每筆交易平均金額 |
| 商品銷售量 | `SUM(items.quantity)` | 商品總銷售數量 |
| 商品銷售額 | `SUM(items.price * items.quantity)` | 商品總銷售金額 |

### 轉換指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 轉換率 | `總成交數 / 總互動數 * 100%` | 互動到成交的轉換率 |
| 平均互動次數 | `總互動數 / 總成交數` | 每筆成交平均互動次數 |

### 時間指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 營業時長 | `operatingEndTime - operatingStartTime` | 每場市集營業時數 |
| 時均收入 | `總收入 / 營業時長` | 每小時平均收入 |
| 市集天數 | `endDate - startDate + 1` | 市集持續天數 |
| 日均收入 | `總收入 / 市集天數` | 每天平均收入 |

### 商品指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 商品銷售排行 | `ORDER BY totalSold DESC` | 最暢銷商品 |
| 商品營收排行 | `ORDER BY (price * totalSold) DESC` | 營收貢獻最高商品 |
| 商品利潤率 | `(price - cost) / price * 100%` | 單品利潤率 |
| 分類銷售佔比 | `分類銷售額 / 總銷售額 * 100%` | 各分類銷售佔比 |

### 行為指標

| 指標 | 計算公式 | 說明 |
|------|----------|------|
| 互動類型分布 | `COUNT(type) GROUP BY type` | 各類型互動次數 |
| 互動時段分布 | `COUNT(*) GROUP BY HOUR(timestamp)` | 各時段互動次數 |
| 支付方式分布 | `COUNT(paymentMethod) GROUP BY paymentMethod` | 各支付方式使用次數 |

---

## 數據查詢方式

### 使用 Dexie 查詢

```typescript
import { db } from '@/lib/db';

// 1. 查詢特定日期範圍的市集
const markets = await db.markets
  .where('startDate')
  .between(startDate, endDate, true, true)
  .toArray();

// 2. 查詢特定市集的所有事件
const events = await db.events
  .where('market_id')
  .equals(marketId)
  .toArray();

// 3. 查詢特定類型的事件
const dealEvents = await db.events
  .where('type')
  .equals('deal_closed')
  .toArray();

// 4. 查詢特定日期範圍的事件
const startTimestamp = new Date(startDate).getTime();
const endTimestamp = new Date(endDate).getTime();
const events = await db.events
  .where('timestamp')
  .between(startTimestamp, endTimestamp)
  .toArray();

// 5. 查詢每日統計
const dailyStats = await db.dailyStats
  .where('[date+marketId]')
  .equals([date, marketId])
  .first();

// 6. 查詢商品銷售數據
const products = await db.products
  .where('isActive')
  .equals(true)
  .toArray();
```

### 使用 React Hooks

```typescript
import { useMarkets, useDateRangeStats, useProducts } from '@/lib/db/hooks';

// 1. 獲取所有市集
const markets = useMarkets();

// 2. 獲取日期範圍統計
const stats = useDateRangeStats(startDate, endDate);

// 3. 獲取啟用的商品
const products = useProducts({ isActive: true });
```

---

## 分析功能建議

### 現有分析功能

1. ✅ **營收趨勢圖** - 顯示日期範圍內的營收變化
2. ✅ **關鍵指標卡片** - 總收入、淨利潤、平均客單價、轉換率
3. ✅ **轉換漏斗** - 互動到成交的轉換流程
4. ✅ **成本分析** - 固定成本、變動成本、利潤分析
5. ✅ **互動偏好圖** - 各類型互動的分布
6. ✅ **時段熱力圖** - 各時段的互動和營收分布
7. ✅ **市集明細列表** - 各市集的詳細數據

### 可擴展的分析功能

1. 🔮 **商品銷售排行** - 最暢銷商品、營收貢獻排行
2. 🔮 **分類佔比分析** - 各商品分類的銷售佔比
3. 🔮 **定價策略分析** - 價格區間分布、折扣效果
4. 🔮 **地點分析** - 不同地點的營收表現
5. 🔮 **時間分析** - 週間/週末、季節性趨勢
6. 🔮 **成本優化建議** - 識別高成本市集、優化建議
7. 🔮 **預測分析** - 基於歷史數據預測未來營收
8. 🔮 **同期比較** - 與去年同期、上月同期比較
9. 🔮 **支付方式分析** - 各支付方式的使用趨勢
10. 🔮 **庫存周轉率** - 商品庫存效率分析

---

## 數據完整性檢查

### 必要欄位檢查

在進行分析前，建議檢查以下欄位的完整性：

1. **市集數據**:
   - `startDate`, `endDate` - 必須有效
   - `totalRevenue`, `totalDeals` - 應 >= 0
   - `operatingStartTime`, `operatingEndTime` - 營業時間應合理

2. **商品數據**:
   - `price` - 必須 > 0
   - `cost` - 應 <= price
   - `stock` - 如果不是 unlimitedStock，應 >= 0

3. **事件數據**:
   - `timestamp` - 必須有效
   - `market_id` - 應能關聯到有效市集
   - `payload` - 應包含必要欄位

### 數據異常處理

```typescript
// 檢查異常數據
const checkDataIntegrity = async () => {
  // 1. 檢查負數收入
  const negativeRevenue = await db.markets
    .where('totalRevenue')
    .below(0)
    .toArray();
  
  // 2. 檢查成交數大於互動數（不合理）
  const invalidConversion = await db.markets
    .filter(m => (m.totalDeals || 0) > (m.totalInteractions || 0))
    .toArray();
  
  // 3. 檢查孤立事件（market_id 不存在）
  const orphanEvents = await db.events
    .filter(async e => {
      if (!e.market_id) return false;
      const market = await db.markets.get(e.market_id);
      return !market;
    })
    .toArray();
  
  return {
    negativeRevenue,
    invalidConversion,
    orphanEvents,
  };
};
```

---

## 總結

Market Pulse 提供了豐富的數據結構，支援多維度的數據分析：

- **5 個主要數據表**: markets, products, events, dailyStats, settings
- **11 種事件類型**: 涵蓋市集、商品、互動的完整生命週期
- **50+ 個數據欄位**: 包含基本資訊、財務、時間、統計等
- **20+ 個衍生指標**: 營收、成本、獲利、轉換等關鍵指標
- **10+ 個擴展方向**: 商品排行、地點分析、預測等進階功能

所有數據都基於事件溯源架構，確保數據的可追溯性和完整性。

---

**文檔版本**: 1.0  
**創建日期**: 2024-02-08  
**維護者**: Market Pulse Team
