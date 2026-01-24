'use client';

import { formatCurrency } from '@/lib/utils';

interface CostAnalysisProps {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

/**
 * 成本分析卡片
 */
export function CostAnalysis({ totalRevenue, totalCost, totalProfit }: CostAnalysisProps) {
  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
      <h3 className="text-[#3A3A3A] text-lg font-medium mb-4">成本分析</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[#6B6B6B]">總收入</span>
          <span className="font-medium text-[#7B9FA6]">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[#6B6B6B]">總成本</span>
          <span className="font-medium text-[#D4A574]">{formatCurrency(totalCost)}</span>
        </div>
        <div className="border-t border-[#7B9FA6]/10 pt-3 flex justify-between items-center">
          <span className="font-medium text-[#3A3A3A]">淨利潤</span>
          <span className={`font-medium text-xl ${totalProfit >= 0 ? 'text-[#3A3A3A]' : 'text-[#d4183d]'}`}>
            {formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}
