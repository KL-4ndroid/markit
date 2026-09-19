/**
 * Unlock Logic - 功能解鎖邏輯
 * 
 * 根據市集場次數量決定各項分析功能的解鎖狀態
 */

export type FeatureType = 'BASIC_DIAGNOSIS' | 'STRATEGIC_COMPARISON' | 'BRAND_POSITIONING';

export interface UnlockMilestone {
  type: FeatureType;
  name: string;
  description: string;
  requiredCount: number;
}

export interface UnlockStatus {
  isUnlocked: boolean;
  progress: number; // 0-100
  remaining: number;
  milestone: UnlockMilestone;
}

// 定義解鎖里程碑
export const UNLOCK_MILESTONES: Record<FeatureType, UnlockMilestone> = {
  BASIC_DIAGNOSIS: {
    type: 'BASIC_DIAGNOSIS',
    name: '基礎診斷',
    description: '市集表現評分、核心 KPI 分析',
    requiredCount: 3,
  },
  STRATEGIC_COMPARISON: {
    type: 'STRATEGIC_COMPARISON',
    name: '深度對比',
    description: '市集象限分析、趨勢圖表',
    requiredCount: 8,
  },
  BRAND_POSITIONING: {
    type: 'BRAND_POSITIONING',
    name: '品牌定位',
    description: '商品關聯分析、精準推薦',
    requiredCount: 15,
  },
};

/**
 * 取得單一功能的解鎖狀態
 * 
 * @param marketCount - 當前市集場次數量
 * @param featureType - 功能類型
 * @returns 解鎖狀態資訊
 */
export function getFeatureUnlockStatus(
  marketCount: number,
  featureType: FeatureType
): UnlockStatus {
  const milestone = UNLOCK_MILESTONES[featureType];
  const isUnlocked = marketCount >= milestone.requiredCount;
  const remaining = Math.max(0, milestone.requiredCount - marketCount);
  const progress = Math.min(100, (marketCount / milestone.requiredCount) * 100);

  return {
    isUnlocked,
    progress,
    remaining,
    milestone,
  };
}

/**
 * 取得所有功能的解鎖狀態
 * 
 * @param marketCount - 當前市集場次數量
 * @returns 所有功能的解鎖狀態
 */
export function getUnlockStatus(marketCount: number): Record<FeatureType, UnlockStatus> {
  return {
    BASIC_DIAGNOSIS: getFeatureUnlockStatus(marketCount, 'BASIC_DIAGNOSIS'),
    STRATEGIC_COMPARISON: getFeatureUnlockStatus(marketCount, 'STRATEGIC_COMPARISON'),
    BRAND_POSITIONING: getFeatureUnlockStatus(marketCount, 'BRAND_POSITIONING'),
  };
}

/**
 * 取得數據可信度等級
 *
 * @param marketCount - 當前市集場次數量
 * @returns 可信度資訊（iconKey 由 UI 層對應到 Lucide icon）
 */
export function getDataReliability(marketCount: number): {
  level: 'insufficient' | 'medium' | 'high';
  label: string;
  iconKey: 'insufficient' | 'medium' | 'high';
  description: string;
} {
  if (marketCount < 3) {
    return {
      level: 'insufficient',
      label: '數據不足',
      iconKey: 'insufficient',
      description: '數據蒐集預熱中',
    };
  }

  if (marketCount < 5) {
    return {
      level: 'medium',
      label: '可信度：中',
      iconKey: 'medium',
      description: '試點診斷模式',
    };
  }

  return {
    level: 'high',
    label: '可信度：高',
    iconKey: 'high',
    description: '專業建模模式',
  };
}
