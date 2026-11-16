'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { subscriptionExperienceIsLoading } from '@/lib/subscription/ui-presentation';
import { useAccountCapabilities, type AccountCapabilityQuery } from '@/hooks/useAccountCapabilities';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { resolveSubscriptionExperience, type SubscriptionExperience } from '@/lib/subscription/experience';

const ExperienceContext = createContext<{ tier: SubscriptionExperience; navigationTier: SubscriptionExperience; capabilityQuery: AccountCapabilityQuery; isStaff: boolean; isLoading: boolean; refresh: () => void }>({
  tier: 'unavailable', navigationTier: 'unavailable', isStaff: false, isLoading: true, refresh: () => {},
  capabilityQuery: { result: null, isLoading: true, network: 'online', refresh: () => {} },
});

export function SubscriptionExperienceProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const { isStaff, isOwner, roleRefreshState } = useRoleContext();
  const enabled = isOwner && roleRefreshState.isAuthorizationFresh;
  const query = useAccountCapabilities({ accessToken: session?.access_token, enabled });
  const caps = enabled && query.result?.ok ? query.result.capabilities : null;
  const tier = resolveSubscriptionExperience(caps, user?.id ?? null, Date.now(), query.network);
  const ownerId = isOwner && !isStaff ? user?.id : undefined;
  const [navigation, setNavigation] = useState<{ ownerId?: string; tier: SubscriptionExperience }>({ tier: 'unavailable' });
  if (navigation.ownerId !== ownerId || (tier !== 'unavailable' && navigation.tier !== tier)) {
    setNavigation({ ownerId, tier });
  }
  // Keep navigation stable for this owner during capability refresh. Data access still uses tier.
  const navigationTier = tier === 'unavailable' && ownerId && navigation.ownerId === ownerId ? navigation.tier : tier;
  const isLoading = subscriptionExperienceIsLoading({
    roleStage: roleRefreshState.stage, capabilityEnabled: enabled,
    capabilityLoading: query.isLoading, hasCapabilityResult: query.result !== null,
  });
  return <ExperienceContext.Provider value={{ tier, navigationTier, capabilityQuery: query, isStaff, isLoading, refresh: query.refresh }}>{children}</ExperienceContext.Provider>;
}

export function useSubscriptionExperience() {
  const context = useContext(ExperienceContext);
  return { ...context, canRecord: context.tier === 'light' || context.tier === 'advanced',
    canAnalyze: context.tier === 'advanced' };
}
