import type { RecoverablePurchasePort } from '@/lib/platform/contracts/in-app-purchase';
import type { ApplePurchaseConfiguration, ApplePurchaseServerPort } from './apple-purchase-session';

export type ApplePurchaseRuntime = Readonly<{
  configuration: ApplePurchaseConfiguration;
  port: RecoverablePurchasePort;
  connect(ownerId: string, accessToken: string): Promise<{
    accountToken: string; billingOrigin: string | null; hasActiveSubscription: boolean; server: ApplePurchaseServerPort;
  }>;
}>;
// No env flag, URL switch or store mock can enable purchases in the shipping app.
// Reviewed E02 bootstrap must supply authenticated binding + current source + server ports.
let runtime: ApplePurchaseRuntime | null = null;
const listeners = new Set<() => void>();
export const getApplePurchaseRuntime = () => runtime;
export const getServerApplePurchaseRuntime = (): ApplePurchaseRuntime | null => null;
export function subscribeApplePurchaseRuntime(listener: () => void): () => void {
  listeners.add(listener); return () => { listeners.delete(listener); };
}
export function installApplePurchaseRuntime(value: ApplePurchaseRuntime): () => void {
  const previous = runtime; runtime = value; listeners.forEach(listener => listener());
  return () => { if (runtime === value) { runtime = previous; listeners.forEach(listener => listener()); } };
}
