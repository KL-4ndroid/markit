/**
 * Feature Unlock Guard - 功能解鎖守衛
 * 
 * 🎯 設計理念：漸進式披露 (Progressive Disclosure)
 * - 不是「藏起來」，而是「看得到卻吃不到」
 * - 使用玻璃擬態遮罩 (Glassmorphism Mask)
 * - 激勵用戶累積數據以解鎖進階功能
 * 
 * 視覺層級：
 * 1. 底層 (The Tease)：原本的內容，模糊化但可見
 * 2. 遮罩層 (The Mask)：半透明漸層，擋住具體數字
 * 3. 互動層 (The CTA)：鎖頭圖示、進度條、激勵文字
 */

import React from 'react';
import { Lock, Target, Lightbulb } from 'lucide-react';

// ==================== 解鎖里程碑定義 ====================

export const UNLOCK_MILESTONES = {
  BASIC_DIAGNOSIS: 3,      // 啟動基礎診斷（市集總覽、診斷卡片）
  STRATEGIC_COMPARISON: 8, // 啟動策略對比 & 排名（象限分析、健康評分排行）
  BRAND_POSITIONING: 15,   // 啟動品牌定位深度分析（商品親和力、每日收入趨勢）
} as const;

// ==================== 型別定義 ====================

interface FeatureUnlockGuardProps {
  /** 當前市集數量 */
  currentCount: number;
  
  /** 解鎖所需數量 */
  requiredCount: number;
  
  /** 功能名稱 */
  featureName: string;
  
  /** 功能描述（可選） */
  featureDescription?: string;
  
  /** 被保護的內容 */
  children: React.ReactNode;
  
  /** 自訂樣式類名（可選） */
  className?: string;
}

// ==================== 主組件 ====================

export default function FeatureUnlockGuard({
  currentCount,
  requiredCount,
  featureName,
  featureDescription,
  children,
  className = '',
}: FeatureUnlockGuardProps) {
  // 計算是否已解鎖
  const isLocked = currentCount < requiredCount;
  
  // 計算進度百分比
  const progress = Math.min((currentCount / requiredCount) * 100, 100);
  
  // 計算還需要多少場市集
  const remaining = Math.max(requiredCount - currentCount, 0);
  
  // 如果已解鎖，直接顯示內容
  if (!isLocked) {
    return <>{children}</>;
  }
  
  // 如果未解鎖，顯示遮罩
  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] ${className}`}>
      {/* 底層：被模糊的內容 (The Tease) */}
      <div className="blur-md select-none pointer-events-none opacity-40">
        {children}
      </div>
      
      {/* 遮罩層：玻璃擬態效果 (The Mask) */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/60 to-white/80 backdrop-blur-[2px]" />
      
      {/* 互動層：解鎖提示 (The CTA) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <div 
          className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border-2 border-secondary/30 max-w-sm w-full animate-in fade-in zoom-in duration-500"
          style={{
            boxShadow: '0 8px 32px rgba(123, 159, 166, 0.15), 0 2px 8px rgba(212, 165, 116, 0.1)',
          }}
        >
          {/* 鎖頭圖示 */}
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 blur-xl rounded-full" />
            <div className="relative bg-gradient-to-br from-secondary to-primary p-3 rounded-full mx-auto w-fit">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
          
          {/* 標題 */}
          <h3 className="font-bold text-lg text-foreground mb-2 text-center">
            解鎖「{featureName}」
          </h3>
          
          {/* 描述 */}
          {featureDescription && (
            <p className="text-xs text-muted-foreground mb-4 text-center leading-relaxed">
              {featureDescription}
            </p>
          )}
          
          {/* 激勵文字 */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-3 mb-4">
            <p className="text-sm text-foreground text-center">
              {remaining === 1 ? (
                <span className="inline-flex items-center gap-1.5 justify-center flex-wrap">
                  <span className="font-bold text-secondary">再 1 場市集</span>
                  <span>，系統即可為您精準建模</span>
                  <Target className="w-4 h-4 text-secondary" strokeWidth={1.75} />
                </span>
              ) : (
                <>
                  還差 <span className="font-bold text-secondary">{remaining} 場市集</span>數據
                  <br />
                  <span className="text-xs text-muted-foreground">系統需要足夠樣本才能提供準確分析</span>
                </>
              )}
            </p>
          </div>
          
          {/* 進度條 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">數據累積進度</span>
              <span className="font-bold text-primary">
                {currentCount} / {requiredCount}
              </span>
            </div>
            
            <div className="relative w-full bg-[#E8E8E8] h-3 rounded-full overflow-hidden">
              {/* 進度條背景漸層 */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#E8E8E8] to-[#D4D4D4]" />
              
              {/* 進度條填充 */}
              <div 
                className="relative h-full bg-gradient-to-r from-primary to-secondary transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              >
                {/* 光澤效果 */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
              </div>
            </div>
            
            {/* 百分比顯示 */}
            <div className="text-center">
              <span className="text-[10px] text-secondary font-bold">
                {progress.toFixed(0)}% 完成
              </span>
            </div>
          </div>
          
          {/* 底部提示 */}
          <div className="mt-4 pt-4 border-t border-[#E8E8E8]">
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed inline-flex items-center gap-1.5 justify-center w-full">
              <Lightbulb className="w-3 h-3 shrink-0" strokeWidth={1.75} />
              <span>繼續記錄市集數據，解鎖更多深度分析功能</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 便捷 Hook ====================

/**
 * 使用功能解鎖狀態
 * 
 * @param marketCount - 當前市集數量
 * @returns 各功能的解鎖狀態
 */
export function useFeatureUnlockStatus(marketCount: number) {
  return {
    basicDiagnosis: {
      isUnlocked: marketCount >= UNLOCK_MILESTONES.BASIC_DIAGNOSIS,
      progress: (marketCount / UNLOCK_MILESTONES.BASIC_DIAGNOSIS) * 100,
      remaining: Math.max(UNLOCK_MILESTONES.BASIC_DIAGNOSIS - marketCount, 0),
    },
    strategicComparison: {
      isUnlocked: marketCount >= UNLOCK_MILESTONES.STRATEGIC_COMPARISON,
      progress: (marketCount / UNLOCK_MILESTONES.STRATEGIC_COMPARISON) * 100,
      remaining: Math.max(UNLOCK_MILESTONES.STRATEGIC_COMPARISON - marketCount, 0),
    },
    brandPositioning: {
      isUnlocked: marketCount >= UNLOCK_MILESTONES.BRAND_POSITIONING,
      progress: (marketCount / UNLOCK_MILESTONES.BRAND_POSITIONING) * 100,
      remaining: Math.max(UNLOCK_MILESTONES.BRAND_POSITIONING - marketCount, 0),
    },
  };
}
