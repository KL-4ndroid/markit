'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getNetworkPort } from '@/lib/platform/network-capability';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';
import { getApplePurchaseRuntime, getServerApplePurchaseRuntime, subscribeApplePurchaseRuntime } from '@/lib/subscription/apple-purchase-runtime';
import { createApplePurchaseSession, type ApplePurchaseContext, type ApplePurchaseState } from '@/lib/subscription/apple-purchase-session';
import { ApplePurchaseView } from './ApplePurchaseView';
import { Button } from '@/components/ui/Button';

export function NativeSubscriptionActions({ ownerId = null, accessToken = null, capabilityFresh = false }: {
  canManageSubscription?: boolean; ownerId?: string | null; accessToken?: string | null; capabilityFresh?: boolean;
}) {
  const runtime = useSyncExternalStore(subscribeApplePurchaseRuntime, getApplePurchaseRuntime, getServerApplePurchaseRuntime);
  const [state, setState] = useState<ApplePurchaseState>({ phase: 'loading', products: [], message: '正在確認商店服務…' });
  const [source, setSource] = useState<{ ownerId: string; billingOrigin: string | null; hasActiveSubscription: boolean } | null>(null);
  const [online, setOnline] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const session = useRef<ReturnType<typeof createApplePurchaseSession> | null>(null);
  // Invalidate old async work before effect cleanup on account switch.
  const current = useRef({ ownerId, accessToken, capabilityFresh });
  current.current = { ownerId, accessToken, capabilityFresh };
  useEffect(() => {
    if (!runtime?.configuration.enabled || !ownerId || !accessToken) return;
    let closed = false; let stopTransactions = () => {}; let stopLifecycle = () => {}; let stopNetwork = () => {};
    let context: ApplePurchaseContext | null = null;
    void runtime.connect(ownerId, accessToken).then(async connection => {
      if (closed || current.current.ownerId !== ownerId) return;
      const network = getNetworkPort();
      context = { ownerId, accountToken: connection.accountToken, online: network.getCurrentStatus().connected,
        ownerAuthorized: true, capabilityFresh: current.current.capabilityFresh,
        billingOrigin: connection.billingOrigin, hasActiveSubscription: connection.hasActiveSubscription };
      setSource({ ownerId, billingOrigin: connection.billingOrigin, hasActiveSubscription: connection.hasActiveSubscription });
      setOnline(context.online);
      const active = createApplePurchaseSession({ port: runtime.port, server: connection.server, configuration: runtime.configuration,
        context: () => current.current.ownerId === ownerId && context
          ? { ...context, capabilityFresh: current.current.capabilityFresh } : null,
        changed: value => {
          if (!closed && current.current.ownerId === ownerId) {
            setState(value);
            if (value.phase === 'confirmed') setSource({ ownerId, billingOrigin: 'apple_app_store', hasActiveSubscription: true });
          }
        } });
      session.current = active;
      stopNetwork = network.subscribe(value => {
        if (!context || closed) return;
        context = { ...context, online: value.connected }; setOnline(value.connected);
        if (value.connected) void active.retry();
      });
      stopLifecycle = getLifecyclePort().subscribe(value => { if (value === 'active') void active.retry(); });
      if (runtime.port.subscribeTransactions) {
        const stop = await runtime.port.subscribeTransactions(() => { void active.retry(); });
        if (closed) { stop(); return; } stopTransactions = stop;
      }
      if (!closed) await active.initialize();
    }).catch(() => {
      if (!closed && current.current.ownerId === ownerId) {
        setSource(null); setState({ phase: 'blocked', products: [], message: '商店驗證服務尚未啟用或暫時無法連線，請稍後再試。' });
      }
    });
    return () => { closed = true; context = null; session.current?.dispose(); session.current = null; stopTransactions(); stopLifecycle(); stopNetwork(); };
  }, [runtime, ownerId, accessToken, attempt]);
  useEffect(() => { if (capabilityFresh && ['idle', 'blocked'].includes(session.current?.getState().phase ?? '')) void session.current?.initialize(); }, [capabilityFresh]);
  if (!runtime?.configuration.enabled || !ownerId || !accessToken) return null;
  const accountSource = source?.ownerId === ownerId ? source : null;
  if (!accountSource && state.phase === 'blocked') return <div className="mt-4 space-y-2" role="status">
    <p className="text-sm text-muted-foreground">{state.message}</p><Button variant="secondary" onClick={() => setAttempt(value => value + 1)}>重新連接商店服務</Button>
  </div>;
  return <ApplePurchaseView key={ownerId} state={accountSource ? state : { phase: 'loading', products: [], message: '正在確認商店服務…' }}
    configuration={runtime.configuration} activeSubscription={state.phase === 'confirmed' || (accountSource?.hasActiveSubscription ?? true)}
    billingOrigin={state.phase === 'confirmed' ? 'apple_app_store' : accountSource?.billingOrigin ?? null} online={online} authorized={capabilityFresh}
    purchase={async id => { await session.current?.purchase(id); }} restore={async () => { await session.current?.restore(); }}
    retry={async () => { await session.current?.retry(); }} manage={async () => { await session.current?.manage(); }} />;
}
