'use client';

import { Camera, CheckCircle2, DollarSign, ImagePlus, ShoppingBag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type {
  SalesPhotoEvidenceRuntimeResultHandler,
  SalesPhotoEvidenceTransactionContext,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import {
  formatSalesPaymentMethod,
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
  const [recentSale, setRecentSale] = useState<{ amount: number; paymentMethod: SalesPaymentMethod } | null>(null);
  const noticeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PAYMENT_STORAGE_KEY);
      if (isSalesPaymentMethod(saved)) setPaymentMethod(saved);
    } catch {
      // Storage availability should never block checkout.
    }
  }, []);

  useEffect(() => {
    const handleDealClosed = (event: Event) => {
      const detail = (event as CustomEvent<{
        marketId?: string;
        amount?: number;
        paymentMethod?: unknown;
      }>).detail;
      if (
        detail?.marketId !== marketId ||
        typeof detail.amount !== 'number' ||
        !Number.isFinite(detail.amount)
      ) {
        return;
      }

      setRecentSale({
        amount: detail.amount,
        paymentMethod: isSalesPaymentMethod(detail.paymentMethod) ? detail.paymentMethod : 'other',
      });
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
      noticeTimeoutRef.current = window.setTimeout(() => setRecentSale(null), 4000);
    };

    window.addEventListener('deal-closed', handleDealClosed);
    return () => {
      window.removeEventListener('deal-closed', handleDealClosed);
      if (noticeTimeoutRef.current) window.clearTimeout(noticeTimeoutRef.current);
    };
  }, [marketId]);

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
    <section className="mb-6 overflow-hidden rounded-card border border-atelier-line bg-atelier-paper">
      <div className="flex items-start justify-between gap-3 border-b border-atelier-line px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-atelier-clay">現場收款</p>
          <h2 className="mt-1 text-lg font-semibold text-atelier-ink">交易</h2>
          <p className="mt-1 text-xs text-atelier-muted">完成後會先安全保存在這台裝置</p>
        </div>
        <button
          type="button"
          onClick={onOpenPendingPhotos}
          className={`relative flex min-h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-sm font-medium transition-colors ${
            pendingPhotoCount > 0
              ? 'border-atelier-clay/40 bg-atelier-clay/10 text-atelier-ink hover:bg-atelier-clay/15'
              : 'border-atelier-line bg-atelier-paper text-atelier-muted hover:bg-atelier-canvas'
          }`}
          aria-label={`待補照片 ${pendingPhotoCount} 筆`}
        >
          <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
          待補
          <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-xs ${pendingPhotoCount > 0 ? 'bg-atelier-clay text-white' : 'bg-atelier-canvas text-atelier-muted'}`}>
            {pendingPhotoCount}
          </span>
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3 rounded-control border border-atelier-line bg-atelier-canvas px-3 py-2">
          <span className="flex min-w-0 items-center gap-2 text-xs text-atelier-muted">
            <Camera className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            成交照片
          </span>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${salesPhotoEvidenceRequired ? 'bg-primary/10 text-primary' : 'bg-atelier-line/70 text-atelier-muted'}`}>
            {salesPhotoEvidenceRequired ? '本場需拍照' : '本場免拍照'}
          </span>
        </div>

        <div className="mb-4 grid grid-cols-2 rounded-control border border-atelier-line bg-atelier-canvas p-1" role="tablist" aria-label="交易方式">
          <button
            id={`transaction-tab-quick-${marketId}`}
            type="button"
            role="tab"
            aria-selected={mode === 'quick'}
            aria-controls={`transaction-panel-quick-${marketId}`}
            tabIndex={mode === 'quick' ? 0 : -1}
            onClick={() => setMode('quick')}
            onKeyDown={event => changeModeFromKeyboard(event, 'products')}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-medium transition-colors ${mode === 'quick' ? 'bg-atelier-ink text-white' : 'text-atelier-muted hover:bg-atelier-paper hover:text-atelier-ink'}`}
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
            className={`flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-medium transition-colors ${mode === 'products' ? 'bg-atelier-ink text-white' : 'text-atelier-muted hover:bg-atelier-paper hover:text-atelier-ink'}`}
          >
            <ShoppingBag className="h-4 w-4" />
            商品銷售
          </button>
        </div>

        <div className="min-h-0" aria-live="polite" aria-atomic="true">
          {recentSale && (
            <div className="mb-4 flex items-center gap-3 rounded-control border border-status-good-border bg-status-good-bg px-3 py-2.5 text-status-good-text" role="status">
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">
                已安全儲存 NT${recentSale.amount.toLocaleString()} · {formatSalesPaymentMethod(recentSale.paymentMethod)}
              </p>
            </div>
          )}
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
