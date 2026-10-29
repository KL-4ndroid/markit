'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'inverse' | 'danger';
  tooltip?: string;
}

const TONE_CLASSES: Record<NonNullable<IconButtonProps['tone']>, string> = {
  default: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
  inverse: 'bg-card text-foreground hover:bg-background focus-visible:ring-white focus-visible:ring-offset-foreground',
  danger: 'text-danger hover:bg-status-danger-bg',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    icon,
    tone = 'default',
    tooltip,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={tooltip ?? label}
      className={cn(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        'disabled:cursor-not-allowed disabled:opacity-50',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
