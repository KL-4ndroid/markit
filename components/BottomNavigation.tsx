'use client';

import { useSubscriptionExperience } from '@/components/subscription/SubscriptionExperienceProvider';
import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';

import { AppBottomNavigationBar } from '@/components/navigation/AppBottomNavigationBar';
import { AppDesktopNavigation } from '@/components/navigation/AppDesktopNavigation';
import {
  getActiveAppNavigationItemId,
  getAppNavigationItems,
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

  const { tier, navigationTier } = useSubscriptionExperience();
  const showSalesNavigation = navigationTier === 'light' || navigationTier === 'advanced';
  const navItems = getAppNavigationItems({
    isStaff,
    roleReady: roleRefreshState.isAuthorizationFresh,
  }).filter(item => isStaff || showSalesNavigation || (item.id !== 'products' && item.id !== 'analytics')
    || (tier === 'unavailable' && roleRefreshState.isAuthorizationFresh && getActiveAppNavigationItemId(pathname, [item]) === item.id))
    .map(item => item.id === 'analytics' && navigationTier !== 'advanced' ? { ...item, label: '紀錄' } : item);
  const activeItemId = getActiveAppNavigationItemId(pathname, navItems);

  return (
    <>
      <AppBottomNavigationBar items={navItems} activeItemId={activeItemId} visible={isNavVisible} />
      <AppDesktopNavigation items={navItems} activeItemId={activeItemId} />
    </>
  );
}

export function BottomNavigation() {
  const pathname = usePathname();
  const isHiddenRoute = HIDDEN_ROUTES.some(route => pathname?.startsWith(route));

  if (isHiddenRoute) return null;
  return <ProtectedBottomNavigation />;
}
