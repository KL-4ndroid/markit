'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import { AppBottomNavigationBar } from '@/components/navigation/AppBottomNavigationBar';
import {
  getAppNavigationItems,
  isAppNavigationItemActive,
} from '@/lib/navigation/app-navigation';
import { navigationStore } from '@/lib/navigation-store';
import { useRoleContext } from '@/lib/role-context';

const HIDDEN_ROUTES = ['/demo'];

const subscribeToNavigationVisibility = (listener: () => void) =>
  navigationStore.subscribe(() => listener());
const getNavigationVisibility = () => navigationStore.getVisible();
const getServerNavigationVisibility = () => true;

function ProtectedBottomNavigation() {
  const pathname = usePathname();
  const isNavVisible = useSyncExternalStore(
    subscribeToNavigationVisibility,
    getNavigationVisibility,
    getServerNavigationVisibility
  );
  const { isStaff, roleRefreshState } = useRoleContext();

  const isRoleUnresolved = !roleRefreshState.shouldMountProtectedChildren;
  const navItems = getAppNavigationItems({
    isStaff,
    roleReady: !isRoleUnresolved,
  });
  const activeItemId = navItems.find(item => isAppNavigationItemActive(pathname, item))?.id ?? 'today';

  return <AppBottomNavigationBar items={navItems} activeItemId={activeItemId} visible={isNavVisible} />;
}

export function BottomNavigation() {
  const pathname = usePathname();
  const isHiddenRoute = HIDDEN_ROUTES.some(route => pathname?.startsWith(route));

  if (isHiddenRoute) return null;
  return <ProtectedBottomNavigation />;
}
