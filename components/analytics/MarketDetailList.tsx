'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Market } from '@/types/db';
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/db';
import { getQuickActionButtons } from '@/lib/quick-actions-store';
import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';

interface MarketDetailListProps {
  markets: Market[];
}

interface InteractionDetail {
  type: string;
  label: string;
  emoji: string;
  count: number;
}

/**
 * 市集明細列表
 */
export function MarketDetailList({ markets }: MarketDetailListProps) {
  const router = useRouter();
  const [interactionDetails, setInteractionDetails] = useState<Record<string, InteractionDetail[]>>({});
  const [customButtons, setCustomButtons] = useState<any[]>([]);

  // 載入自訂按鈕配置
  useEffect(() => {
    setCustomButtons(getQuickActionButtons());
  }, []);

  // 載入互動詳情
  useEffect(() => {
    const loadInteractionDetails = async () => {
      const details: Record<string, InteractionDetail[]> = {};
      
      for (const market of markets) {
        if (!market.id) continue;
        
        // ✅ 使用 market_id 索引查詢（支援 UUID）
        const events = await db.events
          .where('market_id')
          .equals(market.id)
          .and(e => e.type === 'interaction_recorded')
          .toArray();
        
        // 統計每種互動類型的次數
        const interactionCounts: Record<string, number> = {};
        events.forEach(event => {
          const type = event.payload?.type;
          if (type) {
            interactionCounts[type] = (interactionCounts[type] || 0) + 1;
          }
        });
        
        // 轉換為詳細資訊陣列
        const detailArray: InteractionDetail[] = [];
        
        // 根據自訂按鈕配置顯示（總是顯示所有按鈕）
        customButtons.forEach(button => {
          const count = interactionCounts[button.id] || 0;
          detailArray.push({
            type: button.id,
            label: button.label,
            emoji: button.emoji,
            count: count,
          });
        });
        
        details[market.id] = detailArray;
      }
      
      setInteractionDetails(details);
    };
    
    if (markets.length > 0 && customButtons.length > 0) {
      loadInteractionDetails();
    }
  }, [markets, customButtons]);

  if (markets.length === 0) {
    return null;
  }

  // 計算轉換率
  const getConversionRate = (market: Market) => {
    if (!market.totalInteractions || market.totalInteractions === 0) return '0.0';
    const rate = ((market.totalDeals || 0) / market.totalInteractions) * 100;
    return rate.toFixed(1);
  };

  return (
    <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
      <h3 className="text-foreground text-lg font-medium mb-4">市集明細</h3>
      <div className="space-y-3">
        {markets.map((market) => {
          const details = interactionDetails[market.id!] || [];
          
          return (
            <div
              key={market.id}
              className="border border-primary/15 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => {
                  if (market.id) router.push(buildMarketDetailHref(market.id));
                }}
                className="block w-full p-4 hover:bg-background transition-colors text-left"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{market.name}</h4>
                    <p className="text-sm text-muted-foreground">{market.startDate}</p>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${(market.totalProfit || 0) >= 0 ? 'text-primary' : 'text-danger'}`}>
                      {formatCurrency(market.totalProfit || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">淨利潤</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div>收入: {formatCurrency(market.totalRevenue || 0)}</div>
                  <div>成交: {market.totalDeals || 0}</div>
                  <div>轉換: {getConversionRate(market)}%</div>
                </div>
              </button>
              
              {/* ✅ 互動詳情直接顯示（不折疊） */}
              {details.length > 0 && (
                <div className="px-4 py-3 bg-background border-t border-primary/10">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">互動詳情</div>
                  <div className="grid grid-cols-2 gap-2">
                    {details.map((detail) => (
                      <div
                        key={detail.type}
                        className="flex items-center justify-between bg-white rounded-lg p-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{detail.emoji}</span>
                          <span className="text-sm text-foreground">{detail.label}</span>
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {detail.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
