'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { subscriptionExperienceIsLoading } from '@/lib/subscription/ui-presentation';
import { useAccountCapabilities } from '@/hooks/useAccountCapabilities';
import { useAuth } from '@/lib/supabase/auth-context';
import { useRoleContext } from '@/lib/role-context';
import { resolveSubscriptionExperience, type SubscriptionExperience } from '@/lib/subscription/experience';

const ExperienceContext = createContext<{ tier: SubscriptionExperience; isStaff: boolean; isLoading: boolean; refresh: () => void }>({
  tier: 'unavailable', isStaff: false, isLoading: true, refresh: () => {},
});

export function SubscriptionExperienceProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const { isStaff, isOwner, roleRefreshState } = useRoleContext();
  const enabled = isOwner && roleRefreshState.isAuthorizationFresh;
  const query = useAccountCapabilities({ accessToken: session?.access_token, enabled });
  const caps = enabled && query.result?.ok ? query.result.capabilities : null;
  const tier = resolveSubscriptionExperience(caps, user?.id ?? null, Date.now(), query.network);
  const isLoading = subscriptionExperienceIsLoading({
    roleStage: roleRefreshState.stage, capabilityEnabled: enabled,
    capabilityLoading: query.isLoading, hasCapabilityResult: query.result !== null,
  });
  return <ExperienceContext.Provider value={{ tier, isStaff, isLoading, refresh: query.refresh }}>{children}</ExperienceContext.Provider>;
}

export function useSubscriptionExperience() {
  const context = useContext(ExperienceContext);
  return { ...context, canRecord: context.tier === 'light' || context.tier === 'advanced',
    canAnalyze: context.tier === 'advanced' };
}
