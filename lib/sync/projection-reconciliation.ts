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
