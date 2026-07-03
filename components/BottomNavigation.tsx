'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Calendar, Home, Package, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useRoleContext } from '@/lib/role-context';
import { useNavigation } from '@/lib/navigation-context';
import { navigationStore } from '@/lib/navigation-store';

const HIDDEN_ROUTES = ['/demo'];

const navItems = [
  { id: 'home', label: '首頁', icon: Home, path: '/', index: 0 },
  { id: 'markets', label: '市集', icon: Calendar, path: '/markets', index: 1 },
  { id: 'products', label: '商品', icon: Package, path: '/products', index: 2 },
  { id: 'analytics', label: '分析', icon: BarChart3, path: '/analytics', index: 3 },
  { id: 'settings', label: '設置', icon: Settings, path: '/settings', index: 4 },
];

type NavItem = (typeof navItems)[number];

function ProtectedBottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const { setNavigation } = useNavigation();
  const { isStaff, roleRefreshState } = useRoleContext();

  const isRoleUnresolved = roleRefreshState.stage !== 'ready';

	useEffect(() => {
	  const unsubscribe = navigationStore.subscribe((visible) => {
		setIsNavVisible(visible);
	  });

	  return () => {
		unsubscribe();
	  };
	}, []);

  useEffect(() => {
    const routesToPrefetch = ['/markets', '/products', '/analytics', '/settings'];
    let timeoutId: ReturnType<typeof setTimeout>;

    const doPrefetch = () => {
      routesToPrefetch.forEach(route => router.prefetch(route));
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(doPrefetch);
      return () => cancelIdleCallback(idleId);
    }

    timeoutId = setTimeout(doPrefetch, 1500);
    return () => clearTimeout(timeoutId);
  }, [router]);

  const currentIndex = navItems.find(item => item.path === pathname)?.index ?? 0;

  const handleNavClick = (event: React.MouseEvent, item: NavItem) => {
    if ((isStaff || isRoleUnresolved) && item.id === 'analytics') {
      event.preventDefault();
      toast.error('此功能僅供老闆使用', {
        description: '員工無法查看數據分析',
        duration: 2000,
      });
      return;
    }

    setNavigation(currentIndex, item.index);
  };

  return (
    <nav className={`fixed left-0 right-0 z-50 border-t border-primary/20 bg-white px-4 py-3 ease-in-out hardware-accelerated ${
      isNavVisible ? 'bottom-0 translate-y-0' : '-bottom-24 translate-y-24'
    }`}>
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          const isDisabled = (isStaff || isRoleUnresolved) && item.id === 'analytics';

          return (
            <Link
              key={item.id}
              href={item.path}
              prefetch={true}
              onClick={(event) => handleNavClick(event, item)}
              className={`flex min-w-[60px] flex-col items-center gap-1 transition-all hardware-accelerated ${
                isDisabled ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              <div
                className={`rounded-2xl p-2.5 transition-all hardware-accelerated ${
                  isActive
                    ? 'bg-primary text-white'
                    : isDisabled
                    ? 'bg-transparent text-muted-foreground'
                    : 'bg-transparent text-muted-foreground hover:bg-soft-pink'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs transition-colors ${isActive ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
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

  if (isHiddenRoute) {
    return null;
  }

  return <ProtectedBottomNavigation />;
}
