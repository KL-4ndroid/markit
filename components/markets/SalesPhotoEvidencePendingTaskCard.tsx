'use client';

import Image from 'next/image';
import { Camera, ImageIcon, ImagePlus, Loader2, RefreshCw, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';

import { formatSalesPaymentMethod } from '@/lib/sales/payment-methods';
import type { SalesPhotoEvidencePendingTaskItem } from '@/lib/sales/photo-evidence-pending-creation-read-model';
import {
  getPendingSalesPhotoEvidencePayload,
  type LocalPendingSalesPhotoEvidencePayload,
} from '@/lib/sales/photo-evidence-pending-payload-storage';

interface SalesPhotoEvidencePendingTaskCardProps {
  item: SalesPhotoEvidencePendingTaskItem;
  refreshKey?: string | null;
  canHandle: boolean;
  onCapture: (source: 'camera' | 'library') => void;
  onPreview: (payload: LocalPendingSalesPhotoEvidencePayload) => void;
  onUpload: (payload: LocalPendingSalesPhotoEvidencePayload) => void;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function canActOnStatus(status: SalesPhotoEvidencePendingTaskItem['status']): boolean {
  return status === 'waiting_for_event_sync' || status === 'failed_retryable';
}

export function SalesPhotoEvidencePendingTaskCard({
  item,
  refreshKey = null,
  canHandle,
  onCapture,
  onPreview,
  onUpload,
}: SalesPhotoEvidencePendingTaskCardProps) {
  const [payload, setPayload] = useState<LocalPendingSalesPhotoEvidencePayload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setIsLoading(true);
    void getPendingSalesPhotoEvidencePayload(item.queueId)
      .then(nextPayload => {
        if (cancelled) return;
        setPayload(nextPayload);
        if (nextPayload) {
          objectUrl = URL.createObjectURL(nextPayload.thumbnail.blob);
          setPreviewUrl(objectUrl);
        } else {
          setPreviewUrl(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.queueId, refreshKey]);

  const transaction = item.transaction;
  const actionable = canHandle && canActOnStatus(item.status);
  const stateLabel = payload
    ? item.status === 'failed_retryable' ? '照片已保留，可重新上傳' : '照片尚未上傳'
    : actionable ? '尚未拍照' : '暫時不能處理';

  return (
    <article className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {transaction?.totalAmount
              ? `NT$${transaction.totalAmount.toLocaleString()}`
              : '成交紀錄'}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {transaction
              ? `${formatSalesPaymentMethod(transaction.paymentMethod)} · ${transaction.itemLabel}`
              : formatDateTime(item.saleCompletedAt)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">{formatDateTime(item.saleCompletedAt)}</p>
          <p className={`mt-1 text-xs font-medium ${payload ? 'text-primary' : 'text-secondary'}`}>
            {stateLabel}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex aspect-[16/8] items-center justify-center border-y border-border bg-background text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : payload && previewUrl ? (
        <button
          type="button"
          onClick={() => onPreview(payload)}
          className="relative block aspect-[16/8] w-full border-y border-border bg-neutral-950"
          aria-label="查看這筆成交照片"
        >
          <Image
            src={previewUrl}
            alt="待上傳的成交照片"
            fill
            unoptimized
            sizes="(max-width: 640px) calc(100vw - 4rem), 440px"
            className="object-contain"
          />
        </button>
      ) : (
        <div className="flex aspect-[16/8] flex-col items-center justify-center border-y border-dashed border-border bg-background text-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-xs text-muted-foreground">這筆交易還沒有照片</p>
        </div>
      )}

      <div className="flex gap-2 p-3">
        {payload ? (
          <>
            <button
              type="button"
              onClick={() => onUpload(payload)}
              disabled={!actionable}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {item.status === 'failed_retryable' ? <RefreshCw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
              {item.status === 'failed_retryable' ? '重新上傳' : '上傳照片'}
            </button>
            <button
              type="button"
              onClick={() => onCapture('camera')}
              disabled={!actionable}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="重新拍照"
              title="重新拍照"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onCapture('library')}
              disabled={!actionable}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="從相簿換照片"
              title="從相簿換照片"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onCapture('camera')}
              disabled={!actionable}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-4 w-4" />
              {actionable ? '拍照' : '稍後再試'}
            </button>
            <button
              type="button"
              onClick={() => onCapture('library')}
              disabled={!actionable}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="從相簿選擇"
              title="從相簿選擇"
            >
              <ImagePlus className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
