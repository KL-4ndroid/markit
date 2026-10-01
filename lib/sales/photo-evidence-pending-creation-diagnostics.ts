import type {
  LocalPendingSalesPhotoEvidenceCreation,
  PendingSalesPhotoEvidenceCreationStatus,
} from '@/lib/sales/photo-evidence-pending-creation';
import {
  classifyPendingSalesPhotoEvidenceCreationRecovery,
  type ClassifyPendingSalesPhotoEvidenceCreationRecoveryOptions,
  type PendingSalesPhotoEvidenceCreationRecoveryAction,
} from '@/lib/sales/photo-evidence-pending-creation-recovery';

export type PendingSalesPhotoEvidenceDiagnosticSeverity =
  | 'none'
  | 'info'
  | 'warning'
  | 'critical';

export type PendingSalesPhotoEvidenceOwnerRecommendation =
  | 'none'
  | 'wait_for_sale_sync'
  | 'retry_can_continue'
  | 'recover_stale_creating'
  | 'retire_created_queue_row'
  | 'manual_review_required';

export type PendingSalesPhotoEvidenceCreationDiagnosticItem = {
  queueId: string;
  saleEventId: string;
  marketId: string;
  status: PendingSalesPhotoEvidenceCreationStatus;
  retryCount: number;
  updatedAt: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  severity: PendingSalesPhotoEvidenceDiagnosticSeverity;
  ownerRecommendation: PendingSalesPhotoEvidenceOwnerRecommendation;
  recovery: PendingSalesPhotoEvidenceCreationRecoveryAction;
};

export type PendingSalesPhotoEvidenceCreationDiagnosticSummary = {
  totalCount: number;
  severityCounts: Record<PendingSalesPhotoEvidenceDiagnosticSeverity, number>;
  recommendationCounts: Record<PendingSalesPhotoEvidenceOwnerRecommendation, number>;
  items: PendingSalesPhotoEvidenceCreationDiagnosticItem[];
};

const EMPTY_SEVERITY_COUNTS: Record<PendingSalesPhotoEvidenceDiagnosticSeverity, number> = {
  none: 0,
  info: 0,
  warning: 0,
  critical: 0,
};

const EMPTY_RECOMMENDATION_COUNTS: Record<PendingSalesPhotoEvidenceOwnerRecommendation, number> = {
  none: 0,
  wait_for_sale_sync: 0,
  retry_can_continue: 0,
  recover_stale_creating: 0,
  retire_created_queue_row: 0,
  manual_review_required: 0,
};

function classifySeverity(
  item: LocalPendingSalesPhotoEvidenceCreation,
  recovery: PendingSalesPhotoEvidenceCreationRecoveryAction
): PendingSalesPhotoEvidenceDiagnosticSeverity {
  if (recovery.action === 'manual_review') return 'critical';
  if (recovery.action === 'recover_stale_creating') return 'warning';
  if (item.status === 'failed_retryable') return 'warning';
  if (recovery.action === 'cleanup_created_queue_row') return 'info';
  if (item.status === 'waiting_for_event_sync' || item.status === 'creating') return 'info';
  return 'none';
}

function classifyOwnerRecommendation(
  item: LocalPendingSalesPhotoEvidenceCreation,
  recovery: PendingSalesPhotoEvidenceCreationRecoveryAction
): PendingSalesPhotoEvidenceOwnerRecommendation {
  if (recovery.action === 'manual_review') return 'manual_review_required';
  if (recovery.action === 'recover_stale_creating') return 'recover_stale_creating';
  if (recovery.action === 'cleanup_created_queue_row') return 'retire_created_queue_row';
  if (item.status === 'waiting_for_event_sync') return 'wait_for_sale_sync';
  if (item.status === 'failed_retryable') return 'retry_can_continue';
  return 'none';
}

function sortDiagnostics(
  items: PendingSalesPhotoEvidenceCreationDiagnosticItem[]
): PendingSalesPhotoEvidenceCreationDiagnosticItem[] {
  const severityWeight: Record<PendingSalesPhotoEvidenceDiagnosticSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
    none: 3,
  };

  return [...items].sort((a, b) => {
    const severityDiff = severityWeight[a.severity] - severityWeight[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function buildPendingSalesPhotoEvidenceCreationDiagnosticItem(
  item: LocalPendingSalesPhotoEvidenceCreation,
  options: ClassifyPendingSalesPhotoEvidenceCreationRecoveryOptions = {}
): PendingSalesPhotoEvidenceCreationDiagnosticItem {
  const recovery = classifyPendingSalesPhotoEvidenceCreationRecovery(item, options);
  const severity = classifySeverity(item, recovery);

  return {
    queueId: item.queueId,
    saleEventId: item.saleEventId,
    marketId: item.marketId,
    status: item.status,
    retryCount: item.retryCount,
    updatedAt: item.updatedAt,
    lastErrorCode: item.lastErrorCode,
    lastErrorMessage: item.lastErrorMessage,
    severity,
    ownerRecommendation: classifyOwnerRecommendation(item, recovery),
    recovery,
  };
}

export function buildPendingSalesPhotoEvidenceCreationDiagnosticSummary(
  items: readonly LocalPendingSalesPhotoEvidenceCreation[],
  options: ClassifyPendingSalesPhotoEvidenceCreationRecoveryOptions = {}
): PendingSalesPhotoEvidenceCreationDiagnosticSummary {
  const diagnosticItems = sortDiagnostics(
    items.map(item => buildPendingSalesPhotoEvidenceCreationDiagnosticItem(item, options))
  );
  const severityCounts = { ...EMPTY_SEVERITY_COUNTS };
  const recommendationCounts = { ...EMPTY_RECOMMENDATION_COUNTS };

  for (const item of diagnosticItems) {
    severityCounts[item.severity] += 1;
    recommendationCounts[item.ownerRecommendation] += 1;
  }

  return {
    totalCount: diagnosticItems.length,
    severityCounts,
    recommendationCounts,
    items: diagnosticItems,
  };
}
