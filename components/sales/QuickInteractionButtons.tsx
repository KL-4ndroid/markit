'use client';

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { recordInteraction } from '@/lib/db/hooks';
import { toast } from 'sonner';
import { getQuickActionButtons } from '@/lib/quick-actions-store';
import { QuickDealModal } from './QuickDealModal';
import { db } from '@/lib/db';

interface QuickInteractionButtonsProps {
  marketId: number;
  onInteractionRecorded?: () => void;
}

/**
 * 快速互動按鈕組件
 * 用於一鍵記錄顧客互動 + 快速成交
 */
export function QuickInteractionButtons({ marketId, onInteractionRecorded }: QuickInteractionButtonsProps) {
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [animatingButton, setAnimatingButton] = useState<string | null>(null);
  const [showQuickDeal, setShowQuickDeal] = useState(false);
  const [customButtons, setCustomButtons] = useState<any[]>([]);
  const [interactionCounts, setInteractionCounts] = useState<Record<string, number>>({});

  // 初始化和監聽設置變更
  useEffect(() => {
    // 初始加載
    setCustomButtons(getQuickActionButtons());

    const handleStorageChange = () => {
      setCustomButtons(getQuickActionButtons());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 載入互動次數統計
  useEffect(() => {
    const loadInteractionCounts = async () => {
      try {
        // 獲取該市集的所有互動事件
        const events = await db.events
          .where('type')
          .equals('interaction_recorded')
          .toArray();
        
        // 篩選該市集的事件
        const marketEvents = events.filter(e => e.payload?.marketId === marketId);
        
        // 統計每種互動類型的次數
        const counts: Record<string, number> = {};
        marketEvents.forEach(event => {
          const type = event.payload?.type;
          if (type) {
            counts[type] = (counts[type] || 0) + 1;
          }
        });
        
        setInteractionCounts(counts);
      } catch (error) {
        console.error('載入互動統計失敗：', error);
      }
    };

    loadInteractionCounts();
  }, [marketId]);

  // 處理互動記錄
  const handleInteraction = async (buttonId: string, label: string, emoji: string) => {
    setActiveButton(buttonId);
    setAnimatingButton(buttonId);

    try {
      // 記錄互動，使用按鈕 ID 作為互動類型
      await recordInteraction(marketId, buttonId);

      // 更新本地計數
      setInteractionCounts(prev => ({
        ...prev,
        [buttonId]: (prev[buttonId] || 0) + 1,
      }));

      // 顯示 +1 動畫效果
      setTimeout(() => {
        setAnimatingButton(null);
      }, 600);

      // 成功提示
      toast.success(`${emoji} ${label} +1`, {
        duration: 1500,
      });

      onInteractionRecorded?.();
    } catch (error) {
      console.error('記錄互動失敗：', error);
      toast.error('記錄失敗，請稍後再試');
    } finally {
      setTimeout(() => {
        setActiveButton(null);
      }, 300);
    }
  };

  const colors = ['bg-[#E8F0F8]', 'bg-[#FFF8E7]', 'bg-[#F8E8F0]'];

  // 如果按鈕還沒加載，顯示加載狀態
  if (customButtons.length === 0) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-gray-100 animate-pulse"
          >
            <div className="h-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        {/* 自訂互動按鈕 */}
        {customButtons.map((button, index) => {
          const isActive = activeButton === button.id;
          const isAnimating = animatingButton === button.id;
          const count = interactionCounts[button.id] || 0;

          return (
            <button
              key={button.id}
              onClick={() => handleInteraction(button.id, button.label, button.emoji)}
              disabled={isActive}
              className={`relative p-4 rounded-2xl transition-all ${colors[index]} ${
                isActive ? 'scale-95' : 'hover:scale-105 active:scale-95'
              } disabled:cursor-not-allowed`}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="text-3xl">{button.emoji}</div>
                  
                  {/* +1 動畫 */}
                  {isAnimating && (
                    <div className="absolute -top-2 -right-2 text-[#7B9FA6] font-bold text-lg animate-bounce-up">
                      +1
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <div className="text-xs font-medium text-[#3A3A3A]">
                    {button.label}
                  </div>
                  {count > 0 && (
                    <div className="text-xs text-[#7B9FA6] font-medium mt-0.5">
                      ({count})
                    </div>
                  )}
                </div>
              </div>

              {/* 點擊波紋效果 */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-white/30 animate-ping" />
              )}
            </button>
          );
        })}

        {/* 快速成交按鈕 */}
        <button
          onClick={() => setShowQuickDeal(true)}
          className="relative p-4 rounded-2xl transition-all bg-gradient-to-br from-[#7B9FA6] to-[#6A8E95] hover:scale-105 active:scale-95"
        >
          <div className="flex flex-col items-center gap-2">
            <DollarSign className="w-8 h-8 text-white" />
            <span className="text-xs font-medium text-white">
              快速成交
            </span>
          </div>
        </button>
      </div>

      {/* 快速成交彈窗 */}
      <QuickDealModal
        isOpen={showQuickDeal}
        onClose={() => setShowQuickDeal(false)}
        marketId={marketId}
        onSuccess={onInteractionRecorded}
      />
    </>
  );
}
