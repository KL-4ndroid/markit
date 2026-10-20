'use client';

import { usePathname } from 'next/navigation';

import { MarketDetailLoadingShell } from '@/components/markets/MarketDetailLoadingShell';
import { DetailPageSkeleton } from '@/components/ui/DetailPageSkeleton';

/**
 * RoleLoadingFallback
 *
 * Renders a neutral skeleton while role state is unresolved. Permission and
 * fail-closed behavior remains in RoleGuard/useUserRole; this component only
 * controls the visual loading surface.
 */
export function RoleLoadingFallback() {
  const pathname = usePathname();
  if (pathname?.startsWith('/markets/detail')) {
    return <MarketDetailLoadingShell />;
  }

  return <DetailPageSkeleton />;
}
