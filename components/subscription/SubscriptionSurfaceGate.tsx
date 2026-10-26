'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useSubscriptionExperience } from './SubscriptionExperienceProvider';
import { SubscriptionFeatureNotice } from './SubscriptionFeatureNotice';
import { BasicBusinessSummary } from './BasicBusinessSummary';
import { resolveSubscriptionSurface } from '@/lib/subscription/surface-access';

export function SubscriptionSurfaceGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const { isStaff, tier } = useSubscriptionExperience();
  const surface = resolveSubscriptionSurface(pathname, tier, isStaff);
  if (surface === 'light_notice') return <SubscriptionFeatureNotice />;
  if (surface === 'basic_summary') return <BasicBusinessSummary />;
  if (surface === 'advanced_notice') return <SubscriptionFeatureNotice advanced />;
  return <>{children}</>;
}
