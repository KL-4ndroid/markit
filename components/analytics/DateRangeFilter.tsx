'use client';

import { BarChart3 } from 'lucide-react';
import type { AnalyticsRange } from '@/lib/analytics/subscription-view';
import type { Market } from '@/types/db';

export type { AnalyticsRange };

interface DateRangeFilterProps {
  value: AnalyticsRange;
  onChange: (value: AnalyticsRange) => void;
  markets?: Market[];
  selectedMarketId?: string;
  onMarketChange?: (marketId: string) => void;
}

const options: Array<{ value: AnalyticsRange; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'recent3', label: '最近 3 場' },
  { value: 'recent10', label: '最近 10 場' },
  { value: 'single', label: '單一市集' },
];

export function DateRangeFilter({
  value,
  onChange,
  markets = [],
  selectedMarketId,
  onMarketChange,
}: DateRangeFilterProps) {
  return (
    <div className="rounded-card border border-primary/10 bg-white p-3">
      <div className="mb-3 flex items-center gap-2 lg:mb-0">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="whitespace-nowrap text-sm font-medium text-foreground">分析範圍</span>
      </div>

      <div className="lg:mt-3 lg:flex lg:items-center lg:gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => onChange(option.value)}
              className={`min-h-[44px] rounded-lg px-3 text-sm font-medium transition-colors lg:flex-1 ${
                value === option.value
                  ? 'bg-primary text-white'
                  : 'bg-background text-muted-foreground hover:bg-soft-pink'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {value === 'single' && (
          <div className="mt-3 lg:mt-0 lg:w-72">
            <label className="sr-only" htmlFor="analytics-market-filter">選擇市集</label>
            <select
              id="analytics-market-filter"
              value={selectedMarketId ?? ''}
              onChange={(event) => onMarketChange?.(event.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-primary/15 bg-white px-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">請選擇市集</option>
              {markets.map((market) => (
                <option key={market.id} value={market.id}>
                  {market.startDate} - {market.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
