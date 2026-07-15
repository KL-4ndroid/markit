'use client';

import {
  Banknote,
  Camera,
  Clock,
  CreditCard,
  ImageOff,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  XCircle,
} from 'lucide-react';
import type {
  SalesPhotoEvidenceAlbumItem,
  SalesPhotoEvidenceAlbumItemDisplayStatus,
  SalesPhotoEvidenceOwnerAlbumViewModel,
} from '@/lib/sales/photo-evidence-owner-album-read-model';
import type { SalesPhotoEvidenceTransactionSummary } from '@/lib/sales/photo-evidence-owner-view';
import {
  SALES_PAYMENT_METHOD_LABELS,
  type SalesPaymentMethod,
} from '@/lib/sales/payment-methods';
import { SalesPhotoEvidenceOwnerAlbumImage } from './SalesPhotoEvidenceOwnerAlbumImage';

interface SalesPhotoEvidenceOwnerAlbumShellProps {
  viewModel: SalesPhotoEvidenceOwnerAlbumViewModel;
  isLoading?: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
  transactionBySaleId?: ReadonlyMap<string, SalesPhotoEvidenceTransactionSummary>;
  className?: string;
}

const DISPLAY_STATUS_LABELS: Record<SalesPhotoEvidenceAlbumItemDisplayStatus, string> = {
  pending: '待補拍',
  captured_local: '本機已拍攝',
  uploaded_private: '已上傳',
  upload_failed: '上傳異常',
  expired: '已過期',
  waived: '已免除',
  skipped: '未要求',
};

const DISPLAY_STATUS_STYLES: Record<SalesPhotoEvidenceAlbumItemDisplayStatus, string> = {
  pending: 'bg-soft-yellow text-secondary',
  captured_local: 'bg-primary/10 text-primary',
  uploaded_private: 'bg-green-50 text-green-700',
  upload_failed: 'bg-orange-50 text-orange-700',
  expired: 'bg-gray-100 text-muted-foreground',
  waived: 'bg-gray-100 text-muted-foreground',
  skipped: 'bg-gray-100 text-muted-foreground',
};

function formatDateTime(value: string | null): string {
  if (!value) return '未記錄';

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusIcon(status: SalesPhotoEvidenceAlbumItemDisplayStatus) {
  if (status === 'uploaded_private') return <ShieldCheck className="h-4 w-4" />;
  if (status === 'upload_failed') return <XCircle className="h-4 w-4" />;
  if (status === 'pending' || status === 'captured_local') return <Clock className="h-4 w-4" />;
  return <ImageOff className="h-4 w-4" />;
}

const PAYMENT_METHOD_ICONS = {
  cash: Banknote,
  card: CreditCard,
  mobile: Smartphone,
  other: MoreHorizontal,
} satisfies Record<SalesPaymentMethod, typeof Banknote>;

function getItemCaption(item: SalesPhotoEvidenceAlbumItem): string | null {
  if (item.displayStatus === 'uploaded_private') {
    return null;
  }

  if (item.displayStatus === 'captured_local') {
    return '照片仍在本機流程，尚未提供雲端檢視。';
  }

  if (item.displayStatus === 'upload_failed') {
    return '上傳尚未完成，保留為待處理狀態。';
  }

  if (item.displayStatus === 'expired') {
    return '照片保留期限已過或被標記過期。';
  }

  return '目前沒有可顯示的照片物件。';
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-atelier-line bg-atelier-canvas px-3 py-1 text-xs text-atelier-muted">
      <span>{label}</span>
      <strong className="font-semibold tabular-nums text-atelier-ink">{value}</strong>
    </span>
  );
}

export function SalesPhotoEvidenceOwnerAlbumShell({
  viewModel,
  isLoading = false,
  loadError = null,
  onRefresh,
  transactionBySaleId = new Map(),
  className = '',
}: SalesPhotoEvidenceOwnerAlbumShellProps) {
  const { summary } = viewModel;

  return (
    <section className={`rounded-card border border-atelier-line bg-atelier-paper p-4 sm:p-5 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary/10 text-primary">
            <Camera className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-atelier-clay">市集影像紀錄</p>
            <h2 className="mt-1 text-lg font-semibold text-atelier-ink">成交照片</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              依成交時間整理照片、金額與支付方式。
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border border-atelier-line px-3 text-sm font-medium text-atelier-ink transition-colors hover:bg-atelier-canvas disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            重新整理
          </button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <SummaryPill label="全部" value={summary.totalCount} />
        <SummaryPill label="已上傳" value={summary.countByDisplayStatus.uploaded_private} />
        <SummaryPill label="待補拍" value={summary.countByDisplayStatus.pending} />
        <SummaryPill label="上傳異常" value={summary.countByDisplayStatus.upload_failed} />
        <SummaryPill label="已過期" value={summary.countByDisplayStatus.expired} />
      </div>

      {loadError ? (
        <div className="rounded-card border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-text">
          {loadError}
        </div>
      ) : viewModel.items.length === 0 ? (
        <div className="rounded-card border border-dashed border-atelier-line bg-atelier-canvas px-4 py-8 text-center">
          <ImageOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">目前沒有照片紀錄</p>
          <p className="mt-1 text-xs text-muted-foreground">
            啟用拍照流程後，這裡會顯示每筆成交對應的照片狀態。
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {viewModel.items.map(item => {
            const transaction = item.saleId ? transactionBySaleId.get(item.saleId) : undefined;
            const PaymentMethodIcon = transaction
              ? PAYMENT_METHOD_ICONS[transaction.paymentMethod]
              : null;
            const caption = getItemCaption(item);

            return (
              <article key={item.id} className="overflow-hidden rounded-card border border-atelier-line bg-atelier-canvas p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      成交 {item.saleId ?? item.id}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(item.saleCompletedAt)}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${DISPLAY_STATUS_STYLES[item.displayStatus]}`}
                  >
                    {getStatusIcon(item.displayStatus)}
                    {DISPLAY_STATUS_LABELS[item.displayStatus]}
                  </span>
                </div>

                <div className="aspect-[4/3] overflow-hidden rounded-card bg-atelier-paper">
                  <SalesPhotoEvidenceOwnerAlbumImage
                    evidenceId={item.id}
                    canLoad={item.displayStatus === 'uploaded_private' && (item.hasPrivateThumbnailObject || item.hasPrivateImageObject)}
                    alt="成交照片"
                    previewVariant={item.hasPrivateThumbnailObject ? 'thumbnail' : 'image'}
                    fullVariant={item.hasPrivateImageObject ? 'image' : 'thumbnail'}
                  />
                </div>

                {transaction && PaymentMethodIcon && (
                  <div className="mt-3 flex items-center justify-between gap-3 border-b border-atelier-line pb-3">
                    <strong className="text-lg font-semibold tabular-nums text-foreground">
                      NT$ {transaction.amount.toLocaleString()}
                    </strong>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <PaymentMethodIcon className="h-4 w-4" aria-hidden="true" />
                      {SALES_PAYMENT_METHOD_LABELS[transaction.paymentMethod]}
                    </span>
                  </div>
                )}

                {caption && (
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {caption}
                  </p>
                )}

                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div>
                    <dt>上傳時間</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{formatDateTime(item.uploadedAt)}</dd>
                  </div>
                  <div>
                    <dt>到期時間</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{formatDateTime(item.expiresAt)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
