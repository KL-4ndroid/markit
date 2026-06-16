/**
 * 功能限制對話框
 * 
 * 當用戶達到免費版限制時顯示
 */

'use client';

import { Crown, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface FeatureLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  limitInfo?: string;
}

export function FeatureLimitDialog({
  isOpen,
  onClose,
  title,
  description,
  limitInfo,
}: FeatureLimitDialogProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* 對話框 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
        <div 
          className="bg-white rounded-[2rem] shadow-2xl max-w-md w-full p-8 pointer-events-auto animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 關閉按鈕 */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-soft-pink rounded-full transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          {/* 圖示 */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 mx-auto">
            <Crown className="w-10 h-10 text-white" />
          </div>

          {/* 標題 */}
          <h2 className="text-2xl font-bold text-foreground text-center mb-3">
            {title}
          </h2>

          {/* 描述 */}
          <p className="text-muted-foreground text-center mb-4">
            {description}
          </p>

          {/* 限制資訊 */}
          {limitInfo && (
            <div className="bg-soft-pink rounded-xl p-4 mb-6">
              <p className="text-sm text-foreground text-center">
                {limitInfo}
              </p>
            </div>
          )}

          {/* 專業版功能列表 */}
          <div className="bg-soft-green rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-foreground mb-3">
              升級至專業版即可享有：
            </p>
            <ul className="space-y-2">
              <li className="text-sm text-foreground flex items-center gap-2">
                <span className="text-primary">✓</span>
                無限市集數量
              </li>
              <li className="text-sm text-foreground flex items-center gap-2">
                <span className="text-primary">✓</span>
                無限商品管理
              </li>
              <li className="text-sm text-foreground flex items-center gap-2">
                <span className="text-primary">✓</span>
                雲端同步備份
              </li>
              <li className="text-sm text-foreground flex items-center gap-2">
                <span className="text-primary">✓</span>
                員工協作功能
              </li>
            </ul>
          </div>

          {/* 按鈕組 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-soft-pink text-foreground font-medium hover:bg-[#E8D8DA] transition-colors"
            >
              稍後再說
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-medium hover:shadow-lg transition-all"
            >
              立即升級
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
