export const SYNC_PAUSE_UNTIL_KEY = 'sync_pause_until';
export const SYNC_PERMISSION_ERROR_LOG_KEY = 'sync_permission_error_history';
export const PERMISSION_ERROR_PAUSE_MS = 10 * 60 * 1000;

export interface SyncPermissionErrorLog {
  event: 'sync_permission_error';
  timestamp: string;
  reason: '403_forbidden_or_policy_violation';
  userId: string;
  errorCode?: unknown;
  errorMessage?: unknown;
  pauseUntil: number;
}

export function clearSyncPause(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SYNC_PAUSE_UNTIL_KEY);
  } catch (error) {
    console.error('清除同步暫停標記失敗:', error);
  }
}

export function getSyncPauseUntil(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const value = Number(localStorage.getItem(SYNC_PAUSE_UNTIL_KEY) || '0');
    return Number.isFinite(value) ? value : 0;
  } catch (error) {
    console.error('讀取同步暫停標記失敗:', error);
    return 0;
  }
}

export function pauseSyncTemporarily(now = Date.now()): number {
  const pauseUntil = now + PERMISSION_ERROR_PAUSE_MS;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SYNC_PAUSE_UNTIL_KEY, String(pauseUntil));
    } catch (error) {
      console.error('保存同步暫停標記失敗:', error);
    }
  }

  return pauseUntil;
}

export function recordSyncPermissionError(
  error: { code?: unknown; message?: unknown } | undefined,
  userId: string,
  pauseUntil: number,
  timestamp = new Date().toISOString()
): SyncPermissionErrorLog {
  const permissionErrorLog: SyncPermissionErrorLog = {
    event: 'sync_permission_error',
    timestamp,
    reason: '403_forbidden_or_policy_violation',
    userId,
    errorCode: error?.code,
    errorMessage: error?.message,
    pauseUntil,
  };

  console.error('🚫 同步權限錯誤，已保留本地資料並暫停同步:', permissionErrorLog);

  try {
    if (typeof window !== 'undefined') {
      const history = JSON.parse(localStorage.getItem(SYNC_PERMISSION_ERROR_LOG_KEY) || '[]');
      history.push(permissionErrorLog);
      if (history.length > 10) {
        history.shift();
      }
      localStorage.setItem(SYNC_PERMISSION_ERROR_LOG_KEY, JSON.stringify(history));
    }
  } catch (storageError) {
    console.error('保存同步權限錯誤記錄失敗:', storageError);
  }

  return permissionErrorLog;
}
