import {
  checkCurrentDatabaseIntegrity,
  db,
  exportData,
  initializeDatabaseSafely,
  type DatabaseInitResult,
} from './index';
import type { DailyStats } from '@/types/db';
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

export interface RecoveryRepairResult {
  backup: RecoveryBackup;
  repairedDailyStats: number;
  integrity: IntegrityResult;
}

export function toNonNegativeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function toNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeProductsSold(productsSold: unknown): DailyStats['productsSold'] {
  if (!Array.isArray(productsSold)) return [];

  return productsSold
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object' && !Array.isArray(item))
    .filter((item) => typeof item.productId === 'string' && item.productId.trim().length > 0)
    .map((item) => ({
      productId: item.productId as string,
      quantity: toNonNegativeNumber(item.quantity),
      revenue: toNonNegativeNumber(item.revenue),
    }));
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

export async function repairInvalidDailyStats(): Promise<RecoveryRepairResult> {
  const backup = await createRecoveryBackup();
  const stats = await db.dailyStats.toArray();
  let repairedDailyStats = 0;

  await db.transaction('rw', [db.dailyStats], async () => {
    for (const stat of stats) {
      if (stat.id === undefined) continue;

      const cost = toNonNegativeNumber(stat.cost);
      const revenue = toNonNegativeNumber(stat.revenue);
      const normalized: DailyStats = {
        ...stat,
        touchCount: toNonNegativeNumber(stat.touchCount),
        inquiryCount: toNonNegativeNumber(stat.inquiryCount),
        dealCount: toNonNegativeNumber(stat.dealCount),
        revenue,
        cost,
        profit: toNumber(stat.profit, revenue - cost),
        productsSold: normalizeProductsSold(stat.productsSold),
        updatedAt: toNonNegativeNumber(stat.updatedAt, Date.now()),
      };

      const changed =
        normalized.touchCount !== stat.touchCount ||
        normalized.inquiryCount !== stat.inquiryCount ||
        normalized.dealCount !== stat.dealCount ||
        normalized.revenue !== stat.revenue ||
        normalized.cost !== stat.cost ||
        normalized.profit !== stat.profit ||
        normalized.updatedAt !== stat.updatedAt ||
        JSON.stringify(normalized.productsSold) !== JSON.stringify(stat.productsSold);

      if (!changed) continue;

      await db.dailyStats.update(stat.id, {
        touchCount: normalized.touchCount,
        inquiryCount: normalized.inquiryCount,
        dealCount: normalized.dealCount,
        revenue: normalized.revenue,
        cost: normalized.cost,
        profit: normalized.profit,
        productsSold: normalized.productsSold,
        updatedAt: normalized.updatedAt,
      });
      repairedDailyStats += 1;
    }
  });

  return {
    backup,
    repairedDailyStats,
    integrity: await checkCurrentDatabaseIntegrity(),
  };
}
