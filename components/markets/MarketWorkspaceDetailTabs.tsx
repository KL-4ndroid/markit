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
    <div className="mb-5" role="tablist" aria-label={ariaLabel}>
      <div className="scrollbar-none flex snap-x snap-proximity gap-2 overflow-x-auto py-0.5">
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
              className={`relative flex min-h-11 min-w-max snap-start items-center justify-center gap-1.5 rounded-control px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-atelier-apricot-soft text-atelier-clay'
                  : 'bg-atelier-paper/70 text-atelier-muted hover:bg-atelier-sage-soft hover:text-atelier-ink'
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
