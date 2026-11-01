'use client';

import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { generateDateRange } from '@/lib/utils';
import { readOwnerMarketActivity, EMPTY_MARKET_ACTIVITY } from '@/lib/markets/market-activity-reading';
import { getActiveSyncIdentity, getGlobalSyncState, subscribeGlobalSyncState } from '@/lib/sync/sync-runtime-state';
import type { Market } from '@/types/db';

export function useMarketActivity(ownerId: string, market: Market | undefined, allowed: boolean) {
  const enabled = Boolean(allowed && ownerId && market?.id && market.owner_id === ownerId && market.access_type !== 'staff' && !market.isDeleted);
  const marketId = market?.id ?? '';
  const datesKey = (market?.dates?.length ? market.dates : market ? generateDateRange(market.startDate, market.endDate) : []).slice().sort().join('|');
  const dates = useMemo(() => datesKey ? datesKey.split('|') : [], [datesKey]);
  const scope = `${ownerId}:${marketId}:${datesKey}:${enabled}`;
  const [revision, setRevision] = useState(0);
  const sync = useSyncExternalStore(subscribeGlobalSyncState, getGlobalSyncState, getGlobalSyncState);
  const result = useLiveQuery(async () => {
    if (!enabled) return { ...EMPTY_MARKET_ACTIVITY, scope, failed: false };
    try { return { ...await readOwnerMarketActivity(ownerId, marketId, dates), scope, failed: false }; }
    catch { return { ...EMPTY_MARKET_ACTIVITY, scope, failed: true }; }
  }, [scope, revision]);
  const current = enabled && result?.scope === scope ? result : undefined;
  const synced = getActiveSyncIdentity() === `${ownerId}:owner` && sync.lastSyncAt !== null;
  const ready = Boolean(current?.localReady && (current.historyVerified || synced));
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  return { deals: current?.deals ?? EMPTY_MARKET_ACTIVITY.deals,
    interactions: current?.interactions ?? EMPTY_MARKET_ACTIVITY.interactions,
    ready, failed: Boolean(current?.failed), refresh };
}
