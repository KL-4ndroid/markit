import {
  pauseSyncTemporarily,
  recordSyncPermissionError,
} from '@/lib/sync/sync-permission-pause-service';

export async function handlePermissionSyncError(
  error: any,
  userId: string,
  onPausedState: () => void | Promise<void>
): Promise<void> {
  const pauseUntil = pauseSyncTemporarily();
  recordSyncPermissionError(error, userId, pauseUntil);

  await onPausedState();

  if (typeof window !== 'undefined') {
    const { toast } = await import('sonner');
    toast.warning('同步暫時因權限檢查失敗而暫停；本地資料已保留，稍後會自動重試。');
  }
}
