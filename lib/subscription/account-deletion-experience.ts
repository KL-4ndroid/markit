import type { LocalPendingWriteReport } from '@/lib/sync/local-pending-write-report';
import type { AccountDeletionRequestStatus } from './account-deletion-contract';
import { resolveAccountDeletionPreflight } from './account-deletion-preflight';

export type DeletionDeviceCheck = Readonly<{ ready: boolean; message: string }>;
export function evaluateDeletionDeviceCheck(report: LocalPendingWriteReport, actorId: string, financialDraftCount: number): DeletionDeviceCheck {
  if (report.userId !== actorId || report.blockingReasonCodes.includes('actor_mismatch')) {
    return { ready: false, message: '裝置資料與目前帳號不一致，請先回帳號與同步處理。' };
  }
  if (!report.isOnline || report.syncLocked) return { ready: false, message: '請連線並等候同步結束，再重新檢查。' };
  const counts = [report.pendingEventCount, report.unfinishedSyncQueueCount,
    report.pendingSalesPhotoEvidenceCreationCount, report.pendingSalesPhotoEvidencePayloadCount,
    report.pendingProductCoverPhotoUploadCount, report.pendingProductCoverPhotoPayloadCount,
    report.pendingMarketJournalDraftCount ?? 0, report.pendingMarketCashDraftCount ?? 0, financialDraftCount];
  if (counts.some(n => !Number.isSafeInteger(n) || n < 0) || report.blockingReasonCodes.includes('read_failed')) {
    return { ready: false, message: '無法確認這台裝置的待送資料，請重新檢查；資料保持原樣。' };
  }
  const decision = resolveAccountDeletionPreflight({ report, safeExportAvailable: false });
  const ready = decision.outcome === 'ready' && counts.every(n => n === 0);
  return { ready, message: ready ? '這台裝置沒有偵測到待送資料或未完成草稿。'
    : '仍有待送紀錄、照片或未完成草稿。請先回帳號同步或原市集處理，再重新檢查；這裡不會捨棄資料。' };
}

export const DELETION_STATUS_COPY: Record<AccountDeletionRequestStatus, { title: string; description: string }> = {
  requested: { title: '申請已送出，尚未確認', description: '確認後才會進入等待處理；目前仍可撤回申請。' },
  identity_confirmed: { title: '已確認，等待處理', description: '尚未代表刪除完成。清理開始前仍可撤回。' },
  processing: { title: '正在處理', description: '清理已開始，現在無法撤回。請稍後重新讀取進度。' },
  failed_retryable: { title: '處理尚未完成', description: '目前沒有完成刪除。請稍後讀取進度，持續無法完成時可聯絡支援。' },
  manual_review: { title: '需要協助，尚未完成', description: '請聯絡支援確認處理進度；這不是刪除完成通知。' },
  cancelled: { title: '申請已撤回', description: '這次刪除申請已停止，不會自動重新申請。' },
  completed: { title: '刪除已完成', description: '伺服器已回報完成；本批測試不會清除任何真實帳號或裝置資料。' },
};
