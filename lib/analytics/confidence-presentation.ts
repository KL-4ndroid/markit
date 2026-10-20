import type { AnalyticsDataCompletenessResult } from './data-completeness';

export type AnalyticsPresentationConfidence =
  | 'insufficient'
  | 'emerging'
  | 'usable'
  | 'strong';

export type AnalyticsConfidencePresentation = {
  state: AnalyticsPresentationConfidence;
  label: string;
  summary: string;
  sampleLabel: string;
  missingDataAction: string;
  isPreliminary: boolean;
  canShowFormalConclusions: boolean;
  canShowRankings: boolean;
  canShowPreciseComparisons: boolean;
  hasPendingSync: boolean;
};

export type BuildAnalyticsConfidencePresentationInput = {
  validMarketCount: number;
  dataCompleteness?: AnalyticsDataCompletenessResult | null;
  hasPendingSync?: boolean;
};

const SIGNAL_ACTIONS: Record<string, string> = {
  deal_count_or_transaction_amount: '下一場請記錄每筆成交金額，讓客單價與轉換判讀更完整。',
  product_level_sales: '下一場至少記錄前三個熱銷商品與數量，才能建立商品比較。',
  interaction_and_realtime_deal_events: '下一場請同步記錄互動與成交，才能判斷互動轉換。',
  reliable_realtime_timestamps: '下一場盡量在現場即時記錄，才能分析有效時段。',
};

function resolveState(validMarketCount: number): AnalyticsPresentationConfidence {
  if (validMarketCount < 3) return 'insufficient';
  if (validMarketCount < 5) return 'emerging';
  if (validMarketCount < 8) return 'usable';
  return 'strong';
}

function resolveCopy(state: AnalyticsPresentationConfidence): Pick<
  AnalyticsConfidencePresentation,
  'label' | 'summary'
> {
  switch (state) {
    case 'insufficient':
      return {
        label: '資料不足',
        summary: '目前只適合查看原始紀錄與初步觀察，不顯示正式評等或排行。',
      };
    case 'emerging':
      return {
        label: '初步觀察',
        summary: '已有基本方向，但仍容易受單一場次影響，請保留判斷。',
      };
    case 'usable':
      return {
        label: '可供決策參考',
        summary: '資料量已可支撐一般比較，仍應搭配資料完整度一起判讀。',
      };
    case 'strong':
      return {
        label: '可信度良好',
        summary: '場次樣本已可支撐穩定比較，適合進行進階趨勢與策略檢視。',
      };
  }
}

function resolveMissingDataAction(
  validMarketCount: number,
  dataCompleteness?: AnalyticsDataCompletenessResult | null,
): string {
  if (validMarketCount < 3) {
    return `再完成 ${3 - validMarketCount} 場有收入紀錄的市集，即可開始顯示正式比較。`;
  }

  const firstMissingSignal = dataCompleteness?.missingSignals[0];
  if (firstMissingSignal && SIGNAL_ACTIONS[firstMissingSignal]) {
    return SIGNAL_ACTIONS[firstMissingSignal];
  }

  if (validMarketCount < 8) {
    return `再累積 ${8 - validMarketCount} 場有效市集，可降低單一場次對趨勢的影響。`;
  }

  return '維持成交、商品、互動與成本紀錄，並在資料異常時先完成同步確認。';
}

export function buildAnalyticsConfidencePresentation({
  validMarketCount,
  dataCompleteness,
  hasPendingSync = false,
}: BuildAnalyticsConfidencePresentationInput): AnalyticsConfidencePresentation {
  const normalizedMarketCount = Math.max(0, Math.floor(validMarketCount));
  const state = resolveState(normalizedMarketCount);
  const copy = resolveCopy(state);
  const isPreliminary = state === 'insufficient' || state === 'emerging';

  return {
    state,
    ...copy,
    sampleLabel: `${normalizedMarketCount} 場有效市集`,
    missingDataAction: hasPendingSync
      ? '先完成待同步資料，再依更新後的數字做決策。'
      : resolveMissingDataAction(normalizedMarketCount, dataCompleteness),
    isPreliminary,
    canShowFormalConclusions: state !== 'insufficient',
    canShowRankings: state !== 'insufficient',
    canShowPreciseComparisons: state === 'usable' || state === 'strong',
    hasPendingSync,
  };
}
