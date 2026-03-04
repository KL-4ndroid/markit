import { Market } from '@/types/db';
import { MarketHealthScore } from '@/lib/analytics-utils';

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
  const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
  
  // 評級顏色
  const gradeColors = {
    'S': 'bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-white',
    'A': 'bg-gradient-to-r from-[#7B9FA6] to-[#5A8A91] text-white',
    'B': 'bg-gradient-to-r from-[#D4A574] to-[#C89563] text-white',
    'C': 'bg-gradient-to-r from-[#E8E8E8] to-[#D0D0D0] text-[#3A3A3A]',
    'D': 'bg-gradient-to-r from-[#F5E6E8] to-[#E8D5D8] text-[#6B6B6B]',
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
    if (score >= 70) return 'text-[#7B9FA6]';
    if (score >= 50) return 'text-[#D4A574]';
    if (score >= 30) return 'text-[#6B6B6B]';
    return 'text-[#D4A574]';
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
    <div className="bg-gradient-to-br from-white to-[#FAFAF8] rounded-2xl p-5 border-2 border-[#7B9FA6]/20 hover:border-[#7B9FA6]/40 transition-all shadow-md hover:shadow-lg">
      {/* 頂部：排名 + 市集名稱 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{rankBadge}</span>
            <h3 className="font-medium text-[#3A3A3A] text-lg">{market.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#6B6B6B]">
            <span>📍 {market.location}</span>
            <span>•</span>
            <span>📅 {formatDate(market)}</span>
          </div>
        </div>
        
        {/* 評級徽章 */}
        <div className={`px-4 py-2 rounded-xl font-bold text-sm ${gradeColors[score.grade]}`}>
          {score.grade} 級
        </div>
      </div>

      {/* 中間：綜合評分 */}
      <div className="bg-white rounded-xl p-4 mb-4 border border-[#7B9FA6]/10">
        <div className="text-center">
          <p className="text-xs text-[#6B6B6B] mb-1">綜合健康評分</p>
          <div className="flex items-baseline justify-center gap-1">
            <span className={`text-4xl font-bold ${getScoreColor(score.healthScore)}`}>
              {score.healthScore.toFixed(1)}
            </span>
            <span className="text-lg text-[#6B6B6B]">分</span>
          </div>
          <p className="text-xs text-[#6B6B6B] mt-1">{gradeText[score.grade]}</p>
        </div>
      </div>

      {/* 底部：四個核心指標 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 每小時淨利 */}
        <div className="bg-[#E8F3E8] rounded-xl p-3">
          <p className="text-xs text-[#6B6B6B] mb-1">⏱️ 每小時淨利</p>
          <p className="text-lg font-semibold text-[#3A3A3A]">
            ${score.metrics.hourlyProfit.toFixed(0)}
          </p>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Z: {score.zScores.hourlyProfitZ.toFixed(2)}
          </p>
        </div>

        {/* 攤位費回收率 */}
        <div className="bg-[#FFF8E7] rounded-xl p-3">
          <p className="text-xs text-[#6B6B6B] mb-1">📈 回收率</p>
          <p className="text-lg font-semibold text-[#3A3A3A]">
            {score.metrics.boothROI.toFixed(0)}%
          </p>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Z: {score.zScores.boothROIZ.toFixed(2)}
          </p>
        </div>

        {/* 轉換率 */}
        <div className="bg-[#F5E6E8] rounded-xl p-3">
          <p className="text-xs text-[#6B6B6B] mb-1">🎯 轉換率</p>
          <p className="text-lg font-semibold text-[#3A3A3A]">
            {score.metrics.conversionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Z: {score.zScores.conversionRateZ.toFixed(2)}
          </p>
        </div>

        {/* 客單價 */}
        <div className="bg-[#E8F0F8] rounded-xl p-3">
          <p className="text-xs text-[#6B6B6B] mb-1">💳 客單價</p>
          <p className="text-lg font-semibold text-[#3A3A3A]">
            ${score.metrics.aov.toFixed(0)}
          </p>
          <p className="text-xs text-[#6B6B6B] mt-1">
            Z: {score.zScores.aovZ.toFixed(2)}
          </p>
        </div>
      </div>

      {/* 權重說明 */}
      <div className="mt-3 pt-3 border-t border-[#7B9FA6]/10">
        <p className="text-xs text-[#6B6B6B] text-center">
          權重：每小時淨利 40% • 回收率 20% • 轉換率 20% • 客單價 20%
        </p>
      </div>
    </div>
  );
}
