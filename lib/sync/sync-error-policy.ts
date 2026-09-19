import {
  pauseSyncTemporarily,
  recordSyncPermissionError,
} from '@/lib/sync/sync-permission-pause-service';

export async function handlePermissionSyncError(
  onPausedState: () => void | Promise<void>
): Promise<void> {
  const pauseUntil = pauseSyncTemporarily();
  recordSyncPermissionError(pauseUntil);

  await onPausedState();

  if (typeof window !== 'undefined') {
    const { toast } = await import('sonner');
    toast.warning('同步暫時因權限檢查失敗而暫停；本地資料已保留，稍後會自動重試。');
  }
}

export type SyncFailureKind = 'network' | 'permission' | 'unexpected';

function errorField(error: unknown, field: 'code' | 'message'): string {
  if (!error || typeof error !== 'object') return '';
  const value = (error as Record<string, unknown>)[field];
  return typeof value === 'string' ? value : '';
}

export function classifySyncFailure(error: unknown): SyncFailureKind {
  const code = errorField(error, 'code');
  const message = errorField(error, 'message');

  if (
    message.includes('Failed to fetch')
    || message.includes('ERR_CONNECTION')
    || code === 'ECONNREFUSED'
  ) {
    return 'network';
  }
  if (code === 'PGRST301' || message.includes('403')) {
    return 'permission';
  }
  return 'unexpected';
}
