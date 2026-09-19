'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ensureScheduledMarkets } from '@/lib/recurring-operations';
import { useRoleContext } from '@/lib/role-context';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';
import { useAuth } from '@/lib/supabase/auth-context';

const FOREGROUND_MATERIALIZATION_THROTTLE_MS = 30_000;

export function RecurringOperationsMaterializationGate() {
  const { user } = useAuth();
  const { isOwner, roleRefreshState } = useRoleContext();
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastRunAtRef = useRef(0);
  const ownerId = user?.id ?? null;
  const canMaterialize = Boolean(
    ownerId
    && isOwner
    && roleRefreshState.stage === 'ready'
    && roleRefreshState.isAuthorizationFresh
  );

  const materialize = useCallback(() => {
    if (!canMaterialize || !ownerId || inFlightRef.current) return;
    if (Date.now() - lastRunAtRef.current < FOREGROUND_MATERIALIZATION_THROTTLE_MS) return;

    lastRunAtRef.current = Date.now();
    const operation = ensureScheduledMarkets({ ownerId, isOwner: true })
      .then(result => {
        if (result.conflicts.length > 0) {
          console.error('固定營業場次建立時發現資料衝突：', result.conflicts);
        }
      })
      .catch(error => {
        // Materialization is a recoverable local projection. Existing and
        // offline materialized Markets remain usable when a refresh fails.
        console.error('補齊固定營業場次失敗：', error);
      })
      .finally(() => {
        if (inFlightRef.current === operation) inFlightRef.current = null;
      });
    inFlightRef.current = operation;
  }, [canMaterialize, ownerId]);

  useEffect(() => {
    materialize();
  }, [materialize]);

  useEffect(() => getLifecyclePort().subscribe(state => {
    if (state === 'active') materialize();
  }), [materialize]);

  return null;
}
