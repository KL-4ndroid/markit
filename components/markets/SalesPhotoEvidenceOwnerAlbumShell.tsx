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
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  onDelete?: (evidenceId: string) => Promise<boolean>;
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

type AlbumFilter = 'current' | 'uploaded' | 'pending' | 'failed' | 'expired' | 'all';

function matchesAlbumFilter(item: SalesPhotoEvidenceAlbumItem, filter: AlbumFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'current') return !['expired', 'waived', 'skipped'].includes(item.displayStatus);
  if (filter === 'uploaded') return item.displayStatus === 'uploaded_private';
  if (filter === 'pending') return item.displayStatus === 'pending' || item.displayStatus === 'captured_local';
  if (filter === 'failed') return item.displayStatus === 'upload_failed';
  return item.displayStatus === 'expired';
}

function FilterButton({
  label,
  value,
  isActive,
  onClick,
}: {
  label: string;
  value: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-xs transition-colors ${
        isActive
          ? 'border-primary bg-primary text-white'
          : 'border-atelier-line bg-atelier-canvas text-atelier-muted hover:bg-atelier-sage-soft hover:text-atelier-ink'
      }`}
    >
      <span>{label}</span>
      <strong className={`font-semibold tabular-nums ${isActive ? 'text-white' : 'text-atelier-ink'}`}>{value}</strong>
    </button>
  );
}

export function SalesPhotoEvidenceOwnerAlbumShell({
  viewModel,
  isLoading = false,
  loadError = null,
  onRefresh,
  onDelete,
  transactionBySaleId = new Map(),
  className = '',
}: SalesPhotoEvidenceOwnerAlbumShellProps) {
  const { summary } = viewModel;
  const [deleteItem, setDeleteItem] = useState<SalesPhotoEvidenceAlbumItem | null>(null);
  const [filter, setFilter] = useState<AlbumFilter>('current');
  const currentCount = useMemo(
    () => viewModel.items.filter(item => matchesAlbumFilter(item, 'current')).length,
    [viewModel.items]
  );
  const filteredItems = useMemo(
    () => viewModel.items.filter(item => matchesAlbumFilter(item, filter)),
    [filter, viewModel.items]
  );
  const filterOptions: ReadonlyArray<{ id: AlbumFilter; label: string; value: number }> = [
    { id: 'current', label: '目前', value: currentCount },
    { id: 'uploaded', label: '已上傳', value: summary.countByDisplayStatus.uploaded_private },
    {
      id: 'pending',
      label: '待處理',
      value: summary.countByDisplayStatus.pending + summary.countByDisplayStatus.captured_local,
    },
    { id: 'failed', label: '上傳異常', value: summary.countByDisplayStatus.upload_failed },
    { id: 'expired', label: '已過期', value: summary.countByDisplayStatus.expired },
    { id: 'all', label: '全部', value: summary.totalCount },
  ];

  const confirmDelete = async () => {
    if (!deleteItem || !onDelete) return;
    const deleted = await onDelete(deleteItem.id);
    if (deleted) setDeleteItem(null);
  };

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

      <div className="mb-5 flex flex-wrap gap-2" aria-label="照片狀態篩選">
        {filterOptions.map(option => (
          <FilterButton
            key={option.id}
            label={option.label}
            value={option.value}
            isActive={filter === option.id}
            onClick={() => setFilter(option.id)}
          />
        ))}
      </div>

      {loadError ? (
        <div className="rounded-card border border-status-danger-border bg-status-danger-bg px-4 py-3 text-sm text-status-danger-text">
          {loadError}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-card border border-dashed border-atelier-line bg-atelier-canvas px-4 py-8 text-center">
          <ImageOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {viewModel.items.length === 0 ? '目前沒有照片紀錄' : '此篩選沒有照片紀錄'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {viewModel.items.length === 0
              ? '啟用拍照流程後，這裡會顯示每筆成交對應的照片狀態。'
              : '可切換其他狀態查看歷史照片紀錄。'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredItems.map(item => {
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
                      成交紀錄
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(item.saleCompletedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${DISPLAY_STATUS_STYLES[item.displayStatus]}`}
                    >
                      {getStatusIcon(item.displayStatus)}
                      {DISPLAY_STATUS_LABELS[item.displayStatus]}
                    </span>
                    {onDelete && item.displayStatus === 'uploaded_private' && (
                      <button
                        type="button"
                        onClick={() => setDeleteItem(item)}
                        className="flex h-11 w-11 items-center justify-center rounded-control text-danger transition-colors hover:bg-status-danger-bg focus-visible:ring-2 focus-visible:ring-danger"
                        aria-label="刪除成交照片"
                        title="刪除成交照片"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
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
      <ConfirmDialog
        open={deleteItem !== null}
        onClose={() => setDeleteItem(null)}
        onConfirm={confirmDelete}
        title="刪除成交照片？"
        description="照片會從成交照片與每日表現的最近成交照片中移除，雲端檔案也會一併刪除。此操作無法復原。"
        confirmLabel="刪除照片"
        tone="danger"
      />
    </section>
  );
}
