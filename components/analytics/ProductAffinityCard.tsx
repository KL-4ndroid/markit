/**
 * 商品親和力卡片組件
 * 
 * 顯示經常一起購買的商品配對
 */

'use client';

import { ShoppingBag, Lightbulb } from 'lucide-react';
import type { ProductPair } from '@/lib/analytics-utils';
import { MetricGuide } from './MetricGuide';

interface ProductAffinityCardProps {
  pairs: ProductPair[];
  isLoading?: boolean;
}

export function ProductAffinityCard({ pairs, isLoading }: ProductAffinityCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
        <div className="animate-pulse">
          <div className="h-6 bg-[#7B9FA6]/10 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-[#7B9FA6]/5 rounded-xl"></div>
            <div className="h-16 bg-[#7B9FA6]/5 rounded-xl"></div>
            <div className="h-16 bg-[#7B9FA6]/5 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!pairs || pairs.length === 0) {
    return (
      <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
        <h2 className="text-xl font-medium text-[#3A3A3A] mb-4">
          商品關聯分析
        </h2>
        
        {/* ✅ 溫柔的建議提示 */}
        <div className="bg-[#FFF8E7] rounded-xl p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#D4A574]/10 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-[#D4A574]/60" />
          </div>
          
          <h3 className="text-base font-medium text-[#3A3A3A] mb-2">
            尚無連帶銷售數據
          </h3>
          
          <p className="text-sm text-[#6B6B6B] mb-4 leading-relaxed">
            建議在成交時記錄多樣商品，系統將自動分析哪些商品經常一起被購買 ✨
          </p>

          {/* 小提示 */}
          <div className="bg-white/60 rounded-lg p-3 text-left">
            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              <span className="font-medium text-[#3A3A3A]">💡 小技巧：</span>
              <br />
              當顧客同時購買多件商品時，在成交頁面一起記錄，系統會自動分析商品之間的關聯性，幫助您優化商品擺放和組合優惠策略。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 只顯示前 3 組
  const topPairs = pairs.slice(0, 3);

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-[#7B9FA6]/10">
      {/* 標題 */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-medium text-[#3A3A3A]">
            商品關聯分析
          </h2>
          <MetricGuide
            title="商品親和力分析"
            content="分析哪些商品組合最常被同時購買，找出顧客的購買偏好與商品之間的關聯性。"
            value="用於設計「加價購」或「套餐」方案，有效拉高每位客人的消費金額（客單價），提升整體營收表現。"
            emoji="🛍️"
          />
        </div>
        <p className="text-xs text-[#6B6B6B]">
          經常一起購買的商品組合
        </p>
      </div>

      {/* 商品配對列表 */}
      <div className="space-y-3 mb-4">
        {topPairs.map((pair, index) => (
          <div
            key={`${pair.productA}-${pair.productB}`}
            className="bg-gradient-to-r from-[#E8F3E8] to-[#FFF8E7] rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </span>
                <span className="text-xs font-medium text-[#7B9FA6]">
                  第 {index + 1} 名
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#6B6B6B]">共同出現</p>
                <p className="text-base font-medium text-[#3A3A3A] tabular-nums">
                  {pair.coOccurrences} 次
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-[#3A3A3A]">
              <span className="bg-white/60 px-3 py-1.5 rounded-lg font-medium line-clamp-1 flex-1">
                {pair.productA}
              </span>
              <span className="text-[#7B9FA6]">+</span>
              <span className="bg-white/60 px-3 py-1.5 rounded-lg font-medium line-clamp-1 flex-1">
                {pair.productB}
              </span>
            </div>
            
            <div className="mt-2 flex items-center gap-1">
              <div className="flex-1 bg-white/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#7B9FA6] h-full rounded-full transition-all"
                  style={{ width: `${Math.min(pair.confidence * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs text-[#6B6B6B] tabular-nums">
                {(pair.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 推薦建議 */}
      <div className="bg-[#FFF8E7] rounded-xl p-4 flex gap-3">
        <div className="flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-[#D4A574]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#3A3A3A] mb-1">
            💡 經營建議
          </p>
          <p className="text-xs text-[#6B6B6B] leading-relaxed">
            建議將這些商品擺在一起展示，或推出組合優惠價，提升連帶銷售機會。
          </p>
        </div>
      </div>
    </div>
  );
}
