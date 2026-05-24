import { Market } from '@/types/db';

/**
 * 決策引擎 v3.1 (優化版)
 * 
 * 核心功能：
 * 1. HealthScore v2.0 - P5/P95 標準化 + 自適應貝氏收縮
 * 2. MomentumScore - 趨勢分析（最近 3 場 vs 前 3 場）+ 除零保護
 * 3. ReAttendScore - 分段權重綜合決策
 * 4. PersonalizedROI - 個人化成本分析
 * 5. Decision - 智能決策建議
 * 
 * 優化重點：
 * - P5/P95 替代 min/max（抗極端值）
 * - 自適應貝氏收縮（m = 中位數場次）
 * - Momentum 除零保護（epsilon = globalAvg × 0.1）
 * - Regime-Based Weighting（分段權重）
 * - 個人化 ROI 層（成本維度）
 */

// ==================== 類型定義 ====================

export type DecisionType = 'STRONG_REATTEND' | 'OPTIMIZE' | 'AVOID';
export type TrendType = 'UP' | 'STABLE' | 'DOWN';
export type FinalDecisionType = 'GO' | 'CONSIDER' | 'SKIP';

export interface DecisionResult {
  healthScore: number;
  momentumScore: number;
  reAttendScore: number;
  decision: DecisionType;
  trend: TrendType;
}

interface MarketMetrics {
  hourlyProfit: number;
  boothROI: number;
  conversionRate: number;
  aov: number;
  interactionEfficiency: number;
  dealQualityIndex: number;
}

/**
 * 個人化成本上下文
 */
export interface PersonalContext {
  transportCost: number;      // 交通成本
  laborCost: number;          // 人力成本（時薪 × 人數 × 時數）
  opportunityCost: number;    // 機會成本
  inventoryCost: number;      // 備貨成本
  maxBoothFee: number;        // 可接受最高攤位費
  minHourlyProfit: number;    // 最低時薪要求
}

/**
 * 個人化 ROI 結果
 */
export interface PersonalizedROIResult {
  totalCost: number;          // 總成本
  netProfit: number;          // 淨利
  personalROI: number;        // 個人化 ROI (%)
  hourlyProfit: number;       // 實際時薪
  isWorthwhile: boolean;      // 是否值得
  reason: string;             // 原因說明
}

/**
 * 綜合決策結果
 */
export interface ComprehensiveDecisionResult {
  marketHealth: DecisionResult;           // 市場健康度
  personalROI: PersonalizedROIResult;     // 個人化 ROI
  finalDecision: FinalDecisionType;       // 最終決策
  finalReason: string;                    // 決策原因
  confidence: number;                     // 信心度 (0-100)
}

// ==================== 工具函數 ====================

/**
 * 限制數值在指定範圍內
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 計算百分位數
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(values.length * p);
  return sorted[Math.min(index, sorted.length - 1)];
}

/**
 * 計算中位數
 */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * 計算市集基礎指標
 */
function calculateMetrics(market: Market): MarketMetrics {
  const totalInteractions = market.totalInteractions || 0;
  const totalDeals = market.totalDeals || 0;
  const totalRevenue = market.totalRevenue || 0;
  const boothFee = market.boothCost || 0;
  const hours = 1;

  // 基礎指標
  const conversionRate = totalInteractions > 0 ? (totalDeals / totalInteractions) * 100 : 0;
  const aov = totalDeals > 0 ? totalRevenue / totalDeals : 0;
  const hourlyProfit = (totalRevenue - boothFee) / hours;
  const boothROI = boothFee > 0 ? (totalRevenue / boothFee) * 100 : 0;

  // 衍生指標
  const interactionEfficiency = totalInteractions > 0 ? hourlyProfit / totalInteractions : 0;
  const dealQualityIndex = conversionRate * aov;

  return {
    hourlyProfit,
    boothROI,
    conversionRate,
    aov,
    interactionEfficiency,
    dealQualityIndex,
  };
}

/**
 * 🔥 優化：P5/P95 標準化（替代 min/max）
 * 
 * 優勢：
 * - 抗極端值能力強
 * - 新市集不會壓縮整體分布
 * - 更穩定的評分系統
 * 
 * 公式：score = (value - p5) / (p95 - p5 + k) * 100
 * 其中 k = avg * 0.05
 */
function robustMinMaxNormalize(
  value: number,
  values: number[],
  smoothingFactor: number = 0.05
): number {
  if (values.length === 0) return 50;
  if (values.length === 1) return 50;

  // 使用 P5/P95 替代 min/max
  const p5 = percentile(values, 0.05);
  const p95 = percentile(values, 0.95);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  
  const k = avg * smoothingFactor;
  const range = p95 - p5 + k;

  if (range === 0) return 50;

  const normalized = ((value - p5) / range) * 100;
  return clamp(normalized, 0, 100);
}

/**
 * 🔥 優化：自適應貝氏收縮
 * 
 * 改進：
 * - m 不再固定為 5
 * - 使用全市場場次中位數作為 m
 * - 自適應 shrink 強度
 * 
 * 公式：adjusted = (value * n + prior * m) / (n + m)
 * 其中 m = median(市場場次)
 */
function adaptiveBayesianShrinkage(
  value: number,
  prior: number,
  sampleSize: number,
  allMarkets: Market[]
): number {
  // 計算每個市場的場次
  const marketCounts = allMarkets.reduce((acc, m) => {
    const key = `${m.name}-${m.location}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const counts = Object.values(marketCounts);
  
  // 使用中位數作為 m（最小為 3）
  const m = counts.length > 0 ? Math.max(median(counts), 3) : 5;
  
  return (value * sampleSize + prior * m) / (sampleSize + m);
}

// ==================== 核心計算函數 ====================

/**
 * 🔥 優化：HealthScore v2.0
 * 
 * 改進：
 * 1. P5/P95 標準化（替代 min/max）
 * 2. 自適應貝氏收縮（m = 中位數場次）
 * 
 * 步驟：
 * 1. 計算所有市集的指標
 * 2. P5/P95 標準化每個指標
 * 3. 應用自適應貝氏收縮
 * 4. 加權平均
 */
export function calculateHealthScore(
  market: Market,
  allMarkets: Market[],
  historicalAverage: number = 50
): number {
  if (allMarkets.length === 0) return 50;

  // 計算所有市集的指標
  const allMetrics = allMarkets.map(m => calculateMetrics(m));
  const currentMetrics = calculateMetrics(market);

  // 提取各指標的所有值
  const hourlyProfits = allMetrics.map(m => m.hourlyProfit);
  const boothROIs = allMetrics.map(m => m.boothROI);
  const conversionRates = allMetrics.map(m => m.conversionRate);
  const aovs = allMetrics.map(m => m.aov);
  const interactionEfficiencies = allMetrics.map(m => m.interactionEfficiency);
  const dealQualityIndexes = allMetrics.map(m => m.dealQualityIndex);

  // 🔥 使用 P5/P95 標準化
  const normalizedHourlyProfit = robustMinMaxNormalize(currentMetrics.hourlyProfit, hourlyProfits);
  const normalizedBoothROI = robustMinMaxNormalize(currentMetrics.boothROI, boothROIs);
  const normalizedConversionRate = robustMinMaxNormalize(currentMetrics.conversionRate, conversionRates);
  const normalizedAOV = robustMinMaxNormalize(currentMetrics.aov, aovs);
  const normalizedInteractionEfficiency = robustMinMaxNormalize(
    currentMetrics.interactionEfficiency,
    interactionEfficiencies
  );
  const normalizedDealQualityIndex = robustMinMaxNormalize(
    currentMetrics.dealQualityIndex,
    dealQualityIndexes
  );

  // 加權平均
  const weightedScore =
    normalizedHourlyProfit * 0.3 +
    normalizedBoothROI * 0.2 +
    normalizedConversionRate * 0.15 +
    normalizedAOV * 0.15 +
    normalizedInteractionEfficiency * 0.1 +
    normalizedDealQualityIndex * 0.1;

  // 🔥 自適應貝氏收縮
  const sampleSize = allMarkets.length;
  const adjustedScore = adaptiveBayesianShrinkage(weightedScore, historicalAverage, sampleSize, allMarkets);

  return clamp(adjustedScore, 0, 100);
}

/**
 * 🔥 優化：MomentumScore（加入除零保護）
 * 
 * 改進：
 * 1. 除零保護（epsilon = globalAvg × 0.1）
 * 2. 明確 clamp 到 0-100
 * 
 * 比較最近 3 場 vs 前 3 場的平均表現
 * 
 * 公式：
 * growth = (recentAvg - previousAvg) / (previousAvg + epsilon)
 * MomentumScore = clamp(50 + growth * 100, 0, 100)
 */
export function calculateMomentumScore(
  markets: Market[],
  allMarkets: Market[]
): number {
  // 按日期排序（最新在前）
  const sortedMarkets = [...markets].sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return dateB - dateA;
  });

  // 場次不足 6 場，返回中性分數
  if (sortedMarkets.length < 6) {
    return 50;
  }

  // 最近 3 場
  const recentMarkets = sortedMarkets.slice(0, 3);
  const recentScores = recentMarkets.map(m => calculateHealthScore(m, allMarkets));
  const recentAvg = recentScores.reduce((sum, s) => sum + s, 0) / recentScores.length;

  // 前 3 場
  const previousMarkets = sortedMarkets.slice(3, 6);
  const previousScores = previousMarkets.map(m => calculateHealthScore(m, allMarkets));
  const previousAvg = previousScores.reduce((sum, s) => sum + s, 0) / previousScores.length;

  // 🔥 計算全局平均作為 epsilon（防止除零）
  const globalAvg = allMarkets.reduce((sum, m) => {
    const score = calculateHealthScore(m, allMarkets);
    return sum + score;
  }, 0) / allMarkets.length;
  
  const epsilon = globalAvg * 0.1;

  // 🔥 除零保護
  const growth = (recentAvg - previousAvg) / (previousAvg + epsilon);
  
  // 🔥 明確 clamp
  const momentumScore = clamp(50 + growth * 100, 0, 100);

  return momentumScore;
}

/**
 * 🔥 優化：Regime-Based Weighting（分段權重）
 * 
 * 改進：
 * - 不再使用固定權重
 * - 根據 HealthScore 動態調整權重
 * 
 * 邏輯：
 * - 差市集（< 50）：趨勢更重要（是否在改善？）
 * - 中等市集（50-80）：平衡考量
 * - 優秀市集（> 80）：健康度更重要（趨勢影響小）
 * 
 * 公式：
 * ReAttendScore = HealthScore * healthWeight + MomentumScore * momentumWeight
 */
export function calculateReAttendScore(
  healthScore: number,
  momentumScore: number
): number {
  let healthWeight: number;
  let momentumWeight: number;
  
  // 🔥 分段權重
  if (healthScore < 50) {
    // 表現差：趨勢更重要（是否在改善？）
    healthWeight = 0.5;
    momentumWeight = 0.5;
  } else if (healthScore > 80) {
    // 表現優異：健康度更重要（趨勢影響小）
    healthWeight = 0.75;
    momentumWeight = 0.25;
  } else {
    // 中等表現：平衡權重
    healthWeight = 0.6;
    momentumWeight = 0.4;
  }
  
  const score = healthScore * healthWeight + momentumScore * momentumWeight;
  return clamp(score, 0, 100);
}

/**
 * 決策判斷
 * 
 * 規則：
 * - score >= 75 → STRONG_REATTEND
 * - 60 <= score < 75 → OPTIMIZE
 * - score < 60 → AVOID
 */
export function getDecision(reAttendScore: number): DecisionType {
  if (reAttendScore >= 75) return 'STRONG_REATTEND';
  if (reAttendScore >= 60) return 'OPTIMIZE';
  return 'AVOID';
}

/**
 * 趨勢判斷
 * 
 * 規則：
 * - momentumScore >= 55 → UP
 * - 45 <= momentumScore < 55 → STABLE
 * - momentumScore < 45 → DOWN
 */
export function getTrend(momentumScore: number): TrendType {
  if (momentumScore >= 55) return 'UP';
  if (momentumScore >= 45) return 'STABLE';
  return 'DOWN';
}

// ==================== 🔥 個人化 ROI 層 ====================

/**
 * 🔥 新增：個人化 ROI 計算
 * 
 * 目的：回答「這個市場值得我去嗎？」而非「這個市場好不好？」
 * 
 * 考慮因素：
 * - 場地成本（攤位費）
 * - 交通成本
 * - 人力成本
 * - 機會成本
 * - 備貨成本
 * 
 * @param market - 市集數據
 * @param context - 個人化成本上下文
 * @returns PersonalizedROIResult
 */
export function calculatePersonalizedROI(
  market: Market,
  context: PersonalContext
): PersonalizedROIResult {
  const totalRevenue = market.totalRevenue || 0;
  const boothFee = market.boothCost || 0;
  const hours = 1;

  // 總成本
  const totalCost = 
    boothFee +
    context.transportCost +
    context.laborCost +
    context.inventoryCost +
    context.opportunityCost;
  
  // 淨利
  const netProfit = totalRevenue - totalCost;
  
  // 個人化 ROI
  const personalROI = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  
  // 實際時薪
  const hourlyProfit = netProfit / hours;
  
  // 判斷是否值得
  let isWorthwhile = true;
  let reason = '符合個人條件';
  
  if (hourlyProfit < context.minHourlyProfit) {
    isWorthwhile = false;
    reason = `時薪 $${hourlyProfit.toFixed(0)} 低於要求 $${context.minHourlyProfit}`;
  } else if (boothFee > context.maxBoothFee) {
    isWorthwhile = false;
    reason = `攤位費 $${boothFee} 超過預算 $${context.maxBoothFee}`;
  } else if (personalROI <= 0) {
    isWorthwhile = false;
    reason = `預期虧損 $${Math.abs(netProfit).toFixed(0)}`;
  } else if (personalROI < 50) {
    isWorthwhile = false;
    reason = `ROI ${personalROI.toFixed(1)}% 過低（建議 > 50%）`;
  }
  
  return {
    totalCost,
    netProfit,
    personalROI,
    hourlyProfit,
    isWorthwhile,
    reason,
  };
}

/**
 * 🔥 新增：綜合決策分析
 * 
 * 整合市場健康度 + 個人化 ROI，給出最終決策
 * 
 * 決策矩陣：
 * - 市場優異 + 個人條件符合 → GO
 * - 市場不佳 或 個人條件不符 → SKIP
 * - 其他情況 → CONSIDER
 * 
 * @param market - 市集數據
 * @param allMarkets - 所有市集數據
 * @param context - 個人化成本上下文
 * @param historicalAverage - 歷史平均分數
 * @returns ComprehensiveDecisionResult
 */
export function comprehensiveDecision(
  market: Market,
  allMarkets: Market[],
  context: PersonalContext,
  historicalAverage: number = 50
): ComprehensiveDecisionResult {
  // 市場健康度分析
  const marketHealth = analyzeMarketDecision(market, allMarkets, historicalAverage);
  
  // 個人化 ROI 分析
  const personalROI = calculatePersonalizedROI(market, context);
  
  // 決策矩陣
  let finalDecision: FinalDecisionType;
  let finalReason: string;
  let confidence: number;
  
  if (marketHealth.decision === 'STRONG_REATTEND' && personalROI.isWorthwhile) {
    // 市場優異 + 個人條件符合
    finalDecision = 'GO';
    finalReason = `市場優異（${marketHealth.reAttendScore.toFixed(1)}分）且${personalROI.reason}`;
    confidence = Math.min(
      (marketHealth.reAttendScore + personalROI.personalROI) / 2,
      100
    );
  } else if (marketHealth.decision === 'AVOID' || !personalROI.isWorthwhile) {
    // 市場不佳 或 個人條件不符
    finalDecision = 'SKIP';
    if (!personalROI.isWorthwhile) {
      finalReason = personalROI.reason;
    } else {
      finalReason = `市場表現不佳（${marketHealth.reAttendScore.toFixed(1)}分）`;
    }
    confidence = 100 - Math.min(
      (marketHealth.reAttendScore + Math.max(personalROI.personalROI, 0)) / 2,
      100
    );
  } else {
    // 其他情況
    finalDecision = 'CONSIDER';
    
    if (marketHealth.trend === 'UP' && personalROI.personalROI > 30) {
      finalReason = `市場呈上升趨勢（${getTrendLabel(marketHealth.trend)}），可考慮參加`;
    } else if (marketHealth.decision === 'OPTIMIZE') {
      finalReason = `市場可優化（${marketHealth.reAttendScore.toFixed(1)}分），建議調整策略後參加`;
    } else {
      finalReason = '需要進一步評估市場條件和個人情況';
    }
    
    confidence = (marketHealth.reAttendScore + Math.max(personalROI.personalROI, 0)) / 2;
  }
  
  return {
    marketHealth,
    personalROI,
    finalDecision,
    finalReason,
    confidence: Math.round(confidence * 10) / 10,
  };
}

// ==================== 主要 API ====================

/**
 * 決策引擎主函數
 * 
 * @param market - 目標市集
 * @param allMarkets - 所有市集數據（用於計算相對表現）
 * @param historicalAverage - 歷史平均分數（用於貝氏收縮）
 * @returns DecisionResult
 */
export function analyzeMarketDecision(
  market: Market,
  allMarkets: Market[],
  historicalAverage: number = 50
): DecisionResult {
  // 計算 HealthScore
  const healthScore = calculateHealthScore(market, allMarkets, historicalAverage);

  // 計算 MomentumScore
  const momentumScore = calculateMomentumScore([market], allMarkets);

  // 計算 ReAttendScore
  const reAttendScore = calculateReAttendScore(healthScore, momentumScore);

  // 決策判斷
  const decision = getDecision(reAttendScore);

  // 趨勢判斷
  const trend = getTrend(momentumScore);

  return {
    healthScore: Math.round(healthScore * 10) / 10,
    momentumScore: Math.round(momentumScore * 10) / 10,
    reAttendScore: Math.round(reAttendScore * 10) / 10,
    decision,
    trend,
  };
}

/**
 * 批量分析所有市集
 * 
 * @param markets - 市集列表
 * @param historicalAverage - 歷史平均分數
 * @returns 每個市集的決策結果
 */
export function analyzeAllMarkets(
  markets: Market[],
  historicalAverage: number = 50
): Array<{ market: Market; result: DecisionResult }> {
  return markets.map(market => ({
    market,
    result: analyzeMarketDecision(market, markets, historicalAverage),
  }));
}

/**
 * 取得決策標籤（中文）
 */
export function getDecisionLabel(decision: DecisionType): string {
  const labels: Record<DecisionType, string> = {
    STRONG_REATTEND: '強烈推薦',
    OPTIMIZE: '可優化',
    AVOID: '謹慎評估',
  };
  return labels[decision];
}

/**
 * 取得趨勢標籤（中文）
 */
export function getTrendLabel(trend: TrendType): string {
  const labels: Record<TrendType, string> = {
    UP: '上升趨勢',
    STABLE: '穩定',
    DOWN: '下降趨勢',
  };
  return labels[trend];
}

/**
 * 取得決策顏色
 */
export function getDecisionColor(decision: DecisionType): string {
  const colors: Record<DecisionType, string> = {
    STRONG_REATTEND: 'text-green-600',
    OPTIMIZE: 'text-yellow-600',
    AVOID: 'text-red-600',
  };
  return colors[decision];
}

/**
 * 取得趨勢圖示
 */
export function getTrendIcon(trend: TrendType): string {
  const icons: Record<TrendType, string> = {
    UP: '📈',
    STABLE: '➡️',
    DOWN: '📉',
  };
  return icons[trend];
}

/**
 * 取得最終決策標籤（中文）
 */
export function getFinalDecisionLabel(decision: FinalDecisionType): string {
  const labels: Record<FinalDecisionType, string> = {
    GO: '立即參加',
    CONSIDER: '考慮參加',
    SKIP: '建議跳過',
  };
  return labels[decision];
}

/**
 * 取得最終決策顏色
 */
export function getFinalDecisionColor(decision: FinalDecisionType): string {
  const colors: Record<FinalDecisionType, string> = {
    GO: 'text-green-600',
    CONSIDER: 'text-yellow-600',
    SKIP: 'text-red-600',
  };
  return colors[decision];
}

/**
 * 取得最終決策圖示
 */
export function getFinalDecisionIcon(decision: FinalDecisionType): string {
  const icons: Record<FinalDecisionType, string> = {
    GO: '✅',
    CONSIDER: '🤔',
    SKIP: '❌',
  };
  return icons[decision];
}

/**
 * 取得信心度標籤
 */
export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return '非常確定';
  if (confidence >= 60) return '較為確定';
  if (confidence >= 40) return '中等信心';
  if (confidence >= 20) return '較不確定';
  return '不確定';
}

/**
 * 建立預設個人化上下文
 * 
 * 提供合理的預設值，用戶可以根據實際情況調整
 */
export function createDefaultPersonalContext(): PersonalContext {
  return {
    transportCost: 200,        // 預設交通成本 $200
    laborCost: 0,              // 預設無額外人力成本（自己一人）
    opportunityCost: 0,        // 預設無機會成本
    inventoryCost: 500,        // 預設備貨成本 $500
    maxBoothFee: 2000,         // 預設最高攤位費 $2000
    minHourlyProfit: 300,      // 預設最低時薪 $300
  };
}
