/**
 * Product Recommendations Card - 商品推薦卡片
 * 
 * 顯示黃金組合推薦（基於 Lift 指標）
 */

import React from 'react';
import { Gift, Lightbulb, Target } from 'lucide-react';
import type { ProductPair } from '@/lib/analytics';
import InfoTooltip, { tooltipContent } from './InfoTooltip';

interface ProductRecommendationsCardProps {
  productPairs: ProductPair[];
  maxDisplay?: number;
}

export default function ProductRecommendationsCard({ 
  productPairs,
  maxDisplay = 5 
}: ProductRecommendationsCardProps) {
  // 篩選強關聯商品（Lift > 1.2）
  const strongPairs = productPairs
    .filter(pair => pair.lift > 1.2)
    .slice(0, maxDisplay);

  if (strongPairs.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Gift className="w-5 h-5 text-secondary shrink-0" strokeWidth={1.75} />
        <h3 className="text-xl font-bold text-gray-800">
          黃金組合推薦
        </h3>
        <InfoTooltip {...tooltipContent.productAffinity} />
      </div>
      <div className="text-center py-8">
        <p className="text-gray-500">
          暫無足夠數據分析商品關聯性
        </p>
        <p className="text-sm text-gray-400 mt-2">
          需要至少 20 筆成交記錄
        </p>
      </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-secondary shrink-0" strokeWidth={1.75} />
          <h3 className="text-xl font-bold text-gray-800">
            黃金組合推薦
          </h3>
          <InfoTooltip {...tooltipContent.productAffinity} />
        </div>
        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
          {strongPairs.length} 組推薦
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        這些商品經常一起購買，建議做成組合包提升客單價
      </p>

      <div className="space-y-4">
        {strongPairs.map((pair, index) => {
          const liftMultiplier = pair.lift.toFixed(1);
          const confidencePercent = (pair.confidence * 100).toFixed(0);
          
          return (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:bg-green-50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                      {pair.productA}
                    </span>
                    <span className="text-gray-400">+</span>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded">
                      {pair.productB}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    共同購買 {pair.coOccurrences} 次
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold text-green-600">
                      {liftMultiplier}x
                    </span>
                    <span className="text-xs text-gray-500">關聯度</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-3">
                <p className="text-sm text-gray-700 mb-2 inline-flex items-start gap-1.5">
                  <Lightbulb className="w-4 h-4 mt-0.5 shrink-0 text-secondary" strokeWidth={1.75} />
                  <span>買 <span className="font-medium">{pair.productA}</span> 的客人，
                  有 <span className="font-bold text-green-700">{liftMultiplier} 倍</span> 機率也會買
                  <span className="font-medium"> {pair.productB}</span></span>
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>信心度：{confidencePercent}%</span>
                  <span>支持度：{(pair.support * 100).toFixed(1)}%</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-secondary shrink-0" strokeWidth={1.75} />
                  建議行動：
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 做成組合包，優惠價 ${calculateBundlePrice(pair)}</li>
                  <li>• 擺在一起展示，方便客人一起拿</li>
                  <li>• 買 A 時主動推薦：「要不要加購 B？」</li>
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {productPairs.length > maxDisplay && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            查看更多推薦 ({productPairs.length - maxDisplay} 組)
          </button>
        </div>
      )}
    </div>
  );
}

// 計算組合包建議價格（簡化版）
function calculateBundlePrice(pair: ProductPair): string {
  // 這裡需要實際的商品價格數據
  // 暫時返回示例
  return '優惠價';
}
