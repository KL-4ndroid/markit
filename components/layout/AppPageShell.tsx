import type { ComponentPropsWithoutRef, ElementType } from 'react';

import { cn } from '@/lib/utils';
import {
  getPageShellWidthClass,
  type PageShellWidthMode,
} from '@/lib/layout/page-shell';

interface AppPageShellProps<T extends ElementType = 'div'> {
  as?: T;
  width?: PageShellWidthMode;
  className?: string;
  children: React.ReactNode;
}

export function AppPageShell<T extends ElementType = 'div'>({
  as,
  width = 'focused',
  className,
  children,
  ...props
}: AppPageShellProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof AppPageShellProps<T>>) {
  const Component = as ?? 'div';
  return (
    <Component
      className={cn('mx-auto w-full', getPageShellWidthClass(width), className)}
      {...props}
    >
      {children}
    </Component>
  );
}
