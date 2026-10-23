import { SyncStatus, type SyncState } from './sync-runtime-state';

/** A successful request is not a successful sync while local-only events remain. */
export function completeSyncState(previous: SyncState, pendingCount: number, now: number): SyncState {
  return {
    ...previous,
    status: pendingCount > 0 ? SyncStatus.ERROR : SyncStatus.SUCCESS,
    lastSyncAt: pendingCount > 0 ? previous.lastSyncAt : now,
    pendingCount,
    error: pendingCount > 0 ? '部分資料尚未送達雲端，已保存在這台裝置。' : null,
    uploadProgress: undefined,
    downloadProgress: undefined,
  };
}
