'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuth } from '@/lib/supabase/auth-context';
import { FinancialReviewRepository } from '@/lib/markets/financial-review-repository';
import { financialReviewCloud } from '@/lib/supabase/financial-reviews';
import { financialReviewsEnabled } from '@/lib/markets/financial-reviews';
import { financialReviewEpoch, subscribeFinancialReviewScope } from '@/lib/markets/financial-review-scope';
import { readFinancialReviewLocalState, readFinancialReviewsWithRecovery } from '@/lib/markets/financial-review-reading';
import { getActiveSyncIdentity, getGlobalSyncState, subscribeGlobalSyncState, SyncStatus } from '@/lib/sync/sync-runtime-state';
import { getNetworkPort } from '@/lib/platform/network-capability';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';

function readEnvironment() {
  return `${getNetworkPort().getCurrentStatus().connected ? 'online' : 'offline'}:${getLifecyclePort().getCurrentState()}`;
}
function subscribeEnvironment(listener: () => void) {
  const network = getNetworkPort().subscribe(listener), lifecycle = getLifecyclePort().subscribe(listener);
  return () => { network(); lifecycle(); };
}

/** Caller intersects owner/paid capability. Preparation and retries never grant access. */
export function useFinancialReviews(ownerId: string, marketIds: readonly string[], allowed: boolean) {
  const { session } = useAuth();
  const enabled = financialReviewsEnabled() && allowed && !!ownerId;
  const idsKey = [...new Set(marketIds)].sort().join('|');
  const ids = useMemo(() => idsKey ? idsKey.split('|') : [], [idsKey]);
  const epoch = useSyncExternalStore(subscribeFinancialReviewScope, financialReviewEpoch, financialReviewEpoch);
  const sync = useSyncExternalStore(subscribeGlobalSyncState, getGlobalSyncState, getGlobalSyncState);
  const environment = useSyncExternalStore(subscribeEnvironment, readEnvironment, readEnvironment);
  const scope = `${ownerId}:${idsKey}:${epoch}:${enabled}`;
  const repository = useMemo(() => new FinancialReviewRepository(enabled ? ownerId : '', financialReviewCloud, db, epoch), [ownerId, enabled, epoch]);
  const [localRevision, setLocalRevision] = useState(0);
  const query = useLiveQuery(async () => {
    if (!enabled || !ids.length) return undefined;
    try { return { ...await readFinancialReviewLocalState(db, ownerId, ids), scope, failed: false }; }
    catch { return { scope, failed: true, localReady: false, denied: false, historyVerified: false, snapshots: [], pending: [] as string[] }; }
  }, [enabled, ownerId, idsKey, epoch, localRevision]);
  const local = query?.scope === scope ? query : undefined;
  const ownerSyncReady = getActiveSyncIdentity() === `${ownerId}:owner` && sync.lastSyncAt !== null;
  const prepared = Boolean(local?.localReady && (local.historyVerified || ownerSyncReady));
  const pendingKey = local?.pending.join('|') ?? '';
  // An opaque token-generation key invalidates failed reads after real reauthentication.
  // The token is neither logged nor stored in a draft, cache key or UI state.
  const tokenScope = useMemo(() => ({ authenticated: Boolean(session?.access_token) }), [session?.access_token]);
  const context = useMemo(() => ({ scope, prepared, pendingKey, environment, tokenScope }), [scope, prepared, pendingKey, environment, tokenScope]);
  const current = useRef(context); current.current = context;
  const requestId = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const [state, setState] = useState<{ context: object | null; loading: boolean; error: string }>({ context: null, loading: false, error: '' });
  const eligible = enabled && ids.length > 0 && prepared && environment === 'online:active';
  const readNow = useCallback(async () => {
    if (!eligible) return;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    const request = ++requestId.current;
    const isCurrent = () => !abort.signal.aborted && current.current === context && requestId.current === request;
    const assertCurrent = () => { if (!isCurrent()) throw new Error('READ_CANCELLED'); };
    setState({ context, loading: true, error: '' });
    try {
      await readFinancialReviewsWithRecovery(repository, ids, { signal: abort.signal, assertCurrent });
      if (isCurrent()) setState({ context, loading: false, error: '' });
    } catch {
      if (isCurrent()) setState({ context, loading: false, error: '尚未確認最新成本核對紀錄，淨利暫不作完整判讀。' });
    } finally { if (controller.current === abort) controller.current = null; }
  }, [eligible, repository, ids, context]);
  useEffect(() => {
    void readNow();
    return () => { controller.current?.abort(); };
  }, [readNow]);
  const refresh = useCallback(async () => {
    setLocalRevision(value => value + 1);
    await readNow();
  }, [readNow]);
  const offline = environment.startsWith('offline:');
  const initializationFailed = !prepared && !ownerSyncReady && [SyncStatus.ERROR, SyncStatus.OFFLINE].includes(sync.status);
  const ready = state.context === context && !state.loading && !state.error && eligible;
  const blocked = useMemo(() => new Set(enabled ? ready ? local?.pending ?? ids : ids : []), [enabled, ready, local?.pending, ids]);
  return { enabled, repository, snapshots: enabled ? local?.snapshots ?? [] : [], blocked,
    ready: !enabled || !ids.length || ready,
    loading: enabled && ids.length > 0 && !offline && !initializationFailed && !local?.denied && !local?.failed
      && environment.endsWith(':active') && (!prepared || state.context !== context || state.loading),
    error: !enabled ? '' : offline ? '目前離線，連線後會自動重新讀取核對紀錄。'
      : local?.failed ? '暫時無法讀取這台裝置的市集資料，請重新讀取。'
      : local?.denied ? '市集資料與目前帳號不一致，請先確認同步狀態。'
      : initializationFailed ? '市集資料尚未載入完整，請先重新同步。'
      : state.context === context ? state.error : '', refresh };
}
