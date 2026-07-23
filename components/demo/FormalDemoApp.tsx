'use client';

import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Database,
  DollarSign,
  Edit,
  FileText,
  Gem,
  Hand,
  Home,
  MapPin,
  Minus,
  MoreHorizontal,
  Package,
  Palette,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Store,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ActionableInsightsCard } from '@/components/analytics/ActionableInsightsCard';
import { AdvancedAnalysisGate } from '@/components/analytics/AdvancedAnalysisGate';
import { AnalyticsSummaryHighlights } from '@/components/analytics/AnalyticsSummaryHighlights';
import { DailyRevenueChart } from '@/components/analytics/DailyRevenueChart';
import { DateRangeFilter, type AnalyticsRange } from '@/components/analytics/DateRangeFilter';
import { MarketTrendCard } from '@/components/analytics/MarketTrendCard';
import { TopProductsCard } from '@/components/analytics/TopProductsCard';
import { MarketWorkspaceNavigation } from '@/components/markets/MarketWorkspaceNavigation';
import { MarketWorkspaceSummary } from '@/components/markets/MarketWorkspaceSummary';
import {
  MarketBasicFields,
  MarketCostFields,
  MarketEquipmentFields,
  MarketNotesField,
  MarketTimelineFields,
  type MarketEquipmentField,
  type MarketEquipmentFreeField,
  type MarketTimelineField,
} from '@/components/markets/MarketFormFields';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFormFields } from '@/components/products/ProductFormFields';
import { PaymentMethodSelector } from '@/components/sales/PaymentMethodSelector';
import { AppDialog } from '@/components/ui/AppDialog';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormSectionDisclosure } from '@/components/ui/FormSectionDisclosure';
import { FullScreenForm } from '@/components/ui/FullScreenForm';
import { IconButton } from '@/components/ui/IconButton';
import { Tabs } from '@/components/ui/Tabs';
import { buildActionableAnalytics } from '@/lib/analytics/actionable-insights';
import { buildMarketTrend } from '@/lib/analytics/market-trend';
import { composeMarketMetricsViewModel } from '@/lib/analytics/market-metrics-view-model';
import type { MarketMetrics } from '@/lib/analytics/types';
import {
  createInitialDemoActivities,
  createInitialDemoMarkets,
  createInitialDemoProducts,
  type DemoActivity,
  type DemoMarket,
  type DemoMarketStatus,
  type DemoProduct,
  type DemoView,
} from '@/lib/demo/formal-demo-data';
import type { SalesPaymentMethod } from '@/lib/sales/payment-methods';
import {
  calculateMarketDurationLabel,
  calculateMarketFixedCost,
  deriveMarketDateBounds,
  validateMarketCoreForm,
  type MarketCoreFormErrors,
} from '@/lib/markets/market-form';
import {
  createEmptyProductFormValues,
  createProductFormValues,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/lib/products/product-form';
import { THEME_LAB_OPEN_EVENT } from '@/lib/theme-lab';
import { formatCurrency } from '@/lib/utils';
import type { Market, Product, ProductCategory } from '@/types/db';

type MarketView = 'active' | 'preparing' | 'ended';
type ProductView = 'all' | ProductCategory;
type AnalyticsView = 'summary' | 'trends' | 'products' | 'advanced';
type WorkspaceView = 'live' | 'overview' | 'manage';
type TransactionMode = 'quick' | 'products';

const DEMO_NAV_ITEMS: readonly { id: DemoView; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: '今日', icon: Home },
  { id: 'markets', label: '市集', icon: Calendar },
  { id: 'products', label: '商品', icon: Package },
  { id: 'analytics', label: '分析', icon: BarChart3 },
  { id: 'more', label: '更多', icon: MoreHorizontal },
];

const CATEGORY_MAP: Record<DemoProduct['category'], ProductCategory> = {
  手作: 'handmade',
  食品: 'food',
  飾品: 'accessory',
  服飾: 'clothing',
  藝術: 'art',
  文具: 'stationery',
  其他: 'other',
};

const DEMO_CATEGORY_MAP: Record<ProductCategory, DemoProduct['category']> = {
  handmade: '手作',
  food: '食品',
  accessory: '飾品',
  clothing: '服飾',
  art: '藝術',
  stationery: '文具',
  other: '其他',
};

const CATEGORY_LABELS: Partial<Record<ProductCategory, string>> = {
  handmade: '手作',
  food: '食品',
  accessory: '飾品',
  clothing: '服飾',
  art: '藝術',
  stationery: '文具',
  other: '其他',
};

const CATEGORY_DETAIL: Record<ProductCategory, { label: string; emoji: string; background: string }> = {
  handmade: { label: '手作', emoji: '🧵', background: 'bg-soft-pink' },
  food: { label: '食品', emoji: '🍪', background: 'bg-soft-yellow' },
  accessory: { label: '飾品', emoji: '💎', background: 'bg-soft-green' },
  clothing: { label: '服飾', emoji: '👕', background: 'bg-cat-clothing' },
  art: { label: '藝術', emoji: '🎨', background: 'bg-cat-art' },
  stationery: { label: '文具', emoji: '📖', background: 'bg-cat-stationery' },
  other: { label: '其他', emoji: '📦', background: 'bg-cat-other' },
};

function toFormalMarket(market: DemoMarket): Market {
  const dateBounds = deriveMarketDateBounds(market.dates);
  const startDate = dateBounds.startDate || market.dates[0] || '2026-08-16';
  const endDate = dateBounds.endDate || startDate;
  return {
    id: market.id,
    name: market.name,
    location: market.location,
    dates: [...market.dates],
    startDate,
    endDate,
    startTime: market.operatingStartTime,
    endTime: market.operatingEndTime,
    checkInTime: market.checkInTime,
    operatingStartTime: market.operatingStartTime,
    operatingEndTime: market.operatingEndTime,
    status: market.status === 'operating' ? 'ongoing' : market.status === 'ended' ? 'completed' : 'paid',
    operationPhase: market.status === 'operating' ? 'operating' : market.status === 'ended' ? 'closing' : 'preparation',
    registrationFee: 0,
    boothCost: market.boothCost,
    deposit: market.deposit,
    commissionRate: market.commissionRate,
    tableRental: market.tableRental,
    chairRental: market.chairRental,
    umbrellaRental: market.umbrellaRental,
    tableFree: market.tableFree,
    chairFree: market.chairFree,
    umbrellaFree: market.umbrellaFree,
    salesPhotoEvidenceRequired: market.salesPhotoEvidenceRequired,
    totalRevenue: market.revenue,
    totalProfit: Math.round(market.revenue * 0.68),
    totalInteractions: market.interactions,
    totalDeals: market.deals,
    notes: market.note,
    createdAt: 1,
    updatedAt: 1,
  };
}

function toFormalProduct(product: DemoProduct): Product {
  return {
    id: product.id,
    name: product.name,
    category: CATEGORY_MAP[product.category],
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    unlimitedStock: product.unlimitedStock,
    isActive: product.isActive,
    totalSold: product.sold,
    description: product.description,
    createdAt: 1,
    updatedAt: 1,
  };
}

interface DemoMarketFormValues {
  name: string;
  location: string;
  dates: string[];
  noEarlyEntry: boolean;
  earlyEntryTime: string;
  checkInTime: string;
  operatingStartTime: string;
  operatingEndTime: string;
  boothCost: number;
  deposit: number;
  commissionRate: number;
  tableRental: number;
  chairRental: number;
  umbrellaRental: number;
  tableFree: boolean;
  chairFree: boolean;
  umbrellaFree: boolean;
  salesPhotoEvidenceRequired: boolean;
  notes: string;
}

function createDemoMarketFormValues(market?: DemoMarket): DemoMarketFormValues {
  return {
    name: market?.name ?? '',
    location: market?.location ?? '',
    dates: market ? [...market.dates] : [],
    noEarlyEntry: true,
    earlyEntryTime: '10:00',
    checkInTime: market?.checkInTime ?? '11:00',
    operatingStartTime: market?.operatingStartTime ?? '12:00',
    operatingEndTime: market?.operatingEndTime ?? '18:00',
    boothCost: market?.boothCost ?? 0,
    deposit: market?.deposit ?? 0,
    commissionRate: market?.commissionRate ?? 0,
    tableRental: market?.tableRental ?? 0,
    chairRental: market?.chairRental ?? 0,
    umbrellaRental: market?.umbrellaRental ?? 0,
    tableFree: market?.tableFree ?? false,
    chairFree: market?.chairFree ?? false,
    umbrellaFree: market?.umbrellaFree ?? false,
    salesPhotoEvidenceRequired: market?.salesPhotoEvidenceRequired ?? false,
    notes: market?.note ?? '',
  };
}

function formatDemoDateLabel(dates: string[]): string {
  const firstDate = [...dates].sort()[0];
  if (!firstDate) return '尚未設定';
  const date = new Date(`${firstDate}T00:00:00`);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  return `${date.getMonth() + 1}/${date.getDate()}（${weekday}）`;
}

function stageForMarket(status: DemoMarketStatus): MarketView {
  if (status === 'operating') return 'active';
  if (status === 'preparing') return 'preparing';
  return 'ended';
}

function stageLabel(stage: MarketView): string {
  if (stage === 'active') return '營運中';
  if (stage === 'preparing') return '準備中';
  return '已結束';
}

function stageClasses(stage: MarketView): string {
  if (stage === 'active') return 'bg-status-good-bg text-status-good-text';
  if (stage === 'preparing') return 'bg-status-warn-bg text-status-warn-text';
  return 'bg-muted text-muted-foreground';
}

function StaticSyncStatus() {
  return (
    <span
      className="inline-flex h-11 w-11 items-center justify-center rounded-control bg-white/20 text-white shadow-sm backdrop-blur-sm"
      aria-label="資料已同步"
      title="資料已同步"
    >
      <Cloud className="h-5 w-5" aria-hidden="true" />
    </span>
  );
}

function DemoBottomNavigation({ activeView, onChange }: { activeView: DemoView; onChange: (view: DemoView) => void }) {
  return (
    <nav
      aria-label="主要導覽"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-atelier-paper/95 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgb(123_159_166_/_0.10)] backdrop-blur-md ease-in-out"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {DEMO_NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onChange(item.id)}
              className="group relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control transition-colors"
            >
              <span className={`flex h-8 min-w-10 items-center justify-center rounded-control px-2 transition-colors ${isActive ? 'scale-105 bg-primary text-white shadow-atelier-key' : 'bg-transparent text-atelier-muted group-hover:bg-soft-pink group-hover:text-atelier-ink'}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={`text-xs ${isActive ? 'font-semibold text-primary' : 'text-atelier-muted'}`}>{item.label}</span>
              {isActive && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-atelier-clay" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function TodayMarketCard({ market, onOpen }: { market: DemoMarket; onOpen: () => void }) {
  const stage = stageForMarket(market.status);
  const surfaceClass = stage === 'active' ? 'bg-atelier-sage-soft' : stage === 'ended' ? 'bg-home-ended-card' : 'bg-atelier-apricot-soft';
  const companionLine = stage === 'active'
    ? '今天的市集正在進行中，打開營運工作台記錄每一次互動吧。'
    : stage === 'ended'
      ? '今天的紀錄都收好了，回顧一下這場市集的成果。'
      : '營運時間還沒開始，可以先確認今天的準備事項。';

  return (
    <article className={`overflow-hidden rounded-card shadow-atelier-lift ${surfaceClass}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stageClasses(stage)}`}>{stageLabel(stage)}</span>
            <h2 className="mt-3 break-words text-[1.4rem] font-semibold leading-tight text-atelier-ink">{market.name}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-atelier-muted">{companionLine}</p>
          </div>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-atelier-paper/80 text-primary shadow-atelier">
            <Store className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-5 grid gap-2.5 text-sm text-atelier-muted sm:grid-cols-2">
          <p className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{market.location}</span></p>
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" /><span>{market.time}</span></p>
        </div>
        <Button onClick={onOpen} className="mt-5 min-h-12 w-full bg-primary shadow-atelier hover:bg-primary/90 sm:w-auto" leadingIcon={<ArrowRight className="h-4 w-4" />}>
          {stage === 'active' ? '進入今日營運' : stage === 'ended' ? '查看今日回顧' : '查看準備事項'}
        </Button>
      </div>
    </article>
  );
}

function TodayPage({
  activeMarket,
  upcomingMarkets,
  onOpenMarket,
  onShowMarkets,
  onOpenSettings,
}: {
  activeMarket: DemoMarket;
  upcomingMarkets: DemoMarket[];
  onOpenMarket: (market: DemoMarket) => void;
  onShowMarkets: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="min-h-screen bg-atelier-canvas/80 text-atelier-ink">
      <header className="japanese-warm-header overflow-hidden rounded-b-[2rem] px-5 pb-9 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white shadow-atelier-lift">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <p className="min-w-0 truncate text-xs font-semibold text-white/90">Feria・暖暖手作</p>
            <div className="flex shrink-0 items-center gap-1">
              <StaticSyncStatus />
              <IconButton label="開啟設定" tooltip="設定" className="bg-white/20 text-white shadow-sm backdrop-blur-sm hover:bg-white/30 hover:text-white" icon={<Settings className="h-5 w-5" />} onClick={onOpenSettings} />
            </div>
          </div>
          <div className="mt-6 flex items-end justify-between gap-5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/85">晚安，今天也辛苦了</p>
              <h1 className="mt-1 text-[2rem] font-semibold leading-none text-white">今日</h1>
              <p className="mt-3 text-sm text-white/80">7月18日星期六</p>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/85">今天的記錄都在這裡，放心收進來吧。</p>
            </div>
            <Image src="/logo-alpha.png" alt="" width={88} height={88} priority unoptimized aria-hidden="true" className="h-[4.75rem] w-[4.75rem] shrink-0 rounded-full bg-white/15 object-cover opacity-95 sm:h-[5.5rem] sm:w-[5.5rem]" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-8 pt-7 sm:px-6">
        <section aria-labelledby="today-focus-title">
          <div className="mb-4">
            <p className="text-xs font-semibold text-atelier-clay">現在</p>
            <h2 id="today-focus-title" className="mt-1 text-lg font-semibold text-atelier-ink">今天的營運重點</h2>
          </div>
          <TodayMarketCard market={activeMarket} onOpen={() => onOpenMarket(activeMarket)} />
        </section>

        <section className="-mx-4 mt-9 bg-upcoming-section px-4 py-6 sm:-mx-6 sm:px-6" aria-labelledby="upcoming-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-atelier-blue">接下來</p>
              <h2 id="upcoming-title" className="mt-1 text-lg font-semibold text-atelier-ink">近期市集</h2>
            </div>
            <button type="button" onClick={onShowMarkets} className="flex min-h-11 items-center gap-1 rounded-control px-2 text-sm font-medium text-primary hover:bg-atelier-paper/80 focus-visible:ring-2 focus-visible:ring-primary">
              查看全部 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {upcomingMarkets.slice(0, 3).map(market => (
              <button key={market.id} type="button" onClick={() => onOpenMarket(market)} className="flex min-h-16 w-full items-center gap-3 rounded-card bg-atelier-paper/90 px-3 py-3 text-left shadow-sm transition-colors hover:bg-atelier-paper focus-visible:ring-2 focus-visible:ring-primary">
                <span className="flex h-11 min-w-14 shrink-0 items-center justify-center rounded-control bg-upcoming-date-badge px-2 text-xs font-semibold text-atelier-blue">{market.dateLabel}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{market.name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{market.location}</span></span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function MarketListCard({ market, onOpen }: { market: DemoMarket; onOpen: () => void }) {
  const stage = stageForMarket(market.status);
  return (
    <article className="rounded-card border border-primary/10 bg-atelier-paper p-4 shadow-atelier transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-atelier-lift sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${stageClasses(stage)}`}>{stageLabel(stage)}</span>
          <h2 className="mt-2 break-words text-base font-semibold text-foreground sm:text-lg">{market.name}</h2>
        </div>
        <Store className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      </div>
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" /><span>{market.dateLabel}</span></p>
        <p className="flex min-w-0 items-center gap-2"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{market.location}</span></p>
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant={stage === 'active' ? 'primary' : 'secondary'} onClick={onOpen} className="w-full sm:w-auto">
          {stage === 'active' ? '進入現場' : stage === 'preparing' ? '繼續準備' : '查看回顧'}
        </Button>
      </div>
    </article>
  );
}

function MarketsPage({ markets, view, onViewChange, onAdd, onOpen }: { markets: DemoMarket[]; view: MarketView; onViewChange: (view: MarketView) => void; onAdd: () => void; onOpen: (market: DemoMarket) => void }) {
  const filtered = markets.filter(market => stageForMarket(market.status) === view);
  const tabs = [
    { id: 'active' as const, label: '營運中', count: markets.filter(m => m.status === 'operating').length },
    { id: 'preparing' as const, label: '準備中', count: markets.filter(m => m.status === 'preparing').length },
    { id: 'ended' as const, label: '已結束', count: markets.filter(m => m.status === 'ended').length },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="japanese-gradient-header rounded-b-[2rem] border-b border-white/15 px-5 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div><p className="text-sm text-white/80">老闆模式</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Store className="h-6 w-6" />市集</h1></div>
          <IconButton label="新增市集" tone="inverse" icon={<Plus className="h-5 w-5" />} onClick={onAdd} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6">
        <Tabs items={tabs} value={view} onChange={onViewChange} ariaLabel="市集狀態篩選" />
        <div className="mt-5 space-y-3">
          {filtered.map(market => <MarketListCard key={market.id} market={market} onOpen={() => onOpen(market)} />)}
        </div>
      </main>
    </div>
  );
}

function ProductsPage({ products, query, view, showInactive, onQueryChange, onViewChange, onShowInactiveChange, onAdd, onOpen }: { products: DemoProduct[]; query: string; view: ProductView; showInactive: boolean; onQueryChange: (value: string) => void; onViewChange: (view: ProductView) => void; onShowInactiveChange: (value: boolean) => void; onAdd: () => void; onOpen: (product: DemoProduct) => void }) {
  const formalProducts = products.map(toFormalProduct);
  const filtered = formalProducts.filter(product => (showInactive || product.isActive) && (view === 'all' || product.category === view) && product.name.toLowerCase().includes(query.trim().toLowerCase()));
  const tabs = [
    { id: 'all' as const, label: '全部', count: formalProducts.length },
    ...(['handmade', 'food', 'accessory', 'clothing', 'art', 'stationery', 'other'] as const).map(category => ({ id: category, label: CATEGORY_LABELS[category] ?? category, count: formalProducts.filter(product => product.category === category).length })),
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="japanese-gradient-header rounded-b-[2rem] border-b border-white/15 px-5 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div><p className="text-sm text-white/80">商品管理</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><Package className="h-6 w-6" />商品</h1></div>
          <IconButton label="新增商品" tone="inverse" icon={<Plus className="h-5 w-5" />} onClick={onAdd} />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <div className="relative">
            <label htmlFor="demo-product-search" className="sr-only">搜尋商品</label>
            <Package className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input id="demo-product-search" type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder="搜尋商品名稱或關鍵字" className="min-h-11 w-full rounded-control border border-primary/15 bg-atelier-paper pl-10 pr-12 text-sm text-foreground shadow-sm shadow-primary/5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            {query && <button type="button" onClick={() => onQueryChange('')} aria-label="清除搜尋" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-control text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
          </div>
          <Tabs items={tabs} value={view} onChange={onViewChange} ariaLabel="商品分類" className="mt-3" />
          <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={showInactive} onChange={event => onShowInactiveChange(event.target.checked)} className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary" />包含停用商品</label>
        </div>
        <div className="grid gap-3 py-4 sm:grid-cols-2">
          {filtered.map(product => <ProductCard key={product.id} product={product} canEdit onOpen={() => onOpen(products.find(item => item.id === product.id)!)} />)}
        </div>
      </main>
    </div>
  );
}

function buildDemoMetrics(markets: Market[]) {
  return composeMarketMetricsViewModel(markets.map(market => {
    const revenue = market.totalRevenue ?? 0;
    const deals = market.totalDeals ?? 0;
    const engaged = market.totalInteractions ?? 0;
    const fixedCost = (market.registrationFee ?? 0) + (market.boothCost ?? 0) + (market.tableRental ?? 0) + (market.chairRental ?? 0);
    const totalProfit = market.totalProfit ?? 0;
    const netProfit = totalProfit - fixedCost;
    const conversionRate = engaged > 0 ? deals / engaged : 0;
    const metrics = {
      uniqueEngaged: engaged,
      totalDeals: deals,
      totalRevenue: revenue,
      totalProfit,
      netProfit,
      conversionRate,
      conversionRateRaw: conversionRate,
      aov: deals > 0 ? revenue / deals : 0,
      hourlyProfit: netProfit / 8,
      boothROI: fixedCost > 0 ? netProfit / fixedCost : 0,
      operatingHours: 8,
      totalFixedCost: fixedCost,
      totalVariableCost: Math.max(0, revenue - totalProfit),
      behavior1Count: engaged,
      behavior2Count: Math.round(engaged * 0.55),
      behavior3Count: deals,
      derivedMetrics: { interactionValue: engaged > 0 ? revenue / engaged : 0, dealQualityIndex: deals > 0 ? revenue / deals : 0, efficiencyIndex: engaged > 0 ? netProfit / engaged : 0 },
      confidenceScore: 0.72,
      confidenceLevel: '高' as MarketMetrics['confidenceLevel'],
      isValidForQuadrant: true,
    } as MarketMetrics;
    return { market, marketId: market.id!, metrics };
  }));
}

function AnalyticsPage({ markets, products }: { markets: DemoMarket[]; products: DemoProduct[] }) {
  const [range, setRange] = useState<AnalyticsRange>('all');
  const [activeTab, setActiveTab] = useState<AnalyticsView>('summary');
  const [selectedMarketId, setSelectedMarketId] = useState(markets[0]?.id ?? '');
  const formalMarkets = markets.map(toFormalMarket);
  const formalProducts = products.map(toFormalProduct);
  const chronologicalMarkets = [...formalMarkets].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const filteredMarkets = range === 'single'
    ? formalMarkets.filter(market => market.id === selectedMarketId)
    : range === 'recent3'
      ? chronologicalMarkets.slice(-3)
      : range === 'recent10'
        ? chronologicalMarkets.slice(-10)
        : formalMarkets;
  const actionable = buildActionableAnalytics({ markets: filteredMarkets, products: formalProducts });
  const metrics = buildDemoMetrics(filteredMarkets);
  const trend = buildMarketTrend(filteredMarkets);
  const revenueMap = new Map(filteredMarkets.map(market => [market.startDate, market.totalRevenue ?? 0]));
  const chartMarkets = [...filteredMarkets].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const chartStartDate = chartMarkets[0]?.startDate ?? '2026-07-18';
  const chartEndDate = chartMarkets[chartMarkets.length - 1]?.endDate ?? chartStartDate;
  const ranked = [...products].sort((left, right) => right.sold - left.sold);
  const topQuantity = ranked[0];
  const topRevenue = [...products].sort((left, right) => right.sold * right.price - left.sold * left.price)[0];
  const tabs = [
    { id: 'summary' as const, label: '摘要' },
    { id: 'trends' as const, label: '趨勢' },
    { id: 'products' as const, label: '商品' },
    { id: 'advanced' as const, label: '進階' },
  ];
  return (
    <div className="min-h-screen bg-background">
      <header className="japanese-gradient-header rounded-b-[2rem] border-b border-white/15 px-5 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier">
        <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
          <div><p className="text-sm text-white/80">營運分析</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold"><BarChart3 className="h-6 w-6" />分析</h1></div>
          <div className="flex items-center gap-1"><IconButton label="開啟結算報表" tone="inverse" icon={<FileText className="h-5 w-5" />} onClick={() => toast.info('Demo 不會產生正式報表')} /><IconButton label="重新計算分析" tone="inverse" icon={<RefreshCw className="h-5 w-5" />} onClick={() => toast.success('分析已重新計算')} /></div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        <DateRangeFilter value={range} onChange={setRange} markets={formalMarkets} selectedMarketId={selectedMarketId} onMarketChange={setSelectedMarketId} />
        <Tabs className="mt-5" items={tabs} value={activeTab} onChange={setActiveTab} ariaLabel="分析分頁" />
        <div className="mt-5">
          {activeTab === 'summary' && (
            <div className="space-y-5">
              <section className="rounded-card border border-status-warn-border bg-status-warn-bg px-4 py-3"><p className="text-sm font-semibold text-foreground">資料可靠度：中等</p><p className="mt-1 text-xs text-muted-foreground">目前範圍有 {filteredMarkets.filter(market => (market.totalRevenue ?? 0) > 0).length} 場有效市集資料，持續記錄會讓建議更準確。</p></section>
              <ActionableInsightsCard result={actionable} />
              <AnalyticsSummaryHighlights viewModel={metrics} />
            </div>
          )}
          {activeTab === 'trends' && <div className="space-y-5"><MarketTrendCard trend={trend} /><DailyRevenueChart revenueMap={revenueMap} startDate={chartStartDate} endDate={chartEndDate} /></div>}
          {activeTab === 'products' && (
            <div className="space-y-5">
              <TopProductsCard
                topByQuantity={topQuantity ? { productName: topQuantity.name, quantity: topQuantity.sold } : null}
                topByRevenue={topRevenue ? { productName: topRevenue.name, revenue: topRevenue.sold * topRevenue.price } : null}
                topByProfit={topRevenue ? { productName: topRevenue.name, profit: Math.round(topRevenue.sold * topRevenue.price * 0.62) } : null}
              />
              <AdvancedAnalysisGate title="商品搭配分析還需要更多資料" description="累積更多市集成交紀錄後，就能找出最常一起被購買的商品。" requirement={`目前範圍 ${filteredMarkets.length} 場，累積至 15 場即可解鎖`} />
            </div>
          )}
          {activeTab === 'advanced' && <AdvancedAnalysisGate title="進階分析正在累積資料" description="進階健康分數與象限分析會在資料量足夠後顯示。" requirement="至少需要 15 場具有完整營業額、成本與互動資料的市集" />}
        </div>
      </main>
    </div>
  );
}

interface SettingsRowProps {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
}

function SettingsRow({ icon: Icon, label, description, onClick }: SettingsRowProps) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-soft-pink/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-foreground">{label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span></span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return <section aria-label={title}><h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{title}</h2><div className="divide-y divide-primary/10 overflow-hidden rounded-card border border-primary/10 bg-white shadow-atelier">{children}</div></section>;
}

type DemoSettingsView = 'root' | 'account' | 'team' | 'sales' | 'data' | 'app';

function DemoSettingsShell({ title, description, icon: Icon, onBack, children }: { title: string; description: string; icon: LucideIcon; onBack: () => void; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="japanese-gradient-header rounded-b-[2rem] border-b border-white/15 px-5 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier">
        <div className="mx-auto flex max-w-3xl items-start gap-3">
          <button type="button" onClick={onBack} aria-label="返回更多" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 pt-0.5"><div className="flex items-center gap-2"><Icon className="h-5 w-5" /><h1 className="text-2xl font-semibold">{title}</h1></div><p className="mt-1 max-w-2xl text-sm leading-6 text-white/80">{description}</p></div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">{children}</main>
    </div>
  );
}

function MorePage({ onOpenThemeLab, defaultPhotoRequired, onPhotoRequiredChange, onExport, onReset }: { onOpenThemeLab: () => void; defaultPhotoRequired: boolean; onPhotoRequiredChange: (value: boolean) => void; onExport: () => void; onReset: () => void }) {
  const [view, setView] = useState<DemoSettingsView>('root');
  const [lastSyncLabel, setLastSyncLabel] = useState('剛剛');
  const [teamMembers, setTeamMembers] = useState(['小葵・店員']);
  const [inviteName, setInviteName] = useState('');
  const [photoDraft, setPhotoDraft] = useState(defaultPhotoRequired);
  const [resetOpen, setResetOpen] = useState(false);

  if (view === 'account') {
    return (
      <DemoSettingsShell title="帳號與同步" description="管理帳號、備份與跨裝置同步。" icon={Cloud} onBack={() => setView('root')}>
        <div className="space-y-6">
          <section className="rounded-card border border-primary/10 bg-white p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></span><div><h2 className="text-base font-semibold text-foreground">登入帳號</h2><p className="mt-1 text-sm text-muted-foreground">demo@feria.app</p><p className="mt-2 text-xs text-muted-foreground">帳號身分：老闆・Demo 模式</p></div></div></section>
          <section className="rounded-card border border-primary/10 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-foreground">雲端同步</h2><p className="mt-1 text-sm text-muted-foreground">正式版會先保存本機操作，再於連線時送往雲端。</p></div><span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-soft-green px-3 py-1 text-xs font-medium text-primary"><Check className="h-4 w-4" />Demo 已同步</span></div><dl className="mt-5 divide-y divide-primary/10 border-y border-primary/10 text-sm"><div className="flex items-center justify-between py-3"><dt className="text-muted-foreground">最後同步</dt><dd className="font-medium">{lastSyncLabel}</dd></div><div className="flex items-center justify-between py-3"><dt className="text-muted-foreground">待同步項目</dt><dd className="font-medium">0 筆</dd></div><div className="flex items-center justify-between py-3"><dt className="text-muted-foreground">資料來源</dt><dd className="font-medium">記憶體 Demo</dd></div></dl><Button variant="secondary" className="mt-4 w-full sm:w-auto" leadingIcon={<RefreshCw className="h-4 w-4" />} onClick={() => { setLastSyncLabel('現在'); toast.success('Demo 同步完成'); }}>立即同步</Button></section>
        </div>
      </DemoSettingsShell>
    );
  }

  if (view === 'team') {
    const invite = () => {
      const name = inviteName.trim();
      if (!name) { toast.error('請輸入成員名稱'); return; }
      setTeamMembers(current => [...current, `${name}・店員`]);
      setInviteName('');
      toast.success('Demo 團隊成員已加入');
    };
    return (
      <DemoSettingsShell title="團隊成員" description="邀請夥伴並設定工作權限。" icon={Users} onBack={() => setView('root')}>
        <div className="space-y-6">
          <section className="rounded-card border border-primary/10 bg-white p-5"><h2 className="text-base font-semibold text-foreground">新增成員</h2><p className="mt-1 text-sm text-muted-foreground">這裡只模擬邀請流程，不會寄出通知。</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><label htmlFor="demo-team-name" className="sr-only">成員名稱</label><input id="demo-team-name" value={inviteName} onChange={event => setInviteName(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') invite(); }} placeholder="輸入成員名稱" className="min-h-12 flex-1 rounded-control border border-primary/15 bg-background px-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /><Button onClick={invite} leadingIcon={<Plus className="h-4 w-4" />}>加入團隊</Button></div></section>
          <section className="overflow-hidden rounded-card border border-primary/10 bg-white"><div className="flex items-center justify-between border-b border-primary/10 p-4"><div><p className="text-sm font-semibold">Demo 老闆</p><p className="mt-1 text-xs text-muted-foreground">demo@feria.app</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">老闆</span></div>{teamMembers.map(member => <div key={member} className="flex min-h-16 items-center justify-between gap-3 border-b border-primary/10 px-4 last:border-0"><span className="text-sm font-medium">{member}</span><button type="button" onClick={() => setTeamMembers(current => current.filter(item => item !== member))} aria-label={`移除 ${member}`} className="inline-flex h-11 w-11 items-center justify-center rounded-control text-danger hover:bg-status-danger-bg"><Trash2 className="h-4 w-4" /></button></div>)}</section>
        </div>
      </DemoSettingsShell>
    );
  }

  if (view === 'sales') {
    return (
      <DemoSettingsShell title="成交照片" description="管理品牌顯示與成交照片預設值。" icon={Camera} onBack={() => setView('root')}>
        <section className="rounded-card border border-primary/10 bg-white p-6 shadow-atelier"><div className="mb-4 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Camera className="h-5 w-5" /></span><div><h2 className="text-lg font-medium text-foreground">成交照片紀錄</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">設定新建立的市集是否預設需要在成交後補上照片。</p></div></div><button type="button" onClick={() => setPhotoDraft(current => !current)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-background px-4 py-4 text-left transition-colors hover:border-primary"><span><span className="block text-sm font-medium text-foreground">新市集預設需要成交照片</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">只影響之後新增的市集，不會修改既有市集。</span></span><span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${photoDraft ? 'bg-primary' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${photoDraft ? 'translate-x-6' : 'translate-x-1'}`} /></span></button><Button className="mt-4 w-full" disabled={photoDraft === defaultPhotoRequired} onClick={() => { onPhotoRequiredChange(photoDraft); toast.success('成交照片紀錄設定已更新'); }} leadingIcon={<Check className="h-4 w-4" />}>儲存成交照片設定</Button></section>
      </DemoSettingsShell>
    );
  }

  if (view === 'data') {
    return (
      <DemoSettingsShell title="資料與救援" description="匯出目前資料，或將 Demo 還原成最初狀態。" icon={Database} onBack={() => setView('root')}>
        <div className="space-y-7"><section><h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">備份工具</h2><div className="rounded-card border border-primary/10 bg-white p-5"><h3 className="text-sm font-semibold text-foreground">匯出 Demo 資料</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">下載目前市集、商品與活動紀錄的 JSON 檔案。</p><Button className="mt-4 w-full sm:w-auto" variant="secondary" onClick={onExport} leadingIcon={<Database className="h-4 w-4" />}>下載備份</Button></div></section><section className="border-t border-danger/20 pt-6"><h2 className="text-base font-semibold text-danger">清除資料</h2><p className="mt-1 text-sm text-muted-foreground">只會重設這個 Demo 頁面，不影響正式版資料。</p><div className="mt-4 rounded-card border border-danger/20 bg-white p-5"><h3 className="text-sm font-semibold">還原初始範例</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">目前新增、編輯與成交紀錄都會被清除。</p><Button className="mt-4 w-full sm:w-auto" variant="danger" onClick={() => setResetOpen(true)}>還原 Demo</Button></div></section></div>
        <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setResetOpen(false); setView('root'); onReset(); }} title="還原 Demo 初始資料？" description="這會清除本次操作新增的市集、商品與成交紀錄，但不會碰觸正式版資料。" confirmLabel="還原 Demo" tone="danger" />
      </DemoSettingsShell>
    );
  }

  if (view === 'app') {
    return (
      <DemoSettingsShell title="App 與版本" description="查看版本資訊並調整這次 Demo 的主題。" icon={Smartphone} onBack={() => setView('root')}>
        <div className="space-y-6"><section className="rounded-card border border-primary/10 bg-white p-5"><div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Palette className="h-5 w-5" /></span><div className="min-w-0 flex-1"><h2 className="text-base font-semibold">主題實驗室</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">即時調整正式版與 Demo 共用的色彩變數。</p></div></div><Button className="mt-4 w-full" onClick={onOpenThemeLab} leadingIcon={<Palette className="h-4 w-4" />}>開啟主題實驗室</Button></section><section className="rounded-card border border-primary/10 bg-white px-4 py-4"><div className="flex items-center gap-3"><Image src="/icons/icon-192x192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-lg object-contain" /><div><p className="text-sm font-semibold">Féria</p><p className="mt-1 text-xs text-muted-foreground">互動 Demo・記憶體資料版</p></div></div></section></div>
      </DemoSettingsShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="japanese-gradient-header rounded-b-[2rem] border-b border-white/15 px-5 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier"><div className="mx-auto flex max-w-3xl items-start gap-3"><div className="min-w-0 pt-0.5"><div className="flex items-center gap-2"><MoreHorizontal className="h-5 w-5" /><h1 className="text-2xl font-semibold">更多</h1></div><p className="mt-1 max-w-2xl text-sm leading-6 text-white/80">管理帳號、團隊、營運資料與應用程式設定。</p></div></div></header>
      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6"><section className="mb-6 flex items-center justify-between gap-4 border-b border-primary/10 pb-5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">demo@feria.app</p><p className="mt-1 text-xs text-muted-foreground">目前角色：老闆</p></div><span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">老闆模式</span></section><div className="space-y-6"><SettingsSection title="帳號與協作"><SettingsRow icon={Cloud} label="帳號與同步" description="管理帳號、備份與跨裝置同步" onClick={() => setView('account')} /><SettingsRow icon={Users} label="團隊成員" description="邀請夥伴並設定工作權限" onClick={() => setView('team')} /></SettingsSection><SettingsSection title="營運與資料"><SettingsRow icon={Camera} label="成交照片" description="設定成交後的照片紀錄流程" onClick={() => { setPhotoDraft(defaultPhotoRequired); setView('sales'); }} /><SettingsRow icon={Database} label="資料管理" description="匯入、匯出與復原市集資料" onClick={() => setView('data')} /></SettingsSection><SettingsSection title="應用程式"><SettingsRow icon={Smartphone} label="App 設定" description="調整顯示、操作與主題偏好" onClick={() => setView('app')} /></SettingsSection></div></main>
    </div>
  );
}

function DemoMarketForm({
  open,
  title,
  submitLabel,
  values,
  errors,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  values: DemoMarketFormValues;
  errors: MarketCoreFormErrors;
  onChange: (values: DemoMarketFormValues) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const fixedCostTotal = calculateMarketFixedCost(values);
  const update = <Field extends keyof DemoMarketFormValues>(field: Field, value: DemoMarketFormValues[Field]) => {
    onChange({ ...values, [field]: value });
  };
  const updateTimeline = (field: MarketTimelineField, value: string) => update(field, value);
  const updateCost = (field: 'boothCost' | 'deposit' | 'commissionRate', value: number) => update(field, value);
  const updateRental = (field: MarketEquipmentField, value: number) => update(field, value);
  const updateFree = (field: MarketEquipmentFreeField, value: boolean) => update(field, value);

  return (
    <FullScreenForm
      open={open}
      onClose={onClose}
      eyebrow="市集設定"
      title={title}
      description="日期、營運時間、成本與設備會一起保留在這次 Demo。"
      footer={<><Button variant="secondary" onClick={onClose}>取消</Button><Button onClick={onSubmit}>{submitLabel}</Button></>}
    >
      <div className="space-y-5">
        <section className="rounded-[1.25rem] border border-primary/10 bg-atelier-paper p-4 shadow-atelier sm:p-5">
          <MarketBasicFields
            idPrefix="demo-market"
            name={values.name}
            location={values.location}
            dates={values.dates}
            errors={errors}
            onNameChange={value => update('name', value)}
            onLocationChange={value => update('location', value)}
            onDatesChange={value => update('dates', value)}
          />
        </section>
        <FormSectionDisclosure title="時間安排" description="入場、報到與正式營運時間" icon={Calendar} defaultOpen tone="green">
          <MarketTimelineFields
            idPrefix="demo-market"
            noEarlyEntry={values.noEarlyEntry}
            earlyEntryTime={values.earlyEntryTime}
            checkInTime={values.checkInTime}
            operatingStartTime={values.operatingStartTime}
            operatingEndTime={values.operatingEndTime}
            operatingDuration={calculateMarketDurationLabel(values.operatingStartTime, values.operatingEndTime)}
            totalDuration={calculateMarketDurationLabel(values.checkInTime, values.operatingEndTime)}
            onNoEarlyEntryChange={value => update('noEarlyEntry', value)}
            onChange={updateTimeline}
            onUseDefaults={() => onChange({ ...values, noEarlyEntry: true, checkInTime: '11:00', operatingStartTime: '12:00', operatingEndTime: '18:00' })}
          />
        </FormSectionDisclosure>
        <FormSectionDisclosure title="成本設定" description="攤位費、押金與抽成比例" icon={DollarSign} tone="yellow">
          <MarketCostFields idPrefix="demo-market" boothCost={values.boothCost} deposit={values.deposit} commissionRate={values.commissionRate} fixedCostTotal={fixedCostTotal} onChange={updateCost} />
        </FormSectionDisclosure>
        <FormSectionDisclosure title="設備租借" description="桌椅、陽傘與免費提供設定" icon={Package} tone="blue">
          <MarketEquipmentFields idPrefix="demo-market" rentals={{ tableRental: values.tableRental, chairRental: values.chairRental, umbrellaRental: values.umbrellaRental }} free={{ tableFree: values.tableFree, chairFree: values.chairFree, umbrellaFree: values.umbrellaFree }} onRentalChange={updateRental} onFreeChange={updateFree} />
        </FormSectionDisclosure>
        <FormSectionDisclosure title="主辦／場地備註與成交照片" description="固定資訊與成交後紀錄方式" icon={FileText} tone="pink">
          <div className="space-y-4">
            <MarketNotesField idPrefix="demo-market" value={values.notes} onChange={value => update('notes', value)} />
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-control border border-primary/15 bg-white px-3">
              <input type="checkbox" checked={values.salesPhotoEvidenceRequired} onChange={event => update('salesPhotoEvidenceRequired', event.target.checked)} className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary/40" />
              <span><span className="block text-sm font-medium text-foreground">成交後需要補拍照片</span><span className="block text-xs text-muted-foreground">Demo 只會顯示流程，不會存取相機或上傳照片</span></span>
            </label>
          </div>
        </FormSectionDisclosure>
      </div>
    </FullScreenForm>
  );
}

function DemoProductForm({
  open,
  title,
  submitLabel,
  values,
  errors,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  values: ProductFormValues;
  errors: ProductFormErrors;
  onChange: <Field extends keyof ProductFormValues>(field: Field, value: ProductFormValues[Field]) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title={title}
      description="基本資料、售價、成本與庫存會使用正式版相同欄位。"
      footer={<><Button variant="secondary" onClick={onClose}>取消</Button><Button onClick={onSubmit}>{submitLabel}</Button></>}
    >
      <ProductFormFields idPrefix="demo-product-form" values={values} errors={errors} onChange={onChange} />
    </AppDialog>
  );
}

function ProductDetail({ product, onBack, onEdit, onToggleActive, onDelete }: { product: DemoProduct; onBack: () => void; onEdit: () => void; onToggleActive: () => void; onDelete: () => void }) {
  const formal = toFormalProduct(product);
  const category = CATEGORY_DETAIL[formal.category];
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
        <div className="mx-auto max-w-lg"><button type="button" onClick={onBack} className="mb-4 flex items-center gap-2 text-white/80 transition-colors hover:text-white"><ArrowLeft className="h-5 w-5" /><span>返回</span></button><div className="flex items-start justify-between"><h1 className="flex-1 text-2xl font-medium text-white opacity-90">{formal.name}</h1><span className="ml-3 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm">{category.label}</span></div></div>
      </div>
      <div className="mx-auto -mt-4 max-w-lg space-y-4 px-6 pb-6">
        <div className={`${category.background} flex rounded-[1.5rem] p-12 items-center justify-center shadow-lg shadow-primary/10`}><div className="text-7xl">{category.emoji}</div></div>
        <div className="rounded-[1.5rem] bg-white p-6 shadow-lg shadow-primary/10"><h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-foreground"><DollarSign className="h-5 w-5 text-secondary" />價格資訊</h2><div className="grid grid-cols-2 gap-4"><div className="rounded-2xl bg-soft-green p-4"><div className="mb-1 text-xs text-muted-foreground">售價</div><div className="text-2xl font-medium tabular-nums text-foreground">{formatCurrency(formal.price)}</div></div><div className="rounded-2xl bg-soft-yellow p-4"><div className="mb-1 text-xs text-muted-foreground">成本</div><div className="text-2xl font-medium tabular-nums text-foreground">{formatCurrency(formal.cost ?? 0)}</div></div></div></div>
        <div className="rounded-[1.5rem] bg-white p-6 shadow-lg shadow-primary/10"><h2 className="mb-4 flex items-center gap-2 text-lg font-medium text-foreground"><Package className="h-5 w-5 text-primary" />庫存與銷售</h2><div className="grid grid-cols-2 gap-4"><div className="rounded-2xl bg-background p-4 text-center"><div className="mb-1 text-xs text-muted-foreground">目前庫存</div><div className="text-2xl font-medium tabular-nums text-foreground">{product.unlimitedStock ? '不限' : formal.stock}</div></div><div className="rounded-2xl bg-background p-4 text-center"><div className="mb-1 text-xs text-muted-foreground">已售數量</div><div className="text-2xl font-medium tabular-nums text-foreground">{formal.totalSold}</div></div></div></div>
        <div className="rounded-[1.5rem] bg-white p-6 shadow-lg shadow-primary/10"><h2 className="mb-3 text-lg font-medium text-foreground">商品描述</h2><p className="text-sm leading-relaxed text-muted-foreground">{formal.description}</p></div>
        <div className="space-y-2">
          <button type="button" onClick={onToggleActive} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 font-medium transition-colors ${product.isActive ? 'bg-soft-pink text-foreground hover:bg-soft-pink/80' : 'bg-soft-green text-foreground hover:bg-soft-green/80'}`}>
            {product.isActive ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5" />}
            {product.isActive ? '停用商品' : '啟用商品'}
          </button>
          <button type="button" onClick={onEdit} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/85"><Edit className="h-5 w-5" />編輯商品</button>
          <button type="button" onClick={onDelete} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-soft-pink px-6 py-3 font-medium text-danger transition-colors hover:bg-soft-pink/80"><Trash2 className="h-5 w-5" />刪除商品</button>
        </div>
      </div>
    </div>
  );
}

function DemoTransactionWorkspace({ products, onCartSale, onManualSale }: { products: DemoProduct[]; onCartSale: (items: Array<{ productId: string; quantity: number }>) => void; onManualSale: (amount: number) => void }) {
  const [mode, setMode] = useState<TransactionMode>('quick');
  const [displayAmount, setDisplayAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<SalesPaymentMethod>('cash');
  const [cart, setCart] = useState<Record<string, number>>({});
  const amount = Number.parseInt(displayAmount, 10) || 0;
  const cartItems = products.flatMap(product => cart[product.id] ? [{ product, quantity: cart[product.id] }] : []);
  const cartTotal = cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const appendNumber = (number: number) => setDisplayAmount(previous => previous === '0' ? String(number) : `${previous}${number}`);
  const completeManual = () => { if (amount <= 0) return; onManualSale(amount); setDisplayAmount('0'); };
  const addProduct = (product: DemoProduct) => setCart(current => ({ ...current, [product.id]: product.unlimitedStock ? (current[product.id] ?? 0) + 1 : Math.min(product.stock, (current[product.id] ?? 0) + 1) }));
  const changeQuantity = (productId: string, delta: number) => setCart(current => {
    const product = products.find(item => item.id === productId);
    if (!product) return current;
    const requestedQuantity = (current[productId] ?? 0) + delta;
    const quantity = Math.max(0, product.unlimitedStock ? requestedQuantity : Math.min(product.stock, requestedQuantity));
    const next = { ...current };
    if (quantity === 0) delete next[productId];
    else next[productId] = quantity;
    return next;
  });
  const completeProduct = () => {
    if (cartItems.length === 0) return;
    onCartSale(cartItems.map(item => ({ productId: item.product.id, quantity: item.quantity })));
    setCart({});
  };
  return (
    <section className="mb-6 overflow-hidden rounded-card bg-atelier-paper shadow-atelier-lift">
      <div className="flex items-start justify-between gap-3 bg-atelier-apricot-soft/65 px-4 py-4 sm:px-5"><div className="min-w-0"><p className="text-xs font-semibold text-atelier-clay">現場收款</p><h2 className="mt-1 text-lg font-semibold text-atelier-ink">把這筆交易收好</h2><p className="mt-1 text-xs text-atelier-muted">成交後會立即更新今天的紀錄</p></div><button type="button" className="relative flex min-h-11 shrink-0 items-center gap-2 rounded-control bg-atelier-paper/75 px-3 text-sm font-medium text-atelier-muted shadow-sm"><Camera className="h-4 w-4 text-primary" />待補<span className="min-w-5 rounded-full bg-atelier-canvas px-1.5 py-0.5 text-center text-xs">0</span></button></div>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 px-1 py-1"><span className="flex items-center gap-2 text-xs text-atelier-muted"><Camera className="h-4 w-4 text-primary" />成交照片</span><span className="rounded-full bg-atelier-canvas px-2.5 py-1 text-xs font-medium text-atelier-muted">依需要補拍</span></div>
        <div className="mb-5 grid grid-cols-2 rounded-control bg-atelier-sage-soft p-1" role="tablist" aria-label="交易方式"><button type="button" role="tab" aria-selected={mode === 'quick'} onClick={() => setMode('quick')} className={`flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-medium ${mode === 'quick' ? 'bg-atelier-paper text-primary shadow-sm' : 'text-atelier-muted'}`}><DollarSign className="h-4 w-4" />快速金額</button><button type="button" role="tab" aria-selected={mode === 'products'} onClick={() => setMode('products')} className={`flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-medium ${mode === 'products' ? 'bg-atelier-paper text-primary shadow-sm' : 'text-atelier-muted'}`}><ShoppingBag className="h-4 w-4" />商品結帳</button></div>
        {mode === 'quick' ? (
          <div><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-medium text-atelier-ink">成交金額</p><p className="text-xs text-atelier-muted">直接輸入</p></div><div className="relative mb-4 overflow-hidden rounded-card bg-deep px-4 py-5 shadow-atelier"><span className="absolute inset-y-0 left-0 w-1.5 bg-atelier-clay" /><div className="flex items-center justify-between gap-3"><div className="text-3xl font-semibold tabular-nums text-white">NT$ {amount.toLocaleString()}</div><button type="button" onClick={() => setDisplayAmount('0')} className="flex h-11 w-11 items-center justify-center rounded-control bg-white/10 text-white"><X className="h-5 w-5" /></button></div></div><div className="mb-5 grid grid-cols-3 gap-2.5">{[1,2,3,4,5,6,7,8,9].map(number => <button key={number} type="button" onClick={() => appendNumber(number)} className="min-h-14 rounded-control bg-atelier-paper text-xl font-semibold text-atelier-ink shadow-atelier-key hover:bg-atelier-sage-soft">{number}</button>)}<button type="button" onClick={() => setDisplayAmount(previous => previous === '0' ? '0' : `${previous}00`)} className="min-h-14 rounded-control bg-atelier-blue-soft text-lg font-semibold text-atelier-blue shadow-atelier-key">00</button><button type="button" onClick={() => appendNumber(0)} className="min-h-14 rounded-control bg-atelier-paper text-xl font-semibold text-atelier-ink shadow-atelier-key">0</button><button type="button" onClick={() => setDisplayAmount(previous => previous.length <= 1 ? '0' : previous.slice(0, -1))} aria-label="刪除最後一位" className="min-h-14 rounded-control bg-atelier-apricot-soft text-atelier-clay shadow-atelier-key">⌫</button></div><PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} /><button type="button" onClick={completeManual} disabled={amount <= 0} className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-base font-semibold text-white disabled:bg-atelier-line disabled:text-atelier-muted"><Check className="h-5 w-5" />完成成交 NT${amount.toLocaleString()}</button></div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-medium text-atelier-ink">選擇商品</p><p className="mt-0.5 text-xs text-atelier-muted">點一下加入這筆交易</p></div></div>
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">{products.filter(product => product.isActive).map((product, index) => { const quantity = cart[product.id] ?? 0; return <button key={product.id} type="button" disabled={!product.unlimitedStock && product.stock === 0} onClick={() => addProduct(product)} className={`relative min-h-28 rounded-control p-3 text-left shadow-atelier-key disabled:opacity-45 ${quantity > 0 ? 'bg-atelier-sage-soft ring-2 ring-primary' : ['bg-atelier-sage-soft','bg-atelier-apricot-soft','bg-atelier-blue-soft','bg-atelier-rose-soft'][index % 4]}`}>{quantity > 0 && <span className="absolute right-2 top-2 min-w-6 rounded-full bg-primary px-1.5 py-0.5 text-center text-xs font-medium text-white">{quantity}</span>}<Package className="mb-3 h-5 w-5 text-primary" /><span className="block truncate text-sm font-semibold text-atelier-ink">{product.name}</span><span className="mt-1 block text-sm text-atelier-muted">NT${product.price.toLocaleString()}</span></button>; })}</div>
            {cartItems.length > 0 && <div className="-mx-4 mb-5 bg-atelier-blue-soft/45 px-4 py-4 sm:-mx-5 sm:px-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-medium text-foreground">這筆商品</h3><button type="button" onClick={() => setCart({})} className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm text-atelier-clay hover:bg-atelier-clay/10"><Trash2 className="h-4 w-4" />清空</button></div><div className="space-y-2">{cartItems.map(item => <div key={item.product.id} className="flex min-h-16 items-center justify-between gap-3 rounded-control bg-atelier-paper px-3 py-2 shadow-sm"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{item.product.name}</p><p className="text-xs tabular-nums text-muted-foreground">NT${(item.product.price * item.quantity).toLocaleString()}</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => changeQuantity(item.product.id, -1)} aria-label={`減少 ${item.product.name} 數量`} className="flex h-11 w-11 items-center justify-center rounded-control bg-atelier-canvas text-atelier-ink"><Minus className="h-4 w-4" /></button><span className="w-8 text-center text-sm font-medium tabular-nums">{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.product.id, 1)} aria-label={`增加 ${item.product.name} 數量`} className="flex h-11 w-11 items-center justify-center rounded-control bg-primary text-white"><Plus className="h-4 w-4" /></button></div></div>)}</div></div>}
            <div className="relative mb-5 flex items-center justify-between overflow-hidden rounded-card bg-deep px-4 py-4 text-white shadow-atelier"><span className="absolute inset-y-0 left-0 w-1.5 bg-atelier-clay" /><span className="text-sm font-medium text-white/75">交易總額</span><span className="text-2xl font-semibold tabular-nums">NT${cartTotal.toLocaleString()}</span></div>
            <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
            <button type="button" onClick={completeProduct} disabled={cartItems.length === 0} className="mt-4 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-base font-semibold text-white disabled:bg-atelier-line disabled:text-atelier-muted"><ShoppingCart className="h-5 w-5" />完成商品結帳 NT${cartTotal.toLocaleString()}</button>
          </div>
        )}
      </div>
    </section>
  );
}

function MarketWorkspace({ market, products, activities, onBack, onCartSale, onManualSale, onInteraction, onEditMarket, onStatusChange }: { market: DemoMarket; products: DemoProduct[]; activities: DemoActivity[]; onBack: () => void; onCartSale: (items: Array<{ productId: string; quantity: number }>) => void; onManualSale: (amount: number) => void; onInteraction: (label: string) => void; onEditMarket: () => void; onStatusChange: (status: DemoMarketStatus) => void }) {
  const [view, setView] = useState<WorkspaceView>('live');
  const phase = market.status === 'operating' ? 'operating' : market.status === 'ended' ? 'ended' : 'not-started';
  const tabs = [{ id: 'live' as const, label: '現場', icon: Store }, { id: 'overview' as const, label: '回顧', icon: BarChart3 }, { id: 'manage' as const, label: '管理', icon: ClipboardCheck }];
  const summaryItems = view === 'manage'
    ? [{ label: '市集狀態', value: stageLabel(stageForMarket(market.status)) }, { label: '固定成本', value: formatCurrency(2000) }, { label: '成交照片', value: '依需要' }]
    : view === 'overview'
      ? [{ label: '總營業額', value: formatCurrency(market.revenue), emphasis: true }, { label: '估計淨利', value: formatCurrency(Math.round(market.revenue * 0.48)) }, { label: '成交', value: market.deals }]
      : [{ label: '營業額', value: formatCurrency(market.revenue), emphasis: true }, { label: '成交', value: market.deals }, { label: '待補照片', value: 0 }];
  return (
    <div className="min-h-screen bg-atelier-canvas pb-24 text-atelier-ink">
      <header className="japanese-gradient-header rounded-b-[2rem] px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
        <div className="mx-auto max-w-5xl"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 flex-1 items-start gap-3"><button type="button" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-atelier-paper text-atelier-muted shadow-sm hover:bg-atelier-blue-soft" aria-label="返回市集列表"><ArrowLeft className="h-5 w-5" /></button><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white/85">一場一場，好好經營市集</p><h1 className="mt-1 break-words text-2xl font-semibold leading-tight text-white">{market.name}</h1><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/80"><div className="flex items-start gap-1.5"><Calendar className="mt-0.5 h-3.5 w-3.5" /><span>{market.dateLabel}</span></div><div className="flex min-w-0 items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /><span className="truncate">{market.location}</span></div></div><p className="mt-2 text-xs leading-5 text-white/80">現場、回顧與管理都集中在這裡，依照現在的節奏使用就好。</p></div></div><div className="flex shrink-0 items-center gap-1"><StaticSyncStatus /><button type="button" onClick={onEditMarket} className="flex min-h-11 items-center gap-1.5 rounded-control bg-atelier-paper px-3 text-sm font-medium text-atelier-ink shadow-sm"><Edit className="h-4 w-4" />編輯</button></div></div></div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-6">
        <MarketWorkspaceNavigation value={view} onChange={setView} ariaLabel="市集工作區" items={tabs} />
        <MarketWorkspaceSummary phase={phase} operatingTime={market.time} items={summaryItems} />
        {view === 'live' && market.status === 'operating' && <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]"><section className="rounded-card bg-atelier-blue-soft/65 p-4 shadow-atelier lg:col-start-2 lg:row-start-1"><h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-atelier-ink"><TrendingUp className="h-5 w-5 text-primary" />記錄互動</h2><div className="relative grid grid-cols-3 gap-2">{['停留詢問','追蹤 IG','試用體驗'].map((label, index) => <button key={label} type="button" onClick={() => onInteraction(label)} className={`relative min-h-24 overflow-hidden rounded-control p-3 shadow-atelier-key ${['bg-atelier-sage-soft','bg-atelier-apricot-soft','bg-atelier-blue-soft'][index]}`}><div className="mb-2 text-center text-2xl">{['💬','♡','✦'][index]}</div><div className="text-center text-sm font-semibold text-atelier-ink">{label}</div></button>)}</div></section><div className="lg:col-start-1 lg:row-start-1 lg:row-span-2"><DemoTransactionWorkspace products={products} onCartSale={onCartSale} onManualSale={onManualSale} /></div><div className="rounded-card bg-atelier-paper p-4 shadow-atelier lg:col-start-2 lg:row-start-2"><h2 className="mb-3 text-base font-semibold text-atelier-ink">最近紀錄</h2><div className="space-y-2">{activities.slice(0, 4).map(activity => <div key={activity.id} className="rounded-control bg-atelier-canvas px-3 py-2"><p className="text-sm font-medium text-foreground">{activity.label}</p><p className="mt-1 text-xs text-muted-foreground">{activity.time}・{activity.detail}</p></div>)}</div></div></div>}
        {view === 'live' && market.status !== 'operating' && <div className="rounded-card bg-atelier-apricot-soft/70 px-4 py-4 text-sm text-atelier-muted shadow-sm">這場市集目前不在營運時間，仍可切換到「回顧」或「管理」查看資料。</div>}
        {view === 'overview' && <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-card bg-atelier-paper p-5 shadow-atelier"><h2 className="text-base font-semibold text-atelier-ink">營運表現</h2><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-control bg-soft-green p-4"><p className="text-xs text-muted-foreground">互動</p><p className="mt-1 text-xl font-semibold">{market.interactions}</p></div><div className="rounded-control bg-soft-yellow p-4"><p className="text-xs text-muted-foreground">轉換率</p><p className="mt-1 text-xl font-semibold">{market.interactions > 0 ? Math.round(market.deals / market.interactions * 100) : 0}%</p></div></div></div><div className="rounded-card bg-atelier-paper p-5 shadow-atelier"><h2 className="text-base font-semibold text-atelier-ink">市集筆記</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{market.note}</p></div></div>}
        {view === 'manage' && <div className="space-y-4"><section className="rounded-card border border-primary/10 bg-atelier-paper p-5 shadow-atelier"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-foreground">營運狀態</h2><p className="mt-1 text-sm text-muted-foreground">依照現場進度開始或結束本場營運。</p></div>{market.status === 'preparing' ? <Button onClick={() => onStatusChange('operating')}>開始營運</Button> : market.status === 'operating' ? <Button variant="secondary" onClick={() => onStatusChange('ended')}>結束營運</Button> : <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">已結束</span>}</div></section><section className="rounded-card border border-primary/10 bg-atelier-paper p-5 shadow-atelier"><h2 className="text-lg font-semibold text-foreground">基本設定</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-control bg-background p-4"><p className="text-xs text-muted-foreground">營運時間</p><p className="mt-1 text-sm font-medium">{market.time}</p></div><div className="rounded-control bg-background p-4"><p className="text-xs text-muted-foreground">市集地點</p><p className="mt-1 text-sm font-medium">{market.location}</p></div></div><Button variant="secondary" onClick={onEditMarket} className="mt-4" leadingIcon={<Edit className="h-4 w-4" />}>編輯完整設定</Button></section><section className="rounded-card border border-primary/10 bg-atelier-paper p-5 shadow-atelier"><h2 className="text-lg font-semibold text-foreground">成本與紀錄</h2><p className="mt-2 text-sm text-muted-foreground">固定成本 {formatCurrency(calculateMarketFixedCost(market))}・成交照片{market.salesPhotoEvidenceRequired ? '必須補拍' : '依需要補拍'}。</p></section></div>}
      </main>
    </div>
  );
}

export function FormalDemoApp() {
  const [activeView, setActiveView] = useState<DemoView>('today');
  const [markets, setMarkets] = useState<DemoMarket[]>(createInitialDemoMarkets);
  const [products, setProducts] = useState<DemoProduct[]>(createInitialDemoProducts);
  const [activities, setActivities] = useState<DemoActivity[]>(createInitialDemoActivities);
  const [marketView, setMarketView] = useState<MarketView>('active');
  const [productView, setProductView] = useState<ProductView>('all');
  const [productQuery, setProductQuery] = useState('');
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [workspaceMarketId, setWorkspaceMarketId] = useState<string | null>(null);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [marketFormMode, setMarketFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingMarketId, setEditingMarketId] = useState<string | null>(null);
  const [marketFormValues, setMarketFormValues] = useState<DemoMarketFormValues>(createDemoMarketFormValues);
  const [marketFormErrors, setMarketFormErrors] = useState<MarketCoreFormErrors>({});
  const [productFormMode, setProductFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productFormValues, setProductFormValues] = useState<ProductFormValues>(createEmptyProductFormValues);
  const [productFormErrors, setProductFormErrors] = useState<ProductFormErrors>({});
  const [deleteProductOpen, setDeleteProductOpen] = useState(false);
  const [defaultPhotoRequired, setDefaultPhotoRequired] = useState(false);

  const activeMarket = markets.find(market => market.status === 'operating') ?? markets[0];
  const workspaceMarket = markets.find(market => market.id === workspaceMarketId);
  const detailProduct = products.find(product => product.id === detailProductId);
  const timeLabel = () => new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

  const addActivity = (activity: Omit<DemoActivity, 'id' | 'time'>) => setActivities(current => [{ ...activity, id: `demo-${Date.now()}`, time: timeLabel() }, ...current].slice(0, 8));

  const saleMarket = workspaceMarket?.status === 'operating' ? workspaceMarket : activeMarket;

  const recordCartSale = (items: Array<{ productId: string; quantity: number }>) => {
    if (!saleMarket || items.length === 0) return;
    const resolvedItems = items.flatMap(item => {
      const product = products.find(candidate => candidate.id === item.productId);
      if (!product || item.quantity <= 0 || (!product.unlimitedStock && product.stock < item.quantity)) return [];
      return [{ product, quantity: item.quantity }];
    });
    if (resolvedItems.length !== items.length) { toast.error('部分商品庫存不足，請重新確認'); return; }
    const total = resolvedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const totalQuantity = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);
    setProducts(current => current.map(product => {
      const cartItem = resolvedItems.find(item => item.product.id === product.id);
      if (!cartItem) return product;
      return { ...product, stock: product.unlimitedStock ? product.stock : product.stock - cartItem.quantity, sold: product.sold + cartItem.quantity };
    }));
    setMarkets(current => current.map(market => market.id === saleMarket.id ? { ...market, revenue: market.revenue + total, deals: market.deals + 1 } : market));
    const label = resolvedItems.length === 1 ? `售出 ${resolvedItems[0].product.name} × ${resolvedItems[0].quantity}` : `售出 ${resolvedItems.length} 項商品（共 ${totalQuantity} 件）`;
    addActivity({ type: 'sale', label, detail: `${formatCurrency(total)}・商品結帳` });
    toast.success('商品成交已完成', { description: formatCurrency(total) });
  };

  const recordManualSale = (amount: number) => {
    if (!saleMarket) return;
    setMarkets(current => current.map(market => market.id === saleMarket.id ? { ...market, revenue: market.revenue + amount, deals: market.deals + 1 } : market));
    addActivity({ type: 'sale', label: '快速金額成交', detail: `${formatCurrency(amount)}・Demo 成交` });
    toast.success('成交已記錄', { description: formatCurrency(amount) });
  };

  const recordInteraction = (label: string) => {
    if (!saleMarket) return;
    setMarkets(current => current.map(market => market.id === saleMarket.id ? { ...market, interactions: market.interactions + 1 } : market));
    addActivity({ type: 'interaction', label, detail: '現場顧客互動' });
    toast.success(`${label} 已記錄`);
  };

  const openAddMarketForm = () => {
    setEditingMarketId(null);
    setMarketFormValues({ ...createDemoMarketFormValues(), salesPhotoEvidenceRequired: defaultPhotoRequired });
    setMarketFormErrors({});
    setMarketFormMode('add');
  };

  const openEditMarketForm = (market: DemoMarket) => {
    setEditingMarketId(market.id);
    setMarketFormValues(createDemoMarketFormValues(market));
    setMarketFormErrors({});
    setMarketFormMode('edit');
  };

  const submitMarketForm = () => {
    const errors = validateMarketCoreForm(marketFormValues);
    setMarketFormErrors(errors);
    if (Object.keys(errors).length > 0) { toast.error('請先完成市集的必填資料'); return; }
    const buildMarket = (base?: DemoMarket): DemoMarket => ({
      id: base?.id ?? `market-${Date.now()}`,
      name: marketFormValues.name.trim(),
      dateLabel: formatDemoDateLabel(marketFormValues.dates),
      location: marketFormValues.location.trim(),
      time: `${marketFormValues.operatingStartTime} - ${marketFormValues.operatingEndTime}`,
      status: base?.status ?? 'preparing',
      revenue: base?.revenue ?? 0,
      deals: base?.deals ?? 0,
      interactions: base?.interactions ?? 0,
      note: marketFormValues.notes.trim() || '尚未填寫主辦／場地備註。',
      dates: [...marketFormValues.dates].sort(),
      checkInTime: marketFormValues.checkInTime,
      operatingStartTime: marketFormValues.operatingStartTime,
      operatingEndTime: marketFormValues.operatingEndTime,
      boothCost: marketFormValues.boothCost,
      deposit: marketFormValues.deposit,
      commissionRate: marketFormValues.commissionRate,
      tableRental: marketFormValues.tableRental,
      chairRental: marketFormValues.chairRental,
      umbrellaRental: marketFormValues.umbrellaRental,
      tableFree: marketFormValues.tableFree,
      chairFree: marketFormValues.chairFree,
      umbrellaFree: marketFormValues.umbrellaFree,
      salesPhotoEvidenceRequired: marketFormValues.salesPhotoEvidenceRequired,
    });
    if (marketFormMode === 'edit' && editingMarketId) {
      setMarkets(current => current.map(market => market.id === editingMarketId ? buildMarket(market) : market));
      toast.success('市集設定已更新');
    } else {
      setMarkets(current => [buildMarket(), ...current]);
      setMarketView('preparing');
      toast.success('市集已建立');
    }
    setMarketFormMode(null);
  };

  const openAddProductForm = () => {
    setEditingProductId(null);
    setProductFormValues(createEmptyProductFormValues());
    setProductFormErrors({});
    setProductFormMode('add');
  };

  const openEditProductForm = (product: DemoProduct) => {
    setEditingProductId(product.id);
    setProductFormValues(createProductFormValues(toFormalProduct(product)));
    setProductFormErrors({});
    setProductFormMode('edit');
  };

  const changeProductForm = <Field extends keyof ProductFormValues>(field: Field, value: ProductFormValues[Field]) => {
    setProductFormValues(current => ({ ...current, [field]: value }));
    setProductFormErrors(current => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field as keyof ProductFormErrors];
      return next;
    });
  };

  const submitProductForm = () => {
    const errors = validateProductForm(productFormValues);
    setProductFormErrors(errors);
    if (Object.keys(errors).length > 0) { toast.error('請先完成商品的必填資料'); return; }
    const tones = ['pink', 'green', 'yellow', 'blue'] as const;
    const buildProduct = (base?: DemoProduct): DemoProduct => ({
      id: base?.id ?? `product-${Date.now()}`,
      name: productFormValues.name.trim(),
      category: DEMO_CATEGORY_MAP[productFormValues.category],
      price: productFormValues.price,
      cost: productFormValues.cost,
      stock: productFormValues.stock,
      unlimitedStock: productFormValues.unlimitedStock,
      isActive: productFormValues.isActive,
      sold: base?.sold ?? 0,
      description: productFormValues.description.trim(),
      tone: base?.tone ?? tones[products.length % tones.length],
    });
    if (productFormMode === 'edit' && editingProductId) {
      setProducts(current => current.map(product => product.id === editingProductId ? buildProduct(product) : product));
      toast.success('商品已更新');
    } else {
      setProducts(current => [buildProduct(), ...current]);
      setProductView('all');
      toast.success('商品已建立');
    }
    setProductFormMode(null);
  };

  const toggleProductActive = (productId: string) => {
    setProducts(current => current.map(product => product.id === productId ? { ...product, isActive: !product.isActive } : product));
    toast.success('商品狀態已更新');
  };

  const deleteSelectedProduct = () => {
    if (!detailProductId) return;
    setProducts(current => current.filter(product => product.id !== detailProductId));
    setDeleteProductOpen(false);
    setDetailProductId(null);
    toast.success('商品已刪除');
  };

  const changeMarketStatus = (marketId: string, status: DemoMarketStatus) => {
    setMarkets(current => current.map(market => market.id === marketId ? { ...market, status } : market));
    setMarketView(stageForMarket(status));
    toast.success(status === 'operating' ? '市集已開始營運' : '市集已結束營運');
  };

  const openThemeLab = () => window.dispatchEvent(new Event(THEME_LAB_OPEN_EVENT));
  const exportDemoData = () => {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), markets, products, activities, settings: { defaultPhotoRequired } }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `feria-demo-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('Demo 備份已下載');
  };
  const resetDemo = () => {
    setMarkets(createInitialDemoMarkets());
    setProducts(createInitialDemoProducts());
    setActivities(createInitialDemoActivities());
    setMarketView('active');
    setProductView('all');
    setProductQuery('');
    setShowInactiveProducts(false);
    setWorkspaceMarketId(null);
    setDetailProductId(null);
    setDefaultPhotoRequired(false);
    toast.success('Demo 已還原成初始狀態');
  };
  const changeMainView = (view: DemoView) => { setWorkspaceMarketId(null); setDetailProductId(null); setActiveView(view); };

  let page: ReactNode = null;
  if (activeMarket) {
    if (activeView === 'today') page = <TodayPage activeMarket={activeMarket} upcomingMarkets={markets.filter(market => market.status === 'preparing')} onOpenMarket={market => setWorkspaceMarketId(market.id)} onShowMarkets={() => setActiveView('markets')} onOpenSettings={() => setActiveView('more')} />;
    else if (activeView === 'markets') page = <MarketsPage markets={markets} view={marketView} onViewChange={setMarketView} onAdd={openAddMarketForm} onOpen={market => setWorkspaceMarketId(market.id)} />;
    else if (activeView === 'products') page = <ProductsPage products={products} query={productQuery} view={productView} showInactive={showInactiveProducts} onQueryChange={setProductQuery} onViewChange={setProductView} onShowInactiveChange={setShowInactiveProducts} onAdd={openAddProductForm} onOpen={product => setDetailProductId(product.id)} />;
    else if (activeView === 'analytics') page = <AnalyticsPage markets={markets} products={products} />;
    else page = <MorePage onOpenThemeLab={openThemeLab} defaultPhotoRequired={defaultPhotoRequired} onPhotoRequiredChange={setDefaultPhotoRequired} onExport={exportDemoData} onReset={resetDemo} />;
  }

  const content = workspaceMarket
    ? <MarketWorkspace market={workspaceMarket} products={products} activities={activities} onBack={() => setWorkspaceMarketId(null)} onCartSale={recordCartSale} onManualSale={recordManualSale} onInteraction={recordInteraction} onEditMarket={() => openEditMarketForm(workspaceMarket)} onStatusChange={status => changeMarketStatus(workspaceMarket.id, status)} />
    : detailProduct
      ? <ProductDetail product={detailProduct} onBack={() => setDetailProductId(null)} onEdit={() => openEditProductForm(detailProduct)} onToggleActive={() => toggleProductActive(detailProduct.id)} onDelete={() => setDeleteProductOpen(true)} />
      : page;

  return (
    <>
      {content}
      <DemoBottomNavigation activeView={activeView} onChange={changeMainView} />

      <DemoMarketForm open={marketFormMode !== null} title={marketFormMode === 'edit' ? '編輯市集' : '新增市集'} submitLabel={marketFormMode === 'edit' ? '儲存變更' : '建立市集'} values={marketFormValues} errors={marketFormErrors} onChange={values => { setMarketFormValues(values); setMarketFormErrors({}); }} onClose={() => setMarketFormMode(null)} onSubmit={submitMarketForm} />
      <DemoProductForm open={productFormMode !== null} title={productFormMode === 'edit' ? '編輯商品' : '新增商品'} submitLabel={productFormMode === 'edit' ? '儲存變更' : '建立商品'} values={productFormValues} errors={productFormErrors} onChange={changeProductForm} onClose={() => setProductFormMode(null)} onSubmit={submitProductForm} />
      <ConfirmDialog open={deleteProductOpen} onClose={() => setDeleteProductOpen(false)} onConfirm={deleteSelectedProduct} title="刪除商品？" description="刪除後會從這次 Demo 的商品清單移除。" confirmLabel="刪除商品" tone="danger" />
    </>
  );
}
