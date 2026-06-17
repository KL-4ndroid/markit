/**
 * 市集象限網格組件
 * 
 * 將市集分類到四個象限：
 * - 明星市集（Stars）：高互動 + 高轉換率
 * - 潛力市集（Potentials）：高互動 + 低轉換率
 * - 精準市集（Precisies）：低互動 + 高轉換率
 * - 觀察市集（Observables）：低互動 + 低轉換率
 */

'use client';

import { useRouter } from 'next/navigation';
import type { Market } from '@/types/db';
import { TrendingUp, Target, Eye, Sparkles, Calendar, Lightbulb } from 'lucide-react';
import { MetricGuide } from './MetricGuide';

interface QuadrantGridProps {
  stars: Market[];
  potentials: Market[];
  precisies: Market[];
  observables: Market[];
  averages: {
    avgInteractions: number;
    avgConversionRate: number;
  };
  isEmpty?: boolean;
}

export function QuadrantGrid({
  stars,
  potentials,
  precisies,
  observables,
  averages,
  isEmpty = false,
}: QuadrantGridProps) {
  const router = useRouter();

  // 格式化日期顯示
  const formatMarketDate = (market: Market) => {
    if (market.dates && market.dates.length > 0) {
      if (market.dates.length === 1) {
        return market.dates[0];
      }
      return `${market.dates[0]} 等 ${market.dates.length} 天`;
    }
    if (market.startDate === market.endDate) {
      return market.startDate;
    }
    return `${market.startDate} ~ ${market.endDate}`;
  };

  // ✅ 若無互動數據，顯示溫馨提示
  if (isEmpty) {
    return (
      <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
        {/* 標題 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-xl font-medium text-foreground">
              市集象限分析
            </h2>
            <MetricGuide
              title="市集象限分析"
              content="透過「互動熱度」與「成交轉化」兩個維度將市集分類，幫助您快速識別不同類型的市集表現。"
              value="幫您辨識哪些是「明星市集」（值得深耕），哪些是「潛力市集」（需調整話術或商品展示），讓您的參展策略更精準。"
              icon={<Target className="w-6 h-6 text-primary" strokeWidth={1.75} />}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            根據互動數與轉換率分類市集表現
          </p>
        </div>

        {/* 溫馨提示區塊 */}
        <div className="text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-primary/40" />
          </div>
          
          <h3 className="text-lg font-medium text-foreground mb-2 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1.75} />
            開始記錄互動數據
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto leading-relaxed">
            記錄您的市集互動（詢問、試吃、摸摸），即可解鎖明星市集分析！
          </p>

          {/* 引導步驟 */}
          <div className="bg-soft-yellow rounded-xl p-4 max-w-md mx-auto">
            <div className="flex items-start gap-3 text-left">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  如何開始？
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  在市集營業時，使用互動按鈕記錄每次顧客詢問或試用。累積足夠數據後，系統會自動分析哪些市集最值得再次參加。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // 渲染市集列表（最多顯示前2名）
  const renderMarkets = (markets: Market[], maxCount: number = 2) => {
    if (markets.length === 0) {
      return (
        <p className="text-xs text-muted-foreground italic">暫無數據</p>
      );
    }

    return (
      <div className="space-y-1.5">
        {markets.slice(0, maxCount).map((market, index) => (
          <div
            key={market.id}
            onClick={() => router.push(`/markets/${market.id}`)}
            className="text-xs text-foreground bg-white/50 hover:bg-white rounded-lg px-2 py-1.5 cursor-pointer transition-colors"
          >
            <div className="font-medium line-clamp-1">
              {index + 1}. {market.name}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3 shrink-0" strokeWidth={1.75} />
              <span>{formatMarketDate(market)}</span>
            </div>
          </div>
        ))}
        {markets.length > maxCount && (
          <p className="text-xs text-muted-foreground italic">
            +{markets.length - maxCount} 個市集
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
      {/* 標題 */}
      <div className="mb-5">
        <h2 className="text-xl font-medium text-foreground mb-2">
          市集象限分析
        </h2>
        <p className="text-xs text-muted-foreground">
          根據互動數與轉換率分類市集表現
        </p>
      </div>

      {/* 平均值顯示 */}
      <div className="bg-primary/5 rounded-xl p-3 mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">平均互動數</p>
          <p className="text-base font-medium text-foreground tabular-nums">
            {averages.avgInteractions.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">平均轉換率</p>
          <p className="text-base font-medium text-foreground tabular-nums">
            {(averages.avgConversionRate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 2x2 象限網格 */}
      <div className="grid grid-cols-2 gap-3">
        {/* 左上：潛力市集（高互動、低轉換） */}
        <div className="bg-soft-pink rounded-[1.25rem] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/60 p-1.5 rounded-lg">
              <TrendingUp className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">潛力市集</h3>
              <p className="text-xs text-muted-foreground">高互動低轉換</p>
            </div>
          </div>
          {renderMarkets(potentials)}
        </div>

        {/* 右上：明星市集（高互動、高轉換） */}
        <div className="bg-soft-green rounded-[1.25rem] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/60 p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">明星市集</h3>
              <p className="text-xs text-muted-foreground">高互動高轉換</p>
            </div>
          </div>
          {renderMarkets(stars)}
        </div>

        {/* 左下：觀察市集（低互動、低轉換） */}
        <div className="bg-background rounded-[1.25rem] p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white p-1.5 rounded-lg">
              <Eye className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">觀察市集</h3>
              <p className="text-xs text-muted-foreground">低互動低轉換</p>
            </div>
          </div>
          {renderMarkets(observables)}
        </div>

        {/* 右下：精準市集（低互動、高轉換） */}
        <div className="bg-soft-yellow rounded-[1.25rem] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-white/60 p-1.5 rounded-lg">
              <Target className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">精準市集</h3>
              <p className="text-xs text-muted-foreground">低互動高轉換</p>
            </div>
          </div>
          {renderMarkets(precisies)}
        </div>
      </div>

      {/* 說明文字 */}
      <div className="mt-4 bg-primary/5 rounded-xl p-3">
        <p className="text-xs text-muted-foreground leading-relaxed flex items-start gap-2">
          <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-primary" strokeWidth={1.75} />
          <span>
            <span className="font-medium text-foreground">象限解讀：</span>
            明星市集值得重複參加；潛力市集需優化成交技巧；精準市集客群明確；觀察市集需評估是否繼續參加。
          </span>
        </p>
      </div>
    </div>
  );
}
