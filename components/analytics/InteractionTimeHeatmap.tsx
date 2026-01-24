'use client';

import { ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
      <h3 className="text-lg font-medium text-[#3A3A3A] mb-4">
        ⏰ 互動時序熱力圖
      </h3>
      <p className="text-xs text-[#6B6B6B] mb-4">
        人氣高峰與金流高峰的時段分布
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis 
            dataKey="hour" 
            tick={{ fill: '#6B6B6B', fontSize: 12 }}
            axisLine={{ stroke: '#E5E5E5' }}
          />
          <YAxis 
            yAxisId="left"
            tick={{ fill: '#6B6B6B', fontSize: 12 }}
            axisLine={{ stroke: '#E5E5E5' }}
            label={{ value: '互動次數', angle: -90, position: 'insideLeft', style: { fill: '#6B6B6B', fontSize: 11 } }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            tick={{ fill: '#6B6B6B', fontSize: 12 }}
            axisLine={{ stroke: '#E5E5E5' }}
            label={{ value: '成交金額', angle: 90, position: 'insideRight', style: { fill: '#6B6B6B', fontSize: 11 } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #E5E5E5',
              borderRadius: '12px',
              padding: '12px'
            }}
            formatter={(value: any, name: string | undefined) => {
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
            fill="#7B9FA6" 
            name="互動次數"
            radius={[8, 8, 0, 0]}
            opacity={0.8}
          />
          <Area 
            yAxisId="right"
            type="monotone" 
            dataKey="revenue" 
            stroke="#D4A574" 
            fill="#D4A574"
            fillOpacity={0.3}
            name="成交金額"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
