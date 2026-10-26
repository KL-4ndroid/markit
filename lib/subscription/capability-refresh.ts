import type { AccountCapabilities } from './subscription-capabilities';

/** A bounded read at refresh/expiry boundaries; past deadlines never start a polling loop. */
export function nextCapabilityRefreshDelay(capabilities: AccountCapabilities, nowMs: number): number | null {
  if (!Number.isFinite(nowMs)) return null;
  const freshUntil = Date.parse(capabilities.capabilityRefreshAfter ?? '');
  const entitlementUntil = Date.parse(capabilities.entitlementEndsAt ?? '');
  const future = [freshUntil - 30_000, freshUntil, entitlementUntil]
    .filter(deadline => Number.isFinite(deadline) && deadline > nowMs);
  return future.length ? Math.max(1, Math.min(...future) - nowMs + 1) : null;
}
