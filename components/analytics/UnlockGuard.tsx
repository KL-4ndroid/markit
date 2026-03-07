'use client';

import { Lock } from 'lucide-react';
import { ReactNode } from 'react';

interface UnlockGuardProps {
  children: ReactNode;
  currentCount: number;
  requiredCount: number;
  featureName: string;
}

/**
 * UnlockGuard - 功能解鎖守衛組件
 * 
 * 使用 Glassmorphism 風格，未解鎖時顯示模糊遮罩和進度提示
 */
export function UnlockGuard({
  children,
  currentCount,
  requiredCount,
  featureName,
}: UnlockGuardProps) {
  const isUnlocked = currentCount >= requiredCount;
  const remaining = Math.max(0, requiredCount - currentCount);
  const progress = Math.min(100, (currentCount / requiredCount) * 100);

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* 底層內容（渲染但模糊） */}
      <div className="pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Glassmorphism 遮罩 */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-xl rounded-[1.5rem] z-10">
        <div className="text-center px-6 py-8 max-w-sm">
          {/* 鎖頭圖示 */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#D4A574] to-[#B8935F] rounded-full blur-xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-[#D4A574] to-[#B8935F] p-4 rounded-full shadow-lg">
                <Lock className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* 標題 */}
          <h3 className="text-lg font-medium text-[#3A3A3A] mb-2">
            {featureName}
          </h3>

          {/* 提示文字 */}
          <p className="text-sm text-[#6B6B6B] mb-4">
            還差 <span className="font-bold text-[#D4A574]">{remaining}</span> 場數據即可解鎖
          </p>

          {/* 進度條 */}
          <div className="w-full bg-[#E5E5E5] rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-[#7B9FA6] to-[#D4A574] rounded-full transition-all duration-700 ease-out relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              {/* 動畫光澤效果 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
            </div>
          </div>

          {/* 進度百分比 */}
          <p className="text-xs text-[#6B6B6B] mt-2">
            {currentCount} / {requiredCount} 場 ({progress.toFixed(0)}%)
          </p>
        </div>
      </div>

      {/* 添加動畫樣式 */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
