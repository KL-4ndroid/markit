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
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layer?: 'dialog' | 'critical';
  dismissible?: boolean;
  presentation?: 'center' | 'sheet';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AppDialogProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-6xl',
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
  presentation = 'center',
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
      <div className={cn('fixed inset-0 overflow-y-auto', presentation === 'sheet' ? 'p-0 sm:p-4' : 'p-4')}>
        <div className={cn('flex min-h-full justify-center', presentation === 'sheet' ? 'items-end sm:items-center' : 'items-center')}>
          <DialogPanel
            aria-describedby={description ? descriptionId : undefined}
            className={cn(
              'japanese-surface-card flex max-h-[90dvh] w-full flex-col overflow-hidden',
              SIZE_CLASSES[size],
              presentation === 'sheet' && 'max-h-[85dvh] pb-[env(safe-area-inset-bottom)] max-sm:rounded-b-none',
              className,
            )}
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-primary/10 bg-soft-yellow/45 px-5 py-4">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-medium text-foreground">
                  {title}
                </DialogTitle>
                {description && (
                  <p id={descriptionId} className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">
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
            <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
            {footer && (
              <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-primary/10 px-5 py-4 sm:flex-row sm:justify-end">
                {footer}
              </footer>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
