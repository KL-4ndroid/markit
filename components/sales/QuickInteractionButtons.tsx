'use client';

import { Delete, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  recordDealWithOptionalSalesPhotoEvidence,
  type SalesPhotoEvidenceRuntimeResultHandler,
  type SalesPhotoEvidenceTransactionContext,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import type { SalesPaymentMethod } from '@/lib/sales/payment-methods';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface QuickInteractionButtonsProps {
  marketId: string;
  onInteractionRecorded?: () => void;
  hideProfit?: boolean;
  paymentMethod?: SalesPaymentMethod;
  onPaymentMethodChange?: (value: SalesPaymentMethod) => void;
  salesPhotoEvidenceContext?: SalesPhotoEvidenceTransactionContext;
  onSalesPhotoEvidenceResult?: SalesPhotoEvidenceRuntimeResultHandler;
}

export function QuickInteractionButtons({
  marketId,
  onInteractionRecorded,
  paymentMethod,
  onPaymentMethodChange,
  salesPhotoEvidenceContext,
  onSalesPhotoEvidenceResult,
}: QuickInteractionButtonsProps) {
  const [displayAmount, setDisplayAmount] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPaymentMethod, setLocalPaymentMethod] = useState<SalesPaymentMethod>('cash');
  const selectedPaymentMethod = paymentMethod ?? localPaymentMethod;

  const changePaymentMethod = (next: SalesPaymentMethod) => {
    if (onPaymentMethodChange) onPaymentMethodChange(next);
    else setLocalPaymentMethod(next);
  };

  const handleNumberClick = (number: number) => {
    setDisplayAmount(previous => previous === '0' ? number.toString() : previous + number.toString());
  };

  const handleQuickDeal = async () => {
    const amount = Number.parseInt(displayAmount, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('請輸入金額');
      return;
    }
    if (isProcessing) return;

    setIsProcessing(true);
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
      toast.error('記錄失敗，資料已保留在本機等待同步');
      setIsProcessing(false);
      return;
    }

    setDisplayAmount('0');
    window.dispatchEvent(new CustomEvent('deal-closed', {
      detail: { marketId, amount, paymentMethod: selectedPaymentMethod },
    }));
    onInteractionRecorded?.();

    try {
      if (onSalesPhotoEvidenceResult) await onSalesPhotoEvidenceResult(result);
      else toast.success('成交完成', { description: `NT$${amount.toLocaleString()}` });
    } catch (error) {
      console.error('開啟成交照片流程失敗：', error);
      toast.warning('交易已完成，請從待補照片補上紀錄');
    } finally {
      setIsProcessing(false);
    }
  };

  const amount = Number.parseInt(displayAmount, 10) || 0;

  return (
    <div>
      <div className="relative mb-3 overflow-hidden rounded-lg bg-primary px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-3xl font-medium tabular-nums text-white">
            NT$ {amount.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => setDisplayAmount('0')}
            disabled={isProcessing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
            aria-label="清除金額"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(number => (
          <button
            key={number}
            type="button"
            onClick={() => handleNumberClick(number)}
            disabled={isProcessing}
            className="min-h-12 rounded-lg border border-border bg-white text-xl font-medium text-foreground hover:bg-background active:scale-95 disabled:opacity-50"
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDisplayAmount(previous => previous === '0' ? '0' : previous + '00')}
          disabled={isProcessing}
          className="min-h-12 rounded-lg border border-border bg-background text-lg font-medium text-primary active:scale-95 disabled:opacity-50"
        >
          00
        </button>
        <button
          type="button"
          onClick={() => handleNumberClick(0)}
          disabled={isProcessing}
          className="min-h-12 rounded-lg border border-border bg-white text-xl font-medium text-foreground hover:bg-background active:scale-95 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setDisplayAmount(previous => previous.length <= 1 ? '0' : previous.slice(0, -1))}
          disabled={isProcessing}
          className="min-h-12 rounded-lg border border-border bg-background text-xl font-medium text-secondary active:scale-95 disabled:opacity-50"
          aria-label="刪除最後一位數字"
        >
          ⌫
        </button>
      </div>

      <PaymentMethodSelector
        value={selectedPaymentMethod}
        onChange={changePaymentMethod}
        disabled={isProcessing}
      />

      <button
        type="button"
        onClick={() => void handleQuickDeal()}
        disabled={isProcessing || amount <= 0}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing && <Loader2 className="h-5 w-5 animate-spin" />}
        {isProcessing ? '正在記錄交易' : `完成收款 NT$${amount.toLocaleString()}`}
      </button>
    </div>
  );
}
