/**
 * 員工模式市集詳情頁面
 *
 * 與老闆模式（市集詳情頁）對齊的員工版，提供員工所需資訊：
 * - 市集基本資訊（名稱、日期、地點）
 * - 營業狀態和時間軸
 * - 每日收入明細（物理隱藏利潤，與老闆的 DailyRevenueStats 結構一致）
 * - 租賃設備資訊（設備提供狀態、保證金）
 * - 員工核心工作功能（互動記錄、快速新增收入、快速交易、流水帳）
 *
 * 隱藏的功能（與老闆差異）：
 * - 編輯按鈕
 * - 承租設備狀態（保留既有員工資料脫敏）
 * - 報名狀態管理
 * - 刪除/取消功能
 * - 顧客行為分析（互動偏好圖表）
 * - 互動次數總計
 * - 4 格總計統計（被 DailyRevenueStats 底部總計取代）
 * - 2 格成交統計（被 DailyRevenueStats 取代）
 * - 補登收入 / 每日成交記錄彈窗（透過 DailyRevenueStats 觸發）
 *
 * 資料來源：
 * - `useMarketStatsFromProjection(market)` 從 `db.dailyStats` 算出總計
 *   （員工路徑下 `db.markets.total*` 已被 C3.4 reset 為 0，不可直接讀）
 * - `useDateRangeStats` 由 DailyRevenueStats 內部呼叫
 *   （同樣從 `db.dailyStats` 查，員工呼叫 OK）
 *
 * 權限脫敏：
 * - UI 層：DailyRevenueStats `hideProfit={true}` 物理隱藏利潤
 * - 資料層：C2.30C/D/31 已實作（PermissionGate 統一閘）
 * - 注意：`db.dailyStats.profit` 仍可由 DevTools 讀到
 *   （這是 UI 層脫敏，與 C2.30C 第 3 層「UI 顯示」一致）
 */

'use client';

import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Store,
  Moon,
  Table,
  Armchair,
  Umbrella,
  Target,
  Circle,
  DoorOpen,
  ClipboardCheck,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Edit
} from 'lucide-react';
import { formatDate, formatCurrency, formatDateRanges } from '@/lib/utils';
import { InteractionButtons } from '@/components/sales/InteractionButtons';
import { TransactionWorkspace } from '@/components/sales/TransactionWorkspace';
import { DailyTransactionLog } from '@/components/markets/DailyTransactionLog';
import { DailyRevenueStats } from '@/components/markets/DailyRevenueStats';
import { AddRevenueDialog } from '@/components/markets/AddRevenueDialog';
import { DailyDealsModal } from '@/components/markets/DailyDealsModal';
import { MarketFieldOpsSection } from '@/components/markets/MarketFieldOpsSection';
import { MarketWorkspaceNavigation } from '@/components/markets/MarketWorkspaceNavigation';
import { MarketWorkspaceSummary } from '@/components/markets/MarketWorkspaceSummary';
import { SalesPhotoEvidenceFlowDialog } from '@/components/markets/SalesPhotoEvidenceFlowDialog';
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import { useUserRole } from '@/hooks/useUserRole';
import { useSalesPhotoEvidenceFlow } from '@/hooks/useSalesPhotoEvidenceFlow';
import { useAuth } from '@/lib/supabase/auth-context';
import { useMarketStatsFromProjection } from '@/lib/db/hooks';
import { getActiveDealEventsForMarket } from '@/lib/events/active-event-service';
import { getDealEventDate } from '@/lib/markets/event-view-utils';
import {
  getDefaultStaffMarketWorkspaceView,
  resolveMarketWorkspacePhase,
  type MarketWorkspacePhase,
  type StaffMarketWorkspaceView,
} from '@/lib/markets/market-workspace';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import type { LocalPendingSalesPhotoEvidenceCreation } from '@/lib/sales/photo-evidence-pending-creation';
import type { Market, Event, DealClosedPayload } from '@/types/db';

const EditMarketForm = dynamic(() =>
  import('@/components/markets/EditMarketForm').then(module => module.EditMarketForm)
);

interface StaffMarketDetailViewProps {
  market: Market;
  initialPhotoEvidenceView?: 'pending_list';
}

export function StaffMarketDetailView({ market, initialPhotoEvidenceView }: StaffMarketDetailViewProps) {
  const router = useRouter();
  const marketId = market.id!;
  const { user } = useAuth();
  const { userRole, isOwner, isLoading: isRoleLoading } = useUserRole();
  const roleCapabilities = deriveRoleCapabilities({
    isOwner,
    staffRole: userRole.staffRole,
  });
  const canRecordInteraction =
    !isRoleLoading && hasCapability(roleCapabilities, 'canRecordInteraction');
  const canEditMarketBasic =
    !isRoleLoading && hasCapability(roleCapabilities, 'canEditMarketBasic');
  const canManageFieldNotes =
    !isRoleLoading && hasCapability(roleCapabilities, 'canManageFieldNotes');
  const canManageChecklist =
    !isRoleLoading && hasCapability(roleCapabilities, 'canManageChecklist');
  const canToggleChecklistItem =
    !isRoleLoading && hasCapability(roleCapabilities, 'canToggleChecklistItem');
  const canEditOwnRecord =
    !isRoleLoading && hasCapability(roleCapabilities, 'canEditOwnSameDayRecord');
  const canDeleteOwnRecord =
    !isRoleLoading && hasCapability(roleCapabilities, 'canDeleteOwnSameDayRecord');
  const canRecordDeal =
    !isRoleLoading && hasCapability(roleCapabilities, 'canRecordDeal');
  const isManagerRole = userRole.staffRole === 'manager';
  const deleteActorId = canDeleteOwnRecord && !isManagerRole ? user?.id : undefined;
  const [showEditMarketForm, setShowEditMarketForm] = useState(false);
  
  // 判斷營業狀態
  const getOperatingStatus = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // ✅ 修復：將時間字串轉換為分鐘數進行比較
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // 檢查今天是否為市集日
    let isMarketDay = false;
    if (market.dates && market.dates.length > 0) {
      isMarketDay = market.dates.includes(today);
    } else {
      isMarketDay = market.startDate <= today && market.endDate >= today;
    }
    
    if (!isMarketDay) {
      return { status: 'not_started', label: '尚未開始', color: 'bg-soft-yellow text-secondary' };
    }
    
    // ✅ 修復：檢查狀態是否為「已繳費」或「如期舉行」
    const isStatusReady = market.status === 'paid' || market.status === 'ongoing';
    
    if (!isStatusReady) {
      return { status: 'not_started', label: '尚未開始', color: 'bg-soft-yellow text-secondary' };
    }
    
    // ✅ 修復：使用分鐘數比較時間
    if (market.operatingStartTime && market.operatingEndTime) {
      const startMinutes = timeToMinutes(market.operatingStartTime);
      const endMinutes = timeToMinutes(market.operatingEndTime);
      
      if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
        return { status: 'operating', label: '營業中', color: 'bg-primary text-white' };
      }
    }
    
    if (market.operatingEndTime) {
      const endMinutes = timeToMinutes(market.operatingEndTime);
      
      if (currentMinutes >= endMinutes) {
        return { status: 'closed', label: '已結束', color: 'bg-gray-100 text-muted-foreground' };
      }
    }
    
    return { status: 'not_started', label: '尚未開始', color: 'bg-soft-yellow text-secondary' };
  };

  const operatingStatus = getOperatingStatus();
  const isOperating = operatingStatus.status === 'operating';
  const workspacePhase: MarketWorkspacePhase = resolveMarketWorkspacePhase({
    operatingPhase: isOperating
      ? 'operating'
      : operatingStatus.status === 'closed'
        ? 'ended'
        : 'not-started',
    dates: market.dates,
    startDate: market.startDate,
    endDate: market.endDate,
    marketStatus: market.status,
  });
  const [workspaceView, setWorkspaceView] = useState<StaffMarketWorkspaceView>(() =>
    getDefaultStaffMarketWorkspaceView(workspacePhase)
  );
  const salesPhotoEvidenceRequired = Boolean(market.salesPhotoEvidenceRequired);
  const addRevenueSalesPhotoEvidenceContext = {
    ownerId: market.relationship_owner_id ?? market.owner_id ?? userRole.ownerId ?? null,
    marketRequiresEvidence: salesPhotoEvidenceRequired,
    capturedByStaffId: isOwner ? null : user?.id ?? null,
  };

  // ✅ 員工核心工作功能：補登收入 / 每日成交記錄彈窗
  const [showAddRevenueDialog, setShowAddRevenueDialog] = useState(false);
  const [showDailyDealsModal, setShowDailyDealsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dealEvents, setDealEvents] = useState<Event<DealClosedPayload>[]>([]);

  const isLocalSalesPhotoEvidenceCaptureAllowed = useCallback(
    (item: LocalPendingSalesPhotoEvidenceCreation) => {
      return Boolean(
        user?.id &&
        item.marketId === marketId &&
        (!item.capturedByStaffId || item.capturedByStaffId === user?.id)
      );
    },
    [marketId, user?.id]
  );

  const salesPhotoEvidenceFlow = useSalesPhotoEvidenceFlow({
    marketId,
    canHandleItem: isLocalSalesPhotoEvidenceCaptureAllowed,
    initialView: initialPhotoEvidenceView,
  });
  const handleSalesPhotoEvidenceResult = salesPhotoEvidenceFlow.handleSalesPhotoEvidenceResult;
  const handleOpenPendingSalesPhotoEvidence = salesPhotoEvidenceFlow.openPendingList;

  // ✅ 載入成交事件（從 db.events 讀取，員工呼叫 OK）
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const allDeals = await getActiveDealEventsForMarket(marketId);
        // 篩選在市集日期範圍內的 deals
        const marketDates = market.dates && market.dates.length > 0
          ? market.dates
          : (() => {
              const dates: string[] = [];
              const start = new Date(market.startDate);
              const end = new Date(market.endDate);
              for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                dates.push(dateStr);
              }
              return dates;
            })();
        if (!cancelled) {
          const filtered = allDeals.filter(e => marketDates.includes(getDealEventDate(e)));
          setDealEvents(filtered);
        }
      } catch (error) {
        console.error('員工詳情頁載入成交事件失敗:', error);
      }
    })();
    return () => { cancelled = true; };
  }, [marketId, market.dates, market.startDate, market.endDate]);

  const getDealsByDate = (date: string) => {
    return dealEvents.filter(deal => getDealEventDate(deal) === date);
  };

  const handleOpenAddRevenue = (date: string) => {
    if (!canRecordDeal) return;
    setSelectedDate(date);
    setShowAddRevenueDialog(true);
  };
  const handleCloseAddRevenue = () => {
    setShowAddRevenueDialog(false);
    setSelectedDate('');
  };
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    setShowDailyDealsModal(true);
  };
  const handleCloseDailyDeals = () => {
    setShowDailyDealsModal(false);
    setSelectedDate('');
  };

  // ✅ 員工端總計改用 dailyStats 算出（C3.4 reset 過的 market.total* 為 0）
  // useMarketStatsFromProjection 從 db.dailyStats 加總，與老闆頁同來源
  const stats = useMarketStatsFromProjection(market);

  return (
    <div className="min-h-screen bg-atelier-canvas pb-20 text-atelier-ink">
      <header className="bg-atelier-sage-soft/80 px-4 pb-6 pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <button
                onClick={() => router.back()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-atelier-paper text-atelier-muted shadow-sm transition-colors hover:bg-atelier-blue-soft hover:text-atelier-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="返回市集列表"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-atelier-clay">今天一起把現場顧好</p>
                <h1 className="mt-1 break-words text-2xl font-semibold leading-tight text-atelier-ink">{market.name}</h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-atelier-muted">
                  {/* 日期 */}
                  <div className="flex items-start gap-1.5">
                    <Calendar className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                    <span className="flex-1">
                      {market.dates && market.dates.length > 0 
                        ? formatDateRanges(market.dates)
                        : market.startDate === market.endDate 
                          ? formatDate(market.startDate)
                          : `${formatDate(market.startDate)} - ${formatDate(market.endDate)}`
                      }
                    </span>
                  </div>
                  {/* 地點 */}
                  <div className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{market.location}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-atelier-muted">交易、照片與待辦，都在熟悉的位置等你。</p>
              </div>
            </div>
            
            <div className="flex shrink-0 items-center gap-1">
              {/* ✅ 同步狀態指示器 */}
              <SyncStatusIndicator tone="default" />
              {canEditMarketBasic && (
                <button
                  onClick={() => setShowEditMarketForm(true)}
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
      <main className="mx-auto max-w-5xl px-4 pb-6">
        <MarketWorkspaceNavigation
          value={workspaceView}
          onChange={setWorkspaceView}
          ariaLabel="員工市集工作台"
          items={[
            { id: 'live', label: '現場', icon: Store, badge: salesPhotoEvidenceFlow.pendingCount },
            { id: 'records', label: '紀錄', icon: Clock },
            { id: 'tasks', label: '任務', icon: ClipboardCheck },
          ]}
        />

        <MarketWorkspaceSummary
          phase={workspacePhase}
          operatingTime={market.operatingStartTime && market.operatingEndTime
            ? `${market.operatingStartTime}–${market.operatingEndTime}`
            : null}
          items={workspaceView === 'tasks'
            ? [
                { label: '開始', value: market.operatingStartTime || '--' },
                { label: '結束', value: market.operatingEndTime || '--' },
                { label: '待補照片', value: salesPhotoEvidenceFlow.pendingCount },
              ]
            : [
                { label: '收入', value: formatCurrency(stats?.totalRevenue ?? 0), emphasis: true },
                { label: '成交', value: stats?.totalDeals ?? 0 },
                { label: '待補照片', value: salesPhotoEvidenceFlow.pendingCount },
              ]}
        />

        {workspaceView === 'live' && !isOperating && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
            <span>目前不在營業時段，交易功能會在營業期間顯示。</span>
          </div>
        )}

        {/* ✅ 營業中時的操作區 - 員工核心工作功能 */}
        {workspaceView === 'live' && isOperating && (
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            {/* 1. 互動記錄按鈕 */}
            {canRecordInteraction && (
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
            )}

            {canRecordDeal && (
              <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2">
              <TransactionWorkspace
                marketId={marketId}
                salesPhotoEvidenceRequired={salesPhotoEvidenceRequired}
                pendingPhotoCount={salesPhotoEvidenceFlow.pendingCount}
                onOpenPendingPhotos={handleOpenPendingSalesPhotoEvidence}
                salesPhotoEvidenceContext={addRevenueSalesPhotoEvidenceContext}
                onSalesPhotoEvidenceResult={handleSalesPhotoEvidenceResult}
                hideProfit
              />
              </div>
            )}

            <div className="lg:col-start-2 lg:row-start-2">
              <DailyTransactionLog
                marketId={marketId}
                allowDelete={canDeleteOwnRecord}
                deleteActorId={deleteActorId}
                deleteSameDayOnly={canDeleteOwnRecord}
                limit={5}
                showSummary={false}
                title="最近紀錄"
                onViewAll={() => setWorkspaceView('records')}
              />
            </div>
          </div>
        )}
        
        {/* ✅ 當日流水帳 - 營業中或已結束時顯示 */}
        {workspaceView === 'records' && (
          <div className="mx-auto max-w-3xl">
          <DailyTransactionLog
            marketId={marketId}
            allowDelete={canDeleteOwnRecord}
            deleteActorId={deleteActorId}
            deleteSameDayOnly={canDeleteOwnRecord}
            showSummary
            title="交易紀錄"
          />
          </div>
        )}

        {(workspaceView === 'records' || workspaceView === 'tasks') && (
          <div className="mx-auto max-w-3xl">
          <MarketFieldOpsSection
            marketId={marketId}
            canManageFieldNotes={canManageFieldNotes}
            canManageChecklist={canManageChecklist}
            canToggleChecklistItem={canToggleChecklistItem}
          />
          </div>
        )}
        
        {/* 營業狀態卡片 */}
        {workspaceView === 'tasks' && (
        <section className="mx-auto mb-4 max-w-3xl rounded-lg border border-border bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">營業狀態</h2>
            <div className={`px-4 py-2 rounded-full flex items-center gap-2 font-medium text-sm ${operatingStatus.color}`}>
              {operatingStatus.status === 'operating' ? (
                <Store className="w-5 h-5" />
              ) : operatingStatus.status === 'closed' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
              <span>{operatingStatus.label}</span>
            </div>
          </div>

          {/* 時間軸 */}
          {(market.checkInTime || market.operatingStartTime || market.operatingEndTime || (market.earlyEntryEnabled && market.earlyEntryTime)) ? (
            <div className="space-y-3">
              {/* 提前進場 */}
              {market.earlyEntryEnabled && market.earlyEntryTime && (
                <div className="flex items-center gap-3">
                  <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10/30 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <DoorOpen className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">提前進場</div>
                        <div className="text-sm text-muted-foreground">{market.earlyEntryTime}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 報到 */}
              {market.checkInTime && (
                <div className="flex items-center gap-3">
                  <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10/30 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <ClipboardCheck className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">報到</div>
                        <div className="text-sm text-muted-foreground">{market.checkInTime}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 營業中 */}
              {market.operatingStartTime && market.operatingEndTime && (
                <div className="flex items-center gap-3">
                  <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10/30 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <Store className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">營業中</div>
                        <div className="text-sm text-muted-foreground">
                          {market.operatingStartTime} - {market.operatingEndTime}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 營業結束 */}
              {market.operatingEndTime && (
                <div className="flex items-center gap-3">
                  <Circle className="w-6 h-6 text-gray-300 flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl bg-primary/10/30 border border-primary/10">
                    <div className="flex items-center gap-3">
                      <Moon className="w-5 h-5 text-primary" />
                      <div>
                        <div className="font-medium text-foreground">營業結束</div>
                        <div className="text-sm text-muted-foreground">{market.operatingEndTime}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
              <Clock className="w-8 h-8 text-primary mx-auto mb-2 opacity-50" />
              <p className="text-sm text-foreground font-medium mb-1">
                尚未設定時間資訊
              </p>
              <p className="text-xs text-muted-foreground">
                請聯繫老闆設定市集時間
              </p>
            </div>
          )}
        </section>
        )}

        {/* 每日收入明細 - 與老闆頁 DailyRevenueStats 同結構，物理隱藏利潤 */}
        {workspaceView === 'records' && (
        <div className="mx-auto max-w-3xl">
        <DailyRevenueStats
          market={market}
          hideProfit={true}
          onAddRevenue={handleOpenAddRevenue}
          onDateClick={handleDateClick}
          canAddRevenue={canRecordDeal}
          showTotals={false}
        />
        </div>
        )}

        {/* 承租設備 */}
        {workspaceView === 'tasks' && (
        <section className="mx-auto mb-4 max-w-3xl rounded-lg border border-border bg-white p-4">
          <h2 className="mb-4 text-base font-medium text-foreground">承租設備</h2>
          <div className="space-y-3">
            {/* 保證金 */}
            {market.deposit && market.deposit > 0 && (
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-soft-yellow">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-secondary" />
                  <div>
                    <span className="text-foreground">保證金</span>
                    <span className="text-xs text-secondary ml-2">(需退款)</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-secondary">
                  {formatCurrency(market.deposit)}
                </span>
              </div>
            )}

            {/* 桌子 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background">
              <div className="flex items-center gap-2">
                <Table className="w-5 h-5 text-primary" />
                <span className="text-foreground">桌子</span>
              </div>
              <span className="text-sm font-medium">
                {market.tableFree ? (
                  <span className="text-primary">免費提供</span>
                ) : market.tableRental && market.tableRental > 0 ? (
                  <span className="text-primary">已承租</span>
                ) : (
                  <span className="text-muted-foreground">自備</span>
                )}
              </span>
            </div>

            {/* 椅子 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background">
              <div className="flex items-center gap-2">
                <Armchair className="w-5 h-5 text-primary" />
                <span className="text-foreground">椅子</span>
              </div>
              <span className="text-sm font-medium">
                {market.chairFree ? (
                  <span className="text-primary">免費提供</span>
                ) : market.chairRental && market.chairRental > 0 ? (
                  <span className="text-primary">已承租</span>
                ) : (
                  <span className="text-muted-foreground">自備</span>
                )}
              </span>
            </div>

            {/* 傘架 */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-background">
              <div className="flex items-center gap-2">
                <Umbrella className="w-5 h-5 text-primary" />
                <span className="text-foreground">傘架</span>
              </div>
              <span className="text-sm font-medium">
                {market.umbrellaFree ? (
                  <span className="text-primary">免費提供</span>
                ) : market.umbrellaRental && market.umbrellaRental > 0 ? (
                  <span className="text-primary">已承租</span>
                ) : (
                  <span className="text-muted-foreground">自備</span>
                )}
              </span>
            </div>
          </div>
        </section>
        )}
      </main>

      {/* 補登收入對話框（透過 DailyRevenueStats 觸發） */}
      <AddRevenueDialog
        isOpen={showAddRevenueDialog}
        onClose={handleCloseAddRevenue}
        marketId={marketId}
        selectedDate={selectedDate}
        salesPhotoEvidenceContext={addRevenueSalesPhotoEvidenceContext}
        onSalesPhotoEvidenceResult={handleSalesPhotoEvidenceResult}
      />

      <SalesPhotoEvidenceFlowDialog
        state={salesPhotoEvidenceFlow.state}
        pendingItems={salesPhotoEvidenceFlow.pendingItems}
        isLoadingPendingItems={salesPhotoEvidenceFlow.isLoadingPendingItems}
        pendingItemsError={salesPhotoEvidenceFlow.pendingItemsError}
        payloadRefreshByQueueId={salesPhotoEvidenceFlow.payloadRefreshByQueueId}
        canHandleItem={isLocalSalesPhotoEvidenceCaptureAllowed}
        onCapture={(item, source) => void salesPhotoEvidenceFlow.capture(item, source)}
        onPreview={salesPhotoEvidenceFlow.openPreview}
        onUpload={(item, payload) => void salesPhotoEvidenceFlow.upload(item, payload)}
        onRefresh={() => void salesPhotoEvidenceFlow.loadPendingItems()}
        onBack={salesPhotoEvidenceFlow.back}
        onClose={salesPhotoEvidenceFlow.close}
      />

      {/* 每日成交記錄彈窗（透過 DailyRevenueStats 觸發） */}
      <DailyDealsModal
        isOpen={showDailyDealsModal}
        onClose={handleCloseDailyDeals}
        date={selectedDate}
        deals={getDealsByDate(selectedDate)}
        onDealClick={() => {
          // 員工不開 DealDetailModal（刪除入口已被 C2.24A 封鎖）
          // 如未來需要顯示詳情，可在這裡實作唯讀 modal
        }}
      />

      {showEditMarketForm && (
        <EditMarketForm
          isOpen
          onClose={() => setShowEditMarketForm(false)}
          market={market}
          mode="manager"
          onSuccess={() => setShowEditMarketForm(false)}
        />
      )}
    </div>
  );
}
