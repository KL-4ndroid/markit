'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Package,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import {
  demoBrand,
  demoExpenses,
  demoMarkets,
  demoProducts,
  demoSales,
} from '@/lib/demo/feria-demo-data';
import {
  getExpenseBreakdown,
  getMarketExpenses,
  getMarketProfit,
  getMarketProductCost,
  getMarketRevenue,
  getProductSalesQuantity,
  getTopProducts,
  getTotalExpenses,
  getTotalProductCost,
  getTotalProfit,
  getTotalRevenue,
} from '@/lib/demo/feria-demo-calculations';
import type { DemoExpense, DemoProduct, DemoSale, DemoTabKey } from '@/lib/demo/feria-demo-types';

const FERIA = {
  ivory: '#F8F3EA',
  cream: '#FFFDF7',
  paper: '#F4EDE2',
  olive: '#24381F',
  moss: '#5F7358',
  taupe: '#A89580',
  line: '#E2D6C7',
  ink: '#263021',
  muted: '#776B5C',
};

const tabs: Array<{ key: DemoTabKey; label: string; icon: typeof Store }> = [
  { key: 'overview', label: '總覽', icon: Store },
  { key: 'markets', label: '市集筆記', icon: CalendarDays },
  { key: 'products', label: '商品紀錄', icon: Package },
  { key: 'sales', label: '銷售整理', icon: CircleDollarSign },
  { key: 'expenses', label: '成本筆記', icon: ReceiptText },
  { key: 'review', label: '回顧分析', icon: BarChart3 },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(value));
}

function FeriaMark({ className = 'h-12 w-12' }: { className?: string }) {
  return (
    <svg className={className} width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
      <path d="M48 11V34" stroke={FERIA.olive} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="48" cy="10" r="2.1" fill={FERIA.olive} />
      <path d="M48 14L65.5 19.5L48 25V14Z" fill="#B7A68F" />
      <path d="M48 34C40.5 36.5 29.5 42.3 18.7 50.5C15.5 52.9 11.1 52.2 9.7 49.2C8.8 47.2 9.8 45.1 12.1 43.6C22.2 37.3 35.3 33.8 48 34Z" fill={FERIA.olive} />
      <path d="M48 34C42 39.4 38.7 47.1 35.2 57.1C34 60.6 29.5 60.9 27.6 58.2C26.7 56.9 26.6 55.3 27.2 53.9C31.6 44 38 37.3 48 34Z" fill={FERIA.olive} />
      <path d="M48 34C54 39.4 57.3 47.1 60.8 57.1C62 60.6 66.5 60.9 68.4 58.2C69.3 56.9 69.4 55.3 68.8 53.9C64.4 44 58 37.3 48 34Z" fill={FERIA.olive} />
      <path d="M48 34C55.5 36.5 66.5 42.3 77.3 50.5C80.5 52.9 84.9 52.2 86.3 49.2C87.2 47.2 86.2 45.1 83.9 43.6C73.8 37.3 60.7 33.8 48 34Z" fill={FERIA.olive} />
      <path d="M19.5 50V86" stroke={FERIA.olive} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M19.5 57H27" stroke={FERIA.olive} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M19.5 67H27" stroke={FERIA.olive} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M19.5 77H27" stroke={FERIA.olive} strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="29.2" cy="57" r="2.1" fill={FERIA.olive} />
      <circle cx="29.2" cy="67" r="2.1" fill={FERIA.olive} />
      <circle cx="29.2" cy="77" r="2.1" fill={FERIA.olive} />
      <path d="M42 57H76" stroke={FERIA.taupe} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M42 67H76" stroke={FERIA.taupe} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M42 77H76" stroke={FERIA.taupe} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M42 86H70" stroke={FERIA.taupe} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[1.5rem] border border-[#E2D6C7] bg-[#FFFDF7]/82 p-5 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
      <p className="text-xs font-semibold tracking-[0.12em] text-[#776B5C]">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-[#263021]">{value}</p>
      <p className="mt-2 text-xs font-medium text-[#5F7358]">{note}</p>
    </div>
  );
}

function MarketTabs({ selectedMarketId, onSelect }: { selectedMarketId: string; onSelect: (id: string) => void }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {demoMarkets.map((market) => {
        const active = market.id === selectedMarketId;
        return (
          <button
            key={market.id}
            onClick={() => onSelect(market.id)}
            className={`min-w-[180px] rounded-[1.35rem] border px-4 py-3 text-left transition ${
              active
                ? 'border-[#24381F] bg-[#24381F] text-[#FFFDF7] shadow-[0_18px_48px_rgba(38,48,33,0.16)]'
                : 'border-[#E2D6C7] bg-[#FFFDF7]/78 text-[#263021] hover:border-[#A89580]'
            }`}
          >
            <p className="text-sm font-semibold">{market.name}</p>
            <p className={`mt-1 text-xs ${active ? 'text-[#FFFDF7]/76' : 'text-[#776B5C]'}`}>{market.city}・{formatDate(market.date)}</p>
          </button>
        );
      })}
    </div>
  );
}

function SalesChart({ summaries }: { summaries: Array<{ marketId: string; name: string; revenue: number; profit: number }> }) {
  const maxRevenue = Math.max(...summaries.map((item) => item.revenue), 1);

  return (
    <div className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-6 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A89580]">Market Trend</p>
          <h3 className="mt-1 text-lg font-semibold text-[#263021]">市集成果趨勢</h3>
        </div>
        <span className="rounded-full bg-[#F4EDE2] px-3 py-1 text-xs font-semibold text-[#5F7358]">營收 / 淨利</span>
      </div>

      <div className="flex h-56 items-end gap-4 border-b border-l border-[#E2D6C7] px-3 pb-3">
        {summaries.map((item) => {
          const revenueHeight = Math.max(18, Math.round((item.revenue / maxRevenue) * 100));
          const profitHeight = Math.max(12, Math.round((item.profit / maxRevenue) * 100));
          return (
            <div key={item.marketId} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1.5">
                <div style={{ height: `${revenueHeight}%` }} className="w-4 rounded-t-full bg-[#24381F]" />
                <div style={{ height: `${profitHeight}%` }} className="w-4 rounded-t-full bg-[#A9AD93]" />
              </div>
              <span className="max-w-[70px] truncate text-[11px] font-medium text-[#776B5C]">{item.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductRanking({ topProducts, onSelect }: {
  topProducts: ReturnType<typeof getTopProducts>;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-6 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A89580]">Top Products</p>
          <h3 className="mt-1 text-lg font-semibold text-[#263021]">商品銷售排行</h3>
        </div>
      </div>
      <div className="space-y-3">
        {topProducts.slice(0, 5).map((item, index) => (
          <button
            key={item.product.id}
            onClick={() => onSelect(item.product.id)}
            className="flex w-full items-center gap-3 rounded-[1.35rem] bg-[#F8F3EA]/82 p-4 text-left transition hover:bg-[#F4EDE2]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A89580]/18 text-sm font-semibold text-[#24381F]">{index + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#263021]">{item.product.name}</p>
              <p className="text-xs text-[#776B5C]">{item.quantity} 件・毛利 {formatCurrency(item.profit)}</p>
            </div>
            <p className="text-sm font-semibold text-[#263021]">{formatCurrency(item.revenue)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionPanel({
  selectedMarketId,
  onAddSale,
  onAddExpense,
}: {
  selectedMarketId: string;
  onAddSale: (productId: string, quantity: number) => void;
  onAddExpense: (type: DemoExpense['type'], amount: number, note: string) => void;
}) {
  const [productId, setProductId] = useState(demoProducts[0].id);
  const [quantity, setQuantity] = useState(1);
  const [expenseType, setExpenseType] = useState<DemoExpense['type']>('包材');
  const [amount, setAmount] = useState(180);
  const [note, setNote] = useState('現場補購包材');
  const [feedback, setFeedback] = useState<string | null>(null);

  const selectedMarket = demoMarkets.find((market) => market.id === selectedMarketId) ?? demoMarkets[0];

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  }

  return (
    <div className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-6 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A89580]">Try It</p>
          <h3 className="mt-1 text-lg font-semibold text-[#263021]">模擬記一筆</h3>
          <p className="mt-1 text-xs text-[#776B5C]">目前市集：{selectedMarket.name}</p>
        </div>
        <Sparkles className="h-5 w-5 text-[#A89580]" />
      </div>

      <div className="space-y-5">
        <div className="rounded-[1.5rem] border border-[#E2D6C7] bg-[#F8F3EA]/70 p-4">
          <p className="mb-3 text-sm font-semibold text-[#263021]">新增一筆銷售</p>
          <div className="grid gap-3 sm:grid-cols-[1fr_90px]">
            <select
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              className="rounded-2xl border border-[#E2D6C7] bg-[#FFFDF7] px-4 py-3 text-sm text-[#263021] outline-none focus:border-[#A89580]"
            >
              {demoProducts.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              max={20}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))}
              className="rounded-2xl border border-[#E2D6C7] bg-[#FFFDF7] px-4 py-3 text-sm text-[#263021] outline-none focus:border-[#A89580]"
              aria-label="銷售數量"
            />
          </div>
          <button
            onClick={() => {
              onAddSale(productId, quantity);
              showFeedback('已新增一筆銷售，總覽與排行已更新。');
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#24381F] px-5 py-3 text-sm font-semibold text-[#FFFDF7] transition hover:bg-[#3E5637]"
          >
            <Plus className="h-4 w-4" />
            新增銷售
          </button>
        </div>

        <div className="rounded-[1.5rem] border border-[#E2D6C7] bg-[#F8F3EA]/70 p-4">
          <p className="mb-3 text-sm font-semibold text-[#263021]">新增一筆成本</p>
          <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
            <select
              value={expenseType}
              onChange={(event) => setExpenseType(event.target.value as DemoExpense['type'])}
              className="rounded-2xl border border-[#E2D6C7] bg-[#FFFDF7] px-4 py-3 text-sm text-[#263021] outline-none focus:border-[#A89580]"
            >
              {(['攤位費', '交通', '包材', '材料耗損', '餐飲', '其他'] as DemoExpense['type'][]).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(Math.max(1, Number(event.target.value)))}
              className="rounded-2xl border border-[#E2D6C7] bg-[#FFFDF7] px-4 py-3 text-sm text-[#263021] outline-none focus:border-[#A89580]"
              aria-label="成本金額"
            />
          </div>
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="mt-3 w-full rounded-2xl border border-[#E2D6C7] bg-[#FFFDF7] px-4 py-3 text-sm text-[#263021] outline-none focus:border-[#A89580]"
            placeholder="備註，例如：現場補購包材"
          />
          <button
            onClick={() => {
              onAddExpense(expenseType, amount, note || expenseType);
              showFeedback('已新增一筆成本，淨利已重新計算。');
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E2D6C7] bg-[#FFFDF7] px-5 py-3 text-sm font-semibold text-[#24381F] transition hover:border-[#A89580]"
          >
            <Plus className="h-4 w-4" />
            新增成本
          </button>
        </div>

        {feedback && (
          <div className="rounded-2xl border border-[#A9AD93]/60 bg-[#A9AD93]/14 px-4 py-3 text-sm font-semibold text-[#24381F]">
            {feedback}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductDrawer({ product, sales, onClose }: { product: DemoProduct; sales: DemoSale[]; onClose: () => void }) {
  const sold = getProductSalesQuantity(product.id, sales);
  const revenue = sold * product.price;
  const profit = sold * (product.price - product.unitCost);

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-[#263021]/30 p-4 backdrop-blur-sm sm:items-center sm:justify-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7] p-6 shadow-[0_28px_90px_rgba(38,48,33,0.22)]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A89580]">Product Note</p>
            <h3 className="mt-2 text-2xl font-semibold text-[#263021]">{product.name}</h3>
            <p className="mt-1 text-sm text-[#776B5C]">{product.category}</p>
          </div>
          <button onClick={onClose} className="rounded-full border border-[#E2D6C7] p-2 text-[#776B5C] hover:text-[#24381F]" aria-label="關閉商品詳情">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="售價" value={formatCurrency(product.price)} note={`成本 ${formatCurrency(product.unitCost)}`} />
          <StatCard label="庫存" value={`${product.stock} 件`} note="Demo 庫存" />
          <StatCard label="已售" value={`${sold} 件`} note="累積銷售" />
          <StatCard label="毛利" value={formatCurrency(profit)} note={`營收 ${formatCurrency(revenue)}`} />
        </div>

        <p className="mt-5 rounded-2xl bg-[#F8F3EA] p-4 text-sm leading-7 text-[#776B5C]">
          這個商品在 Demo 資料中用來展示銷售排行、庫存判斷與補貨方向。點擊「新增銷售」後，排行與總覽會即時更新。
        </p>
      </div>
    </div>
  );
}

export function FeriaDemoApp() {
  const [activeTab, setActiveTab] = useState<DemoTabKey>('overview');
  const [selectedMarketId, setSelectedMarketId] = useState(demoMarkets[0].id);
  const [sales, setSales] = useState<DemoSale[]>(demoSales);
  const [expenses, setExpenses] = useState<DemoExpense[]>(demoExpenses);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const selectedMarket = demoMarkets.find((market) => market.id === selectedMarketId) ?? demoMarkets[0];
  const selectedProduct = selectedProductId ? demoProducts.find((product) => product.id === selectedProductId) : null;

  const marketSummaries = useMemo(() => demoMarkets.map((market) => {
    const revenue = getMarketRevenue(market.id, sales, demoProducts);
    const productCost = getMarketProductCost(market.id, sales, demoProducts);
    const otherExpenses = getMarketExpenses(market.id, expenses);
    const profit = revenue - productCost - otherExpenses;
    return {
      marketId: market.id,
      name: market.name,
      revenue,
      productCost,
      expenses: otherExpenses,
      profit,
      margin: revenue > 0 ? Math.round((profit / revenue) * 100) : 0,
    };
  }), [expenses, sales]);

  const currentMarketSummary = marketSummaries.find((summary) => summary.marketId === selectedMarketId) ?? marketSummaries[0];
  const allRevenue = getTotalRevenue(sales, demoProducts);
  const allProductCost = getTotalProductCost(sales, demoProducts);
  const allExpenses = getTotalExpenses(expenses);
  const allProfit = getTotalProfit(sales, demoProducts, expenses);
  const allSold = sales.reduce((total, sale) => total + sale.quantity, 0);
  const topProducts = getTopProducts(sales, demoProducts);
  const currentExpenses = expenses.filter((expense) => expense.marketId === selectedMarketId);
  const currentSales = sales.filter((sale) => sale.marketId === selectedMarketId);
  const expenseBreakdown = getExpenseBreakdown(currentExpenses);
  const bestMarket = [...marketSummaries].sort((a, b) => b.profit - a.profit)[0];
  const bestProfitProduct = [...topProducts].sort((a, b) => b.profit - a.profit)[0];

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

  function resetDemo() {
    setSales(demoSales);
    setExpenses(demoExpenses);
    setSelectedMarketId(demoMarkets[0].id);
    setActiveTab('overview');
    setSelectedProductId(null);
  }

  return (
    <div className="min-h-screen bg-[#F8F3EA] text-[#263021]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,149,128,0.18),transparent_28rem),radial-gradient(circle_at_92%_12%,rgba(95,115,88,0.12),transparent_30rem)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/82 p-5 shadow-[0_24px_70px_rgba(38,48,33,0.08)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] border border-[#E2D6C7] bg-[#FFFDF7]">
              <FeriaMark className="h-11 w-11" />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline gap-2">
                <h1 className="font-serif text-3xl font-semibold tracking-[-0.04em] text-[#24381F]">Féria</h1>
                <span className="h-7 w-px bg-[#E2D6C7]" />
                <p className="text-lg font-semibold tracking-[0.18em] text-[#24381F]">出攤筆記</p>
              </div>
              <p className="mt-1 text-xs font-semibold tracking-[0.18em] text-[#A89580]">獨立品牌的市集經營筆記</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-[#E2D6C7] bg-[#F4EDE2] px-4 py-2 text-xs font-semibold text-[#776B5C]">Demo Mode・範例資料</span>
            <button
              onClick={resetDemo}
              className="inline-flex items-center gap-2 rounded-full border border-[#E2D6C7] bg-[#FFFDF7] px-4 py-2 text-sm font-semibold text-[#24381F] transition hover:border-[#A89580]"
            >
              <RefreshCw className="h-4 w-4" />
              重置 Demo
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/82 p-4 shadow-[0_24px_70px_rgba(38,48,33,0.07)] backdrop-blur-xl lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <div className="mb-6 rounded-[1.5rem] bg-[#F4EDE2] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A89580]">Workspace</p>
              <h2 className="mt-2 text-lg font-semibold text-[#263021]">{demoBrand.name}</h2>
              <p className="mt-1 text-xs leading-5 text-[#776B5C]">{demoBrand.tagline}</p>
            </div>

            <nav className="flex gap-2 overflow-x-auto lg:block lg:space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex min-w-max items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm font-semibold transition lg:w-full ${
                      active
                        ? 'bg-[#24381F] text-[#FFFDF7] shadow-[0_14px_40px_rgba(38,48,33,0.18)]'
                        : 'text-[#776B5C] hover:bg-[#F4EDE2] hover:text-[#24381F]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 space-y-6 pb-10">
            <section className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/74 p-5 shadow-[0_24px_70px_rgba(38,48,33,0.07)] backdrop-blur-xl md:p-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#A89580]">FÉRIA OVERVIEW</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#263021]">{tabs.find((tab) => tab.key === activeTab)?.label}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[#776B5C]">
                    這是一個不連正式資料的互動 Demo。你可以切換市集、記一筆銷售或成本，觀察營收、淨利與商品排行如何同步更新。
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[#E2D6C7] bg-[#FFFDF7] px-4 py-3 text-sm font-semibold text-[#776B5C]">
                  目前查看：<span className="text-[#24381F]">{selectedMarket.name}</span>
                </div>
              </div>

              <MarketTabs selectedMarketId={selectedMarketId} onSelect={setSelectedMarketId} />
            </section>

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard label="本週營收" value={formatCurrency(allRevenue)} note={`商品成本 ${formatCurrency(allProductCost)}`} />
                  <StatCard label="本週淨利" value={formatCurrency(allProfit)} note={`利潤率 ${allRevenue ? Math.round((allProfit / allRevenue) * 100) : 0}%`} />
                  <StatCard label="出攤場次" value={`${demoMarkets.length} 場`} note="範例市集資料" />
                  <StatCard label="商品銷售數" value={`${allSold} 件`} note="新增銷售會即時更新" />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
                  <SalesChart summaries={marketSummaries} />
                  <ProductRanking topProducts={topProducts} onSelect={setSelectedProductId} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <MarketSummaryCard selectedMarket={selectedMarket} summary={currentMarketSummary} expenses={currentExpenses} />
                  <ActionPanel selectedMarketId={selectedMarketId} onAddSale={addDemoSale} onAddExpense={addDemoExpense} />
                </div>
              </div>
            )}

            {activeTab === 'markets' && (
              <div className="grid gap-4 md:grid-cols-3">
                {demoMarkets.map((market) => {
                  const summary = marketSummaries.find((item) => item.marketId === market.id) ?? marketSummaries[0];
                  return (
                    <button
                      key={market.id}
                      onClick={() => setSelectedMarketId(market.id)}
                      className={`rounded-[2rem] border p-5 text-left shadow-[0_18px_50px_rgba(38,48,33,0.06)] transition hover:-translate-y-0.5 ${
                        selectedMarketId === market.id ? 'border-[#24381F] bg-[#FFFDF7]' : 'border-[#E2D6C7] bg-[#FFFDF7]/78'
                      }`}
                    >
                      <p className="text-xs font-semibold tracking-[0.16em] text-[#A89580]">{market.city}・{market.weather}</p>
                      <h3 className="mt-2 text-xl font-semibold text-[#263021]">{market.name}</h3>
                      <p className="mt-1 text-sm text-[#776B5C]">{formatDate(market.date)}｜{market.location}</p>
                      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-[#F8F3EA] p-3">
                          <p className="text-xs text-[#776B5C]">營收</p>
                          <p className="mt-1 font-semibold text-[#263021]">{formatCurrency(summary.revenue)}</p>
                        </div>
                        <div className="rounded-2xl bg-[#F8F3EA] p-3">
                          <p className="text-xs text-[#776B5C]">淨利</p>
                          <p className="mt-1 font-semibold text-[#5F7358]">{formatCurrency(summary.profit)}</p>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-[#776B5C]">{market.note}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'products' && (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {demoProducts.map((product) => {
                  const sold = getProductSalesQuantity(product.id, sales);
                  const profit = sold * (product.price - product.unitCost);
                  return (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-5 text-left shadow-[0_18px_50px_rgba(38,48,33,0.06)] transition hover:-translate-y-0.5 hover:border-[#A89580]"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#A89580]">{product.category}</p>
                      <h3 className="mt-2 text-lg font-semibold text-[#263021]">{product.name}</h3>
                      <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="rounded-2xl bg-[#F8F3EA] p-3">
                          <p className="text-xs text-[#776B5C]">售價</p>
                          <p className="mt-1 font-semibold text-[#263021]">{formatCurrency(product.price)}</p>
                        </div>
                        <div className="rounded-2xl bg-[#F8F3EA] p-3">
                          <p className="text-xs text-[#776B5C]">已售</p>
                          <p className="mt-1 font-semibold text-[#263021]">{sold}</p>
                        </div>
                        <div className="rounded-2xl bg-[#F8F3EA] p-3">
                          <p className="text-xs text-[#776B5C]">毛利</p>
                          <p className="mt-1 font-semibold text-[#5F7358]">{formatCurrency(profit)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === 'sales' && (
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <ActionPanel selectedMarketId={selectedMarketId} onAddSale={addDemoSale} onAddExpense={addDemoExpense} />
                <div className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-6 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
                  <h3 className="mb-4 text-lg font-semibold text-[#263021]">{selectedMarket.name} 近期銷售</h3>
                  <div className="space-y-3">
                    {currentSales.slice().reverse().map((sale) => {
                      const product = demoProducts.find((item) => item.id === sale.productId);
                      if (!product) return null;
                      return (
                        <div key={sale.id} className="flex items-center justify-between rounded-2xl bg-[#F8F3EA] p-4">
                          <div>
                            <p className="font-semibold text-[#263021]">{product.name}</p>
                            <p className="text-xs text-[#776B5C]">{sale.quantity} 件・{product.category}</p>
                          </div>
                          <p className="font-semibold text-[#263021]">{formatCurrency(product.price * sale.quantity)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'expenses' && (
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <ActionPanel selectedMarketId={selectedMarketId} onAddSale={addDemoSale} onAddExpense={addDemoExpense} />
                <div className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-6 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
                  <h3 className="mb-4 text-lg font-semibold text-[#263021]">{selectedMarket.name} 成本明細</h3>
                  <div className="mb-5 grid grid-cols-2 gap-3">
                    <StatCard label="其他成本" value={formatCurrency(currentMarketSummary.expenses)} note="攤費、交通、包材等" />
                    <StatCard label="淨利" value={formatCurrency(currentMarketSummary.profit)} note={`利潤率 ${currentMarketSummary.margin}%`} />
                  </div>
                  <div className="space-y-3">
                    {expenseBreakdown.map((item) => (
                      <div key={item.type} className="flex items-center justify-between rounded-2xl bg-[#F8F3EA] p-4">
                        <p className="font-semibold text-[#263021]">{item.type}</p>
                        <p className="font-semibold text-[#263021]">{formatCurrency(item.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'review' && (
              <div className="grid gap-6 xl:grid-cols-3">
                <InsightCard title="最值得再去的市集" value={bestMarket.name} description={`${bestMarket.name} 目前淨利 ${formatCurrency(bestMarket.profit)}，利潤率 ${bestMarket.margin}%，是範例資料中最穩定的場次。`} />
                <InsightCard title="最值得補貨的商品" value={bestProfitProduct.product.name} description={`累積毛利 ${formatCurrency(bestProfitProduct.profit)}，建議下次出攤前優先檢查庫存與備貨數。`} />
                <InsightCard title="成本提醒" value={allExpenses > 0 ? formatCurrency(allExpenses) : '尚無成本'} description="Demo 會把攤位費、交通、包材與耗損分開記錄，讓你回顧時更清楚哪一場真正有賺。" />
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedProduct && (
        <ProductDrawer product={selectedProduct} sales={sales} onClose={() => setSelectedProductId(null)} />
      )}
    </div>
  );
}

function MarketSummaryCard({
  selectedMarket,
  summary,
  expenses,
}: {
  selectedMarket: typeof demoMarkets[number];
  summary: {
    revenue: number;
    productCost: number;
    expenses: number;
    profit: number;
    margin: number;
  };
  expenses: DemoExpense[];
}) {
  return (
    <div className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-6 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A89580]">Market Note</p>
          <h3 className="mt-1 text-xl font-semibold text-[#263021]">{selectedMarket.name}</h3>
          <p className="mt-1 text-sm text-[#776B5C]">{selectedMarket.location}・{selectedMarket.weather}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-[#A89580]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="營收" value={formatCurrency(summary.revenue)} note="商品銷售總額" />
        <StatCard label="商品成本" value={formatCurrency(summary.productCost)} note="依單件成本估算" />
        <StatCard label="其他成本" value={formatCurrency(summary.expenses)} note={`${expenses.length} 筆成本`} />
        <StatCard label="淨利" value={formatCurrency(summary.profit)} note={`利潤率 ${summary.margin}%`} />
      </div>
      <p className="mt-5 rounded-2xl bg-[#F8F3EA] p-4 text-sm leading-7 text-[#776B5C]">{selectedMarket.note}</p>
    </div>
  );
}

function InsightCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <article className="rounded-[2rem] border border-[#E2D6C7] bg-[#FFFDF7]/78 p-6 shadow-[0_20px_55px_rgba(38,48,33,0.07)]">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EDE2] text-[#24381F]">
        <ClipboardList className="h-5 w-5" />
      </div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#A89580]">{title}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#263021]">{value}</h3>
      <p className="mt-4 text-sm leading-7 text-[#776B5C]">{description}</p>
    </article>
  );
}
