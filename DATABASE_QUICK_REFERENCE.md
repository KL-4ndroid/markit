# 數據引擎快速參考

## 📚 快速導入

```typescript
// 導入資料庫實例
import { db, initializeDatabase } from '@/lib/db';

// 導入 Hooks
import { 
  useMarkets, 
  createMarket, 
  recordDeal 
} from '@/lib/db/hooks';

// 導入類型
import type { Market, Product, EventType } from '@/types/db';
```

## 🎯 常用操作

### 初始化資料庫

```typescript
// 在 app 啟動時調用（通常在 layout.tsx 或 _app.tsx）
useEffect(() => {
  initializeDatabase();
}, []);
```

### 市集操作

```typescript
// 查詢所有市集
const markets = useMarkets();

// 查詢即將到來的市集
const upcoming = useUpcomingMarkets(5);

// 查詢單一市集
const market = useMarket(marketId);

// 建立市集
await createMarket({
  name: '華山文創市集',
  location: '台北華山文創園區',
  date: '2026-02-15',
  startTime: '10:00',
  endTime: '18:00',
  registrationFee: 500,
  boothCost: 2000,
  notes: '備註',
});

// 更新市集狀態
await updateMarketStatus(marketId, 'accepted');

// 開始營業
await startMarket(marketId);

// 結束營業
await endMarket(marketId);
```

### 商品操作

```typescript
// 查詢所有商品
const products = useProducts();

// 查詢啟用的商品
const activeProducts = useProducts({ isActive: true });

// 查詢特定分類
const handmadeProducts = useProducts({ category: 'handmade' });

// 建立商品
await createProduct({
  name: '手作陶杯',
  category: 'handmade',
  price: 350,
  cost: 150,
  iconName: 'Coffee',
  colorCode: '#7B9FA6',
  stock: 10,
  description: '手工製作的陶瓷杯',
});

// 更新商品
await updateProduct(productId, {
  price: 400,
  stock: 8,
});

// 刪除商品（軟刪除）
await deleteProduct(productId);
```

### 互動記錄

```typescript
// 記錄「摸摸」互動
await recordInteraction(marketId, 'touch', [productId1, productId2]);

// 記錄「詢問」互動
await recordInteraction(marketId, 'inquiry', [productId1], '詢問價格');

// 記錄成交
await recordDeal({
  marketId: 1,
  items: [
    { productId: 1, quantity: 2, price: 350 },
    { productId: 2, quantity: 1, price: 500 },
  ],
  totalAmount: 1200,
  paymentMethod: 'cash',
  notes: '客人很滿意',
});
```

### 統計查詢

```typescript
// 查詢今日統計
const today = new Date().toISOString().split('T')[0];
const todayStats = useDailyStats(today);

// 查詢本月統計
const monthlyStats = useMonthlyStats();
// 返回：{ totalRevenue, totalProfit, totalDeals, totalInteractions, marketCount }

// 查詢日期範圍統計
const stats = useDateRangeStats('2026-01-01', '2026-01-31');
```

### 設定管理

```typescript
// 查詢設定
const settings = useSettings();

// 更新設定
await updateSettings({
  theme: 'dark',
  language: 'zh-TW',
  enableNotifications: true,
});
```

## 🔧 進階操作

### 直接查詢資料庫

```typescript
// 查詢所有市集
const markets = await db.markets.toArray();

// 查詢特定狀態的市集
const ongoingMarkets = await db.markets
  .where('status')
  .equals('ongoing')
  .toArray();

// 查詢特定日期範圍
const markets = await db.markets
  .where('date')
  .between('2026-01-01', '2026-12-31')
  .toArray();

// 計數
const count = await db.markets.count();
```

### 事件查詢

```typescript
import { queryEvents } from '@/lib/db/events';

// 查詢最近 20 個事件
const events = await queryEvents({ limit: 20 });

// 查詢特定類型的事件
const dealEvents = await queryEvents({ type: 'deal_closed' });

// 查詢時間範圍內的事件
const events = await queryEvents({
  startTime: Date.now() - 86400000, // 24小時前
  endTime: Date.now(),
});
```

### 資料備份與還原

```typescript
import { exportData, importData } from '@/lib/db';

// 匯出資料
const jsonData = await exportData();
// 下載或儲存 jsonData

// 匯入資料
await importData(jsonData);
```

### 重建快照

```typescript
import { rebuildSnapshots } from '@/lib/db/events';

// 從事件歷史重建所有快照
// ⚠️ 這會清空並重建所有快照表
await rebuildSnapshots();
```

## 📊 React 組件範例

### 市集列表組件

```typescript
'use client';

import { useMarkets } from '@/lib/db/hooks';

export function MarketList() {
  const markets = useMarkets({ orderBy: 'date', order: 'desc' });

  if (!markets) return <div>載入中...</div>;
  if (markets.length === 0) return <div>尚無市集</div>;

  return (
    <div>
      {markets.map(market => (
        <div key={market.id}>
          <h3>{market.name}</h3>
          <p>{market.location} - {market.date}</p>
          <span>{market.status}</span>
        </div>
      ))}
    </div>
  );
}
```

### 商品選擇器組件

```typescript
'use client';

import { useProducts } from '@/lib/db/hooks';

export function ProductSelector({ onSelect }: { onSelect: (id: number) => void }) {
  const products = useProducts({ isActive: true });

  return (
    <div>
      {products?.map(product => (
        <button key={product.id} onClick={() => onSelect(product.id)}>
          {product.name} - ${product.price}
        </button>
      ))}
    </div>
  );
}
```

### 統計儀表板組件

```typescript
'use client';

import { useMonthlyStats } from '@/lib/db/hooks';
import { formatCurrency } from '@/lib/utils';

export function StatsDashboard() {
  const stats = useMonthlyStats();

  if (!stats) return <div>載入中...</div>;

  return (
    <div>
      <div>市集場次：{stats.marketCount}</div>
      <div>總收入：{formatCurrency(stats.totalRevenue)}</div>
      <div>總利潤：{formatCurrency(stats.totalProfit)}</div>
      <div>成交數：{stats.totalDeals}</div>
    </div>
  );
}
```

## 🎨 市集狀態流轉

```
registered (已報名)
    ↓
accepted (已錄取)
    ↓
paid (已繳費)
    ↓
ongoing (如期舉行/營業中)
    ↓
completed (已完成)

額外狀態：
- postponed (已延期)
- cancelled (已取消)
```

## 📦 商品分類

- `handmade` - 手作
- `food` - 食品
- `accessory` - 飾品
- `clothing` - 服飾
- `art` - 藝術品
- `stationery` - 文具
- `other` - 其他

## 💰 支付方式

- `cash` - 現金
- `card` - 信用卡
- `mobile` - 行動支付
- `other` - 其他

## 🔍 事件類型完整列表

### 市集相關
- `market_created` - 市集建立
- `market_status_changed` - 市集狀態變更
- `market_started` - 市集開始營業
- `market_ended` - 市集結束營業

### 商品相關
- `product_created` - 商品建立
- `product_updated` - 商品更新
- `product_deleted` - 商品刪除

### 互動相關
- `interaction_recorded` - 互動記錄
- `deal_closed` - 成交

### 設定相關
- `settings_updated` - 設定更新

## ⚠️ 注意事項

1. **商品禁止圖片**：Product 類型嚴格禁止包含圖片欄位，使用 `iconName` 和 `colorCode` 代替
2. **事件不可變**：events 表中的記錄永不修改或刪除
3. **原子性操作**：所有事件記錄都使用 transaction 確保原子性
4. **軟刪除**：商品刪除只是標記為 `isActive: false`，不真正刪除
5. **離線優先**：所有資料存於本地 IndexedDB，無需網路

## 🧪 測試頁面

訪問 `/db-test` 查看資料庫測試頁面，可以：
- 查看資料庫統計
- 建立測試資料
- 匯出/匯入資料
- 清空資料

## 📚 相關文件

- `types/db.ts` - 完整型別定義
- `lib/db/index.ts` - 資料庫定義
- `lib/db/events.ts` - 事件溯源核心
- `lib/db/hooks.ts` - React Hooks
- `STEP2_COMPLETION_REPORT.md` - 完整報告

---

**提示**：所有 Hooks 都使用 `useLiveQuery`，資料會自動響應式更新！
