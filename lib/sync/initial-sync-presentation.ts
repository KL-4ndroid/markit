import { SyncStatus } from './sync-runtime-state';

interface Progress { current: number; total: number; currentItem?: string }
export interface InitialSyncPresentationInput {
  status: SyncStatus;
  pendingCount: number;
  isOnline: boolean;
  isTakingLonger: boolean;
  downloadProgress?: Progress;
  uploadProgress?: Progress;
}

/** Presentation only. A phase count is never advertised as overall recovery progress. */
export function getInitialSyncPresentation(input: InitialSyncPresentationInput) {
  const offline = !input.isOnline || input.status === SyncStatus.OFFLINE;
  const succeeded = !offline && input.status === SyncStatus.SUCCESS && input.pendingCount === 0;
  const failed = !offline && (input.status === SyncStatus.ERROR
    || (input.status === SyncStatus.SUCCESS && input.pendingCount > 0));
  const syncing = !offline && input.status === SyncStatus.SYNCING;
  const progress = input.uploadProgress && input.uploadProgress.current < input.uploadProgress.total
    ? input.uploadProgress : input.downloadProgress;
  const validProgress = syncing && progress && Number.isSafeInteger(progress.total) && progress.total > 0
    && Number.isSafeInteger(progress.current) && progress.current >= 0 && progress.current <= progress.total
    ? { current: progress.current, total: progress.total, percentage: Math.round(progress.current / progress.total * 100) }
    : null;
  return {
    title: succeeded ? '本次紀錄同步完成' : offline ? '已登入，目前無法連線'
      : failed ? '已登入，資料尚未準備完成' : '已登入，正在準備資料',
    description: succeeded ? '即將開啟應用程式。'
      : offline ? '無法讀取最新雲端資料，請恢復連線後重新載入。'
      : failed ? '本次同步尚未完成，可重試或先查看這台裝置已有的資料。'
      : progress?.currentItem || '正在確認並整理雲端紀錄…',
    hint: succeeded ? null : failed || offline ? '本機已有的資料仍保留；尚未送達雲端的內容不代表已完成同步。'
      : input.isTakingLonger ? '仍在處理中，可先查看本機資料；資料可能尚未完整。'
      : '完成後會自動開啟，請保持此頁開啟。',
    succeeded, failed, offline, syncing,
    canRetry: !succeeded && !syncing && input.isOnline,
    canContinue: !succeeded && (failed || offline || input.isTakingLonger),
    progress: validProgress,
  };
}
