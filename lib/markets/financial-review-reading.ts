import type { MarketPulseDB } from '@/lib/db';
import type { FinancialReviewRepository } from './financial-review-repository';
import { readOwnerCacheReadiness } from './owner-cache-readiness';

export async function readFinancialReviewLocalState(local: MarketPulseDB, ownerId: string, ids: readonly string[]) {
  return local.transaction('r', [local.markets, local.settings, local.events, local.financialReviewCache], async () => {
    const readiness = await readOwnerCacheReadiness(local, ownerId, ids);
    if (!readiness.localReady) return { ...readiness, snapshots: [], pending: [] as string[] };
    const [rows, events] = await Promise.all([
      local.financialReviewCache.where('ownerId').equals(ownerId).toArray(),
      local.events.where('market_id').anyOf([...ids]).toArray(),
    ]);
    return { ...readiness,
      snapshots: rows.filter(row => ids.includes(row.marketId)).map(row => row.snapshot),
      pending: [...new Set(events.filter(event => ['local_only', 'pending', 'conflict', 'error'].includes(event.sync_status ?? '')
        && ['deal_closed', 'deal_deleted', 'market_created', 'market_updated', 'market_ended'].includes(event.type)).map(event => event.market_id!))],
    };
  });
}

export function isTransientFinancialReadError(error: unknown): boolean {
  const row = error && typeof error === 'object' ? error as { code?: string; status?: number; message?: string } : {};
  const code = String(row.code ?? '');
  if (['42501', '401', '403'].includes(code) || (row.status && [401, 403].includes(row.status))) return false;
  if (row.status && row.status >= 400 && row.status < 500 && row.status !== 408) return false;
  const message = row.message ?? '';
  if (message === 'JOURNAL_TIMEOUT') return true;
  if (/^FINANCE_|^READ_CANCELLED/.test(message)) return false;
  return Boolean(row.status && [408, 500, 502, 503, 504].includes(row.status))
    || /Failed to fetch|fetch failed|Network request failed|NetworkError|Load failed|ECONNRESET|ETIMEDOUT/i.test(message);
}

export function waitForFinancialReadRetry(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error('READ_CANCELLED')); return; }
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(new Error('READ_CANCELLED')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** Only refresh/read is reachable here; saves and sync outboxes never retry. */
export async function readFinancialReviewsWithRecovery(repository: Pick<FinancialReviewRepository, 'refresh'>, ids: readonly string[], options: {
  signal: AbortSignal;
  assertCurrent: () => void;
  wait?: (delay: number, signal: AbortSignal) => Promise<void>;
}) {
  const assertCurrent = () => { if (options.signal.aborted) throw new Error('READ_CANCELLED'); options.assertCurrent(); };
  for (let attempt = 0; ; attempt++) {
    assertCurrent();
    try {
      for (let offset = 0; offset < ids.length; offset += 100) {
        assertCurrent(); await repository.refresh(ids.slice(offset, offset + 100), assertCurrent);
      }
      assertCurrent(); return;
    } catch (error) {
      assertCurrent();
      // One short recovery attempt; persistent failures return to the explicit UI retry.
      if (attempt >= 1 || !isTransientFinancialReadError(error)) throw error;
      await (options.wait ?? waitForFinancialReadRetry)(800, options.signal);
    }
  }
}
