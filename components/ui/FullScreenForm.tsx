'use client';

import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { X } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { IconButton } from './IconButton';

interface FullScreenFormProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  dismissible?: boolean;
}

export function FullScreenForm({
  open,
  onClose,
  eyebrow,
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
      <div className="fixed inset-0 bg-deep/35 backdrop-blur-sm" aria-hidden="true" />
      <div className="fixed inset-0 overflow-hidden sm:p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel
            aria-describedby={description ? descriptionId : undefined}
            className="flex h-[100dvh] w-full flex-col overflow-hidden bg-atelier-canvas shadow-atelier-lift sm:h-auto sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-dialog sm:border sm:border-primary/10"
          >
            <header className="japanese-gradient-header relative flex shrink-0 items-start justify-between gap-4 overflow-hidden rounded-b-[2rem] border-b border-white/15 px-5 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white sm:rounded-b-none sm:px-6 sm:pb-5 sm:pt-5">
              <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" aria-hidden="true" />
              <div className="relative min-w-0">
                {eyebrow && (
                  <p className="mb-1 text-xs font-medium tracking-[0.12em] text-white/75">{eyebrow}</p>
                )}
                <DialogTitle className="text-xl font-semibold text-white sm:text-2xl">{title}</DialogTitle>
                {description && (
                  <p id={descriptionId} className="mt-1 max-w-xl text-sm leading-6 text-white/80">
                    {description}
                  </p>
                )}
              </div>
              {dismissible && (
                <IconButton
                  label="關閉"
                  icon={<X className="h-5 w-5" aria-hidden="true" />}
                  onClick={onClose}
                  tone="inverse"
                  className="relative -mr-2 -mt-1"
                />
              )}
            </header>

            <div className="japanese-form-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
              {children}
            </div>

            <footer className="japanese-form-footer flex shrink-0 flex-col-reverse gap-3 border-t border-primary/10 bg-atelier-paper/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 backdrop-blur-md sm:flex-row sm:justify-end sm:px-6 sm:pb-4">
              {footer}
            </footer>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
