/**
 * Product Affinity Engine - 商品親和力分析引擎
 * 
 * 🔥 v3.3 架構升級：
 * - 使用 Lift 指標：更準確的關聯度分析
 * - Lift > 1.2 表示強關聯商品
 * - 支持度（Support）：在所有交易中的比例
 */

import type { Market, DealClosedPayload } from '@/types/db';
import type { MarketPulseDB } from '@/lib/db';
import type { ProductPair } from './types';

// ==================== 商品親和力引擎 ====================

/**
 * 計算商品之間的購買親和力（使用 Lift 指標）
 * 
 * 🔥 v3.3 優化：
 * - Lift 指標：lift(A,B) = P(A,B) / (P(A) × P(B))
 * - Lift > 1.2：強關聯商品（一起購買的機率比隨機高 20%）
 * - Lift ≈ 1.0：無關聯（隨機）
 * - Lift < 0.8：負關聯（很少一起購買）
 * 
 * 演算法：
 * 1. 遍歷所有成交事件
 * 2. 排除手動輸入的交易
 * 3. 找出同一筆交易中的商品配對
 * 4. 計算 Lift、Confidence、Support
 * 
 * @param markets - 市集陣列
 * @param db - Dexie 資料庫實例
 * @returns 商品配對陣列（按 Lift 降序排列）
 * 
 * @example
 * const pairs = await calculateProductAffinity(markets, db);
 * const strongPairs = pairs.filter(p => p.lift > 1.2);
 * console.log(`強關聯商品: ${strongPairs[0].productA} + ${strongPairs[0].productB}`);
 * console.log(`Lift: ${strongPairs[0].lift.toFixed(2)}`);
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
  
  // 用於統計單個商品出現次數
  const productCountMap = new Map<string, number>();
  
  // 總交易數（用於計算 Support）
  let totalTransactions = 0;
  
  // 🚀 效能優化：批次查詢所有市集的成交事件
  const marketIds = markets.map(m => m.id!).filter(Boolean);
  
  if (marketIds.length === 0) {
    return [];
  }
  
  // 一次性查出所有相關的成交事件
  const allEvents = await db.events
    .where('market_id')
    .anyOf(marketIds)
    .filter(event => event.type === 'deal_closed')
    .toArray();
  
  // 🚀 效能優化：收集所有需要查詢的商品 ID
  const productIdsToFetch = new Set<string>();
  for (const event of allEvents) {
    const payload = event.payload as DealClosedPayload;
    if (payload.isManualEntry || !payload.items || payload.items.length < 2) {
      continue;
    }
    for (const item of payload.items) {
      if (!item.product_name && item.productId) {
        productIdsToFetch.add(item.productId);
      }
    }
  }
  
  // 批次查詢所有需要的商品資料
  const productMap = new Map<string, string>();
  if (productIdsToFetch.size > 0) {
    const products = await db.products
      .where('id')
      .anyOf(Array.from(productIdsToFetch))
      .toArray();
    
    for (const product of products) {
      if (product.id && product.name) {
        productMap.set(product.id, product.name);
      }
    }
  }
  
  // 處理每個成交事件
  for (const event of allEvents) {
    const payload = event.payload as DealClosedPayload;
    
    // 排除手動輸入的交易
    if (payload.isManualEntry) {
      continue;
    }
    
    // 確保有交易項目
    if (!payload.items || !Array.isArray(payload.items) || payload.items.length < 2) {
      continue;
    }
    
    // 計入總交易數
    totalTransactions++;
    
    // 獲取商品名稱
    const productNames: string[] = [];
    for (const item of payload.items) {
      // 優先使用快照名稱
      let productName = item.product_name;
      
      // 若無快照，從預先載入的 productMap 中取得
      if (!productName && item.productId) {
        productName = productMap.get(item.productId);
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
  
  // 若無交易，返回空陣列
  if (totalTransactions === 0) {
    return [];
  }
  
  // 🔥 v3.3: 計算 Lift、Confidence、Support
  const results: ProductPair[] = Array.from(pairMap.values()).map(pair => {
    const countA = productCountMap.get(pair.productA) || 0;
    const countB = productCountMap.get(pair.productB) || 0;
    const pairCount = pair.count;
    
    // P(A) = 商品 A 出現的機率
    const probA = countA / totalTransactions;
    
    // P(B) = 商品 B 出現的機率
    const probB = countB / totalTransactions;
    
    // P(A,B) = 商品 A 和 B 同時出現的機率
    const probAB = pairCount / totalTransactions;
    
    // 🔥 Lift = P(A,B) / (P(A) × P(B))
    // Lift > 1.2：強關聯（一起購買的機率比隨機高 20%）
    // Lift ≈ 1.0：無關聯（隨機）
    // Lift < 0.8：負關聯（很少一起購買）
    const lift = (probA * probB) > 0 ? probAB / (probA * probB) : 0;
    
    // Confidence = P(B|A) = P(A,B) / P(A)
    // 信心度：買了 A 之後買 B 的機率
    const confidence = countA > 0 ? pairCount / countA : 0;
    
    // Support = P(A,B)
    // 支持度：在所有交易中的比例
    const support = probAB;
    
    return {
      productA: pair.productA,
      productB: pair.productB,
      coOccurrences: pairCount,
      confidence,
      lift,
      support,
    };
  });
  
  // 🔥 按 Lift 降序排列（優先推薦強關聯商品）
  results.sort((a, b) => b.lift - a.lift);
  
  return results;
}

/**
 * 篩選強關聯商品（Lift > 1.2）
 * 
 * @param pairs - 商品配對陣列
 * @param minLift - 最小 Lift 值（預設：1.2）
 * @returns 強關聯商品配對陣列
 */
export function filterStrongAssociations(
  pairs: ProductPair[],
  minLift: number = 1.2
): ProductPair[] {
  return pairs.filter(pair => pair.lift >= minLift);
}

/**
 * 取得商品推薦（基於 Lift 和 Support）
 * 
 * @param pairs - 商品配對陣列
 * @param minLift - 最小 Lift 值（預設：1.2）
 * @param minSupport - 最小 Support 值（預設：0.01，即 1%）
 * @returns 推薦商品配對陣列
 */
export function getProductRecommendations(
  pairs: ProductPair[],
  minLift: number = 1.2,
  minSupport: number = 0.01
): ProductPair[] {
  return pairs.filter(pair => 
    pair.lift >= minLift && pair.support >= minSupport
  );
}

// ==================== 每日收入分析 ====================

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
  
  // 🚀 效能優化：批次查詢所有市集的成交事件
  const marketIds = markets.map(m => m.id!).filter(Boolean);
  
  if (marketIds.length === 0) {
    return revenueMap;
  }
  
  // 一次性查出所有相關的成交事件
  const allEvents = await db.events
    .where('market_id')
    .anyOf(marketIds)
    .filter(event => event.type === 'deal_closed')
    .toArray();
  
  // 處理每個成交事件
  for (const event of allEvents) {
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
  
  return revenueMap;
}