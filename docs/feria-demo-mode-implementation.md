# Féria Demo Mode 實作文件

> 專案：`KL-4ndroid/markit`  
> 分支：`main`  
> 目標：建立一個安全隔離、可互動、可對外展示的 Féria Demo Mode。

---

## 1. 任務目標

目前 `markit` 已進入封閉測試階段，正式 App 已具備真實資料、登入、同步、權限與市集管理流程。Demo Mode 的目標不是取代正式功能，而是建立一個 **不碰正式資料、不影響封閉測試、不依賴登入狀態** 的展示型互動介面。

Demo Mode 應可用於：

- Landing Page 的「體驗介面預覽」入口
- IG / Threads 產品開發分享
- 內測招募展示
- 對外 Demo，不暴露真實品牌資料
- 教學影片與產品截圖
- 未來 onboarding / sample workspace 的基礎

核心定位：

> **Féria｜出攤筆記**  
> **獨立品牌的市集經營筆記**

Demo Mode 應讓使用者在 1–2 分鐘內理解 Féria 的價值：

> 記錄市集、商品、成本與成果，讓每一次出攤都成為品牌成長的線索。

---

## 2. 關鍵原則

### 2.1 不改動正式資料流程

Demo Mode 必須與正式 App 資料完全隔離。

不得在 Demo Mode 內使用：

```ts
useMarkets
useMonthlyStats
useAuth
useUserRole
useSyncContext
useLiveMetrics
useProducts
useSales
useCosts
```

也不得直接呼叫：

```ts
Dexie / IndexedDB write
Supabase client write
sync service
role permission service
owner/staff permission gate
```

Demo Mode 僅可使用：

```ts
useState
useMemo
useCallback
local component state
static demo data
demo calculation helpers
```

### 2.2 不影響權限設計

本任務 **不得修改** staff role / viewer / operator / manager / owner 的權限分配、資料可見度、操作權限、`PermissionGate`、`useUserRole`、sync / Dexie 權限行為。

若未來任務需要改動上述任何權限邏輯，必須同步更新專案中的權限分布 Markdown 文件。

本次 Demo Mode 僅新增獨立展示路由，不應觸碰權限系統。

### 2.3 不新增不必要套件

專案已包含 Next.js、React、Tailwind、lucide-react、recharts 等套件。Demo Mode 第一版不需要新增外部套件。

### 2.4 不與正式 App 互相污染

Demo Mode 應放在獨立 route 與獨立 components：

```txt
app/demo/page.tsx
components/demo/*
lib/demo/*
```

避免改動正式首頁 `app/page.tsx`，除非只是增加一個前往 demo 的入口，而且必須不影響登入與正式資料載入。

---

## 3. 建議新增檔案

請新增以下檔案：

```txt
app/demo/page.tsx
components/demo/FeriaDemoApp.tsx
components/demo/FeriaDemoShell.tsx
components/demo/FeriaDemoSidebar.tsx
components/demo/FeriaDemoStatCard.tsx
components/demo/FeriaDemoMarketTabs.tsx
components/demo/FeriaDemoSalesChart.tsx
components/demo/FeriaDemoProductRanking.tsx
components/demo/FeriaDemoMarketSummary.tsx
components/demo/FeriaDemoActionPanel.tsx
components/demo/FeriaDemoProductDrawer.tsx
lib/demo/feria-demo-data.ts
lib/demo/feria-demo-calculations.ts
lib/demo/feria-demo-types.ts
```

若希望第一版更精簡，也可以先只新增：

```txt
app/demo/page.tsx
components/demo/FeriaDemoApp.tsx
lib/demo/feria-demo-data.ts
lib/demo/feria-demo-calculations.ts
```

等第一版穩定後再拆小元件。

---

## 4. Route 設計

### 4.1 新增 `/demo`

建立：

```txt
app/demo/page.tsx
```

內容只負責載入 Demo App：

```tsx
import { FeriaDemoApp } from '@/components/demo/FeriaDemoApp';

export const metadata = {
  title: 'Féria Demo｜出攤筆記',
  description: '體驗 Féria｜出攤筆記的互動示範介面。',
};

export default function DemoPage() {
  return <FeriaDemoApp />;
}
```

### 4.2 不要求登入

`/demo` 不應包在需要登入的 guard 裡。若專案有全域 layout 驗證，請確認 `/demo` 可公開瀏覽或至少不讀取真實帳號資料。

若目前 layout 已全域套用 auth provider 可以保留，但 Demo Page 內不可依賴 `user`。

---

## 5. Demo 資料設計

建立：

```txt
lib/demo/feria-demo-types.ts
```

建議型別：

```ts
export type DemoMarket = {
  id: string;
  name: string;
  location: string;
  date: string;
  city: string;
  weather: string;
  boothFee: number;
  transportCost: number;
  note: string;
};

export type DemoProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  unitCost: number;
  stock: number;
};

export type DemoSale = {
  id: string;
  marketId: string;
  productId: string;
  quantity: number;
  soldAt: string;
};

export type DemoExpense = {
  id: string;
  marketId: string;
  type: '攤位費' | '交通' | '包材' | '材料耗損' | '餐飲' | '其他';
  amount: number;
  note: string;
};
```

---

## 6. Demo 假資料內容

建立：

```txt
lib/demo/feria-demo-data.ts
```

建議資料語境要符合「獨立品牌」，不要只限手作。

範例品牌：

```ts
export const demoBrand = {
  name: '小島週末製作所',
  owner: 'Mina',
  plan: 'Studio Preview',
  tagline: '香氛、甜點與紙品的週末市集品牌',
};
```

範例市集：

```ts
export const demoMarkets = [
  {
    id: 'market-forest',
    name: '森之市',
    location: '台中草悟道',
    city: '台中',
    date: '2026-06-13',
    weather: '晴時多雲',
    boothFee: 2200,
    transportCost: 650,
    note: '午後人潮穩定，香氛與小禮盒詢問度高。',
  },
  {
    id: 'market-island',
    name: '島嶼生活市集',
    location: '高雄駁二大義',
    city: '高雄',
    date: '2026-06-20',
    weather: '晴朗偏熱',
    boothFee: 2600,
    transportCost: 900,
    note: '觀光客較多，單價較低的商品轉換率佳。',
  },
  {
    id: 'market-dusk',
    name: '黃昏甜點祭',
    location: '台南藍晒圖',
    city: '台南',
    date: '2026-06-27',
    weather: '午後陣雨',
    boothFee: 1800,
    transportCost: 500,
    note: '雨後人潮回升，甜點禮盒在傍晚售出明顯增加。',
  },
] satisfies DemoMarket[];
```

範例商品：

```ts
export const demoProducts = [
  {
    id: 'product-earrings',
    name: '海鹽雛菊耳飾',
    category: '飾品',
    price: 580,
    unitCost: 180,
    stock: 18,
  },
  {
    id: 'product-candle',
    name: '森林薄霧香氛蠟燭',
    category: '香氛',
    price: 680,
    unitCost: 260,
    stock: 12,
  },
  {
    id: 'product-dessert',
    name: '檸檬塔禮盒',
    category: '甜點',
    price: 420,
    unitCost: 190,
    stock: 24,
  },
  {
    id: 'product-card',
    name: '似顏繪小卡',
    category: '插畫',
    price: 320,
    unitCost: 80,
    stock: 30,
  },
  {
    id: 'product-zakka',
    name: '島嶼小花束',
    category: '生活選物',
    price: 480,
    unitCost: 210,
    stock: 16,
  },
] satisfies DemoProduct[];
```

範例銷售與成本可依市集分散，數字要能算出漂亮但可信的結果。

---

## 7. 計算邏輯

建立：

```txt
lib/demo/feria-demo-calculations.ts
```

建議函式：

```ts
import type { DemoExpense, DemoMarket, DemoProduct, DemoSale } from './feria-demo-types';

export function getSaleRevenue(sale: DemoSale, products: DemoProduct[]) {
  const product = products.find((item) => item.id === sale.productId);
  return product ? product.price * sale.quantity : 0;
}

export function getSaleCost(sale: DemoSale, products: DemoProduct[]) {
  const product = products.find((item) => item.id === sale.productId);
  return product ? product.unitCost * sale.quantity : 0;
}

export function getMarketRevenue(marketId: string, sales: DemoSale[], products: DemoProduct[]) {
  return sales
    .filter((sale) => sale.marketId === marketId)
    .reduce((total, sale) => total + getSaleRevenue(sale, products), 0);
}

export function getMarketProductCost(marketId: string, sales: DemoSale[], products: DemoProduct[]) {
  return sales
    .filter((sale) => sale.marketId === marketId)
    .reduce((total, sale) => total + getSaleCost(sale, products), 0);
}

export function getMarketExpenses(marketId: string, expenses: DemoExpense[]) {
  return expenses
    .filter((expense) => expense.marketId === marketId)
    .reduce((total, expense) => total + expense.amount, 0);
}

export function getMarketProfit(
  marketId: string,
  sales: DemoSale[],
  products: DemoProduct[],
  expenses: DemoExpense[]
) {
  const revenue = getMarketRevenue(marketId, sales, products);
  const productCost = getMarketProductCost(marketId, sales, products);
  const otherExpenses = getMarketExpenses(marketId, expenses);
  return revenue - productCost - otherExpenses;
}

export function getTopProducts(sales: DemoSale[], products: DemoProduct[]) {
  const totals = new Map<string, { product: DemoProduct; quantity: number; revenue: number; profit: number }>();

  for (const sale of sales) {
    const product = products.find((item) => item.id === sale.productId);
    if (!product) continue;

    const current = totals.get(product.id) ?? {
      product,
      quantity: 0,
      revenue: 0,
      profit: 0,
    };

    current.quantity += sale.quantity;
    current.revenue += product.price * sale.quantity;
    current.profit += (product.price - product.unitCost) * sale.quantity;
    totals.set(product.id, current);
  }

  return Array.from(totals.values()).sort((a, b) => b.revenue - a.revenue);
}
```

---

## 8. Demo UI 結構

### 8.1 `FeriaDemoApp.tsx`

責任：

- 管理 Demo state
- 管理目前 active tab
- 管理目前 selected market
- 管理 selected product
- 處理新增假銷售 / 假成本
- 傳資料給子元件

建議 state：

```ts
const [activeTab, setActiveTab] = useState<'overview' | 'markets' | 'products' | 'sales' | 'expenses' | 'review'>('overview');
const [selectedMarketId, setSelectedMarketId] = useState(demoMarkets[0].id);
const [sales, setSales] = useState<DemoSale[]>(demoSales);
const [expenses, setExpenses] = useState<DemoExpense[]>(demoExpenses);
const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
```

互動處理：

```ts
function addDemoSale(productId: string, quantity: number) {
  setSales((current) => [
    ...current,
    {
      id: `sale-demo-${Date.now()}`,
      marketId: selectedMarketId,
      productId,
      quantity,
      soldAt: new Date().toISOString(),
    },
  ]);
}

function addDemoExpense(type: DemoExpense['type'], amount: number, note: string) {
  setExpenses((current) => [
    ...current,
    {
      id: `expense-demo-${Date.now()}`,
      marketId: selectedMarketId,
      type,
      amount,
      note,
    },
  ]);
}
```

### 8.2 `FeriaDemoShell.tsx`

責任：

- Demo 外框
- 品牌 Header
- 桌面 sidebar / 手機 tab bar
- 右上角 Demo badge

視覺要接近 Féria landing page：

- 背景：霧米白 / ivory
- 主色：深橄欖綠
- 卡片：cream、細邊框、柔和陰影
- 避免太強烈漸層

### 8.3 `FeriaDemoSidebar.tsx`

選單：

```txt
總覽
市集筆記
商品紀錄
銷售整理
成本筆記
回顧分析
```

桌機版 sidebar，手機版可改成水平 pills。

### 8.4 `FeriaDemoStatCard.tsx`

顯示：

- 本週營收
- 本週淨利
- 出攤場次
- 商品銷售數

### 8.5 `FeriaDemoMarketTabs.tsx`

功能：

- 顯示市集列表
- 點擊切換 selected market
- 切換後更新成果摘要、商品排行、成本資訊

### 8.6 `FeriaDemoActionPanel.tsx`

提供兩個簡易互動：

#### 新增一筆銷售

欄位：

- 商品 select
- 數量 stepper / input
- 按鈕：`新增銷售`

新增後：

- Dashboard 數字更新
- 商品排行更新
- 顯示 toast / inline success message

#### 新增一筆成本

欄位：

- 成本類型 select
- 金額 input
- 備註 input
- 按鈕：`新增成本`

新增後：

- 淨利更新
- 成本明細更新
- 顯示 success message

---

## 9. 建議畫面內容

### 9.1 Overview

應呈現：

- 品牌名稱：小島週末製作所
- Demo badge：Demo Mode
- 本週營收
- 本週淨利
- 出攤場次
- 商品銷售數
- 市集成果趨勢圖
- 商品銷售排行
- 本週市集摘要

### 9.2 市集筆記

每張市集卡顯示：

- 市集名稱
- 日期
- 地點
- 天氣
- 營收
- 成本
- 淨利
- 心得 note

### 9.3 商品紀錄

商品卡顯示：

- 商品名稱
- 分類
- 售價
- 成本
- 庫存
- 累積銷售
- 毛利

### 9.4 銷售整理

顯示：

- 新增銷售 panel
- 近期銷售列表
- 商品排行

### 9.5 成本筆記

顯示：

- 新增成本 panel
- 成本分類列表
- 該市集成本總額

### 9.6 回顧分析

顯示簡短 insight：

- 哪場市集淨利最高
- 哪個商品最值得補貨
- 哪項成本需要注意
- 下次出攤建議

範例文案：

```txt
森之市的淨利率最高，雖然營收不是最高，但成本控制最好，適合下次優先報名。

海鹽雛菊耳飾目前銷售數最高，但森林薄霧香氛蠟燭的單件利潤更好，建議下次增加 20% 備貨。
```

---

## 10. 視覺設計規範

Demo Mode 需與 Féria landing page 品牌一致。

建議色彩：

```txt
ivory: #F8F3EA
cream: #FFFDF7
paper: #F4EDE2
olive: #24381F
moss: #5F7358
taupe: #A89580
line: #E2D6C7
ink: #263021
muted: #776B5C
```

若正式 App 現在已有 theme token，請先使用現有 token，不要大規模重構全站主題。

Demo Mode 可局部使用 Tailwind arbitrary color 或新增 demo 專用 class，但不要破壞正式 App 的設計系統。

### 元件視覺

- 外框：`rounded-[2rem]`
- 卡片：`rounded-3xl border bg-white/70 shadow-sm`
- 主按鈕：深橄欖綠背景，cream 文字
- 次按鈕：cream 背景，line border，olive 文字
- badge：taupe / paper 背景
- 圖表：olive / sage

---

## 11. 技術注意事項

### 11.1 Client Component

Demo 有互動，`FeriaDemoApp.tsx` 應使用：

```tsx
'use client';
```

### 11.2 不使用 server action

第一版不需要 server action。

### 11.3 不寫入 localStorage

第一版建議只用 React state，使用者刷新後資料重置即可。

若未來要展示更完整體驗，再考慮 localStorage，但需清楚標示 demo data。

### 11.4 不新增 API route

Demo Mode 不需要 API route。

### 11.5 不新增權限例外

不要為 Demo 新增特別 role，也不要改動登入 guard。如果 `/demo` 被 layout 擋住，請改 route 結構或 layout 邏輯，但不要改動正式權限判斷。

---

## 12. 與 Landing Page 串接建議

若 landing page 是獨立 repo `boothbook-landing`，可以在 CTA 中加入：

```txt
體驗 Demo
```

連到正式 App 部署網址：

```txt
https://<markit-app-domain>/demo
```

若未來兩個 repo 合併，則可直接用：

```txt
/demo
```

Landing Page 文案可寫：

```txt
想先看看 Féria 怎麼幫你整理市集成果？
可以先體驗 Demo Mode，使用的是範例資料，不會儲存任何操作。
```

---

## 13. 驗收標準

### 功能驗收

- `/demo` 可直接開啟
- 不需要登入
- 不讀取正式資料
- 不寫入 Dexie
- 不寫入 Supabase
- 可切換市集
- 可切換 tab
- 可新增假銷售
- 可新增假成本
- 新增後統計數字會即時更新
- 商品排行會隨新增銷售更新
- 淨利會隨新增成本更新

### 視覺驗收

- 與 Féria landing page 的深橄欖綠、霧米白、暖卡其棕一致
- 不像一般 SaaS template
- 不過度可愛
- 有市集與筆記的視覺感
- 手機版可正常瀏覽與操作

### 安全驗收

- 不 import 正式資料 hooks
- 不 import sync context
- 不 import auth context
- 不 import role hooks
- 不改動 staff / owner 權限邏輯
- 不修改既有 DB schema
- 不新增 migration

### Build 驗收

執行：

```bash
npm run build
```

若專案 lint 可用，也執行：

```bash
npm run lint
```

---

## 14. 建議 commit message

```txt
feat: add interactive Feria demo mode
```

若只先加入文件：

```txt
docs: add Feria demo mode implementation plan
```

---

## 15. 第一版實作範圍建議

第一版請控制範圍，不要一次做成完整正式 App。

建議 MVP：

- `/demo` route
- 1 個完整 dashboard shell
- 6 個 tab，但部分 tab 可以先共用 layout
- 3 場 demo 市集
- 5 個 demo 商品
- 15–25 筆 demo sales
- 6–10 筆 demo expenses
- 新增銷售互動
- 新增成本互動
- 商品排行與淨利即時更新

完成第一版後，再評估是否加入：

- demo onboarding
- demo reset button
- demo screenshot mode
- demo mobile-first app shell
- landing page iframe / image preview

---

## 16. 最後提醒

Demo Mode 的價值不在於功能多，而在於讓使用者快速感受到：

> 原來 Féria 不是叫我多記一份資料，  
> 而是幫我把出攤後最混亂的收入、商品、成本與成果整理成能判斷方向的筆記。

請優先讓 Demo 具備：

- 一眼看懂
- 可以操作
- 數字會變
- 視覺有質感
- 不碰正式資料

這樣就足夠作為封閉測試階段的對外展示版本。
