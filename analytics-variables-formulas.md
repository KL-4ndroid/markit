# 分析功能變數與公式報告

## 📋 目錄
1. [數據來源變數](#數據來源變數)
2. [市集 ROI 分析](#市集-roi-分析)
3. [客單價分析](#客單價分析)
4. [商品排行分析](#商品排行分析)
5. [日期篩選變數](#日期篩選變數)

---

## 1. 數據來源變數

### 1.1 Market（市集）資料結構

| 變數名稱 | 類型 | 說明 |
|---------|------|------|
| `id` | string | 市集唯一識別碼（UUID） |
| `name` | string | 市集名稱 |
| `location` | string | 市集地點 |
| `dates` | string[] | 市集日期陣列（多選日期） |
| `startDate` | string | 開始日期（YYYY-MM-DD） |
| `endDate` | string | 結束日期（YYYY-MM-DD） |
| `status` | MarketStatus | 市集狀態 |
| `operatingStartTime` | string | 營業開始時間（HH:mm） |
| `operatingEndTime` | string | 營業結束時間（HH:mm） |
| `totalRevenue` | number | 總收入（元） |
| `totalProfit` | number | 總利潤（元） |
| `totalDeals` | number | 總成交數（筆） |
| `totalInteractions` | number | 總互動數（次） |
| `registrationFee` | number | 報名費（元） |
| `boothCost` | number | 攤位費（元） |
| `tableRental` | number | 桌子租金（元） |
| `chairRental` | number | 椅子租金（元） |
| `umbrellaRental` | number | 傘租金（元） |
| `commissionRate` | number | 抽成比例（%） |
| `tableFree` | boolean | 桌子是否免費 |
| `chairFree` | boolean | 椅子是否免費 |
| `umbrellaFree` | boolean | 傘是否免費 |

### 1.2 Event（事件）資料結構

| 變數名稱 | 類型 | 說明 |
|---------|------|------|
| `id` | string | 事件唯一識別碼（UUID） |
| `type` | EventType | 事件類型 |
| `payload` | any | 事件資料 |
| `timestamp` | number | 事件時間戳（毫秒） |
| `market_id` | string | 關聯市集 ID |

### 1.3 DealClosedPayload（成交事件）資料結構

| 變數名稱 | 類型 | 說明 |
|---------|------|------|
| `marketId` | string | 市集 ID |
| `dealDate` | string | 成交日期（YYYY-MM-DD） |
| `isBackfill` | boolean | 是否為補登 |
| `isManualEntry` | boolean | 是否為手動輸入 |
| `items` | DealItem[] | 交易項目陣列 |
| `totalAmount` | number | 總金額（元） |
| `paymentMethod` | string | 支付方式 |

### 1.4 DealItem（交易項目）資料結構

| 變數名稱 | 類型 | 說明 |
|---------|------|------|
| `productId` | string | 商品 ID |
| `quantity` | number | 數量 |
| `price` | number | 售價（元） |
| `product_name` | string | 商品名稱快照 |
| `price_at_time_of_sale` | number | 成交時售價（元） |
| `cost_at_time_of_sale` | number | 成交時成本（元） |

---

## 2. 市集 ROI 分析

### 2.1 計算變數

#### MarketROIData 介面

```typescript
interface MarketROIData {
  market: Market;           // 市集資料
  netProfit: number;        // 淨利潤（元）
  hourlyProfit: number;     // 每小時淨利（元/小時）
  boothROI: number;         // 攤位費回收率（%）
  operatingHours: number;   // 營業時數（小時）
}
```

### 2.2 計算公式

#### 公式 1：淨利潤（Net Profit）

```
淨利潤 = 總利潤 - 攤位費 - 報名費 - 設備租金 - 抽成

其中：
- 總利潤 = totalProfit（已扣除商品成本）
- 攤位費 = boothCost
- 報名費 = registrationFee
- 設備租金 = tableRental + chairRental + umbrellaRental（扣除免費項目）
- 抽成 = totalRevenue × (commissionRate / 100)
```

**代碼實現**：
```typescript
const totalRevenue = market.totalRevenue || 0;
const totalProfit = market.totalProfit || 0;
const boothCost = market.boothCost || 0;
const registrationFee = market.registrationFee || 0;

// 設備租金
const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
const rentals = tableRental + chairRental + umbrellaRental;

// 抽成
const commission = (totalRevenue * (market.commissionRate || 0)) / 100;

// 淨利潤
const netProfit = totalProfit - boothCost - registrationFee - rentals - commission;
```

#### 公式 2：營業時數（Operating Hours）

```
單日營業時數 = (營業結束時間 - 營業開始時間) / 60

總營業時數 = 單日營業時數 × 天數

天數計算：
- 優先使用 dates 陣列長度（多選日期）
- 降級使用 (endDate - startDate) + 1（連續日期）
```

**代碼實現**：
```typescript
let operatingHours = 0;

if (market.operatingStartTime && market.operatingEndTime) {
  // 解析時間
  const [startHour, startMinute] = market.operatingStartTime.split(':').map(Number);
  const [endHour, endMinute] = market.operatingEndTime.split(':').map(Number);
  
  // 轉換為分鐘
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  // 計算單日時數
  const dailyHours = (endMinutes - startMinutes) / 60;
  
  // 計算天數
  let days = 1;
  if (market.dates && market.dates.length > 0) {
    days = market.dates.length;
  } else {
    const startDate = new Date(market.startDate);
    const endDate = new Date(market.endDate);
    days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  
  operatingHours = dailyHours * days;
}
```

#### 公式 3：每小時淨利（Hourly Profit）

```
每小時淨利 = 淨利潤 / 總營業時數

單位：元/小時
```

**代碼實現**：
```typescript
const hourlyProfit = operatingHours > 0 ? netProfit / operatingHours : 0;
```

#### 公式 4：攤位費回收率（Booth ROI）

```
回收率 = (總收入 / 固定成本) × 100%

固定成本 = 攤位費 + 設備租賃費

意義：
- 200% = 收入是成本的 2 倍
- 100% = 剛好回本
- < 100% = 虧損
```

**代碼實現**：
```typescript
const totalFixedCost = boothCost + rentals;
const boothROI = totalFixedCost > 0 ? (totalRevenue / totalFixedCost) * 100 : 0;
```

### 2.3 排序規則

```
優先排序：hourlyProfit（降序）
次要排序：boothROI（降序）
```

**代碼實現**：
```typescript
marketROIData.sort((a, b) => {
  if (b.hourlyProfit !== a.hourlyProfit) {
    return b.hourlyProfit - a.hourlyProfit;
  }
  return b.boothROI - a.boothROI;
});
```

---

## 3. 客單價分析

### 3.1 計算變數

#### MarketAOVData 介面

```typescript
interface MarketAOVData {
  market: Market;              // 市集資料
  averageOrderValue: number;   // 客單價（元）
  totalRevenue: number;        // 總收入（元）
  totalDeals: number;          // 總成交數（筆）
}
```

### 3.2 計算公式

#### 公式：客單價（Average Order Value, AOV）

```
客單價 = 總收入 / 成交數

單位：元/筆

篩選條件：
- 只包含 totalDeals > 0 的市集
```

**代碼實現**：
```typescript
const markets = allMarkets
  .filter(market => (market.totalDeals || 0) > 0);

const marketAOVData = markets.map(market => {
  const totalRevenue = market.totalRevenue || 0;
  const totalDeals = market.totalDeals || 0;
  const averageOrderValue = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  
  return {
    market,
    averageOrderValue,
    totalRevenue,
    totalDeals,
  };
});
```

### 3.3 排序規則

```
按 averageOrderValue 降序排列
```

**代碼實現**：
```typescript
marketAOVData.sort((a, b) => b.averageOrderValue - a.averageOrderValue);
```

---

## 4. 商品排行分析

### 4.1 計算變數

#### ProductStats 資料結構

```typescript
interface ProductStats {
  productName: string;    // 商品名稱
  quantity: number;       // 累計銷售數量
  revenue: number;        // 累計銷售金額（元）
  profit: number;         // 累計利潤（元）
}
```

#### TopProductsData 介面

```typescript
interface TopProductsData {
  topByQuantity: {
    productName: string;
    quantity: number;
  } | null;
  
  topByRevenue: {
    productName: string;
    revenue: number;
  } | null;
  
  topByProfit: {
    productName: string;
    profit: number;
  } | null;
}
```

### 4.2 計算公式

#### 公式 1：商品銷售數量

```
quantity = Σ item.quantity

累加所有成交事件中該商品的數量
```

#### 公式 2：商品銷售金額

```
revenue = Σ (price × quantity)

其中：
- price = item.price_at_time_of_sale || item.price
- quantity = item.quantity
```

#### 公式 3：商品利潤

```
profit = Σ ((price - cost) × quantity)

其中：
- price = item.price_at_time_of_sale || item.price
- cost = item.cost_at_time_of_sale
- quantity = item.quantity
```

### 4.3 數據處理流程

**代碼實現**：
```typescript
// 1. 建立商品統計 Map
const productStats = new Map<string, ProductStats>();

// 2. 遍歷所有市集
for (const market of markets) {
  // 3. 獲取該市集的所有成交事件
  const events = await db.events
    .where('market_id')
    .equals(market.id)
    .and(event => event.type === 'deal_closed')
    .toArray();

  // 4. 處理每個成交事件
  for (const event of events) {
    const payload = event.payload as DealClosedPayload;
    
    // 跳過手動輸入的交易
    if (payload.isManualEntry) continue;
    
    // 5. 處理交易項目
    if (payload.items && Array.isArray(payload.items)) {
      for (const item of payload.items) {
        const productId = item.productId;
        
        // 獲取商品名稱（優先使用快照）
        let productName = item.product_name;
        if (!productName) {
          const product = await db.products.get(productId);
          productName = product?.name;
        }
        
        if (!productName) continue;
        
        // 計算數據
        const quantity = item.quantity || 0;
        const price = item.price_at_time_of_sale || item.price || 0;
        const cost = item.cost_at_time_of_sale || 0;
        const revenue = price * quantity;
        const profit = (price - cost) * quantity;

        // 累加統計
        if (productStats.has(productId)) {
          const stats = productStats.get(productId)!;
          stats.quantity += quantity;
          stats.revenue += revenue;
          stats.profit += profit;
        } else {
          productStats.set(productId, {
            productName,
            quantity,
            revenue,
            profit,
          });
        }
      }
    }
  }
}

// 6. 找出各項第一名
const productsArray = Array.from(productStats.values());

const topByQuantity = productsArray.reduce((max, p) => 
  p.quantity > max.quantity ? p : max
);

const topByRevenue = productsArray.reduce((max, p) => 
  p.revenue > max.revenue ? p : max
);

const topByProfit = productsArray.reduce((max, p) => 
  p.profit > max.profit ? p : max
);
```

---

## 5. 日期篩選變數

### 5.1 DateRange 類型

```typescript
type DateRange = 'today' | 'week' | 'month' | 'all' | 'custom';
```

### 5.2 日期計算公式

#### 公式 1：今日（today）

```
startDate = 今天
endDate = 今天
```

**代碼實現**：
```typescript
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
const formatLocalDate = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

startDate = formatLocalDate(today);
endDate = formatLocalDate(today);
```

#### 公式 2：本週（week）

```
startDate = 今天 - 7 天
endDate = 今天
```

**代碼實現**：
```typescript
const weekAgo = new Date(today);
weekAgo.setDate(weekAgo.getDate() - 7);

startDate = formatLocalDate(weekAgo);
endDate = formatLocalDate(today);
```

#### 公式 3：本月（month）

```
startDate = 今天 - 30 天
endDate = 今天
```

**代碼實現**：
```typescript
const monthAgo = new Date(today);
monthAgo.setMonth(monthAgo.getMonth() - 1);

startDate = formatLocalDate(monthAgo);
endDate = formatLocalDate(today);
```

#### 公式 4：全部（all）

```
startDate = '2020-01-01'
endDate = 今天
```

#### 公式 5：自訂（custom）

```
startDate = customStartDate（用戶輸入）
endDate = customEndDate（用戶輸入）
```

### 5.3 市集篩選邏輯

```typescript
// 篩選日期範圍內的市集
const markets = allMarkets.filter(market => {
  // 排除已取消的市集
  if (market.status === 'cancelled') return false;
  
  // 優先檢查 dates 陣列（多選日期）
  if (market.dates && market.dates.length > 0) {
    // 檢查是否有任何日期在範圍內
    return market.dates.some(date => date >= startDate && date <= endDate);
  }
  
  // 降級：使用 startDate（連續日期）
  return market.startDate >= startDate && market.startDate <= endDate;
});
```

---

## 6. 關鍵常數

### 6.1 時間相關常數

| 常數名稱 | 值 | 說明 |
|---------|---|------|
| 毫秒轉分鐘 | 1000 × 60 | 時間戳轉分鐘 |
| 毫秒轉小時 | 1000 × 60 × 60 | 時間戳轉小時 |
| 毫秒轉天 | 1000 × 60 × 60 × 24 | 時間戳轉天 |

### 6.2 補登時間設定

| 設定項目 | 值 | 說明 |
|---------|---|------|
| 補登預設時間 | 23:59:59.999 | 補登交易的時間戳設置為當天最後一刻 |

**代碼實現**：
```typescript
// 建立該日期的 23:59:59 時間戳
const [year, month, day] = dealDate.split('-').map(Number);
const backfillDate = new Date(year, month - 1, day, 23, 59, 59, 999);
timestamp = backfillDate.getTime();
```

---

## 7. 數據流向圖

```
事件表（events）
    ↓ [deal_closed 事件]
    ↓
市集表（markets）
    ├─ totalRevenue（累加）
    ├─ totalProfit（累加）
    ├─ totalDeals（累加）
    └─ totalInteractions（累加）
    ↓
分析頁面（analytics）
    ├─ 計算 ROI 指標
    │   ├─ netProfit
    │   ├─ hourlyProfit
    │   └─ boothROI
    ├─ 計算客單價
    │   └─ averageOrderValue
    └─ 統計商品排行
        ├─ topByQuantity
        ├─ topByRevenue
        └─ topByProfit
```

---

## 8. 性能優化變數

### 8.1 useMemo 依賴項

| 變數名稱 | 依賴項 | 說明 |
|---------|-------|------|
| `markets` | `[allMarkets, startDate, endDate]` | 篩選後的市集列表 |
| `marketROIData` | `[markets]` | ROI 計算結果 |
| `marketAOVData` | `[markets]` | 客單價計算結果 |

### 8.2 useLiveQuery 依賴項

| 變數名稱 | 依賴項 | 說明 |
|---------|-------|------|
| `topProductsData` | `[markets]` | 商品排行計算結果 |

---

## 9. 總結

### 核心計算公式速查表

| 指標 | 公式 | 單位 |
|-----|------|------|
| 淨利潤 | 總利潤 - 攤位費 - 報名費 - 設備租金 - 抽成 | 元 |
| 每小時淨利 | 淨利潤 ÷ 總營業時數 | 元/小時 |
| 回收率 | (總收入 ÷ 固定成本) × 100% | % |
| 客單價 | 總收入 ÷ 成交數 | 元/筆 |
| 商品銷量 | Σ 數量 | 件 |
| 商品營收 | Σ (價格 × 數量) | 元 |
| 商品利潤 | Σ ((價格 - 成本) × 數量) | 元 |

---

**報告生成時間**：2026-02-26  
**版本**：v1.0  
**文件類型**：技術文檔
