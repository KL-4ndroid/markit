'use client';
import { APP_BRAND } from '@/lib/app-brand';

import Image from 'next/image';
import Link from 'next/link';
import { DemoMarketComparison } from './DemoMarketComparison';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  BarChart3,
  BookOpen,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  DollarSign,
  Edit,
  FileText,
  Gem,
  Hand,
  MapPin,
  Minus,
  MoreHorizontal,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

import { ActionableInsightsCard } from '@/components/analytics/ActionableInsightsCard';
import { AdvancedAnalysisGate } from '@/components/analytics/AdvancedAnalysisGate';
import { AnalyticsSummaryHighlights } from '@/components/analytics/AnalyticsSummaryHighlights';
import { DailyRevenueChart } from '@/components/analytics/DailyRevenueChart';
import { DateRangeFilter, type AnalyticsRange } from '@/components/analytics/DateRangeFilter';
import { MarketTrendCard } from '@/components/analytics/MarketTrendCard';
import { TopProductsCard } from '@/components/analytics/TopProductsCard';
import { TodayMarketCard } from '@/components/home/TodayMarketCard';
import { WorkspacePageHeader } from '@/components/layout/WorkspacePageHeader';
import { MarketListCard } from '@/components/markets/MarketListCard';
import { MarketRegistrationPanel } from '@/components/markets/MarketRegistrationPanel';
import { MarketEquipmentSummary } from '@/components/markets/MarketEquipmentSummary';
import { MarketTodayTimeline } from '@/components/markets/MarketTodayTimeline';
import { MarketWorkspaceNavigation } from '@/components/markets/MarketWorkspaceNavigation';
import { MarketWorkspaceDetailTabs } from '@/components/markets/MarketWorkspaceDetailTabs';
import { MarketSaleReceipt } from '@/components/markets/MarketSaleReceipt';
import { MarketWorkspaceSummary } from '@/components/markets/MarketWorkspaceSummary';
import {
  MarketBasicFields,
  MarketCostFields,
  MarketEquipmentFields,
  MarketNotesField,
  MarketTimelineFields,
  type MarketEquipmentField,
  type MarketTimelineField,
} from '@/components/markets/MarketFormFields';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductFormFields } from '@/components/products/ProductFormFields';
import { AppBottomNavigationBar } from '@/components/navigation/AppBottomNavigationBar';
import { SettingsPageShell } from '@/components/settings/SettingsPageShell';
import { PaymentMethodSelector } from '@/components/sales/PaymentMethodSelector';
import { QuickAmountCheckout } from '@/components/sales/QuickAmountCheckout';
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
  DEMO_REGISTRATION_MARKET_ID,
  createInitialDemoProducts,
  createInitialDemoSales,
  type DemoActivity,
  type DemoMarket,
  type DemoMarketStatus,
  type DemoProduct,
  type DemoSaleRecord,
  type DemoView,
} from '@/lib/demo/formal-demo-data';
import { formatSalesPaymentMethod, type SalesPaymentMethod } from '@/lib/sales/payment-methods';
import {
  calculateMarketDurationLabel,
  calculateMarketFixedCost,
  deriveMarketDateBounds,
  validateMarketCoreForm,
  type MarketCoreFormErrors,
} from '@/lib/markets/market-form';
import { buildMarketListGroups, type MarketPreparationFilter } from '@/lib/markets/market-list-view-model';
import { buildTodayViewModel } from '@/lib/home/today-view-model';
import {
  getAppNavigationItems,
  type AppNavigationItemId,
} from '@/lib/navigation/app-navigation';
import {
  createEmptyProductFormValues,
  createProductFormValues,
  validateProductForm,
  type ProductFormErrors,
  type ProductFormValues,
} from '@/lib/products/product-form';
import { marketFeeDisplayRows } from '@/lib/subscription/ui-presentation';
import { formatDisplayDate } from '@/lib/presentation/formatters';
import { formatCurrency } from '@/lib/utils';
import type { Market, Product, ProductCategory } from '@/types/db';

type MarketView = 'active' | 'preparing' | 'ended' | 'cancelled';
type ProductView = 'all' | ProductCategory;
type AnalyticsView = 'summary' | 'trends' | 'products';
type WorkspaceView = 'live' | 'overview' | 'manage';
type TransactionMode = 'quick' | 'products';

const DEMO_NAV_ITEMS = getAppNavigationItems({ isStaff: false, roleReady: true });
const DEMO_NOW = new Date(2026, 6, 18, 15, 30);

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
    regionCode: market.regionCode,
    registrationConditions: market.registrationConditions,
    earlyEntryEnabled: market.earlyEntryEnabled,
    earlyEntryTime: market.earlyEntryTime,
    dates: [...market.dates],
    startDate,
    endDate,
    startTime: market.operatingStartTime,
    endTime: market.operatingEndTime,
    checkInTime: market.checkInTime,
    operatingStartTime: market.operatingStartTime,
    operatingEndTime: market.operatingEndTime,
    status: market.registrationStatus ?? (market.status === 'operating' ? 'ongoing' : market.status === 'ended' ? 'completed' : 'paid'),
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
    totalProfit: Math.round(market.revenue * market.grossMargin),
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
  regionCode?: Market['regionCode'];
  registrationConditions?: Market['registrationConditions'];
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
    regionCode: market?.regionCode,
    registrationConditions: market?.registrationConditions,
    dates: market ? [...market.dates] : [],
    noEarlyEntry: !market?.earlyEntryEnabled,
    earlyEntryTime: market?.earlyEntryTime ?? '10:00',
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
  const todayView = buildTodayViewModel(
    [activeMarket, ...upcomingMarkets].map(toFormalMarket),
    DEMO_NOW,
  );

  return (
    <div className="min-h-screen bg-atelier-canvas/80 text-atelier-ink">
      <header className="japanese-warm-header overflow-hidden rounded-b-[2rem] px-5 pb-9 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white shadow-atelier-lift">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-start justify-between gap-4">
            <p className="min-w-0 truncate text-xs font-semibold text-white/90">{APP_BRAND.name}・暖暖手作</p>
            <div className="flex shrink-0 items-center gap-1">
              <span className="rounded-full bg-white/15 px-2 py-1 text-xs font-medium text-white">範例體驗</span>
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

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-7 sm:px-6">
        <section aria-labelledby="today-focus-title">
          <div className="mb-4">
            <p className="text-xs font-semibold text-atelier-clay">現在</p>
            <h2 id="today-focus-title" className="mt-1 text-lg font-semibold text-atelier-ink">今天的營運重點</h2>
          </div>
          {todayView.primaryMarket && (
            <TodayMarketCard
              item={todayView.primaryMarket}
              isStaff={false}
              onOpen={() => onOpenMarket(activeMarket)}
            />
          )}
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
      </div>
    </div>
  );
}

function MarketsPage({ markets, view, preparationFilter, onFilterChange, onViewChange, onAdd, onOpen, onTryRegistration }: {
  markets: DemoMarket[];
  view: MarketView;
  preparationFilter: MarketPreparationFilter;
  onFilterChange: (filter: MarketPreparationFilter) => void;
  onViewChange: (view: MarketView) => void;
  onAdd: () => void;
  onOpen: (market: DemoMarket) => void;
  onTryRegistration: () => void;
}) {
  const groups = buildMarketListGroups(markets.map(toFormalMarket), DEMO_NOW);
  const filtered = view === 'preparing' && preparationFilter !== 'all'
    ? groups.preparing.filter(item => item.preparationAttention === preparationFilter)
    : groups[view];
  const preparationTabs = [
    { id: 'all' as const, label: '全部', count: groups.preparing.length },
    { id: 'awaiting_decision' as const, label: '等待錄取', count: groups.preparing.filter(item => item.preparationAttention === 'awaiting_decision').length },
    { id: 'payment_due' as const, label: '待繳費', count: groups.preparing.filter(item => item.preparationAttention === 'payment_due').length },
  ];
  const tabs = [
    { id: 'active' as const, label: '進行中', count: groups.active.length },
    { id: 'preparing' as const, label: '待準備', count: groups.preparing.length },
    { id: 'ended' as const, label: '已結束', count: groups.ended.length },
    ...(groups.cancelled.length > 0 ? [{ id: 'cancelled' as const, label: '已取消', count: groups.cancelled.length }] : []),
  ];
  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="市集"
        eyebrow="營運管理"
        icon={Store}
        action={<IconButton label="新增市集" tone="inverse" icon={<Plus className="h-5 w-5" />} onClick={onAdd} />}
      />
      <div className="mx-auto max-w-3xl px-4 pb-8 pt-6 sm:px-6">
        <Tabs items={tabs} value={view} onChange={onViewChange} ariaLabel="市集工作階段" />
        {view === 'preparing' && <>
          <Tabs className="mt-3" items={preparationTabs} value={preparationFilter} onChange={onFilterChange} ariaLabel="報名與繳費篩選" />
          <div className="mt-2 flex flex-wrap items-center gap-x-3">
            <Button className="px-0 text-primary underline underline-offset-4" variant="ghost" onClick={onTryRegistration}>試著安排一場市集</Button>
            <span className="text-xs text-muted-foreground">市集安排可在免費版使用。</span>
          </div>
        </>}
        <div className="mt-5 space-y-3">
          {filtered.length === 0 && <p className="rounded-card border border-border bg-atelier-paper p-4 text-sm text-muted-foreground">
            {view === 'preparing' && preparationFilter === 'payment_due' ? '目前沒有待繳費的市集。' : '這個分類目前沒有市集。'}
          </p>}
          {filtered.map(item => {
            const sourceMarket = markets.find(market => market.id === item.market.id);
            return (
              <MarketListCard
                key={item.market.id}
                item={item}
                isStaff={false}
                contextLabel={sourceMarket?.scenarioLabel}
                onOpen={() => sourceMarket && onOpen(sourceMarket)}
              />
            );
          })}
        </div>
      </div>
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
      <WorkspacePageHeader
        title="商品"
        eyebrow="商品管理"
        icon={Package}
        maxWidthClass="max-w-4xl"
        action={<IconButton label="新增商品" tone="inverse" icon={<Plus className="h-5 w-5" />} onClick={onAdd} />}
      />
      <div className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
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
      </div>
    </div>
  );
}

function buildDemoMetrics(markets: Market[]) {
  return composeMarketMetricsViewModel(markets.map(market => {
    const revenue = market.totalRevenue ?? 0;
    const deals = market.totalDeals ?? 0;
    const engaged = market.totalInteractions ?? 0;
    const fixedCost = calculateMarketFixedCost({
      ...market,
      tableFree: Boolean(market.tableFree),
      chairFree: Boolean(market.chairFree),
      umbrellaFree: Boolean(market.umbrellaFree),
    });
    const totalProfit = market.totalProfit ?? 0;
    const netProfit = totalProfit - fixedCost - revenue * (market.commissionRate ?? 0) / 100;
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

function AnalyticsPage({ markets, products, onOpenMarket }: { markets: DemoMarket[]; products: DemoProduct[]; onOpenMarket: (market: DemoMarket) => void }) {
  const [range, setRange] = useState<AnalyticsRange>('all');
  const [activeTab, setActiveTab] = useState<AnalyticsView>('summary');
  const [selectedMarketId, setSelectedMarketId] = useState(markets[0]?.id ?? '');
  const formalMarkets = markets.map(toFormalMarket);
  const formalProducts = products.map(toFormalProduct);
  const analyticsMarkets = formalMarkets.filter(
    market => market.status === 'ongoing' || market.status === 'completed',
  );
  const chronologicalMarkets = [...analyticsMarkets].sort((left, right) => left.startDate.localeCompare(right.startDate));
  const filteredMarkets = range === 'single'
    ? analyticsMarkets.filter(market => market.id === selectedMarketId)
    : range === 'recent3'
      ? chronologicalMarkets.slice(-3)
      : range === 'recent10'
        ? chronologicalMarkets.slice(-10)
        : analyticsMarkets;
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
  ];
  return (
    <div className="min-h-screen bg-background">
      <WorkspacePageHeader
        title="分析"
        eyebrow="營運決策"
        icon={BarChart3}
      />
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        <p className="mb-4 text-sm leading-6 text-muted-foreground">這裡顯示範例分析。正式版的完整報告與 PDF 匯出適用於高階版。</p>
        <DemoMarketComparison markets={markets} onOpen={onOpenMarket} />
        <DateRangeFilter value={range} onChange={setRange} markets={analyticsMarkets} selectedMarketId={selectedMarketId} onMarketChange={setSelectedMarketId} />
        <Tabs className="mt-5" items={tabs} value={activeTab} onChange={setActiveTab} ariaLabel="分析分頁" />
        <div className="mt-5">
          {activeTab === 'summary' && (
            <div className="space-y-5">
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
        </div>
      </div>
    </div>
  );
}

function SalesPhotoGallery({ sales }: { sales: DemoSaleRecord[] }) {
  const photoSales = sales.filter(sale => sale.photoPath);
  return (
    <section className="rounded-card border border-primary/10 bg-white p-4 shadow-atelier">
      <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-xs font-medium text-muted-foreground">本場紀錄</p><h2 className="mt-1 text-base font-semibold text-foreground">最近成交照片</h2></div><span className="rounded-full bg-soft-green px-3 py-1 text-xs font-medium text-primary">{photoSales.length} 筆已完成</span></div>
      <div className="space-y-4">{photoSales.map((sale, index) => <article key={sale.id} className="overflow-hidden rounded-card border border-primary/10 bg-atelier-canvas"><div className="relative aspect-[4/3] w-full overflow-hidden bg-muted"><Image src={sale.photoPath!} alt={`${sale.productName} 的成交照片`} fill priority={index === 0} sizes="(max-width: 640px) 100vw, 480px" className="object-cover" /></div><div className="p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">售出 {sale.productName}{sale.quantity > 1 ? ` x${sale.quantity}` : ''}</p><p className="mt-1 text-xs text-muted-foreground">{sale.time}・{sale.paymentMethod}</p></div><p className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(sale.amount)}</p></div></div></article>)}</div>
    </section>
  );
}

function MorePage({ sales, onReset, onOpenGuide }: { sales: DemoSaleRecord[]; onReset: () => void; onOpenGuide: () => void }) {
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <SettingsPageShell title="更多" description="管理這次免登入體驗。" icon={MoreHorizontal} isStaff={false}>
      <div className="space-y-5">
        <section className="rounded-card border border-border bg-atelier-paper p-4">
          <h2 className="font-semibold">開始自己的紀錄</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">在正式版建立的市集，登入後可跨裝置同步。</p>
          <Link href="/" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary hover:underline">開始記錄自己的市集</Link>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onOpenGuide}>重新開啟體驗引導</Button>
          <Button variant="secondary" onClick={() => setResetOpen(true)}>還原範例資料</Button>
        </div>
        <SalesPhotoGallery sales={sales} />
      </div>
      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} onConfirm={() => { setResetOpen(false); onReset(); }} title="還原範例資料？" description="本次新增的市集、商品與成交紀錄會清除。" confirmLabel="還原範例" tone="danger" />
    </SettingsPageShell>
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
  const update = <Field extends keyof DemoMarketFormValues>(field: Field, value: DemoMarketFormValues[Field]) => {
    onChange({ ...values, [field]: value });
  };
  const updateTimeline = (field: MarketTimelineField, value: string) => update(field, value);
  const updateCost = (field: 'boothCost' | 'deposit' | 'commissionRate', value: number) => update(field, value);
  const updateRental = (field: MarketEquipmentField, value: number) => update(field, value);

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
            regionCode={values.regionCode}
            onRegionChange={value => update('regionCode', value)}
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
        <FormSectionDisclosure title="報名與費用" description="攤位費、保證金與主辦抽成比例" icon={DollarSign}>
          <MarketCostFields idPrefix="demo-market" boothCost={values.boothCost} deposit={values.deposit} commissionRate={values.commissionRate} registrationTerms onChange={updateCost} />
        </FormSectionDisclosure>
        <FormSectionDisclosure title="設備與租借" description="桌椅、陽傘與租借費用" icon={Package}>
          <MarketEquipmentFields
            idPrefix="demo-market"
            registrationTerms
            rentals={{ tableRental: values.tableRental, chairRental: values.chairRental, umbrellaRental: values.umbrellaRental }}
            free={{ tableFree: values.tableFree, chairFree: values.chairFree, umbrellaFree: values.umbrellaFree }}
            conditions={values.registrationConditions}
            onRentalChange={updateRental}
            onFreeChange={(field, value) => update(field, value)}
            onStatusChange={(field, rentalField, status) => onChange({
              ...values,
              [field]: status === 'free',
              ...(status !== 'rental' ? { [rentalField]: 0 } : {}),
              registrationConditions: { ...values.registrationConditions, [field]: status },
            })}
          />
        </FormSectionDisclosure>
        <FormSectionDisclosure title="主辦／場地備註" description="停車、入場與場地資訊" icon={FileText}>
          <MarketNotesField idPrefix="demo-market" value={values.notes} onChange={value => update('notes', value)} />
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

function DemoTransactionWorkspace({ mode, products, onCartSale, onManualSale }: { mode: TransactionMode; products: DemoProduct[]; onCartSale: (items: Array<{ productId: string; quantity: number }>, paymentMethod: SalesPaymentMethod) => boolean; onManualSale: (amount: number, paymentMethod: SalesPaymentMethod) => void }) {
  const [displayAmount, setDisplayAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<SalesPaymentMethod>('cash');
  const [cart, setCart] = useState<Record<string, number>>({});
  const amount = Number.parseInt(displayAmount, 10) || 0;
  const cartItems = products.flatMap(product => cart[product.id] ? [{ product, quantity: cart[product.id] }] : []);
  const cartTotal = cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const completeManual = () => {
    if (!Number.isSafeInteger(amount) || amount <= 0) return;
    onManualSale(amount, paymentMethod);
    setDisplayAmount('0');
    setPaymentMethod('cash');
  };
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
    onCartSale(cartItems.map(item => ({ productId: item.product.id, quantity: item.quantity })), paymentMethod);
  };
  return (
    <div>
        {mode === 'quick' ? (
          <QuickAmountCheckout
            displayAmount={displayAmount}
            setDisplayAmount={setDisplayAmount}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            onComplete={completeManual}
            presentation="sheet"
          />
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
  );
}

const PERFORMANCE_TABS = [{ id: 'performance', label: '每日表現', icon: Calendar }] as const;

function DemoMarketPerformance({ market, sales, latestSaleId }: {
  market: Market;
  sales: DemoSaleRecord[];
  latestSaleId?: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dates = market.dates?.length ? market.dates : [market.startDate];
  const salesOn = (date: string) => sales.filter(sale => (sale.date ?? market.startDate) === date);
  const selectedSales = selectedDate ? salesOn(selectedDate) : [];

  return (
    <>
      <MarketWorkspaceDetailTabs value="performance" items={PERFORMANCE_TABS} onChange={() => {}} ariaLabel="回顧明細" panelId="demo-overview" />
      <section id="demo-overview" role="tabpanel" aria-labelledby="demo-overview-tab-performance" className="rounded-card border border-border bg-atelier-paper p-4 sm:p-5">
        <h2 className="font-semibold">{dates.length === 1 ? '收入明細' : '每日表現'}</h2>
        <ul className="mt-3 space-y-3">
          {dates.map(date => {
            const records = salesOn(date);
            const amount = dates.length === 1 ? market.totalRevenue ?? 0 : records.reduce((sum, sale) => sum + sale.amount, 0);
            return <li key={date} className="rounded-control border border-border px-4 py-3">
              <h3 className="font-semibold">{formatDisplayDate(date)}</h3>
              {(dates.length === 1 || records.length > 0) && <p className="mt-1 text-sm text-muted-foreground">當日收入 <strong className="text-foreground tabular-nums">{formatCurrency(amount)}</strong></p>}
              {records.length > 0
                ? <Button className="mt-3" variant="secondary" onClick={() => setSelectedDate(date)}>查看 {records.length} 筆{dates.length === 1 && records.length !== market.totalDeals ? '紀錄' : '成交'}</Button>
                : <p className="mt-2 text-sm text-muted-foreground">這天的範例沒有提供逐筆成交明細。</p>}
            </li>;
          })}
        </ul>
        <Link href="/" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary hover:underline">開始記錄自己的市集</Link>
      </section>
      <AppDialog open={selectedDate !== null} onClose={() => setSelectedDate(null)}
        title={selectedDate ? `${formatDisplayDate(selectedDate)} 成交記錄` : '成交記錄'}
        presentation="sheet"
        footer={<Button variant="secondary" onClick={() => setSelectedDate(null)}>返回每日表現</Button>}>
        <ul className="divide-y divide-border">
          {selectedSales.map(sale => <li key={sale.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-medium">{sale.productName}</p>
              <p className="text-xs text-muted-foreground">{sale.time} · {sale.paymentMethod}</p>
              {sale.id === latestSaleId && <span className="text-xs font-medium text-primary">剛新增</span>}
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(sale.amount)}</span>
          </li>)}
        </ul>
      </AppDialog>
    </>
  );
}

function MarketWorkspace({
  market, products, activities, sales, initialView, initialCheckout, lastSale,
  onBack, onShowMarketList, onCartSale, onManualSale, onInteraction, onEditMarket, onStatusChange, onRegistrationChange,
}: {
  market: DemoMarket;
  products: DemoProduct[];
  activities: DemoActivity[];
  sales: DemoSaleRecord[];
  initialView: WorkspaceView;
  initialCheckout: boolean;
  lastSale?: DemoSaleRecord;
  onBack: () => void;
  onShowMarketList: () => void;
  onCartSale: (items: Array<{ productId: string; quantity: number }>, paymentMethod: SalesPaymentMethod) => boolean;
  onManualSale: (amount: number, paymentMethod: SalesPaymentMethod) => void;
  onInteraction: (label: string) => void;
  onEditMarket: () => void;
  onStatusChange: (status: DemoMarketStatus) => void;
  onRegistrationChange: (status: Market['status']) => void;
}) {
  const [view, setView] = useState(initialView);
  const [checkoutMode, setCheckoutMode] = useState<TransactionMode | null>(initialCheckout ? 'quick' : null);
  const formalMarket = toFormalMarket(market);
  const isOperating = market.status === 'operating';
  const hasEnded = market.status === 'ended';
  const phase = isOperating ? 'operating' : hasEnded ? 'ended' : 'not-started';
  const tabs = [{ id: 'live', label: '現場', icon: Store }, { id: 'overview', label: '回顧', icon: BarChart3 }, { id: 'manage', label: '管理', icon: ClipboardCheck }] as const;
  const summaryItems = view === 'manage'
    ? marketFeeDisplayRows(formalMarket).map(row => ({ label: row.label, value: formatCurrency(row.value) }))
    : [{ label: '總收入', value: formatCurrency(market.revenue), emphasis: true }, { label: '成交', value: market.deals }];
  const marketSales = sales.filter(sale => sale.marketId === market.id);
  const registrationExample = market.id === DEMO_REGISTRATION_MARKET_ID && market.status === 'preparing';

  return (
    <div className="min-h-screen bg-atelier-canvas text-atelier-ink">
      <header className="japanese-gradient-header rounded-b-[2rem] px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={onBack} leadingIcon={<ArrowLeft className="h-4 w-4" />}>返回</Button>
            <span className="text-xs font-medium">範例市集</span>
            <Button variant="secondary" onClick={onEditMarket} leadingIcon={<Edit className="h-4 w-4" />}>編輯</Button>
          </div>
          <h1 className="mt-4 break-words text-2xl font-semibold">{market.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />{market.dateLabel}</p>
          {market.location && <p className="mt-1 flex items-start gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{market.location}</span></p>}
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pb-6">
        <MarketWorkspaceNavigation value={view} onChange={setView} ariaLabel="市集工作區" items={tabs} />
        <MarketWorkspaceSummary phase={phase} operatingTime={market.time} items={summaryItems} compactOnMobile />
        {view === 'live' && <>
          {lastSale && <MarketSaleReceipt amount={lastSale.amount} paymentLabel={lastSale.paymentMethod}
            totalRevenue={market.revenue} onReview={() => setView('overview')} />}
          {isOperating ? <div className="space-y-4">
            <section className="grid grid-cols-2 gap-2" aria-label="收款與銷售">
              <Button onClick={() => setCheckoutMode('quick')} leadingIcon={<Banknote className="h-4 w-4" />}>快速收款</Button>
              <Button variant="secondary" onClick={() => setCheckoutMode('products')} leadingIcon={<ShoppingBag className="h-4 w-4" />}>商品銷售</Button>
            </section>
            <section className="rounded-card border border-border bg-atelier-paper p-4">
              <h2 className="font-semibold">記錄互動</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {['停留詢問', '追蹤 IG', '試用體驗'].map(label => <Button variant="secondary" key={label} onClick={() => onInteraction(label)}>{label}</Button>)}
              </div>
              {activities[0] && <p className="mt-3 text-sm text-muted-foreground">最近紀錄 · {activities[0].label}</p>}
            </section>
          </div> : <p className="mb-4 rounded-card border border-border bg-atelier-paper p-4 text-sm text-muted-foreground">
            {hasEnded ? '本場已收攤，可到回顧查看營業紀錄。' : '這場市集還沒開始，可到管理更新報名與繳費。'}
          </p>}
          <div className="mt-4"><MarketTodayTimeline market={formalMarket} onEdit={onEditMarket} /></div>
        </>}
        {view === 'overview' && <DemoMarketPerformance market={formalMarket} sales={marketSales} latestSaleId={lastSale?.id} />}
        {view === 'manage' && <div className="space-y-4">
          <MarketRegistrationPanel status={formalMarket.status} onChange={onRegistrationChange} ended={hasEnded} readOnly={hasEnded || isOperating}>
            <p className="mt-2 text-sm text-muted-foreground">主辦抽成比例 {formalMarket.commissionRate ?? 0}%</p>
            {registrationExample && formalMarket.status === 'registered' && <p className="mt-2 text-sm text-muted-foreground">假設你收到主辦的錄取通知，試著標記已錄取。</p>}
            {registrationExample && formalMarket.status === 'accepted' && <p className="mt-2 text-sm text-muted-foreground">假設攤位費已繳清，試著標記已繳費。</p>}
            {registrationExample && formalMarket.status === 'paid' && <div className="mt-3">
              <p role="status" className="text-sm font-medium">已更新清單中的繳費狀態。</p>
              <Button className="mt-2" variant="secondary" onClick={onShowMarketList}>回市集清單</Button>
            </div>}
          </MarketRegistrationPanel>
          <section className="mx-auto max-w-3xl rounded-card border border-border bg-atelier-paper p-4">
            <h2 className="font-semibold">設備準備</h2>
            <MarketEquipmentSummary market={formalMarket} />
            {formalMarket.notes && <p className="mt-3 text-sm text-muted-foreground">{formalMarket.notes}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={onEditMarket}>編輯市集資料</Button>
              {isOperating && <Button variant="secondary" onClick={() => onStatusChange('ended')}>結束營運</Button>}
              {market.status === 'preparing' && formalMarket.status === 'paid' && <Button onClick={() => { onStatusChange('operating'); setView('live'); }}>開始營運</Button>}
            </div>
            <Link href="/" className="mt-3 inline-flex min-h-11 items-center font-semibold text-primary hover:underline">開始記錄自己的市集</Link>
          </section>
        </div>}
      </div>
      <AppDialog open={view === 'live' && isOperating && checkoutMode !== null}
        onClose={() => setCheckoutMode(null)} title={checkoutMode === 'products' ? '商品銷售' : '快速收款'}
        description="銷售記錄適用於輕量版與高階版。"
        presentation="sheet">
        {checkoutMode && <DemoTransactionWorkspace key={checkoutMode} mode={checkoutMode} products={products}
          onCartSale={(items, paymentMethod) => {
            const completed = onCartSale(items, paymentMethod);
            if (completed) setCheckoutMode(null);
            return completed;
          }}
          onManualSale={(amount, paymentMethod) => {
            onManualSale(amount, paymentMethod);
            setCheckoutMode(null);
          }} />}
      </AppDialog>
    </div>
  );
}

export function FormalDemoApp() {
  const [activeView, setActiveView] = useState<DemoView>('today');
  const [guideOpen, setGuideOpen] = useState(true);
  const [markets, setMarkets] = useState<DemoMarket[]>(createInitialDemoMarkets);
  const [products, setProducts] = useState<DemoProduct[]>(createInitialDemoProducts);
  const [activities, setActivities] = useState<DemoActivity[]>(createInitialDemoActivities);
  const [sales, setSales] = useState<DemoSaleRecord[]>(createInitialDemoSales);
  const [marketView, setMarketView] = useState<MarketView>('active');
  const [preparationFilter, setPreparationFilter] = useState<MarketPreparationFilter>('all');
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
  const [lastSale, setLastSale] = useState<DemoSaleRecord | null>(null);
  const [initialWorkspaceView, setInitialWorkspaceView] = useState<WorkspaceView>('live');
  const [initialCheckout, setInitialCheckout] = useState(false);
  const nextSaleNumber = useRef(0);

  const activeMarket = markets.find(market => market.status === 'operating') ?? markets[0];
  const workspaceMarket = markets.find(market => market.id === workspaceMarketId);
  const detailProduct = products.find(product => product.id === detailProductId);
  const timeLabel = () => new Intl.DateTimeFormat('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());

  const addActivity = (activity: Omit<DemoActivity, 'id' | 'time'>) => setActivities(current => [{ ...activity, id: `demo-${Date.now()}`, time: timeLabel() }, ...current].slice(0, 8));

  const saleMarket = workspaceMarket?.status === 'operating' ? workspaceMarket : activeMarket;

  const saveSale = (market: DemoMarket, sale: Omit<DemoSaleRecord, 'id' | 'marketId' | 'date' | 'time'>) => {
    const record: DemoSaleRecord = {
      ...sale,
      id: `demo-checkout-${++nextSaleNumber.current}`,
      marketId: market.id,
      date: market.dates[0],
      time: timeLabel(),
    };
    setMarkets(current => current.map(item => item.id === market.id ? { ...item, revenue: item.revenue + record.amount, deals: item.deals + 1 } : item));
    setSales(current => [record, ...current]);
    setLastSale(record);
  };

  const recordCartSale = (items: Array<{ productId: string; quantity: number }>, paymentMethod: SalesPaymentMethod) => {
    if (!saleMarket || items.length === 0) return false;
    const resolvedItems = items.flatMap(item => {
      const product = products.find(candidate => candidate.id === item.productId);
      if (!product || item.quantity <= 0 || (!product.unlimitedStock && product.stock < item.quantity)) return [];
      return [{ product, quantity: item.quantity }];
    });
    if (resolvedItems.length !== items.length) { toast.error('部分商品庫存不足，請重新確認'); return false; }
    const total = resolvedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const totalQuantity = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);
    setProducts(current => current.map(product => {
      const cartItem = resolvedItems.find(item => item.product.id === product.id);
      if (!cartItem) return product;
      return { ...product, stock: product.unlimitedStock ? product.stock : product.stock - cartItem.quantity, sold: product.sold + cartItem.quantity };
    }));
    const label = resolvedItems.length === 1 ? `售出 ${resolvedItems[0].product.name} × ${resolvedItems[0].quantity}` : `售出 ${resolvedItems.length} 項商品（共 ${totalQuantity} 件）`;
    addActivity({ type: 'sale', label, detail: `${formatCurrency(total)}・商品結帳` });
    saveSale(saleMarket, { productName: resolvedItems.map(item => item.product.name).join('、'), quantity: totalQuantity, amount: total, paymentMethod: formatSalesPaymentMethod(paymentMethod) });
    return true;
  };

  const recordManualSale = (amount: number, paymentMethod: SalesPaymentMethod) => {
    if (!saleMarket) return;
    addActivity({ type: 'sale', label: '快速金額成交', detail: `${formatCurrency(amount)}・Demo 成交` });
    saveSale(saleMarket, { productName: '快速金額成交', quantity: 1, amount, paymentMethod: formatSalesPaymentMethod(paymentMethod) });
  };

  const recordInteraction = (label: string) => {
    if (!saleMarket) return;
    setMarkets(current => current.map(market => market.id === saleMarket.id ? { ...market, interactions: market.interactions + 1 } : market));
    addActivity({ type: 'interaction', label, detail: '現場顧客互動' });
    toast.success(`${label} 已記錄`);
  };

  const openAddMarketForm = () => {
    setEditingMarketId(null);
    setMarketFormValues(createDemoMarketFormValues());
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
      regionCode: marketFormValues.regionCode,
      registrationConditions: marketFormValues.registrationConditions,
      earlyEntryEnabled: !marketFormValues.noEarlyEntry,
      earlyEntryTime: marketFormValues.noEarlyEntry ? undefined : marketFormValues.earlyEntryTime,
      time: `${marketFormValues.operatingStartTime} - ${marketFormValues.operatingEndTime}`,
      status: base?.status ?? 'preparing',
      registrationStatus: base?.registrationStatus ?? (base ? toFormalMarket(base).status : 'registered'),
      scenarioLabel: base?.scenarioLabel ?? '自訂 Demo 市集',
      revenue: base?.revenue ?? 0,
      deals: base?.deals ?? 0,
      interactions: base?.interactions ?? 0,
      grossMargin: base?.grossMargin ?? 0.65,
      note: marketFormValues.notes.trim() || '尚未填寫主辦／場地備註。',
      postMarketNote: base?.postMarketNote,
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
      const created = buildMarket();
      setMarkets(current => [created, ...current]);
      setActiveView('markets');
      setPreparationFilter('all');
      openWorkspace(created.id, 'manage');
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

  const changeRegistrationStatus = (marketId: string, registrationStatus: Market['status']) => {
    setMarkets(current => current.map(market => market.id === marketId ? { ...market, registrationStatus } : market));
    setMarketView(registrationStatus === 'cancelled' ? 'cancelled' : 'preparing');
    if (registrationStatus !== 'accepted') setPreparationFilter('all');
    toast.success('報名與繳費狀態已更新');
  };

  const resetDemo = () => {
    setActiveView('today');
    setGuideOpen(true);
    setMarkets(createInitialDemoMarkets());
    setProducts(createInitialDemoProducts());
    setActivities(createInitialDemoActivities());
    setSales(createInitialDemoSales());
    setLastSale(null);
    setMarketView('active');
    setPreparationFilter('all');
    setProductView('all');
    setProductQuery('');
    setShowInactiveProducts(false);
    setWorkspaceMarketId(null);
    setDetailProductId(null);
    setInitialWorkspaceView('live');
    toast.success('Demo 已還原成初始狀態');
  };
  const openWorkspace = (id: string, view: WorkspaceView = 'live', openCheckout = false) => {
    setInitialWorkspaceView(view);
    setInitialCheckout(openCheckout);
    setWorkspaceMarketId(id);
  };

  const changeMainView = (view: AppNavigationItemId) => { setWorkspaceMarketId(null); setDetailProductId(null); setActiveView(view); };

  const showPreparationList = (filter: MarketPreparationFilter) => {
    setMarketView('preparing');
    setPreparationFilter(filter);
    changeMainView('markets');
  };

  const tryRegistration = () => {
    showPreparationList('all');
    openWorkspace(DEMO_REGISTRATION_MARKET_ID, 'manage');
  };

  const tryGuideSale = () => {
    if (activeMarket?.status !== 'operating') return;
    setGuideOpen(false);
    changeMainView('today');
    openWorkspace(activeMarket.id, 'live', true);
  };

  let page: ReactNode = null;
  if (activeMarket) {
    if (activeView === 'today') page = <TodayPage activeMarket={activeMarket} upcomingMarkets={markets.filter(market => market.status === 'preparing' && market.registrationStatus !== 'cancelled')} onOpenMarket={market => openWorkspace(market.id, market.status === 'preparing' ? 'manage' : 'live')} onShowMarkets={() => showPreparationList('all')} onOpenSettings={() => setActiveView('more')} />;
    else if (activeView === 'markets') page = <MarketsPage markets={markets} view={marketView} preparationFilter={preparationFilter} onFilterChange={setPreparationFilter} onViewChange={setMarketView} onAdd={openAddMarketForm} onTryRegistration={tryRegistration} onOpen={market => openWorkspace(market.id, market.status === 'preparing' ? 'manage' : market.status === 'ended' ? 'overview' : 'live')} />;
    else if (activeView === 'products') page = <ProductsPage products={products} query={productQuery} view={productView} showInactive={showInactiveProducts} onQueryChange={setProductQuery} onViewChange={setProductView} onShowInactiveChange={setShowInactiveProducts} onAdd={openAddProductForm} onOpen={product => setDetailProductId(product.id)} />;
    else if (activeView === 'analytics') page = <AnalyticsPage markets={markets} products={products} onOpenMarket={market => openWorkspace(market.id, 'overview')} />;
    else page = <MorePage sales={sales} onReset={resetDemo} onOpenGuide={() => setGuideOpen(true)} />;
  }

  const content = workspaceMarket
    ? <MarketWorkspace
        key={workspaceMarket.id}
        market={workspaceMarket}
        products={products}
        activities={activities}
        sales={sales}
        initialView={initialWorkspaceView}
        initialCheckout={initialCheckout}
        lastSale={lastSale?.marketId === workspaceMarket.id ? lastSale : undefined}
        onBack={() => setWorkspaceMarketId(null)}
        onShowMarketList={() => showPreparationList('all')}
        onCartSale={recordCartSale}
        onManualSale={recordManualSale}
        onInteraction={recordInteraction}
        onEditMarket={() => openEditMarketForm(workspaceMarket)}
        onStatusChange={status => changeMarketStatus(workspaceMarket.id, status)}
        onRegistrationChange={status => changeRegistrationStatus(workspaceMarket.id, status)}
      />
    : detailProduct
      ? <ProductDetail product={detailProduct} onBack={() => setDetailProductId(null)} onEdit={() => openEditProductForm(detailProduct)} onToggleActive={() => toggleProductActive(detailProduct.id)} onDelete={() => setDeleteProductOpen(true)} />
      : page;

  return (
    <>
      <div
        data-demo-content-root
        className="min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))]"
      >
        {content}
      </div>
      <AppBottomNavigationBar items={DEMO_NAV_ITEMS} activeItemId={activeView} onSelect={changeMainView} showOnDesktop />

      <AppDialog
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="你想先試什麼？"
        description="這次會用範例資料操作，重新整理後會還原。"
        size="sm"
        presentation="sheet"
      >
        <div className="grid gap-2">
          <Button onClick={() => { setGuideOpen(false); showPreparationList('payment_due'); }}>看看哪些市集還沒繳費</Button>
          {activeMarket?.status === 'operating' && <Button variant="secondary" onClick={tryGuideSale}>記一筆現場收入</Button>}
          <Button variant="ghost" onClick={() => { changeMainView('today'); setGuideOpen(false); }}>先自己逛逛</Button>
        </div>
      </AppDialog>

      <DemoMarketForm open={marketFormMode !== null} title={marketFormMode === 'edit' ? '編輯市集' : '新增市集'} submitLabel={marketFormMode === 'edit' ? '儲存變更' : '建立市集'} values={marketFormValues} errors={marketFormErrors} onChange={values => { setMarketFormValues(values); setMarketFormErrors({}); }} onClose={() => setMarketFormMode(null)} onSubmit={submitMarketForm} />
      <DemoProductForm open={productFormMode !== null} title={productFormMode === 'edit' ? '編輯商品' : '新增商品'} submitLabel={productFormMode === 'edit' ? '儲存變更' : '建立商品'} values={productFormValues} errors={productFormErrors} onChange={changeProductForm} onClose={() => setProductFormMode(null)} onSubmit={submitProductForm} />
      <ConfirmDialog open={deleteProductOpen} onClose={() => setDeleteProductOpen(false)} onConfirm={deleteSelectedProduct} title="刪除商品？" description="刪除後會從這次 Demo 的商品清單移除。" confirmLabel="刪除商品" tone="danger" />
    </>
  );
}
