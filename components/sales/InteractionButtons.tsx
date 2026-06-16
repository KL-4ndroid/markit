'use client';

import { useState, useEffect, useRef } from 'react';
import { recordInteraction } from '@/lib/db/hooks';
import { toast } from 'sonner';
import { getInteractionButtons, type InteractionButton } from '@/lib/interaction-buttons-store';

interface InteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
}

interface FloatingAnimation {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

/**
 * 互動記錄按鈕組件
 * 用於記錄顧客互動行為（有興趣、有互動、轉換）
 * 
 * 特色：
 * - 飄浮 +1 動畫
 * - 光暈擴散效果
 * - 防連點機制（0.5秒間隔）
 */
export function InteractionButtons({ marketId, onInteractionRecorded }: InteractionButtonsProps) {
  const [buttons, setButtons] = useState<InteractionButton[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [floatingAnimations, setFloatingAnimations] = useState<FloatingAnimation[]>([]);
  const [clickingButton, setClickingButton] = useState<string | null>(null);
  const lastClickTime = useRef<number>(0);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // 載入按鈕配置
  useEffect(() => {
    setButtons(getInteractionButtons());

    // 監聽 storage 事件，當設定變更時更新按鈕
    const handleStorageChange = () => {
      setButtons(getInteractionButtons());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 處理互動記錄
  const handleInteraction = async (buttonId: string, label: string, emoji: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    // 防連點：0.5秒內不允許再次點擊
    if (timeSinceLastClick < 500) {
      toast.error('點擊太快囉 😵', {
        description: '請稍等一下再點擊',
        duration: 1000,
      });
      return;
    }

    if (isProcessing) return;

    lastClickTime.current = now;
    setIsProcessing(true);
    setClickingButton(buttonId);

    // 觸發飄浮動畫
    const buttonElement = buttonRefs.current[buttonId];
    if (buttonElement) {
      const rect = buttonElement.getBoundingClientRect();
      const animationId = `${buttonId}-${Date.now()}`;
      
      setFloatingAnimations(prev => [...prev, {
        id: animationId,
        emoji,
        x: rect.left + rect.width / 2,
        y: rect.top,
      }]);

      // 2秒後移除動畫
      setTimeout(() => {
        setFloatingAnimations(prev => prev.filter(a => a.id !== animationId));
      }, 2000);
    }

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
      setClickingButton(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-3 relative">
        {buttons.map((button) => (
          <button
            key={button.id}
            ref={(el) => { buttonRefs.current[button.id] = el; }}
            onClick={(e) => handleInteraction(button.id, button.label, button.emoji, e)}
            disabled={isProcessing}
            className={`
              relative overflow-hidden
              bg-white hover:bg-background 
              border-2 border-primary/20 rounded-xl p-4 
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed 
              shadow-sm hover:shadow-md
              ${clickingButton === button.id ? 'scale-95' : 'hover:scale-105'}
            `}
          >
            {/* 光暈效果 */}
            {clickingButton === button.id && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-primary/20 rounded-xl animate-ping" />
              </div>
            )}
            
            <div className="text-3xl mb-2 text-center relative z-10">{button.emoji}</div>
            <div className="text-sm font-medium text-foreground text-center relative z-10">
              {button.label}
            </div>
          </button>
        ))}
      </div>

      {/* 飄浮動畫容器 */}
      {floatingAnimations.map((animation) => (
        <div
          key={animation.id}
          className="fixed pointer-events-none z-[9999]"
          style={{
            left: animation.x,
            top: animation.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="animate-float-up">
            <div className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-full shadow-lg">
              <span className="text-xl">{animation.emoji}</span>
              <span className="text-sm font-bold">+1</span>
            </div>
          </div>
        </div>
      ))}

      {/* CSS 動畫定義 */}
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-30px) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translateY(-60px) scale(0.8);
            opacity: 0;
          }
        }

        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }
      `}</style>
    </>
  );
}
