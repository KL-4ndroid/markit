'use client';

import { useState, useEffect } from 'react';
import { Home, Calendar, Package, BarChart3, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { navigationStore } from '@/lib/navigation-store';
import { useNavigation } from '@/lib/navigation-context';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const { setNavigation } = useNavigation();
  const { isStaff } = useUserRole(); // ✅ 員工權限檢查

  // 訂閱全局導航狀態
  useEffect(() => {
    const unsubscribe = navigationStore.subscribe((visible) => {
      setIsNavVisible(visible);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Prefetch routes when browser is idle (non-blocking)
  useEffect(() => {
    const routesToPrefetch = ['/markets', '/products', '/analytics', '/settings'];

    let timeoutId: ReturnType<typeof setTimeout>;

    const doPrefetch = () => {
      routesToPrefetch.forEach(route => {
        router.prefetch(route);
      });
    };

    if (typeof requestIdleCallback !== 'undefined') {
      const idleId = requestIdleCallback(() => doPrefetch());
      return () => cancelIdleCallback(idleId);
    } else {
      timeoutId = setTimeout(doPrefetch, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [router]);

  const navItems = [
    {
      id: 'home',
      label: '首頁',
      icon: Home,
      path: '/',
      index: 0,
    },
    {
      id: 'markets',
      label: '市集',
      icon: Calendar,
      path: '/markets',
      index: 1,
    },
    {
      id: 'products',
      label: '商品',
      icon: Package,
      path: '/products',
      index: 2,
    },
    {
      id: 'analytics',
      label: '分析',
      icon: BarChart3,
      path: '/analytics',
      index: 3,
    },
    {
      id: 'settings',
      label: '設置',
      icon: Settings,
      path: '/settings',
      index: 4,
    },
  ];

  // 獲取當前路由索引
  const currentIndex = navItems.find(item => item.path === pathname)?.index ?? 0;

  // ✅ 處理導航點擊（員工模式下禁用分析功能）
  const handleNavClick = (e: React.MouseEvent, item: typeof navItems[0]) => {
    // 員工模式下禁用分析功能
    if (isStaff && item.id === 'analytics') {
      e.preventDefault();
      toast.error('此功能僅供老闆使用', {
        description: '員工無權限查看數據分析',
        duration: 2000,
      });
      return;
    }
    
    setNavigation(currentIndex, item.index);
  };

  return (
    <>
      <nav className={`fixed left-0 right-0 bg-white border-t border-[#7B9FA6]/20 px-4 py-3 z-50 ease-in-out hardware-accelerated ${
        isNavVisible ? 'bottom-0 translate-y-0' : '-bottom-24 translate-y-24'
      }`}>
        <div className="max-w-lg mx-auto flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            // ✅ 員工模式下禁用分析功能
            const isDisabled = isStaff && item.id === 'analytics';
            
            return (
              <Link
                key={item.id}
                href={item.path}
                prefetch={true}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex flex-col items-center gap-1 min-w-[60px] transition-all hardware-accelerated ${
                  isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <div
                  className={`p-2.5 rounded-2xl transition-all hardware-accelerated ${
                    isActive
                      ? 'bg-[#7B9FA6] text-white'
                      : isDisabled
                      ? 'bg-transparent text-[#6B6B6B]'
                      : 'bg-transparent text-[#6B6B6B] hover:bg-[#F5E6E8]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs transition-colors ${
                    isActive ? 'text-[#7B9FA6] font-medium' : 'text-[#6B6B6B]'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
