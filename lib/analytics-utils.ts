/**
 * Market Pulse - 分析工具函數
 * 
 * 提供市集分析所需的計算函數
 */

import type { Market, DealClosedPayload } from '@/types/db';
import type { MarketPulseDB } from '@/lib/db';

// ==================== 型別定義 ====================

/**
 * 市集指標計算結果
 */
export interface MarketMetrics {
  conversionRate: number;      // 轉換率（0-1）
  isValidForQuadrant: boolean; // 是否有效用於象限分析
}

/**
 * 象限分析結果
 */
export interface QuadrantResult {
  stars: Market[];             // 明星市集（高互動、高轉換）
  potentials: Market[];        // 潛力市集（高互動、低轉換）
  precisies: Market[];         // 精準市集（低互動、高轉換）
  observables: Market[];       // 觀察市集（低互動、低轉換）
  averages: {
    avgInteractions: number;   // 平均互動數
    avgConversionRate: number; // 平均轉換率
  };
  isEmpty?: boolean;           // 是否無互動數據
}

/**
 * 商品配對結果
 */
export interface ProductPair {
  productA: string;            // 商品 A 名稱
  productB: string;            // 商品 B 名稱
  coOccurrences: number;       // 共同出現次數
  confidence: number;          // 信心度（0-1）
}

// ==================== 函數 1：計算市集指標 ====================

/**
 * 計算市集的轉換率和有效性
 * 
 * @param market - 市集資料
 * @returns 包含轉換率和有效性的物件
 * 
 * @example
 * const metrics = calculateMarketMetrics(market);
 * console.log(`轉換率: ${(metrics.conversionRate * 100).toFixed(2)}%`);
 */
export function calculateMarketMetrics(market: Market): MarketMetrics {
  const totalInteractions = market.totalInteractions || 0;
  const totalDeals = market.totalDeals || 0;
  
  // 若無互動數據，轉換率為 0 且不適用於象限分析
  if (totalInteractions === 0) {
    return {
      conversionRate: 0,
      isValidForQuadrant: false,
    };
  }
  
  // 計算轉換率
  const conversionRate = totalDeals / totalInteractions;
  
  return {
    conversionRate,
    isValidForQuadrant: true,
  };
}

// ==================== 函數 2：計算象限分析 ====================

/**
 * 將市集分類到四個象限
 * 
 * 象限定義：
 * - 明星市集（Stars）：高互動 + 高轉換率
 * - 潛力市集（Potentials）：高互動 + 低轉換率
 * - 精準市集（Precisies）：低互動 + 高轉換率
 * - 觀察市集（Observables）：低互動 + 低轉換率
 * 
 * @param markets - 市集陣列
 * @returns 象限分析結果
 * 
 * @example
 * const quadrants = calculateQuadrants(markets);
 * console.log(`明星市集: ${quadrants.stars.length} 個`);
 */
export function calculateQuadrants(markets: Market[]): QuadrantResult {
  // ✅ 檢查是否所有市集的互動數均為 0
  const hasAnyInteraction = markets.some(market => (market.totalInteractions || 0) > 0);
  
  if (!hasAnyInteraction) {
    return {
      stars: [],
      potentials: [],
      precisies: [],
      observables: [],
      averages: {
        avgInteractions: 0,
        avgConversionRate: 0,
      },
      isEmpty: true, // ✅ 標記為無數據狀態
    };
  }
  
  // 篩選有效市集（有互動數據）
  const validMarkets = markets
    .map(market => ({
      market,
      metrics: calculateMarketMetrics(market),
    }))
    .filter(item => item.metrics.isValidForQuadrant);
  
  // 若無有效市集，返回空結果
  if (validMarkets.length === 0) {
    return {
      stars: [],
      potentials: [],
      precisies: [],
      observables: [],
      averages: {
        avgInteractions: 0,
        avgConversionRate: 0,
      },
      isEmpty: true,
    };
  }
  
  // 計算平均值
  const totalInteractions = validMarkets.reduce(
    (sum, item) => sum + (item.market.totalInteractions || 0),
    0
  );
  const totalConversionRate = validMarkets.reduce(
    (sum, item) => sum + item.metrics.conversionRate,
    0
  );
  
  const avgInteractions = totalInteractions / validMarkets.length;
  const avgConversionRate = totalConversionRate / validMarkets.length;
  
  // 分類到象限
  const stars: Market[] = [];
  const potentials: Market[] = [];
  const precisies: Market[] = [];
  const observables: Market[] = [];
  
  for (const { market, metrics } of validMarkets) {
    const interactions = market.totalInteractions || 0;
    const conversionRate = metrics.conversionRate;
    
    const isHighInteraction = interactions >= avgInteractions;
    const isHighConversion = conversionRate >= avgConversionRate;
    
    if (isHighInteraction && isHighConversion) {
      stars.push(market);
    } else if (isHighInteraction && !isHighConversion) {
      potentials.push(market);
    } else if (!isHighInteraction && isHighConversion) {
      precisies.push(market);
    } else {
      observables.push(market);
    }
  }
  
  return {
    stars,
    potentials,
    precisies,
    observables,
    averages: {
      avgInteractions,
      avgConversionRate,
    },
  };
}

// ==================== 函數 3：計算商品親和力 ====================

/**
 * 計算商品之間的購買親和力（經常一起購買的商品）
 * 
 * 演算法：
 * 1. 遍歷所有成交事件
 * 2. 排除手動輸入的交易
 * 3. 找出同一筆交易中的商品配對
 * 4. 計算配對出現次數和信心度
 * 
 * @param markets - 市集陣列
 * @param db - Dexie 資料庫實例
 * @returns 商品配對陣列（按共同出現次數降序排列）
 * 
 * @example
 * const pairs = await calculateProductAffinity(markets, db);
 * console.log(`最常一起購買: ${pairs[0].productA} + ${pairs[0].productB}`);
 */
export async function calculateProductAffinity(
  markets: Market[],
  db: MarketPulseDB
): Promise<ProductPair[]> {
  // 用於統計商品配對
  const pairMap = new Map<string, {
    productA: string;
    productB: string;
    count: number;
  }>();
  
  // 用於統計單個商品出現次數（計算信心度）
  const productCountMap = new Map<string, number>();
  
  // 遍歷所有市集
  for (const market of markets) {
    // 獲取該市集的所有成交事件
    const events = await db.events
      .where('market_id')
      .equals(market.id!)
      .and(event => event.type === 'deal_closed')
      .toArray();
    
    // 處理每個成交事件
    for (const event of events) {
      const payload = event.payload as DealClosedPayload;
      
      // 排除手動輸入的交易
      if (payload.isManualEntry) {
        continue;
      }
      
      // 確保有交易項目
      if (!payload.items || !Array.isArray(payload.items) || payload.items.length < 2) {
        continue;
      }
      
      // 獲取商品名稱
      const productNames: string[] = [];
      for (const item of payload.items) {
        // 優先使用快照名稱
        let productName = item.product_name;
        
        // 若無快照，從資料庫查詢
        if (!productName) {
          const product = await db.products.get(item.productId);
          productName = product?.name;
        }
        
        if (productName) {
          productNames.push(productName);
          
          // 統計單個商品出現次數
          productCountMap.set(
            productName,
            (productCountMap.get(productName) || 0) + 1
          );
        }
      }
      
      // 生成商品配對（兩兩組合）
      for (let i = 0; i < productNames.length; i++) {
        for (let j = i + 1; j < productNames.length; j++) {
          const productA = productNames[i];
          const productB = productNames[j];
          
          // 確保配對的順序一致（字母順序）
          const [first, second] = productA < productB
            ? [productA, productB]
            : [productB, productA];
          
          const pairKey = `${first}|${second}`;
          
          if (pairMap.has(pairKey)) {
            pairMap.get(pairKey)!.count++;
          } else {
            pairMap.set(pairKey, {
              productA: first,
              productB: second,
              count: 1,
            });
          }
        }
      }
    }
  }
  
  // 轉換為結果陣列並計算信心度
  const results: ProductPair[] = Array.from(pairMap.values()).map(pair => {
    const countA = productCountMap.get(pair.productA) || 0;
    const countB = productCountMap.get(pair.productB) || 0;
    
    // 信心度 = 共同出現次數 / min(商品A出現次數, 商品B出現次數)
    const confidence = Math.min(countA, countB) > 0
      ? pair.count / Math.min(countA, countB)
      : 0;
    
    return {
      productA: pair.productA,
      productB: pair.productB,
      coOccurrences: pair.count,
      confidence,
    };
  });
  
  // 按共同出現次數降序排列
  results.sort((a, b) => b.coOccurrences - a.coOccurrences);
  
  return results;
}

// ==================== 函數 4：計算每日收入 ====================

/**
 * 計算指定日期範圍內的每日收入
 * 
 * @param markets - 市集陣列
 * @param db - Dexie 資料庫實例
 * @param startDate - 開始日期（YYYY-MM-DD）
 * @param endDate - 結束日期（YYYY-MM-DD）
 * @returns Map<日期, 收入金額>
 * 
 * @example
 * const dailyRevenue = await calculateDailyRevenue(markets, db, '2024-01-01', '2024-01-31');
 * console.log(`2024-01-15 收入: ${dailyRevenue.get('2024-01-15')} 元`);
 */
export async function calculateDailyRevenue(
  markets: Market[],
  db: MarketPulseDB,
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const revenueMap = new Map<string, number>();
  
  // 遍歷所有市集
  for (const market of markets) {
    // 獲取該市集的所有成交事件
    const events = await db.events
      .where('market_id')
      .equals(market.id!)
      .and(event => event.type === 'deal_closed')
      .toArray();
    
    // 處理每個成交事件
    for (const event of events) {
      const payload = event.payload as DealClosedPayload;
      
      // 確定成交日期
      let dealDate = payload.dealDate;
      
      // 若無 dealDate，從 timestamp 推算
      if (!dealDate) {
        const date = new Date(event.timestamp);
        dealDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      }
      
      // 檢查是否在日期範圍內
      if (dealDate < startDate || dealDate > endDate) {
        continue;
      }
      
      // 累加收入
      const totalAmount = payload.totalAmount || 0;
      revenueMap.set(
        dealDate,
        (revenueMap.get(dealDate) || 0) + totalAmount
      );
    }
  }
  
  return revenueMap;
}
