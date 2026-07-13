'use client';

import { useRouter } from 'next/navigation';
import { Trophy, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Market } from '@/types/db';

interface MarketAOVCardProps {
  market: Market;
  rank: number;
  averageOrderValue: number;
  totalRevenue: number;
  totalDeals: number;
}

/**
 * 市集客單價卡片組件
 * 顯示市集的平均客單價分析
 */
export function MarketAOVCard({ 
  market, 
  rank, 
  averageOrderValue,
  totalRevenue,
  totalDeals
}: MarketAOVCardProps) {
  const router = useRouter();

  // 點擊卡片跳轉到市集詳情
  const handleClick = () => {
    router.push(`/markets/${market.id}`);
  };

  // 排名顏色
  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-gold to-gold-warm text-white';
      case 2:
        return 'bg-gradient-to-br from-[#C0C0C0] to-[#A8A8A8] text-white';
      case 3:
        return 'bg-gradient-to-br from-[#CD7F32] to-[#B8860B] text-white';
      default:
        return 'bg-primary text-white';
    }
  };

  // 排名圖標
  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className="w-4 h-4" />;
    }
    return <span className="font-bold text-sm">#{rank}</span>;
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-background rounded-xl p-3 hover:bg-[#F0F0EE] transition-all cursor-pointer border border-primary/10 hover:border-primary/30"
    >
      {/* Header: 排名徽章 + 市集名稱（橫向，左對齊） */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`${getRankColor(rank)} ${rank === 1 ? 'w-12 h-12' : 'w-10 h-10'} rounded-full flex items-center justify-center shadow-md flex-shrink-0`}>
          {getRankIcon(rank)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-medium ${rank === 1 ? 'text-base' : 'text-sm'} text-foreground truncate`}>
            {market.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{market.location}</span>
            <span className="text-primary">•</span>
            <span className="flex-shrink-0">
              {market.dates && market.dates.length > 0 
                ? market.dates.length === 1 
                  ? market.dates[0]
                  : `${market.dates[0]} 等 ${market.dates.length} 天`
                : market.startDate === market.endDate
                  ? market.startDate
                  : `${market.startDate} ~ ${market.endDate}`
              }
            </span>
          </div>
        </div>
      </div>

      {/* 關鍵指標（橫向排列，置中） */}
      <div className="grid grid-cols-3 gap-2">
        {/* 客單價 */}
        <div className="bg-white rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <DollarSign className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground">客單價</span>
          </div>
          <div className="text-xs font-bold tabular-nums text-center text-primary">
            {formatCurrency(Math.round(averageOrderValue))}
          </div>
        </div>

        {/* 總收入 */}
        <div className="bg-white rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-secondary" />
            <span className="text-[10px] text-muted-foreground">總收入</span>
          </div>
          <div className="text-xs font-bold tabular-nums text-center text-foreground">
            {formatCurrency(Math.round(totalRevenue))}
          </div>
        </div>

        {/* 成交數 */}
        <div className="bg-white rounded-lg p-2">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ShoppingCart className="w-3 h-3 text-secondary" />
            <span className="text-[10px] text-muted-foreground">成交數</span>
          </div>
          <div className="text-xs font-bold tabular-nums text-center text-foreground">
            {totalDeals}
          </div>
        </div>
      </div>
    </div>
  );
}
