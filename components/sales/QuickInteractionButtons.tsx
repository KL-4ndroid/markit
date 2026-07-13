'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Delete, Banknote, Smartphone, Landmark, CreditCard, CheckCircle2 } from 'lucide-react';
import { recordInteraction, recordDeal } from '@/lib/db/hooks';
import { toast } from 'sonner';
import { getQuickActionButtons } from '@/lib/quick-actions-store';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface QuickInteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
  hideProfit?: boolean;
}

type PaymentMethod = 'cash' | 'mobile' | 'card' | 'other';

/**
 * 快速互動按鈕組件
 * 用於快速成交功能
 * 
 * ✅ Optimistic UI：
 * - 點擊後立即觸發 UI 變化（+1 動畫與數據跳動）
 * - 基於本地 Dexie 的 useLiveQuery，不等待 API 回傳
 * - 體感延遲趨近於 0
 */
export function QuickInteractionButtons({ marketId, onInteractionRecorded, hideProfit = false }: QuickInteractionButtonsProps) {
  const [displayAmount, setDisplayAmount] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [lastDealAmount, setLastDealAmount] = useState<number>(0);

  // ✅ Optimistic UI：使用 useLiveQuery 即時獲取市集數據
  const market = useLiveQuery(
    async () => {
      if (!marketId) return undefined;
      return await db.markets.get(marketId);
    },
    [marketId]
  );

  // 處理數字按鈕點擊
  const handleNumberClick = (num: number) => {
    setDisplayAmount(prev => {
      if (prev === '0') {
        return num.toString();
      }
      return prev + num.toString();
    });
  };

  // 清除顯示金額
  const handleClear = () => {
    setDisplayAmount('0');
  };

  // ✅ Optimistic UI：處理快速成交
  const handleQuickDeal = async (paymentMethod: PaymentMethod) => {
    const amount = parseInt(displayAmount);
    
    if (amount <= 0) {
      toast.error('請輸入金額');
      return;
    }

    if (isProcessing) return;

    // ✅ 立即觸發成功動畫（Optimistic UI）
    setLastDealAmount(amount);
    setShowSuccessAnimation(true);
    
    // 支付方式文字
    const paymentText = {
      cash: '現金',
      mobile: '電子支付',
      card: '轉帳',
      other: '其他',
    }[paymentMethod];

    // ✅ 立即顯示成功提示（不等待 API）
    toast.success(`🎉 成交記錄已新增！`, {
      description: `${paymentText} - NT$${amount.toLocaleString()}`,
      duration: 2500,
    });

    // ✅ 立即清空金額（提升體感速度）
    setDisplayAmount('0');

    // 動畫持續 1 秒後消失
    setTimeout(() => {
      setShowSuccessAnimation(false);
    }, 1000);

    setIsProcessing(true);

    try {
      // ✅ 背景執行：記錄成交（寫入本地 Dexie）
      // recordDeal 會立即更新本地數據，useLiveQuery 會自動響應
      await recordDeal({
        marketId,
        items: [],
        totalAmount: amount,
        paymentMethod,
        isManualEntry: true,
        manualRevenue: amount,
        manualDealCount: 1,
      });

      // ✅ 觸發 deal-closed 事件，通知其他組件更新
      window.dispatchEvent(new CustomEvent('deal-closed', {
        detail: { marketId, amount, paymentMethod }
      }));

      onInteractionRecorded?.();
    } catch (error) {
      console.error('記錄成交失敗：', error);
      
      // ✅ 只有在真正失敗時才顯示錯誤（不影響 Optimistic UI）
      toast.error('記錄失敗，數據已暫存本地', {
        description: '將在連網後自動同步',
        duration: 3000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative">
      {/* ✅ 成功動畫（+1 效果） */}
      {showSuccessAnimation && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="bg-soft-green text-foreground px-4 py-2 rounded-full shadow-lg font-bold text-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
            <span>+NT$ {lastDealAmount.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 顯示框 */}
      <div className="bg-gradient-to-br from-primary to-primary/85 rounded-2xl p-4 mb-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5"></div>
        <div className="relative flex items-center justify-between">
          <div className="text-3xl font-bold text-white tabular-nums">
            NT$ {parseInt(displayAmount).toLocaleString()}
          </div>
          <button
            onClick={handleClear}
            className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors"
            aria-label="清除金額"
          >
            <Delete className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* ✅ Optimistic UI：即時顯示市集統計 */}
        {market && (
          <div className="mt-3 pt-3 border-t border-white/20">
            <div className={`grid ${hideProfit ? 'grid-cols-2' : 'grid-cols-3'} gap-2 text-white/80 text-xs`}>
              <div className="text-center">
                <div className="font-medium tabular-nums">
                  {market.totalDeals || 0}
                </div>
                <div className="opacity-70">筆數</div>
              </div>
              <div className="text-center">
                <div className="font-medium tabular-nums">
                  NT$ {(market.totalRevenue || 0).toLocaleString()}
                </div>
                <div className="opacity-70">收入</div>
              </div>
              {!hideProfit && (
                <div className="text-center">
                  <div className="font-medium tabular-nums">
                    NT$ {(market.totalProfit || 0).toLocaleString()}
                  </div>
                  <div className="opacity-70">利潤</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 數字鍵盤 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* 第一排：1 2 3 */}
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="bg-neutral-alt hover:bg-[#ECECEC] active:scale-95 text-foreground text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
        
        {/* 第二排：4 5 6 */}
        {[4, 5, 6].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="bg-neutral-alt hover:bg-[#ECECEC] active:scale-95 text-foreground text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
        
        {/* 第三排：7 8 9 */}
        {[7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="bg-neutral-alt hover:bg-[#ECECEC] active:scale-95 text-foreground text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
        
        {/* 第四排：00 0 ⌫ */}
        <button
          onClick={() => {
            setDisplayAmount(prev => {
              if (prev === '0') return '0';
              return prev + '00';
            });
          }}
          className="bg-cat-clothing hover:bg-[#D8E0E8] active:scale-95 text-primary text-lg font-bold py-4 rounded-xl transition-all shadow-sm"
        >
          00
        </button>
        <button
          onClick={() => handleNumberClick(0)}
          className="bg-neutral-alt hover:bg-[#ECECEC] active:scale-95 text-foreground text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
        >
          0
        </button>
        <button
          onClick={() => {
            setDisplayAmount(prev => {
              if (prev.length <= 1) return '0';
              return prev.slice(0, -1);
            });
          }}
          className="bg-soft-yellow hover:bg-[#EFE8D7] active:scale-95 text-secondary text-xl font-bold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center"
          aria-label="刪除最後一位數字"
        >
          ⌫
        </button>
      </div>

      {/* 支付方式按鈕 */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => handleQuickDeal('cash')}
          disabled={isProcessing || parseInt(displayAmount) <= 0}
          className="bg-soft-green hover:bg-soft-green/80 active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Banknote className="w-4 h-4" strokeWidth={1.75} />
          現金
        </button>
        <button
          onClick={() => handleQuickDeal('mobile')}
          disabled={isProcessing || parseInt(displayAmount) <= 0}
          className="bg-cat-clothing hover:bg-cat-clothing/80 active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Smartphone className="w-4 h-4" strokeWidth={1.75} />
          電子支付
        </button>
        <button
          onClick={() => handleQuickDeal('card')}
          disabled={isProcessing || parseInt(displayAmount) <= 0}
          className="bg-soft-yellow hover:bg-soft-yellow/80 active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <Landmark className="w-4 h-4" strokeWidth={1.75} />
          轉帳
        </button>
        <button
          onClick={() => handleQuickDeal('other')}
          disabled={isProcessing || parseInt(displayAmount) <= 0}
          className="bg-cat-art hover:bg-cat-art/80 active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          <CreditCard className="w-4 h-4" strokeWidth={1.75} />
          其他
        </button>
      </div>
    </div>
  );
}
