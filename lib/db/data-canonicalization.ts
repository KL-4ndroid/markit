import { normalizeEventPayloadForLocal } from '@/lib/data-mappers';
import type { DailyStats, Event } from '@/types/db';
import { db, exportData } from './index';
import { normalizeProductsSold, toNonNegativeNumber, toNumber } from './recovery';
import { getFilePort } from '@/lib/platform/file-capability';

type AnyRecord = Record<string, unknown>;

export interface CanonicalizationIssue {
  table: 'events' | 'dailyStats';
  id: string | number;
  message: string;
}

export interface CanonicalizationPlan {
  scanned: {
    events: number;
    dailyStats: number;
  };
  changes: {
    events: number;
    dailyStats: number;
  };
  issues: CanonicalizationIssue[];
}

export interface CanonicalizationProgress {
  phase: 'backup' | 'events' | 'dailyStats' | 'integrity' | 'done';
  current: number;
  total: number;
  message: string;
}

export interface CanonicalizationResult extends CanonicalizationPlan {
  backupCreated: boolean;
  integrityErrors: string[];
  integrityWarnings: string[];
}

export type CanonicalizationProgressHandler = (progress: CanonicalizationProgress) => void;

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
}

function setIfMissing(target: AnyRecord, key: string, value: unknown): boolean {
  if (value === undefined || value === null || key in target) return false;
  target[key] = value;
  return true;
}

function normalizeDealItems(items: unknown): { items?: unknown[]; changed: boolean } {
  if (!Array.isArray(items)) return { changed: false };

  let changed = false;
  const normalized = items.map((item) => {
    if (!isRecord(item)) return item;
    const next = { ...item };
    const productId = pickString(next.productId, next.product_id);
    const price = pickNumber(next.price, next.price_at_time_of_sale);

    if (setIfMissing(next, 'productId', productId)) changed = true;
    if (setIfMissing(next, 'price', price)) changed = true;

    return next;
  });

  return { items: normalized, changed };
}

export function canonicalizeEvent(event: Event): { event: Event; changed: boolean; issues: string[] } {
  const issues: string[] = [];
  let changed = false;
  const next: Event = {
    ...event,
    payload: isRecord(event.payload) ? { ...event.payload } : event.payload,
  };

  if (!isRecord(next.payload)) {
    issues.push('payload is not an object');
    return { event: next, changed, issues };
  }

  const payload = normalizeEventPayloadForLocal(next.payload) as AnyRecord;
  const normalizedPayload = { ...payload };
  const marketId = pickString(next.market_id, normalizedPayload.market_id, normalizedPayload.marketId);

  if (marketId && next.market_id !== marketId) {
    next.market_id = marketId;
    changed = true;
  }

  if (setIfMissing(normalizedPayload, 'market_id', marketId)) changed = true;
  if (setIfMissing(normalizedPayload, 'marketId', marketId)) changed = true;

  const deletedEventId = pickString(normalizedPayload.eventId, normalizedPayload.event_id);
  if (setIfMissing(normalizedPayload, 'eventId', deletedEventId)) changed = true;
  if (setIfMissing(normalizedPayload, 'event_id', deletedEventId)) changed = true;

  const dealDate = pickString(normalizedPayload.dealDate, normalizedPayload.deal_date);
  if (setIfMissing(normalizedPayload, 'dealDate', dealDate)) changed = true;

  const totalAmount = pickNumber(normalizedPayload.totalAmount, normalizedPayload.total_amount);
  if (setIfMissing(normalizedPayload, 'totalAmount', totalAmount)) changed = true;

  const totalCost = pickNumber(normalizedPayload.totalCost, normalizedPayload.total_cost);
  if (setIfMissing(normalizedPayload, 'totalCost', totalCost)) changed = true;

  const dealCount = pickNumber(normalizedPayload.dealCount, normalizedPayload.deal_count, normalizedPayload.manualDealCount);
  if (setIfMissing(normalizedPayload, 'dealCount', dealCount)) changed = true;

  const manualRevenue = pickNumber(normalizedPayload.manualRevenue, normalizedPayload.manual_revenue);
  if (setIfMissing(normalizedPayload, 'manualRevenue', manualRevenue)) changed = true;

  const manualCost = pickNumber(normalizedPayload.manualCost, normalizedPayload.manual_cost);
  if (setIfMissing(normalizedPayload, 'manualCost', manualCost)) changed = true;

  const manualDealCount = pickNumber(normalizedPayload.manualDealCount, normalizedPayload.manual_deal_count);
  if (setIfMissing(normalizedPayload, 'manualDealCount', manualDealCount)) changed = true;

  const normalizedItems = normalizeDealItems(normalizedPayload.items);
  if (normalizedItems.changed) {
    normalizedPayload.items = normalizedItems.items;
    changed = true;
  }

  if (changed || normalizedPayload !== next.payload) {
    next.payload = normalizedPayload;
  }

  return { event: next, changed, issues };
}

export function canonicalizeDailyStat(stat: DailyStats): { stat: DailyStats; changed: boolean } {
  const next: DailyStats = {
    ...stat,
    touchCount: toNonNegativeNumber(stat.touchCount),
    inquiryCount: toNonNegativeNumber(stat.inquiryCount),
    dealCount: toNonNegativeNumber(stat.dealCount),
    revenue: toNonNegativeNumber(stat.revenue),
    cost: stat.cost === undefined ? 0 : toNonNegativeNumber(stat.cost),
    profit: stat.profit === undefined ? toNumber(undefined, nextProfitFallback(stat)) : toNumber(stat.profit),
    productsSold: normalizeProductsSold(stat.productsSold),
    updatedAt: toNonNegativeNumber(stat.updatedAt, Date.now()),
  };

  return {
    stat: next,
    changed:
      next.touchCount !== stat.touchCount ||
      next.inquiryCount !== stat.inquiryCount ||
      next.dealCount !== stat.dealCount ||
      next.revenue !== stat.revenue ||
      next.cost !== stat.cost ||
      next.profit !== stat.profit ||
      next.updatedAt !== stat.updatedAt ||
      JSON.stringify(next.productsSold) !== JSON.stringify(stat.productsSold),
  };
}

function nextProfitFallback(stat: DailyStats): number {
  const revenue = toNonNegativeNumber(stat.revenue);
  const cost = stat.cost === undefined ? 0 : toNonNegativeNumber(stat.cost);
  return revenue - cost;
}

async function collectPlan(): Promise<CanonicalizationPlan> {
  const [events, dailyStats] = await Promise.all([
    db.events.toArray() as Promise<Event[]>,
    db.dailyStats.toArray() as Promise<DailyStats[]>,
  ]);

  const issues: CanonicalizationIssue[] = [];
  let eventChanges = 0;
  let dailyStatChanges = 0;

  for (const event of events) {
    const result = canonicalizeEvent(event);
    if (result.changed) eventChanges += 1;
    for (const issue of result.issues) {
      issues.push({ table: 'events', id: event.id ?? '(missing)', message: issue });
    }
  }

  for (const stat of dailyStats) {
    const result = canonicalizeDailyStat(stat);
    if (result.changed) dailyStatChanges += 1;
  }

  return {
    scanned: {
      events: events.length,
      dailyStats: dailyStats.length,
    },
    changes: {
      events: eventChanges,
      dailyStats: dailyStatChanges,
    },
    issues,
  };
}

export async function analyzeLocalDataCanonicalization(): Promise<CanonicalizationPlan> {
  return collectPlan();
}

async function createLocalCanonicalizationBackup(): Promise<void> {
  if (typeof window === 'undefined') return;

  const backup = await exportData();
  const key = `markit_canonicalization_backup_${new Date().toISOString()}`;

  try {
    if (backup.length < 4_000_000) {
      localStorage.setItem(key, backup);
      localStorage.setItem('markit_last_canonicalization_backup_key', key);
      return;
    }
  } catch {
    // Fall through to download.
  }

  await getFilePort().saveFile({
    filename: `markit-canonicalization-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    data: new Blob([backup], { type: 'application/json' }),
  });
}

export async function runLocalDataCanonicalization(
  onProgress?: CanonicalizationProgressHandler
): Promise<CanonicalizationResult> {
  const plan = await collectPlan();

  onProgress?.({ phase: 'backup', current: 0, total: 1, message: '建立本機備份中' });
  await createLocalCanonicalizationBackup();
  onProgress?.({ phase: 'backup', current: 1, total: 1, message: '本機備份已建立' });

  const events = await db.events.toArray() as Event[];
  let processedEvents = 0;
  let changedEvents = 0;

  await db.transaction('rw', [db.events], async () => {
    for (const event of events) {
      processedEvents += 1;
      const result = canonicalizeEvent(event);
      if (result.changed && event.id) {
        await db.events.update(event.id, {
          payload: result.event.payload,
          market_id: result.event.market_id,
        });
        changedEvents += 1;
      }
      onProgress?.({
        phase: 'events',
        current: processedEvents,
        total: events.length,
        message: `整理事件 ${processedEvents}/${events.length}`,
      });
    }
  });

  const stats = await db.dailyStats.toArray() as DailyStats[];
  let processedStats = 0;
  let changedStats = 0;

  await db.transaction('rw', [db.dailyStats], async () => {
    for (const stat of stats) {
      processedStats += 1;
      const result = canonicalizeDailyStat(stat);
      if (result.changed && stat.id !== undefined) {
        await db.dailyStats.update(stat.id, {
          touchCount: result.stat.touchCount,
          inquiryCount: result.stat.inquiryCount,
          dealCount: result.stat.dealCount,
          revenue: result.stat.revenue,
          cost: result.stat.cost,
          profit: result.stat.profit,
          productsSold: result.stat.productsSold,
          updatedAt: result.stat.updatedAt,
        });
        changedStats += 1;
      }
      onProgress?.({
        phase: 'dailyStats',
        current: processedStats,
        total: stats.length,
        message: `整理統計 ${processedStats}/${stats.length}`,
      });
    }
  });

  onProgress?.({ phase: 'integrity', current: 0, total: 1, message: '檢查整理後資料' });
  const { checkCurrentDatabaseIntegrity } = await import('./index');
  const integrity = await checkCurrentDatabaseIntegrity();
  onProgress?.({ phase: 'done', current: 1, total: 1, message: '資料格式整理完成' });

  return {
    ...plan,
    changes: {
      events: changedEvents,
      dailyStats: changedStats,
    },
    backupCreated: true,
    integrityErrors: integrity.errors,
    integrityWarnings: integrity.warnings,
  };
}
