'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'default' | 'compact';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white shadow-sm shadow-primary/15 hover:bg-primary/88 hover:shadow-md focus-visible:ring-primary/35',
  secondary: 'border border-primary/15 bg-atelier-paper text-foreground shadow-sm shadow-primary/5 hover:bg-soft-pink focus-visible:ring-primary/25',
  danger: 'bg-danger text-white hover:bg-danger/85 focus-visible:ring-danger/30',
  ghost: 'bg-transparent text-foreground hover:bg-muted/60 focus-visible:ring-primary/20',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: 'min-h-11 px-4 py-2.5 text-sm',
  compact: 'min-h-11 px-3 py-2 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'default',
    isLoading = false,
    leadingIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-[color,background-color,box-shadow,transform] active:translate-y-px',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : leadingIcon}
      {children}
    </button>
  );
});
