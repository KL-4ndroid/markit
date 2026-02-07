'use client';

import { useRouter } from 'next/navigation';
import { Trophy, TrendingUp, Clock, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Market } from '@/types/db';

interface MarketROICardProps {
  market: Market;
  rank: number;
  netProfit: number;
  hourlyProfit: number;
  boothROI: number;
  operatingHours: number;
}

/**
 * 市集 ROI 卡片組件
 * 顯示市集的投資回報率分析
 */
export function MarketROICard({ 
  market, 
  rank, 
  netProfit, 
  hourlyProfit, 
  boothROI,
  operatingHours 
}: MarketROICardProps) {
  const router = useRouter();
  
  // ✅ 獲取攤位成本（用於判斷是否顯示回收率）
  const boothCost = market.boothCost || 0;

  // 點擊卡片跳轉到市集詳情
  const handleClick = () => {
    router.push(`/markets/${market.id}`);
  };

  // 排名顏色
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white';
      case 2:
        return 'bg-gradient-to-br from-[#C0C0C0] to-[#A8A8A8] text-white';
      case 3:
        return 'bg-gradient-to-br from-[#CD7F32] to-[#B8860B] text-white';
      default:
        return 'bg-[#7B9FA6] text-white';
    }
  };

  // 排名圖標
  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className="w-4 h-4" />;
    }
    return <span className="font-bold text-sm">#{rank}</span>;
  };

  // ROI 狀態顏色
  const getROIColor = (roi: number) => {
    if (roi >= 200) return 'text-[#7B9FA6]'; // 優秀
    if (roi >= 100) return 'text-[#D4A574]'; // 良好
    if (roi >= 50) return 'text-[#3A3A3A]'; // 普通
    return 'text-[#d4183d]'; // 需改善
  };

  // 利潤狀態顏色
  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-[#7B9FA6]';
    if (profit === 0) return 'text-[#6B6B6B]';
    return 'text-[#d4183d]';
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-[#FAFAF8] rounded-xl p-3 hover:bg-[#F0F0EE] transition-all cursor-pointer border border-[#7B9FA6]/10 hover:border-[#7B9FA6]/30"
    >
      {/* Header: 排名徽章 + 市集名稱（橫向，左對齊） */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`${getRankColor(rank)} ${rank === 1 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full flex items-center justify-center shadow-md flex-shrink-0`}>
          {getRankIcon(rank)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${rank === 1 ? 'text-base' : 'text-sm'} text-[#3A3A3A] truncate`}>
            {market.name}
          </h3>
          <p className="text-xs text-[#6B6B6B] truncate">
            {market.location}
          </p>
        </div>
      </div>

      {/* 關鍵指標（橫向排列，置中） */}
      <div className="grid grid-cols-3 gap-2">
        {/* 淨利潤 */}
        <div className="bg-white rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-3 h-3 text-[#7B9FA6]" />
            <span className="text-[10px] text-[#6B6B6B]">淨利</span>
          </div>
          <div className={`text-xs font-bold tabular-nums text-center ${getProfitColor(netProfit)}`}>
            {formatCurrency(Math.round(netProfit))}
          </div>
        </div>

        {/* 每小時淨利 */}
        <div className="bg-white rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-[#D4A574]" />
            <span className="text-[10px] text-[#6B6B6B]">時薪</span>
          </div>
          <div className={`text-xs font-bold tabular-nums text-center ${getProfitColor(hourlyProfit)}`}>
            {formatCurrency(Math.round(hourlyProfit))}
          </div>
        </div>

        {/* 攤位費回收率 */}
        <div className="bg-white rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-[#D4A574]" />
            <span className="text-[10px] text-[#6B6B6B]">回收率</span>
          </div>
          {boothCost > 0 ? (
            <div className={`text-xs font-bold tabular-nums text-center ${getROIColor(boothROI)}`}>
              {Math.round(boothROI)}%
            </div>
          ) : (
            <div className="text-[10px] text-[#6B6B6B] font-medium text-center">
              不適用
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
