import { BadgeDollarSign, Receipt, Store, Target } from 'lucide-react';

import { formatCurrency } from '@/lib/presentation/formatters';

interface AnalyticsKpiRowProps {
  marketCount: number;
  totalRevenue: number;
  totalDeals: number;
  confidenceLabel: string;
}

const items = [
  { key: 'markets', label: '有效市集', Icon: Store },
  { key: 'revenue', label: '範圍營收', Icon: BadgeDollarSign },
  { key: 'deals', label: '成交數', Icon: Receipt },
  { key: 'confidence', label: '可信度', Icon: Target },
] as const;

export function AnalyticsKpiRow({
  marketCount,
  totalRevenue,
  totalDeals,
  confidenceLabel,
}: AnalyticsKpiRowProps) {
  const values: Record<(typeof items)[number]['key'], string> = {
    markets: `${marketCount} 場`,
    revenue: formatCurrency(totalRevenue),
    deals: `${Math.round(totalDeals).toLocaleString('zh-TW')} 筆`,
    confidence: confidenceLabel,
  };

  return (
    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-label="分析關鍵指標">
      {items.map(({ key, label, Icon }) => (
        <div key={key} className="rounded-card border border-primary/10 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
            <p className="text-xs font-medium">{label}</p>
          </div>
          <p className="mt-2 truncate text-base font-semibold tabular-nums text-foreground" title={values[key]}>
            {values[key]}
          </p>
        </div>
      ))}
    </section>
  );
}
