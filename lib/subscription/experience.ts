import { hasEffectiveEntitlement, resolveCapabilityFreshness, type AccountCapabilities } from './subscription-capabilities';

export type SubscriptionExperience = 'unavailable' | 'free' | 'light' | 'advanced';

/** Product-facing tier; legacy persistence codes remain compatible with existing RPCs.
 * Role authorization is separate and must still be checked by the caller. */
export function resolveSubscriptionExperience(capabilities: AccountCapabilities | null, ownerId: string | null,
  nowMs: number, network: 'online' | 'offline'): SubscriptionExperience {
  if (!capabilities || !ownerId || capabilities.ownerId !== ownerId
    || resolveCapabilityFreshness({ capabilities, nowMs, network }) !== 'fresh') return 'unavailable';
  if (capabilities.planCode === 'free' || !hasEffectiveEntitlement(capabilities, nowMs)) return 'free';
  return capabilities.planCode === 'team' ? 'advanced' : 'light';
}

const listeners = new Set<() => void>();
/** In-process invalidation only: no browser storage, tokens or subscription grants. */
export function notifySubscriptionExperienceChanged() { listeners.forEach(listener => listener()); }
export function subscribeSubscriptionExperienceChanged(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
