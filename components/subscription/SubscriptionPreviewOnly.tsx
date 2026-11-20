'use client';
import { useSyncExternalStore, type ReactNode } from 'react';
import { getApplePurchaseRuntime, getServerApplePurchaseRuntime, subscribeApplePurchaseRuntime } from '@/lib/subscription/apple-purchase-runtime';
export function SubscriptionPreviewOnly({ children }: { children: ReactNode }) {
  const runtime = useSyncExternalStore(subscribeApplePurchaseRuntime, getApplePurchaseRuntime, getServerApplePurchaseRuntime);
  return runtime?.configuration.enabled ? null : children;
}
