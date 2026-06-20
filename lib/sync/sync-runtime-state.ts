import { clearSyncPause } from '@/lib/sync/sync-permission-pause-service';

export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  SUCCESS = 'success',
  ERROR = 'error',
  OFFLINE = 'offline',
}

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;
  pendingCount: number;
  error: string | null;
  uploadProgress?: { current: number; total: number; currentItem?: string };
  downloadProgress?: { current: number; total: number; currentItem?: string; phase?: 'incremental' };
}

let hasExecutedInitialSync = false;
let hasSetupIntervals = false;
let isSyncLocked = false;
let activeSyncIdentity: string | null = null;

let globalSyncState: SyncState = {
  status: SyncStatus.IDLE,
  lastSyncAt: null,
  pendingCount: 0,
  error: null,
  uploadProgress: undefined,
  downloadProgress: undefined,
};

const globalStateListeners = new Set<(state: SyncState) => void>();

export function getGlobalSyncState(): SyncState {
  return globalSyncState;
}

export function subscribeGlobalSyncState(listener: (state: SyncState) => void): () => void {
  globalStateListeners.add(listener);
  return () => {
    globalStateListeners.delete(listener);
  };
}

export function updateGlobalState(updater: (prev: SyncState) => SyncState): void {
  globalSyncState = updater(globalSyncState);
  globalStateListeners.forEach(listener => listener(globalSyncState));
}

export function resetSyncRuntimeState(): void {
  hasExecutedInitialSync = false;
  hasSetupIntervals = false;
  isSyncLocked = false;
  updateGlobalState(() => ({
    status: SyncStatus.IDLE,
    lastSyncAt: null,
    pendingCount: 0,
    error: null,
    uploadProgress: undefined,
    downloadProgress: undefined,
  }));
}

export function resetInitialSyncFlag(): void {
  activeSyncIdentity = null;
  resetSyncRuntimeState();
  clearSyncPause();
}

export function getActiveSyncIdentity(): string | null {
  return activeSyncIdentity;
}

export function setActiveSyncIdentity(syncIdentity: string | null): void {
  activeSyncIdentity = syncIdentity;
}

export function acquireSyncLock(): boolean {
  if (isSyncLocked) return false;
  isSyncLocked = true;
  return true;
}

export function releaseSyncLock(): void {
  isSyncLocked = false;
}

export function hasSetupSyncIntervals(): boolean {
  return hasSetupIntervals;
}

export function markSyncIntervalsSetup(): void {
  hasSetupIntervals = true;
}

export function hasExecutedInitialSyncFlag(): boolean {
  return hasExecutedInitialSync;
}

export function markInitialSyncExecuted(): void {
  hasExecutedInitialSync = true;
}
