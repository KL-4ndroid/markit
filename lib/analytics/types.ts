/**
 * Analytics Types - 分析系統型別定義
 * 
 * 🔥 v3.3 架構升級：統一型別定義
 */

import type { Market } from '@/types/db';

export type { Market } from '@/types/db';

// ==================== 批次補登偵測 ====================

/**
 * 批次補登警告
 * 🔥 v3.4: 啟發式數據拆解 (Heuristic Deconstruction)
 */
export interface BatchEntryWarning {
  eventId: string;                 // 事件 ID
  originalDealCount: number;       // 原始記錄的成交次數
  estimatedDealCount: number;      // 系統預估的成交次數
  amount: number;                  // 補登金額
  historicalMedianAOV: number;     // 歷史中位數客單價
  confidence: 'high' | 'medium' | 'low'; // 預估信心度
  reason: string;                  // 偵測原因
}

/**
 * 批次補登偵測結果
 */
export interface BatchEntryDetectionResult {
  isBatchEntry: boolean;           // 是否為批次補登
  estimatedDealCount: number;      // 預估成交次數
  historicalMedianAOV: number;     // 歷史中位數客單價
  actualAmount: number;            // 實際補登金額
  confidence: 'high' | 'medium' | 'low'; // 預估信心度
  reason: string;                  // 偵測原因
}

// ==================== 市集指標 ====================

/**
 * 市集指標計算結果
 * 🔥 v3.3: 加入 confidence score
 * 🔥 v3.4: 加入批次補登警告
 */
export interface MarketMetrics {
  // 核心指標
  uniqueEngaged: number;       // 有效互動人數（max 值）
  totalDeals: number;          // 成交數
  totalRevenue: number;        // 總收入
  totalProfit: number;         // 總利潤
  netProfit: number;           // 淨利（扣除所有成本）
  
  // 效率指標
  conversionRate: number;      // 轉換率（0-1）- Laplace 平滑
  conversionRateRaw: number;   // 原始轉換率（不平滑）
  aov: number;                 // 客單價（Average Order Value）
  hourlyProfit: number;        // 每小時淨利
  boothROI: number;            // 攤位費回收率（%）
  
  // 營運數據
  operatingHours: number;      // 總營業時數
  totalFixedCost: number;      // 總固定成本（攤位費 + 租金）
  totalVariableCost: number;   // 總變動成本（抽成）
  
  // 互動行為細節
  behavior1Count: number;      // 行為 1 數量
  behavior2Count: number;      // 行為 2 數量
  behavior3Count: number;      // 行為 3 數量
  
  // 衍生指標
  derivedMetrics: {
    interactionValue: number;  // 互動價值（每次互動的平均收入）
    dealQualityIndex: number;  // 成交質量指數（轉換率 × 客單價）
    efficiencyIndex: number;   // 效率指數（每小時淨利 ÷ 互動數）
  };
  
  // 🔥 v3.3 新增：可信度評估
  confidenceScore: number;     // 可信度評分（0-1）
  confidenceLevel: '高' | '中' | '低'; // 可信度等級
  
  // 🔥 v3.4 新增：批次補登警告
  batchEntryWarnings?: BatchEntryWarning[]; // 批次補登警告列表
  usedHeuristicCorrection?: boolean;        // 是否使用了啟發式修正
  
  // 有效性標記
  isValidForQuadrant: boolean; // 是否有效用於象限分析
}

// ==================== 象限分析 ====================

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

// ==================== 健康評分 ====================

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

// ==================== 診斷分析 ====================

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

// ==================== 市集總覽 ====================

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

// ==================== 完整分析結果 ====================

/**
 * 完整市集分析結果
 * 🔥 v3.3: 一次性計算所有分析結果，避免重複計算
 */
export interface MarketAnalytics {
  marketId: string;
  metrics: MarketMetrics;              // 核心指標
  healthScore: MarketHealthScore;      // 健康評分
  diagnosis: MarketDiagnosis;          // 診斷結果
  quadrant?: 'star' | 'potential' | 'precise' | 'observable'; // 象限分類
  overview: MarketOverview;            // 總覽資訊
}

// ==================== 商品親和力 ====================

/**
 * 商品配對結果
 * 🔥 v3.3: 加入 Lift 指標
 */
export interface ProductPair {
  productA: string;            // 商品 A 名稱
  productB: string;            // 商品 B 名稱
  coOccurrences: number;       // 共同出現次數
  confidence: number;          // 信心度（0-1）
  lift: number;                // 🔥 v3.3: Lift 指標（> 1.2 表示強關聯）
  support: number;             // 支持度（在所有交易中的比例）
}
