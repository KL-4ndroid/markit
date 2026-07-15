'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { IconButton } from './IconButton';

interface FullScreenFormProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  dismissible?: boolean;
}

export function FullScreenForm({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
}: FullScreenFormProps) {
  const descriptionId = useId();

  return (
    <Dialog
      open={open}
      onClose={dismissible ? onClose : () => {}}
      className="relative z-dialog"
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 overflow-hidden sm:p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            aria-describedby={description ? descriptionId : undefined}
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-dialog"
          >
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-primary/10 px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-4">
              <div className="min-w-0">
                <DialogTitle className="text-lg font-medium text-foreground">{title}</DialogTitle>
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

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {children}
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-primary/10 bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:flex-row sm:justify-end sm:px-6 sm:pb-4">
              {footer}
            </footer>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
