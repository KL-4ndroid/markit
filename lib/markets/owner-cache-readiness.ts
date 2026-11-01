import type { MarketPulseDB } from '@/lib/db';

/** Cache readiness is a read prerequisite, never an entitlement grant. */
export async function readOwnerCacheReadiness(local: MarketPulseDB, ownerId: string, ids: readonly string[]) {
  const [markets, settings] = await Promise.all([
    local.markets.bulkGet([...ids]), local.settings.toCollection().first(),
  ]);
  const missing = markets.some(market => !market);
  const denied = markets.some(market => market && (
    market.owner_id !== ownerId || market.access_type === 'staff' || market.isDeleted
  ));
  const historyVerified = Boolean(settings?.ownerReplayRevision?.startsWith(`${ownerId}:`)
    && settings.ownerReplayRevision.endsWith(':paid') && settings.lastSyncAt);
  return { localReady: !missing && !denied, denied, historyVerified };
}
