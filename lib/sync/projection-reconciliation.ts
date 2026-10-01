import {
  compareMarketProjectionWithEvents,
  rebuildMarketStatsFromEvents,
  type MarketProjectionComparison,
} from '@/lib/projections/market-projection-service';

export type ProjectionReconciliationContext =
  | 'owner-full'
  | 'owner-incremental'
  | 'staff-view'
  | 'snapshot'
  | 'manual';

/**
 * ✅ C3.4 修復：哪些 context 應允許 auto-repair（dryRun=false）？
 *
 * 規則：
 * - `owner-full` / `owner-incremental`：
 *     owner 從雲端拉全部 events（lastSyncAt 篩選可能 miss 一些但大多數完整），
 *     可信 local events 為完整 → 偵測到 inflated 可 auto-repair。
 * - `manual`：
 *     Recovery 頁工具用戶明確觸發 → 應 auto-repair。
 * - `staff-view`：
 *     staff 視角只看到 filtered events（partial set），
 *     若直接 auto-rebuild，會用 local 看到的部分 events 覆蓋真實的雲端累積值 → 破壞資料。
 *     保持 observation-only，由 Recovery 工具判斷後手動修。
 * - `snapshot`：
 *     snapshot 載入直接覆寫 markets / dailyStats，
 *     邏輯複雜、partial event 風險高 → 保持 observation-only。
 */
export function shouldAutoRepairForContext(
  context: ProjectionReconciliationContext
): boolean {
  return context === 'owner-full' || context === 'owner-incremental' || context === 'manual';
}

export type ProjectionReconciliationSkipReason =
  | 'blank_market_id'
  | 'consistent'
  | 'missing_or_no_events'
  | 'local_events_incomplete'
  | 'lower_than_events'
  | 'different'
  | 'dry_run';

export interface ProjectionReconciliationOptions {
  context: ProjectionReconciliationContext;
  dryRun?: boolean;
  compare?: (marketId: string) => Promise<MarketProjectionComparison>;
  rebuild?: (marketId: string) => Promise<unknown>;
}

export interface ProjectionReconciliationResult {
  context: ProjectionReconciliationContext;
  checked: string[];
  repaired: Array<{
    marketId: string;
    status: 'inflated';
  }>;
  skipped: Array<{
    marketId: string;
    reason: ProjectionReconciliationSkipReason;
  }>;
  errors: Array<{
    marketId: string;
    message: string;
  }>;
}

function normalizeMarketIds(marketIds: Iterable<string>): string[] {
  const unique = new Set<string>();

  for (const marketId of marketIds) {
    if (typeof marketId !== 'string' || marketId.trim().length === 0) continue;
    unique.add(marketId);
  }

  return Array.from(unique);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function reconcileTouchedMarketProjections(
  marketIds: Iterable<string>,
  options: ProjectionReconciliationOptions
): Promise<ProjectionReconciliationResult> {
  const compare = options.compare ?? compareMarketProjectionWithEvents;
  const rebuild = options.rebuild ?? ((marketId: string) => rebuildMarketStatsFromEvents(marketId, { dryRun: false }));
  const normalizedMarketIds = normalizeMarketIds(marketIds);
  const result: ProjectionReconciliationResult = {
    context: options.context,
    checked: [],
    repaired: [],
    skipped: [],
    errors: [],
  };

  for (const marketId of normalizedMarketIds) {
    result.checked.push(marketId);

    try {
      const comparison = await compare(marketId);

      if (comparison.status === 'inflated') {
        if (options.dryRun) {
          result.skipped.push({ marketId, reason: 'dry_run' });
          continue;
        }

        await rebuild(marketId);
        result.repaired.push({ marketId, status: 'inflated' });
        continue;
      }

      result.skipped.push({ marketId, reason: comparison.status });
    } catch (error) {
      result.errors.push({
        marketId,
        message: getErrorMessage(error),
      });
    }
  }

  return result;
}

export function collectProjectionMarketId(
  marketIds: Set<string>,
  event: { type?: string; market_id?: string; payload?: any }
): void {
  if (
    event.type !== 'deal_closed' &&
    event.type !== 'deal_deleted' &&
    event.type !== 'interaction_recorded' &&
    event.type !== 'interaction_deleted'
  ) {
    return;
  }

  const marketId = event.market_id ?? event.payload?.market_id ?? event.payload?.marketId;
  if (typeof marketId === 'string' && marketId.trim().length > 0) {
    marketIds.add(marketId);
  }
}
