'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Home,
  MoreHorizontal,
  Package,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  getAppNavigationItems,
  isAppNavigationItemActive,
  type AppNavigationItemId,
} from '@/lib/navigation/app-navigation';
import { navigationStore } from '@/lib/navigation-store';
import { useRoleContext } from '@/lib/role-context';

const HIDDEN_ROUTES = ['/demo'];

const NAVIGATION_ICONS: Record<AppNavigationItemId, LucideIcon> = {
  today: Home,
  markets: Calendar,
  products: Package,
  analytics: BarChart3,
  more: MoreHorizontal,
};

function ProtectedBottomNavigation() {
  const pathname = usePathname();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const { isStaff, roleRefreshState } = useRoleContext();

  const isRoleUnresolved = roleRefreshState.stage !== 'ready';
  const navItems = getAppNavigationItems({
    isStaff,
    roleReady: !isRoleUnresolved,
  });

  useEffect(() => {
    const unsubscribe = navigationStore.subscribe(setIsNavVisible);
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <nav
      aria-label="主要導覽"
      className={`fixed left-0 right-0 z-50 border-t border-primary/20 bg-white px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] ease-in-out ${
        isNavVisible ? 'bottom-0 translate-y-0' : '-bottom-24 translate-y-24'
      }`}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {navItems.map(item => {
          const Icon = NAVIGATION_ICONS[item.id];
          const isActive = isAppNavigationItemActive(pathname, item);

          return (
            <Link
              key={item.id}
              href={item.path}
              aria-current={isActive ? 'page' : undefined}
              className="flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors"
            >
              <span
                className={`flex h-8 min-w-10 items-center justify-center rounded-lg px-2 transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-transparent text-muted-foreground hover:bg-soft-pink'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={`text-xs ${isActive ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const isHiddenRoute = HIDDEN_ROUTES.some(route => pathname?.startsWith(route));

  if (isHiddenRoute) return null;
  return <ProtectedBottomNavigation />;
}
