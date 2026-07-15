'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import Image from 'next/image';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RefreshCw,
  RotateCcw,
  UploadCloud,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type { LocalPendingSalesPhotoEvidenceCreation } from '@/lib/sales/photo-evidence-pending-creation';
import type { SalesPhotoEvidencePendingTaskItem } from '@/lib/sales/photo-evidence-pending-creation-read-model';
import type { LocalPendingSalesPhotoEvidencePayload } from '@/lib/sales/photo-evidence-pending-payload-storage';
import type { SaleCompletionFlowState } from '@/lib/sales/sale-completion-flow';
import { formatSalesPaymentMethod } from '@/lib/sales/payment-methods';
import { SalesPhotoEvidencePendingTaskCard } from './SalesPhotoEvidencePendingTaskCard';

interface SalesPhotoEvidenceFlowDialogProps {
  state: SaleCompletionFlowState;
  pendingItems: SalesPhotoEvidencePendingTaskItem[];
  isLoadingPendingItems?: boolean;
  pendingItemsError?: string | null;
  payloadRefreshByQueueId?: Record<string, string | null>;
  canHandleItem: (item: LocalPendingSalesPhotoEvidenceCreation) => boolean;
  onCapture: (
    item: LocalPendingSalesPhotoEvidenceCreation,
    source: 'camera' | 'library'
  ) => void;
  onPreview: (
    item: SalesPhotoEvidencePendingTaskItem,
    payload: LocalPendingSalesPhotoEvidencePayload
  ) => void;
  onUpload: (
    item: LocalPendingSalesPhotoEvidenceCreation,
    payload: LocalPendingSalesPhotoEvidencePayload
  ) => void;
  onRefresh: () => void;
  onBack: () => void;
  onClose: () => void;
}

function activePayload(state: SaleCompletionFlowState): LocalPendingSalesPhotoEvidencePayload | null {
  return state.view === 'previewing' || state.view === 'uploading' || state.view === 'upload_failed'
    ? state.payload
    : null;
}

function titleForState(state: SaleCompletionFlowState): string {
  if (state.view === 'pending_list') return '待補照片';
  if (state.view === 'completed') return '已完成';
  if (state.view === 'closed') return '成交照片';
  return state.returnTo === 'closed' ? '成交完成' : '補上成交照片';
}

export function SalesPhotoEvidenceFlowDialog({
  state,
  pendingItems,
  isLoadingPendingItems = false,
  pendingItemsError = null,
  payloadRefreshByQueueId = {},
  canHandleItem,
  onCapture,
  onPreview,
  onUpload,
  onRefresh,
  onBack,
  onClose,
}: SalesPhotoEvidenceFlowDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const payload = activePayload(state);
  const isOpen = state.view !== 'closed';
  const isLocked = state.view === 'uploading';
  const canGoBack = state.view !== 'pending_list'
    && state.view !== 'completed'
    && state.view !== 'closed'
    && state.returnTo === 'pending_list';

  useEffect(() => {
    if (!payload) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(payload.image.blob);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [payload]);

  return (
    <Dialog
      open={isOpen}
      onClose={isLocked ? () => undefined : onClose}
      className="relative z-[1200]"
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex justify-center p-4">
        <DialogPanel className="relative flex max-h-[90dvh] w-full max-w-lg self-center flex-col overflow-hidden rounded-[2rem] bg-background shadow-2xl animate-slide-up">
          <header className="flex shrink-0 items-center justify-between gap-3 bg-gradient-to-br from-primary to-secondary px-5 py-5">
            <div className="flex min-w-0 items-center gap-2">
              {canGoBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
                  aria-label="返回待補照片"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="min-w-0">
                <DialogTitle className="truncate text-xl font-medium text-white">
                  {titleForState(state)}
                  {state.view === 'pending_list' && pendingItems.length > 0 ? ` (${pendingItems.length})` : ''}
                </DialogTitle>
                {state.view === 'pending_list' && (
                  <p className="mt-1 text-sm text-white/80">依序完成尚未上傳的成交照片</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isLocked}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 disabled:opacity-50"
              aria-label="關閉成交照片視窗"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          {state.view === 'pending_list' && (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              {pendingItemsError ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-red-700">{pendingItemsError}</p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground"
                  >
                    <RefreshCw className="h-4 w-4" />
                    再試一次
                  </button>
                </div>
              ) : isLoadingPendingItems ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  正在整理待補照片
                </div>
              ) : pendingItems.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                  <p className="mt-3 text-sm font-medium text-foreground">目前沒有待補照片</p>
                  <p className="mt-1 text-xs text-muted-foreground">所有成交照片都已處理完成</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingItems.map(item => (
                    <SalesPhotoEvidencePendingTaskCard
                      key={item.queueId}
                      item={item}
                      refreshKey={payloadRefreshByQueueId[item.queueId]}
                      canHandle={canHandleItem(item)}
                      onCapture={source => onCapture(item, source)}
                      onPreview={nextPayload => onPreview(item, nextPayload)}
                      onUpload={nextPayload => onUpload(item, nextPayload)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {state.view !== 'closed' && state.view !== 'pending_list' && (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="mb-5 rounded-lg border border-primary/15 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">本次成交</p>
                      <p className="mt-1 text-xl font-medium text-foreground">
                        {state.summary.totalAmount > 0
                          ? `NT$${state.summary.totalAmount.toLocaleString()}`
                          : '成交紀錄'}
                      </p>
                    </div>
                    <p className="text-right text-xs leading-relaxed text-muted-foreground">
                      {formatSalesPaymentMethod(state.summary.paymentMethod)}<br />
                      {state.summary.itemLabel}
                    </p>
                  </div>
                </div>

                {state.view === 'photo_required' && (
                  <div>
                    <div className="text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Camera className="h-7 w-7" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium text-foreground">請拍下本次售出的商品</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        照片會先保留在這台裝置，確認後才會上傳。
                      </p>
                    </div>

                    {state.message && (
                      <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {state.message}
                      </div>
                    )}

                    <div className="mt-6 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onCapture(state.item, 'camera')}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        <Camera className="h-5 w-5" />
                        拍照
                      </button>
                      <button
                        type="button"
                        onClick={() => onCapture(state.item, 'library')}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-background"
                      >
                        <ImagePlus className="h-5 w-5" />
                        從相簿選擇
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-3 min-h-11 w-full text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                      {state.returnTo === 'closed' ? '稍後補' : '返回待補清單'}
                    </button>
                  </div>
                )}

                {state.view === 'processing_photo' && (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    <h3 className="mt-4 text-base font-medium text-foreground">正在處理照片</h3>
                    <p className="mt-2 text-sm text-muted-foreground">完成後會立即顯示預覽</p>
                  </div>
                )}

                {(state.view === 'previewing' || state.view === 'uploading' || state.view === 'upload_failed') && (
                  <div>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-950">
                      {previewUrl && (
                        <Image
                          src={previewUrl}
                          alt="準備上傳的成交照片"
                          fill
                          unoptimized
                          sizes="(max-width: 640px) calc(100vw - 3rem), 480px"
                          className="object-contain"
                        />
                      )}
                    </div>
                    <p className="mt-3 text-center text-sm text-muted-foreground">
                      {state.view === 'uploading' ? '正在儲存照片，請稍候' : '請確認商品清楚可辨識'}
                    </p>
                    {state.view === 'upload_failed' && (
                      <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-700">
                        {state.message || '上傳未完成，照片仍安全保留在此裝置。'}
                      </div>
                    )}
                  </div>
                )}

                {state.view === 'completed' && (
                  <div className="flex min-h-64 flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
                      <Check className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-medium text-foreground">照片已儲存</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {state.returnTo === 'closed' ? '可以開始下一筆交易' : '即將返回待補清單'}
                    </p>
                  </div>
                )}
              </div>

              {(state.view === 'previewing' || state.view === 'upload_failed' || state.view === 'uploading') && payload && (
                <footer className="shrink-0 border-t border-border bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                  {state.view === 'uploading' ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white opacity-80"
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      正在儲存照片
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onCapture(state.item, 'camera')}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-background"
                        aria-label="重新拍照"
                        title="重新拍照"
                      >
                        <RotateCcw className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCapture(state.item, 'library')}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-background"
                        aria-label="從相簿換照片"
                        title="從相簿換照片"
                      >
                        <ImagePlus className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpload(state.item, payload)}
                        className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90"
                      >
                        {state.view === 'upload_failed' ? <RefreshCw className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
                        {state.view === 'upload_failed' ? '重新上傳' : '使用這張照片'}
                      </button>
                    </div>
                  )}
                </footer>
              )}
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
