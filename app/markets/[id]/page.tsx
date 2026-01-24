'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  DollarSign, 
  TrendingUp,
  Clock,
  AlertCircle,
  Trash2,
  Ban,
  Play,
  Pause,
  CheckCircle,
  Edit,
  Check,
  DoorOpen,
  ClipboardCheck,
  Store,
  Moon,
  BarChart3,
  Table,
  Armchair,
  Umbrella,
  Circle,
  Package
} from 'lucide-react';
import { useMarket, updateMarketStatus, startMarket, endMarket } from '@/lib/db/hooks';
import { initializeDatabase, db } from '@/lib/db';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { CartDrawer } from '@/components/sales/CartDrawer';
import { QuickInteractionButtons } from '@/components/sales/QuickInteractionButtons';
import { QuickTransactionGrid } from '@/components/sales/QuickTransactionGrid';
import { EditMarketForm } from '@/components/markets/EditMarketForm';
import { InteractionPreferenceChart } from '@/components/analytics/InteractionPreferenceChart';
import { InteractionTimeHeatmap } from '@/components/analytics/InteractionTimeHeatmap';
import { BehaviorInsightCard } from '@/components/analytics/BehaviorInsightCard';
import { getQuickActionButtons } from '@/lib/quick-actions-store';
import type { MarketStatus, OperationPhase, Event, InteractionRecordedPayload, DealClosedPayload } from '@/types/db';

interface PageProps {
  params: {
    id: string;
  };
}

export default function MarketDetailPage({ params }: PageProps) {
  const router = useRouter();
  const marketId = params.id; // UUID 字符串，不需要 parseInt
  const market = useMarket(marketId);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [countdown, setCountdown] = useState<string>('--');
  
  // 互動行為數據狀態
  const [interactionEvents, setInteractionEvents] = useState<Event<InteractionRecordedPayload>[]>([]);
  const [dealEvents, setDealEvents] = useState<Event<DealClosedPayload>[]>([]);
  const [buttonLabels, setButtonLabels] = useState<Record<string, { label: string; emoji: string }>>({});

  // 初始化資料庫
  useEffect(() => {
    initializeDatabase()
      .then(() => setIsInitialized(true))
      .catch((error) => {
        console.error('資料庫初始化失敗：', error);
        toast.error('資料庫初始化失敗');
      });
  }, []);

  // 倒數計時邏輯
  useEffect(() => {
    if (!market || !market.startDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
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
        // 獲取按鈕配置
        const buttons = getQuickActionButtons();
        const labelMap: Record<string, { label: string; emoji: string }> = {};
        buttons.forEach(btn => {
          labelMap[btn.id] = { label: btn.label, emoji: btn.emoji };
        });
        setButtonLabels(labelMap);

        // 計算市集日期範圍的時間戳
        const startTimestamp = new Date(market.startDate).getTime();
        const endTimestamp = new Date(market.endDate).getTime() + 86400000; // +1 天

        // 獲取互動事件
        const interactions = await db.events
          .where('type')
          .equals('interaction_recorded')
          .filter(e => 
            e.timestamp >= startTimestamp && 
            e.timestamp < endTimestamp &&
            e.payload.marketId === marketId
          )
          .toArray() as Event<InteractionRecordedPayload>[];

        setInteractionEvents(interactions);

        // 獲取成交事件
        const deals = await db.events
          .where('type')
          .equals('deal_closed')
          .filter(e => 
            e.timestamp >= startTimestamp && 
            e.timestamp < endTimestamp &&
            e.payload.marketId === marketId
          )
          .toArray() as Event<DealClosedPayload>[];

        setDealEvents(deals);
      } catch (error) {
        console.error('載入互動數據失敗：', error);
      }
    };

    if (market && isInitialized) {
      loadInteractionData();
    }
  }, [market, marketId, isInitialized]);

  // 計算互動偏好數據
  const interactionPreferenceData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    interactionEvents.forEach(event => {
      const type = event.payload.type;
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts).map(([type, count]) => ({
      name: buttonLabels[type]?.label || type,
      emoji: buttonLabels[type]?.emoji || '❓',
      value: count,
    })).sort((a, b) => b.value - a.value);
  }, [interactionEvents, buttonLabels]);

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
      hourlyData[hour].revenue += event.payload.totalAmount;
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
        `本場市集「${topInteraction.emoji} ${topInteraction.name}」最為頻繁，佔總互動 ${percentage}%。`
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
      registered: 'bg-[#FFF8E7] text-[#3A3A3A]',
      accepted: 'bg-[#E8F3E8] text-[#3A3A3A]',
      paid: 'bg-[#E8F3E8] text-[#3A3A3A]',
      ongoing: 'bg-[#7B9FA6] text-white',
      completed: 'bg-[#F5E6E8] text-[#3A3A3A]',
      postponed: 'bg-[#F5E6E8] text-[#3A3A3A]',
      cancelled: 'bg-[#F5E6E8] text-[#d4183d]',
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

  // 處理狀態切換
  const handleStatusChange = async () => {
    if (!market) return;

    const nextStatus = getNextStatus(market.status);
    if (!nextStatus) return;

    setIsUpdating(true);

    try {
      // 特殊處理：開始營業和結束營業
      if (market.status === 'paid' && nextStatus === 'ongoing') {
        await startMarket(marketId);
        toast.success('市集已開始營業！', {
          description: '祝您生意興隆 🎪',
        });
      } else if (market.status === 'ongoing' && nextStatus === 'completed') {
        await endMarket(marketId);
        toast.success('市集已結束營業！', {
          description: '辛苦了，期待下次再見 ✨',
        });
      } else {
        await updateMarketStatus(marketId, nextStatus);
        toast.success(`狀態已更新為「${getStatusText(nextStatus)}」`, {
          description: '市集資訊已同步更新',
        });
      }
    } catch (error) {
      console.error('更新狀態失敗：', error);
      toast.error('更新狀態失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  // 處理營業階段切換
  const handlePhaseChange = async (phase: OperationPhase | null) => {
    if (!market) return;

    setIsUpdating(true);

    try {
      if (phase === null) {
        // 使用 undefined 來清除欄位
        await db.markets.update(marketId, {
          operationPhase: undefined,
          updatedAt: Date.now(),
        });
      } else {
        await db.markets.update(marketId, {
          operationPhase: phase,
          updatedAt: Date.now(),
        });
      }

      const phaseText = phase === null ? '尚未開始營業' : {
        preparation: '準備中',
        operating: '營業中',
        closing: '收攤中',
      }[phase];

      toast.success(`營業階段已切換為「${phaseText}」`);
    } catch (error) {
      console.error('切換階段失敗：', error);
      toast.error('切換階段失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  // 處理取消市集
  const handleCancelMarket = async () => {
    if (!market) return;

    setIsUpdating(true);

    try {
      await updateMarketStatus(marketId, 'cancelled', '用戶主動取消');
      toast.success('市集已取消', {
        description: '狀態已更新為「已取消」',
      });
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('取消市集失敗：', error);
      toast.error('取消市集失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  // 處理刪除市集（軟刪除）
  const handleDeleteMarket = async () => {
    if (!market) return;

    setIsUpdating(true);

    try {
      // 軟刪除：標記為已取消
      await updateMarketStatus(marketId, 'cancelled', '用戶刪除記錄');
      toast.success('市集已刪除', {
        description: '記錄已移除',
      });
      setShowDeleteConfirm(false);
      
      // 返回列表頁
      setTimeout(() => {
        router.push('/markets');
      }, 1000);
    } catch (error) {
      console.error('刪除市集失敗：', error);
      toast.error('刪除市集失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  // 處理打開編輯表單
  const handleOpenEditForm = () => {
    setShowEditForm(true);
    hideNavigation(); // 隱藏導航列
  };

  // 處理關閉編輯表單
  const handleCloseEditForm = () => {
    setShowEditForm(false);
    showNavigation(); // 顯示導航列
  };

  // 載入中
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B6B6B]">載入中...</p>
        </div>
      </div>
    );
  }

  // 找不到市集
  if (!market) {
    return (
      <div className="min-h-screen bg-[#FAFAF8]">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
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
          <div className="bg-white rounded-[1.5rem] p-12 shadow-lg shadow-[#7B9FA6]/10 text-center">
            <AlertCircle className="w-16 h-16 text-[#7B9FA6] mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-[#3A3A3A] mb-2">
              找不到此市集
            </h2>
            <p className="text-[#6B6B6B] text-sm mb-6">
              此市集可能已被刪除或不存在
            </p>
            <button
              onClick={() => router.push('/markets')}
              className="bg-[#7B9FA6] text-white px-6 py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors"
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

  return (
    <div className="min-h-screen bg-[#FAFAF8] pb-20">
      {/* Header */}
      <div className="gradient-header pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <button
                onClick={() => router.push('/markets')}
                className="text-white hover:opacity-80 transition-opacity"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex-1">
                <h1 className="text-white text-xl font-medium">{market.name}</h1>
                <p className="text-white/80 text-xs flex items-center gap-1 mt-1">
                  <Calendar className="w-3 h-3" />
                  {market.startDate === market.endDate 
                    ? formatDate(market.startDate)
                    : `${formatDate(market.startDate)}-${formatDate(market.endDate).split('/')[1]}`
                  }
                  <span className="mx-1">•</span>
                  <MapPin className="w-3 h-3" />
                  {market.location}
                </p>
              </div>
            </div>
            {market.operationPhase !== 'operating' && (
              <button 
                onClick={handleOpenEditForm}
                className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 text-white backdrop-blur-sm"
              >
                <Edit className="w-4 h-4" />
                編輯
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* 營業狀態卡片 - 始終在最上方 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-[#3A3A3A]">營業狀態</h2>
              <p className="text-xs text-[#6B6B6B] mt-1">
                {market.operationPhase === 'operating' 
                  ? '目前營業中 🎪' 
                  : '尚未開始營業'}
              </p>
            </div>
            <button
              disabled={(() => {
                const today = new Date().toISOString().split('T')[0];
                const isStatusReady = market.status === 'paid' || market.status === 'ongoing';
                const isWithinMarketPeriod = today >= market.startDate && today <= market.endDate;
                return !isStatusReady || !isWithinMarketPeriod;
              })()}
              onClick={() => {
                if (market.operationPhase === 'operating') {
                  handlePhaseChange(null);
                } else {
                  handlePhaseChange('operating');
                }
              }}
              className={`relative inline-flex h-14 w-28 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                (() => {
                  const today = new Date().toISOString().split('T')[0];
                  const isStatusReady = market.status === 'paid' || market.status === 'ongoing';
                  const isWithinMarketPeriod = today >= market.startDate && today <= market.endDate;
                  const canToggle = isStatusReady && isWithinMarketPeriod;
                  
                  if (!canToggle) {
                    return 'bg-gray-200 cursor-not-allowed opacity-50';
                  }
                  
                  return market.operationPhase === 'operating'
                    ? 'bg-gradient-to-r from-[#7B9FA6] to-[#6A8E95] focus:ring-[#7B9FA6] shadow-lg shadow-[#7B9FA6]/30'
                    : 'bg-gray-200 hover:bg-gray-300 focus:ring-gray-400';
                })()
              }`}
            >
              <span
                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-all duration-300 flex items-center justify-center ${
                  market.operationPhase === 'operating'
                    ? 'translate-x-16'
                    : 'translate-x-2'
                }`}
              >
                {market.operationPhase === 'operating' ? (
                  <Store className="w-5 h-5 text-[#7B9FA6]" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-gray-400"></div>
                )}
              </span>
            </button>
          </div>
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const isStatusReady = market.status === 'paid' || market.status === 'ongoing';
            const isWithinMarketPeriod = today >= market.startDate && today <= market.endDate;
            
            if (!isStatusReady) {
              return (
                <div className="bg-[#FFF8E7] border border-[#FFF8E7] rounded-xl p-3">
                  <p className="text-sm text-[#3A3A3A] whitespace-pre-line flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#D4A574] flex-shrink-0" />
                    <span>請先將狀態更新為「已繳費」或「如期舉行」</span>
                  </p>
                </div>
              );
            }
            
            if (!isWithinMarketPeriod) {
              return (
                <div className="bg-[#FFF8E7] border border-[#FFF8E7] rounded-xl p-3">
                  <p className="text-sm text-[#3A3A3A] whitespace-pre-line flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-[#D4A574] flex-shrink-0" />
                    <span>僅限市集期間開啟（{market.startDate} ~ {market.endDate}）</span>
                  </p>
                </div>
              );
            }
            
            return null;
          })()}
        </div>

        {/* 營業中時的操作區 */}
        {market.operationPhase === 'operating' && (
          <>
            {/* 快速互動 */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
              <h2 className="text-lg font-medium text-[#3A3A3A] mb-4">快速互動</h2>
              <QuickInteractionButtons 
                marketId={marketId}
              />
            </div>

            {/* 快速交易 */}
            <QuickTransactionGrid marketId={marketId} />
          </>
        )}

        {/* 報名狀態 Stepper */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#3A3A3A]">報名狀態</h2>
            {market.operationPhase === 'operating' && (
              <span className="text-xs bg-[#FFF8E7] text-[#D4A574] px-3 py-1 rounded-full font-medium">
                🔒 營業中鎖定
              </span>
            )}
          </div>
          <div className="space-y-4">
            <div className="relative">
              <div className="flex items-center justify-between">
                {/* 已報名 */}
                <div className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => {
                        if (market.operationPhase === 'operating') {
                          toast.error('營業中無法修改報名狀態');
                          return;
                        }
                        if (market.status !== 'registered') {
                          updateMarketStatus(marketId, 'registered');
                        }
                      }}
                      disabled={market.operationPhase === 'operating'}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.operationPhase === 'operating'
                          ? 'cursor-not-allowed opacity-60'
                          : market.status === 'registered'
                          ? 'ring-4 ring-offset-2 ring-[#7B9FA6]/30 scale-110 bg-[#D4A574] text-white cursor-default'
                          : ['accepted', 'paid', 'ongoing', 'completed'].includes(market.status)
                          ? 'bg-[#7B9FA6] text-white hover:scale-105 cursor-pointer'
                          : 'bg-gray-200 text-gray-400 hover:scale-105 cursor-pointer'
                      }`}
                    >
                      {['registered', 'accepted', 'paid', 'ongoing', 'completed'].includes(market.status) && (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <span className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                      market.status === 'registered' ? 'text-[#7B9FA6] font-bold' : 'text-[#3A3A3A]'
                    }`}>
                      已報名
                    </span>
                  </div>
                  <div className={`h-1 flex-1 mx-2 transition-all duration-300 rounded-full ${
                    ['accepted', 'paid', 'ongoing', 'completed'].includes(market.status) ? 'bg-[#7B9FA6]' : 'bg-gray-200'
                  }`}></div>
                </div>

                {/* 已錄取 */}
                <div className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => {
                        if (market.operationPhase === 'operating') {
                          toast.error('營業中無法修改報名狀態');
                          return;
                        }
                        if (market.status !== 'accepted') {
                          updateMarketStatus(marketId, 'accepted');
                        }
                      }}
                      disabled={market.operationPhase === 'operating'}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.operationPhase === 'operating'
                          ? 'cursor-not-allowed opacity-60'
                          : market.status === 'accepted'
                          ? 'ring-4 ring-offset-2 ring-[#7B9FA6]/30 scale-110 bg-[#D4A574] text-white cursor-default'
                          : ['paid', 'ongoing', 'completed'].includes(market.status)
                          ? 'bg-[#7B9FA6] text-white hover:scale-105 cursor-pointer'
                          : 'bg-gray-200 text-gray-400 hover:scale-105 cursor-pointer'
                      }`}
                    >
                      {['accepted', 'paid', 'ongoing', 'completed'].includes(market.status) && (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <span className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                      market.status === 'accepted' ? 'text-[#7B9FA6] font-bold' : market.status === 'registered' ? 'text-gray-400' : 'text-[#3A3A3A]'
                    }`}>
                      已錄取
                    </span>
                  </div>
                  <div className={`h-1 flex-1 mx-2 transition-all duration-300 rounded-full ${
                    ['paid', 'ongoing', 'completed'].includes(market.status) ? 'bg-[#7B9FA6]' : 'bg-gray-200'
                  }`}></div>
                </div>

                {/* 已繳費 */}
                <div className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => {
                        if (market.operationPhase === 'operating') {
                          toast.error('營業中無法修改報名狀態');
                          return;
                        }
                        if (market.status !== 'paid') {
                          updateMarketStatus(marketId, 'paid');
                        }
                      }}
                      disabled={market.operationPhase === 'operating'}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.operationPhase === 'operating'
                          ? 'cursor-not-allowed opacity-60'
                          : market.status === 'paid'
                          ? 'ring-4 ring-offset-2 ring-[#7B9FA6]/30 scale-110 bg-[#D4A574] text-white cursor-default'
                          : ['ongoing', 'completed'].includes(market.status)
                          ? 'bg-[#7B9FA6] text-white hover:scale-105 cursor-pointer'
                          : 'bg-gray-200 text-gray-400 hover:scale-105 cursor-pointer'
                      }`}
                    >
                      {['paid', 'ongoing', 'completed'].includes(market.status) && (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <span className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                      market.status === 'paid' ? 'text-[#7B9FA6] font-bold' : ['registered', 'accepted'].includes(market.status) ? 'text-gray-400' : 'text-[#3A3A3A]'
                    }`}>
                      已繳費
                    </span>
                  </div>
                  <div className={`h-1 flex-1 mx-2 transition-all duration-300 rounded-full ${
                    ['ongoing', 'completed'].includes(market.status) ? 'bg-[#7B9FA6]' : 'bg-gray-200'
                  }`}></div>
                </div>

                {/* 如期舉行 */}
                <div className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => {
                        if (market.operationPhase === 'operating') {
                          toast.error('營業中無法修改報名狀態');
                          return;
                        }
                        if (market.status !== 'ongoing') {
                          updateMarketStatus(marketId, 'ongoing');
                        }
                      }}
                      disabled={market.operationPhase === 'operating'}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.operationPhase === 'operating'
                          ? 'cursor-not-allowed opacity-60'
                          : market.status === 'ongoing'
                          ? 'ring-4 ring-offset-2 ring-[#7B9FA6]/30 scale-110 bg-[#D4A574] text-white cursor-default'
                          : market.status === 'completed'
                          ? 'bg-[#7B9FA6] text-white hover:scale-105 cursor-pointer'
                          : 'bg-gray-200 text-gray-400 hover:scale-105 cursor-pointer'
                      }`}
                    >
                      {['ongoing', 'completed'].includes(market.status) && (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                    <span className={`mt-2 text-xs font-medium text-center whitespace-nowrap ${
                      market.status === 'ongoing' ? 'text-[#7B9FA6] font-bold' : ['registered', 'accepted', 'paid'].includes(market.status) ? 'text-gray-400' : 'text-[#3A3A3A]'
                    }`}>
                      如期舉行
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 延期/取消按鈕 */}
            <div className="flex items-center justify-center gap-4 pt-2">
              <div className="text-xs text-[#6B6B6B]">或</div>
              <button
                onClick={() => {
                  if (market.operationPhase === 'operating') {
                    toast.error('營業中無法修改報名狀態');
                    return;
                  }
                  updateMarketStatus(marketId, 'postponed');
                }}
                disabled={market.operationPhase === 'operating'}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  market.operationPhase === 'operating'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                    : market.status === 'postponed'
                    ? 'bg-[#F5E6E8] text-[#3A3A3A] ring-2 ring-[#D4A574]'
                    : 'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#ECECEC] cursor-pointer'
                }`}
              >
                已延期
              </button>
              <button
                onClick={() => {
                  if (market.operationPhase === 'operating') {
                    toast.error('營業中無法修改報名狀態');
                    return;
                  }
                  setShowCancelConfirm(true);
                }}
                disabled={market.operationPhase === 'operating'}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  market.operationPhase === 'operating'
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-60'
                    : market.status === 'cancelled'
                    ? 'bg-[#F5E6E8] text-[#d4183d] ring-2 ring-[#d4183d]'
                    : 'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#ECECEC] cursor-pointer'
                }`}
              >
                已取消
              </button>
            </div>

            {/* 提示 */}
            <div className="bg-[#7B9FA6]/10 border border-[#7B9FA6]/20 rounded-xl p-3 text-xs text-[#3A3A3A]">
              <p className="font-semibold mb-1">💡 提示：</p>
              <p>
                {market.operationPhase === 'operating'
                  ? '營業中無法修改報名狀態，請先關閉營業開關。'
                  : '點擊任意狀態可快速切換。需設定為「已繳費」或「如期舉行」才能開始營業。'}
              </p>
            </div>
          </div>
        </div>

        {/* 今日時間軸 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-[#3A3A3A]">
            <Clock className="w-5 h-5 text-[#7B9FA6]" />
            今日時間軸
          </h2>
          <div className="space-y-4">
            {/* 倒數提示 */}
            {countdown !== '--' && countdown !== '已開始' && (
              <div className="bg-[#E8F3E8] border border-[#7B9FA6]/20 rounded-xl p-3 text-center">
                <p className="text-sm text-[#3A3A3A]">
                  <span className="font-bold text-lg text-[#7B9FA6]">{countdown}</span>
                </p>
              </div>
            )}

            {/* 時間線 */}
            <div className="space-y-3">
              {/* 提前進場 */}
              {market.earlyEntryEnabled && market.earlyEntryTime && (
                <>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Circle className="w-6 h-6 text-gray-300" />
                      </div>
                      <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all bg-[#F5E6E8]/30 text-[#6B6B6B] border-[#F5E6E8]">
                        <div className="flex items-center gap-3">
                          <DoorOpen className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">提前進場</div>
                            <div className="text-sm opacity-70">{market.earlyEntryTime}</div>
                          </div>
                        </div>
                        <div className="text-xs font-medium flex items-center gap-1 opacity-60">
                          <Clock className="w-3 h-3" />
                          30m
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 my-1">
                      <div className="w-0.5 h-4 bg-gray-200"></div>
                    </div>
                  </div>
                </>
              )}

              {/* 報到 */}
              {market.checkInTime && (
                <>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Circle className="w-6 h-6 text-gray-300" />
                      </div>
                      <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all bg-[#E8F3E8]/30 text-[#6B6B6B] border-[#E8F3E8]">
                        <div className="flex items-center gap-3">
                          <ClipboardCheck className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">報到</div>
                            <div className="text-sm opacity-70">{market.checkInTime}</div>
                          </div>
                        </div>
                        <div className="text-xs font-medium flex items-center gap-1 opacity-60">
                          <Clock className="w-3 h-3" />
                          30m
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 my-1">
                      <div className="w-0.5 h-4 bg-gray-200"></div>
                    </div>
                  </div>
                </>
              )}

              {/* 營業中 */}
              {market.operatingStartTime && market.operatingEndTime && (
                <>
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <Circle className="w-6 h-6 text-gray-300" />
                      </div>
                      <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all bg-[#E8F3E8]/30 text-[#6B6B6B] border-[#E8F3E8]">
                        <div className="flex items-center gap-3">
                          <Store className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">營業中</div>
                            <div className="text-sm opacity-70">{market.operatingStartTime}</div>
                          </div>
                        </div>
                        <div className="text-xs font-medium flex items-center gap-1 opacity-60">
                          <Clock className="w-3 h-3" />
                          {(() => {
                            const start = market.operatingStartTime.split(':');
                            const end = market.operatingEndTime.split(':');
                            const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
                            const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
                            const duration = endMinutes - startMinutes;
                            return `${Math.floor(duration / 60)}h`;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="ml-3 my-1">
                      <div className="w-0.5 h-4 bg-gray-200"></div>
                    </div>
                  </div>
                </>
              )}

              {/* 營業結束 */}
              {market.operatingEndTime && (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Circle className="w-6 h-6 text-gray-300" />
                    </div>
                    <div className="flex-1 flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all bg-[#FFF8E7]/30 text-[#6B6B6B] border-[#FFF8E7]">
                      <div className="flex items-center gap-3">
                        <Moon className="w-5 h-5" />
                        <div>
                          <div className="font-semibold">營業結束</div>
                          <div className="text-sm opacity-70">{market.operatingEndTime}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 統計摘要 */}
            {market.operatingStartTime && market.operatingEndTime && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-[#E8F3E8] rounded-xl p-3 text-center">
                  <p className="text-xs text-[#6B6B6B] mb-1">營業時長</p>
                  <p className="text-lg font-bold text-[#7B9FA6]">
                    {(() => {
                      const start = market.operatingStartTime.split(':');
                      const end = market.operatingEndTime.split(':');
                      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
                      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
                      const duration = endMinutes - startMinutes;
                      return `${Math.floor(duration / 60)}h`;
                    })()}
                  </p>
                </div>
                <div className="bg-[#F5E6E8] rounded-xl p-3 text-center">
                  <p className="text-xs text-[#6B6B6B] mb-1">總時長</p>
                  <p className="text-lg font-bold text-[#D4A574]">
                    {(() => {
                      const checkIn = market.checkInTime?.split(':') || market.operatingStartTime.split(':');
                      const end = market.operatingEndTime.split(':');
                      const startMinutes = parseInt(checkIn[0]) * 60 + parseInt(checkIn[1]);
                      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
                      const duration = endMinutes - startMinutes;
                      const hours = Math.floor(duration / 60);
                      const minutes = duration % 60;
                      return minutes > 0 ? `${hours}h${minutes}m` : `${hours}h`;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 即時統計 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
              <BarChart3 className="w-5 h-5 text-[#7B9FA6]" />
              即時統計
            </h2>
            <button className="text-sm text-[#7B9FA6] hover:underline font-medium">
              查看每日統計 →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#7B9FA6]/10 rounded-xl p-4">
              <div className="text-2xl font-medium text-[#7B9FA6]">
                {formatCurrency(market.totalRevenue || 0)}
              </div>
              <div className="text-sm text-[#6B6B6B] mt-1">總收入</div>
            </div>
            <div className="bg-[#E8F3E8] rounded-xl p-4">
              <div className="text-2xl font-medium text-[#3A3A3A]">
                {formatCurrency(market.totalProfit || 0)}
              </div>
              <div className="text-sm text-[#6B6B6B] mt-1">淨利潤</div>
            </div>
            <div className="bg-[#D4A574]/10 rounded-xl p-4">
              <div className="text-2xl font-medium text-[#D4A574]">
                {market.totalDeals || 0}
              </div>
              <div className="text-sm text-[#6B6B6B] mt-1">成交數</div>
            </div>
            <div className="bg-[#F5E6E8] rounded-xl p-4">
              <div className="text-2xl font-medium text-[#3A3A3A]">
                {market.totalInteractions && market.totalInteractions > 0
                  ? `${Math.round(((market.totalDeals || 0) / market.totalInteractions) * 100)}%`
                  : '0.0%'}
              </div>
              <div className="text-sm text-[#6B6B6B] mt-1">轉換率</div>
            </div>
          </div>
        </div>

        {/* 成本明細 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2 text-[#3A3A3A]">
            <DollarSign className="w-5 h-5 text-[#7B9FA6]" />
            成本明細
          </h2>
          <div className="space-y-2 text-sm">
            {/* 攤位費 */}
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">攤位費</span>
              <span className="font-medium text-[#3A3A3A]">
                {formatCurrency(market.boothCost || 0)}
              </span>
            </div>
            
            {/* 設備租賃 - 始終顯示 */}
            <div className="space-y-1 pl-4 py-2 bg-[#FAFAF8] rounded-xl">
              <div className="text-xs font-medium text-[#6B6B6B] mb-1">設備租賃：</div>
              
              {/* 桌子 */}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-[#6B6B6B]">
                  <Table className="w-4 h-4" />
                  桌子
                </span>
                <span className="font-medium text-[#3A3A3A]">
                  {market.tableFree 
                    ? <span className="text-[#7B9FA6]">免費提供</span>
                    : (market.tableRental && market.tableRental > 0)
                    ? formatCurrency(market.tableRental)
                    : <span className="text-[#6B6B6B]">自備</span>
                  }
                </span>
              </div>
              
              {/* 椅子 */}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-[#6B6B6B]">
                  <Armchair className="w-4 h-4" />
                  椅子
                </span>
                <span className="font-medium text-[#3A3A3A]">
                  {market.chairFree 
                    ? <span className="text-[#7B9FA6]">免費提供</span>
                    : (market.chairRental && market.chairRental > 0)
                    ? formatCurrency(market.chairRental)
                    : <span className="text-[#6B6B6B]">自備</span>
                  }
                </span>
              </div>
              
              {/* 傘架 */}
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1 text-[#6B6B6B]">
                  <Umbrella className="w-4 h-4" />
                  傘架
                </span>
                <span className="font-medium text-[#3A3A3A]">
                  {market.umbrellaFree 
                    ? <span className="text-[#7B9FA6]">免費提供</span>
                    : (market.umbrellaRental && market.umbrellaRental > 0)
                    ? formatCurrency(market.umbrellaRental)
                    : <span className="text-[#6B6B6B]">自備</span>
                  }
                </span>
              </div>
            </div>

            {/* 抽成 */}
            <div className="flex justify-between">
              <span className="text-[#6B6B6B]">
                抽成 ({market.commissionRate || 0}%)
              </span>
              <span className="font-medium text-[#3A3A3A]">
                {formatCurrency(
                  ((market.totalRevenue || 0) * (market.commissionRate || 0)) / 100
                )}
              </span>
            </div>
            
            {/* 保證金 - 不計入成本，僅作提醒 */}
            {market.deposit && market.deposit > 0 && (
              <div className="flex justify-between items-center bg-[#FFF8E7] px-3 py-2 rounded-lg">
                <span className="text-[#6B6B6B] flex items-center gap-1">
                  保證金
                  <span className="text-xs text-[#D4A574]">(需退款)</span>
                </span>
                <span className="font-medium text-[#D4A574]">
                  {formatCurrency(market.deposit)}
                </span>
              </div>
            )}
            
            {/* 固定成本總計 */}
            <div className="border-t border-[#7B9FA6]/10 pt-2 flex justify-between font-medium">
              <span className="text-[#3A3A3A]">固定成本總計</span>
              <span className="text-[#D4A574]">
                {formatCurrency(
                  (market.boothCost || 0) +
                  (market.tableFree ? 0 : (market.tableRental || 0)) +
                  (market.chairFree ? 0 : (market.chairRental || 0)) +
                  (market.umbrellaFree ? 0 : (market.umbrellaRental || 0))
                )}
              </span>
            </div>
          </div>
        </div>

        {/* 顧客行為分析區塊 */}
        {interactionEvents.length > 0 && (
          <>
            <div className="mb-4">
              <h2 className="text-xl font-medium text-[#3A3A3A] flex items-center gap-2">
                📈 顧客行為分析
              </h2>
              <p className="text-sm text-[#6B6B6B] mt-1">
                本場市集的顧客互動模式與偏好
              </p>
            </div>

            {/* 智能洞察提示 */}
            <div className="mb-6">
              <BehaviorInsightCard insights={behaviorInsights} />
            </div>

            {/* 互動偏好佔比圖 */}
            {interactionPreferenceData.length > 0 && (
              <div className="mb-6">
                <InteractionPreferenceChart data={interactionPreferenceData} />
              </div>
            )}

            {/* 互動時序熱力圖 */}
            {timeHeatmapData.length > 0 && (
              <div className="mb-6">
                <InteractionTimeHeatmap data={timeHeatmapData} />
              </div>
            )}
          </>
        )}

        {/* 次要操作 */}
        {market.status !== 'cancelled' && market.status !== 'completed' && (
          <div className="space-y-2">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-[#F5E6E8] text-[#d4183d] px-6 py-3 rounded-2xl hover:bg-[#E5D6D8] transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              刪除記錄
            </button>
          </div>
        )}
      </div>

      {/* 取消確認對話框 */}
      {showCancelConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCancelConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-medium text-[#3A3A3A] mb-2">確認取消市集？</h3>
              <p className="text-sm text-[#6B6B6B] mb-6">
                取消後，市集狀態將變更為「已取消」，此操作無法復原。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleCancelMarket}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#d4183d] text-white hover:bg-[#c41739] transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '確認取消'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-medium text-[#3A3A3A] mb-2">確認刪除記錄？</h3>
              <p className="text-sm text-[#6B6B6B] mb-6">
                刪除後，此市集記錄將被移除，此操作無法復原。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleDeleteMarket}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#d4183d] text-white hover:bg-[#c41739] transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 購物車抽屜 */}
      <CartDrawer
        isOpen={showCartDrawer}
        onClose={() => setShowCartDrawer(false)}
        marketId={marketId}
      />

      {/* 編輯市集表單 */}
      {market && (
        <EditMarketForm
          isOpen={showEditForm}
          onClose={handleCloseEditForm}
          market={market}
          onSuccess={() => {
            toast.success('市集資訊已更新');
            showNavigation(); // 顯示導航列
          }}
        />
      )}
    </div>
  );
}
