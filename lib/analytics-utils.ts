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
  derivedMetrics: {
    interactionValue: number;  // 互動價值（每次互動的平均收入）
    dealQualityIndex: number;  // 成交質量指數（轉換率 × 客單價）
    efficiencyIndex: number;   // 效率指數（每小時淨利 ÷ 互動數）
  };
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

/**
 * 市集健康評分結果
 */
export interface MarketHealthScore {
  marketId: string;            // 市集 ID
  healthScore: number;         // 綜合評分（0-100）
  metrics: {
    hourlyProfit: number;      // 每小時淨利
    boothROI: number;          // 攤位費回收率
    conversionRate: number;    // 轉換率
    aov: number;               // 客單價
  };
  zScores: {
    hourlyProfitZ: number;     // 每小時淨利 Z-score
    boothROIZ: number;         // 攤位費回收率 Z-score
    conversionRateZ: number;   // 轉換率 Z-score
    aovZ: number;              // 客單價 Z-score
  };
  grade: 'S' | 'A' | 'B' | 'C' | 'D'; // 評級
}

/**
 * 市集診斷類型
 */
export type MarketDiagnosisType = 
  | "流量不足"
  | "轉換不足"
  | "客單價偏低"
  | "精準高效"
  | "均衡穩定";

/**
 * 市集診斷結果
 */
export interface MarketDiagnosis {
  marketId: string;            // 市集 ID
  diagnosisType: MarketDiagnosisType; // 診斷類型
}

/**
 * 市集總覽結果
 */
export interface MarketOverview {
  healthScore: number;         // 健康評分
  summaryLabel: string;        // 摘要標籤
  diagnosisType: string;       // 診斷類型
  suggestion: string;          // 改善建議
  keyStats: {
    hourlyProfit: number;      // 每小時淨利
    conversionRate: number;    // 轉換率
    aov: number;               // 客單價
  };
}

// ==================== 函數 1：計算市集指標 ====================

/**
 * 計算市集的轉換率和有效性
 * 
 * @param market - 市集資料
 * @returns 包含轉換率、有效性和衍生指標的物件
 * 
 * @example
 * const metrics = calculateMarketMetrics(market);
 * console.log(`轉換率: ${(metrics.conversionRate * 100).toFixed(2)}%`);
 * console.log(`互動價值: $${metrics.derivedMetrics.interactionValue.toFixed(2)}`);
 */
export function calculateMarketMetrics(market: Market): MarketMetrics {
  const totalInteractions = market.totalInteractions || 0;
  const totalDeals = market.totalDeals || 0;
  const totalRevenue = market.totalRevenue || 0;
  const totalProfit = market.totalProfit || 0;
  
  // 計算轉換率
  const conversionRate = totalInteractions > 0 ? totalDeals / totalInteractions : 0;
  
  // 計算客單價（AOV）
  const aov = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  
  // 計算每小時淨利
  const boothCost = market.boothCost || 0;
  const registrationFee = market.registrationFee || 0;
  const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
  const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
  const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
  const rentals = tableRental + chairRental + umbrellaRental;
  const commission = (totalRevenue * (market.commissionRate || 0)) / 100;
  const netProfit = totalProfit - boothCost - registrationFee - rentals - commission;
  
  // 計算營業時數
  let operatingHours = 0;
  if (market.operatingStartTime && market.operatingEndTime) {
    const [startHour, startMinute] = market.operatingStartTime.split(':').map(Number);
    const [endHour, endMinute] = market.operatingEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const dailyHours = (endMinutes - startMinutes) / 60;
    
    let days = 1;
    if (market.dates && market.dates.length > 0) {
      days = market.dates.length;
    } else {
      const startDate = new Date(market.startDate);
      const endDate = new Date(market.endDate);
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    operatingHours = dailyHours * days;
  }
  
  const hourlyProfit = operatingHours > 0 ? netProfit / operatingHours : 0;
  
  // 計算衍生指標
  // 1. 互動價值 = 總收入 ÷ 總互動數
  const interactionValue = totalInteractions > 0 ? totalRevenue / totalInteractions : 0;
  
  // 2. 成交質量指數 = 轉換率 × 客單價
  const dealQualityIndex = conversionRate * aov;
  
  // 3. 效率指數 = 每小時淨利 ÷ 總互動數
  const efficiencyIndex = totalInteractions > 0 ? hourlyProfit / totalInteractions : 0;
  
  // 若無互動數據，不適用於象限分析
  const isValidForQuadrant = totalInteractions > 0;
  
  return {
    conversionRate,
    isValidForQuadrant,
    derivedMetrics: {
      interactionValue,
      dealQualityIndex,
      efficiencyIndex,
    },
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

// ==================== 函數 9：建立市集總覽 ====================

/**
 * 建立市集的完整總覽資訊
 * 
 * 整合健康評分、摘要標籤、診斷類型和改善建議
 * 
 * @param market - 市集資料
 * @returns 市集總覽物件
 * 
 * @example
 * const overview = buildMarketOverview(market);
 * console.log(`評分: ${overview.healthScore} 分`);
 * console.log(`標籤: ${overview.summaryLabel}`);
 * console.log(`診斷: ${overview.diagnosisType}`);
 * console.log(`建議: ${overview.suggestion}`);
 */
export function buildMarketOverview(market: Market): MarketOverview {
  // 1. 計算健康評分
  const healthScores = calculateMarketHealthScores([market]);
  const healthScoreData = healthScores[0];
  const healthScore = healthScoreData ? healthScoreData.healthScore : 0;
  
  // 2. 取得摘要標籤
  const summaryLabel = getMarketSummaryLabel(healthScore);
  
  // 3. 計算診斷類型
  const diagnoses = calculateMarketDiagnosis([market]);
  const diagnosis = diagnoses[0];
  const diagnosisType = diagnosis ? diagnosis.diagnosisType : "均衡穩定";
  
  // 4. 取得改善建議
  const suggestion = getMarketSuggestion(diagnosisType);
  
  // 5. 提取關鍵統計數據
  const totalRevenue = market.totalRevenue || 0;
  const totalProfit = market.totalProfit || 0;
  const totalInteractions = market.totalInteractions || 0;
  const totalDeals = market.totalDeals || 0;
  const boothCost = market.boothCost || 0;
  const registrationFee = market.registrationFee || 0;
  
  const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
  const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
  const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
  const rentals = tableRental + chairRental + umbrellaRental;
  
  const commission = (totalRevenue * (market.commissionRate || 0)) / 100;
  const netProfit = totalProfit - boothCost - registrationFee - rentals - commission;
  
  // 計算營業時數
  let operatingHours = 0;
  if (market.operatingStartTime && market.operatingEndTime) {
    const [startHour, startMinute] = market.operatingStartTime.split(':').map(Number);
    const [endHour, endMinute] = market.operatingEndTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const dailyHours = (endMinutes - startMinutes) / 60;
    
    let days = 1;
    if (market.dates && market.dates.length > 0) {
      days = market.dates.length;
    } else {
      const startDate = new Date(market.startDate);
      const endDate = new Date(market.endDate);
      days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    operatingHours = dailyHours * days;
  }
  
  const hourlyProfit = operatingHours > 0 ? netProfit / operatingHours : 0;
  const conversionRate = totalInteractions > 0 ? (totalDeals / totalInteractions) * 100 : 0;
  const aov = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  
  return {
    healthScore,
    summaryLabel,
    diagnosisType,
    suggestion,
    keyStats: {
      hourlyProfit,
      conversionRate,
      aov,
    },
  };
}

// ==================== 函數 8：取得市集改善建議 ====================

/**
 * 根據診斷類型取得市集改善建議
 * 
 * @param type - 診斷類型
 * @returns 改善建議文字
 * 
 * @example
 * const suggestion = getMarketSuggestion("流量不足");
 * console.log(suggestion); // "建議優化攤位位置或提前宣傳"
 */
export function getMarketSuggestion(type: MarketDiagnosisType): string {
  switch (type) {
    case "流量不足":
      return "建議優化攤位位置或提前宣傳";
    case "轉換不足":
      return "建議優化銷售話術或定價";
    case "客單價偏低":
      return "可嘗試組合銷售提升單筆金額";
    case "精準高效":
      return "建議增加曝光或擴大備貨";
    case "均衡穩定":
      return "維持策略並持續觀察";
  }
}

// ==================== 函數 6：取得市集評分標籤 ====================

/**
 * 根據健康評分取得市集摘要標籤
 * 
 * 規則：
 * - score >= 65 → "值得再來"
 * - score >= 45 → "可優化"
 * - score < 45 → "謹慎評估"
 * 
 * @param score - 健康評分（0-100）
 * @returns 市集摘要標籤
 * 
 * @example
 * const label = getMarketSummaryLabel(75);
 * console.log(label); // "值得再來"
 */
export function getMarketSummaryLabel(score: number): "值得再來" | "可優化" | "謹慎評估" {
  if (score >= 65) {
    return "值得再來";
  }
  if (score >= 45) {
    return "可優化";
  }
  return "謹慎評估";
}

// ==================== 函數 7：市集診斷分析 ====================

/**
 * 診斷市集的經營問題並提供分類
 * 
 * 診斷類型：
 * - 流量不足：互動數低於平均 - 標準差
 * - 轉換不足：互動數高但轉換率低
 * - 客單價偏低：成交數高但客單價低
 * - 精準高效：互動數低但轉換率和客單價都高
 * - 均衡穩定：其他情況
 * 
 * @param markets - 市集陣列
 * @returns 市集診斷結果陣列
 * 
 * @example
 * const diagnoses = calculateMarketDiagnosis(markets);
 * console.log(`市集診斷: ${diagnoses[0].diagnosisType}`);
 */
export function calculateMarketDiagnosis(markets: Market[]): MarketDiagnosis[] {
  if (!markets || markets.length === 0) {
    return [];
  }

  // Step 1: 計算每個市集的指標
  interface MarketMetricsData {
    marketId: string;
    interaction: number;
    deals: number;
    revenue: number;
    conversionRate: number;
    aov: number;
  }

  const metricsData: MarketMetricsData[] = markets.map(market => {
    const interaction = market.totalInteractions || 0;
    const deals = market.totalDeals || 0;
    const revenue = market.totalRevenue || 0;
    const conversionRate = interaction > 0 ? (deals / interaction) : 0;
    const aov = deals > 0 ? (revenue / deals) : 0;

    return {
      marketId: market.id!,
      interaction,
      deals,
      revenue,
      conversionRate,
      aov,
    };
  });

  // Step 2: 計算全體平均值和標準差
  const calculateStats = (values: number[]) => {
    const n = values.length;
    if (n === 0) return { mean: 0, std: 0 };
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    if (n === 1) return { mean, std: 0 };
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    return { mean, std };
  };

  const interactions = metricsData.map(m => m.interaction);
  const deals = metricsData.map(m => m.deals);
  const conversionRates = metricsData.map(m => m.conversionRate);
  const aovs = metricsData.map(m => m.aov);

  const interactionStats = calculateStats(interactions);
  const dealStats = calculateStats(deals);
  const conversionStats = calculateStats(conversionRates);
  const aovStats = calculateStats(aovs);

  const avgInteraction = interactionStats.mean;
  const stdInteraction = interactionStats.std;
  const avgDeals = dealStats.mean;
  const avgConversion = conversionStats.mean;
  const avgAOV = aovStats.mean;

  // Step 3: 對每個市集進行診斷
  const results: MarketDiagnosis[] = metricsData.map(data => {
    let diagnosisType: MarketDiagnosisType;

    // 優先級 1：流量不足
    if (data.interaction < avgInteraction - stdInteraction) {
      diagnosisType = "流量不足";
    }
    // 優先級 2：精準高效
    else if (
      data.interaction < avgInteraction &&
      data.conversionRate > avgConversion &&
      data.aov > avgAOV
    ) {
      diagnosisType = "精準高效";
    }
    // 優先級 3：轉換不足
    else if (
      data.interaction > avgInteraction &&
      data.conversionRate < avgConversion
    ) {
      diagnosisType = "轉換不足";
    }
    // 優先級 4：客單價偏低
    else if (
      data.deals > avgDeals &&
      data.aov < avgAOV
    ) {
      diagnosisType = "客單價偏低";
    }
    // 其他：均衡穩定
    else {
      diagnosisType = "均衡穩定";
    }

    return {
      marketId: data.marketId,
      diagnosisType,
    };
  });

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

// ==================== 函數 5：計算市集健康評分 ====================

/**
 * 計算市集綜合健康評分（0-100 分）
 * 
 * 演算法：
 * 1. 計算四個核心指標：每小時淨利、攤位費回收率、轉換率、客單價
 * 2. 對每個指標進行 Z-score 標準化
 * 3. 加權計算綜合評分
 * 4. 轉換為 0-100 分制
 * 
 * 權重分配：
 * - 每小時淨利：40%（最重要）
 * - 攤位費回收率：20%
 * - 轉換率：20%
 * - 客單價：20%
 * 
 * @param markets - 市集陣列
 * @returns 市集健康評分陣列
 * 
 * @example
 * const scores = calculateMarketHealthScores(markets);
 * console.log(`市集評分: ${scores[0].healthScore.toFixed(1)} 分`);
 */
export function calculateMarketHealthScores(markets: Market[]): MarketHealthScore[] {
  if (!markets || markets.length === 0) {
    return [];
  }

  // Step 1: 計算每個市集的四個核心指標
  interface MarketMetricsData {
    marketId: string;
    hourlyProfit: number;
    boothROI: number;
    conversionRate: number;
    aov: number;
  }

  const metricsData: MarketMetricsData[] = markets.map(market => {
    // 1.1 計算每小時淨利
    const totalRevenue = market.totalRevenue || 0;
    const totalProfit = market.totalProfit || 0;
    const boothCost = market.boothCost || 0;
    const registrationFee = market.registrationFee || 0;
    
    const tableRental = market.tableFree ? 0 : (market.tableRental || 0);
    const chairRental = market.chairFree ? 0 : (market.chairRental || 0);
    const umbrellaRental = market.umbrellaFree ? 0 : (market.umbrellaRental || 0);
    const rentals = tableRental + chairRental + umbrellaRental;
    
    const commission = (totalRevenue * (market.commissionRate || 0)) / 100;
    const netProfit = totalProfit - boothCost - registrationFee - rentals - commission;
    
    // 計算營業時數
    let operatingHours = 0;
    if (market.operatingStartTime && market.operatingEndTime) {
      const [startHour, startMinute] = market.operatingStartTime.split(':').map(Number);
      const [endHour, endMinute] = market.operatingEndTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      const dailyHours = (endMinutes - startMinutes) / 60;
      
      let days = 1;
      if (market.dates && market.dates.length > 0) {
        days = market.dates.length;
      } else {
        const startDate = new Date(market.startDate);
        const endDate = new Date(market.endDate);
        days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
      
      operatingHours = dailyHours * days;
    }
    
    const hourlyProfit = operatingHours > 0 ? netProfit / operatingHours : 0;
    
    // 1.2 計算攤位費回收率
    const totalFixedCost = boothCost + rentals;
    const boothROI = totalFixedCost > 0 ? (totalRevenue / totalFixedCost) * 100 : 0;
    
    // 1.3 計算轉換率
    const totalInteractions = market.totalInteractions || 0;
    const totalDeals = market.totalDeals || 0;
    const conversionRate = totalInteractions > 0 ? (totalDeals / totalInteractions) * 100 : 0;
    
    // 1.4 計算客單價
    const aov = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    
    return {
      marketId: market.id!,
      hourlyProfit,
      boothROI,
      conversionRate,
      aov,
    };
  });

  // Step 2: 計算每個指標的平均值和標準差
  const calculateStats = (values: number[]) => {
    const n = values.length;
    if (n === 0) return { mean: 0, std: 0 };
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    if (n === 1) return { mean, std: 1 }; // 避免除以零
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const std = Math.sqrt(variance);
    
    return { mean, std: std === 0 ? 1 : std }; // 避免除以零
  };

  const hourlyProfits = metricsData.map(m => m.hourlyProfit);
  const boothROIs = metricsData.map(m => m.boothROI);
  const conversionRates = metricsData.map(m => m.conversionRate);
  const aovs = metricsData.map(m => m.aov);

  const hourlyProfitStats = calculateStats(hourlyProfits);
  const boothROIStats = calculateStats(boothROIs);
  const conversionRateStats = calculateStats(conversionRates);
  const aovStats = calculateStats(aovs);

  // Step 3: 計算 Z-score 並加權計算健康評分
  const results: MarketHealthScore[] = metricsData.map(data => {
    // 計算 Z-scores
    const hourlyProfitZ = (data.hourlyProfit - hourlyProfitStats.mean) / hourlyProfitStats.std;
    const boothROIZ = (data.boothROI - boothROIStats.mean) / boothROIStats.std;
    const conversionRateZ = (data.conversionRate - conversionRateStats.mean) / conversionRateStats.std;
    const aovZ = (data.aov - aovStats.mean) / aovStats.std;

    // 加權計算（權重：40%, 20%, 20%, 20%）
    const weightedScore = 
      (hourlyProfitZ * 0.4) +
      (boothROIZ * 0.2) +
      (conversionRateZ * 0.2) +
      (aovZ * 0.2);

    // 轉換為 0-100 分（使用 clamp 限制範圍）
    const healthScore = Math.max(0, Math.min(100, 50 + weightedScore * 10));

    // 評級
    let grade: 'S' | 'A' | 'B' | 'C' | 'D';
    if (healthScore >= 80) grade = 'S';
    else if (healthScore >= 70) grade = 'A';
    else if (healthScore >= 50) grade = 'B';
    else if (healthScore >= 30) grade = 'C';
    else grade = 'D';

    return {
      marketId: data.marketId,
      healthScore,
      metrics: {
        hourlyProfit: data.hourlyProfit,
        boothROI: data.boothROI,
        conversionRate: data.conversionRate,
        aov: data.aov,
      },
      zScores: {
        hourlyProfitZ,
        boothROIZ,
        conversionRateZ,
        aovZ,
      },
      grade,
    };
  });

  return results;
}
