'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  recordDealWithOptionalSalesPhotoEvidence,
  type SalesPhotoEvidenceRuntimeResultHandler,
  type SalesPhotoEvidenceTransactionContext,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import type { SalesPaymentMethod } from '@/lib/sales/payment-methods';
import { QuickAmountCheckout } from './QuickAmountCheckout';

interface QuickInteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
  hideProfit?: boolean;
  paymentMethod?: SalesPaymentMethod;
  onPaymentMethodChange?: (value: SalesPaymentMethod) => void;
  salesPhotoEvidenceContext?: SalesPhotoEvidenceTransactionContext;
  onSalesPhotoEvidenceResult?: SalesPhotoEvidenceRuntimeResultHandler;
  onTransactionCompleted?: () => void;
  onProcessingChange?: (isProcessing: boolean) => void;
  presentation?: 'card' | 'sheet';
}

export function QuickInteractionButtons({
  marketId,
  onInteractionRecorded,
  paymentMethod,
  onPaymentMethodChange,
  salesPhotoEvidenceContext,
  onSalesPhotoEvidenceResult,
  onTransactionCompleted,
  onProcessingChange,
  presentation = 'card',
}: QuickInteractionButtonsProps) {
  const [displayAmount, setDisplayAmount] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPaymentMethod, setLocalPaymentMethod] = useState<SalesPaymentMethod>('cash');
  const selectedPaymentMethod = paymentMethod ?? localPaymentMethod;

  const changePaymentMethod = (next: SalesPaymentMethod) => {
    if (onPaymentMethodChange) onPaymentMethodChange(next);
    else setLocalPaymentMethod(next);
  };

  const handleQuickDeal = async () => {
    const amount = Number.parseInt(displayAmount, 10);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      toast.error('請輸入金額');
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
    onProcessingChange?.(true);
    let result;
    try {
      const submittedAt = new Date().toISOString();
      result = await recordDealWithOptionalSalesPhotoEvidence({
        marketId,
        items: [],
        totalAmount: amount,
        paymentMethod: selectedPaymentMethod,
        isManualEntry: true,
        manualRevenue: amount,
        manualDealCount: 1,
      }, undefined, {
        evidenceContext: salesPhotoEvidenceContext
          ? {
              ...salesPhotoEvidenceContext,
              marketId,
              saleCompletedAt: submittedAt,
              now: submittedAt,
            }
          : undefined,
      });

    } catch (error) {
      console.error('記錄成交失敗：', error);
      toast.error('尚未完成記錄，請確認後重試；本次輸入已保留。');
      setIsProcessing(false);
      onProcessingChange?.(false);
      return;
    }

    setDisplayAmount('0');
    if (!onPaymentMethodChange) setLocalPaymentMethod('cash');
    window.dispatchEvent(new CustomEvent('deal-closed', {
      detail: { marketId, amount, paymentMethod: selectedPaymentMethod },
    }));
    onInteractionRecorded?.();
    onTransactionCompleted?.();

    try {
      if (onSalesPhotoEvidenceResult) await onSalesPhotoEvidenceResult(result);
      else toast.success('成交完成', { description: `NT$${amount.toLocaleString()}` });
    } catch (error) {
      console.error('開啟成交照片流程失敗：', error);
      toast.warning('交易已完成，請從待補照片補上紀錄');
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  return (
    <QuickAmountCheckout
      displayAmount={displayAmount}
      setDisplayAmount={setDisplayAmount}
      paymentMethod={selectedPaymentMethod}
      onPaymentMethodChange={changePaymentMethod}
      onComplete={() => void handleQuickDeal()}
      isProcessing={isProcessing}
      presentation={presentation}
    />
  );
}
