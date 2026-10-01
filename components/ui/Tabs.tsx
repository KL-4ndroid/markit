'use client';

import { Tab, TabGroup, TabList } from '@headlessui/react';
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: TabsProps<T>) {
  const selectedIndex = Math.max(0, items.findIndex(item => item.id === value));

  return (
    <TabGroup
      selectedIndex={selectedIndex}
      onChange={index => {
        const item = items[index];
        if (item && !item.disabled) onChange(item.id);
      }}
    >
      <TabList
        aria-label={ariaLabel}
        className={cn(
          'flex min-h-11 gap-1 overflow-x-auto rounded-control border border-primary/10 bg-soft-green/65 p-1',
          className,
        )}
      >
        {items.map(item => (
          <Tab
            key={item.id}
            disabled={item.disabled}
            className="flex min-h-11 min-w-max flex-1 items-center justify-center gap-2 rounded-control px-3 text-sm font-medium text-muted-foreground outline-none transition-colors data-[selected]:bg-atelier-paper data-[selected]:text-primary data-[selected]:shadow-atelier focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {item.icon}
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span className="min-w-5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs tabular-nums text-primary">
                {item.count}
              </span>
            )}
          </Tab>
        ))}
      </TabList>
    </TabGroup>
  );
}
