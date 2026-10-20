'use client';

import { useEffect, useMemo, useState } from 'react';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';
import { resolveMarketOperatingSession } from '@/lib/markets/market-operating-session';
import type { Market } from '@/types/db';

const SESSION_REFRESH_INTERVAL_MS = 30_000;

export function useMarketOperatingSession(market: Market): ReturnType<typeof resolveMarketOperatingSession>;
export function useMarketOperatingSession(market?: Market): ReturnType<typeof resolveMarketOperatingSession> | null;
export function useMarketOperatingSession(market?: Market) {
  const [nowAt, setNowAt] = useState(() => Date.now());

  useEffect(() => {
    const refresh = () => setNowAt(Date.now());
    const intervalId = setInterval(refresh, SESSION_REFRESH_INTERVAL_MS);
    const unsubscribeLifecycle = getLifecyclePort().subscribe(state => {
      if (state === 'active') refresh();
    });

    return () => {
      clearInterval(intervalId);
      unsubscribeLifecycle();
    };
  }, []);

  return useMemo(
    () => market ? resolveMarketOperatingSession(market, new Date(nowAt)) : null,
    [market, nowAt]
  );
}
