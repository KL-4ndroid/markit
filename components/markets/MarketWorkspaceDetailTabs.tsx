'use client';

import type { LucideIcon } from 'lucide-react';

interface MarketWorkspaceDetailTab<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
}

interface MarketWorkspaceDetailTabsProps<T extends string> {
  value: T;
  items: readonly MarketWorkspaceDetailTab<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function MarketWorkspaceDetailTabs<T extends string>({
  value,
  items,
  onChange,
  ariaLabel,
}: MarketWorkspaceDetailTabsProps<T>) {
  return (
    <div className="mb-4" role="tablist" aria-label={ariaLabel}>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === value;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.id)}
              className={`flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-white text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
