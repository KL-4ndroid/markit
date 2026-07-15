'use client';

import type { LucideIcon } from 'lucide-react';

export interface MarketWorkspaceNavigationItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface MarketWorkspaceNavigationProps<T extends string> {
  value: T;
  items: readonly MarketWorkspaceNavigationItem<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function MarketWorkspaceNavigation<T extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: MarketWorkspaceNavigationProps<T>) {
  return (
    <nav className="sticky top-0 z-30 -mx-1 bg-background/95 px-1 py-3 backdrop-blur" aria-label={ariaLabel}>
      <div
        className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-white p-1 shadow-sm"
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = value === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.id)}
              className={`relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                    isActive ? 'bg-white text-primary' : 'bg-danger text-white'
                  }`}
                  aria-label={`${item.badge} 項待處理`}
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
