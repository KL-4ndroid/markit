/**
 * Analytics Dashboard - 分析儀表板
 * 
 * 整合所有診斷卡片，提供完整的市集分析視圖
 */

'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { computeMarketAnalytics, calculateProductAffinity } from '@/lib/analytics';
import type { MarketAnalytics, ProductPair } from '@/lib/analytics';
import type { Market } from '@/types/db';

// 導入組件
import MarketOverviewCard from './MarketOverviewCard';
import DiagnosticCards from './DiagnosticCards';
import ComparisonChart from './ComparisonChart';
import ProductRecommendationsCard from './ProductRecommendationsCard';

interface AnalyticsDashboardProps {
  marketId: string;
}

export default function AnalyticsDashboard({ marketId }: AnalyticsDashboardProps) {
  const [market, setMarket] = useState<Market | null>(null);
  const [analytics, setAnalytics] = useState<MarketAnalytics | null>(null);
  const [productPairs, setProductPairs] = useState<ProductPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [marketId]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      // 載入市集資料
      const marketData = await db.markets.get(marketId);
      if (!marketData) {
        throw new Error('找不到市集資料');
      }
      setMarket(marketData);

      // 獲取所有市集（用於批次補登偵測）
      const allMarkets = await db.markets.toArray();

      // 計算分析結果（現在是 async）
      const analyticsResult = await computeMarketAnalytics(marketData, {
        db,
        allMarkets,
        enableBatchEntryCorrection: true,
      });
      setAnalytics(analyticsResult);

      // 計算商品親和力
      const pairs = await calculateProductAffinity([marketData], db);
      setProductPairs(pairs);

    } catch (err) {
      console.error('載入分析資料失敗:', err);
      setError(err instanceof Error ? err.message : '載入失敗');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在分析數據...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics || !market) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="text-6xl mb-4 block">😕</span>
          <p className="text-gray-600 mb-4">{error || '無法載入分析資料'}</p>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            市集分析報告
          </h1>
          <p className="text-gray-600">
            用數據說話，讓你一眼看懂市集表現
          </p>
        </div>

        {/* 市集總覽 */}
        <div className="mb-8">
          <MarketOverviewCard
            analytics={analytics}
            marketName={market.name}
          />
        </div>

        {/* 診斷卡片 */}
        <div className="mb-8">
          <DiagnosticCards analytics={analytics} />
        </div>

        {/* 對比圖表 */}
        <div className="mb-8">
          <ComparisonChart analytics={analytics} />
        </div>

        {/* 商品推薦 */}
        {productPairs.length > 0 && (
          <div className="mb-8">
            <ProductRecommendationsCard productPairs={productPairs} />
          </div>
        )}

        {/* 底部說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">
                如何使用這份報告？
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• <strong>看評分</strong>：綜合評分告訴你這個市集值不值得再來</li>
                <li>• <strong>看診斷</strong>：找出你的優勢和需要改進的地方</li>
                <li>• <strong>看處方箋</strong>：按照建議行動，下次表現會更好</li>
                <li>• <strong>看商品推薦</strong>：做成組合包，提升客單價</li>
              </ul>
              <p className="text-sm text-gray-600 mt-3">
                💾 建議：每次市集結束後都來看一次，持續優化你的策略
              </p>
            </div>
          </div>
        </div>

        {/* 數據更新時間 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>數據更新時間：{new Date().toLocaleString('zh-TW')}</p>
          <button
            onClick={loadAnalytics}
            className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            🔄 重新整理
          </button>
        </div>
      </div>
    </div>
  );
}
