import {
  checkAppDatabaseIntegrity,
  checkCurrentDatabaseIntegrity,
  db,
  exportData,
  initializeDatabaseSafely,
  type DatabaseInitResult,
} from './index';
import type { DailyStats, Product } from '@/types/db';
import type { IntegrityResult } from './integrity';
import { supabase } from '@/lib/supabase/client';
import { productRowToLocal } from '@/lib/data-mappers';

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

export interface ProductReferenceRepairResult {
  backup: RecoveryBackup;
  repairedProducts: number;
  fromCloud: string[];
  asPlaceholder: string[];
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

/** 從 integrity errors 中找出 product reference 相關的 productId */
function extractMissingProductIds(errors: string[]): string[] {
  const productIds = new Set<string>();

  for (const error of errors) {
    // deal_closed.items[N] references missing product: <uuid>
    const itemsMatch = error.match(/deal_closed\]\.items\[\d+\] references missing product: ([a-f0-9-]{36})/);
    if (itemsMatch) {
      productIds.add(itemsMatch[1]);
      continue;
    }

    // product_updated references missing product: <uuid>
    const updatedMatch = error.match(/product_updated\] references missing product: ([a-f0-9-]{36})/);
    if (updatedMatch) {
      productIds.add(updatedMatch[1]);
    }
  }

  return Array.from(productIds);
}

/**
 * 修復 product reference 錯誤。
 *
 * 策略：
 * 1. 從 integrity errors 找出缺失的 productId 清單
 * 2. 先查 Supabase，若雲端存在，backfill 到本機 products 表
 * 3. 若雲端也沒有，建立 name="已刪除商品" 的 placeholder
 *
 * 這讓 integrity check 完全乾淨，並與 C3.3 replace-cache 方向一致。
 */
export async function repairProductReferenceErrors(): Promise<ProductReferenceRepairResult> {
  const backup = await createRecoveryBackup();

  const integrityBefore = await checkCurrentDatabaseIntegrity();
  const missingIds = extractMissingProductIds(integrityBefore.errors);

  if (missingIds.length === 0) {
    return {
      backup,
      repairedProducts: 0,
      fromCloud: [],
      asPlaceholder: [],
      integrity: integrityBefore,
    };
  }

  const fromCloud: string[] = [];
  const asPlaceholder: string[] = [];

  // 嘗試從 Supabase 補回缺失的 product
  const { data: cloudRows, error: cloudError } = await supabase
    .from('products')
    .select('*')
    .in('id', missingIds);

  const cloudFoundIds = new Set<string>();

  if (!cloudError && cloudRows && cloudRows.length > 0) {
    const localProducts: Product[] = cloudRows
      .filter((row) => !row.deleted_at)
      .map((row) => productRowToLocal(row as unknown as Record<string, unknown>));

    await db.transaction('rw', [db.products], async () => {
      for (const product of localProducts) {
        const existing = await db.products.get(product.id!);
        if (!existing) {
          await db.products.add(product);
          fromCloud.push(product.id!);
        }
        cloudFoundIds.add(product.id!);
      }
    });
  }

  // 雲端找不到的，建立 placeholder
  const notFoundIds = missingIds.filter((id) => !cloudFoundIds.has(id));
  const now = Date.now();

  await db.transaction('rw', [db.products], async () => {
    for (const id of notFoundIds) {
      const existing = await db.products.get(id);
      if (!existing) {
        const placeholder: Product = {
          id,
          name: '已刪除商品',
          category: 'other',
          price: 0,
          isActive: false,
          createdAt: now,
          updatedAt: now,
        };
        await db.products.add(placeholder);
        asPlaceholder.push(id);
      }
    }
  });

  return {
    backup,
    repairedProducts: fromCloud.length + asPlaceholder.length,
    fromCloud,
    asPlaceholder,
    integrity: await checkCurrentDatabaseIntegrity(),
  };
}
