'use client';

import { Check, Delete, Loader2 } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import { formatSalesPaymentMethod, type SalesPaymentMethod } from '@/lib/sales/payment-methods';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface QuickAmountCheckoutProps {
  displayAmount: string;
  setDisplayAmount: Dispatch<SetStateAction<string>>;
  paymentMethod: SalesPaymentMethod;
  onPaymentMethodChange: (value: SalesPaymentMethod) => void;
  onComplete: () => void;
  isProcessing?: boolean;
  presentation?: 'card' | 'sheet';
}

export function QuickAmountCheckout({
  displayAmount,
  setDisplayAmount,
  paymentMethod: selectedPaymentMethod,
  onPaymentMethodChange: changePaymentMethod,
  onComplete,
  isProcessing = false,
  presentation = 'card',
}: QuickAmountCheckoutProps) {
  const handleNumberClick = (number: number) => {
    setDisplayAmount(previous => previous === '0' ? String(number) : previous + number);
  };

  const amount = Number.parseInt(displayAmount, 10) || 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-atelier-ink">收款金額</p>
        <p className="text-xs text-atelier-muted">新台幣</p>
      </div>
      <div className="relative mb-4 overflow-hidden rounded-card bg-deep px-4 py-5 shadow-atelier">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-3xl font-semibold tabular-nums text-white sm:text-4xl">
            NT$ {amount.toLocaleString()}
          </div>
          <button
            type="button"
            onClick={() => setDisplayAmount('0')}
            disabled={isProcessing}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-50"
            aria-label="清除金額"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(number => (
          <button
            key={number}
            type="button"
            onClick={() => handleNumberClick(number)}
            disabled={isProcessing}
            className="min-h-14 rounded-control bg-atelier-paper text-xl font-semibold text-atelier-ink shadow-atelier-key transition-[transform,box-shadow,background-color] duration-150 hover:bg-muted/50 active:translate-y-0.5 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setDisplayAmount(previous => previous === '0' ? '0' : previous + '00')}
          disabled={isProcessing}
          className="min-h-14 rounded-control bg-muted/50 text-lg font-semibold text-atelier-ink shadow-atelier-key transition-[transform,box-shadow,background-color] duration-150 hover:bg-muted/70 active:translate-y-0.5 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-50"
        >
          00
        </button>
        <button
          type="button"
          onClick={() => handleNumberClick(0)}
          disabled={isProcessing}
          className="min-h-14 rounded-control bg-atelier-paper text-xl font-semibold text-atelier-ink shadow-atelier-key transition-[transform,box-shadow,background-color] duration-150 hover:bg-muted/50 active:translate-y-0.5 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setDisplayAmount(previous => previous.length <= 1 ? '0' : previous.slice(0, -1))}
          disabled={isProcessing}
          className="flex min-h-14 items-center justify-center rounded-control bg-muted/50 text-atelier-ink shadow-atelier-key transition-[transform,box-shadow,background-color] duration-150 hover:bg-muted/70 active:translate-y-0.5 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 disabled:opacity-50"
          aria-label="刪除最後一位數字"
        >
          <Delete className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <PaymentMethodSelector
        value={selectedPaymentMethod}
        onChange={changePaymentMethod}
        disabled={isProcessing}
      />

      <button
        type="button"
        onClick={onComplete}
        disabled={isProcessing || !Number.isSafeInteger(amount) || amount <= 0}
        className={`${presentation === 'sheet' ? 'sticky bottom-0 z-10 mt-5 shadow-[0_-10px_24px_rgb(255_255_255_/_0.92)]' : 'mt-4'} inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-atelier-line disabled:text-atelier-muted disabled:opacity-100`}
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" aria-hidden="true" />}
        {isProcessing ? '正在記錄交易' : `完成收款 NT$${amount.toLocaleString()} · ${formatSalesPaymentMethod(selectedPaymentMethod)}`}
      </button>
    </div>
  );
}
