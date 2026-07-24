import {
  reconcileTouchedMarketProjections,
  shouldAutoRepairForContext,
  type ProjectionReconciliationContext,
} from '@/lib/sync/projection-reconciliation';

/**
 * Reconcile market projections after synced event replay.
 */
export async function reconcileSyncedProjectionMarkets(
  marketIds: Set<string>,
  context: ProjectionReconciliationContext
): Promise<void> {
  if (marketIds.size === 0) return;

  try {
    const dryRun = !shouldAutoRepairForContext(context);

    const result = await reconcileTouchedMarketProjections(marketIds, { context, dryRun });
    const detectedInflated = result.skipped.some(item => item.reason === 'dry_run');
    if (detectedInflated || result.errors.length > 0) {
      console.log(
        `[useSync] projection reconciliation (context=${context}, dryRun=${dryRun})`,
        result
      );
    }
  } catch (error) {
    console.warn('[useSync] projection reconciliation skipped:', error);
  }
}
