import assert from 'node:assert/strict';
import {
  clearSyncPause,
  getSyncPauseUntil,
  pauseSyncTemporarily,
  PERMISSION_ERROR_PAUSE_MS,
  recordSyncPermissionError,
  SYNC_PAUSE_UNTIL_KEY,
  SYNC_PERMISSION_ERROR_LOG_KEY,
} from '../lib/sync/sync-permission-pause-service';

function installMockLocalStorage(): () => void {
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window;
  const originalLocalStorage = (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage;
  const store = new Map<string, string>();

  (globalThis as typeof globalThis & { window?: unknown }).window = globalThis;
  (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  return () => {
    (globalThis as typeof globalThis & { window?: unknown }).window = originalWindow;
    (globalThis as typeof globalThis & { localStorage?: unknown }).localStorage = originalLocalStorage;
  };
}

function main(): void {
  const restore = installMockLocalStorage();
  const originalConsoleError = console.error;

  try {
    console.error = () => {};

    const now = 1_700_000_000_000;
    const pauseUntil = pauseSyncTemporarily(now);

    assert.equal(pauseUntil, now + PERMISSION_ERROR_PAUSE_MS);
    assert.equal(getSyncPauseUntil(), pauseUntil);
    console.log('PASS pauseSyncTemporarily stores pause-until timestamp');

    localStorage.setItem(SYNC_PAUSE_UNTIL_KEY, 'not-a-number');
    assert.equal(getSyncPauseUntil(), 0);
    console.log('PASS getSyncPauseUntil fail-closes invalid stored values');

    clearSyncPause();
    assert.equal(getSyncPauseUntil(), 0);
    console.log('PASS clearSyncPause removes pause key');

    localStorage.setItem(SYNC_PERMISSION_ERROR_LOG_KEY, JSON.stringify([{
      event: 'sync_permission_error',
      timestamp: '2026-06-19T23:59:59.000Z',
      reason: '403_forbidden_or_policy_violation',
      userId: 'legacy-user',
      errorCode: 'PGRST301',
      errorMessage: 'legacy raw error',
      pauseUntil: now - 1,
    }]));
    for (let index = 0; index < 12; index++) {
      recordSyncPermissionError(
        now + index,
        `2026-06-20T00:00:${String(index).padStart(2, '0')}.000Z`
      );
    }

    const history = JSON.parse(localStorage.getItem(SYNC_PERMISSION_ERROR_LOG_KEY) || '[]');
    assert.equal(history.length, 10);
    assert.equal(history[0].timestamp, '2026-06-20T00:00:02.000Z');
    assert.equal(history[9].timestamp, '2026-06-20T00:00:11.000Z');
    assert.equal(history[9].schemaVersion, 1);
    assert.equal(history[9].event, 'sync_permission_error');
    assert.equal(history[9].reason, '403_forbidden_or_policy_violation');
    assert.deepEqual(
      Object.keys(history[9]).sort(),
      ['event', 'pauseUntil', 'reason', 'schemaVersion', 'timestamp'],
    );
    assert.doesNotMatch(JSON.stringify(history), /legacy-user|PGRST301|legacy raw error/);
    console.log('PASS recordSyncPermissionError sanitizes and caps local history');
  } finally {
    console.error = originalConsoleError;
    restore();
  }
}

try {
  main();
} catch (error) {
  console.error('FAIL sync permission pause service');
  throw error;
}
