/**
 * 員工模式市集詳情頁面
 *
 * 與老闆模式（市集詳情頁）對齊的員工版，提供員工所需資訊：
 * - 市集基本資訊（名稱、日期、地點）
 * - 營業狀態和時間軸
 * - 每日收入明細（物理隱藏利潤，與老闆的 DailyRevenueStats 結構一致）
 * - 租賃設備資訊（攤位費、設備、保證金）
 * - 員工核心工作功能（互動記錄、快速新增收入、快速交易、流水帳）
 *
 * 隱藏的功能（與老闆差異）：
 * - 編輯按鈕
 * - 成本明細（攤位費仍可見於「費用資訊」）
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
import { useCallback, useEffect, useState } from 'react';
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
import { QuickInteractionButtons } from '@/components/sales/QuickInteractionButtons';
import { QuickTransactionGrid } from '@/components/sales/QuickTransactionGrid';
import { DailyTransactionLog } from '@/components/markets/DailyTransactionLog';
import { DailyRevenueStats } from '@/components/markets/DailyRevenueStats';
import { AddRevenueDialog } from '@/components/markets/AddRevenueDialog';
import { DailyDealsModal } from '@/components/markets/DailyDealsModal';
import { EditMarketForm } from '@/components/markets/EditMarketForm';
import { MarketFieldOpsSection } from '@/components/markets/MarketFieldOpsSection';
import { SalesPhotoEvidenceOperatingCard } from '@/components/markets/SalesPhotoEvidenceOperatingCard';
import { SyncStatusIndicator } from '@/components/common/SyncStatusIndicator';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/supabase/auth-context';
import { useMarketStatsFromProjection } from '@/lib/db/hooks';
import { getActiveDealEventsForMarket } from '@/lib/events/active-event-service';
import { getDealEventDate } from '@/lib/markets/event-view-utils';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import type { Market, Event, DealClosedPayload } from '@/types/db';

interface StaffMarketDetailViewProps {
  market: Market;
}

export function StaffMarketDetailView({ market }: StaffMarketDetailViewProps) {
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
  
  // ✅ 新增：交易功能區塊的展開/折疊狀態（互斥）
  const [isQuickRevenueExpanded, setIsQuickRevenueExpanded] = useState(true);  // 快速新增收入（預設展開）
  const [isQuickTransactionExpanded, setIsQuickTransactionExpanded] = useState(false);  // 快速交易（預設折疊）
  
  // ✅ 處理快速新增收入的展開/折疊切換
  const handleToggleQuickRevenue = () => {
    if (isQuickRevenueExpanded) {
      setIsQuickRevenueExpanded(false);
      setIsQuickTransactionExpanded(true);
    } else {
      setIsQuickRevenueExpanded(true);
      setIsQuickTransactionExpanded(false);
    }
  };
  
  // ✅ 處理快速交易的展開/折疊切換
  const handleToggleQuickTransaction = () => {
    if (isQuickTransactionExpanded) {
      setIsQuickTransactionExpanded(false);
      setIsQuickRevenueExpanded(true);
    } else {
      setIsQuickTransactionExpanded(true);
      setIsQuickRevenueExpanded(false);
    }
  };

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
  useMarketStatsFromProjection(market);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - 員工模式紫色漸變 */}
      <div className="bg-gradient-to-br from-primary to-primary/80 pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => router.back()}
                className="text-white hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <h1 className="text-white text-xl font-medium">{market.name}</h1>
                <div className="text-white/80 text-xs mt-1">
                  {/* 日期 */}
                  <div className="flex items-start gap-1 mb-1">
                    <Calendar className="w-3 h-3 flex-shrink-0 mt-0.5" />
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
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span>{market.location}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* ✅ 同步狀態指示器 */}
              <SyncStatusIndicator />
              {canEditMarketBasic && (
                <button
                  onClick={() => setShowEditMarketForm(true)}
                  className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 text-white backdrop-blur-sm"
                >
                  <Edit className="w-4 h-4" />
                  編輯
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* ✅ 營業中時的操作區 - 員工核心工作功能 */}
        {isOperating && (
          <>
            {/* 1. 互動記錄按鈕 */}
            {canRecordInteraction && (
              <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
                <h2 className="text-lg font-medium flex items-center gap-2 text-foreground mb-4">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  記錄互動
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  記錄顧客互動行為，幫助分析顧客偏好
                </p>
                <InteractionButtons
                  marketId={marketId}
                  onInteractionRecorded={() => {
                    // 重新載入互動數據
                    window.dispatchEvent(new Event('interaction-recorded'));
                  }}
                />
              </div>
            )}

            {/* 2. 新增收入（簡化版：直接輸入金額） */}
            {canRecordDeal && (
              <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10 mb-6">
                {/* Header with toggle */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
                    <DollarSign className="w-5 h-5 text-primary" />
                    快速新增收入
                  </h2>
                  <button
                    onClick={handleToggleQuickRevenue}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isQuickRevenueExpanded ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isQuickRevenueExpanded ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    ></span>
                  </button>
                </div>
                
                {/* Content */}
                {isQuickRevenueExpanded && (
                  <QuickInteractionButtons 
                    marketId={marketId}
                    hideProfit={true}
                  />
                )}
              </div>
            )}
            
            <SalesPhotoEvidenceOperatingCard
              mode="staff"
              required={salesPhotoEvidenceRequired}
              pendingCount={0}
            />

            {/* 3. 快速交易（完整版：選擇商品） */}
            {canRecordDeal && (
              <QuickTransactionGrid
                marketId={marketId}
                isExpanded={isQuickTransactionExpanded}
                onToggle={handleToggleQuickTransaction}
              />
            )}
          </>
        )}
        
        {/* ✅ 當日流水帳 - 營業中或已結束時顯示 */}
        {(operatingStatus.status === 'operating' || operatingStatus.status === 'closed') && (
          <DailyTransactionLog
            marketId={marketId}
            allowDelete={canDeleteOwnRecord}
            deleteActorId={deleteActorId}
            deleteSameDayOnly={canDeleteOwnRecord}
          />
        )}

        <MarketFieldOpsSection
          marketId={marketId}
          canManageFieldNotes={canManageFieldNotes}
          canManageChecklist={canManageChecklist}
          canToggleChecklistItem={canToggleChecklistItem}
        />
        
        {/* 營業狀態卡片 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6 mb-6">
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
        </div>

        {/* 每日收入明細 - 與老闆頁 DailyRevenueStats 同結構，物理隱藏利潤 */}
        <DailyRevenueStats
          market={market}
          hideProfit={true}
          onAddRevenue={handleOpenAddRevenue}
          onDateClick={handleDateClick}
          canAddRevenue={canRecordDeal}
        />

        {/* 承租設備 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6 mb-6">
          <h2 className="text-lg font-medium text-foreground mb-4">承租設備</h2>
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
        </div>

        {/* 提示卡片 */}
        <div className="bg-primary/10 border border-primary/20 rounded-[1.5rem] p-6 text-center">
          <AlertCircle className="w-12 h-12 text-primary mx-auto mb-3 opacity-50" />
          <p className="text-sm text-foreground font-medium mb-1">
            員工模式
          </p>
          <p className="text-xs text-muted-foreground">
            您正在以員工身份查看此市集，部分功能和數據已隱藏
          </p>
        </div>
      </div>

      {/* 補登收入對話框（透過 DailyRevenueStats 觸發） */}
      <AddRevenueDialog
        isOpen={showAddRevenueDialog}
        onClose={handleCloseAddRevenue}
        marketId={marketId}
        selectedDate={selectedDate}
        salesPhotoEvidenceContext={addRevenueSalesPhotoEvidenceContext}
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

      <EditMarketForm
        isOpen={showEditMarketForm}
        onClose={() => setShowEditMarketForm(false)}
        market={market}
        mode="manager"
        onSuccess={() => setShowEditMarketForm(false)}
      />
    </div>
  );
}
