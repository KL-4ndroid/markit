'use client';

import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  format: 'currency' | 'number' | 'percentage' | 'percent';
  color: 'blue' | 'green' | 'wood' | 'pink';
  change?: number; // 與上期相比的變化百分比
}

/**
 * 關鍵指標卡片組件
 * 
 * 顯示單一關鍵指標，支援貨幣、數字、百分比格式
 */
export function MetricCard({ icon: Icon, label, value, format, color, change }: MetricCardProps) {
  // 顏色映射
  const colorMap = {
    blue: {
      bg: 'bg-[#E8F0F8]',
      icon: 'text-primary',
      text: 'text-primary',
    },
    green: {
      bg: 'bg-soft-green',
      icon: 'text-primary',
      text: 'text-primary',
    },
    wood: {
      bg: 'bg-[#FFF0E8]',
      icon: 'text-secondary',
      text: 'text-secondary',
    },
    pink: {
      bg: 'bg-soft-pink',
      icon: 'text-secondary',
      text: 'text-secondary',
    },
  };

  const colors = colorMap[color];

  // 格式化數值
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'number':
        return val.toLocaleString('zh-TW');
      default:
        return val.toString();
    }
  };

  return (
    <div className="bg-white rounded-[1.25rem] p-4 shadow-md shadow-primary/5">
      {/* 圖標 */}
      <div className={`${colors.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${colors.icon}`} />
      </div>

      {/* 標籤 */}
      <div className="text-xs text-muted-foreground mb-1">{label}</div>

      {/* 數值 */}
      <div className="text-xl font-medium text-foreground tabular-nums mb-1">
        {formatValue(value)}
      </div>

      {/* 變化百分比（可選） */}
      {change !== undefined && (
        <div className={`text-xs flex items-center gap-1 ${change >= 0 ? 'text-primary' : 'text-danger'}`}>
          <span>{change >= 0 ? '↑' : '↓'}</span>
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span className="text-muted-foreground">vs 上期</span>
        </div>
      )}
    </div>
  );
}
