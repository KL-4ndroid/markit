'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Product, DailyStats, ProductCategory } from '@/types/db';
import { formatCurrency } from '@/lib/utils';

interface CategoryPieChartProps {
  products: Product[];
  stats: DailyStats[];
}

/**
 * 分類佔比圖組件
 * 
 * 使用 PieChart 分析各商品分類的銷售佔比
 * 使用 Step 4 定義的分類色彩
 */
export function CategoryPieChart({ products, stats }: CategoryPieChartProps) {
  // 分類顏色映射（與 ProductCard 一致）
  const categoryColors: Record<ProductCategory, string> = {
    handmade: '#F5E6E8',    // 柔粉色
    food: '#FFF8E7',        // 柔黃色
    accessory: '#E8F3E8',   // 柔綠色
    clothing: '#E8F0F8',    // 柔藍色
    art: '#F8E8F0',         // 柔紫色
    stationery: '#FFF0E8',  // 柔橘色
    other: '#F0F0F0',       // 柔灰色
  };

  const categoryLabels: Record<ProductCategory, string> = {
    handmade: '手作',
    food: '食品',
    accessory: '飾品',
    clothing: '服飾',
    art: '藝術品',
    stationery: '文具',
    other: '其他',
  };

  // 計算各分類的銷售額
  const categoryData = products.reduce((acc, product) => {
    const category = product.category;
    const totalSold = product.totalSold || 0;
    const revenue = totalSold * product.price;
    
    if (!acc[category]) {
      acc[category] = {
        category,
        revenue: 0,
        count: 0,
      };
    }
    
    acc[category].revenue += revenue;
    acc[category].count += totalSold;
    
    return acc;
  }, {} as Record<ProductCategory, { category: ProductCategory; revenue: number; count: number }>);

  // 轉換為圖表數據
  const chartData = Object.values(categoryData)
    .filter(item => item.revenue > 0)
    .map(item => ({
      name: categoryLabels[item.category],
      value: item.revenue,
      count: item.count,
      color: categoryColors[item.category],
    }))
    .sort((a, b) => b.value - a.value);

  // 如果沒有數據
  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-[#7B9FA6]/5">
        <h3 className="text-base font-medium text-[#3A3A3A] mb-4">分類銷售佔比</h3>
        <div className="flex flex-col items-center justify-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm text-[#6B6B6B]">尚無銷售數據</p>
        </div>
      </div>
    );
  }

  // 自定義 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white rounded-xl p-3 shadow-lg border border-[#7B9FA6]/20">
          <p className="text-sm font-medium text-[#3A3A3A] mb-1">{data.name}</p>
          <p className="text-xs text-[#6B6B6B]">
            銷售額：{formatCurrency(data.value)}
          </p>
          <p className="text-xs text-[#6B6B6B]">
            銷售量：{data.count} 件
          </p>
        </div>
      );
    }
    return null;
  };

  // 自定義圖例
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-xs text-[#6B6B6B]">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-md shadow-[#7B9FA6]/5">
      <h3 className="text-base font-medium text-[#3A3A3A] mb-4">分類銷售佔比</h3>
      
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#fff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
