import { MapPin, Calendar, Timer, TrendingUp, Target, CreditCard, Trophy, Medal } from 'lucide-react';
import { Market } from '@/types/db';
import { MarketHealthScore } from '@/lib/analytics';

interface MarketHealthScoreCardProps {
  market: Market;
  score: MarketHealthScore;
  rank: number;
}

/**
 * 市集健康評分卡片
 * 顯示市集的綜合評分（0-100 分）和評級
 */
export function MarketHealthScoreCard({ market, score, rank }: MarketHealthScoreCardProps) {
  // 排名徽章
  const RankIcon = rank === 1 ? Trophy : Medal;
  const rankColor = rank === 1 ? 'text-amber-500' : rank === 2 ? 'text-slate-400' : 'text-amber-700';
  
  // 評級顏色
  const gradeColors = {
    'S': 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white',
    'A': 'bg-gradient-to-r from-primary to-[#5A8A91] text-white',
    'B': 'bg-gradient-to-r from-secondary to-[#C89563] text-white',
    'C': 'bg-gradient-to-r from-[#E8E8E8] to-[#D0D0D0] text-foreground',
    'D': 'bg-gradient-to-r from-soft-pink to-soft-pink/80 text-muted-foreground',
  };

  // 評級文字
  const gradeText = {
    'S': '卓越',
    'A': '優秀',
    'B': '良好',
    'C': '普通',
    'D': '待改善',
  };

  // 分數顏色（根據分數範圍）
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#FFD700]';
    if (score >= 70) return 'text-primary';
    if (score >= 50) return 'text-secondary';
    if (score >= 30) return 'text-muted-foreground';
    return 'text-secondary';
  };

  // 格式化日期顯示
  const formatDate = (market: Market) => {
    if (market.dates && market.dates.length > 0) {
      if (market.dates.length === 1) {
        return market.dates[0];
      }
      return `${market.dates[0]} 等 ${market.dates.length} 天`;
    }
    return market.startDate === market.endDate 
      ? market.startDate 
      : `${market.startDate} ~ ${market.endDate}`;
  };

  return (
    <div className="bg-gradient-to-br from-white to-background rounded-2xl p-5 border-2 border-primary/20 hover:border-primary/40 transition-all shadow-md hover:shadow-lg">
      {/* 頂部：排名 + 市集名稱 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <RankIcon className={`w-6 h-6 shrink-0 ${rankColor}`} strokeWidth={1.75} fill="currentColor" />
            <h3 className="font-medium text-foreground text-lg">{market.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              {market.location}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
              {formatDate(market)}
            </span>
          </div>
        </div>
        
        {/* 評級徽章 */}
        <div className={`px-4 py-2 rounded-xl font-bold text-sm ${gradeColors[score.grade]}`}>
          {score.grade} 級
        </div>
      </div>

      {/* 中間：綜合評分 */}
      <div className="bg-white rounded-xl p-4 mb-4 border border-primary/10">
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">綜合健康評分</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-4xl font-bold ${getScoreColor(score.healthScore)}`}>
              {score.healthScore.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground">分</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{gradeText[score.grade]}</p>
        </div>
      </div>

      {/* 底部：四個核心指標 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 每小時淨利 */}
        <div className="bg-soft-green rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
            <Timer className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            每小時淨利
          </p>
          <p className="text-lg font-semibold text-foreground">
            ${score.metrics.hourlyProfit.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Z: {score.zScores.hourlyProfitZ.toFixed(2)}
          </p>
        </div>

        {/* 攤位費回收率 */}
        <div className="bg-soft-yellow rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            回收率
          </p>
          <p className="text-lg font-semibold text-foreground">
            {score.metrics.boothROI.toFixed(0)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Z: {score.zScores.boothROIZ.toFixed(2)}
          </p>
        </div>

        {/* 轉換率 */}
        <div className="bg-soft-pink rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
            <Target className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            轉換率
          </p>
          <p className="text-lg font-semibold text-foreground">
            {score.metrics.conversionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Z: {score.zScores.conversionRateZ.toFixed(2)}
          </p>
        </div>

        {/* 客單價 */}
        <div className="bg-cat-clothing rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-1 inline-flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
            客單價
          </p>
          <p className="text-lg font-semibold text-foreground">
            ${score.metrics.aov.toFixed(0)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Z: {score.zScores.aovZ.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 權重說明 */}
      <div className="mt-3 pt-3 border-t border-primary/10">
        <p className="text-xs text-muted-foreground text-center">
          權重：每小時淨利 40% • 回收率 20% • 轉換率 20% • 客單價 20%
        </p>
      </div>
    </div>
  );
}
