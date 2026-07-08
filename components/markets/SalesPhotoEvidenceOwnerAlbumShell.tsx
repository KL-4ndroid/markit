'use client';

import {
  Camera,
  Clock,
  ImageOff,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  SalesPhotoEvidenceAlbumItem,
  SalesPhotoEvidenceAlbumItemDisplayStatus,
  SalesPhotoEvidenceOwnerAlbumViewModel,
} from '@/lib/sales/photo-evidence-owner-album-read-model';
import { SalesPhotoEvidenceOwnerAlbumImage } from './SalesPhotoEvidenceOwnerAlbumImage';

interface SalesPhotoEvidenceOwnerAlbumShellProps {
  viewModel: SalesPhotoEvidenceOwnerAlbumViewModel;
  isLoading?: boolean;
  loadError?: string | null;
  onRefresh?: () => void;
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

function getItemCaption(item: SalesPhotoEvidenceAlbumItem): string {
  if (item.displayStatus === 'uploaded_private') {
    return item.hasPrivateThumbnailObject
      ? '已有私有縮圖物件，需等 signed read 才能顯示圖片。'
      : '已有私有圖片物件，尚無可顯示縮圖。';
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
    <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <strong className="font-medium text-foreground">{value}</strong>
    </span>
  );
}

export function SalesPhotoEvidenceOwnerAlbumShell({
  viewModel,
  isLoading = false,
  loadError = null,
  onRefresh,
  className = '',
}: SalesPhotoEvidenceOwnerAlbumShellProps) {
  const { summary } = viewModel;

  return (
    <section className={`bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Camera className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-medium text-foreground">銷售照片紀錄</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              這裡只顯示照片紀錄狀態。正式圖片預覽會等 signed read 流程核准後再開放。
            </p>
          </div>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : viewModel.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center">
          <ImageOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">目前沒有照片紀錄</p>
          <p className="mt-1 text-xs text-muted-foreground">
            啟用拍照流程後，這裡會顯示每筆成交對應的照片狀態。
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {viewModel.items.map(item => (
            <article key={item.id} className="rounded-2xl border border-border bg-background p-4">
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

              <div className="aspect-[4/3] overflow-hidden rounded-xl bg-white">
                <SalesPhotoEvidenceOwnerAlbumImage
                  evidenceId={item.id}
                  canLoad={item.displayStatus === 'uploaded_private' && item.hasPrivateThumbnailObject}
                  alt={`銷售照片 ${item.saleId ?? item.id}`}
                />
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {getItemCaption(item)}
              </p>

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
          ))}
        </div>
      )}
    </section>
  );
}
