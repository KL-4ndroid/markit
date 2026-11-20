import { Capacitor, registerPlugin } from '@capacitor/core';
import { createApplePurchasePort, type ApplePurchaseBridge } from './apple-purchases';

/** Explicit reviewed bootstrap only; loadIosPlatform intentionally does not call this yet. */
export function loadApplePurchases(configuration: { enabled: boolean; environment: 'sandbox' | 'production'; productIds: readonly string[] }) {
  if (!configuration.enabled || !Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios'
    || !Capacitor.isPluginAvailable('StallightPurchases')) throw new Error('apple_store_unavailable');
  return createApplePurchasePort({ ...configuration, bridge: registerPlugin<ApplePurchaseBridge>('StallightPurchases') });
}
