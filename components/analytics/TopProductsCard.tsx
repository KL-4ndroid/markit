'use client';

import { Package, TrendingUp, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface TopProductsCardProps {
  topByQuantity: {
    productName: string;
    quantity: number;
  } | null;
  topByRevenue: {
    productName: string;
    revenue: number;
  } | null;
  topByProfit: {
    productName: string;
    profit: number;
  } | null;
}

/**
 * 商品排行卡片組件
 * 顯示銷量第一、營收第一、利潤第一的商品
 */
export function TopProductsCard({ 
  topByQuantity,
  topByRevenue,
  topByProfit
}: TopProductsCardProps) {
  return (
    <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-primary/10">
      <div className="grid grid-cols-3 gap-2">
        {/* 銷量第一 */}
        <div className="bg-background rounded-lg p-3 border border-primary/10">
          <div className="flex flex-col items-center text-center mb-2">
            <div className="bg-gradient-to-br from-primary to-primary/85 p-2 rounded-lg mb-2">
              <Package className="w-3 h-3 text-white" />
            </div>
            <h3 className="font-medium text-foreground text-[10px] leading-tight">
              銷量第一
            </h3>
          </div>
          {topByQuantity ? (
            <div className="text-center">
              <p className="text-xs font-bold text-foreground mb-1 truncate" title={topByQuantity.productName}>
                {topByQuantity.productName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="font-bold text-primary">{topByQuantity.quantity}</span> 件
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic text-center">不適用</p>
          )}
        </div>

        {/* 營收第一 */}
        <div className="bg-background rounded-lg p-3 border border-secondary/10">
          <div className="flex flex-col items-center text-center mb-2">
            <div className="bg-gradient-to-br from-secondary to-[#C49564] p-2 rounded-lg mb-2">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <h3 className="font-medium text-foreground text-[10px] leading-tight">
              營收第一
            </h3>
          </div>
          {topByRevenue ? (
            <div className="text-center">
              <p className="text-xs font-bold text-foreground mb-1 truncate" title={topByRevenue.productName}>
                {topByRevenue.productName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="font-bold text-secondary">{formatCurrency(topByRevenue.revenue)}</span>
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic text-center">不適用</p>
          )}
        </div>

        {/* 利潤第一 */}
        <div className="bg-background rounded-lg p-3 border border-gold/20">
          <div className="flex flex-col items-center text-center mb-2">
            <div className="bg-gradient-to-br from-gold to-gold-warm p-2 rounded-lg mb-2">
              <DollarSign className="w-3 h-3 text-white" />
            </div>
            <h3 className="font-medium text-foreground text-[10px] leading-tight">
              利潤第一
            </h3>
          </div>
          {topByProfit ? (
            <div className="text-center">
              <p className="text-xs font-bold text-foreground mb-1 truncate" title={topByProfit.productName}>
                {topByProfit.productName}
              </p>
              <p className="text-[10px] text-muted-foreground">
                <span className="font-bold text-secondary">{formatCurrency(topByProfit.profit)}</span>
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic text-center">不適用</p>
          )}
        </div>
      </div>
    </div>
  );
}
