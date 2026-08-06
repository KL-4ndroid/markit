'use client';

import { useMemo } from 'react';

import { MarketHealthScoreCard } from '@/components/analytics/MarketHealthScoreCard';
import { QuadrantGrid } from '@/components/analytics/QuadrantGrid';
import { UnlockGuard } from '@/components/analytics/UnlockGuard';
import { StateView } from '@/components/ui/StateView';
import {
  composeAdvancedMarketMetricsViewModel,
  type MarketMetricsViewModel,
} from '@/lib/analytics/market-metrics-view-model';

interface AdvancedAnalyticsSectionProps {
  viewModel: MarketMetricsViewModel;
  validMarketCount: number;
}

export function AdvancedAnalyticsSection({
  viewModel,
  validMarketCount,
}: AdvancedAnalyticsSectionProps) {
  const advanced = useMemo(
    () => composeAdvancedMarketMetricsViewModel(viewModel),
    [viewModel],
  );
  const sortedHealthScores = useMemo(
    () => [...advanced.healthScores].sort((left, right) => right.healthScore - left.healthScore),
    [advanced.healthScores],
  );

  if (viewModel.items.length === 0) {
    return <StateView title="尚無進階分析資料" description="至少完成一場有營運紀錄的市集後再查看。" />;
  }

  return (
    <div className="space-y-6">
      <UnlockGuard currentCount={validMarketCount} requiredCount={3} featureName="綜合評分">
        <section className="rounded-card border border-primary/10 bg-white p-4" aria-labelledby="health-ranking-title">
          <div className="mb-4">
            <p className="text-xs font-medium text-primary">多指標比較</p>
            <h2 id="health-ranking-title" className="mt-1 text-base font-semibold text-foreground">市集綜合評分</h2>
          </div>
          <div className="space-y-3">
            {sortedHealthScores.slice(0, 3).map((score, index) => {
              const market = viewModel.items.find(item => item.marketId === score.marketId)?.market;
              if (!market) return null;
              return (
                <MarketHealthScoreCard
                  key={score.marketId}
                  market={market}
                  score={score}
                  rank={index + 1}
                />
              );
            })}
          </div>
        </section>
      </UnlockGuard>

      <UnlockGuard currentCount={validMarketCount} requiredCount={8} featureName="市集象限">
        <QuadrantGrid
          stars={advanced.quadrants.stars}
          potentials={advanced.quadrants.potentials}
          precisies={advanced.quadrants.precisies}
          observables={advanced.quadrants.observables}
          averages={advanced.quadrants.averages}
          isEmpty={advanced.quadrants.isEmpty}
        />
      </UnlockGuard>
    </div>
  );
}
