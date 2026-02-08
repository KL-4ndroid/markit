'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { InteractionButtons } from '@/components/sales/InteractionButtons';
import { QuickTransactionGrid } from '@/components/sales/QuickTransactionGrid';
import { EditMarketForm } from '@/components/markets/EditMarketForm';
import { InteractionPreferenceChart } from '@/components/analytics/InteractionPreferenceChart';
import { InteractionTimeHeatmap } from '@/components/analytics/InteractionTimeHeatmap';
import { BehaviorInsightCard } from '@/components/analytics/BehaviorInsightCard';
import { DailyRevenueStats } from '@/components/markets/DailyRevenueStats';
import { AddRevenueDialog } from '@/components/markets/AddRevenueDialog';
import { DealItem } from '@/components/markets/DealItem';
import { DealDetailModal } from '@/components/markets/DealDetailModal';
import { DailyDealsModal } from '@/components/markets/DailyDealsModal';
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
  const [isMounted, setIsMounted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAddRevenueDialog, setShowAddRevenueDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDeal, setSelectedDeal] = useState<Event<DealClosedPayload> | null>(null);
  const [showDealDetailModal, setShowDealDetailModal] = useState(false);
  const [showDailyDealsModal, setShowDailyDealsModal] = useState(false);  // ✅ 新增：日期成交記錄彈窗
  const [countdown, setCountdown] = useState<string>('--');
  const [isOperatingStatusCollapsed, setIsOperatingStatusCollapsed] = useState(true);  // 營業狀態折疊
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(true);  // 今日時間軸折疊
  const [showStatusChangeConfirm, setShowStatusChangeConfirm] = useState(false);  // 狀態變更確認
  const [pendingStatus, setPendingStatus] = useState<MarketStatus | null>(null);  // 待變更的狀態
  
  // ✅ 新增：交易功能區塊的展開/折疊狀態（互斥）
  const [isQuickRevenueExpanded, setIsQuickRevenueExpanded] = useState(true);  // 快速新增收入（預設展開）
  const [isQuickTransactionExpanded, setIsQuickTransactionExpanded] = useState(false);  // 快速交易（預設折疊）
  
  // ✅ 處理快速新增收入的展開/折疊切換
  const handleToggleQuickRevenue = () => {
    if (isQuickRevenueExpanded) {
      // 如果當前是展開的，折疊它並展開快速交易
      setIsQuickRevenueExpanded(false);
      setIsQuickTransactionExpanded(true);
    } else {
      // 如果當前是折疊的，展開它並折疊快速交易
      setIsQuickRevenueExpanded(true);
      setIsQuickTransactionExpanded(false);
    }
  };
  
  // ✅ 處理快速交易的展開/折疊切換
  const handleToggleQuickTransaction = () => {
    if (isQuickTransactionExpanded) {
      // 如果當前是展開的，折疊它並展開快速新增收入
      setIsQuickTransactionExpanded(false);
      setIsQuickRevenueExpanded(true);
    } else {
      // 如果當前是折疊的，展開它並折疊快速新增收入
      setIsQuickTransactionExpanded(true);
      setIsQuickRevenueExpanded(false);
    }
  };
  
  // 互動行為數據狀態
  const [interactionEvents, setInteractionEvents] = useState<Event<InteractionRecordedPayload>[]>([]);
  const [dealEvents, setDealEvents] = useState<Event<DealClosedPayload>[]>([]);
  const [buttonLabels, setButtonLabels] = useState<Record<string, { label: string; emoji: string }>>({});

  // 初始化資料庫
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ 資料庫初始化超時，強制完成');
      setIsInitialized(true);
    }, 10000);
    
    initializeDatabase()
      .then(() => {
        clearTimeout(timeoutId);
        setIsInitialized(true);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        console.error('資料庫初始化失敗：', error);
        toast.error('資料庫初始化失敗');
        // 即使失敗也要設置為已初始化，讓用戶可以看到界面
        setIsInitialized(true);
      });
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // 確保只在客戶端渲染
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
            .filter(e => {
              // ✅ 使用 dealDate 作為篩選依據，降級到 timestamp
              const dealTimestamp = e.payload.dealDate 
                ? new Date(e.payload.dealDate).getTime()
                : e.timestamp;
              
              return dealTimestamp >= startTimestamp && 
                    dealTimestamp < endTimestamp &&
                    e.payload.marketId === marketId;
            })
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

  // ✅ 自動營業狀態（響應式）- 三種狀態：'not-started' | 'operating' | 'ended'
  const [operatingPhase, setOperatingPhase] = useState<'not-started' | 'operating' | 'ended'>('not-started');

  // ✅ 自動判斷營業階段
  const checkOperatingStatus = useCallback(() => {
    if (!market) {
      setOperatingPhase('not-started');
      return;
    }
    
    // ✅ 使用本地日期，避免時區問題
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // 檢查是否在市集日期範圍內
    if (market.startDate > today || market.endDate < today) {
      setOperatingPhase('not-started');
      return;
    }
    
    // 檢查狀態是否為「已繳費」或「如期舉行」
    if (market.status !== 'paid' && market.status !== 'ongoing') {
      setOperatingPhase('not-started');
      return;
    }
    
    // 計算營業開始時間（報到時間）
    const startTime = market.checkInTime || market.operatingStartTime;
    if (!startTime) {
      setOperatingPhase('not-started');
      return;
    }
    
    // 計算營業結束時間（營業結束 + 30 分鐘緩衝）
    const endTime = market.operatingEndTime;
    if (!endTime) {
      setOperatingPhase('not-started');
      return;
    }
    
    // ✅ 使用時間戳進行比較（避免跨午夜問題）
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    // 創建今天的時間對象
    const startDateTime = new Date(now);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(now);
    endDateTime.setHours(endHour, endMinute + 30, 0, 0); // 加上 30 分鐘緩衝
    
    // ✅ 如果結束時間小於開始時間，表示跨越午夜，需要加一天
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }
    
    const currentTimestamp = now.getTime();
    const startTimestamp = startDateTime.getTime();
    const endTimestamp = endDateTime.getTime();
    
    // 判斷當前時間處於哪個階段
    if (currentTimestamp < startTimestamp) {
      setOperatingPhase('not-started'); // 未開始
    } else if (currentTimestamp >= startTimestamp && currentTimestamp < endTimestamp) {
      setOperatingPhase('operating'); // 營業中
    } else {
      setOperatingPhase('ended'); // 已結束
    }
  }, [market]);
  
  // ✅ 向後兼容：保留 isOperating 變數
  const isOperating = operatingPhase === 'operating';

  // ✅ 當 market 數據變化時，立即重新判斷營業狀態
  useEffect(() => {
    checkOperatingStatus();
  }, [market, checkOperatingStatus]);

  // ✅ 每分鐘自動更新一次營業狀態
  useEffect(() => {
    const interval = setInterval(() => {
      checkOperatingStatus();
    }, 60000); // 每分鐘檢查一次

    return () => clearInterval(interval);
  }, [checkOperatingStatus]);

  // 處理報名狀態變更（帶二次確認）
  const handleStatusChangeRequest = async (newStatus: MarketStatus) => {
    if (!market) return;

    // 檢查是否會影響營業狀態
    const willAffectOperating = checkIfStatusAffectsOperating(market.status, newStatus);
    
    if (willAffectOperating && isOperating) {
      // 如果當前正在營業，且變更會影響營業狀態，顯示確認對話框
      setPendingStatus(newStatus);
      setShowStatusChangeConfirm(true);
      return;
    }

    // 直接變更狀態
    await executeStatusChange(newStatus);
  };

  // 檢查狀態變更是否會影響營業狀態
  const checkIfStatusAffectsOperating = (currentStatus: MarketStatus, newStatus: MarketStatus): boolean => {
    const operatingStatuses: MarketStatus[] = ['paid', 'ongoing'];
    const currentIsOperating = operatingStatuses.includes(currentStatus);
    const newIsOperating = operatingStatuses.includes(newStatus);
    
    // 如果從營業狀態變更為非營業狀態，或反之，則會影響
    return currentIsOperating !== newIsOperating;
  };

  // 執行狀態變更
  const executeStatusChange = async (newStatus: MarketStatus) => {
    if (!market) return;

    setIsUpdating(true);

    try {
      await updateMarketStatus(marketId, newStatus);
      toast.success(`狀態已更新為「${getStatusText(newStatus)}」`, {
        description: '市集資訊已同步更新',
      });
      setShowStatusChangeConfirm(false);
      setPendingStatus(null);
    } catch (error) {
      console.error('更新狀態失敗：', error);
      toast.error('更新狀態失敗，請稍後再試');
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
      // ✅ 使用軟刪除功能
      const { deleteMarket } = await import('@/lib/db/hooks');
      await deleteMarket(marketId, '用戶刪除記錄');
      
      toast.success('市集已刪除', {
        description: '記錄已從列表中移除',
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

  // 處理打開補登收入對話框
  const handleOpenAddRevenue = (date: string) => {
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
      // ✅ 使用本地日期，避免時區問題
      let dealDate = deal.payload.dealDate;
      if (!dealDate) {
        const dealTimestamp = new Date(deal.timestamp);
        dealDate = `${dealTimestamp.getFullYear()}-${String(dealTimestamp.getMonth() + 1).padStart(2, '0')}-${String(dealTimestamp.getDate()).padStart(2, '0')}`;
      }
      return dealDate === date;
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

  // 處理編輯成交記錄（暫時只顯示提示）
  const handleEditDeal = (deal: Event<DealClosedPayload>) => {
    toast.info('編輯功能即將推出', {
      description: '目前僅支援查看成交詳情',
    });
  };

  // 處理刪除成交記錄
  const handleDeleteDeal = async (deal: Event<DealClosedPayload>) => {
    try {
      const payload = deal.payload;
      const payloadWithMarketId = payload as DealClosedPayload & { market_id?: string };
      const market_id = payloadWithMarketId.market_id || payloadWithMarketId.marketId;
      
      // ✅ 計算要扣除的金額
      let totalAmount = payload.totalAmount;
      let totalCost = 0;
      let dealCount = 1;
      
      // 簡化模式：手動輸入
      if (payload.isManualEntry) {
        totalAmount = payload.manualRevenue || 0;
        totalCost = payload.manualCost || 0;
        dealCount = payload.manualDealCount || 1;
      }
      // 完整模式：選擇商品
      else if (payload.items) {
        for (const item of payload.items) {
          const product = await db.products.get(item.productId);
          if (product && product.cost) {
            totalCost += product.cost * item.quantity;
          }
        }
      }
      
      const totalProfit = totalAmount - totalCost;
      
      // ✅ 獲取交易日期（使用本地日期）
      let transactionDate = payload.dealDate;
      if (!transactionDate) {
        const dealTimestamp = new Date(deal.timestamp);
        transactionDate = `${dealTimestamp.getFullYear()}-${String(dealTimestamp.getMonth() + 1).padStart(2, '0')}-${String(dealTimestamp.getDate()).padStart(2, '0')}`;
      }
      
      // ✅ 使用 transaction 確保原子性
      await db.transaction('rw', [db.events, db.markets, db.dailyStats], async () => {
        // 1. 刪除事件
        await db.events.delete(deal.id!);
        
        // 2. 更新市集統計（扣除金額）
        const market = await db.markets.get(market_id);
        if (market) {
          await db.markets.update(market_id, {
            totalRevenue: Math.max(0, (market.totalRevenue || 0) - totalAmount),
            totalProfit: (market.totalProfit || 0) - totalProfit,
            totalDeals: Math.max(0, (market.totalDeals || 0) - dealCount),
            updatedAt: Date.now(),
          });
        }
        
        // 3. 更新每日統計（扣除金額）
        const dailyStat = await db.dailyStats
          .where('[date+marketId]')
          .equals([transactionDate, market_id])
          .first();
        
        if (dailyStat) {
          const newDealCount = Math.max(0, dailyStat.dealCount - dealCount);
          const newRevenue = Math.max(0, dailyStat.revenue - totalAmount);
          const newCost = Math.max(0, dailyStat.cost - totalCost);
          const newProfit = dailyStat.profit - totalProfit;
          
          // 如果該日期的統計歸零，刪除記錄
          if (newDealCount === 0 && newRevenue === 0) {
            await db.dailyStats.delete(dailyStat.id!);
          } else {
            await db.dailyStats.update(dailyStat.id!, {
              dealCount: newDealCount,
              revenue: newRevenue,
              cost: newCost,
              profit: newProfit,
              updatedAt: Date.now(),
            });
          }
        }
      });

      // 重新載入成交數據
      const updatedDeals = await db.events
        .where('type')
        .equals('deal_closed')
        .filter(e => e.payload.marketId === marketId)
        .toArray();

      setDealEvents(updatedDeals as Event<DealClosedPayload>[]);

      toast.success('成交記錄已刪除', {
        description: `已扣除 ${formatCurrency(totalAmount)}`,
      });

      // 如果刪除的是當前選中的記錄，關閉彈窗
      if (selectedDeal?.id === deal.id) {
        handleCloseDealDetail();
      }
    } catch (error) {
      console.error('刪除成交記錄失敗:', error);
      toast.error('刪除失敗，請稍後再試');
    }
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
                onClick={() => router.back()}
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
              <button
              onClick={handleOpenEditForm}
              className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 text-white backdrop-blur-sm"
            >
              <Edit className="w-4 h-4" />
              編輯
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* 營業中時的操作區 - 根據自動判斷顯示 */}
        {isOperating && (
          <>
            {/* 1. 互動記錄按鈕 */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
              <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A] mb-4">
                <TrendingUp className="w-5 h-5 text-[#7B9FA6]" />
                記錄互動
              </h2>
              <p className="text-sm text-[#6B6B6B] mb-4">
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

            {/* 2. 新增收入（簡化版：直接輸入金額） */}
            <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10 mb-6">
              {/* Header with toggle */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
                  <DollarSign className="w-5 h-5 text-[#7B9FA6]" />
                  快速新增收入
                </h2>
                <button
                  onClick={handleToggleQuickRevenue}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isQuickRevenueExpanded ? 'bg-[#7B9FA6]' : 'bg-gray-300'
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
                />
              )}
            </div>
            
            {/* 3. 快速交易（完整版：選擇商品） */}
            <QuickTransactionGrid 
              marketId={marketId}
              isExpanded={isQuickTransactionExpanded}
              onToggle={handleToggleQuickTransaction}
            />
          </>
        )}

        {/* 3. 營業狀態卡片 - 自動判斷（折疊）- 營業中時隱藏 */}
        {operatingPhase !== 'operating' && (
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
            <button
              onClick={() => setIsOperatingStatusCollapsed(!isOperatingStatusCollapsed)}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex-1 text-left">
                <h2 className="text-lg font-medium text-[#3A3A3A]">營業狀態</h2>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  根據時間自動判斷
                </p>
              </div>
              
              {/* 狀態指示器 + 折疊按鈕 */}
              <div className="flex items-center gap-2">
                <div className={`px-4 py-2.5 rounded-full flex items-center gap-2 font-medium text-sm transition-all ${
                  operatingPhase === 'not-started'
                    ? 'bg-[#FFF8E7] text-[#D4A574] border border-[#D4A574]/30'
                    : 'bg-gray-100 text-[#6B6B6B]'
                }`}>
                  {operatingPhase === 'not-started' ? (
                    <>
                      <Clock className="w-5 h-5" />
                      <span>未開始</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-5 h-5" />
                      <span>已結束</span>
                    </>
                  )}
                </div>
                <div className={`text-[#6B6B6B] transition-transform ${isOperatingStatusCollapsed ? '' : 'rotate-180'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            {/* 折疊內容 */}
            {!isOperatingStatusCollapsed && (
              <>
                {/* 營業時段說明 */}
                <div className="bg-[#7B9FA6]/10 border border-[#7B9FA6]/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-[#7B9FA6] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm text-[#3A3A3A]">
                      <p className="font-medium mb-1">自動營業時段：</p>
                      <p className="text-xs text-[#6B6B6B]">
                        開始：{market.checkInTime || market.operatingStartTime || '--:--'} (報到時間)
                        <br />
                        結束：{market.operatingEndTime ? (() => {
                          const [hour, minute] = market.operatingEndTime.split(':').map(Number);
                          const endWithBuffer = new Date();
                          endWithBuffer.setHours(hour, minute + 30, 0, 0);
                          return `${String(endWithBuffer.getHours()).padStart(2, '0')}:${String(endWithBuffer.getMinutes()).padStart(2, '0')}`;
                        })() : '--:--'} (營業結束 + 30 分鐘)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 條件提示 */}
                {(() => {
                  // ✅ 使用本地日期，避免時區問題
                  const now = new Date();
                  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  const isStatusReady = market.status === 'paid' || market.status === 'ongoing';
                  const isWithinMarketPeriod = today >= market.startDate && today <= market.endDate;
                  
                  if (!isStatusReady) {
                    return (
                      <div className="bg-[#FFF8E7] border border-[#FFF8E7] rounded-xl p-3 mt-3">
                        <p className="text-sm text-[#3A3A3A] whitespace-pre-line flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-[#D4A574] flex-shrink-0" />
                          <span>需將狀態更新為「已繳費」或「如期舉行」才能自動營業</span>
                        </p>
                      </div>
                    );
                  }
                  
                  if (!isWithinMarketPeriod) {
                    return (
                      <div className="bg-[#FFF8E7] border border-[#FFF8E7] rounded-xl p-3 mt-3">
                        <p className="text-sm text-[#3A3A3A] whitespace-pre-line flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-[#D4A574] flex-shrink-0" />
                          <span>僅限市集期間自動營業（{market.startDate} ~ {market.endDate}）</span>
                        </p>
                      </div>
                    );
                  }
                  
                  // 根據營業階段顯示不同提示
                  if (operatingPhase === 'not-started') {
                    return (
                      <div className="bg-[#E8F3E8] border border-[#7B9FA6]/20 rounded-xl p-3 mt-3">
                        <p className="text-sm text-[#3A3A3A] whitespace-pre-line flex items-center gap-2">
                          <Clock className="w-4 h-4 text-[#7B9FA6] flex-shrink-0" />
                          <span>等待營業時間到達，系統將自動切換為「營業中」</span>
                        </p>
                      </div>
                    );
                  } else if (operatingPhase === 'ended') {
                    return (
                      <div className="bg-gray-100 border border-gray-200 rounded-xl p-3 mt-3">
                        <p className="text-sm text-[#6B6B6B] whitespace-pre-line flex items-center gap-2">
                          <Moon className="w-4 h-4 flex-shrink-0" />
                          <span>今日營業已結束，感謝您的辛勞！</span>
                        </p>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
              </>
            )}
          </div>
        )}

        {/* 4. 報名狀態 Stepper - 營業中時完全隱藏 */}
        {!isOperating && (
          <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-[#3A3A3A]">報名狀態</h2>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <div className="flex items-center justify-between">
                {/* 已報名 */}
                <div className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <button
                      onClick={() => {
                        if (market.status !== 'registered') {
                          handleStatusChangeRequest('registered');
                        }
                      }}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.status === 'registered'
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
                        if (market.status !== 'accepted') {
                          handleStatusChangeRequest('accepted');
                        }
                      }}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.status === 'accepted'
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
                        if (market.status !== 'paid') {
                          handleStatusChangeRequest('paid');
                        }
                      }}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.status === 'paid'
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
                        if (market.status !== 'ongoing') {
                          handleStatusChangeRequest('ongoing');
                        }
                      }}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 shadow-md ${
                        market.status === 'ongoing'
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
                onClick={() => handleStatusChangeRequest('postponed')}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  market.status === 'postponed'
                    ? 'bg-[#F5E6E8] text-[#3A3A3A] ring-2 ring-[#D4A574]'
                    : 'bg-[#F5F5F0] text-[#6B6B6B] hover:bg-[#ECECEC] cursor-pointer'
                }`}
              >
                已延期
              </button>
              <button
                onClick={() => {
                  setShowCancelConfirm(true);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                  market.status === 'cancelled'
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
                點擊任意狀態可快速切換。需設定為「已繳費」或「如期舉行」才能自動營業。
              </p>
            </div>
          </div>
          </div>
        )}

        {/* 7. 每日收入統計（多天市集才顯示） */}
        <DailyRevenueStats
          market={market}
          onAddRevenue={handleOpenAddRevenue}
          onDateClick={handleDateClick}
        />

        {/* 6. 即時統計 */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
              <BarChart3 className="w-5 h-5 text-[#7B9FA6]" />
              {market.startDate === market.endDate ? '即時統計' : '總計統計'}
            </h2>
            {market.startDate !== market.endDate && (
              <div className="text-xs text-[#6B6B6B]">
                {(() => {
                  const start = new Date(market.startDate);
                  const end = new Date(market.endDate);
                  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  return `共 ${days} 天`;
                })()}
              </div>
            )}
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
                {formatCurrency((() => {
                  // ✅ 計算淨利潤：總利潤 - 攤位費 - 設備租賃費用
                  const totalProfit = market.totalProfit || 0;
                  const boothCost = market.boothCost || 0;
                  const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
                  const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
                  const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
                  const equipmentCost = tableRental + chairRental + umbrellaRental;
                  
                  return totalProfit - boothCost - equipmentCost;
                })())}
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
                {formatCurrency((() => {
                  // ✅ 總支出：攤位費 + 設備租賃費用
                  const boothCost = market.boothCost || 0;
                  const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
                  const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
                  const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
                  const equipmentCost = tableRental + chairRental + umbrellaRental;
                  
                  return boothCost + equipmentCost;
                })())}
              </div>
              <div className="text-sm text-[#6B6B6B] mt-1">總支出</div>
            </div>
          </div>
        </div>



        {/* 8. 成本明細 */}
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

        {/* 5. 今日時間軸（折疊） */}
        <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
          <button
            onClick={() => setIsTimelineCollapsed(!isTimelineCollapsed)}
            className="w-full flex items-center justify-between"
          >
            <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
              <Clock className="w-5 h-5 text-[#7B9FA6]" />
              今日時間軸
            </h2>
            <div className={`text-[#6B6B6B] transition-transform ${isTimelineCollapsed ? '' : 'rotate-180'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </button>

          {/* 倒數提示 - 始終顯示，不受折疊影響 */}
          {countdown !== '--' && countdown !== '已開始' && (
            <div className="bg-[#E8F3E8] border border-[#7B9FA6]/20 rounded-xl p-3 text-center mt-4">
              <p className="text-sm text-[#3A3A3A]">
                <span className="font-bold text-lg text-[#7B9FA6]">{countdown}</span>
              </p>
            </div>
          )}

          {!isTimelineCollapsed && (
          <div className="space-y-4 mt-4">
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
          )}
        </div>

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
              <h3 className="text-lg font-medium text-[#3A3A3A] mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#D4A574]" />
                確認變更狀態？
              </h3>
              <p className="text-sm text-[#6B6B6B] mb-4">
                您即將變更狀態為「{getStatusText(pendingStatus)}」
              </p>
              
              {/* 警告提示 */}
              {isOperating && (
                <div className="bg-[#FFF8E7] border border-[#D4A574]/30 rounded-xl p-3 mb-4">
                  <p className="text-sm text-[#3A3A3A] font-medium mb-1">
                    ⚠️ 重要提示
                  </p>
                  <p className="text-xs text-[#6B6B6B]">
                    此變更將會<span className="font-bold text-[#d4183d]">立即結束營業狀態</span>，快速互動和快速交易功能將被隱藏。
                  </p>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStatusChangeConfirm(false);
                    setPendingStatus(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => executeStatusChange(pendingStatus)}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors disabled:opacity-50"
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
              <h3 className="text-lg font-medium text-[#3A3A3A] mb-2">確認刪除記錄？</h3>
              <p className="text-sm text-[#6B6B6B] mb-6">
                刪除後，此市集將不再顯示在列表中，但數據仍會保留。
                <br />
                <span className="text-[#D4A574] font-medium">提示：如果只是市集取消，建議使用「已取消」狀態。</span>
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
        </>,
        document.body
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

      {/* 成交詳情彈窗 */}
      <DealDetailModal
        isOpen={showDealDetailModal}
        deal={selectedDeal}
        onClose={handleCloseDealDetail}
        onEdit={handleEditDeal}
        onDelete={handleDeleteDeal}
      />

      {/* 補登收入對話框 */}
      <AddRevenueDialog
        isOpen={showAddRevenueDialog}
        onClose={handleCloseAddRevenue}
        marketId={marketId}
        selectedDate={selectedDate}
      />

      {/* 日期成交記錄彈窗 */}
      <DailyDealsModal
        isOpen={showDailyDealsModal}
        onClose={handleCloseDailyDeals}
        date={selectedDate}
        deals={getDealsByDate(selectedDate)}
        onDealClick={handleDealClick}
      />
    </div>
  );
}
