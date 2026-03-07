# 補登數據追蹤說明文件

## 📋 問題

在實際操作中，本地資料庫或雲端資料庫的成交數據，對於「補登」的營業收入，是否有特別標記？如何知道這筆收入是市集結束後透過補登功能新增的數據？

---

## ✅ 答案：有特別標記

系統已經設計了完整的補登標記機制，可以清楚識別哪些數據是透過補登功能新增的。

---

## 🏷️ 補登標記欄位

### 在 `DealClosedPayload` 介面中定義

```typescript
export interface DealClosedPayload {
  marketId: string;            // 所屬市集（UUID）
  dealDate?: string;           // ✅ 成交日期（YYYY-MM-DD），用於多天市集區分每日收入
  isBackfill?: boolean;        // ✅ 補登標記（補登時不扣庫存）
  isManualEntry?: boolean;     // ✅ 手動輸入標記（簡化模式）
  
  // ... 其他欄位
}
```

### 三個關鍵標記欄位

| 欄位 | 類型 | 用途 | 預設值 |
|-----|------|------|--------|
| `isBackfill` | `boolean?` | 標記是否為補登數據 | `undefined` 或 `false` |
| `isManualEntry` | `boolean?` | 標記是否為手動輸入（簡化模式） | `undefined` 或 `false` |
| `dealDate` | `string?` | 成交日期（YYYY-MM-DD），用於多天市集 | `undefined` |

---

## 🔍 如何識別補登數據

### 方法 1: 檢查 `isBackfill` 欄位

```typescript
// 查詢所有成交事件
const dealEvents = await db.events
  .where('type')
  .equals('deal_closed')
  .toArray();

// 篩選出補登的數據
const backfilledDeals = dealEvents.filter(event => {
  const payload = event.payload as DealClosedPayload;
  return payload.isBackfill === true;
});

console.log(`補登的成交記錄: ${backfilledDeals.length} 筆`);
```

### 方法 2: 檢查時間戳與市集日期的關係

```typescript
// 補登的數據通常會有以下特徵：
// 1. event.timestamp（記錄時間）晚於市集結束時間
// 2. payload.dealDate（成交日期）早於 event.timestamp

const market = await db.markets.get(marketId);
const marketEndDate = new Date(market.endDate);

const possibleBackfills = dealEvents.filter(event => {
  const eventTime = new Date(event.timestamp);
  const payload = event.payload as DealClosedPayload;
  
  // 如果記錄時間晚於市集結束時間，可能是補登
  return eventTime > marketEndDate;
});
```

---

## 📊 補登數據的特殊處理

### 1. 庫存管理

**補登時不扣庫存**

```typescript
// 在處理成交事件時
if (payload.isBackfill) {
  // ✅ 補登數據：不扣庫存
  console.log('這是補登數據，不扣除庫存');
} else {
  // ❌ 正常成交：扣除庫存
  await deductStock(payload.items);
}
```

**原因**: 補登是記錄過去已經發生的交易，商品已經賣出，不應該再次扣庫存。

### 2. 統計分析

**在分析時可以選擇是否包含補登數據**

```typescript
// 選項 1: 包含所有數據（預設）
const allDeals = await db.events
  .where('type')
  .equals('deal_closed')
  .toArray();

// 選項 2: 只包含現場記錄的數據
const liveDeals = await db.events
  .where('type')
  .equals('deal_closed')
  .filter(event => {
    const payload = event.payload as DealClosedPayload;
    return !payload.isBackfill;
  })
  .toArray();

// 選項 3: 只包含補登的數據
const backfilledDeals = await db.events
  .where('type')
  .equals('deal_closed')
  .filter(event => {
    const payload = event.payload as DealClosedPayload;
    return payload.isBackfill === true;
  })
  .toArray();
```

---

## 🎯 實際使用場景

### 場景 1: 市集結束後補登遺漏的收入

```typescript
// 使用者在市集結束後，發現有筆交易忘記記錄
const backfillDeal = {
  type: 'deal_closed',
  payload: {
    marketId: 'market-123',
    dealDate: '2024-03-06',      // 實際成交日期
    isBackfill: true,             // ✅ 標記為補登
    isManualEntry: true,          // 使用簡化模式
    manualRevenue: 500,
    manualCost: 200,
    manualDealCount: 1,
    items: [],
    totalAmount: 500,
    paymentMethod: 'cash',
    notes: '補登：忘記記錄的現金交易'
  },
  timestamp: Date.now(),          // 補登時間（晚於成交日期）
  market_id: 'market-123'
};

await db.events.add(backfillDeal);
```

### 場景 2: 查詢報表時區分現場與補登

```typescript
// 生成報表
async function generateReport(marketId: string) {
  const allDeals = await db.events
    .where('market_id')
    .equals(marketId)
    .and(e => e.type === 'deal_closed')
    .toArray();
  
  let liveRevenue = 0;      // 現場記錄的收入
  let backfillRevenue = 0;  // 補登的收入
  
  for (const event of allDeals) {
    const payload = event.payload as DealClosedPayload;
    const amount = payload.totalAmount || 0;
    
    if (payload.isBackfill) {
      backfillRevenue += amount;
    } else {
      liveRevenue += amount;
    }
  }
  
  return {
    totalRevenue: liveRevenue + backfillRevenue,
    liveRevenue,
    backfillRevenue,
    backfillPercentage: (backfillRevenue / (liveRevenue + backfillRevenue)) * 100
  };
}

// 使用範例
const report = await generateReport('market-123');
console.log(`總收入: $${report.totalRevenue}`);
console.log(`現場記錄: $${report.liveRevenue}`);
console.log(`補登收入: $${report.backfillRevenue} (${report.backfillPercentage.toFixed(1)}%)`);
```

### 場景 3: 審計追蹤

```typescript
// 查詢所有補登記錄，用於審計
async function auditBackfills(marketId: string) {
  const backfills = await db.events
    .where('market_id')
    .equals(marketId)
    .and(e => e.type === 'deal_closed')
    .filter(e => (e.payload as DealClosedPayload).isBackfill === true)
    .toArray();
  
  console.log('=== 補登記錄審計 ===');
  
  for (const event of backfills) {
    const payload = event.payload as DealClosedPayload;
    const recordTime = new Date(event.timestamp);
    const dealDate = payload.dealDate || '未指定';
    
    console.log(`
      補登時間: ${recordTime.toLocaleString('zh-TW')}
      成交日期: ${dealDate}
      金額: $${payload.totalAmount}
      備註: ${payload.notes || '無'}
    `);
  }
  
  return backfills;
}
```

---

## 📈 在分析功能中的應用

### 目前的實作狀態

在 `lib/analytics-utils.ts` 中，商品親和力分析已經排除補登數據：

```typescript
export async function calculateProductAffinity(
  markets: Market[],
  db: MarketPulseDB
): Promise<ProductPair[]> {
  // ... 查詢所有成交事件
  
  for (const event of allEvents) {
    const payload = event.payload as DealClosedPayload;
    
    // ✅ 排除手動輸入的交易（包含補登）
    if (payload.isManualEntry) {
      continue;
    }
    
    // ... 處理商品配對
  }
}
```

### 建議的擴展

可以在分析功能中加入選項，讓使用者選擇是否包含補登數據：

```typescript
interface AnalyticsOptions {
  includeBackfills?: boolean;  // 是否包含補登數據（預設: true）
  includeLiveOnly?: boolean;   // 只包含現場記錄（預設: false）
}

export function computeMarketAnalytics(
  market: Market,
  options?: AnalyticsOptions
): MarketAnalytics {
  const includeBackfills = options?.includeBackfills ?? true;
  
  // 根據選項篩選數據
  // ...
}
```

---

## 🔐 雲端同步考量

### Supabase 資料表結構

在雲端資料庫中，`events` 表也會包含這些欄位：

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,  -- 包含 isBackfill, isManualEntry 等欄位
  timestamp BIGINT NOT NULL,
  market_id UUID,
  actor_id UUID,
  sync_status TEXT,
  -- ... 其他欄位
);

-- 建立索引以快速查詢補登數據
CREATE INDEX idx_events_backfill 
ON events ((payload->>'isBackfill')) 
WHERE payload->>'isBackfill' = 'true';
```

### 查詢補登數據（Supabase）

```typescript
// 使用 Supabase 查詢補登數據
const { data: backfills } = await supabase
  .from('events')
  .select('*')
  .eq('type', 'deal_closed')
  .eq('payload->>isBackfill', 'true')
  .eq('market_id', marketId);
```

---

## 📝 最佳實踐建議

### 1. 補登時務必設置標記

```typescript
// ✅ 正確：設置 isBackfill 標記
const dealEvent = {
  type: 'deal_closed',
  payload: {
    marketId: 'xxx',
    isBackfill: true,  // 明確標記
    // ...
  }
};

// ❌ 錯誤：忘記設置標記
const dealEvent = {
  type: 'deal_closed',
  payload: {
    marketId: 'xxx',
    // 缺少 isBackfill 標記
  }
};
```

### 2. 補登時記錄原因

```typescript
const dealEvent = {
  type: 'deal_closed',
  payload: {
    marketId: 'xxx',
    isBackfill: true,
    notes: '補登原因：市集結束時忘記記錄此筆現金交易',  // ✅ 記錄原因
    // ...
  }
};
```

### 3. 補登時指定成交日期

```typescript
const dealEvent = {
  type: 'deal_closed',
  payload: {
    marketId: 'xxx',
    isBackfill: true,
    dealDate: '2024-03-06',  // ✅ 指定實際成交日期
    // ...
  },
  timestamp: Date.now()  // 補登時間（會晚於 dealDate）
};
```

### 4. 在 UI 中顯示補登標記

```typescript
// 在交易列表中顯示補登標記
function TransactionItem({ event }) {
  const payload = event.payload as DealClosedPayload;
  
  return (
    <div className="transaction-item">
      <span className="amount">${payload.totalAmount}</span>
      {payload.isBackfill && (
        <span className="badge badge-warning">
          📝 補登
        </span>
      )}
    </div>
  );
}
```

---

## 🎯 總結

### 補登數據的識別方式

| 方法 | 欄位 | 說明 |
|-----|------|------|
| **主要方法** | `isBackfill: true` | 明確標記為補登數據 |
| **輔助方法** | `isManualEntry: true` | 手動輸入（可能是補登） |
| **時間判斷** | `timestamp > marketEndDate` | 記錄時間晚於市集結束 |
| **日期對比** | `dealDate < timestamp` | 成交日期早於記錄時間 |

### 補登數據的特殊處理

1. ✅ **不扣庫存** - 避免重複扣除
2. ✅ **可單獨統計** - 區分現場與補登收入
3. ✅ **審計追蹤** - 記錄補登原因和時間
4. ✅ **分析選項** - 可選擇是否包含補登數據

### 系統已完整支援

- ✅ 資料庫欄位已定義（`isBackfill`, `isManualEntry`, `dealDate`）
- ✅ 型別定義已完整（`DealClosedPayload` 介面）
- ✅ 本地資料庫支援（Dexie IndexedDB）
- ✅ 雲端資料庫支援（Supabase JSONB）
- ✅ 分析功能已考慮（排除手動輸入）

**結論**: 系統已經完整設計了補登數據的追蹤機制，可以清楚識別和管理所有補登的收入數據！🎉
