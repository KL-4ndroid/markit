import { ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3 } from 'lucide-react';
import type { MarketTrendResult, MarketTrendDirection } from '@/lib/analytics/market-trend';

interface MarketTrendCardProps {
  trend: MarketTrendResult;
}

const directionLabels: Record<MarketTrendDirection, string> = {
  improving: '近期變好',
  declining: '近期下滑',
  flat: '大致持平',
  not_enough_data: '資料不足',
};

const directionStyles: Record<MarketTrendDirection, string> = {
  improving: 'bg-soft-green text-foreground',
  declining: 'bg-[#FFF4E5] text-foreground',
  flat: 'bg-cream-lighter text-foreground',
  not_enough_data: 'bg-cream-lighter text-muted-foreground',
};

function getDirectionIcon(direction: MarketTrendDirection) {
  if (direction === 'improving') return ArrowUpRight;
  if (direction === 'declining') return ArrowDownRight;
  return ArrowRight;
}

function formatMoney(value: number): string {
  return Math.round(value).toLocaleString('zh-TW');
}

export function MarketTrendCard({ trend }: MarketTrendCardProps) {
  const DirectionIcon = getDirectionIcon(trend.direction);
  const recentPoints = trend.points.slice(-3).reverse();

  return (
    <section className="bg-white rounded-[1.5rem] p-5 shadow-lg shadow-primary/10 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-medium text-primary mb-1">場次趨勢</p>
          <h2 className="text-xl font-semibold text-foreground">最近市集有變好嗎？</h2>
        </div>
        <div className="w-10 h-10 rounded-full bg-soft-green flex items-center justify-center flex-shrink-0">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${directionStyles[trend.direction]}`}>
          <DirectionIcon className="w-3.5 h-3.5" />
          {directionLabels[trend.direction]}
        </span>
        <span className="text-xs px-3 py-1 rounded-full bg-cream-lighter text-foreground">
          {trend.points.length} 場有收入紀錄
        </span>
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-4">{trend.summary}</p>

      {recentPoints.length > 0 && (
        <div className="space-y-2 mb-4">
          {recentPoints.map((point) => (
            <div key={point.marketId} className="bg-background rounded-xl p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{point.marketName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{point.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">淨利估算</p>
                  <p className={`text-sm font-semibold ${point.netProfit >= 0 ? 'text-foreground' : 'text-[#B45F5F]'}`}>
                    ${formatMoney(point.netProfit)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-muted-foreground">
                <span>營收 ${formatMoney(point.revenue)}</span>
                <span>固定成本 ${formatMoney(point.fixedCost)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-soft-yellow rounded-xl p-4">
        <p className="text-xs font-medium text-foreground mb-1">下一步</p>
        <p className="text-sm text-foreground leading-relaxed">{trend.nextAction}</p>
      </div>
    </section>
  );
}
