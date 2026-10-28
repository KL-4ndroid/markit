'use client';

import { useSubscriptionExperience } from '@/components/subscription/SubscriptionExperienceProvider';
import { SubscriptionFeatureNotice } from '@/components/subscription/SubscriptionFeatureNotice';
import { getMarketBoothFee } from '@/lib/markets/market-booth-fee';
import { MarketFeeConflictNotice } from './MarketFeeConflictNotice';
import { FreeMarketWorkspace } from './FreeMarketWorkspace';
import { MarketRegistrationPanel } from '@/components/markets/MarketRegistrationPanel';
import { MarketReturnLink } from '@/components/markets/MarketReturnLink';
import { MarketTodayTimeline } from '@/components/markets/MarketTodayTimeline';

import { useEffect, useState, useMemo, useCallback, useTransition, useRef } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Trash2,
  Ban,
  Play,
  Pause,
  CheckCircle,
  Edit,
  ClipboardCheck,
  Camera,
  Store,
  BarChart3,
  Table,
  Armchair,
  Umbrella,
  Package,
  Wallet,
  BookOpen,
} from 'lucide-react';
import { useMarket, updateMarket, updateMarketStatus, startMarket, endMarket, useMarketStatsFromProjection } from '@/lib/db/hooks';
import { initializeDatabaseSafely, type DatabaseInitResult } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import {
  getActiveDealEventsForMarket,
  getActiveInteractionEventsForMarket,
} from '@/lib/events/active-event-service';
import { formatCurrency, formatDateRanges } from '@/lib/utils';
import { formatClockTimeRange, formatDisplayDateRange } from '@/lib/presentation/formatters';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { InteractionButtons } from '@/components/sales/InteractionButtons';
import { TransactionWorkspace } from '@/components/sales/TransactionWorkspace';
import { InteractionPreferenceChart } from '@/components/analytics/InteractionPreferenceChart';
import { InteractionRoleIcon } from '@/components/interactions/InteractionRoleIcon';
import { InteractionTimeHeatmap } from '@/components/analytics/InteractionTimeHeatmap';
import { BehaviorInsightCard } from '@/components/analytics/BehaviorInsightCard';
import { DailyRevenueStats } from '@/components/markets/DailyRevenueStats';
import { AddRevenueDialog } from '@/components/markets/AddRevenueDialog';
import { DealItem } from '@/components/markets/DealItem';
import { DealDetailModal } from '@/components/markets/DealDetailModal';
import { useAuth } from '@/lib/supabase/auth-context';
import { DailyDealsModal } from '@/components/markets/DailyDealsModal';
import { InteractionDetailModal } from '@/components/markets/InteractionDetailModal';
import { DailyTransactionLog } from '@/components/markets/DailyTransactionLog';
import { MarketFieldOpsSection } from '@/components/markets/MarketFieldOpsSection';
import { MarketDetailLoadingShell } from '@/components/markets/MarketDetailLoadingShell';
import { MarketPaymentDeadlineNotice } from '@/components/markets/MarketPaymentDeadlineNotice';
import { MarketJournalWorkspace } from '@/components/markets/MarketJournalWorkspace';
import { MarketCashPanel } from '@/components/markets/MarketCashPanel';
import { marketCashEnabled } from '@/lib/markets/market-cash';
import { marketJournalsEnabled } from '@/lib/markets/market-journal';
import { MarketWorkspaceDetailTabs } from '@/components/markets/MarketWorkspaceDetailTabs';
import { MarketWorkspaceNavigation } from '@/components/markets/MarketWorkspaceNavigation';
import { calculateEstimatedMarketNetProfit, calculateTrackedMarketFixedCost } from '@/lib/analytics/market-financial-summary';
import { ContextHelp } from '@/components/ui/ContextHelp';
import { MarketWorkspaceSummary } from '@/components/markets/MarketWorkspaceSummary';
import { MarketLiveLayout } from '@/components/markets/MarketLiveLayout';
import { MarketLiveSummaryActions } from '@/components/markets/MarketLiveSummaryActions';
import { getMarketLiveStage, getMarketLiveBackfillDate } from '@/lib/markets/market-live-presentation';
import { FutureScheduleEditDialog } from '@/components/recurring-operations/FutureScheduleEditDialog';
import { marketRegionLabel } from '@/lib/markets/market-region';
import { AppDialog } from '@/components/ui/AppDialog';
import { OperatingInteractionPanel } from '@/components/markets/OperatingInteractionPanel';
import { OperatingMarketWorkbench } from '@/components/markets/OperatingMarketWorkbench';
import { SalesPhotoEvidenceFlowDialog } from '@/components/markets/SalesPhotoEvidenceFlowDialog';
import { SalesPhotoEvidenceOwnerAlbumRouteSection } from '@/components/markets/SalesPhotoEvidenceOwnerAlbumRouteSection';
import { getQuickActionButtons } from '@/lib/quick-actions-store';
import { getInteractionButtons, type InteractionButton } from '@/lib/interaction-buttons-store';
import { useRoleContext } from '@/lib/role-context';
import { canReadCachedEntity } from '@/lib/permissions/cached-entity-access';
import { RetainedDataAccessNotice } from '@/components/common/RetainedDataAccessNotice';
import { useSalesPhotoEvidenceFlow } from '@/hooks/useSalesPhotoEvidenceFlow';
import { useMarketOperatingSession } from '@/hooks/useMarketOperatingSession';
import { StaffMarketDetailView } from '@/components/markets/StaffMarketDetailView';
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import { normalizeMarketRouteId, shouldShowMarketDetailLoading } from '@/lib/markets/detail-loading';
import { getMarketDetail } from '@/lib/markets/detail-service';
import { shouldTrySupabaseFallback, selectMarketDetailRecord } from '@/lib/markets/detail-fallback';
import { deleteDealEvent } from '@/lib/markets/event-deletion-service';
import { countDealRecordsByDate, getDealEventDate, getDealEventRevenue, getInteractionType, getLocalDateStringFromTimestamp } from '@/lib/markets/event-view-utils';
import { buildMarketInteractionSummary } from '@/lib/markets/market-interaction-summary';
import {
  completeMarketDetailTransition,
  readMarketDetailTransition,
  type MarketDetailTransitionSnapshot,
} from '@/lib/navigation/market-detail-transition';
import {
  getDefaultOwnerMarketWorkspaceView,
  type OwnerMarketWorkspaceView,
} from '@/lib/markets/market-workspace';
import type { LocalPendingSalesPhotoEvidenceCreation } from '@/lib/sales/photo-evidence-pending-creation';
import {
  listOwnerSalesPhotoEvidenceAlbumMetadataRows,
} from '@/lib/supabase/sales-photo-evidence';
import type { SalesPhotoEvidenceAlbumSourceRow } from '@/lib/sales/photo-evidence-owner-album-read-model';
import {
  deleteSalesPhotoEvidenceAsOwner,
  getSalesPhotoEvidenceOwnerDeleteCapability,
  type SalesPhotoEvidenceOwnerDeleteCapability,
} from '@/lib/sales/photo-evidence-owner-delete-client';
import {
  findSalesPhotoEvidenceOwnerExpiredStateForSale,
  findSalesPhotoEvidenceOwnerImageForSale,
} from '@/lib/sales/photo-evidence-owner-view';
import type { Market, MarketStatus, Event, InteractionRecordedPayload, DealClosedPayload } from '@/types/db';
import {
  restoreSkippedScheduledOccurrence,
  skipScheduledOccurrence,
} from '@/lib/recurring-operations';

const EditMarketForm = dynamic(() =>
  import('@/components/markets/EditMarketForm').then(module => module.EditMarketForm)
);

type OwnerOverviewDetail = 'performance' | 'cash' | 'journal' | 'interactions' | 'photos' | 'costs';

type SalesPhotoEvidenceMarket = Market & {
  salesPhotoEvidenceRequired?: boolean;
};

export function MarketDetailScreen() {
  const router = useRouter();
  const { canRecord, canAnalyze, tier } = useSubscriptionExperience();
  const searchParams = useSearchParams();
  const requestedTask = searchParams.get('task');
  const requestedReturnTo = searchParams.get('returnTo');
  const marketId = normalizeMarketRouteId(searchParams.get('id') ?? undefined) ?? ''; // UUID 字符串，不需要 parseInt
  const localMarket = useMarket(marketId); // 本地 Dexie 數據（老闆模式使用）
  const { isStaff, userRole, canViewSensitiveData, isLoading: isRoleLoading } = useRoleContext(); // ✅ 員工權限檢查
  const { user } = useAuth(); // ✅ 檢查是否已登入
  const [dbStatus, setDbStatus] = useState<DatabaseInitResult | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [showScheduleEditScope, setShowScheduleEditScope] = useState(false);
  const [showFutureScheduleEdit, setShowFutureScheduleEdit] = useState(false);
  const [markScheduleOverride, setMarkScheduleOverride] = useState(false);
  const [isSkippingOccurrence, setIsSkippingOccurrence] = useState(false);
  const [isRestoringOccurrence, setIsRestoringOccurrence] = useState(false);
  const [transitionSnapshot, setTransitionSnapshot] = useState<MarketDetailTransitionSnapshot | null>(null);
  const [directLocalMarket, setDirectLocalMarket] = useState<Market | undefined>(undefined);
  const [localLookupComplete, setLocalLookupComplete] = useState(false);
  const [supabaseMarket, setSupabaseMarket] = useState<any>(null); // Supabase 數據（員工模式使用）
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [hasTriedSupabaseFallback, setHasTriedSupabaseFallback] = useState(false);
  const fallbackAttempted = useRef(false);

  useEffect(() => {
    setSupabaseMarket(null);
    setHasTriedSupabaseFallback(false);
    fallbackAttempted.current = false;
  }, [marketId]);

  useEffect(() => {
    let cancelled = false;

    setDirectLocalMarket(undefined);
    setLocalLookupComplete(false);

    if (dbStatus === null) {
      return () => {
        cancelled = true;
      };
    }

    if (dbStatus.ok === false) {
      setLocalLookupComplete(true);
      return () => {
        cancelled = true;
      };
    }

    if (!marketId) {
      setLocalLookupComplete(true);
      return () => {
        cancelled = true;
      };
    }

    getMarketDetail(marketId)
      .then((market) => {
        if (!cancelled) {
          setDirectLocalMarket(market);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Local market lookup failed:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLocalLookupComplete(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [marketId, dbStatus]);

  // ✅ 員工模式：完全由 IndexedDB + useMarketStatsFromProjection 推動
  // （StaffMarketDetailView 已內部處理 dailyStats 與 dailyStats-derived 數據）
  // 不再 async fetch Supabase — 避免 C3.4 reset 後的污染欄位污染員工 UI
  // 註：getAccessibleMarket 在 lib/supabase/markets.ts 仍保留（owner fallback 仍會用到）

  // ✅ 混合降級策略：當本地查不到但用戶已登入時，嘗試從 Supabase 獲取
  useEffect(() => {
    // 防止重複觸發
    if (fallbackAttempted.current) return;

    // 初始化中不允許 fallback
    if (dbStatus === null) return;

    const ctx = {
      hasLocalRecord: !!localMarket,
      hasSupabaseRecord: !!supabaseMarket,
      isAuthenticated: !!user,
      isStaff,
      fallbackAttempted: fallbackAttempted.current,
      hasTriedSupabaseFallback,
      isDatabaseHealthy: dbStatus.ok === true,
    };

    const decision = shouldTrySupabaseFallback(ctx);
    if (!decision.shouldTrySupabaseFallback) return;
    if (!marketId) return;

    // 延遲一點執行，確保 useMarket 的查詢完成
    const timer = setTimeout(async () => {
      // 再次檢查本地數據（可能在此期間已載入）
      const currentLocalMarket = await getMarketDetail(marketId);
      if (currentLocalMarket || supabaseMarket) return;

      fallbackAttempted.current = true;
      setHasTriedSupabaseFallback(true);

      console.log('🔄 本地查不到市集，嘗試從 Supabase 獲取...');
      setIsLoadingSupabase(true);

      try {
        const { getAccessibleMarket } = await import('@/lib/supabase/markets');
        const data = await getAccessibleMarket(marketId);
        if (data) {
          setSupabaseMarket(data);
          console.log('✅ 從 Supabase 成功獲取市集數據');
        }
      } catch (error) {
        console.error('從 Supabase 獲取市集失敗:', error);
      } finally {
        setIsLoadingSupabase(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [localMarket, supabaseMarket, user, isStaff, marketId, hasTriedSupabaseFallback, dbStatus]);

  // ✅ 根據模式選擇數據源（優先順序：員工 Supabase > 本地 > 降級 Supabase）
  const effectiveLocalMarket = localMarket ?? directLocalMarket;
  const candidateMarket = selectMarketDetailRecord(supabaseMarket, effectiveLocalMarket);
  const cacheAccessDenied = Boolean(candidateMarket && !canReadCachedEntity(candidateMarket, user?.id, userRole));
  const market = cacheAccessDenied ? undefined : candidateMarket;
  const salesPhotoEvidenceRequired = Boolean(
    canAnalyze && (market as SalesPhotoEvidenceMarket | undefined)?.salesPhotoEvidenceRequired
  );
  const addRevenueSalesPhotoEvidenceContext = {
    ownerId: (market as Market | undefined)?.owner_id ?? user?.id ?? null,
    marketRequiresEvidence: salesPhotoEvidenceRequired,
    capturedByStaffId: null,
  };
  // ✅ 從 dailyStats projection 讀取市場統計（C2.19B）
  // Staff 模式下 projection 可能為空，保持 undefined 不影響顯示
  const stats = useMarketStatsFromProjection(effectiveLocalMarket ?? undefined);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPending, startTransition] = useTransition(); // 用於非阻塞更新
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isUpdatingSalesPhotoEvidence, setIsUpdatingSalesPhotoEvidence] = useState(false);
  const [ownerSalesPhotoEvidenceRows, setOwnerSalesPhotoEvidenceRows] = useState<SalesPhotoEvidenceAlbumSourceRow[]>([]);
  const [isLoadingOwnerSalesPhotoEvidenceAlbum, setIsLoadingOwnerSalesPhotoEvidenceAlbum] = useState(false);
  const [ownerSalesPhotoEvidenceAlbumLoadError, setOwnerSalesPhotoEvidenceAlbumLoadError] = useState<string | null>(null);
  const [ownerSalesPhotoEvidenceDeleteCapability, setOwnerSalesPhotoEvidenceDeleteCapability] = useState<SalesPhotoEvidenceOwnerDeleteCapability | null>(null);
  const [showAddRevenueDialog, setShowAddRevenueDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDeal, setSelectedDeal] = useState<Event<DealClosedPayload> | null>(null);
  const [showDealDetailModal, setShowDealDetailModal] = useState(false);
  const [showDailyDealsModal, setShowDailyDealsModal] = useState(false);  // ✅ 新增：日期成交記錄彈窗
  const [showInteractionDetailModal, setShowInteractionDetailModal] = useState(false);  // ✅ 新增：互動詳情彈窗
  const [selectedInteractionType, setSelectedInteractionType] = useState<{
    type: string;
    label: string;
    role: InteractionButton['role'];
  } | null>(null);
  const [countdown, setCountdown] = useState<string>('--');
  const [showStatusChangeConfirm, setShowStatusChangeConfirm] = useState(false);  // 狀態變更確認
  const [pendingStatus, setPendingStatus] = useState<MarketStatus | null>(null);  // 待變更的狀態
  
  // ✅ 防抖狀態 - 防止重複點擊
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const DEBOUNCE_DELAY = 300; // 300ms 防抖
  
  // 互動行為數據狀態
  const [interactionEvents, setInteractionEvents] = useState<Event<InteractionRecordedPayload>[]>([]);
  const [dealEvents, setDealEvents] = useState<Event<DealClosedPayload>[]>([]);
  const dealRecordCountByDate = useMemo(() => countDealRecordsByDate(dealEvents), [dealEvents]);
  const [buttonLabels, setButtonLabels] = useState<Record<string, { label: string; role: InteractionButton['role'] }>>({});
  const selectedDealPhotoEvidence = useMemo(
    () => findSalesPhotoEvidenceOwnerImageForSale(ownerSalesPhotoEvidenceRows, selectedDeal?.id),
    [ownerSalesPhotoEvidenceRows, selectedDeal?.id]
  );
  const selectedDealExpiredPhotoEvidence = useMemo(
    () => findSalesPhotoEvidenceOwnerExpiredStateForSale(ownerSalesPhotoEvidenceRows, selectedDeal?.id),
    [ownerSalesPhotoEvidenceRows, selectedDeal?.id]
  );

  // 初始化資料庫（使用安全初始化）
  useEffect(() => {
    if (isRoleLoading) return;

    setDbStatus(null);
    initializeDatabaseSafely({ profile: isStaff ? 'staff_scoped' : 'owner_full' })
      .then((result) => setDbStatus(result))
      .catch((error) => {
        console.error('資料庫初始化失敗：', error);
        setDbStatus({
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
          recoverable: true,
        });
      });
  }, [isRoleLoading, isStaff]);

  // 確保只在客戶端渲染
  useEffect(() => {
    setIsMounted(true);
    setTransitionSnapshot(readMarketDetailTransition(marketId, user?.id ?? ''));
  }, [marketId, user?.id]);

  useEffect(() => {
    if (!transitionSnapshot) return;
    const timeoutId = window.setTimeout(
      () => setTransitionSnapshot(null),
      Math.max(0, transitionSnapshot.expiresAt - Date.now()),
    );
    return () => window.clearTimeout(timeoutId);
  }, [transitionSnapshot]);

  // 倒數計時邏輯
  useEffect(() => {
    if (!market || !market.startDate) return;

    const updateCountdown = () => {
      const now = new Date();
      // ✅ 使用本地日期，避免時區問題
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      // 如果不是市集當天，不顯示倒數
      if (today !== market.startDate) {
        setCountdown('--');
        return;
      }

      // 根據狀態決定倒數目標
      let targetTime: string | undefined;
      let targetLabel: string = '';

      if (market.status === 'registered' || market.status === 'accepted' || market.status === 'paid') {
        // 未開始：倒數到提前進場或報到
        if (market.earlyEntryEnabled && market.earlyEntryTime) {
          targetTime = market.earlyEntryTime;
          targetLabel = '提前進場';
        } else if (market.checkInTime) {
          targetTime = market.checkInTime;
          targetLabel = '報到';
        } else if (market.operatingStartTime) {
          targetTime = market.operatingStartTime;
          targetLabel = '營業開始';
        }
      } else if (market.status === 'ongoing') {
        // 進行中：倒數到營業結束
        targetTime = market.operatingEndTime;
        targetLabel = '營業結束';
      }

      if (!targetTime) {
        setCountdown('--');
        return;
      }

      // 計算時間差
      const [targetHour, targetMinute] = targetTime.split(':').map(Number);
      const targetDate = new Date(now);
      targetDate.setHours(targetHour, targetMinute, 0, 0);

      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown('已開始');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown(`距離${targetLabel}還有 ${hours}小時${minutes}分鐘`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // 每分鐘更新

    return () => clearInterval(interval);
  }, [market]);

  // 載入互動事件數據
  useEffect(() => {
    const loadInteractionData = async () => {
      if (!market) return;

      try {
        // 獲取按鈕配置（使用新版 interaction-buttons-store）
        const buttons = getInteractionButtons();
        const labelMap: Record<string, { label: string; role: InteractionButton['role'] }> = {};
        buttons.forEach(btn => {
          labelMap[btn.id] = { label: btn.label, role: btn.role };
        });
        setButtonLabels(labelMap);

        // ✅ 修復：使用 dates 陣列或降級到 startDate/endDate
        const marketDates = market.dates && market.dates.length > 0 
          ? market.dates 
          : (() => {
              // 降級：生成連續日期範圍
              const dates: string[] = [];
              const start = new Date(market.startDate);
              const end = new Date(market.endDate);
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                dates.push(dateStr);
              }
              return dates;
            })();

        // 獲取互動事件 - 只篩選在 marketDates 中的日期
        const interactions = (await getActiveInteractionEventsForMarket(marketId))
          .filter(e => {
            return marketDates.includes(getLocalDateStringFromTimestamp(e.timestamp));
          });

        console.log('✅ 找到互動事件:', interactions.length);

        setInteractionEvents(interactions);

        // 獲取成交事件 - 只篩選在 marketDates 中的日期
        const deals = (await getActiveDealEventsForMarket(marketId))
          .filter(e => {
            return marketDates.includes(getDealEventDate(e));
          });

        setDealEvents(deals);
      } catch (error) {
        console.error('載入互動數據失敗：', error);
      }
    };

    if (market && dbStatus?.ok !== false) {
      loadInteractionData();
    }

    // 監聽互動記錄事件，重新載入數據
    const handleInteractionRecorded = () => {
      loadInteractionData();
    };

    window.addEventListener('interaction-recorded', handleInteractionRecorded);
    window.addEventListener('deal-closed', handleInteractionRecorded);

    return () => {
      window.removeEventListener('interaction-recorded', handleInteractionRecorded);
      window.removeEventListener('deal-closed', handleInteractionRecorded);
    };
  }, [market, marketId, dbStatus]);

  const interactionSummary = useMemo(
    () => buildMarketInteractionSummary(interactionEvents.map(getInteractionType)),
    [interactionEvents]
  );

  // 計算互動偏好數據
  const interactionPreferenceData = useMemo(() => {
    return Object.entries(interactionSummary.countByType).map(([type, count]) => ({
      name: buttonLabels[type]?.label || type,
      value: count,
    })).sort((a, b) => b.value - a.value);
  }, [interactionSummary, buttonLabels]);

  // 計算時序熱力圖數據
  const timeHeatmapData = useMemo(() => {
    // 初始化 24 小時數據
    const hourlyData: Record<number, { interactions: number; revenue: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = { interactions: 0, revenue: 0 };
    }

    // 統計互動次數
    interactionEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyData[hour].interactions += 1;
    });

    // 統計成交金額
    dealEvents.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      hourlyData[hour].revenue += getDealEventRevenue(event);
    });

    // 轉換為圖表數據格式
    return Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        interactions: data.interactions,
        revenue: data.revenue,
      }))
      .filter(d => d.interactions > 0 || d.revenue > 0); // 只顯示有數據的時段
  }, [interactionEvents, dealEvents]);

  // 生成智能洞察
  const behaviorInsights = useMemo(() => {
    const insights: string[] = [];

    // 洞察 1：最頻繁的互動類型
    if (interactionPreferenceData.length > 0) {
      const topInteraction = interactionPreferenceData[0];
      const totalInteractions = interactionPreferenceData.reduce((sum, item) => sum + item.value, 0);
      const percentage = ((topInteraction.value / totalInteractions) * 100).toFixed(0);
      insights.push(
        `本場市集「${topInteraction.name}」最為頻繁，佔總互動 ${percentage}%。`
      );
    }

    // 洞察 2：轉換率分析
    const totalInteractions = interactionEvents.length;
    const totalDeals = dealEvents.length;
    if (totalInteractions > 0 && totalDeals > 0) {
      const conversionRate = ((totalDeals / totalInteractions) * 100).toFixed(1);
      const contribution = ((totalInteractions / totalDeals)).toFixed(1);
      insights.push(
        `平均每 ${contribution} 次互動產生 1 筆成交，整體轉換率為 ${conversionRate}%。`
      );
    }

    // 洞察 3：人氣高峰時段
    if (timeHeatmapData.length > 0) {
      const peakInteractionHour = timeHeatmapData.reduce((max, curr) => 
        curr.interactions > max.interactions ? curr : max
      );
      const peakRevenueHour = timeHeatmapData.reduce((max, curr) => 
        curr.revenue > max.revenue ? curr : max
      );

      if (peakInteractionHour.hour === peakRevenueHour.hour) {
        insights.push(
          `人氣與金流高峰都在 ${peakInteractionHour.hour}，建議在此時段加強服務與推廣。`
        );
      } else {
        insights.push(
          `人氣高峰在 ${peakInteractionHour.hour}，金流高峰在 ${peakRevenueHour.hour}，可針對不同時段調整策略。`
        );
      }
    }

    return insights;
  }, [interactionPreferenceData, interactionEvents, dealEvents, timeHeatmapData]);

  // 狀態文字映射
  const getStatusText = (status: MarketStatus) => {
    const texts = {
      registered: '已報名',
      accepted: '已錄取',
      paid: '已繳費',
      ongoing: '如期舉行',
      completed: '已完成',
      postponed: '已延期',
      cancelled: '已取消',
    };
    return texts[status] || status;
  };

  // 狀態顏色映射
  const getStatusColor = (status: MarketStatus) => {
    const colors = {
      registered: 'bg-soft-yellow text-foreground',
      accepted: 'bg-soft-green text-foreground',
      paid: 'bg-soft-green text-foreground',
      ongoing: 'bg-primary text-white',
      completed: 'bg-soft-pink text-foreground',
      postponed: 'bg-soft-pink text-foreground',
      cancelled: 'bg-soft-pink text-danger',
    };
    return colors[status] || colors.registered;
  };

  // 獲取下一個狀態
  const getNextStatus = (currentStatus: MarketStatus): MarketStatus | null => {
    const flow: Record<MarketStatus, MarketStatus | null> = {
      registered: 'accepted',
      accepted: 'paid',
      paid: 'ongoing',
      ongoing: 'completed',
      completed: null,
      postponed: null,
      cancelled: null,
    };
    return flow[currentStatus];
  };

  // 獲取下一個動作文字
  const getNextActionText = (currentStatus: MarketStatus): string | null => {
    const actions: Record<MarketStatus, string | null> = {
      registered: '確認錄取',
      accepted: '確認繳費',
      paid: '開始營業',
      ongoing: '結束營業',
      completed: null,
      postponed: null,
      cancelled: null,
    };
    return actions[currentStatus];
  };

  // 處理狀態切換 - 優化版本
  const handleStatusChange = useCallback(async () => {
    if (!market || dbStatus?.ok === false) return;

    const nextStatus = getNextStatus(market.status);
    if (!nextStatus) return;

    setIsUpdating(true);

    try {
      // 使用 Promise 並行處理，減少等待時間
      const updatePromise = (async () => {
      if (market.status === 'paid' && nextStatus === 'ongoing') {
        await startMarket(marketId);
          return { message: '市集已開始營業！', description: '祝您生意興隆 🎪' };
      } else if (market.status === 'ongoing' && nextStatus === 'completed') {
        await endMarket(marketId);
          return { message: '市集已結束營業！', description: '辛苦了，期待下次再見 ✨' };
      } else {
        await updateMarketStatus(marketId, nextStatus);
          return { message: `狀態已更新為「${getStatusText(nextStatus)}」`, description: '市集資訊已同步更新' };
      }
      })();

      const result = await updatePromise;
      toast.success(result.message, { description: result.description });
    } catch (error) {
      console.error('更新狀態失敗：', error);
      toast.error('更新狀態失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  }, [market, marketId, dbStatus]);

  const [ownerWorkspaceView, setOwnerWorkspaceView] = useState<OwnerMarketWorkspaceView | null>(null);
  const [ownerOverviewDetail, setOwnerOverviewDetail] = useState<OwnerOverviewDetail>(requestedTask === 'journal' && marketJournalsEnabled() ? 'journal' : 'performance');
  const [isUpdatingOperationSession, setIsUpdatingOperationSession] = useState(false);
  const operatingSession = useMarketOperatingSession(market);
  const operatingPhase = operatingSession?.workspacePhase ?? 'not-started';
  const isOperatingPhaseReady = Boolean(market && operatingSession);
  const isOperating = Boolean(operatingSession?.canRecordLiveActivity);
  const marketWorkspacePhase = operatingPhase;
  const currentDate = new Date();
  const currentDateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const hasFutureMarketDate = Boolean(market && (
    market.dates && market.dates.length > 0
      ? market.dates.some((date: string) => date > currentDateKey)
      : market.endDate > currentDateKey
  ));
  const canManageOwnerFieldOps = marketWorkspacePhase !== 'ended';
  const marketHeaderDescription = operatingSession?.phase === 'closed' && hasFutureMarketDate
      ? '今天已收攤，下一個場次仍可繼續準備。'
      : null;

  useEffect(() => {
    if (!isOperatingPhaseReady || ownerWorkspaceView !== null) return;
    setOwnerWorkspaceView(requestedTask === 'products' ? 'live' : requestedTask === 'journal' ? 'overview' : requestedTask === 'registration'
      ? 'manage'
      : getDefaultOwnerMarketWorkspaceView(marketWorkspacePhase));
  }, [isOperatingPhaseReady, marketWorkspacePhase, ownerWorkspaceView, requestedTask]);

  const visibleOverviewDetail = !canAnalyze && ownerOverviewDetail === 'photos' ? 'performance' : ownerOverviewDetail;
  const resolvedOwnerWorkspaceView = ownerWorkspaceView
    ?? getDefaultOwnerMarketWorkspaceView(marketWorkspacePhase);

  const handleStartEarlyOperation = useCallback(async () => {
    if (
      !market ||
      !operatingSession?.canStartEarly ||
      !operatingSession.sessionDate ||
      isUpdatingOperationSession ||
      dbStatus?.ok === false
    ) return;

    setIsUpdatingOperationSession(true);
    try {
      await updateMarket(marketId, {
        operationPhase: 'operating',
        operationSessionDate: operatingSession.sessionDate,
      });
      setOwnerWorkspaceView('live');
      toast.success('已提前開始今日營業');
    } catch (error) {
      console.error('提前開始營業失敗：', error);
      toast.error('無法提前開始營業，請稍後再試');
    } finally {
      setIsUpdatingOperationSession(false);
    }
  }, [dbStatus, isUpdatingOperationSession, market, marketId, operatingSession]);

  const handleCloseTodayOperation = useCallback(async () => {
    if (
      !market ||
      !operatingSession?.canCloseToday ||
      !operatingSession.sessionDate ||
      isUpdatingOperationSession ||
      dbStatus?.ok === false
    ) return;

    setIsUpdatingOperationSession(true);
    try {
      await updateMarket(marketId, {
        operationPhase: 'closing',
        operationSessionDate: operatingSession.sessionDate,
      });
      setOwnerOverviewDetail('performance');
      setOwnerWorkspaceView('overview');
      toast.success('今日現場操作已關閉', {
        description: '可在回顧查看成果；現金與心得都可稍後補記。',
      });
    } catch (error) {
      console.error('提前結束今日營業失敗：', error);
      toast.error('無法提前結束今日營業，請稍後再試');
    } finally {
      setIsUpdatingOperationSession(false);
    }
  }, [dbStatus, isUpdatingOperationSession, market, marketId, operatingSession]);

  // 處理報名狀態變更（帶二次確認）- 優化版本 + 防抖
  const handleStatusChangeRequest = useCallback(async (newStatus: MarketStatus) => {
    if (!market || isUpdating || dbStatus?.ok === false) return;

    // ✅ 防抖檢查 - 防止快速重複點擊
    const now = Date.now();
    if (now - lastClickTime < DEBOUNCE_DELAY) {
      return;
    }
    setLastClickTime(now);

    // 檢查是否會影響營業狀態
    const willAffectOperating = checkIfStatusAffectsOperating(market.status, newStatus);
    
    if (willAffectOperating && isOperating) {
      // 如果當前正在營業，且變更會影響營業狀態，顯示確認對話框
      setPendingStatus(newStatus);
      setShowStatusChangeConfirm(true);
      return;
    }

    // 使用 startTransition 進行非阻塞更新
    startTransition(() => {
      setIsUpdating(true);
    });

    try {
      await updateMarketStatus(marketId, newStatus);
      toast.success(`狀態已更新為「${getStatusText(newStatus)}」`, {
        description: '市集資訊已同步更新',
      });
    } catch (error) {
      console.error('更新狀態失敗：', error);
      toast.error('更新狀態失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  }, [market, marketId, isOperating, isUpdating, lastClickTime, dbStatus]);

  // 檢查狀態變更是否會影響營業狀態
  const checkIfStatusAffectsOperating = (currentStatus: MarketStatus, newStatus: MarketStatus): boolean => {
    const operatingStatuses: MarketStatus[] = ['paid', 'ongoing'];
    const currentIsOperating = operatingStatuses.includes(currentStatus);
    const newIsOperating = operatingStatuses.includes(newStatus);
    
    // 如果從營業狀態變更為非營業狀態，或反之，則會影響
    return currentIsOperating !== newIsOperating;
  };

  // 執行狀態變更 - 優化版本
  const executeStatusChange = useCallback(async (newStatus: MarketStatus) => {
    if (!market || dbStatus?.ok === false) return;

    setIsUpdating(true);

    try {
      // 先關閉對話框，提升用戶體驗
      setShowStatusChangeConfirm(false);
      setPendingStatus(null);
      
      await updateMarketStatus(marketId, newStatus);
      toast.success(`狀態已更新為「${getStatusText(newStatus)}」`, {
        description: '市集資訊已同步更新',
      });
    } catch (error) {
      console.error('更新狀態失敗：', error);
      toast.error('更新狀態失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  }, [market, marketId, dbStatus]);

  // 處理取消市集 - 優化版本
  const handleCancelMarket = useCallback(async () => {
    if (!market || dbStatus?.ok === false) return;

    setIsUpdating(true);
    
    // 先關閉對話框，提升用戶體驗
    setShowCancelConfirm(false);

    try {
      await updateMarketStatus(marketId, 'cancelled', '用戶主動取消');
      toast.success('市集已取消', {
        description: '狀態已更新為「已取消」',
      });
    } catch (error) {
      console.error('取消市集失敗：', error);
      toast.error('取消市集失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  }, [market, marketId, dbStatus]);

  // 處理刪除市集（軟刪除）- 優化版本
  const handleDeleteMarket = useCallback(async () => {
    if (!market || dbStatus?.ok === false) return;

    setIsUpdating(true);
    
    // 先關閉對話框，提升用戶體驗
    setShowDeleteConfirm(false);

    try {
      // ✅ 使用軟刪除功能
      const { deleteMarket } = await import('@/lib/db/hooks');
      await deleteMarket(marketId, '用戶刪除記錄');
      
      toast.success('市集已刪除', {
        description: '記錄已從列表中移除',
      });
      
      // 返回列表頁
      setTimeout(() => {
        router.push('/markets');
      }, 500); // 減少延遲時間
    } catch (error) {
      console.error('刪除市集失敗：', error);
      toast.error('刪除市集失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  }, [market, marketId, router, dbStatus]);

  // 處理打開編輯表單
  const handleOpenEditForm = () => {
    if (dbStatus?.ok === false) return;
    if (market?.sessionOrigin === 'schedule') {
      setShowScheduleEditScope(true);
      return;
    }
    setMarkScheduleOverride(false);
    setShowEditForm(true);
    hideNavigation(); // 隱藏導航列
  };

  const handleSkipScheduledOccurrence = async () => {
    if (!market?.id || !user?.id || market.sessionOrigin !== 'schedule' || isSkippingOccurrence) return;
    setIsSkippingOccurrence(true);
    try {
      await skipScheduledOccurrence(market.id, { ownerId: user.id, isOwner: true });
      toast.success('這一次已略過');
      router.push('/markets');
    } catch (error) {
      console.error('略過固定場次失敗：', error);
      toast.error('無法略過已有營業活動的場次。');
    } finally {
      setIsSkippingOccurrence(false);
    }
  };

  const handleRestoreScheduledOccurrence = async () => {
    if (!market?.id || !user?.id || market.sessionOrigin !== 'schedule' || isRestoringOccurrence) return;
    setIsRestoringOccurrence(true);
    try {
      await restoreSkippedScheduledOccurrence(market.id, { ownerId: user.id, isOwner: true });
      toast.success('這一次已恢復', { description: '場次已重新放回今日或近期安排。' });
    } catch (error) {
      console.error('恢復固定場次失敗：', error);
      toast.error('目前無法恢復這一次', {
        description: '請確認固定安排仍在進行中、日期尚未過去，且仍符合目前的星期規則。',
      });
    } finally {
      setIsRestoringOccurrence(false);
    }
  };

  // 處理關閉編輯表單
  const handleCloseEditForm = () => {
    setShowEditForm(false);
    showNavigation(); // 顯示導航列
  };

  // 處理打開補登收入對話框
  const handleToggleSalesPhotoEvidence = async () => {
    if (!market?.id || isStaff || isRoleLoading || dbStatus?.ok === false) return;

    const nextRequired = !salesPhotoEvidenceRequired;

    try {
      setIsUpdatingSalesPhotoEvidence(true);
      await updateMarket(marketId, {
        salesPhotoEvidenceRequired: nextRequired,
      } as Partial<SalesPhotoEvidenceMarket>);

      toast.success(nextRequired ? '此市集已啟用成交照片紀錄' : '此市集已關閉成交照片紀錄');
    } catch (error: any) {
      console.error('toggle sales photo evidence failed:', error);
      toast.error(error?.message || '更新成交照片紀錄設定失敗');
    } finally {
      setIsUpdatingSalesPhotoEvidence(false);
    }
  };

  const ownerSalesPhotoEvidenceAlbumOwnerId = canAnalyze ? user?.id ?? null : null;
  const ownerSalesPhotoEvidenceDeleteUserId = canAnalyze ? user?.id ?? null : null;

  const loadOwnerSalesPhotoEvidenceAlbumRows = useCallback(async () => {
    if (isStaff || isRoleLoading || !marketId || !ownerSalesPhotoEvidenceAlbumOwnerId) {
      setOwnerSalesPhotoEvidenceRows([]);
      setOwnerSalesPhotoEvidenceAlbumLoadError(null);
      return;
    }

    setIsLoadingOwnerSalesPhotoEvidenceAlbum(true);
    setOwnerSalesPhotoEvidenceAlbumLoadError(null);

    try {
      const result = await listOwnerSalesPhotoEvidenceAlbumMetadataRows({
        actorRole: 'owner',
        ownerId: ownerSalesPhotoEvidenceAlbumOwnerId,
        marketId,
      });

      if (result.action === 'rows_loaded') {
        setOwnerSalesPhotoEvidenceRows(result.rows);
        return;
      }

      setOwnerSalesPhotoEvidenceRows([]);
      setOwnerSalesPhotoEvidenceAlbumLoadError(result.message);
    } catch (error: any) {
      console.error('load owner sales photo evidence album failed:', error);
      setOwnerSalesPhotoEvidenceRows([]);
      setOwnerSalesPhotoEvidenceAlbumLoadError(error?.message || '成交照片讀取失敗，請稍後再試或重新整理。');
    } finally {
      setIsLoadingOwnerSalesPhotoEvidenceAlbum(false);
    }
  }, [isStaff, isRoleLoading, marketId, ownerSalesPhotoEvidenceAlbumOwnerId]);

  const handleDeleteOwnerSalesPhotoEvidence = useCallback(async (evidenceId: string): Promise<boolean> => {
    const result = await deleteSalesPhotoEvidenceAsOwner(evidenceId);
    if (!result.ok) {
      toast.error(result.message);
      return false;
    }

    setOwnerSalesPhotoEvidenceRows(rows => rows.filter(row => row.id !== evidenceId));
    toast.success('成交照片已刪除');
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (isStaff || isRoleLoading || !ownerSalesPhotoEvidenceDeleteUserId) {
      setOwnerSalesPhotoEvidenceDeleteCapability(null);
      return () => {
        cancelled = true;
      };
    }

    setOwnerSalesPhotoEvidenceDeleteCapability(null);
    void getSalesPhotoEvidenceOwnerDeleteCapability().then((capability) => {
      if (!cancelled) setOwnerSalesPhotoEvidenceDeleteCapability(capability);
    });

    return () => {
      cancelled = true;
    };
  }, [isRoleLoading, isStaff, ownerSalesPhotoEvidenceDeleteUserId]);

  useEffect(() => {
    void loadOwnerSalesPhotoEvidenceAlbumRows();
  }, [loadOwnerSalesPhotoEvidenceAlbumRows]);

  const ownerSalesPhotoEvidenceActorId = user?.id ?? null;
  const isLocalSalesPhotoEvidenceCaptureAllowed = useCallback(
    (item: LocalPendingSalesPhotoEvidenceCreation) => {
      return Boolean(
        canAnalyze && ownerSalesPhotoEvidenceActorId &&
        item.ownerId === ownerSalesPhotoEvidenceActorId &&
        item.marketId === marketId
      );
    },
    [canAnalyze, marketId, ownerSalesPhotoEvidenceActorId]
  );

  const salesPhotoEvidenceFlow = useSalesPhotoEvidenceFlow({
    marketId,
    actorId: user?.id,
    recoveryOwnerId: canAnalyze && !isStaff && !isRoleLoading && market?.owner_id === user?.id ? user?.id : null,
    canHandleItem: isLocalSalesPhotoEvidenceCaptureAllowed,
    onUploadCompleted: loadOwnerSalesPhotoEvidenceAlbumRows,
    initialView: canAnalyze && searchParams.get('task') === 'pending-photos' ? 'pending_list' : undefined,
  });
  const handleSalesPhotoEvidenceResult = salesPhotoEvidenceFlow.handleSalesPhotoEvidenceResult;
  const handleOpenPendingSalesPhotoEvidence = salesPhotoEvidenceFlow.openPendingList;

  const handleOpenAddRevenue = (date: string) => {
    if (dbStatus?.ok === false) return;
    setSelectedDate(date);
    setShowAddRevenueDialog(true);
  };

  // 處理關閉補登收入對話框
  const handleCloseAddRevenue = () => {
    setShowAddRevenueDialog(false);
    setSelectedDate('');
  };

  // ✅ 新增：處理點擊日期查看成交記錄
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowDailyDealsModal(true);
  };

  // ✅ 新增：處理關閉日期成交記錄彈窗
  const handleCloseDailyDeals = () => {
    setShowDailyDealsModal(false);
    setSelectedDate('');
  };

  // ✅ 新增：根據日期過濾成交記錄
  const getDealsByDate = (date: string) => {
    return dealEvents.filter(deal => {
      return getDealEventDate(deal) === date;
    });
  };

  // 處理成交記錄點擊
  const handleDealClick = (deal: Event<DealClosedPayload>) => {
    setSelectedDeal(deal);
    setShowDealDetailModal(true);
  };

  // 處理關閉成交詳情彈窗
  const handleCloseDealDetail = () => {
    setShowDealDetailModal(false);
    setSelectedDeal(null);
  };

  // ✅ 新增：處理點擊互動次數方塊
  const handleInteractionClick = (buttonId: string, label: string, role: InteractionButton['role']) => {
    setSelectedInteractionType({ type: buttonId, label, role });
    setShowInteractionDetailModal(true);
  };

  // ✅ 新增：處理關閉互動詳情彈窗
  const handleCloseInteractionDetail = () => {
    setShowInteractionDetailModal(false);
    setSelectedInteractionType(null);
  };

  // 處理編輯成交記錄（暫時只顯示提示）
  const handleEditDeal = (deal: Event<DealClosedPayload>) => {
    toast.info('編輯功能即將推出', {
      description: '目前僅支援查看成交詳情',
    });
  };

  // 處理刪除成交記錄 - 優化版本
  const handleDeleteDeal = useCallback(async (deal: Event<DealClosedPayload>) => {
    if (dbStatus?.ok === false) return;
    try {
      const result = await deleteDealEvent(deal, { allowDelete: !isStaff });

      setDealEvents(prev => prev.filter(d => d.id !== deal.id));

      toast.success('成交記錄已刪除', {
        description: `已扣回 ${formatCurrency(result.totalAmount)}`,
      });

      if (selectedDeal?.id === deal.id) {
        handleCloseDealDetail();
      }
    } catch (error) {
      console.error('刪除成交記錄失敗:', error);
      toast.error('刪除失敗，請稍後再試');

      const updatedDeals = await getActiveDealEventsForMarket(marketId);
      setDealEvents(updatedDeals);
    }
  }, [marketId, selectedDeal, dbStatus, isStaff]);
  const isDetailLoading = dbStatus === null || shouldShowMarketDetailLoading({
    isInitialized: dbStatus?.ok !== false,
    localLookupComplete,
    hasUser: !!user && !!marketId,
    hasMarket: !!candidateMarket,
    hasTriedSupabaseFallback,
    isLoadingSupabase,
  });

  useEffect(() => {
    if (!isMounted || isDetailLoading || !market || !user?.id) return;
    completeMarketDetailTransition(marketId, user.id);
    setTransitionSnapshot(null);
  }, [isDetailLoading, isMounted, market, marketId, user?.id]);

  if (isMounted && !isRoleLoading && cacheAccessDenied) {
    return <RetainedDataAccessNotice href="/markets" returnLabel="返回市集" />;
  }

  // ✅ 防止 hydration 錯誤，同時維持目的地框架而不是空白畫面
  if (!isMounted || isDetailLoading) {
    return <MarketDetailLoadingShell snapshot={transitionSnapshot} returnTo={requestedReturnTo} />;
  }

  // DB 不健康
  if (dbStatus?.ok === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => router.push('/markets')}
              className="mb-4 text-white/80 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <h1 className="text-2xl font-medium text-white opacity-90">
              資料庫異常
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-6 -mt-4 pb-6">
          <div className="bg-white rounded-[1.5rem] p-8 shadow-lg shadow-secondary/10 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              本機資料庫無法正常存取
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              系統無法讀取本地資料庫，可能因瀏覽器儲存空間不足、隱私模式，或資料庫結構損壞。
            </p>
            {dbStatus.recoverable && (
              <p className="text-muted-foreground text-sm">
                請保留這台裝置的資料，重新開啟頁面；若問題持續，可前往支援頁取得協助。
              </p>
            )}
            <button
              onClick={() => router.push('/support')}
              className="w-full bg-secondary text-white px-6 py-3 rounded-2xl hover:bg-secondary/85 transition-colors font-medium"
            >
              取得協助
            </button>
            <button
              onClick={() => router.push('/markets')}
              className="w-full bg-soft-pink text-foreground px-6 py-3 rounded-2xl hover:bg-soft-pink/80 transition-colors font-medium"
            >
              返回市集列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 找不到市集
  if (!market) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => router.push('/markets')}
              className="mb-4 text-white/80 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <h1 className="text-2xl font-medium text-white opacity-90">
              找不到市集
            </h1>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto px-6 -mt-4">
          <div className="bg-white rounded-[1.5rem] p-12 shadow-lg shadow-primary/10 text-center">
            <AlertCircle className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              找不到此市集
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              此市集可能已被刪除或不存在
            </p>
            <button
              onClick={() => router.push('/markets')}
              className="bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary/85 transition-colors"
            >
              返回市集列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  const nextStatus = getNextStatus(market.status);
  const nextActionText = getNextActionText(market.status);
  const canChangeStatus = nextStatus !== null;

  // ✅ 員工模式：使用簡化的專屬視圖
  if (isStaff) {
    return (
      <StaffMarketDetailView
        returnTo={requestedReturnTo}
        market={market}
        initialPhotoEvidenceView={searchParams.get('task') === 'pending-photos' ? 'pending_list' : undefined}
        initialTransactionMode={requestedTask === 'products' ? 'products' : undefined}
      />
    );
  }

  const liveStage = getMarketLiveStage(operatingSession?.phase, marketWorkspacePhase);
  const liveBackfillDate = getMarketLiveBackfillDate(market, operatingSession?.sessionDate, currentDateKey);
  const pendingPhotoSummary = {
    label: '待補照片',
    value: salesPhotoEvidenceFlow.pendingCount > 0
      ? `${salesPhotoEvidenceFlow.pendingCount} 筆`
      : salesPhotoEvidenceFlow.isLoadingPendingItems ? '確認中…'
      : salesPhotoEvidenceFlow.pendingItemsError ? '尚未確認'
      : '本機無待補',
    onClick: handleOpenPendingSalesPhotoEvidence,
    actionLabel: '查看本機待補照片與資料範圍',
  };
  const showPreparingPhotoSummary = canAnalyze && (salesPhotoEvidenceFlow.pendingCount > 0
    || salesPhotoEvidenceFlow.isLoadingPendingItems || Boolean(salesPhotoEvidenceFlow.pendingItemsError));

  // ✅ 老闆模式：使用完整功能視圖
  return (
    <div className="min-h-screen bg-atelier-canvas pb-20 text-atelier-ink">
      {/* Header */}
      <header className="japanese-gradient-header rounded-b-[2rem] px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))] text-white">
        <div className="mx-auto max-w-5xl">
          <div className="relative sm:flex sm:items-start sm:justify-between sm:gap-3">
            <div className="flex min-w-0 flex-1 flex-col items-start gap-3 sm:flex-row">
              <MarketReturnLink returnTo={requestedReturnTo} />
              <div className="min-w-0 flex-1">
                <h1 className="break-words text-xl font-semibold leading-snug text-white sm:text-2xl">{market.name}</h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
                  {/* 日期 - 完整顯示，支援換行 */}
                  <div className="flex items-start gap-1.5">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1">
                      {market.dates && market.dates.length > 0 
                        ? formatDateRanges(market.dates)
                        : formatDisplayDateRange(market.startDate, market.endDate)
                      }
                    </span>
                  </div>
                  {/* 地點 */}
                  <div className="flex min-w-0 flex-wrap items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="shrink-0 rounded-md bg-white/10 px-1.5 text-xs">{marketRegionLabel(market.regionCode)}</span>
                    <span className="min-w-0 break-words">{market.location}</span>
                  </div>
                </div>
                {marketHeaderDescription && <p className={`mt-2 text-xs leading-5 text-white/80 ${isOperating ? 'hidden sm:block' : ''}`}>{marketHeaderDescription}</p>}
              </div>
            </div>
            
            {/* 右側操作區 */}
            <div className="absolute right-0 top-0 flex shrink-0 items-center gap-1 sm:static">
              {/* ✅ 同步狀態指示器 */}
              <SyncStatusIndicator tone="default" />
              
              {/* ✅ 編輯按鈕：員工模式下隱藏 */}
              {!isStaff && market.scheduleOccurrenceState !== 'skipped' && (
                <button
                  onClick={handleOpenEditForm}
                  className="flex min-h-11 items-center gap-1.5 rounded-control bg-atelier-paper px-3 text-sm font-medium text-atelier-ink shadow-sm transition-colors hover:bg-atelier-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Edit className="w-4 h-4" />
                  編輯
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-4 pb-6">
        {canRecord ? <>
        <MarketWorkspaceNavigation
          value={resolvedOwnerWorkspaceView}
          onChange={setOwnerWorkspaceView}
          ariaLabel="老闆市集工作台"
          panelId="owner-market-workspace-panel"
          items={[
            { id: 'live', label: '現場', icon: Store, badgeLabel: '待補照片', badge: canAnalyze ? salesPhotoEvidenceFlow.pendingCount : 0 },
            { id: 'overview', label: '回顧', icon: BarChart3 },
            { id: 'manage', label: '管理', icon: ClipboardCheck },
          ]}
        />

        <div
          id="owner-market-workspace-panel"
          role="tabpanel"
          aria-labelledby={`owner-market-workspace-panel-tab-${resolvedOwnerWorkspaceView}`}
        >

        <MarketWorkspaceSummary
          phase={marketWorkspacePhase}
          phaseLabel={operatingSession?.label}
          operatingTime={formatClockTimeRange(market.operatingStartTime, market.operatingEndTime) || null}
          compactOnMobile
          description={resolvedOwnerWorkspaceView === 'live' && operatingSession?.phase !== 'operating'
            ? operatingSession?.message : undefined}
          items={resolvedOwnerWorkspaceView === 'manage'
            ? [
                { label: market.sessionOrigin === 'schedule' ? '營業安排' : '報名進度', value: market.sessionOrigin === 'schedule' ? '已排定' : getStatusText(market.status) },
                {
                  label: '固定成本',
                  value: formatCurrency(calculateTrackedMarketFixedCost(market)),
                },
                ...(canAnalyze ? [{ label: '成交照片', value: salesPhotoEvidenceRequired ? '需要' : '不需要' }] : []),
              ]
            : resolvedOwnerWorkspaceView === 'overview'
              ? [
                  { label: '總收入', value: formatCurrency(stats?.totalRevenue ?? market.totalRevenue ?? 0), emphasis: true },
                  {
                    label: '估計淨利',
                    value: formatCurrency(calculateEstimatedMarketNetProfit(market)),
                  },
                  { label: '成交', value: stats?.totalDeals ?? market.totalDeals ?? 0 },
                ]
              : liveStage === 'preparing'
                ? showPreparingPhotoSummary ? [pendingPhotoSummary] : []
                : [
                    { label: '收入', value: formatCurrency(stats?.totalRevenue ?? market.totalRevenue ?? 0), emphasis: true },
                    { label: '成交', value: stats?.totalDeals ?? market.totalDeals ?? 0 },
                    ...(canAnalyze ? [pendingPhotoSummary] : []),
                  ]}
        >
          {resolvedOwnerWorkspaceView === 'live' && operatingSession && (
            <MarketLiveSummaryActions
              stage={liveStage}
              session={operatingSession}
              canManage={!isRoleLoading}
              isUpdating={isUpdatingOperationSession}
              onStartEarly={handleStartEarlyOperation}
              onCloseToday={handleCloseTodayOperation}
              onManage={() => setOwnerWorkspaceView('manage')}
              onReview={() => {
                setOwnerOverviewDetail('performance');
                setOwnerWorkspaceView('overview');
              }}
              onBackfill={liveBackfillDate
                ? () => handleOpenAddRevenue(liveBackfillDate) : undefined}
            />
          )}
          {resolvedOwnerWorkspaceView === 'overview' && <ContextHelp label="淨利怎麼算">
            <p>估計淨利＝已記錄銷售利潤－固定成本－營收抽成。固定成本包含攤位費（即報名費）與自付設備租金（含桌布）；免費提供的設備不扣款。</p>
            <p>未記錄銷售利潤時，暫以營收估算。未填成本不代表沒有支出；交通、人工等未記錄費用不會自動計入。可退保證金不列成本，現金盤點也不會改變淨利。</p>
          </ContextHelp>}
        </MarketWorkspaceSummary>

        {/* Registration is a current record, not proof of completed prior steps. */}
        {resolvedOwnerWorkspaceView === 'manage' && !isOperating && market.sessionOrigin !== 'schedule' && (
          <MarketRegistrationPanel status={market.status} ended={marketWorkspacePhase === 'ended'} busy={isUpdating} onChange={status => {
            if (status === 'cancelled') setShowCancelConfirm(true);
            else handleStatusChangeRequest(status);
          }} />
        )}

        {resolvedOwnerWorkspaceView === 'manage' && <MarketPaymentDeadlineNotice market={market} />}

        {resolvedOwnerWorkspaceView === 'overview' && (
          <MarketWorkspaceDetailTabs
            value={visibleOverviewDetail}
            onChange={setOwnerOverviewDetail}
            ariaLabel="回顧詳細資料"
            panelId="owner-overview-detail-panel"
            items={[
              { id: 'performance', label: '每日表現', icon: Calendar },
              ...(marketCashEnabled() ? [{ id: 'cash' as const, label: '現金紀錄', icon: Wallet }] : []),
              ...(marketJournalsEnabled() ? [{ id: 'journal' as const, label: '出攤心得', icon: BookOpen }] : []),
              { id: 'interactions', label: '顧客互動', icon: TrendingUp },
              ...(canAnalyze ? [{ id: 'photos' as const, label: '成交照片', icon: Camera }] : []),
              { id: 'costs', label: '成本設備', icon: DollarSign },
            ]}
          />
        )}

        <div
          id={resolvedOwnerWorkspaceView === 'overview' ? 'owner-overview-detail-panel' : undefined}
          role={resolvedOwnerWorkspaceView === 'overview' ? 'tabpanel' : undefined}
          aria-labelledby={resolvedOwnerWorkspaceView === 'overview'
            ? `owner-overview-detail-panel-tab-${visibleOverviewDetail}`
            : undefined}
        >

        {resolvedOwnerWorkspaceView === 'overview' && visibleOverviewDetail === 'cash' && (
          <MarketCashPanel marketId={marketId} sessionDate={operatingSession?.sessionDate} presentation="review" />
        )}
        {resolvedOwnerWorkspaceView === 'overview' && visibleOverviewDetail === 'journal' && (
          <MarketJournalWorkspace marketId={marketId} returnTo={requestedReturnTo} />
        )}

        {/* 營業中時的操作區 - 根據自動判斷顯示 */}
        {resolvedOwnerWorkspaceView === 'live' && (
          <MarketLiveLayout
            stage={liveStage}
            activity={isOperating && (
              <>
                <OperatingMarketWorkbench
                  marketId={marketId}
                  marketReturnTo={requestedReturnTo}
                  initialMode={requestedTask === 'products' ? 'products' : undefined}
                  canRecordDeal
                  salesPhotoEvidenceRequired={salesPhotoEvidenceRequired}
                  pendingPhotoCount={canAnalyze ? salesPhotoEvidenceFlow.pendingCount : 0}
                  onOpenPendingPhotos={handleOpenPendingSalesPhotoEvidence}
                  salesPhotoEvidenceContext={addRevenueSalesPhotoEvidenceContext}
                  onSalesPhotoEvidenceResult={handleSalesPhotoEvidenceResult}
                />

                <OperatingInteractionPanel
                  marketId={marketId}
                  canOpenSettings
                  onInteractionRecorded={() => {
                    window.dispatchEvent(new Event('interaction-recorded'));
                  }}
                />

                <div className="lg:hidden">
                  <DailyTransactionLog
                    marketId={marketId}
                    limit={5}
                    showSummary={false}
                    compactEmpty
                    allowDelete
                    title="最近紀錄"
                    onViewAll={() => {
                      setOwnerOverviewDetail('performance');
                      setOwnerWorkspaceView('overview');
                    }}
                  />
                </div>

              <div className="hidden items-start gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2">
                  <TransactionWorkspace
                    marketId={marketId}
                    marketReturnTo={requestedReturnTo}
                    initialMode={requestedTask === 'products' ? 'products' : undefined}
                    salesPhotoEvidenceRequired={salesPhotoEvidenceRequired}
                    pendingPhotoCount={canAnalyze ? salesPhotoEvidenceFlow.pendingCount : 0}
                    onOpenPendingPhotos={handleOpenPendingSalesPhotoEvidence}
                    salesPhotoEvidenceContext={addRevenueSalesPhotoEvidenceContext}
                    onSalesPhotoEvidenceResult={handleSalesPhotoEvidenceResult}
                  />
                </div>

                <section className="rounded-card bg-atelier-blue-soft/65 p-4 shadow-atelier lg:col-start-2 lg:row-start-1">
                  <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-atelier-ink">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    記錄互動
                  </h2>
                  <InteractionButtons
                    marketId={marketId}
                    onInteractionRecorded={() => {
                      // 重新載入互動數據
                      window.dispatchEvent(new Event('interaction-recorded'));
                    }}
                  />
                </section>

                <div className="lg:col-start-2 lg:row-start-2">
                  <DailyTransactionLog
                    marketId={marketId}
                    limit={5}
                    showSummary={false}
                    compactEmpty
                    allowDelete
                    title="最近紀錄"
                    onViewAll={() => {
                      setOwnerOverviewDetail('performance');
                      setOwnerWorkspaceView('overview');
                    }}
                  />
                </div>
              </div>
              </>
            )}
            timeline={
              <MarketTodayTimeline
                market={market}
                countdown={countdown}
                defaultExpanded={liveStage === 'preparing'}
                onEdit={!isRoleLoading ? handleOpenEditForm : undefined}
              />
            }
            cash={<MarketCashPanel marketId={marketId} sessionDate={operatingSession?.sessionDate} />}
            fieldwork={
              <div className="mx-auto mt-3 max-w-3xl">
                <MarketFieldOpsSection
                  marketId={marketId}
                  collaborationEnabled={canAnalyze}
                  referenceNote={market.notes}
                  canManageFieldNotes={canManageOwnerFieldOps}
                  canManageChecklist={canManageOwnerFieldOps}
                  canToggleChecklistItem={canManageOwnerFieldOps}
                  collapsibleOnMobile
                  defaultMobileExpanded={liveStage === 'preparing'}
                  readOnlyReason={marketWorkspacePhase === 'ended'
                    ? '市集已完成，現場交接筆記與待辦清單已封存為唯讀紀錄。'
                    : undefined}
                />
              </div>
            }
          />
        )}

        {/* ✅ 當日流水帳 - 營業中或已結束時顯示（僅員工模式） */}
        {/* 老闆模式不顯示流水帳 */}

        {/* 7. 每日收入統計（多天市集才顯示） */}
        {canAnalyze && resolvedOwnerWorkspaceView === 'manage' && !isOperating && (
        <section className="mx-auto mb-4 max-w-3xl rounded-lg border border-border bg-white p-4">
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Camera className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-medium text-foreground">成交照片紀錄</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                開啟後，之後新增的成交需要補上照片。關閉後，既有待補照片仍會保留。
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleSalesPhotoEvidence}
            disabled={isUpdatingSalesPhotoEvidence}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-background px-4 py-4 text-left transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>
              <span className="block text-sm font-medium text-foreground">
                此市集需要成交照片
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {salesPhotoEvidenceRequired ? '目前已啟用' : '目前未啟用'}
              </span>
            </span>
            <span
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                salesPhotoEvidenceRequired ? 'bg-primary' : 'bg-gray-300'
              }`}
              aria-hidden="true"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  salesPhotoEvidenceRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </span>
          </button>
        </section>
        )}

        {resolvedOwnerWorkspaceView === 'overview' && visibleOverviewDetail === 'photos' && canAnalyze && (
        <>
        {salesPhotoEvidenceFlow.pendingCount > 0 && <button type="button" onClick={handleOpenPendingSalesPhotoEvidence} className="mb-3 min-h-11 rounded-xl border border-border bg-atelier-paper px-4 text-sm text-primary">待補照片 {salesPhotoEvidenceFlow.pendingCount} 筆</button>}
        <SalesPhotoEvidenceOwnerAlbumRouteSection
          actorRole={isStaff ? 'staff' : 'owner'}
          ownerId={ownerSalesPhotoEvidenceAlbumOwnerId}
          marketId={marketId}
          rows={ownerSalesPhotoEvidenceRows}
          dealEvents={dealEvents}
          isRoleReady={!isRoleLoading}
          isLoading={isLoadingOwnerSalesPhotoEvidenceAlbum}
          loadError={ownerSalesPhotoEvidenceAlbumLoadError}
          onRefresh={loadOwnerSalesPhotoEvidenceAlbumRows}
          onDelete={handleDeleteOwnerSalesPhotoEvidence}
          deleteCapability={ownerSalesPhotoEvidenceDeleteCapability}
          marketRequiresEvidence={salesPhotoEvidenceRequired}
          className="mb-6"
        />
        </>
        )}

        {resolvedOwnerWorkspaceView === 'overview' && visibleOverviewDetail === 'performance' && (
        <>
          <DailyRevenueStats
            market={market}
            dealRecordCountByDate={dealRecordCountByDate}
            onAddRevenue={handleOpenAddRevenue}
            onDateClick={handleDateClick}
            showTotals={false}
            reviewMode={marketWorkspacePhase === 'ended'}
          />
          {canAnalyze && <button type="button" onClick={() => setOwnerOverviewDetail('photos')} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-atelier-paper px-4 text-sm text-primary"><Camera className="h-4 w-4" aria-hidden="true" />查看成交照片</button>}
        </>
        )}

        {/* 6. 即時統計 */}
        {canRecord && resolvedOwnerWorkspaceView === 'overview' && visibleOverviewDetail === 'interactions' && (
        <section className="mb-4 rounded-lg border border-border bg-white p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              互動摘要
            </h2>
            <span className="text-sm font-semibold text-foreground">
              {interactionSummary.totalCount} 次
            </span>
          </div>
          {/* 互動次數統計（C2.19B：從 dailyStats projection 讀取） */}
          {interactionSummary.totalCount > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">互動次數總計</span>
                <span className="text-xs text-muted-foreground">（點擊查看詳情）</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(() => {
                  const buttons = getInteractionButtons();
                  return buttons.map(button => {
                    const count = interactionSummary.countByType[button.id] || 0;
                    return (
                      <button
                        key={button.id}
                        type="button"
                        onClick={() => handleInteractionClick(button.id, button.label, button.role)}
                        className="bg-background rounded-xl p-3 text-center hover:bg-neutral-alt hover:scale-105 transition-all cursor-pointer active:scale-95"
                      >
                        <InteractionRoleIcon role={button.role} className="mx-auto mb-1 h-5 w-5 text-primary" />
                        <div className="text-lg font-medium text-foreground">{count}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{button.label}</div>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          )}
          {interactionSummary.totalCount === 0 && (
            <div className="rounded-lg bg-background px-4 py-8 text-center text-sm text-muted-foreground">
              目前沒有顧客互動紀錄
            </div>
          )}
        </section>
        )}



        {/* 8. 成本明細 - ✅ 員工模式下隱藏 */}
        {(
          resolvedOwnerWorkspaceView === 'manage' ||
          (resolvedOwnerWorkspaceView === 'overview' && visibleOverviewDetail === 'costs')
        ) && (
          <section className="mx-auto mb-4 max-w-3xl rounded-lg border border-border bg-white p-4">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-foreground">
              <DollarSign className="w-5 h-5 text-primary" />
              成本明細
            </h2>
          <div className="space-y-2 text-sm">
            {/* 攤位費 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">攤位費</span>
              <span className="font-medium text-foreground">
                {formatCurrency(getMarketBoothFee(market))}
              </span>
            </div>
            
            <MarketFeeConflictNotice market={market} />
            {!market.tableclothFree && (market.tableclothRental ?? 0) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">桌布租金</span><span className="font-medium">{formatCurrency(market.tableclothRental ?? 0)}</span></div>}
            {/* 設備租賃 - 始終顯示 */}
            <div className="space-y-1 pl-4 py-2 bg-background rounded-xl">
              <div className="text-xs font-medium text-muted-foreground mb-1">設備租賃：</div>
              
              {/* 桌子 */}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Table className="w-4 h-4" />
                  桌子
                </span>
                <span className="font-medium text-foreground">
                  {market.tableFree 
                    ? <span className="text-primary">免費提供</span>
                    : (market.tableRental && market.tableRental > 0)
                    ? formatCurrency(market.tableRental)
                    : <span className="text-muted-foreground">自備</span>
                  }
                </span>
              </div>
              
              {/* 椅子 */}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Armchair className="w-4 h-4" />
                  椅子
                </span>
                <span className="font-medium text-foreground">
                  {market.chairFree 
                    ? <span className="text-primary">免費提供</span>
                    : (market.chairRental && market.chairRental > 0)
                    ? formatCurrency(market.chairRental)
                    : <span className="text-muted-foreground">自備</span>
                  }
                </span>
              </div>
              
              {/* 傘架 */}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Umbrella className="w-4 h-4" />
                  傘架
                </span>
                <span className="font-medium text-foreground">
                  {market.umbrellaFree 
                    ? <span className="text-primary">免費提供</span>
                    : (market.umbrellaRental && market.umbrellaRental > 0)
                    ? formatCurrency(market.umbrellaRental)
                    : <span className="text-muted-foreground">自備</span>
                  }
                </span>
              </div>
            </div>

            {/* 抽成 */}
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                抽成 ({market.commissionRate || 0}%)
              </span>
              <span className="font-medium text-foreground">
                {formatCurrency(
                  ((market.totalRevenue || 0) * (market.commissionRate || 0)) / 100
                )}
              </span>
            </div>
            
            {/* 保證金 - 不計入成本，僅作提醒 */}
            {(market.deposit ?? 0) > 0 && (
              <div className="flex justify-between items-center bg-soft-yellow px-3 py-2 rounded-lg">
                <span className="text-muted-foreground flex items-center gap-1">
                  保證金
                  <span className="text-xs text-secondary">(需退款)</span>
                </span>
                <span className="font-medium text-secondary">
                  {formatCurrency(market.deposit)}
                </span>
              </div>
            )}

            
            
            {/* 固定成本總計 */}
            <div className="border-t border-primary/10 pt-2 flex justify-between font-medium">
              <span className="text-foreground">固定成本總計</span>
              <span className="text-secondary">
                {formatCurrency(calculateTrackedMarketFixedCost(market))}
              </span>
            </div>
          </div>
        </section>
        )}

        {/* 顧客行為分析區塊 */}
        {canAnalyze && resolvedOwnerWorkspaceView === 'overview' && visibleOverviewDetail === 'interactions' && interactionEvents.length > 0 && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                顧客行為分析
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                本場市集的顧客互動模式與偏好
              </p>
            </div>

            {/* 智能洞察提示 */}
            <div className="mb-6">
              {canAnalyze && <BehaviorInsightCard insights={behaviorInsights} />}
            </div>

            {/* 互動偏好佔比圖 */}
            {interactionPreferenceData.length > 0 && (
              <div className="mb-6">
                {canAnalyze && <InteractionPreferenceChart data={interactionPreferenceData} />}
              </div>
            )}

            {/* 互動時序熱力圖 */}
            {timeHeatmapData.length > 0 && (
              <div className="mb-6">
                {canAnalyze && <InteractionTimeHeatmap data={timeHeatmapData} />}
              </div>
            )}
          </>
        )}



        {/* 次要操作 */}
        {resolvedOwnerWorkspaceView === 'manage' && market.sessionOrigin === 'schedule' && market.scheduleOccurrenceState === 'skipped' && (
          <div className="mx-auto max-w-3xl">
            <button
              onClick={() => void handleRestoreScheduledOccurrence()}
              disabled={isRestoringOccurrence}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-white shadow-atelier transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              <Play className="h-5 w-5" />
              {isRestoringOccurrence ? '恢復中…' : '恢復這一次'}
            </button>
          </div>
        )}
        {resolvedOwnerWorkspaceView === 'manage' && market.status !== 'cancelled' && market.status !== 'completed' && (
          <div className="mx-auto max-w-3xl space-y-2">
            {market.sessionOrigin === 'schedule' && market.scheduleOccurrenceState === 'scheduled' && market.status === 'registered' && (
              <button
                onClick={() => void handleSkipScheduledOccurrence()}
                disabled={isSkippingOccurrence}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/15 bg-atelier-paper px-6 py-3 text-foreground transition-colors hover:bg-soft-yellow disabled:opacity-60"
              >
                <Ban className="h-5 w-5" />
                {isSkippingOccurrence ? '處理中…' : '略過這一次'}
              </button>
            )}
            {market.sessionOrigin !== 'schedule' && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-danger/20 bg-soft-pink px-6 py-3 text-danger transition-colors hover:bg-soft-pink/80"
              >
                <Trash2 className="w-5 h-5" />
                刪除記錄
              </button>
            )}
          </div>
        )}
        </div>
        </div>
        </> : <>
          {tier === 'unavailable' && <SubscriptionFeatureNotice />}
          <FreeMarketWorkspace initialView={requestedTask === 'journal' ? 'journal' : 'arrangement'} canManageFieldOps={canManageOwnerFieldOps} market={market} returnTo={requestedReturnTo} busy={isUpdating || isUpdatingOperationSession || isSkippingOccurrence || isRestoringOccurrence} onSkip={handleSkipScheduledOccurrence} onRestore={handleRestoreScheduledOccurrence} onStatus={status => { if (status === 'cancelled') setShowCancelConfirm(true); else handleStatusChangeRequest(status); }} onEdit={handleOpenEditForm} onDelete={() => setShowDeleteConfirm(true)} session={operatingSession} onStart={handleStartEarlyOperation} onClose={handleCloseTodayOperation} />
        </>}
      </div>

      {/* 狀態變更確認對話框 */}
      {showStatusChangeConfirm && isMounted && pendingStatus && createPortal(
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 bg-black/50 z-[999] transition-opacity" 
            onClick={() => {
              setShowStatusChangeConfirm(false);
              setPendingStatus(null);
            }} 
          />
          
          {/* 對話框容器 */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none p-6">
            <div 
              className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-foreground mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-secondary" />
                確認變更狀態？
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                您即將變更狀態為「{getStatusText(pendingStatus)}」
              </p>
              
              {/* 警告提示 */}
              {isOperating && (
                <div className="bg-soft-yellow border border-secondary/30 rounded-xl p-3 mb-4">
                  <p className="text-sm text-foreground font-medium mb-1">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-secondary" aria-hidden="true" />
                      重要提示
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    此變更將會<span className="font-bold text-danger">立即結束營業狀態</span>，快速互動和快速交易功能將被隱藏。
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStatusChangeConfirm(false);
                    setPendingStatus(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => executeStatusChange(pendingStatus)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 rounded-2xl bg-primary text-white hover:bg-primary/85 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '確認變更'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 取消確認對話框 */}
      {showCancelConfirm && isMounted && createPortal(
        <>
          {/* 背景遮罩 - 確保覆蓋全螢幕 */}
          <div 
            className="fixed inset-0 bg-black/50 z-[999] transition-opacity" 
            onClick={() => setShowCancelConfirm(false)} 
          />
          
          {/* 對話框容器 - 強制鎖定螢幕正中央 */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none p-6">
            <div 
              className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-foreground mb-2">確認取消市集？</h3>
              <p className="text-sm text-muted-foreground mb-6">
                取消後，市集狀態將變更為「已取消」，此操作無法復原。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleCancelMarket}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 rounded-2xl bg-danger text-white hover:bg-danger/85 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '確認取消'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && isMounted && createPortal(
        <>
          {/* 背景遮罩 - 確保覆蓋全螢幕 */}
          <div 
            className="fixed inset-0 bg-black/50 z-[999] transition-opacity" 
            onClick={() => setShowDeleteConfirm(false)} 
          />
          
          {/* 對話框容器 - 強制鎖定螢幕正中央 */}
          <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none p-6">
            <div 
              className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-foreground mb-2">確認刪除記錄？</h3>
              <p className="text-sm text-muted-foreground mb-6">
                刪除後，此市集將不再顯示在列表中，但數據仍會保留。
                <br />
                <span className="text-secondary font-medium">提示：如果只是市集取消，建議使用「已取消」狀態。</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleDeleteMarket}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 rounded-2xl bg-danger text-white hover:bg-danger/85 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* 編輯市集表單 */}
      {market?.sessionOrigin === 'schedule' && (
        <AppDialog
          open={showScheduleEditScope}
          onClose={() => setShowScheduleEditScope(false)}
          title="要修改哪些場次？"
          description="這次的臨時調整不會影響下週；修改未來則保留過去與已有活動的紀錄。"
          size="sm"
        >
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setShowScheduleEditScope(false);
                setMarkScheduleOverride(true);
                setShowEditForm(true);
                hideNavigation();
              }}
              className="min-h-12 w-full rounded-xl border border-primary/15 bg-atelier-paper px-4 text-left text-sm font-medium text-foreground hover:border-primary"
            >
              只修改這一次
            </button>
            <button
              type="button"
              onClick={() => {
                setShowScheduleEditScope(false);
                setShowFutureScheduleEdit(true);
              }}
              className="min-h-12 w-full rounded-xl border border-primary/15 bg-atelier-paper px-4 text-left text-sm font-medium text-foreground hover:border-primary"
            >
              從這次開始都修改
            </button>
          </div>
        </AppDialog>
      )}
      {market?.scheduleId && (
        <FutureScheduleEditDialog
          open={showFutureScheduleEdit}
          scheduleId={market.scheduleId}
          effectiveDate={market.dates?.[0] ?? market.startDate}
          onClose={() => setShowFutureScheduleEdit(false)}
        />
      )}
      {market && showEditForm && (
        <EditMarketForm
          isOpen={showEditForm}
          onClose={handleCloseEditForm}
          market={market}
          markScheduleOverride={markScheduleOverride}
          onSuccess={() => {
            showNavigation(); // 顯示導航列
          }}
        />
      )}

      {/* 成交詳情彈窗 */}
      <DealDetailModal
        isOpen={canRecord && showDealDetailModal}
        deal={selectedDeal}
        onClose={handleCloseDealDetail}
        onEdit={handleEditDeal}
        onDelete={handleDeleteDeal}
        photoEvidence={selectedDealPhotoEvidence}
        expiredPhotoEvidence={selectedDealExpiredPhotoEvidence}
      />

      {/* 補登收入對話框 */}
      <AddRevenueDialog
        isOpen={canRecord && showAddRevenueDialog}
        onClose={handleCloseAddRevenue}
        marketId={marketId}
        selectedDate={selectedDate}
        salesPhotoEvidenceContext={addRevenueSalesPhotoEvidenceContext}
        onSalesPhotoEvidenceResult={handleSalesPhotoEvidenceResult}
      />

      {canAnalyze && <SalesPhotoEvidenceFlowDialog
        state={salesPhotoEvidenceFlow.state}
        pendingItems={salesPhotoEvidenceFlow.pendingItems}
        isLoadingPendingItems={salesPhotoEvidenceFlow.isLoadingPendingItems}
        pendingItemsError={salesPhotoEvidenceFlow.pendingItemsError}
        pendingScopeMessage={salesPhotoEvidenceFlow.pendingScopeMessage}
        payloadRefreshByQueueId={salesPhotoEvidenceFlow.payloadRefreshByQueueId}
        canHandleItem={isLocalSalesPhotoEvidenceCaptureAllowed}
        onCapture={(item, source) => void salesPhotoEvidenceFlow.capture(item, source)}
        onPreview={salesPhotoEvidenceFlow.openPreview}
        onUpload={(item, payload) => void salesPhotoEvidenceFlow.upload(item, payload)}
        onRefresh={() => void salesPhotoEvidenceFlow.loadPendingItems()}
        onBack={salesPhotoEvidenceFlow.back}
        onClose={salesPhotoEvidenceFlow.close}
      />}

      {/* 日期成交記錄彈窗 */}
      <DailyDealsModal
        isOpen={canRecord && showDailyDealsModal}
        onClose={handleCloseDailyDeals}
        date={selectedDate}
        deals={getDealsByDate(selectedDate)}
        onDealClick={handleDealClick}
      />

      {/* 互動詳情彈窗 */}
      {selectedInteractionType && (
        <InteractionDetailModal
          isOpen={canRecord && showInteractionDetailModal}
          onClose={handleCloseInteractionDetail}
          interactionType={selectedInteractionType.type}
          label={selectedInteractionType.label}
          role={selectedInteractionType.role}
          events={interactionEvents}
        />
      )}
    </div>
  );
}
