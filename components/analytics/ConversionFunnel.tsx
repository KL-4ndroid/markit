'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ConversionFunnelProps {
  touchCount: number;
  inquiryCount: number;
  dealCount: number;
}

/**
 * 轉換漏斗圖組件
 * 
 * 展示「互動 -> 詢問 -> 成交」的轉化過程
 * 使用 BarChart 呈現漏斗效果
 */
export function ConversionFunnel({ touchCount, inquiryCount, dealCount }: ConversionFunnelProps) {
  // 計算轉換率
  const totalInteractions = touchCount + inquiryCount;
  const inquiryRate = totalInteractions > 0 ? (inquiryCount / totalInteractions) * 100 : 0;
  const conversionRate = totalInteractions > 0 ? (dealCount / totalInteractions) * 100 : 0;

  // 準備圖表數據（Recharts 用 CSS 變數以支援未來改色）
  const chartData = [
    {
      name: '互動',
      value: touchCount,
      color: 'rgb(var(--brand-soft-green))',       // 柔綠底
      textColor: 'rgb(var(--brand-primary))',       // 霧松綠
      emoji: '👋',
    },
    {
      name: '詢問',
      value: inquiryCount,
      color: 'rgb(var(--brand-soft-yellow))',      // 柔黃底
      textColor: 'rgb(var(--brand-secondary))',     // 暖杏橘
      emoji: '💬',
    },
    {
      name: '成交',
      value: dealCount,
      color: 'rgb(var(--brand-soft-green))',
      textColor: 'rgb(var(--brand-primary))',
      emoji: '💰',
    },
  ];

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white rounded-xl p-3 shadow-lg border border-primary/20">
          <p className="text-sm font-medium text-foreground mb-1">
            {data.emoji} {data.name}
          </p>
          <p className="text-xs text-muted-foreground">
            數量：{data.value} 次
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-primary/5">
      <h3 className="text-base font-medium text-foreground mb-4">轉換漏斗</h3>
      
      {/* 圖表 */}
      <div className="w-full h-[250px] mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--brand-primary))" opacity={0.1} />

            <XAxis
              dataKey="name"
              tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'rgb(var(--brand-primary))', opacity: 0.2 }}
              tickLine={false}
            />

            <YAxis
              tick={{ fill: 'rgb(var(--brand-muted-foreground))', fontSize: 12 }}
              axisLine={{ stroke: 'rgb(var(--brand-primary))', opacity: 0.2 }}
              tickLine={false}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar
              dataKey="value"
              radius={[12, 12, 0, 0]}
              maxBarSize={80}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.textColor} strokeWidth={2} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 轉換率統計 */}
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-primary/10">
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">互動總數</div>
          <div className="text-lg font-medium text-foreground tabular-nums">
            {totalInteractions}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">詢問率</div>
          <div className="text-lg font-medium text-secondary tabular-nums">
            {inquiryRate.toFixed(1)}%
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-1">轉換率</div>
          <div className="text-lg font-medium text-primary tabular-nums">
            {conversionRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 洞察提示 */}
      {conversionRate > 0 && (
        <div className="mt-4 p-3 bg-soft-yellow rounded-xl">
          <p className="text-xs text-muted-foreground">
            💡 <span className="font-medium">洞察：</span>
            {conversionRate >= 20 ? (
              '轉換率表現優秀！繼續保持良好的客戶互動。'
            ) : conversionRate >= 10 ? (
              '轉換率良好，可以嘗試提升詢問客戶的成交率。'
            ) : (
              '轉換率有提升空間，建議加強產品展示和客戶溝通。'
            )}
          </p>
        </div>
      )}
    </div>
  );
}
