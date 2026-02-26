# Market Pulse - AI 助手完整指南（第二部分）

> 接續 AI_ASSISTANT_COMPLETE_GUIDE.md

---

## 🛠️ 開發規範

### 檔案命名規範

```
組件檔案：PascalCase
  ✅ MarketCard.tsx
  ✅ AddProductForm.tsx
  ❌ market-card.tsx
  ❌ addProductForm.tsx

頁面檔案：小寫
  ✅ page.tsx
  ✅ loading.tsx
  ✅ error.tsx

工具函數：camelCase
  ✅ utils.ts
  ✅ formatCurrency.ts
  ❌ Utils.ts

常量檔案：UPPER_CASE
  ✅ CONSTANTS.ts
  ✅ EVENT_TYPES.ts
```

### 程式碼風格

#### TypeScript 嚴格模式

```typescript
// ✅ 正確：明確的類型定義
interface Market {
  id: string;
  name: string;
  status: MarketStatus;
}

function updateMarket(market: Market): Promise<void> {
  // ...
}

// ❌ 錯誤：使用 any
function updateMarket(market: any) {
  // ...
}
```

#### 客戶端組件標記

```typescript
// ✅ 正確：使用 'use client' 標記
'use client';

import { useState } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);
  // ...
}

// ❌ 錯誤：忘記標記（會導致 hydration 錯誤）
import { useState } from 'react';

export function MyComponent() {
  const [count, setCount] = useState(0);
  // ...
}
```

#### 事件處理

```typescript
// ✅ 正確：使用 recordEvent
import { recordEvent } from '@/lib/db/events';

async function handleCreateMarket(data: MarketCreatedPayload) {
  await recordEvent({
    type: 'market_created',
    payload: data,
    timestamp: Date.now(),
  });
}

// ❌ 錯誤：直接修改資料庫
async function handleCreateMarket(data: Market) {
  await db.markets.add(data);
}
```

#### React Hooks 使用

```typescript
// ✅ 正確：使用自訂 Hook
import { useMarkets } from '@/lib/db/hooks';

export function MarketsList() {
  const markets = useMarkets({ orderBy: 'startDate', order: 'desc' });
  
  if (!markets) return <Loading />;
  
  return (
    <div>
      {markets.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}

// ❌ 錯誤：直接查詢資料庫（不會自動更新）
export function MarketsList() {
  const [markets, setMarkets] = useState([]);
  
  useEffect(() => {
    db.markets.toArray().then(setMarkets);
  }, []);
  
  // ...
}
```

### 樣式規範

#### Tailwind CSS 使用

```tsx
// ✅ 正確：使用 Tailwind 類名
<button className="bg-[#7B9FA6] text-white px-6 py-3 rounded-xl hover:bg-[#6A8E95] transition-colors">
  確認
</button>

// ✅ 正確：使用 cn() 合併類名
import { cn } from '@/lib/utils';

<div className={cn(
  "bg-white rounded-xl p-4",
  isActive && "ring-2 ring-[#7B9FA6]",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
  {children}
</div>

// ❌ 錯誤：使用內聯樣式
<button style={{ backgroundColor: '#7B9FA6', color: 'white' }}>
  確認
</button>
```

#### 響應式設計

```tsx
// ✅ 正確：手機優先
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>

// ❌ 錯誤：桌面優先
<div className="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4">
  {items.map(item => <ItemCard key={item.id} item={item} />)}
</div>
```

### 錯誤處理

```typescript
// ✅ 正確：完整的錯誤處理
import { toast } from 'sonner';

async function handleSubmit() {
  try {
    await recordEvent({
      type: 'market_created',
      payload: data,
      timestamp: Date.now(),
    });
    
    toast.success('市集建立成功！');
    router.push('/markets');
  } catch (error) {
    console.error('建立市集失敗:', error);
    toast.error('建立失敗：' + (error as Error).message);
  }
}

// ❌ 錯誤：忽略錯誤
async function handleSubmit() {
  await recordEvent({
    type: 'market_created',
    payload: data,
    timestamp: Date.now(),
  });
  
  router.push('/markets');
}
```

---

## 📝 常見任務

### 任務 1：新增一個市集

```typescript
import { recordEvent } from '@/lib/db/events';
import { generateUUID } from '@/lib/db/uuid';

async function createMarket(data: {
  name: string;
  location: string;
  dates: string[];
  registrationFee: number;
  boothCost: number;
}) {
  const marketId = generateUUID();
  
  await recordEvent({
    type: 'market_created',
    payload: {
      ...data,
      startDate: data.dates[0],
      endDate: data.dates[data.dates.length - 1],
    },
    timestamp: Date.now(),
    market_id: marketId,
  });
  
  return marketId;
}
```

### 任務 2：更新市集狀態

```typescript
async function updateMarketStatus(
  marketId: string,
  oldStatus: MarketStatus,
  newStatus: MarketStatus
) {
  await recordEvent({
    type: 'market_status_changed',
    payload: {
      marketId,
      oldStatus,
      newStatus,
    },
    timestamp: Date.now(),
    market_id: marketId,
  });
}
```

### 任務 3：記錄成交

```typescript
async function recordDeal(
  marketId: string,
  items: { productId: string; quantity: number; price: number }[],
  paymentMethod: 'cash' | 'card' | 'mobile'
) {
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  await recordEvent({
    type: 'deal_closed',
    payload: {
      marketId,
      items,
      totalAmount,
      paymentMethod,
    },
    timestamp: Date.now(),
    market_id: marketId,
  });
}
```

### 任務 4：查詢市集列表

```typescript
import { useMarkets } from '@/lib/db/hooks';

function MarketsList() {
  // 查詢所有市集，按開始日期降序排列
  const markets = useMarkets({ 
    orderBy: 'startDate', 
    order: 'desc' 
  });
  
  // 篩選特定狀態
  const paidMarkets = markets?.filter(m => m.status === 'paid');
  
  // 篩選今日市集
  const today = new Date().toISOString().split('T')[0];
  const todayMarkets = markets?.filter(m => 
    m.dates?.includes(today)
  );
  
  return (
    <div>
      {markets?.map(market => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}
```

### 任務 5：新增一個頁面

```typescript
// 1. 建立頁面檔案：app/new-page/page.tsx
'use client';

import { useState } from 'react';

export default function NewPage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-medium text-white opacity-90">
            新頁面標題
          </h1>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* 內容 */}
      </div>
    </div>
  );
}

// 2. 建立載入狀態：app/new-page/loading.tsx
export default function NewPageLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* 骨架屏 */}
    </div>
  );
}

// 3. 更新底部導航：components/BottomNav.tsx
// 新增導航項目
```

### 任務 6：新增一個組件

```typescript
// components/my-component/MyComponent.tsx
'use client';

import { cn } from '@/lib/utils';

interface MyComponentProps {
  title: string;
  description?: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function MyComponent({
  title,
  description,
  isActive = false,
  onClick,
}: MyComponentProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl p-4 shadow-md transition-all",
        isActive && "ring-2 ring-[#7B9FA6]",
        onClick && "cursor-pointer hover:shadow-lg"
      )}
    >
      <h3 className="text-lg font-medium text-[#3A3A3A]">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[#6B6B6B] mt-1">
          {description}
        </p>
      )}
    </div>
  );
}
```

---

## 🔧 故障排除

### 問題 1：資料庫初始化失敗

**症狀**:
```
❌ 資料庫初始化失敗：Error: Database initialization timeout
```

**解決方案**:
```typescript
// lib/db/index.ts
export async function initializeDatabase(): Promise<void> {
  try {
    // 設置超時保護
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('資料庫初始化超時')), 8000);
    });
    
    await Promise.race([
      db.open(),
      timeoutPromise
    ]);
    
    // ...
  } catch (error) {
    console.error('❌ 資料庫初始化失敗：', error);
    
    // 嘗試重新初始化
    db.close();
    await db.open();
  }
}
```

### 問題 2：事件處理器未觸發

**症狀**:
- 事件已記錄到 `events` 表
- 但快照表（markets, products）未更新

**解決方案**:
```typescript
// 檢查事件處理器是否正確註冊
import { eventHandlers } from '@/lib/db/events';

console.log('已註冊的事件處理器:', Object.keys(eventHandlers));

// 確保事件類型正確
await recordEvent({
  type: 'market_created', // ✅ 正確
  // type: 'marketCreated', // ❌ 錯誤（不存在的類型）
  payload: data,
  timestamp: Date.now(),
});
```

### 問題 3：React Hook 不更新

**症狀**:
- 資料已更新到資料庫
- 但 UI 沒有自動更新

**解決方案**:
```typescript
// ✅ 正確：使用 useLiveQuery
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

function MyComponent() {
  const markets = useLiveQuery(
    () => db.markets.toArray()
  );
  
  // markets 會自動更新
}

// ❌ 錯誤：使用 useState + useEffect
function MyComponent() {
  const [markets, setMarkets] = useState([]);
  
  useEffect(() => {
    db.markets.toArray().then(setMarkets);
  }, []); // 只執行一次，不會自動更新
}
```

### 問題 4：TypeScript 類型錯誤

**症狀**:
```
Type 'string' is not assignable to type 'MarketStatus'
```

**解決方案**:
```typescript
// ✅ 正確：使用類型斷言或類型守衛
const status: MarketStatus = 'paid'; // 字面量類型

// 或使用類型斷言
const status = formData.status as MarketStatus;

// 或使用類型守衛
function isMarketStatus(value: string): value is MarketStatus {
  return ['registered', 'accepted', 'paid', 'ongoing', 'completed', 'postponed', 'cancelled'].includes(value);
}

if (isMarketStatus(formData.status)) {
  const status: MarketStatus = formData.status;
}
```

### 問題 5：同步衝突

**症狀**:
- 本地和雲端數據不一致
- 同步狀態顯示 'conflict'

**解決方案**:
```typescript
// 檢查衝突事件
const conflicts = await db.events
  .where('sync_status')
  .equals('conflict')
  .toArray();

console.log('衝突事件:', conflicts);

// 手動解決衝突（選擇本地或雲端版本）
for (const event of conflicts) {
  // 選擇保留本地版本
  await db.events.update(event.id!, {
    sync_status: 'pending'
  });
  
  // 或選擇放棄本地版本
  await db.events.delete(event.id!);
}
```

---

## 💰 訂閱付費系統

### 系統概述

Market Pulse 採用分層訂閱模式，提供三種方案：

| 方案 | 價格 | 核心功能 |
|------|------|----------|
| **免費版** | NT$ 0 | 單一市集、20 個商品、本地存儲 |
| **專業版** | NT$ 199/月 | 無限市集、雲端同步、3 人協作 |
| **企業版** | NT$ 499/月 | 無限協作、API 存取、專屬支援 |

### UI 組件（已完成）

#### 1. 訂閱管理頁面

**路徑**: `/subscription`

**功能**:
- 三種方案展示（PricingCard 組件）
- 當前訂閱狀態卡片
- 下次扣款日期顯示
- 付款方式管理
- 取消訂閱確認對話框
- 常見問題區塊

**使用範例**:
```typescript
// 導航到訂閱頁面
router.push('/subscription');
```

#### 2. 方案卡片組件

**檔案**: `components/subscription/PricingCard.tsx`

**使用範例**:
```typescript
import { PricingCard } from '@/components/subscription/PricingCard';

<PricingCard
  plan="pro"
  isCurrentPlan={currentPlan === 'pro'}
  onSelect={() => handleSelectPlan('pro')}
/>
```

#### 3. 升級提示橫幅

**檔案**: `components/subscription/UpgradePrompt.tsx`

**使用範例**:
```typescript
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';

// 在頁面頂部顯示
{currentPlan === 'free' && (
  <UpgradePrompt 
    message="升級至專業版，解鎖無限市集和雲端同步功能"
    showClose={true}
  />
)}
```

#### 4. 功能限制對話框

**檔案**: `components/subscription/FeatureLimitDialog.tsx`

**使用範例**:
```typescript
import { FeatureLimitDialog } from '@/components/subscription/FeatureLimitDialog';

const [showLimitDialog, setShowLimitDialog] = useState(false);

// 檢查限制
const handleAddMarket = async () => {
  const marketCount = await db.markets.count();
  
  if (currentPlan === 'free' && marketCount >= 1) {
    setShowLimitDialog(true);
    return;
  }
  
  // 繼續新增市集
};

// 顯示對話框
<FeatureLimitDialog
  isOpen={showLimitDialog}
  onClose={() => setShowLimitDialog(false)}
  title="已達市集數量上限"
  description="免費版僅支援 1 個市集，升級至專業版即可建立無限市集。"
  limitInfo="目前：1/1 個市集"
/>
```

### 待實作功能（Phase 2）

#### 1. 訂閱狀態管理

```typescript
// hooks/useSubscription.ts (待建立)
export function useSubscription() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [status, setStatus] = useState<'active' | 'cancelled' | 'expired'>('active');
  
  // 從 Supabase 讀取訂閱狀態
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setPlan(data.plan_type);
          setStatus(data.status);
        }
      });
  }, [user]);
  
  // 檢查功能限制
  const canCreateMarket = async () => {
    if (plan === 'free') {
      const count = await db.markets.count();
      return count < 1;
    }
    return true;
  };
  
  const canAddProduct = async () => {
    if (plan === 'free') {
      const count = await db.products.count();
      return count < 20;
    }
    return true;
  };
  
  return { plan, status, canCreateMarket, canAddProduct };
}
```

#### 2. 資料庫結構

```sql
-- subscriptions 表
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  plan_type TEXT NOT NULL, -- 'free', 'pro', 'enterprise'
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- usage_limits 表
CREATE TABLE usage_limits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  markets_count INT DEFAULT 0,
  products_count INT DEFAULT 0,
  staff_count INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. 付款整合（建議）

**台灣市場推薦**:
- **綠界科技（ECPay）**: 手續費 2.8%，適合小型商家
- **藍新金流（NewebPay）**: 手續費 2.5-3%，支援多元支付
- **Stripe**: 手續費 3.4% + NT$10，國際化

**實作流程**:
```
1. 用戶選擇方案
   ↓
2. 導向付款頁面（綠界/藍新）
   ↓
3. 付款成功 → Webhook 回調
   ↓
4. 更新 subscriptions 表
   ↓
5. 前端檢查訂閱狀態
   ↓
6. 解鎖功能
```

---

## 📚 參考文件

### 核心文件

| 文件 | 說明 |
|------|------|
| `.cursorrules` | 開發規則（必讀） |
| `PROJECT_CONTEXT.md` | 專案核心上下文 |
| `LOCAL_FIRST_MIGRATION_GUIDE.md` | Local-First 架構指南 |
| `AI_ASSISTANT_COMPLETE_GUIDE.md` | AI 助手完整指南 |
| `PROJECT_STRUCTURE.md` | 專案結構總覽 |
| `JAPANESE_UI_DESIGN_SYSTEM.md` | 設計系統完整文件 |
| `DATABASE_QUICK_REFERENCE.md` | 資料庫快速參考 |

### 功能文件

| 文件 | 說明 |
|------|------|
| `STEP3_FINAL_SUMMARY.md` | 市集管理功能總結 |
| `STEP4_SUMMARY.md` | 商品管理功能總結 |
| `STEP5_SUMMARY.md` | 交易系統功能總結 |
| `SUBSCRIPTION_UI_IMPLEMENTATION.md` | 訂閱付費 UI 實作報告 |

### 技術文件

| 文件 | 說明 |
|------|------|
| `PHASE-3-FINAL-REPORT.md` | 雲端同步實作報告 |
| `STAFF_MODE_SUMMARY.md` | 員工協作模式總結 |
| `PWA-SETUP.md` | PWA 設定指南 |

---

## 🎓 學習資源

### Next.js 14

- [官方文件](https://nextjs.org/docs)
- [App Router 指南](https://nextjs.org/docs/app)
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)

### Dexie.js

- [官方文件](https://dexie.org/)
- [React Hooks](https://dexie.org/docs/dexie-react-hooks/useLiveQuery())
- [事件溯源範例](https://dexie.org/docs/Tutorial/Design#event-sourcing)

### Supabase

- [官方文件](https://supabase.com/docs)
- [JavaScript 客戶端](https://supabase.com/docs/reference/javascript/introduction)
- [RLS 政策](https://supabase.com/docs/guides/auth/row-level-security)

### Tailwind CSS

- [官方文件](https://tailwindcss.com/docs)
- [響應式設計](https://tailwindcss.com/docs/responsive-design)
- [自訂配置](https://tailwindcss.com/docs/configuration)

---

## 🤝 協作指南

### 與 AI 助手協作

當你（AI 助手）協助開發時，請遵循以下原則：

1. **理解上下文**: 先閱讀 `PROJECT_CONTEXT.md` 和 `.cursorrules`
2. **遵循 Local-First**: 嚴格遵守 Local-First 架構原則
3. **資料讀取**: 所有讀取必須使用 `useLiveQuery` 或自訂 Hooks
4. **資料寫入**: 所有寫入必須使用 `recordEvent`
5. **禁止直接操作 Supabase**: UI 組件不得直接調用 Supabase
6. **事件溯源**: 所有數據變更必須通過事件溯源
7. **禁止圖片**: 絕對不要建議使用圖片功能
8. **完整測試**: 提供的程式碼必須可以直接運行
9. **斷網可用**: 確保功能在斷網時完全可用

### 提問模板

當用戶提出需求時，可以使用以下模板確認：

```
我理解您想要：[需求摘要]

這個功能涉及：
- 資料庫變更：[是/否]
- 新增頁面：[是/否]
- UI 組件：[列出組件]
- 事件類型：[列出事件]

Local-First 檢查：
- ✅ 資料讀取使用 useLiveQuery
- ✅ 資料寫入使用 recordEvent
- ✅ 不直接操作 Supabase
- ✅ 斷網時完全可用

我將會：
1. [步驟 1]
2. [步驟 2]
3. [步驟 3]

預計影響的檔案：
- [檔案 1]
- [檔案 2]

是否開始實作？
```

---

## 📞 聯絡資訊

如有問題或建議，請參考專案文件或聯繫專案負責人。

---

**文檔版本**: v2.0  
**最後更新**: 2026-02-24  
**維護者**: Market Pulse 開發團隊
