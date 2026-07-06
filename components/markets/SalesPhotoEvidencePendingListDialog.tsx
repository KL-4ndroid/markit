'use client';

import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import {
  buildPendingSalesPhotoEvidenceCreationDiagnosticSummary,
  type PendingSalesPhotoEvidenceCreationDiagnosticItem,
} from '@/lib/sales/photo-evidence-pending-creation-diagnostics';
import type {
  SalesPhotoEvidencePendingCreationListItem,
} from '@/lib/sales/photo-evidence-pending-creation-read-model';
import { SalesPhotoEvidenceLocalCaptureAction } from './SalesPhotoEvidenceLocalCaptureAction';

interface SalesPhotoEvidencePendingListDialogProps {
  isOpen: boolean;
  items: SalesPhotoEvidencePendingCreationListItem[];
  isLoading?: boolean;
  loadError?: string | null;
  lastLoadedAt?: number | null;
  onRefresh?: () => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<SalesPhotoEvidencePendingCreationListItem['status'], string> = {
  waiting_for_event_sync: '等待銷售同步',
  creating: '建立中',
  created: '已建立',
  failed_retryable: '可重試失敗',
  failed_permanent: '永久失敗',
  blocked_invalid_source: '來源異常',
};

const STATUS_STYLES: Record<SalesPhotoEvidencePendingCreationListItem['status'], string> = {
  waiting_for_event_sync: 'bg-soft-yellow text-secondary',
  creating: 'bg-primary/10 text-primary',
  created: 'bg-green-50 text-green-700',
  failed_retryable: 'bg-orange-50 text-orange-700',
  failed_permanent: 'bg-red-50 text-red-700',
  blocked_invalid_source: 'bg-red-50 text-red-700',
};

const SEVERITY_LABELS: Record<PendingSalesPhotoEvidenceCreationDiagnosticItem['severity'], string> = {
  none: '正常',
  info: '注意',
  warning: '需留意',
  critical: '需檢查',
};

const SEVERITY_STYLES: Record<PendingSalesPhotoEvidenceCreationDiagnosticItem['severity'], string> = {
  none: 'bg-green-50 text-green-700',
  info: 'bg-soft-yellow text-secondary',
  warning: 'bg-orange-50 text-orange-700',
  critical: 'bg-red-50 text-red-700',
};

const RECOMMENDATION_LABELS: Record<
  PendingSalesPhotoEvidenceCreationDiagnosticItem['ownerRecommendation'],
  string
> = {
  none: '目前不需要處理。',
  wait_for_sale_sync: '等待這筆銷售同步完成後，系統才能建立照片需求。',
  retry_can_continue: '這筆資料仍可重試，請先保留本機資料。',
  recover_stale_creating: '建立中狀態已逾時，之後需要經確認再恢復為可重試。',
  retire_created_queue_row: '照片需求已建立，之後可只清理本機佇列紀錄。',
  manual_review_required: '來源資料異常或已達永久失敗，需人工檢查後再處理。',
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

function getSeverityIcon(severity: PendingSalesPhotoEvidenceCreationDiagnosticItem['severity']) {
  if (severity === 'critical') return <ShieldAlert className="h-4 w-4" />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4" />;
  if (severity === 'none') return <CheckCircle2 className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function countByStatus(items: SalesPhotoEvidencePendingCreationListItem[]) {
  return items.reduce<Record<SalesPhotoEvidencePendingCreationListItem['status'], number>>(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    {
      waiting_for_event_sync: 0,
      creating: 0,
      created: 0,
      failed_retryable: 0,
      failed_permanent: 0,
      blocked_invalid_source: 0,
    }
  );
}

export function SalesPhotoEvidencePendingListDialog({
  isOpen,
  items,
  isLoading = false,
  loadError = null,
  lastLoadedAt = null,
  onRefresh,
  onClose,
}: SalesPhotoEvidencePendingListDialogProps) {
  if (!isOpen) return null;

  const statusCounts = countByStatus(items);
  const diagnostics = buildPendingSalesPhotoEvidenceCreationDiagnosticSummary(items);
  const diagnosticByQueueId = new Map(diagnostics.items.map(item => [item.queueId, item]));
  const needsAttentionCount = diagnostics.severityCounts.warning + diagnostics.severityCounts.critical;
  const lastLoadedLabel = lastLoadedAt ? formatDateTime(new Date(lastLoadedAt).toISOString()) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 py-6 sm:items-center">
      <section className="w-full max-w-lg rounded-[1.5rem] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-lg font-medium text-foreground">待補照片紀錄</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              這裡只顯示本機尚未完成的照片證明佇列，不會自動清除、恢復或上傳任何資料。
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-background px-3 py-1 text-muted-foreground">
                全部 {items.length}
              </span>
              <span className="rounded-full bg-soft-yellow px-3 py-1 text-secondary">
                等待同步 {statusCounts.waiting_for_event_sync}
              </span>
              <span className="rounded-full bg-orange-50 px-3 py-1 text-orange-700">
                需留意 {needsAttentionCount}
              </span>
            </div>
            {lastLoadedLabel && (
              <p className="mt-2 text-xs text-muted-foreground">
                最後讀取時間：{lastLoadedLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
            aria-label="關閉待補照片紀錄"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {loadError ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              讀取中
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">目前沒有待補照片紀錄</p>
              <p className="mt-1 text-xs text-muted-foreground">
                若市集要求照片證明，成交後產生的待補項目會顯示在這裡。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const diagnostic = diagnosticByQueueId.get(item.queueId);

                return (
                  <article
                    key={item.queueId}
                    className="rounded-2xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          銷售事件：{item.saleEventId}
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

                    {diagnostic && (
                      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${SEVERITY_STYLES[diagnostic.severity]}`}
                          >
                            {getSeverityIcon(diagnostic.severity)}
                            {SEVERITY_LABELS[diagnostic.severity]}
                          </span>
                          <span>{RECOMMENDATION_LABELS[diagnostic.ownerRecommendation]}</span>
                        </div>
                      </div>
                    )}

                    <SalesPhotoEvidenceLocalCaptureAction
                      status={item.status}
                      captureEnabled={false}
                    />

                    {(item.retryCount > 0 || item.lastErrorMessage) && (
                      <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-muted-foreground">
                        {item.retryCount > 0 && <p>重試次數：{item.retryCount}</p>}
                        {item.lastErrorMessage && <p className="mt-1">錯誤：{item.lastErrorMessage}</p>}
                      </div>
                    )}
                  </article>
                );
              })}
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
              重新讀取
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
