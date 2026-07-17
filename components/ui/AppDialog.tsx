'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

export interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  layer?: 'dialog' | 'critical';
  dismissible?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AppDialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export function AppDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  layer = 'dialog',
  dismissible = true,
  className,
}: AppDialogProps) {
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={dismissible ? onClose : () => {}}
      className={layer === 'critical' ? 'relative z-critical' : 'relative z-dialog'}
    >
      <div className="fixed inset-0 bg-deep/35 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 overflow-y-auto p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              'japanese-surface-card flex max-h-[90dvh] w-full flex-col overflow-hidden',
              SIZE_CLASSES[size],
              className,
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-primary/10 bg-soft-yellow/45 px-5 py-4">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-medium text-foreground">
                  {title}
                </DialogTitle>
                {description && (
                  <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <IconButton
                  label="關閉"
                  icon={<X className="h-5 w-5" aria-hidden="true" />}
                  onClick={onClose}
                  className="-mr-2 -mt-1"
                />
              )}
            </header>
            <div className="overflow-y-auto px-5 py-5">{children}</div>
            {footer && (
              <footer className="flex flex-col-reverse gap-3 border-t border-primary/10 px-5 py-4 sm:flex-row sm:justify-end">
                {footer}
              </footer>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
