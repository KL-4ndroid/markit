'use client';

import { useRouter } from 'next/navigation';
import { Calendar, MapPin, DollarSign, Table, Armchair, Umbrella, Target, Users, TrendingUp } from 'lucide-react';
import type { Market, MarketStatus } from '@/types/db';
import { formatDate, formatCurrency } from '@/lib/utils';

interface MarketCardProps {
  market: Market;
  variant?: 'default' | 'home'; // 新增 variant 屬性
}

/**
 * 市集卡片組件
 * 
 * 顯示市集的基本資訊，包含名稱、日期、地點、狀態等
 * 使用日系設計系統的大圓角與柔和色彩
 * 
 * @param variant - 'default': 完整版（市集頁面）, 'home': 簡化版（首頁）
 */
export function MarketCard({ market, variant = 'default' }: MarketCardProps) {
  const router = useRouter();
  
  // 判斷是否為當日營業中的市集
  const isOperatingToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return market.startDate === today && market.status === 'ongoing' && market.operationPhase === 'operating';
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

  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-[1.5rem] p-5 shadow-lg shadow-[#7B9FA6]/10 cursor-pointer hover:shadow-xl transition-all ${
        isOperatingToday() ? 'ring-4 ring-[#7B9FA6] ring-opacity-50' : ''
      }`}
    >
      {/* 標題與基本資訊 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-lg mb-1 text-[#3A3A3A]">
            {market.name}
          </h3>
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
          </div>
        </div>
      </div>

      {/* 收入與淨利潤 */}
      {variant === 'default' && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-[#7B9FA6]/10 rounded-xl p-3">
            <div className="text-xs text-[#6B6B6B] mb-1">收入</div>
            <div className="font-medium text-[#7B9FA6]">
              {formatCurrency(market.totalRevenue || 0)}
            </div>
          </div>
          <div className="bg-[#E8F3E8] rounded-xl p-3">
            <div className="text-xs text-[#6B6B6B] mb-1">淨利潤</div>
            <div className={`font-medium ${(market.totalProfit || 0) >= 0 ? 'text-[#3A3A3A]' : 'text-[#d4183d]'}`}>
              {formatCurrency(market.totalProfit || 0)}
            </div>
          </div>
        </div>
      )}

      {/* 租賃設備 */}
      <div className="flex gap-3 mb-3 text-[#6B6B6B]">
        <div className="flex items-center gap-1">
          <Table className="w-4 h-4" />
          <span className="text-xs">
            {market.tableFree ? (
              <span className="text-green-600 font-medium">(免費)</span>
            ) : market.tableRental && market.tableRental > 0 ? (
              formatCurrency(market.tableRental)
            ) : (
              <span className="text-gray-400">(自備)</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Armchair className="w-4 h-4" />
          <span className="text-xs">
            {market.chairFree ? (
              <span className="text-green-600 font-medium">(免費)</span>
            ) : market.chairRental && market.chairRental > 0 ? (
              formatCurrency(market.chairRental)
            ) : (
              <span className="text-gray-400">(自備)</span>
            )}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Umbrella className="w-4 h-4" />
          <span className="text-xs">
            {market.umbrellaFree ? (
              <span className="text-green-600 font-medium">(免費)</span>
            ) : market.umbrellaRental && market.umbrellaRental > 0 ? (
              formatCurrency(market.umbrellaRental)
            ) : (
              <span className="text-gray-400">(自備)</span>
            )}
          </span>
        </div>
      </div>

      {/* 統計資訊 */}
      {variant === 'default' && (
        <div className="flex justify-between text-sm text-[#6B6B6B]">
          <span className="flex items-center gap-1">
            <Target className="w-4 h-4" />
            成交 {market.totalDeals || 0} 筆
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            互動 {market.totalInteractions || 0} 次
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {getConversionRate()}%
          </span>
        </div>
      )}
    </div>
  );
}
