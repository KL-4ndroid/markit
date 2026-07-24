'use client';

import { ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock } from 'lucide-react';

interface InteractionTimeHeatmapProps {
  data: {
    hour: string;
    interactions: number;
    revenue: number;
  }[];
}

/**
 * 互動時序熱力圖
 * 顯示每小時的互動次數與成交金額
 */
export function InteractionTimeHeatmap({ data }: InteractionTimeHeatmapProps) {
  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
      <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-secondary" strokeWidth={1.75} />
        互動時序熱力圖
      </h3>
      <p className="text-xs text-muted-foreground mb-4">
        人氣高峰與金流高峰的時段分布
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--brand-muted-foreground))" opacity={0.2} />
          <XAxis
            dataKey="hour"
            tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'rgb(var(--brand-muted))' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'rgb(var(--brand-muted))' }}
            label={{ value: '互動次數', angle: -90, position: 'insideLeft', style: { fill: 'rgb(var(--brand-muted-foreground))', fontSize: 11 } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'rgb(var(--brand-muted))' }}
            label={{ value: '成交金額', angle: 90, position: 'insideRight', style: { fill: 'rgb(var(--brand-muted-foreground))', fontSize: 11 } }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid rgb(var(--brand-muted))',
              borderRadius: '12px',
              padding: '12px'
            }}
            formatter={(value: any, name: string | number | undefined) => {
              if (name === '成交金額') {
                return [`NT$${value.toLocaleString()}`, name];
              }
              return [value, name || ''];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="circle"
          />
          <Bar
            yAxisId="left"
            dataKey="interactions"
            fill="rgb(var(--brand-primary))"
            name="互動次數"
            radius={[8, 8, 0, 0]}
            opacity={0.8}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            stroke="rgb(var(--brand-secondary))"
            fill="rgb(var(--brand-secondary))"
            fillOpacity={0.3}
            name="成交金額"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
