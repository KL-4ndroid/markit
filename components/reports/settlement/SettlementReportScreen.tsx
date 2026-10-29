'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { MarketFeeReviewNotice } from '@/components/markets/MarketFeeConflictNotice';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { db } from '@/lib/db';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { useFinancialReviews } from '@/hooks/useFinancialReviews';
import { applyFinancialReviews } from '@/lib/markets/financial-reviews';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import { type SettlementReportModel } from '@/lib/reporting/settlement-report';
import { buildReadableSettlementReport, reportComparisonPeriod } from '@/lib/reporting/settlement-report-reading';
import { getLocalDateString } from '@/lib/time-utils';
import { buildSettlementReportPreviewModel, type SettlementReportPreviewModel } from '@/lib/reporting/settlement-report-preview';
import { buildSettlementReportPdfViewModel } from '@/lib/reporting/settlement-report-pdf-view-model';
import { resolveSettlementReportSubscriptionView, SETTLEMENT_PDF_RUNTIME_ENABLED } from '@/lib/reporting/settlement-subscription-view';
import { buildSettlementReportHref, defaultReportPeriod, readReportPeriod, readReportReaderView } from '@/lib/reporting/settlement-report-navigation';
import { evaluateAccountCapabilityClientAccess } from '@/lib/subscription/account-capability-access';
import { UpgradePrompt } from '@/components/subscription/UpgradePrompt';
import { SettlementReportPdfPreviewButton } from './SettlementReportPdfPreviewButton';
import { SettlementReportReader, ReportReaderHeader, ReportPeriodControls } from './SettlementReportReader';
import { StateView } from '@/components/ui/StateView';
import { OWNER_BRAND_NAME_FALLBACK, loadOwnerBrandName, readCachedOwnerBrandName } from '@/lib/owner-brand';
import { formatDisplayDateRange } from '@/lib/presentation/formatters';

type BuiltPreview = { report: SettlementReportModel; preview: SettlementReportPreviewModel };

export function SettlementReportScreen() {
  const { user, session, loading: isAuthLoading } = useAuth();
  const { userRole, roleRefreshState } = useRoleContext();
  const router = useRouter();
  const search = useSearchParams();
  const fallbackPeriod = useMemo(() => defaultReportPeriod(new Date()), []);
  const { period, error: periodError } = readReportPeriod(search, fallbackPeriod);
  const { kind, startDate, endDate } = period;
  const todayDate = getLocalDateString();
  const comparisonPeriod = reportComparisonPeriod({...period,label:''},todayDate);
  const readStartDate = comparisonPeriod?.startDate ?? startDate;
  const readerView = readReportReaderView(search);
  const [brandName, setBrandName] = useState(OWNER_BRAND_NAME_FALLBACK);
  const isRoleReady = roleRefreshState.stage === 'ready';

  const capabilities = useMemo(() => deriveRoleCapabilities({
    isOwner: isRoleReady && roleRefreshState.permissions.isOwner,
    staffRole: userRole.staffRole,
  }), [isRoleReady, roleRefreshState.permissions.isOwner, userRole.staffRole]);
  const hasOwnerReportRole =
    isRoleReady &&
    hasCapability(capabilities, 'canImportExport') &&
    hasCapability(capabilities, 'canViewOwnerFinance');
  const shouldLoadReportCapability = isRoleReady && hasOwnerReportRole;
  const capabilityQuery = useAccountCapabilities({
    accessToken: session?.access_token,
    enabled: shouldLoadReportCapability,
  });
  const reportAccess = useMemo(() => evaluateAccountCapabilityClientAccess({
    capabilityResult: capabilityQuery.result,
    authenticated: Boolean(user && session?.access_token),
    ownerWorkspaceAvailable: Boolean(user?.id && hasOwnerReportRole),
    workspaceOwnerId: user?.id,
    requestedOwnerId: user?.id,
    actorRole: 'owner',
    rolePermission: hasOwnerReportRole,
    feature: 'settlementReportPreview',
    operation: 'execute',
    runtimeEnabled: true,
    dataReady: true,
    nowMs: Date.now(),
    network: capabilityQuery.network,
  }), [
    capabilityQuery.network,
    capabilityQuery.result,
    hasOwnerReportRole,
    session?.access_token,
    user,
  ]);
  const pdfAccess = useMemo(() => evaluateAccountCapabilityClientAccess({
    capabilityResult: capabilityQuery.result,
    authenticated: Boolean(user && session?.access_token),
    ownerWorkspaceAvailable: Boolean(user?.id && hasOwnerReportRole),
    workspaceOwnerId: user?.id,
    requestedOwnerId: user?.id,
    actorRole: 'owner',
    rolePermission: hasOwnerReportRole,
    feature: 'settlementPdf',
    operation: 'execute',
    runtimeEnabled: SETTLEMENT_PDF_RUNTIME_ENABLED,
    dataReady: true,
    nowMs: Date.now(),
    network: capabilityQuery.network,
  }), [
    capabilityQuery.network,
    capabilityQuery.result,
    hasOwnerReportRole,
    session?.access_token,
    user,
  ]);
  const settlementView = useMemo(() => resolveSettlementReportSubscriptionView({
    reportAccess,
    pdfAccess,
  }), [pdfAccess, reportAccess]);
  const isReportCapabilityLoading = shouldLoadReportCapability && (
    isAuthLoading || capabilityQuery.isLoading || capabilityQuery.result === null
  );

  useEffect(() => {
    let cancelled = false;
    if (!user?.id || !hasOwnerReportRole) return;

    const cached = readCachedOwnerBrandName(user.id);
    if (cached) setBrandName(cached);

    loadOwnerBrandName(user.id)
      .then((loadedBrandName) => {
        if (!cancelled) setBrandName(loadedBrandName);
      })
      .catch((error) => {
        console.error('載入報告品牌名稱失敗:', error);
      });

    return () => { cancelled = true; };
  }, [user?.id, hasOwnerReportRole]);

  const marketsQuery = useLiveQuery(async () => {
    if (!user?.id || !settlementView.canReadMarkets) return [];
    return db.markets
      .where('owner_id')
      .equals(user.id)
      .and(market => !market.isDeleted)
      .toArray();
  }, [user?.id, settlementView.canReadMarkets]);

  const productsQuery = useLiveQuery(async () => {
    if (!user?.id || !settlementView.canReadProducts) return [];
    return db.products.where('owner_id').equals(user.id).toArray();
  }, [user?.id, settlementView.canReadProducts]);

  const markets = useMemo(() => marketsQuery ?? [], [marketsQuery]);
  const products = useMemo(() => productsQuery ?? [], [productsQuery]);
  const marketIds = useMemo(
    () => markets.flatMap(market => market.id ? [market.id] : []),
    [markets],
  );
  const marketIdsKey = marketIds.join('|');

  const dailyStatsQuery = useLiveQuery(async () => {
    if (!settlementView.canReadDailyStats || marketIds.length === 0) return [];
    return db.dailyStats
      .where('marketId')
      .anyOf(marketIds)
      .and(stat => stat.date >= readStartDate && stat.date <= endDate)
      .toArray();
  }, [settlementView.canReadDailyStats, marketIdsKey, readStartDate, endDate]);
  const dailyStats = useMemo(() => dailyStatsQuery ?? [], [dailyStatsQuery]);
  const finance = useFinancialReviews(user?.id ?? '',marketIds,settlementView.canBuildFullReport);
  const reviewed = useMemo(()=>finance.enabled ? applyFinancialReviews(markets,dailyStats,finance.snapshots,finance.blocked) : null,[finance.enabled,finance.snapshots,finance.blocked,markets,dailyStats]);
  const isReportDataLoading = (
    settlementView.canReadMarkets && marketsQuery === undefined
  ) || (
    settlementView.canReadProducts && productsQuery === undefined
  ) || (
    settlementView.canReadDailyStats && dailyStatsQuery === undefined
  ) || (
    finance.loading
  );

  const built = useMemo<BuiltPreview | null>(() => {
    if (!settlementView.canBuildFullReport || isReportDataLoading || periodError) return null;

    const report = buildReadableSettlementReport({
      capabilities,
      period: {
        kind,
        startDate,
        endDate,
        label: formatDisplayDateRange(startDate, endDate),
      },
      brandName,
      markets,
      dailyStats:reviewed?.stats ?? dailyStats,
      financialConfirmations:reviewed?.confirmations,
      products,
      generatedAtDate: todayDate,
    });

    return {
      report,
      preview: buildSettlementReportPreviewModel({
        capabilities,
        report,
      }),
    };
  }, [settlementView.canBuildFullReport, isReportDataLoading, periodError, capabilities, kind, startDate, endDate, brandName, markets, dailyStats, products, todayDate,reviewed]);

  const pdfViewModel = useMemo(() => {
    if (!settlementView.canBuildPdfViewModel || !built?.report) return null;
    return buildSettlementReportPdfViewModel({ report: built.report });
  }, [built, settlementView.canBuildPdfViewModel]);

  if (!isRoleReady) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <div className="japanese-surface-card px-4 py-5 text-sm text-muted-foreground">
            正在確認權限...
          </div>
        </div>
      </div>
    );
  }

  if (!hasOwnerReportRole) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowLeft size={16} />
            返回分析
          </Link>
          <section className="japanese-surface-card px-4 py-5 text-sm text-muted-foreground">
            <div className="mb-3 flex items-center gap-3 text-foreground">
              <ShieldAlert className="h-5 w-5 text-danger" />
              <h1 className="text-lg font-semibold">完整結算報告僅限老闆使用</h1>
            </div>
            <p>目前角色無法查看包含成本、淨利與攤位費的結算報告內容。</p>
          </section>
        </div>
      </div>
    );
  }

  if (isReportCapabilityLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <StateView
            title="正在確認結算報告權限"
            description="確認完成前不會讀取報表資料。"
          />
        </div>
      </div>
    );
  }

  if (settlementView.mode === 'blocked' && settlementView.blockDecision) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
          <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ArrowLeft size={16} />
            返回分析
          </Link>
          <UpgradePrompt
            reason={settlementView.blockDecision.reason}
            requiredPlan={settlementView.blockDecision.requiredPlan}
            showClose={false}
            onRetry={capabilityQuery.refresh}
            isRetrying={capabilityQuery.isLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-atelier-canvas pb-24">
      <ReportReaderHeader>
        <ReportPeriodControls key={`${kind}:${startDate}:${endDate}`} period={period} today={todayDate} forceCustom={Boolean(periodError)} onApply={next => router.replace(buildSettlementReportHref(next), {scroll:false})} />
      </ReportReaderHeader>
      {finance.error && <div role="status" className="mx-auto max-w-6xl px-4 pt-4 text-sm text-danger">{finance.error}<button type="button" onClick={()=>void finance.refresh()} className="ml-3 min-h-11 text-primary underline">重新讀取核對紀錄</button></div>}
      <div className="mx-auto max-w-6xl px-4 pt-5 sm:px-6"><MarketFeeReviewNotice markets={built ? markets.filter(market=>built.report.marketRows.some(row=>row.marketId===market.id)) : []} /></div>
      {periodError ? <div className="mx-auto max-w-3xl px-4 py-5"><StateView title="請確認報告期間" description={periodError} /></div>
        : isReportDataLoading || !built ? <div className="mx-auto max-w-3xl px-4 py-5"><StateView title="正在整理結算資料" description="正在讀取目前品牌與所選期間的紀錄。" /></div>
        : <SettlementReportReader report={built.report} preview={built.preview} view={readerView} onViewChange={next=>router.replace(buildSettlementReportHref(period,next),{scroll:false})} productIds={products.flatMap(product => product.id ? [product.id] : [])}
            exportActions={settlementView.canBuildPdfViewModel && pdfViewModel ? (
              <SettlementReportPdfPreviewButton viewModel={pdfViewModel} canPreview={settlementView.pdfDecision.allowed} />
            ) : !settlementView.pdfDecision.allowed ? (
              <UpgradePrompt reason={settlementView.pdfDecision.reason} requiredPlan={settlementView.pdfDecision.requiredPlan} showClose={false} onRetry={capabilityQuery.refresh} isRetrying={capabilityQuery.isLoading} />
            ) : <p className="text-sm text-muted-foreground">目前無法匯出，請稍後再試。</p>} />}
    </div>
  );
}
