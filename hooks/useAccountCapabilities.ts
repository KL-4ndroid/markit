'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  readAccountCapabilities,
  type AccountCapabilityClientResult,
} from '@/lib/subscription/account-capability-client';
import { getNetworkPort } from '@/lib/platform/network-capability';

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
      setResult(nextResult);
      setIsLoading(false);
    });
  }, [enabled, input.accessToken, network, revision]);

  const refresh = useCallback(() => {
    setRevision(value => value + 1);
  }, []);

  return { result, isLoading, network, refresh };
}
