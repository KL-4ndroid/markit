'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyStats } from '@/types/db';
import { formatCurrency } from '@/lib/utils';

interface RevenueChartProps {
  data: DailyStats[];
}

/**
 * 營收趨勢圖組件
 * 
 * 使用 AreaChart 顯示選定範圍內的營收變化
 * 使用品牌色漸層填充
 */
export function RevenueChart({ data }: RevenueChartProps) {
  // 準備圖表數據
  const chartData = data
    .map(stat => ({
      date: stat.date,
      revenue: stat.revenue,
      profit: stat.profit,
      displayDate: formatDate(stat.date),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 格式化日期顯示
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl p-3 shadow-lg border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.displayDate}</p>
          <p className="text-sm font-medium text-primary">
            營收：{formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm font-medium text-secondary">
            利潤：{formatCurrency(payload[1].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-primary/5">
      <h3 className="text-base font-medium text-foreground mb-4">營收趨勢</h3>
      
      <div className="w-full h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              {/* 營收漸層 */}
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--brand-primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="rgb(var(--brand-primary))" stopOpacity={0}/>
              </linearGradient>
              {/* 利潤漸層 */}
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="rgb(var(--brand-secondary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="rgb(var(--brand-secondary))" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--brand-primary))" opacity={0.1} />

            <XAxis
              dataKey="displayDate"
              tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'rgb(var(--brand-primary))', opacity: 0.2 }}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'rgb(var(--brand-primary))', opacity: 0.2 }}
              tickLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* 營收區域 */}
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="rgb(var(--brand-primary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            
            {/* 利潤區域 */}
            <Area
              type="monotone"
              dataKey="profit"
              stroke="rgb(var(--brand-secondary))"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProfit)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 圖例 */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-xs text-muted-foreground">營收</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary"></div>
          <span className="text-xs text-muted-foreground">利潤</span>
        </div>
      </div>
    </div>
  );
}
