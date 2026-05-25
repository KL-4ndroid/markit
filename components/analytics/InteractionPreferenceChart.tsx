'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface InteractionPreferenceChartProps {
  data: {
    name: string;
    value: number;
    emoji: string;
  }[];
}

/**
 * 互動偏好佔比圖（甜甜圈圖）
 */
export function InteractionPreferenceChart({ data }: InteractionPreferenceChartProps) {
  // 配色：soft-blue, soft-yellow, soft-pink
  const COLORS = ['#E8F0F8', '#FFF8E7', '#F8E8F0'];
  const BORDER_COLORS = ['#7B9FA6', '#D4A574', '#D4A5B4'];

  // 計算總數
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // 自訂標籤
  const renderCustomLabel = (entry: any) => {
    const percent = ((entry.value / total) * 100).toFixed(0);
    return `${percent}%`;
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
      <h3 className="text-lg font-medium text-[#3A3A3A] mb-4">
        🎯 互動偏好佔比
      </h3>
      <p className="text-xs text-[#6B6B6B] mb-4">
        顧客最常進行的互動類型分布
      </p>

      {data.length > 0 && total > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                label={renderCustomLabel}
                labelLine={false}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke={BORDER_COLORS[index % BORDER_COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E5E5E5',
                  borderRadius: '12px',
                  padding: '12px'
                }}
                formatter={(value: any, name: string | number | undefined, props: any) => {
                  const percent = ((value / total) * 100).toFixed(1);
                  return [`${value} 次 (${percent}%)`, `${props.payload.emoji} ${name || ''}`];
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* 圖例 */}
          <div className="mt-4 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ 
                      backgroundColor: COLORS[index % COLORS.length],
                      border: `2px solid ${BORDER_COLORS[index % BORDER_COLORS.length]}`
                    }}
                  />
                  <span className="text-sm text-[#3A3A3A]">
                    {item.emoji} {item.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-[#6B6B6B]">
                  {item.value} 次
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-[#6B6B6B] text-sm">
          尚無互動數據
        </div>
      )}
    </div>
  );
}
