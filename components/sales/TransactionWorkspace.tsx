'use client';

import { Camera, DollarSign, ImagePlus, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  SalesPhotoEvidenceRuntimeResultHandler,
  SalesPhotoEvidenceTransactionContext,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import {
  isSalesPaymentMethod,
  type SalesPaymentMethod,
} from '@/lib/sales/payment-methods';
import { QuickInteractionButtons } from './QuickInteractionButtons';
import { QuickTransactionGrid } from './QuickTransactionGrid';

type TransactionMode = 'quick' | 'products';

interface TransactionWorkspaceProps {
  marketId: string;
  salesPhotoEvidenceRequired: boolean;
  pendingPhotoCount?: number;
  onOpenPendingPhotos: () => void;
  salesPhotoEvidenceContext?: SalesPhotoEvidenceTransactionContext;
  onSalesPhotoEvidenceResult?: SalesPhotoEvidenceRuntimeResultHandler;
  hideProfit?: boolean;
}

const PAYMENT_STORAGE_KEY = 'markit:last-sales-payment-method';

export function TransactionWorkspace({
  marketId,
  salesPhotoEvidenceRequired,
  pendingPhotoCount = 0,
  onOpenPendingPhotos,
  salesPhotoEvidenceContext,
  onSalesPhotoEvidenceResult,
  hideProfit = false,
}: TransactionWorkspaceProps) {
  const [mode, setMode] = useState<TransactionMode>('quick');
  const [paymentMethod, setPaymentMethod] = useState<SalesPaymentMethod>('cash');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PAYMENT_STORAGE_KEY);
      if (isSalesPaymentMethod(saved)) setPaymentMethod(saved);
    } catch {
      // Storage availability should never block checkout.
    }
  }, []);

  const changePaymentMethod = (next: SalesPaymentMethod) => {
    setPaymentMethod(next);
    try {
      window.localStorage.setItem(PAYMENT_STORAGE_KEY, next);
    } catch {
      // Keep the in-memory selection when storage is unavailable.
    }
  };

  const changeModeFromKeyboard = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    nextMode: TransactionMode
  ) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    setMode(nextMode);
    window.requestAnimationFrame(() => {
      document.getElementById(`transaction-tab-${nextMode}-${marketId}`)?.focus();
    });
  };

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-medium text-foreground">交易</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{salesPhotoEvidenceRequired ? '本場成交需拍照' : '本場成交不需拍照'}</p>
        </div>
        <button
          type="button"
          onClick={onOpenPendingPhotos}
          className={`relative flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium text-foreground transition-colors ${
            pendingPhotoCount > 0
              ? 'border-secondary/40 bg-secondary/10 hover:bg-secondary/15'
              : 'border-border bg-white hover:bg-background'
          }`}
          aria-label={`待補照片 ${pendingPhotoCount} 筆`}
        >
          <ImagePlus className="h-4 w-4 text-primary" />
          待補
          <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs ${pendingPhotoCount > 0 ? 'bg-secondary text-white' : 'bg-background text-muted-foreground'}`}>
            {pendingPhotoCount}
          </span>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-5">
        <span className="flex min-w-0 items-center gap-2 text-sm text-foreground">
          <Camera className="h-4 w-4 shrink-0 text-primary" />
          成交照片
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${salesPhotoEvidenceRequired ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-muted-foreground'}`}>
          {salesPhotoEvidenceRequired ? '本場需拍照' : '本場免拍照'}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-5 grid grid-cols-2 rounded-lg bg-background p-1" role="tablist" aria-label="交易方式">
          <button
            id={`transaction-tab-quick-${marketId}`}
            type="button"
            role="tab"
            aria-selected={mode === 'quick'}
            aria-controls={`transaction-panel-quick-${marketId}`}
            tabIndex={mode === 'quick' ? 0 : -1}
            onClick={() => setMode('quick')}
            onKeyDown={event => changeModeFromKeyboard(event, 'products')}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${mode === 'quick' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <DollarSign className="h-4 w-4" />
            快速收款
          </button>
          <button
            id={`transaction-tab-products-${marketId}`}
            type="button"
            role="tab"
            aria-selected={mode === 'products'}
            aria-controls={`transaction-panel-products-${marketId}`}
            tabIndex={mode === 'products' ? 0 : -1}
            onClick={() => setMode('products')}
            onKeyDown={event => changeModeFromKeyboard(event, 'quick')}
            className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ${mode === 'products' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ShoppingBag className="h-4 w-4" />
            商品銷售
          </button>
        </div>

        <div
          id={`transaction-panel-quick-${marketId}`}
          role="tabpanel"
          aria-labelledby={`transaction-tab-quick-${marketId}`}
          hidden={mode !== 'quick'}
        >
          <QuickInteractionButtons
            marketId={marketId}
            hideProfit={hideProfit}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={changePaymentMethod}
            salesPhotoEvidenceContext={salesPhotoEvidenceContext}
            onSalesPhotoEvidenceResult={onSalesPhotoEvidenceResult}
          />
        </div>
        <div
          id={`transaction-panel-products-${marketId}`}
          role="tabpanel"
          aria-labelledby={`transaction-tab-products-${marketId}`}
          hidden={mode !== 'products'}
        >
          <QuickTransactionGrid
            marketId={marketId}
            embedded
            paymentMethod={paymentMethod}
            onPaymentMethodChange={changePaymentMethod}
            salesPhotoEvidenceContext={salesPhotoEvidenceContext}
            onSalesPhotoEvidenceResult={onSalesPhotoEvidenceResult}
          />
        </div>
      </div>
    </section>
  );
}
