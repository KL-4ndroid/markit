import {
  BarChart3,
  Calendar,
  Home,
  MoreHorizontal,
  Package,
  type LucideProps,
} from 'lucide-react';

import type { AppNavigationItemId } from '@/lib/navigation/app-navigation';

const NAVIGATION_ICONS = {
  today: Home,
  markets: Calendar,
  products: Package,
  analytics: BarChart3,
  more: MoreHorizontal,
} satisfies Record<AppNavigationItemId, React.ComponentType<LucideProps>>;

export function AppNavigationIcon({
  itemId,
  className = 'h-5 w-5',
}: {
  itemId: AppNavigationItemId;
  className?: string;
}) {
  const Icon = NAVIGATION_ICONS[itemId];
  return <Icon className={className} aria-hidden="true" />;
}
