'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import {
  Banknote,
  ShoppingBag,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  TransactionWorkspace,
  type TransactionMode,
} from '@/components/sales/TransactionWorkspace';
import type {
  SalesPhotoEvidenceRuntimeResultHandler,
  SalesPhotoEvidenceTransactionContext,
} from '@/lib/sales/photo-evidence-runtime-enqueue';

interface OperatingMarketWorkbenchProps {
  marketId: string;
  canRecordDeal: boolean;
  salesPhotoEvidenceRequired: boolean;
  pendingPhotoCount: number;
  onOpenPendingPhotos: () => void;
  salesPhotoEvidenceContext?: SalesPhotoEvidenceTransactionContext;
  onSalesPhotoEvidenceResult?: SalesPhotoEvidenceRuntimeResultHandler;
  hideProfit?: boolean;
}

const MODE_TITLES: Record<TransactionMode, string> = {
  quick: '快速收款',
  products: '商品銷售',
};

export function OperatingMarketWorkbench({
  marketId,
  canRecordDeal,
  salesPhotoEvidenceRequired,
  pendingPhotoCount,
  onOpenPendingPhotos,
  salesPhotoEvidenceContext,
  onSalesPhotoEvidenceResult,
  hideProfit = false,
}: OperatingMarketWorkbenchProps) {
  const [activeTransactionMode, setActiveTransactionMode] = useState<TransactionMode | null>(null);
  const [isTransactionProcessing, setIsTransactionProcessing] = useState(false);

  useEffect(() => {
    if (!canRecordDeal) {
      setIsTransactionProcessing(false);
      setActiveTransactionMode(null);
    }
  }, [canRecordDeal]);

  if (!canRecordDeal) return null;

  const openTransaction = (mode: TransactionMode) => {
    setIsTransactionProcessing(false);
    setActiveTransactionMode(mode);
  };
  const requestCloseTransaction = () => {
    if (!isTransactionProcessing) setActiveTransactionMode(null);
  };
  const completeTransaction = () => {
    setIsTransactionProcessing(false);
    setActiveTransactionMode(null);
  };

  return (
    <>
      <aside
        className="fixed inset-x-0 bottom-0 z-[900] border-t border-primary/15 bg-atelier-paper/98 shadow-[0_-14px_34px_rgb(47_62_63_/_0.16)] backdrop-blur-md lg:hidden"
        aria-label="營業工作台"
      >
        <div className="mx-auto max-w-lg px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openTransaction('quick')}
              className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-control bg-primary px-2 text-xs font-semibold text-white shadow-atelier-key transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Banknote className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">快速收款</span>
            </button>
            <button
              type="button"
              onClick={() => openTransaction('products')}
              className="flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-control bg-atelier-sage-soft px-2 text-xs font-semibold text-atelier-ink shadow-atelier-key transition-colors hover:bg-atelier-sage-soft/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">商品銷售</span>
            </button>
          </div>
        </div>
      </aside>

      <Dialog
        open={activeTransactionMode !== null}
        onClose={requestCloseTransaction}
        className="relative z-[1100] lg:hidden"
      >
        <div className="fixed inset-0 bg-black/45" aria-hidden="true" />
        <div className="fixed inset-0 flex items-end justify-center sm:items-center sm:p-4">
          <DialogPanel className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-lg bg-background shadow-2xl sm:rounded-lg">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-atelier-line bg-atelier-paper px-4 py-3">
              <div>
                <p className="text-xs font-semibold text-primary">營業工作台</p>
                <DialogTitle className="mt-0.5 text-lg font-semibold text-atelier-ink">
                  {activeTransactionMode ? MODE_TITLES[activeTransactionMode] : '現場收款'}
                </DialogTitle>
              </div>
              <button
                type="button"
                onClick={requestCloseTransaction}
                disabled={isTransactionProcessing}
                className="flex h-11 w-11 items-center justify-center rounded-control text-atelier-muted transition-colors hover:bg-atelier-canvas hover:text-atelier-ink"
                aria-label="關閉收款面板"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {activeTransactionMode && (
                <TransactionWorkspace
                  marketId={marketId}
                  mode={activeTransactionMode}
                  presentation="sheet"
                  salesPhotoEvidenceRequired={salesPhotoEvidenceRequired}
                  pendingPhotoCount={pendingPhotoCount}
                  onOpenPendingPhotos={onOpenPendingPhotos}
                  salesPhotoEvidenceContext={salesPhotoEvidenceContext}
                  onSalesPhotoEvidenceResult={onSalesPhotoEvidenceResult}
                  onTransactionCompleted={completeTransaction}
                  onProcessingChange={setIsTransactionProcessing}
                  hideProfit={hideProfit}
                />
              )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </>
  );
}
