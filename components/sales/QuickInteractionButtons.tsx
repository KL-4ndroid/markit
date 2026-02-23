'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Delete } from 'lucide-react';
import { recordInteraction, recordDeal } from '@/lib/db/hooks';
import { toast } from 'sonner';
import { getQuickActionButtons } from '@/lib/quick-actions-store';
import { db } from '@/lib/db';

interface QuickInteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
}

type PaymentMethod = 'cash' | 'mobile' | 'card' | 'other';

/**
 * 快速互動按鈕組件
 * 用於快速成交功能
 */
export function QuickInteractionButtons({ marketId, onInteractionRecorded }: QuickInteractionButtonsProps) {
  const [displayAmount, setDisplayAmount] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);

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

  // 處理快速成交
  const handleQuickDeal = async (paymentMethod: PaymentMethod) => {
    const amount = parseInt(displayAmount);
    
    if (amount <= 0) {
      toast.error('請輸入金額');
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // 記錄成交（簡化模式）
      await recordDeal({
        marketId,
        items: [],
        totalAmount: amount,
        paymentMethod,
        isManualEntry: true,
        manualRevenue: amount,
        manualDealCount: 1,
      });

      // 支付方式文字
      const paymentText = {
        cash: '現金',
        mobile: '電子支付',
        card: '轉帳',
        other: '其他',
      }[paymentMethod];

      // 成功提示
      toast.success(`🎉 成交記錄已新增！`, {
        description: `${paymentText} - NT$${amount.toLocaleString()}`,
        duration: 2500,
      });

      // ✅ 觸發 deal-closed 事件，通知其他組件更新
      window.dispatchEvent(new CustomEvent('deal-closed', {
        detail: { marketId, amount, paymentMethod }
      }));

      // 清空金額
      setDisplayAmount('0');

      onInteractionRecorded?.();
    } catch (error) {
      console.error('記錄成交失敗：', error);
      toast.error('記錄失敗，請稍後再試');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {/* 顯示框 */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#6A8E95] rounded-2xl p-4 mb-3 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/5"></div>
        <div className="relative flex items-center justify-between">
          <div className="text-3xl font-bold text-white">
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
      </div>

      {/* 數字鍵盤 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* 第一排：1 2 3 */}
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="bg-[#F5F5F0] hover:bg-[#ECECEC] active:scale-95 text-[#3A3A3A] text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
        
        {/* 第二排：4 5 6 */}
        {[4, 5, 6].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="bg-[#F5F5F0] hover:bg-[#ECECEC] active:scale-95 text-[#3A3A3A] text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
          >
            {num}
          </button>
        ))}
        
        {/* 第三排：7 8 9 */}
        {[7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num)}
            className="bg-[#F5F5F0] hover:bg-[#ECECEC] active:scale-95 text-[#3A3A3A] text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
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
          className="bg-[#E8F0F8] hover:bg-[#D8E0E8] active:scale-95 text-[#7B9FA6] text-lg font-bold py-4 rounded-xl transition-all shadow-sm"
        >
          00
        </button>
        <button
          onClick={() => handleNumberClick(0)}
          className="bg-[#F5F5F0] hover:bg-[#ECECEC] active:scale-95 text-[#3A3A3A] text-xl font-medium py-4 rounded-xl transition-all shadow-sm"
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
          className="bg-[#FFF8E7] hover:bg-[#EFE8D7] active:scale-95 text-[#D4A574] text-xl font-bold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center"
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
          className="bg-[#E8F3E8] hover:bg-[#D8E3D8] active:scale-95 text-[#3A3A3A] py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          💵 現金
        </button>
        <button
          onClick={() => handleQuickDeal('mobile')}
          disabled={isProcessing || parseInt(displayAmount) <= 0}
          className="bg-[#E8F0F8] hover:bg-[#D8E0E8] active:scale-95 text-[#3A3A3A] py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📱 電子支付
        </button>
        <button
          onClick={() => handleQuickDeal('card')}
          disabled={isProcessing || parseInt(displayAmount) <= 0}
          className="bg-[#FFF8E7] hover:bg-[#EFE8D7] active:scale-95 text-[#3A3A3A] py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🏦 轉帳
        </button>
        <button
          onClick={() => handleQuickDeal('other')}
          disabled={isProcessing || parseInt(displayAmount) <= 0}
          className="bg-[#F8E8F0] hover:bg-[#E8D8E0] active:scale-95 text-[#3A3A3A] py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          💳 其他
        </button>
      </div>
    </div>
  );
}
