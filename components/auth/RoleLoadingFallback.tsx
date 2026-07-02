import { DetailPageSkeleton } from '@/components/ui/DetailPageSkeleton';

/**
 * RoleLoadingFallback
 *
 * Renders a neutral skeleton while role state is unresolved. Permission and
 * fail-closed behavior remains in RoleGuard/useUserRole; this component only
 * controls the visual loading surface.
 */
export function RoleLoadingFallback() {
  return <DetailPageSkeleton />;
}
