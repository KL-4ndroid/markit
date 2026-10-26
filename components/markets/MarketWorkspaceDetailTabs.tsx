'use client';

import { useRef, type KeyboardEvent } from 'react';
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
  panelId?: string;
}

export function MarketWorkspaceDetailTabs<T extends string>({
  value,
  items,
  onChange,
  ariaLabel,
  panelId,
}: MarketWorkspaceDetailTabsProps<T>) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = items.length - 1;
    if (nextIndex === null) return;

    event.preventDefault();
    onChange(items[nextIndex].id);
    buttonRefs.current[nextIndex]?.focus();
  };

  const gridClass = items.length === 5 ? 'grid-cols-6 lg:grid-cols-5'
    : items.length === 6 ? 'grid-cols-6'
    : items.length === 4 ? 'grid-cols-4'
    : items.length === 3 ? 'grid-cols-3'
    : items.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className={`mb-5 grid ${gridClass} gap-1 rounded-control bg-atelier-paper/70 p-1`} role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = item.id === value;

          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              id={panelId ? `${panelId}-tab-${item.id}` : undefined}
              tabIndex={isActive ? 0 : -1}
              ref={(element) => { buttonRefs.current[index] = element; }}
              onClick={() => onChange(item.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`${items.length > 4 ? (items.length === 5 && index > 2 ? 'col-span-3 lg:col-span-1' : 'col-span-2 lg:col-span-1') : ''} relative flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-control px-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:gap-1.5 sm:px-3 sm:text-sm ${
                isActive
                  ? 'bg-atelier-apricot-soft text-atelier-clay'
                  : 'bg-atelier-paper/70 text-atelier-muted hover:bg-atelier-sage-soft hover:text-atelier-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
    </div>
  );
}
