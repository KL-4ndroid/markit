'use client';

import { useState, useEffect } from 'react';
import { recordInteraction } from '@/lib/db/hooks';
import { toast } from 'sonner';
import { getQuickActionButtons, type QuickActionButton } from '@/lib/quick-actions-store';

interface InteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
}

/**
 * 互動記錄按鈕組件
 * 用於記錄顧客互動行為（詢問、試吃、拍照等）
 */
export function InteractionButtons({ marketId, onInteractionRecorded }: InteractionButtonsProps) {
  const [buttons, setButtons] = useState<QuickActionButton[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // 載入按鈕配置
  useEffect(() => {
    setButtons(getQuickActionButtons());

    // 監聽 storage 事件，當設定變更時更新按鈕
    const handleStorageChange = () => {
      setButtons(getQuickActionButtons());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 處理互動記錄
  const handleInteraction = async (buttonId: string, label: string, emoji: string) => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // 記錄互動事件
      await recordInteraction(marketId, buttonId);

      // 成功提示
      toast.success(`${emoji} ${label}`, {
        description: '互動已記錄',
        duration: 1500,
      });

      onInteractionRecorded?.();
    } catch (error) {
      console.error('記錄互動失敗：', error);
      toast.error('記錄失敗，請稍後再試');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {buttons.map((button) => (
        <button
          key={button.id}
          onClick={() => handleInteraction(button.id, button.label, button.emoji)}
          disabled={isProcessing}
          className="bg-white hover:bg-[#FAFAF8] active:scale-95 border-2 border-[#7B9FA6]/20 rounded-xl p-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
        >
          <div className="text-3xl mb-2 text-center">{button.emoji}</div>
          <div className="text-sm font-medium text-[#3A3A3A] text-center">
            {button.label}
          </div>
        </button>
      ))}
    </div>
  );
}
