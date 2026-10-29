import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { batchHydrateMarkets } from '@/lib/sync/owner-market-hydration-service';
import { getOwnerAccessibleMarketIds } from '@/lib/sync/owner-market-access-service';
import { collectProjectionMarketId } from '@/lib/sync/projection-reconciliation';
import { getLastSyncTimestamp, updateLastSyncTimestamp } from '@/lib/sync/sync-cursor-service';
import { reconcileSyncedProjectionMarkets } from '@/lib/sync/sync-projection-reconciliation-runner';
import { createCanonicalSyncedEvent } from '@/lib/sync/synced-event-factory';
import { replayOwnerEvents } from '@/lib/sync/owner-event-replay';
import { rebuildMarketStatsFromEvents } from '@/lib/sync/local-projection-repair';
import { getEventMarketId, getTombstoneTargetEventId } from '@/lib/events/event-read-model';
import type { InfoLevel } from '@/lib/data-sanitization';
import type { Event } from '@/types/db';
import { parseSubscriptionReadScope } from '@/lib/subscription/read-access';

const REPLAY_REVISION = 'dependency-order-v2-product-owners';

export async function pullOwnerEvents(
  userId: string,
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'incremental') => void,
  infoLevel: InfoLevel,
  assertActive: () => void = () => undefined,
): Promise<void> {
  const settings = await db.settings.toCollection().first();
  const { data: readScopeData, error: readScopeError } = await supabase.rpc('read_subscription_data_scope');
  const readScope = parseSubscriptionReadScope(readScopeData,userId);
  if (readScopeError || !readScope) throw new Error('Subscription data scope unavailable');
  const replayRevision = `${userId}:${REPLAY_REVISION}:${readScope.scope}`;
  // Verify complete cloud history once before correcting caches built by the old order.
  let needsHistoryVerification = settings?.ownerReplayRevision !== replayRevision;
  let lastSyncAt = needsHistoryVerification ? null : await getLastSyncTimestamp();
  onProgress(0, 0, '正在讀取市集與歷史紀錄', 'incremental');
  const marketIds = await getOwnerAccessibleMarketIds(userId);
  const localMarkets = await db.markets.bulkGet(marketIds);
  if (localMarkets.some(market => !market)) {
    needsHistoryVerification = true;
    lastSyncAt = null;
  }

  // Avoid silently truncating accounts above the API row limit.
  const newEvents: Record<string, any>[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    assertActive();
    let query = supabase.from('owner_accessible_events').select('*').order('created_at').order('id').range(offset, offset + pageSize - 1);
    // Include the boundary: the cursor has millisecond precision, PostgreSQL can
    // have microseconds. Event IDs make the overlap safe.
    if (lastSyncAt) query = query.gte('created_at', new Date(lastSyncAt).toISOString());
    query = marketIds.length > 0
      // RLS resolves actual product ownership for manager-authored metadata.
      // Former members must not disappear from the brand's retained history.
      ? query.or(`market_id.in.(${marketIds.join(',')}),market_id.is.null`)
      : query.is('market_id', null);
    const { data, error } = await query;
    if (error) throw error;
    newEvents.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  assertActive();
  const touchedMarketIds = new Set<string>();
  const hydrationIds = new Set(marketIds);
  for (const event of newEvents) {
    const id = getEventMarketId(event);
    if (id) hydrationIds.add(id);
    collectProjectionMarketId(touchedMarketIds, event);
  }
  onProgress(0, 0, '正在補齊市集資料', 'incremental');
  const hydration = await batchHydrateMarkets(hydrationIds, infoLevel, assertActive);
  if (hydration.failed.size) throw new Error('Market hydration failed');
  assertActive();
  const canonical = newEvents.filter(e => !hydration.missing.has(getEventMarketId(e) ?? '')).map(createCanonicalSyncedEvent);
  onProgress(0, canonical.length, '正在整理歷史紀錄', 'incremental');
  await replayOwnerEvents(canonical, {
    assertActive,
    refreshSyncedPayloads: needsHistoryVerification && readScope.scope === 'paid',
    onProgress: (current, total) => onProgress(current, total, '正在整理歷史紀錄', 'incremental'),
  });
  // Newly replayed records are already canonical/synced. Do not acknowledge a
  // pre-existing pending draft solely because the cloud has the same event ID.
  if (needsHistoryVerification) {
    const verified = await verifyAndRepairOwnerHistory(userId, canonical, assertActive);
    if (verified && settings?.id) await db.settings.update(settings.id, { ownerReplayRevision: replayRevision });
  }
  await reconcileSyncedProjectionMarkets(touchedMarketIds, 'owner-full');
  assertActive();
  const validCreatedAt = newEvents.map(e => Date.parse(e.created_at)).filter(Number.isFinite);
  if (validCreatedAt.length) await updateLastSyncTimestamp(Math.max(...validCreatedAt));
}

/** Exact cloud/local event sets with no pending writes are required for repair. */
export async function verifyAndRepairOwnerHistory(
  userId: string,
  cloudEvents: readonly Event[],
  assertActive: () => void = () => undefined,
): Promise<boolean> {
  let verified = true;
  const byId = new Map(cloudEvents.map(e => [e.id, e]));
  const affectedMarkets = new Set(cloudEvents.filter(e => {
    if (e.type !== 'deal_deleted' && e.type !== 'interaction_deleted') return false;
    const source = byId.get(getTombstoneTargetEventId(e));
    return source && source.timestamp >= e.timestamp && getEventMarketId(source) === getEventMarketId(e);
  }).map(getEventMarketId));
  const cloudByMarket = new Map<string, Set<string>>();
  for (const event of cloudEvents) {
    const marketId = getEventMarketId(event);
    if (!marketId || !event.id) continue;
    const ids = cloudByMarket.get(marketId) ?? new Set<string>();
    ids.add(event.id);
    cloudByMarket.set(marketId, ids);
  }
  for (const [marketId, ids] of cloudByMarket) {
    if (!affectedMarkets.has(marketId)) continue;
    assertActive();
    await db.transaction('rw', [db.events, db.markets, db.dailyStats], async () => {
      const market = await db.markets.get(marketId);
      if (market?.owner_id !== userId) return;
      const local = await db.events.filter(e => getEventMarketId(e) === marketId).toArray();
      if (local.length !== ids.size || local.some(e => !ids.has(e.id!) || e.sync_status !== 'synced')) {
        verified = false;
        return;
      }
      assertActive();
      await rebuildMarketStatsFromEvents(marketId, { dryRun: false, allowEmptyHistory: true });
    });
  }
  return verified;
}
