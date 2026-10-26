import { isPathWithinRoute } from '@/lib/navigation/public-route';
import type { SubscriptionExperience } from './experience';

export type SubscriptionSurface = 'content' | 'basic_summary' | 'light_notice' | 'advanced_notice';

/** Shared route presentation rule; staff still require the existing role/Team authorization. */
export function resolveSubscriptionSurface(path: string, tier: SubscriptionExperience, isStaff = false): SubscriptionSurface {
  if (isStaff) return 'content';
  const paid = tier === 'light' || tier === 'advanced';
  if (isPathWithinRoute(path, '/products') && !paid) return 'light_notice';
  if (isPathWithinRoute(path, '/analytics')) {
    if (tier === 'light') return 'basic_summary';
    return tier === 'advanced' ? 'content' : 'advanced_notice';
  }
  if (['/reports', '/settings/team', '/staff'].some(route => isPathWithinRoute(path, route)) && tier !== 'advanced') return 'advanced_notice';
  return 'content';
}
