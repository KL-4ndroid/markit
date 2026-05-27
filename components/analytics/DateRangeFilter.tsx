'use client';

import { BarChart3 } from 'lucide-react';
import type { Market } from '@/types/db';

export type AnalyticsRange = 'all' | 'recent3' | 'recent10' | 'single';

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
    <div className="bg-white rounded-[1.5rem] p-4 shadow-md shadow-[#7B9FA6]/5">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-[#7B9FA6]" />
        <span className="text-sm font-medium text-[#3A3A3A]">分析範圍</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              min-h-[44px] px-3 rounded-xl text-sm font-medium transition-all
              ${value === option.value
                ? 'bg-[#7B9FA6] text-white shadow-md'
                : 'bg-[#FAFAF8] text-[#6B6B6B] hover:bg-[#F5E6E8]'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>

      {value === 'single' && (
        <div className="mt-3">
          <label className="block text-xs text-[#6B6B6B] mb-1">選擇市集</label>
          <select
            value={selectedMarketId ?? ''}
            onChange={(event) => onMarketChange?.(event.target.value)}
            className="w-full px-3 py-2.5 border-2 border-[#7B9FA6]/15 rounded-xl bg-white text-sm text-[#3A3A3A] focus:ring-2 focus:ring-[#7B9FA6]/20 focus:border-[#7B9FA6] transition-all"
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
  );
}
