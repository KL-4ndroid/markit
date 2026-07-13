'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  FileText,
  LineChart,
  Package,
  Receipt,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { db } from '@/lib/db';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import {
  buildSettlementReportModel,
  type SettlementReportKind,
  type SettlementReportModel,
  type SettlementReportRecommendation,
  type SettlementReportSignalStatus,
} from '@/lib/reporting/settlement-report';
import {
  buildSettlementReportPreviewModel,
  type SettlementReportPreviewModel,
  type SettlementReportPreviewReadiness,
} from '@/lib/reporting/settlement-report-preview';
import { buildSettlementReportPdfViewModel } from '@/lib/reporting/settlement-report-pdf-view-model';
import { SettlementReportPdfPreviewButton } from '@/components/reports/settlement/SettlementReportPdfPreviewButton';
import {
  OWNER_BRAND_NAME_FALLBACK,
  OWNER_BRAND_NAME_UPDATED_EVENT,
  loadOwnerBrandName,
  readCachedOwnerBrandName,
} from '@/lib/owner-brand';

type BuiltPreview = {
  report: SettlementReportModel;
  preview: SettlementReportPreviewModel;
};

function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDefaultMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-TW', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

function readinessLabel(readiness: SettlementReportPreviewReadiness): string {
  if (readiness === 'ready') return '可作為決策參考';
  if (readiness === 'limited') return '可參考但需保留判斷';
  return '需先補齊或確認資料';
}

function confidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
  if (confidence === 'high') return '高';
  if (confidence === 'medium') return '中';
  return '低';
}

function recommendationLabel(recommendation: SettlementReportRecommendation): string {
  switch (recommendation) {
    case 'strong_rejoin':
      return '強烈建議再參加';
    case 'rejoin':
      return '建議再參加';
    case 'observe':
      return '可觀察';
    case 'caution':
      return '需謹慎';
    case 'avoid':
      return '不建議優先參加';
  }
}

function signalLabel(status: SettlementReportSignalStatus): string {
  if (status === 'available') return '完整';
  if (status === 'limited') return '有限';
  return '不足';
}

function statusClasses(status: SettlementReportSignalStatus): string {
  if (status === 'available') return 'border-[#B8D8C3] bg-[#F1F8F3] text-[#2F6B46]';
  if (status === 'limited') return 'border-[#E7D6A0] bg-[#FFF8E6] text-[#7A5A12]';
  return 'border-[#E6B9B0] bg-[#FFF1EE] text-[#9B3A2A]';
}

function readinessClasses(readiness: SettlementReportPreviewReadiness): string {
  if (readiness === 'ready') return statusClasses('available');
  if (readiness === 'limited') return statusClasses('limited');
  return statusClasses('unavailable');
}

function getScoreBarWidth(score: number | null): string {
  if (score === null || !Number.isFinite(score)) return '0%';
  return `${Math.max(0, Math.min(100, Math.round(score)))}%`;
}

function getSectionStatusLabel(status: SettlementReportSignalStatus): string {
  if (status === 'available') return '可用';
  if (status === 'limited') return '有限';
  return '不足';
}

function gradeClasses(grade: string): string {
  if (grade === 'A') return 'border-[#B8D8C3] bg-[#F1F8F3] text-[#2F6B46]';
  if (grade === 'B') return 'border-neutral-stripe-dark bg-neutral-alt-warm text-[#6E5A3E]';
  if (grade === 'C') return 'border-[#E7D6A0] bg-[#FFF8E6] text-[#7A5A12]';
  return 'border-[#E6B9B0] bg-[#FFF1EE] text-[#9B3A2A]';
}

export default function SettlementReportPreviewPage() {
  const { user } = useAuth();
  const { userRole, roleRefreshState } = useRoleContext();
  const [kind, setKind] = useState<SettlementReportKind>('monthly');
  const defaultRange = useMemo(() => getDefaultMonthRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [brandName, setBrandName] = useState(OWNER_BRAND_NAME_FALLBACK);
  const isRoleReady = roleRefreshState.stage === 'ready';

  const capabilities = useMemo(() => deriveRoleCapabilities({
    isOwner: isRoleReady && roleRefreshState.permissions.isOwner,
    staffRole: userRole.staffRole,
  }), [isRoleReady, roleRefreshState.permissions.isOwner, userRole.staffRole]);
  const canPreview =
    isRoleReady &&
    hasCapability(capabilities, 'canImportExport') &&
    hasCapability(capabilities, 'canViewOwnerFinance');

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !canPreview) return;

    const cached = readCachedOwnerBrandName(user.id);
    if (cached) setBrandName(cached);

    loadOwnerBrandName(user.id)
      .then((loadedBrandName) => {
        if (!cancelled) setBrandName(loadedBrandName);
      })
      .catch((error) => {
        console.error('載入報告品牌名稱失敗:', error);
      });

    const handleBrandNameUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ ownerId?: string; brandName?: string }>).detail;
      if (detail?.ownerId === user.id && detail.brandName) {
        setBrandName(detail.brandName);
      }
    };

    window.addEventListener(OWNER_BRAND_NAME_UPDATED_EVENT, handleBrandNameUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(OWNER_BRAND_NAME_UPDATED_EVENT, handleBrandNameUpdated);
    };
  }, [user?.id, canPreview]);

  const markets = useLiveQuery(async () => {
    if (!user?.id || !canPreview) return [];
    const rows = await db.markets.toArray();
    return rows.filter(market => market.owner_id === user.id && !market.isDeleted);
  }, [user?.id, canPreview]) ?? [];

  const products = useLiveQuery(async () => {
    if (!user?.id || !canPreview) return [];
    const rows = await db.products.toArray();
    return rows.filter(product => product.owner_id === user.id || product.owner_id === undefined);
  }, [user?.id, canPreview]) ?? [];

  const dailyStats = useLiveQuery(async () => {
    if (!canPreview) return [];
    return await db.dailyStats
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
  }, [canPreview, startDate, endDate]) ?? [];

  const built = useMemo<BuiltPreview | null>(() => {
    if (!canPreview) return null;

    const report = buildSettlementReportModel({
      capabilities,
      period: {
        kind,
        startDate,
        endDate,
        label: `${startDate} - ${endDate}`,
      },
      brandName,
      markets,
      dailyStats,
      products,
    });

    return {
      report,
      preview: buildSettlementReportPreviewModel({
        capabilities,
        report,
      }),
    };
  }, [canPreview, capabilities, kind, startDate, endDate, brandName, markets, dailyStats, products]);

  if (!isRoleReady) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <div className="border border-neutral-stripe bg-white px-4 py-5 text-sm text-muted-foreground shadow-sm">
            正在確認權限...
          </div>
        </div>
      </div>
    );
  }

  if (!canPreview) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowLeft size={16} />
            返回分析
          </Link>
          <section className="border border-neutral-stripe bg-white px-4 py-5 text-sm text-muted-foreground shadow-sm">
            <div className="mb-3 flex items-center gap-3 text-foreground">
              <ShieldAlert className="h-5 w-5 text-danger" />
              <h1 className="text-lg font-semibold">結算報告預覽僅限老闆使用</h1>
            </div>
            <p>目前角色無法查看包含成本、淨利與攤位費的結算報告內容。</p>
          </section>
        </div>
      </div>
    );
  }

  const report = built?.report ?? null;
  const preview = built?.preview ?? null;
  const pdfViewModel = report ? buildSettlementReportPdfViewModel({ report }) : null;

  return (
    <div className="min-h-screen bg-background px-4 pb-12 pt-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-neutral-stripe-dark pb-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <Link href="/analytics" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ArrowLeft size={16} />
              返回分析
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-[#E7EFE4] text-accent-green">
                <FileText size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold text-foreground">結算報告檢查</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {preview ? `${preview.header.brandName} · ${preview.header.periodLabel} · 信心度 ${confidenceLabel(preview.header.confidence)}` : '正在整理本機資料'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-[120px_1fr_1fr]">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as SettlementReportKind)}
              className="h-10 border border-[#CFC7BA] bg-white px-3 text-sm text-foreground"
              aria-label="報告類型"
            >
              <option value="weekly">週報</option>
              <option value="monthly">月報</option>
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 border border-[#CFC7BA] bg-white px-3 text-sm text-foreground"
              aria-label="開始日期"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10 border border-[#CFC7BA] bg-white px-3 text-sm text-foreground"
              aria-label="結束日期"
            />
          </div>
        </header>

        {preview && report && (
          <>
            <section className="flex flex-col gap-3 border border-neutral-stripe-dark bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">正式 PDF 報告預覽</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  使用目前頁面的資料產生 PDF 預覽，開啟後可用瀏覽器內建功能查看。
                </p>
              </div>
              <SettlementReportPdfPreviewButton viewModel={pdfViewModel} canPreview={canPreview} />
            </section>

            <section className="grid gap-5 border border-neutral-stripe-dark bg-white p-5 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
              <div className="flex flex-col justify-between">
                <div>
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center gap-2 border border-neutral-stripe-dark bg-neutral-alt-warm px-3 py-1 text-xs text-muted-foreground">
                      <CalendarDays size={14} />
                      {kind === 'monthly' ? '月結報告' : '週結報告'}
                    </div>
                    <div className="border border-neutral-stripe-dark px-3 py-1 text-xs text-muted-foreground">
                      {preview.header.periodLabel}
                    </div>
                  </div>
                  <p className="mb-2 text-sm font-medium text-muted-foreground">{preview.header.brandName}</p>
                  <h2 className="text-2xl font-semibold leading-tight text-foreground md:text-3xl">
                    {recommendationLabel(preview.executiveSummary.recommendation)}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {preview.executiveSummary.summary}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="bg-neutral-alt-warm p-4">
                    <p className="text-xs text-muted-foreground">總營收</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{formatMoney(preview.executiveSummary.totalRevenue)}</p>
                  </div>
                  <div className="bg-neutral-alt-warm p-4">
                    <p className="text-xs text-muted-foreground">淨利</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{formatMoney(preview.executiveSummary.netProfit)}</p>
                  </div>
                  <div className="bg-neutral-alt-warm p-4">
                    <p className="text-xs text-muted-foreground">成交數</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{formatNumber(preview.executiveSummary.totalDeals)}</p>
                  </div>
                </div>
              </div>

              <aside className="flex flex-col justify-between gap-5 border border-neutral-stripe bg-neutral-alt-warm p-5">
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs font-medium text-muted-foreground">本期總評分</p>
                    <span className={`border px-2 py-1 text-xs font-semibold ${gradeClasses(preview.executiveSummary.grade)}`}>
                      等級 {preview.executiveSummary.grade}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end gap-3 border-b border-neutral-stripe-dark pb-5">
                    <span className="text-6xl font-semibold leading-none text-[#26392F]">{Math.round(preview.executiveSummary.overallScore)}</span>
                    <span className="pb-2 text-sm font-medium text-muted-foreground">/ 100</span>
                  </div>
                  <div className={`mt-5 inline-flex border px-3 py-1 text-sm font-medium ${readinessClasses(preview.header.readiness)}`}>
                    {readinessLabel(preview.header.readiness)}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {preview.header.readinessReason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-4">
                    <p className="text-xs text-muted-foreground">平均客單價</p>
                    <p className="mt-2 text-xl font-semibold text-foreground tabular-nums">{formatMoney(preview.executiveSummary.averageOrderValue)}</p>
                  </div>
                  <div className="bg-white p-4">
                    <p className="text-xs text-muted-foreground">信心等級</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{confidenceLabel(preview.reliability.confidence)}</p>
                  </div>
                </div>
              </aside>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              {preview.sections.slice(0, 4).map((section) => (
                <div key={section.key} className={`border px-4 py-3 shadow-sm ${statusClasses(section.status)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{section.title}</p>
                    <span className="text-xs font-medium">{getSectionStatusLabel(section.status)}</span>
                  </div>
                </div>
              ))}
            </section>

            {preview.topWarnings.length > 0 && (
              <section className="border border-[#E3A79C] bg-[#FFF2EE] p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-[#9B3A2A]">
                  <AlertTriangle size={18} />
                  <h2 className="text-base font-semibold">優先確認事項</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {preview.topWarnings.map((warning) => (
                    <div key={`${warning.code}-${warning.message}`} className="border-t border-[#E3A79C] pt-3">
                      <p className="text-sm font-medium text-foreground">{warning.message}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{warning.recommendation}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="border border-neutral-stripe-dark bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <CheckCircle2 size={18} className="text-accent-green" />
                  <h2 className="text-base font-semibold">資料可靠度</h2>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-neutral-alt-warm p-3">
                    <p className="text-xs text-muted-foreground">警示</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{preview.reliability.warningCount}</p>
                  </div>
                  <div className="bg-neutral-alt-warm p-3">
                    <p className="text-xs text-muted-foreground">提示</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{preview.reliability.infoCount}</p>
                  </div>
                  <div className="bg-neutral-alt-warm p-3">
                    <p className="text-xs text-muted-foreground">信心</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">{confidenceLabel(preview.reliability.confidence)}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {preview.reliability.limitations.length === 0 ? (
                    <div className="border border-[#B8D8C3] bg-[#F1F8F3] px-3 py-2 text-sm font-medium text-[#2F6B46]">
                      本期未偵測到重大資料限制。
                    </div>
                  ) : (
                    preview.reliability.limitations.slice(0, 4).map((limitation) => (
                      <div key={`${limitation.code}-${limitation.message}`} className={`border px-3 py-2 ${limitation.severity === 'warning' ? statusClasses('unavailable') : statusClasses('limited')}`}>
                        <p className="text-sm font-medium">{limitation.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-neutral-stripe-dark bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <LineChart size={18} className="text-accent-green" />
                  <h2 className="text-base font-semibold">評分拆解</h2>
                </div>
                <div className="space-y-4">
                  {report.decision.scoreComponents.map((component) => (
                    <div key={component.key}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{component.label}</span>
                        <span className={`border px-2 py-0.5 text-xs ${statusClasses(component.status)}`}>
                          {component.score === null ? signalLabel(component.status) : Math.round(component.score)}
                        </span>
                      </div>
                      <div className="h-2 bg-[#ECE6DA]">
                        <div className="h-2 bg-accent-green" style={{ width: getScoreBarWidth(component.score) }} />
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{component.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border border-neutral-stripe-dark bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <TrendingUp size={18} className="text-accent-green" />
                <h2 className="text-base font-semibold">市集表現</h2>
              </div>
              <div className="grid gap-3">
                {report.marketDecisions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">此期間沒有可納入結算的已完成市集。</p>
                ) : report.marketDecisions.slice(0, 6).map((decision) => {
                  const row = report.marketRows.find(marketRow => marketRow.marketId === decision.marketId);
                  return (
                    <div key={decision.marketId} className="grid gap-4 border-t border-neutral-stripe pt-4 md:grid-cols-[1fr_120px_120px_120px_120px] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{decision.marketName}</p>
                          <span className={`border px-2 py-0.5 text-xs font-medium ${gradeClasses(decision.grade)}`}>
                            {decision.grade}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{recommendationLabel(decision.recommendation)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">營收</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{formatMoney(row?.revenue ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">淨利</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{formatMoney(row?.netProfit ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">客單價</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{formatMoney(row?.averageOrderValue ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">評分</p>
                        <p className="text-sm font-medium text-foreground tabular-nums">{Math.round(decision.rejoinScore)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="border border-neutral-stripe-dark bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <Package size={18} className="text-accent-green" />
                  <h2 className="text-base font-semibold">商品表現</h2>
                </div>
                <div className="space-y-3">
                  {report.productRows.length === 0 ? (
                    <p className="text-sm leading-6 text-muted-foreground">此期間沒有可用的商品明細，商品排行與商品建議會被標示為不足或有限。</p>
                  ) : report.productRows.slice(0, 5).map((product) => (
                    <div key={product.productId} className="grid grid-cols-[1fr_auto] gap-3 border-t border-neutral-stripe pt-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.productName}</p>
                        <p className="mt-1 text-xs text-muted-foreground">售出 {formatNumber(product.quantity)} 件</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(product.revenue)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {product.estimatedGrossProfit === null ? '毛利不足' : `毛利 ${formatMoney(product.estimatedGrossProfit)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-neutral-stripe-dark bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2 text-foreground">
                  <Receipt size={18} className="text-accent-green" />
                  <h2 className="text-base font-semibold">成本與利潤</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-alt-warm p-4">
                    <p className="text-xs text-muted-foreground">商品成本</p>
                    <p className="mt-2 text-lg font-semibold text-foreground tabular-nums">{formatMoney(report.money.productCost)}</p>
                  </div>
                  <div className="bg-neutral-alt-warm p-4">
                    <p className="text-xs text-muted-foreground">固定市集成本</p>
                    <p className="mt-2 text-lg font-semibold text-foreground tabular-nums">{formatMoney(report.money.fixedMarketCost)}</p>
                  </div>
                  <div className="bg-neutral-alt-warm p-4">
                    <p className="text-xs text-muted-foreground">毛利</p>
                    <p className="mt-2 text-lg font-semibold text-foreground tabular-nums">{formatMoney(report.money.grossProfit)}</p>
                  </div>
                  <div className="bg-neutral-alt-warm p-4">
                    <p className="text-xs text-muted-foreground">淨利</p>
                    <p className="mt-2 text-lg font-semibold text-foreground tabular-nums">{formatMoney(report.money.netProfit)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="border border-neutral-stripe px-4 py-3">
                    <p className="text-xs text-muted-foreground">抽成費</p>
                    <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">{formatMoney(report.money.commissionFee)}</p>
                  </div>
                  <div className="border border-neutral-stripe px-4 py-3">
                    <p className="text-xs text-muted-foreground">成本覆蓋率</p>
                    <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">{formatPercent(report.dataQuality.costCoverageRatio)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-neutral-stripe-dark bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-foreground">
                <CheckCircle2 size={18} className="text-accent-green" />
                <h2 className="text-base font-semibold">下一步行動</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {preview.nextActions.map((action, index) => (
                  <div key={action} className="grid grid-cols-[28px_1fr] gap-3 border-t border-neutral-stripe pt-3">
                    <span className="flex h-7 w-7 items-center justify-center bg-[#26392F] text-xs font-semibold text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-6 text-foreground">{action}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
