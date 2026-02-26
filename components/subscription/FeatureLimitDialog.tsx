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
            className="absolute top-6 right-6 p-2 hover:bg-[#F5E6E8] rounded-full transition-colors"
            aria-label="關閉"
          >
            <X className="w-5 h-5 text-[#6B6B6B]" />
          </button>

          {/* 圖示 */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] flex items-center justify-center mb-6 mx-auto">
            <Crown className="w-10 h-10 text-white" />
          </div>

          {/* 標題 */}
          <h2 className="text-2xl font-bold text-[#3A3A3A] text-center mb-3">
            {title}
          </h2>

          {/* 描述 */}
          <p className="text-[#6B6B6B] text-center mb-4">
            {description}
          </p>

          {/* 限制資訊 */}
          {limitInfo && (
            <div className="bg-[#F5E6E8] rounded-xl p-4 mb-6">
              <p className="text-sm text-[#3A3A3A] text-center">
                {limitInfo}
              </p>
            </div>
          )}

          {/* 專業版功能列表 */}
          <div className="bg-[#E8F3E8] rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-[#3A3A3A] mb-3">
              升級至專業版即可享有：
            </p>
            <ul className="space-y-2">
              <li className="text-sm text-[#3A3A3A] flex items-center gap-2">
                <span className="text-[#7B9FA6]">✓</span>
                無限市集數量
              </li>
              <li className="text-sm text-[#3A3A3A] flex items-center gap-2">
                <span className="text-[#7B9FA6]">✓</span>
                無限商品管理
              </li>
              <li className="text-sm text-[#3A3A3A] flex items-center gap-2">
                <span className="text-[#7B9FA6]">✓</span>
                雲端同步備份
              </li>
              <li className="text-sm text-[#3A3A3A] flex items-center gap-2">
                <span className="text-[#7B9FA6]">✓</span>
                員工協作功能
              </li>
            </ul>
          </div>

          {/* 按鈕組 */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-[#F5E6E8] text-[#3A3A3A] font-medium hover:bg-[#E8D8DA] transition-colors"
            >
              稍後再說
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#7B9FA6] to-[#D4A574] text-white font-medium hover:shadow-lg transition-all"
            >
              立即升級
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
