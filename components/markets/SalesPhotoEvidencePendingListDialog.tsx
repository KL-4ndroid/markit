'use client';

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import type {
  SalesPhotoEvidencePendingCreationListItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';

interface SalesPhotoEvidencePendingListDialogProps {
  isOpen: boolean;
  items: SalesPhotoEvidencePendingCreationListItem[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<SalesPhotoEvidencePendingCreationListItem['status'], string> = {
  waiting_for_event_sync: '等待成交同步',
  creating: '建立中',
  created: '已建立',
  failed_retryable: '可重試失敗',
  failed_permanent: '永久失敗',
  blocked_invalid_source: '來源資料異常',
};

const STATUS_STYLES: Record<SalesPhotoEvidencePendingCreationListItem['status'], string> = {
  waiting_for_event_sync: 'bg-soft-yellow text-secondary',
  creating: 'bg-primary/10 text-primary',
  created: 'bg-green-50 text-green-700',
  failed_retryable: 'bg-orange-50 text-orange-700',
  failed_permanent: 'bg-red-50 text-red-700',
  blocked_invalid_source: 'bg-red-50 text-red-700',
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusIcon(status: SalesPhotoEvidencePendingCreationListItem['status']) {
  if (status === 'created') return <CheckCircle2 className="h-4 w-4" />;
  if (status === 'failed_permanent' || status === 'blocked_invalid_source') {
    return <Ban className="h-4 w-4" />;
  }
  if (status === 'failed_retryable') return <AlertTriangle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

export function SalesPhotoEvidencePendingListDialog({
  isOpen,
  items,
  isLoading = false,
  onRefresh,
  onClose,
}: SalesPhotoEvidencePendingListDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 py-6 sm:items-center">
      <section className="w-full max-w-lg rounded-[1.5rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">待補照片</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              這裡只顯示本機尚未處理完成的照片補件狀態。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label="關閉待補照片"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              載入中
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">目前沒有待補照片</p>
              <p className="mt-1 text-xs text-muted-foreground">
                之後若成交需要照片但尚未完成，會出現在這裡。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <article
                  key={item.queueId}
                  className="rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        成交紀錄 {item.saleEventId}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        成交時間 {formatDateTime(item.saleCompletedAt)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}
                    >
                      {getStatusIcon(item.status)}
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>

                  {(item.retryCount > 0 || item.lastErrorMessage) && (
                    <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-muted-foreground">
                      {item.retryCount > 0 && <p>重試次數：{item.retryCount}</p>}
                      {item.lastErrorMessage && <p className="mt-1">原因：{item.lastErrorMessage}</p>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" />
              重新整理
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            關閉
          </button>
        </div>
      </section>
    </div>
  );
}
