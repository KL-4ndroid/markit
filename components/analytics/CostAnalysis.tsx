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
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
      <h3 className="text-foreground text-lg font-medium mb-4">成本分析</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">總收入</span>
          <span className="font-medium text-primary">{formatCurrency(totalRevenue)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">總成本</span>
          <span className="font-medium text-secondary">{formatCurrency(totalCost)}</span>
        </div>
        <div className="border-t border-primary/10 pt-3 flex justify-between items-center">
          <span className="font-medium text-foreground">淨利潤</span>
          <span className={`font-medium text-xl ${totalProfit >= 0 ? 'text-foreground' : 'text-danger'}`}>
            {formatCurrency(totalProfit)}
          </span>
        </div>
      </div>
    </div>
  );
}
