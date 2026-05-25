import {
  checkCurrentDatabaseIntegrity,
  db,
  exportData,
  initializeDatabaseSafely,
  type DatabaseInitResult,
} from './index';
import type { IntegrityResult } from './integrity';

export type DatabaseRecoveryStatus =
  | {
      state: 'healthy';
      init: Extract<DatabaseInitResult, { ok: true }>;
      integrity: IntegrityResult;
      canExportBackup: true;
    }
  | {
      state: 'unhealthy';
      init: Extract<DatabaseInitResult, { ok: false }>;
      integrity?: IntegrityResult;
      canExportBackup: boolean;
    };

export interface RecoveryBackup {
  filename: string;
  mimeType: 'application/json';
  content: string;
  createdAt: number;
}

export async function getDatabaseRecoveryStatus(): Promise<DatabaseRecoveryStatus> {
  const init = await initializeDatabaseSafely();

  if (init.ok) {
    return {
      state: 'healthy',
      init,
      integrity: init.integrity,
      canExportBackup: true,
    };
  }

  return {
    state: 'unhealthy',
    init,
    integrity: init.integrity,
    canExportBackup: db.isOpen(),
  };
}

export async function retryDatabaseRecovery(): Promise<DatabaseRecoveryStatus> {
  if (db.isOpen()) {
    db.close();
  }

  return getDatabaseRecoveryStatus();
}

export async function createRecoveryBackup(): Promise<RecoveryBackup> {
  if (!db.isOpen()) {
    await db.open();
  }

  const integrity = await checkCurrentDatabaseIntegrity();
  const content = await exportData();
  const createdAt = Date.now();
  const suffix = integrity.ok ? 'healthy' : 'needs-review';
  const timestamp = new Date(createdAt).toISOString().replace(/[:.]/g, '-');

  return {
    filename: `market-pulse-recovery-${suffix}-${timestamp}.json`,
    mimeType: 'application/json',
    content,
    createdAt,
  };
}
