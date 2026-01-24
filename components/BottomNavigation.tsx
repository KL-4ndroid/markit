'use client';

import { useState, useEffect } from 'react';
import { Home, Calendar, Package, BarChart3, Settings } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { navigationStore } from '@/lib/navigation-store';

export function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavVisible, setIsNavVisible] = useState(true);

  // 訂閱全局導航狀態
  useEffect(() => {
    const unsubscribe = navigationStore.subscribe((visible) => {
      setIsNavVisible(visible);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const navItems = [
    {
      id: 'home',
      label: '首頁',
      icon: Home,
      path: '/',
    },
    {
      id: 'markets',
      label: '市集',
      icon: Calendar,
      path: '/markets',
    },
    {
      id: 'products',
      label: '商品',
      icon: Package,
      path: '/products',
    },
    {
      id: 'analytics',
      label: '分析',
      icon: BarChart3,
      path: '/analytics',
    },
    {
      id: 'settings',
      label: '設置',
      icon: Settings,
      path: '/settings',
    },
  ];

  const handleNavigation = (item: any) => {
    if (item.path) {
      router.push(item.path);
    }
  };



  return (
    <>
      <nav className={`fixed left-0 right-0 bg-white border-t border-[#7B9FA6]/20 px-4 py-3 z-50 transition-transform duration-300 ease-in-out ${
        isNavVisible ? 'bottom-0 translate-y-0' : '-bottom-24 translate-y-24'
      }`}>
        <div className="max-w-lg mx-auto flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item)}
                className="flex flex-col items-center gap-1 min-w-[60px] transition-all"
              >
                <div
                  className={`p-2.5 rounded-2xl transition-all ${
                    isActive
                      ? 'bg-[#7B9FA6] text-white'
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
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
