'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X, DollarSign } from 'lucide-react';
import { recordDeal } from '@/lib/db/hooks';
import { toast } from 'sonner';

interface QuickDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;  // ✅ 改為 string（UUID）
  onSuccess?: () => void;
}

type PaymentMethod = 'cash' | 'card' | 'mobile' | 'other';

/**
 * 快速成交彈窗
 * 不帶入商品，直接輸入金額完成交易
 */
export function QuickDealModal({ isOpen, onClose, marketId, onSuccess }: QuickDealModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const paymentMethods = [
    { value: 'cash' as PaymentMethod, label: '現金', emoji: '💵' },
    { value: 'mobile' as PaymentMethod, label: 'LINE Pay', emoji: '💳' },
    { value: 'card' as PaymentMethod, label: '轉帳', emoji: '🏦' },
    { value: 'other' as PaymentMethod, label: '其他', emoji: '💰' },
  ];

  // 處理支付方式選擇並直接提交
  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('請先輸入有效的金額');
      return;
    }

    setIsSubmitting(true);

    try {
      // ✅ 使用 recordDeal 函數（會自動處理事件溯源）
      await recordDeal({
        marketId,
        items: [], // 快速成交不帶商品
        totalAmount: amountNum,
        paymentMethod: method,
        notes: '快速成交',
      });

      const methodLabel = paymentMethods.find(m => m.value === method)?.label || '未知';
      toast.success('💰 成交成功！', {
        description: `${methodLabel} - $${amountNum.toLocaleString()}`,
      });

      // 重置表單
      setAmount('');
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('快速成交失敗：', error);
      toast.error('成交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* 彈窗容器 */}
      <div className="fixed inset-0 flex items-center justify-center p-6">
        <DialogPanel className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-medium text-foreground flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              快速成交
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-soft-pink transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* 表單 */}
          <div>
            {/* 金額輸入 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                成交金額 <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                  $
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="1"
                  className="w-full pl-8 pr-4 py-3 border-2 border-primary/15 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg font-medium"
                  autoFocus
                />
              </div>
            </div>

            {/* 支付方式 - 點擊直接提交 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                選擇支付方式完成交易
              </label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => handlePaymentMethodSelect(method.value)}
                    disabled={isSubmitting || !amount}
                    className="p-3 rounded-xl border-2 border-primary/15 hover:border-primary hover:bg-primary/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  >
                    <div className="text-2xl mb-1">{method.emoji}</div>
                    <div className="text-sm font-medium text-foreground">
                      {method.label}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                💡 點擊支付方式即可完成交易
              </p>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
