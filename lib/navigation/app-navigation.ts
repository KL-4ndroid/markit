export type AppNavigationItemId = 'today' | 'markets' | 'products' | 'analytics' | 'more';

export interface AppNavigationItem {
  id: AppNavigationItemId;
  label: string;
  path: string;
  order: number;
  activePrefixes: readonly string[];
}

const NAVIGATION_ITEMS: Record<AppNavigationItemId, AppNavigationItem> = {
  today: {
    id: 'today',
    label: '今日',
    path: '/',
    order: 0,
    activePrefixes: ['/'],
  },
  markets: {
    id: 'markets',
    label: '市集',
    path: '/markets',
    order: 1,
    activePrefixes: ['/markets'],
  },
  products: {
    id: 'products',
    label: '商品',
    path: '/products',
    order: 2,
    activePrefixes: ['/products'],
  },
  analytics: {
    id: 'analytics',
    label: '分析',
    path: '/analytics',
    order: 3,
    activePrefixes: ['/analytics', '/reports'],
  },
  more: {
    id: 'more',
    label: '更多',
    path: '/settings',
    order: 4,
    activePrefixes: ['/settings', '/staff', '/recovery', '/subscription'],
  },
};

const OWNER_NAVIGATION_IDS: readonly AppNavigationItemId[] = [
  'today',
  'markets',
  'products',
  'analytics',
  'more',
];

const STAFF_NAVIGATION_IDS: readonly AppNavigationItemId[] = [
  'today',
  'markets',
  'products',
  'more',
];

export function getAppNavigationItems({
  isStaff,
  roleReady,
}: {
  isStaff: boolean;
  roleReady: boolean;
}): AppNavigationItem[] {
  const ids = roleReady && !isStaff ? OWNER_NAVIGATION_IDS : STAFF_NAVIGATION_IDS;
  return ids.map(id => NAVIGATION_ITEMS[id]);
}

export function isAppNavigationItemActive(
  pathname: string | null,
  item: AppNavigationItem,
): boolean {
  if (!pathname) return false;
  if (item.id === 'today') return pathname === '/';

  return item.activePrefixes.some(prefix => (
    pathname === prefix || pathname.startsWith(`${prefix}/`)
  ));
}
