'use client';

import { subscribeSubscriptionExperienceChanged } from '@/lib/subscription/experience';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  readAccountCapabilities,
  type AccountCapabilityClientResult,
} from '@/lib/subscription/account-capability-client';
import { resolveCapabilityFreshness } from '@/lib/subscription/subscription-capabilities';
import { getNetworkPort } from '@/lib/platform/network-capability';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';
import { nextCapabilityRefreshDelay } from '@/lib/subscription/capability-refresh';

export type AccountCapabilityQuery = {
  result: AccountCapabilityClientResult | null;
  isLoading: boolean;
  network: 'online' | 'offline';
  refresh: () => void;
};

export function useAccountCapabilities(input: {
  accessToken?: string | null;
  enabled?: boolean;
}): AccountCapabilityQuery {
  const enabled = input.enabled ?? true;
  const [result, setResult] = useState<AccountCapabilityClientResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [network, setNetwork] = useState<'online' | 'offline'>(() => (
    getNetworkPort().getCurrentStatus().connected ? 'online' : 'offline'
  ));
  const [revision, setRevision] = useState(0);
  const requestIdRef = useRef(0);
  const resultTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const networkPort = getNetworkPort();
    setNetwork(networkPort.getCurrentStatus().connected ? 'online' : 'offline');
    return networkPort.subscribe(status => {
      setNetwork(status.connected ? 'online' : 'offline');
    });
  }, []);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!enabled) {
      setResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    void readAccountCapabilities({
      accessToken: input.accessToken ?? '',
      network,
    }).then(nextResult => {
      if (requestIdRef.current !== requestId) return;
      const sameToken = resultTokenRef.current === (input.accessToken ?? '');
      resultTokenRef.current = input.accessToken ?? '';
      setResult(previous => {
        const transientFailure = !nextResult.ok && (nextResult.code === 'network_error' || nextResult.code === 'request_timeout');
        return sameToken && transientFailure && previous?.ok && resolveCapabilityFreshness({
          capabilities: previous.capabilities, nowMs: Date.now(), network,
        }) === 'fresh' ? previous : nextResult;
      });
      setIsLoading(false);
    });
  }, [enabled, input.accessToken, network, revision]);

  const refresh = useCallback(() => {
    requestIdRef.current++;
    setRevision(value => value + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !result?.ok || resultTokenRef.current !== (input.accessToken ?? '')) return;
    const delay = nextCapabilityRefreshDelay(result.capabilities, Date.now());
    if (delay === null) return;
    const timeout = setTimeout(() => {
      // Reevaluate visible access immediately, including when the following read fails.
      setResult(previous => previous?.ok ? { ...previous } : previous);
      refresh();
    }, delay);
    return () => clearTimeout(timeout);
  }, [enabled, input.accessToken, result, refresh]);

  useEffect(() => {
    if (!enabled) return;
    return getLifecyclePort().subscribe(state => { if (state === 'active') refresh(); });
  }, [enabled, refresh]);

  useEffect(() => subscribeSubscriptionExperienceChanged(() => {
    requestIdRef.current++;
    setResult(null);
    setIsLoading(true);
    setRevision(value => value + 1);
  }), []);
  return { result: enabled && resultTokenRef.current === (input.accessToken ?? '') ? result : null, isLoading, network, refresh };
}
