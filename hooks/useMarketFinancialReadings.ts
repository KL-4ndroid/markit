'use client';

import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { buildMarketFinancialReadings } from '@/lib/analytics/market-financial-reading';
import { applyFinancialReviews } from '@/lib/markets/financial-reviews';
import { useFinancialReviews } from '@/hooks/useFinancialReviews';
import type { Market } from '@/types/db';

/** Batch once per page. No finance reads for staff, free users, or a previous owner's cached records. */
export function useMarketFinancialReadings(ownerId: string, markets: readonly Market[], allowed: boolean, asOfDate: string) {
  const owned = useMemo(() => allowed && ownerId ? markets.filter(market =>
    market.id && market.owner_id === ownerId && market.access_type !== 'staff' && !market.isDeleted && market.status !== 'cancelled',
  ) : [], [allowed, ownerId, markets]);
  const idsKey = owned.map(market => market.id!).sort().join('|');
  const ids = useMemo(() => idsKey ? idsKey.split('|') : [], [idsKey]);
  const [revision, setRevision] = useState(0);
  const local = useLiveQuery(async () => {
    try { return {stats:ids.length ? await db.dailyStats.where('marketId').anyOf(ids).toArray() : [], failed:false}; }
    catch { return {stats:[], failed:true}; }
  }, [ownerId, idsKey, revision]);
  const rawStats = local?.stats;
  const finance = useFinancialReviews(ownerId, ids, allowed);
  const overlay = useMemo(() => finance.enabled
    ? applyFinancialReviews(owned, rawStats ?? [], finance.snapshots, finance.blocked) : null,
  [finance.enabled, finance.snapshots, finance.blocked, owned, rawStats]);
  const loading = rawStats === undefined || finance.loading;
  const readings = useMemo(() => buildMarketFinancialReadings({
    markets: owned, dailyStats: local?.failed ? [] : overlay?.stats ?? rawStats ?? [],
    confirmations: local?.failed ? undefined : overlay?.confirmations, asOfDate, loading,
  }), [owned, overlay, rawStats, asOfDate, loading, local?.failed]);
  const refresh = useCallback(async () => {
    setRevision(value => value + 1);
    await finance.refresh();
  }, [finance.refresh]);
  return { readings, loading,
    error:local?.failed ? '暫時無法讀取場次財務資料，估計淨利保留待確認。' : finance.error, refresh };
}
