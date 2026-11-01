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
import { readCloudPages } from './bounded-cloud-reading';

const REPLAY_REVISION = 'dependency-order-v2-product-owners';
type CloudCreatedAtRow = { created_at?: unknown };

/** A large history must not exceed the engine's function-argument limit. */
export function getLatestCloudEventTimestamp(events: readonly CloudCreatedAtRow[]): number | null {
  let latest: number | null = null;
  for (const event of events) {
    const timestamp = Date.parse(String(event.created_at ?? ''));
    if (Number.isFinite(timestamp) && (latest === null || timestamp > latest)) latest = timestamp;
  }
  return latest;
}

export async function pullOwnerEvents(
  userId: string,
  onProgress: (current: number, total: number, currentItem?: string, phase?: 'incremental') => void,
  infoLevel: InfoLevel,
  assertActive: () => void = () => undefined,
): Promise<void> {
  assertActive();
  const settings = await db.settings.toCollection().first();
  const { data: readScopeData, error: readScopeError } = await supabase.rpc('read_subscription_data_scope');
  const readScope = parseSubscriptionReadScope(readScopeData,userId);
  assertActive();
  if (readScopeError || !readScope) throw new Error('Subscription data scope unavailable');
  const replayRevision = `${userId}:${REPLAY_REVISION}:${readScope.scope}`;
  // Verify complete cloud history once before correcting caches built by the old order.
  let needsHistoryVerification = settings?.ownerReplayRevision !== replayRevision;
  let lastSyncAt = needsHistoryVerification ? null : await getLastSyncTimestamp();
  onProgress(0, 0, '正在讀取市集與歷史紀錄', 'incremental');
  const marketIds = await getOwnerAccessibleMarketIds(userId, assertActive);
  const localMarkets = await db.markets.bulkGet(marketIds);
  if (localMarkets.some(market => !market)) {
    needsHistoryVerification = true;
    lastSyncAt = null;
  }

  // Avoid silently truncating accounts above the API row limit.
  const accessibleIds = new Set(marketIds);
  const downloadedEvents = await readCloudPages<Record<string, any>>(async (start, end) => {
    assertActive();
    let query = supabase.from('owner_accessible_events').select('*').order('created_at').order('id').range(start, end);
    // Include the boundary: the cursor has millisecond precision, PostgreSQL can
    // have microseconds. Event IDs make the overlap safe.
    if (lastSyncAt) query = query.gte('created_at', new Date(lastSyncAt).toISOString());
    // The security-barrier view already limits rows to this authenticated owner
    // and subscription scope (migration 092). Avoid an unbounded UUID URL list;
    // retain the exact accessible-market intersection locally below.
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }, { assertActive, onPage: count => onProgress(count, 0, `正在讀取歷史紀錄（已讀取 ${count} 筆）`, 'incremental') });
  const newEvents = downloadedEvents.filter(event => event.market_id == null || accessibleIds.has(event.market_id));
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
  const latestCreatedAt = getLatestCloudEventTimestamp(newEvents);
  if (latestCreatedAt !== null) await updateLastSyncTimestamp(latestCreatedAt);
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
