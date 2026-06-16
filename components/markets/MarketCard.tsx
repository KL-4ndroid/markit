'use client';

import { useRouter } from 'next/navigation';
import { Calendar, MapPin, DollarSign, Table, Armchair, Umbrella, Target, Users, TrendingUp, Clock, Play, Shield, Lock, AlertCircle } from 'lucide-react';
import type { Market, MarketStatus } from '@/types/db';
import type { MarketStatsFromProjection } from '@/lib/db/hooks';
import { formatDate, formatCurrency, formatDateRanges, filterCurrentWeekDates } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { getShadowClass, getBorderClass } from '@/lib/theme-config';
import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

interface MarketCardProps {
  market: Market;
  variant?: 'default' | 'home' | 'upcoming';
  /**
   * Optional stats from projection cache. When provided, the card uses
   * projection revenue/deals instead of market.totalRevenue/totalDeals.
   * Falls back to market fields if omitted.
   * C3.5: enables cloud-first summary view model.
   */
  stats?: MarketStatsFromProjection;
}

/**
 * 市集卡片組件
 * 
 * 顯示市集的基本資訊，包含名稱、日期、地點、狀態等
 * 使用日系設計系統的大圓角與柔和色彩
 * 
 * ✅ 支援員工模式：
 * - 顯示身份標籤（老闆/員工）
 * - 員工模式下隱藏敏感數據（成本、利潤）
 * 
 * @param variant - 'default': 完整版（市集頁面）, 'home': 首頁今日市集（顯示完整資訊）, 'upcoming': 即將到來（隱藏收入/利潤/互動/成交）
 */
export function MarketCard({ market, variant = 'default', stats }: MarketCardProps) {
  const router = useRouter();
  const [showNotesModal, setShowNotesModal] = useState(false);
  
  // ✅ 員工權限檢查
  const { isStaff, canViewSensitiveData } = useUserRole();
  
  // 判斷市集營業狀態（根據時間判斷）
  const getOperatingStatus = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // ✅ 修復：將時間字串轉換為分鐘數進行比較
    const timeToMinutes = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // ✅ 檢查今天是否為市集日
    let isMarketDay = false;
    
    // 優先檢查 dates 陣列（多選日期）
    if (market.dates && market.dates.length > 0) {
      isMarketDay = market.dates.includes(today);
    } else {
      // 降級：使用 startDate 和 endDate（連續日期，向後兼容）
      isMarketDay = market.startDate <= today && market.endDate >= today;
    }
    
    // 不在市集日期內
    if (!isMarketDay) {
      return { status: 'not_started', label: '尚未開始', color: 'bg-muted-foreground/10 text-muted-foreground' };
    }
    
    // 在市集日期內，檢查時間
    // 如果有提前進場時間且已啟用
    if (market.earlyEntryEnabled && market.earlyEntryTime) {
      const earlyEntryMinutes = timeToMinutes(market.earlyEntryTime);
      const checkInMinutes = market.checkInTime ? timeToMinutes(market.checkInTime) : 570; // 預設 09:30
      
      if (currentMinutes >= earlyEntryMinutes && currentMinutes < checkInMinutes) {
        return { status: 'early_entry', label: '提前進場中', color: 'bg-soft-yellow text-secondary' };
      }
    }
    
    // 報到時間
    if (market.checkInTime && market.operatingStartTime) {
      const checkInMinutes = timeToMinutes(market.checkInTime);
      const operatingStartMinutes = timeToMinutes(market.operatingStartTime);
      
      if (currentMinutes >= checkInMinutes && currentMinutes < operatingStartMinutes) {
        return { status: 'check_in', label: '報到中', color: 'bg-soft-green text-primary' };
      }
    }
    
    // 營業中
    if (market.operatingStartTime && market.operatingEndTime) {
      const operatingStartMinutes = timeToMinutes(market.operatingStartTime);
      const operatingEndMinutes = timeToMinutes(market.operatingEndTime);
      
      if (currentMinutes >= operatingStartMinutes && currentMinutes < operatingEndMinutes) {
        return { status: 'operating', label: '營業中', color: 'bg-primary text-white' };
      }
    }
    
    // 營業結束
    if (market.operatingEndTime) {
      const operatingEndMinutes = timeToMinutes(market.operatingEndTime);
      
      if (currentMinutes >= operatingEndMinutes) {
        return { status: 'closed', label: '已結束', color: 'bg-soft-pink text-muted-foreground' };
      }
    }
    
    // 預設：尚未開始（當天但還沒到時間）
    return { status: 'not_started', label: '尚未開始', color: 'bg-muted-foreground/10 text-muted-foreground' };
  };

  // 計算轉換率（C3.5：優先使用 projection 數值）
  const getConversionRate = () => {
    const interactions = stats?.totalInteractions ?? market.totalInteractions ?? 0;
    const deals = stats?.totalDeals ?? market.totalDeals ?? 0;
    if (!interactions || interactions === 0) return '0.0';
    const rate = (deals / interactions) * 100;
    return rate.toFixed(1);
  };

  // 根據狀態返回對應的樣式
  const getStatusStyle = (status: MarketStatus) => {
    const styles = {
      registered: 'bg-soft-yellow text-foreground',   // 柔黃色 - 已報名
      accepted: 'bg-soft-green text-foreground',     // 柔綠色 - 已錄取
      paid: 'bg-soft-green text-foreground',         // 柔綠色 - 已繳費
      ongoing: 'bg-primary text-white',          // 霧藍色 - 進行中
      completed: 'bg-soft-pink text-foreground',    // 柔粉色 - 已完成
      postponed: 'bg-soft-pink text-foreground',    // 柔粉色 - 已延期
      cancelled: 'bg-soft-pink text-danger',    // 柔粉色 + 紅字 - 已取消
    };
    return styles[status] || styles.registered;
  };

  // 狀態文字映射
  const getStatusText = (status: MarketStatus) => {
    // ✅ 檢查是否已超過舉辦日期
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    let isPastDate = false;
    
    // 優先檢查 dates 陣列（多選日期）
    if (market.dates && market.dates.length > 0) {
      // 檢查所有日期是否都 < 今天
      isPastDate = market.dates.every(date => date < today);
    } else {
      // 降級：使用 endDate（連續日期，向後兼容）
      isPastDate = market.endDate < today;
    }
    
    // ✅ 如果已超過舉辦日期，且狀態為「已繳費」或「如期舉行」，顯示為「已完成」
    if (isPastDate && (status === 'paid' || status === 'ongoing')) {
      return '已完成';
    }
    
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

  // 判斷市集是否即將到來
  const isUpcoming = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (market.status === 'completed' || market.status === 'cancelled') {
      return false;
    }
    
    // 優先檢查 dates 陣列（多選日期）
    if (market.dates && market.dates.length > 0) {
      // 檢查是否有任何日期 >= 今天
      return market.dates.some(date => date >= today);
    }
    
    // 降級：使用 startDate（連續日期，向後兼容）
    return market.startDate >= today;
  };

  // 格式化日期範圍 - 根據 variant 決定顯示邏輯
  const formatDateRange = () => {
    // 首頁：只顯示當週日期
    if (variant === 'home') {
      if (market.dates && market.dates.length > 0) {
        // 多選日期：過濾當週日期
        const weekDates = filterCurrentWeekDates(market.dates);
        if (weekDates.length === 0) {
          // 如果當週沒有日期，顯示最近的日期
          return formatDate(market.dates[0]);
        }
        return formatDateRanges(weekDates);
      } else {
        // 連續日期：顯示完整範圍
        if (market.startDate === market.endDate) {
          return formatDate(market.startDate);
        }
        return `${formatDate(market.startDate)} - ${formatDate(market.endDate)}`;
      }
    }
    
    // 市集頁面和其他：完整顯示所有日期
    if (market.dates && market.dates.length > 0) {
      // 多選日期：完整顯示所有日期範圍
      return formatDateRanges(market.dates);
    } else {
      // 連續日期：顯示 startDate - endDate
      if (market.startDate === market.endDate) {
        return formatDate(market.startDate);
      }
      return `${formatDate(market.startDate)} - ${formatDate(market.endDate)}`;
    }
  };

  // 點擊卡片導向詳情頁
  const handleClick = () => {
    if (!market.id) {
      console.error('Cannot open market detail because market id is missing:', market);
      return;
    }

    router.push(`/markets/${market.id}`);
  };

  // 點擊備註圖示
  const handleNotesClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免觸發卡片點擊
    setShowNotesModal(true);
  };

  const operatingStatus = getOperatingStatus();
  const isOperating = operatingStatus.status === 'operating';
  const hasNotes = market.notes && market.notes.trim().length > 0;

  return (
    <>
      <div
        onClick={handleClick}
        className={`bg-white rounded-[1.5rem] p-5 shadow-lg shadow-primary/10 cursor-pointer hover:shadow-xl transition-all relative ${
          isOperating ? 'ring-4 ring-primary ring-opacity-50' : ''
        }`}
      >
        {/* 備註提醒圖示 - 右上角 */}
        {hasNotes && (
          <button
            onClick={handleNotesClick}
            className="absolute top-4 right-4 bg-soft-yellow hover:bg-[#FFE4A3] text-secondary rounded-full p-2 transition-colors z-10"
            title="查看備註"
          >
            <AlertCircle className="w-5 h-5" />
          </button>
        )}

        {/* 標題與營業狀態標籤 */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1" style={{ paddingRight: hasNotes ? '40px' : '0' }}>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {/* 市集狀態標籤 - 只在市集頁面顯示 */}
              {variant === 'default' && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(market.status)}`}>
                  {getStatusText(market.status)}
                </span>
              )}
              
              <h3 className="font-medium text-lg text-foreground">
                {market.name}
              </h3>
              {/* 營業狀態標籤 - 只在首頁今日市集顯示 */}
              {variant === 'home' && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${operatingStatus.color} flex items-center gap-1`}>
                  {isOperating && <Play className="w-3 h-3" />}
                  {operatingStatus.label}
                </span>
              )}
              
            </div>
          <div className="flex flex-col gap-1">
            {/* 日期 - 根據 variant 決定是否換行 */}
            <p className={`text-sm text-muted-foreground flex items-start gap-1 ${variant === 'default' ? 'flex-wrap' : ''}`}>
              <Calendar className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <span className={variant === 'default' ? 'flex-1' : ''}>
                {formatDateRange()}
              </span>
            </p>

            {/* 地點 */}
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4 text-secondary" />
              {market.location}
            </p>

            {/* 首頁今日市集顯示營業時間 */}
            {variant === 'home' && market.operatingStartTime && market.operatingEndTime && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4 text-primary" />
                {market.operatingStartTime} - {market.operatingEndTime}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 收入與淨利潤 - 只在首頁今日市集和市集頁面顯示，即將到來不顯示 */}
      {/* ✅ 員工模式下完全隱藏敏感數據區塊 */}
      {variant !== 'upcoming' && !isStaff && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-primary/10 rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              收入
              {market.startDate !== market.endDate && (
                <span className="text-[10px] text-primary">(總計)</span>
              )}
            </div>
            <div className="font-bold text-lg text-primary tabular-nums">
              {formatCurrency(stats?.totalRevenue ?? (market.totalRevenue || 0))}
            </div>
          </div>
          
          <div className="bg-soft-green rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              淨利潤
              {market.startDate !== market.endDate && (
                <span className="text-[10px] text-foreground/60">(總計)</span>
              )}
            </div>
            <div className={`font-bold text-lg tabular-nums ${(market.totalProfit || 0) >= 0 ? 'text-foreground' : 'text-danger'}`}>
              {formatCurrency(market.totalProfit || 0)}
            </div>
          </div>
        </div>
      )}

      {/* 成交與費用統計 - 只在首頁今日市集和市集頁面顯示，即將到來不顯示 */}
      {/* ✅ 員工模式下只顯示成交次數，隱藏攤位成本 */}
      {variant !== 'upcoming' && (
        <div className={`grid ${isStaff ? 'grid-cols-1' : 'grid-cols-2'} gap-3 mb-3`}>
          <div className="bg-soft-yellow rounded-xl p-3">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" />
              成交次數
            </div>
            <div className="font-bold text-lg text-secondary tabular-nums">
              {stats?.totalDeals ?? (market.totalDeals || 0)} <span className="text-sm font-normal">筆</span>
            </div>
          </div>
          {!isStaff && (
            <div className="bg-soft-pink rounded-xl p-3">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                攤位成本
              </div>
              <div className="font-bold text-lg text-foreground tabular-nums">
                {formatCurrency(
                  (market.boothCost || 0) +
                  (market.tableFree ? 0 : (market.tableRental || 0)) +
                  (market.chairFree ? 0 : (market.chairRental || 0)) +
                  (market.umbrellaFree ? 0 : (market.umbrellaRental || 0))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 租賃設備 - 所有變體都顯示 */}
      <div className="flex gap-3 text-muted-foreground bg-background rounded-xl p-3">
        <div className="flex items-center gap-1">
          <Table className="w-4 h-4" />
          <span className="text-xs">
            {market.tableFree ? (
              <span className="text-green-600 font-medium">免費</span>
            ) : market.tableRental && market.tableRental > 0 ? (
              formatCurrency(market.tableRental)
            ) : (
              <span className="text-gray-400">自備</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Armchair className="w-4 h-4" />
          <span className="text-xs">
            {market.chairFree ? (
              <span className="text-green-600 font-medium">免費</span>
            ) : market.chairRental && market.chairRental > 0 ? (
              formatCurrency(market.chairRental)
            ) : (
              <span className="text-gray-400">自備</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Umbrella className="w-4 h-4" />
          <span className="text-xs">
            {market.umbrellaFree ? (
              <span className="text-green-600 font-medium">免費</span>
            ) : market.umbrellaRental && market.umbrellaRental > 0 ? (
              formatCurrency(market.umbrellaRental)
            ) : (
              <span className="text-gray-400">自備</span>
            )}
          </span>
        </div>
      </div>

      {/* 轉換率 - 只在市集頁面顯示 */}
      {/*variant === 'default' && (
        <div className="flex justify-center">
          <div className="bg-primary/5 rounded-xl px-4 py-2 inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">轉換率</span>
            <span className="text-sm font-bold text-primary tabular-nums">
              {getConversionRate()}%
            </span>
          </div>
        </div>
      )*/}
    </div>

    {/* 備註彈窗 - 使用 Headless UI Dialog */}
    <Dialog open={showNotesModal} onClose={() => setShowNotesModal(false)} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      {/* 彈窗容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-white rounded-[1.5rem] p-6 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-secondary" />
            <DialogTitle className="text-lg font-medium text-foreground">市集備註</DialogTitle>
          </div>
          
          <div className="bg-soft-yellow rounded-xl p-4 mb-4">
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {market.notes}
            </p>
          </div>
          
          <button
            onClick={() => setShowNotesModal(false)}
            className="w-full bg-primary text-white py-3 rounded-xl hover:bg-primary/85 transition-colors font-medium"
          >
            關閉
          </button>
        </DialogPanel>
      </div>
    </Dialog>
  </>
  );
}
