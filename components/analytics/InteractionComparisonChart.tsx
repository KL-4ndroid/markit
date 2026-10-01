'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Market } from '@/types/db';

interface InteractionComparisonChartProps {
  markets: Market[];
}

/**
 * 互動與成交對比圖
 */
export function InteractionComparisonChart({ markets }: InteractionComparisonChartProps) {
  // 準備圖表數據
  const chartData = markets
    .filter(m => m.totalInteractions || m.totalDeals)
    .map(market => ({
      name: market.name,
      互動: market.totalInteractions || 0,
      成交: market.totalDeals || 0,
    }));

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
      <h3 className="text-foreground text-lg font-medium mb-4">互動與成交對比</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--brand-primary))" opacity={0.1} />
            <XAxis
              dataKey="name"
              stroke="rgb(var(--brand-primary))"
              opacity={0.2}
              tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
            />
            <YAxis
              stroke="rgb(var(--brand-primary))"
              opacity={0.2}
              tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid rgb(var(--brand-primary) / 0.2)',
                borderRadius: '12px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="互動" fill="rgb(var(--brand-primary))" radius={[12, 12, 0, 0]} />
            <Bar dataKey="成交" fill="rgb(var(--brand-soft-green))" radius={[12, 12, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
