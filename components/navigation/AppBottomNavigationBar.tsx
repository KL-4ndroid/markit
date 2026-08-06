'use client';

import {
  BarChart3,
  Calendar,
  Home,
  MoreHorizontal,
  Package,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import type {
  AppNavigationItem,
  AppNavigationItemId,
} from '@/lib/navigation/app-navigation';

const NAVIGATION_ICONS: Record<AppNavigationItemId, LucideIcon> = {
  today: Home,
  markets: Calendar,
  products: Package,
  analytics: BarChart3,
  more: MoreHorizontal,
};

interface AppBottomNavigationBarProps {
  items: readonly AppNavigationItem[];
  activeItemId: AppNavigationItemId;
  onSelect?: (itemId: AppNavigationItemId) => void;
  visible?: boolean;
}

function NavigationItemContent({
  item,
  active,
}: {
  item: AppNavigationItem;
  active: boolean;
}) {
  const Icon = NAVIGATION_ICONS[item.id];

  return (
    <>
      <span
        className={`flex h-8 min-w-10 items-center justify-center rounded-control px-2 transition-colors ${
          active
            ? 'scale-105 bg-primary text-white shadow-atelier-key'
            : 'bg-transparent text-atelier-muted group-hover:bg-soft-pink group-hover:text-atelier-ink'
        }`}
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className={`text-xs ${active ? 'font-semibold text-primary' : 'text-atelier-muted'}`}>
        {item.label}
      </span>
      {active && <span className="absolute bottom-0 h-1 w-1 rounded-full bg-atelier-clay" aria-hidden="true" />}
    </>
  );
}

export function AppBottomNavigationBar({
  items,
  activeItemId,
  onSelect,
  visible = true,
}: AppBottomNavigationBarProps) {
  const itemClassName = 'group relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-control transition-colors';

  return (
    <nav
      aria-label="主要導覽"
      className={`fixed bottom-0 left-0 right-0 z-50 border-t border-primary/10 bg-atelier-paper/95 px-2 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-10px_30px_rgb(123_159_166_/_0.10)] backdrop-blur-md ease-in-out ${
        visible ? 'bottom-0 translate-y-0' : '-bottom-24 translate-y-24'
      }`}
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map(item => {
          const active = activeItemId === item.id;

          if (onSelect) {
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
                className={itemClassName}
              >
                <NavigationItemContent item={item} active={active} />
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={itemClassName}
            >
              <NavigationItemContent item={item} active={active} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
