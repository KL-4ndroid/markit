export const SYNC_PAUSE_UNTIL_KEY = 'sync_pause_until';
export const SYNC_PERMISSION_ERROR_LOG_KEY = 'sync_permission_error_history';
export const PERMISSION_ERROR_PAUSE_MS = 10 * 60 * 1000;

export interface SyncPermissionErrorLog {
  schemaVersion: 1;
  event: 'sync_permission_error';
  timestamp: string;
  reason: '403_forbidden_or_policy_violation';
  pauseUntil: number;
}

function sanitizePermissionErrorLog(value: unknown): SyncPermissionErrorLog | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const timestamp = typeof record.timestamp === 'string' && Number.isFinite(Date.parse(record.timestamp))
    ? record.timestamp
    : null;
  const pauseUntil = typeof record.pauseUntil === 'number'
    && Number.isSafeInteger(record.pauseUntil)
    && record.pauseUntil >= 0
    ? record.pauseUntil
    : null;
  if (!timestamp || pauseUntil === null) return null;

  return {
    schemaVersion: 1,
    event: 'sync_permission_error',
    timestamp,
    reason: '403_forbidden_or_policy_violation',
    pauseUntil,
  };
}

function readSanitizedPermissionErrorHistory(): SyncPermissionErrorLog[] {
  const value = JSON.parse(localStorage.getItem(SYNC_PERMISSION_ERROR_LOG_KEY) || '[]') as unknown;
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizePermissionErrorLog)
    .filter((entry): entry is SyncPermissionErrorLog => entry !== null)
    .slice(-9);
}

export function clearSyncPause(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(SYNC_PAUSE_UNTIL_KEY);
  } catch {
    console.error('Failed to clear the sync pause marker.');
  }
}

export function getSyncPauseUntil(): number {
  if (typeof window === 'undefined') return 0;

  try {
    const value = Number(localStorage.getItem(SYNC_PAUSE_UNTIL_KEY) || '0');
    return Number.isFinite(value) ? value : 0;
  } catch {
    console.error('Failed to read the sync pause marker.');
    return 0;
  }
}

export function pauseSyncTemporarily(now = Date.now()): number {
  const pauseUntil = now + PERMISSION_ERROR_PAUSE_MS;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SYNC_PAUSE_UNTIL_KEY, String(pauseUntil));
    } catch {
      console.error('Failed to save the sync pause marker.');
    }
  }

  return pauseUntil;
}

export function recordSyncPermissionError(
  pauseUntil: number,
  timestamp = new Date().toISOString()
): SyncPermissionErrorLog {
  const permissionErrorLog: SyncPermissionErrorLog = {
    schemaVersion: 1,
    event: 'sync_permission_error',
    timestamp,
    reason: '403_forbidden_or_policy_violation',
    pauseUntil,
  };

  try {
    if (typeof window !== 'undefined') {
      const history = readSanitizedPermissionErrorHistory();
      history.push(permissionErrorLog);
      localStorage.setItem(SYNC_PERMISSION_ERROR_LOG_KEY, JSON.stringify(history));
    }
  } catch {
    console.error('Failed to save the sanitized sync permission history.');
  }

  return permissionErrorLog;
}
