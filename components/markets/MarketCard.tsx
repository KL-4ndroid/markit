'use client';

import { useRouter } from 'next/navigation';
import { Calendar, MapPin, DollarSign, Table, Armchair, Umbrella, Target, Users, TrendingUp, Clock, Play } from 'lucide-react';
import type { Market, MarketStatus } from '@/types/db';
import { formatDate, formatCurrency } from '@/lib/utils';

interface MarketCardProps {
  market: Market;
  variant?: 'default' | 'home' | 'upcoming'; // 新增 upcoming 變體
}

/**
 * 市集卡片組件
 * 
 * 顯示市集的基本資訊，包含名稱、日期、地點、狀態等
 * 使用日系設計系統的大圓角與柔和色彩
 * 
 * @param variant - 'default': 完整版（市集頁面）, 'home': 首頁今日市集（顯示完整資訊）, 'upcoming': 即將到來（隱藏收入/利潤/互動/成交）
 */
export function MarketCard({ market, variant = 'default' }: MarketCardProps) {
  const router = useRouter();
  
  // 判斷市集營業狀態（根據時間判斷）
  const getOperatingStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // 不在日期範圍內
    if (market.startDate > today || market.endDate < today) {
      return { status: 'not_started', label: '尚未開始', color: 'bg-[#6B6B6B]/10 text-[#6B6B6B]' };
    }
    
    // 在日期範圍內，檢查時間
    if (market.startDate <= today && market.endDate >= today) {
      // 如果有提前進場時間且已啟用
      if (market.earlyEntryEnabled && market.earlyEntryTime && currentTime >= market.earlyEntryTime && currentTime < (market.checkInTime || '09:30')) {
        return { status: 'early_entry', label: '提前進場中', color: 'bg-[#FFF8E7] text-[#D4A574]' };
      }
      
      // 報到時間
      if (market.checkInTime && currentTime >= market.checkInTime && currentTime < (market.operatingStartTime || '10:00')) {
        return { status: 'check_in', label: '報到中', color: 'bg-[#E8F3E8] text-[#7B9FA6]' };
      }
      
      // 營業中
      if (market.operatingStartTime && market.operatingEndTime && currentTime >= market.operatingStartTime && currentTime < market.operatingEndTime) {
        return { status: 'operating', label: '營業中', color: 'bg-[#7B9FA6] text-white' };
      }
      
      // 營業結束
      if (market.operatingEndTime && currentTime >= market.operatingEndTime) {
        return { status: 'closed', label: '已結束', color: 'bg-[#F5E6E8] text-[#6B6B6B]' };
      }
      
      // 預設：尚未開始（當天但還沒到時間）
      return { status: 'not_started', label: '尚未開始', color: 'bg-[#6B6B6B]/10 text-[#6B6B6B]' };
    }
    
    return { status: 'not_started', label: '尚未開始', color: 'bg-[#6B6B6B]/10 text-[#6B6B6B]' };
  };

  // 計算轉換率
  const getConversionRate = () => {
    if (!market.totalInteractions || market.totalInteractions === 0) return '0.0';
    const rate = ((market.totalDeals || 0) / market.totalInteractions) * 100;
    return rate.toFixed(1);
  };

  // 根據狀態返回對應的樣式
  const getStatusStyle = (status: MarketStatus) => {
    const styles = {
      registered: 'bg-[#FFF8E7] text-[#3A3A3A]',   // 柔黃色 - 已報名
      accepted: 'bg-[#E8F3E8] text-[#3A3A3A]',     // 柔綠色 - 已錄取
      paid: 'bg-[#E8F3E8] text-[#3A3A3A]',         // 柔綠色 - 已繳費
      ongoing: 'bg-[#7B9FA6] text-white',          // 霧藍色 - 進行中
      completed: 'bg-[#F5E6E8] text-[#3A3A3A]',    // 柔粉色 - 已完成
      postponed: 'bg-[#F5E6E8] text-[#3A3A3A]',    // 柔粉色 - 已延期
      cancelled: 'bg-[#F5E6E8] text-[#d4183d]',    // 柔粉色 + 紅字 - 已取消
    };
    return styles[status] || styles.registered;
  };

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

  // 判斷市集是否即將到來
  const isUpcoming = () => {
    const today = new Date().toISOString().split('T')[0];
    return market.startDate >= today && market.status !== 'completed' && market.status !== 'cancelled';
  };

  // 格式化日期範圍
  const formatDateRange = () => {
    if (market.startDate === market.endDate) {
      return formatDate(market.startDate);
    }
    return `${formatDate(market.startDate)} - ${formatDate(market.endDate)}`;
  };

  // 點擊卡片導向詳情頁
  const handleClick = () => {
    router.push(`/markets/${market.id}`);
  };

  const operatingStatus = getOperatingStatus();
  const isOperating = operatingStatus.status === 'operating';

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-[1.5rem] p-5 shadow-lg shadow-[#7B9FA6]/10 cursor-pointer hover:shadow-xl transition-all ${
        isOperating ? 'ring-4 ring-[#7B9FA6] ring-opacity-50' : ''
      }`}
    >
      {/* 標題與營業狀態標籤 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {/* 市集狀態標籤 - 只在市集頁面顯示 */}
            {variant === 'default' && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusStyle(market.status)}`}>
                {getStatusText(market.status)}
              </span>
            )}
            <h3 className="font-medium text-lg text-[#3A3A3A]">
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
            {/* 日期 */}
            <p className="text-sm text-[#6B6B6B] flex items-center gap-1">
              <Calendar className="w-4 h-4 text-[#7B9FA6]" />
              {variant === 'home' ? (
                // 首頁：顯示完整日期範圍
                <>
                  {(() => {
                    const startDate = new Date(market.startDate);
                    const endDate = new Date(market.endDate);
                    const startYear = startDate.getFullYear();
                    const startMonth = startDate.getMonth() + 1;
                    const startDay = startDate.getDate();
                    const endMonth = endDate.getMonth() + 1;
                    const endDay = endDate.getDate();
                    
                    if (market.startDate === market.endDate) {
                      const weekday = ['日', '一', '二', '三', '四', '五', '六'][startDate.getDay()];
                      return `${startYear}/${String(startMonth).padStart(2, '0')}/${String(startDay).padStart(2, '0')} (${weekday})`;
                    }
                    
                    if (startMonth === endMonth) {
                      return `${startYear}/${String(startMonth).padStart(2, '0')}/${String(startDay).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
                    } else {
                      return `${startYear}/${String(startMonth).padStart(2, '0')}/${String(startDay).padStart(2, '0')}-${String(endMonth).padStart(2, '0')}/${String(endDay).padStart(2, '0')}`;
                    }
                  })()}
                </>
              ) : (
                formatDateRange()
              )}
            </p>

            {/* 地點 */}
            <p className="text-sm text-[#6B6B6B] flex items-center gap-1">
              <MapPin className="w-4 h-4 text-[#D4A574]" />
              {market.location}
            </p>

            {/* 首頁今日市集顯示營業時間 */}
            {variant === 'home' && market.operatingStartTime && market.operatingEndTime && (
              <p className="text-sm text-[#6B6B6B] flex items-center gap-1">
                <Clock className="w-4 h-4 text-[#7B9FA6]" />
                {market.operatingStartTime} - {market.operatingEndTime}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 收入與淨利潤 - 只在首頁今日市集和市集頁面顯示，即將到來不顯示 */}
      {variant !== 'upcoming' && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#7B9FA6]/10 rounded-xl p-3">
            <div className="text-xs text-[#6B6B6B] mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              收入
              {market.startDate !== market.endDate && (
                <span className="text-[10px] text-[#7B9FA6]">(總計)</span>
              )}
            </div>
            <div className="font-bold text-lg text-[#7B9FA6] tabular-nums">
              {formatCurrency(market.totalRevenue || 0)}
            </div>
          </div>
          <div className="bg-[#E8F3E8] rounded-xl p-3">
            <div className="text-xs text-[#6B6B6B] mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              淨利潤
              {market.startDate !== market.endDate && (
                <span className="text-[10px] text-[#3A3A3A]/60">(總計)</span>
              )}
            </div>
            <div className={`font-bold text-lg tabular-nums ${(market.totalProfit || 0) >= 0 ? 'text-[#3A3A3A]' : 'text-[#d4183d]'}`}>
              {formatCurrency(market.totalProfit || 0)}
            </div>
          </div>
        </div>
      )}

      {/* 成交與互動統計 - 只在首頁今日市集和市集頁面顯示，即將到來不顯示 */}
      {variant !== 'upcoming' && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#FFF8E7] rounded-xl p-3">
            <div className="text-xs text-[#6B6B6B] mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" />
              成交次數
            </div>
            <div className="font-bold text-lg text-[#D4A574] tabular-nums">
              {market.totalDeals || 0} <span className="text-sm font-normal">筆</span>
            </div>
          </div>
          <div className="bg-[#F5E6E8] rounded-xl p-3">
            <div className="text-xs text-[#6B6B6B] mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              互動次數
            </div>
            <div className="font-bold text-lg text-[#3A3A3A] tabular-nums">
              {market.totalInteractions || 0} <span className="text-sm font-normal">次</span>
            </div>
          </div>
        </div>
      )}

      {/* 租賃設備 - 所有變體都顯示 */}
      <div className="flex gap-3 text-[#6B6B6B] bg-[#FAFAF8] rounded-xl p-3">
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
          <div className="bg-[#7B9FA6]/5 rounded-xl px-4 py-2 inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#7B9FA6]" />
            <span className="text-sm text-[#6B6B6B]">轉換率</span>
            <span className="text-sm font-bold text-[#7B9FA6] tabular-nums">
              {getConversionRate()}%
            </span>
          </div>
        </div>
      )*/}
    </div>
  );
}
