'use client';

import { useRef, type KeyboardEvent } from 'react';
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
  panelId?: string;
}

export function MarketWorkspaceNavigation<T extends string>({
  value,
  items,
  onChange,
  ariaLabel,
  panelId,
}: MarketWorkspaceNavigationProps<T>) {
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

  return (
    <nav className="sticky top-0 z-30 -mx-1 bg-atelier-canvas px-1 py-3" aria-label={ariaLabel}>
      <div
        className="grid grid-cols-3 gap-1 rounded-card bg-atelier-paper p-1 shadow-atelier"
        role="tablist"
        aria-label={ariaLabel}
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = value === item.id;

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
              className={`relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-control px-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-atelier-muted hover:bg-atelier-sage-soft hover:text-atelier-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] leading-none ${
                    isActive ? 'bg-atelier-paper text-primary' : 'bg-atelier-rose text-white'
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
