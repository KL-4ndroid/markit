'use client';

import Link from 'next/link';

import { AppNavigationIcon } from '@/components/navigation/AppNavigationIcon';
import type {
  AppNavigationItem,
  AppNavigationItemId,
} from '@/lib/navigation/app-navigation';

interface AppDesktopNavigationProps {
  items: readonly AppNavigationItem[];
  activeItemId: AppNavigationItemId;
}

export function AppDesktopNavigation({ items, activeItemId }: AppDesktopNavigationProps) {
  return (
    <aside className="hidden border-r border-primary/10 bg-atelier-paper/95 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
      <div className="border-b border-primary/10 px-5 py-6">
        <Link
          href="/"
          aria-label="Féria 首頁"
          className="flex min-h-11 items-center gap-3 rounded-control px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-primary text-lg font-semibold text-white shadow-atelier-key">
            F
          </span>
          <span className="min-w-0">
            <span className="block text-lg font-semibold text-foreground">Féria</span>
            <span className="block text-xs text-muted-foreground">出攤筆記</span>
          </span>
        </Link>
      </div>

      <nav aria-label="主要導覽" className="flex-1 space-y-1 px-4 py-5">
        {items.map(item => {
          const active = activeItemId === item.id;
          return (
            <Link
              key={item.id}
              href={item.path}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-h-11 items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                active
                  ? 'bg-primary text-white shadow-atelier-key'
                  : 'text-muted-foreground hover:bg-soft-pink hover:text-foreground'
              }`}
            >
              <AppNavigationIcon itemId={item.id} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="border-t border-primary/10 px-6 py-5 text-xs leading-5 text-muted-foreground">
        市集營運與回顧工作區
      </p>
    </aside>
  );
}
