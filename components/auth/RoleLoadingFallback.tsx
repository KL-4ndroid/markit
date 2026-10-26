'use client';

import { usePathname } from 'next/navigation';

import { MarketDetailLoadingShell } from '@/components/markets/MarketDetailLoadingShell';
import { DetailPageSkeleton } from '@/components/ui/DetailPageSkeleton';
import { useRoleContext } from '@/lib/role-context';
import { RoleAccessNotice } from './RoleAccessNotice';

/**
 * RoleLoadingFallback
 *
 * Renders a neutral skeleton while role state is unresolved. Permission and
 * fail-closed behavior remains in RoleGuard/useUserRole; this component only
 * controls the visual loading surface.
 */
export function RoleLoadingFallback() {
  const pathname = usePathname();
  const { roleRefreshState, refreshRole } = useRoleContext();
  if (roleRefreshState.needsRetry) {
    return <RoleAccessNotice onRetry={refreshRole} />;
  }
  if (pathname?.startsWith('/markets/detail')) {
    return <MarketDetailLoadingShell />;
  }

  return <div>
    <p role="status" className="bg-background px-5 py-3 text-center text-sm text-muted-foreground">已登入，正在確認使用權限…</p>
    <DetailPageSkeleton />
  </div>;
}
