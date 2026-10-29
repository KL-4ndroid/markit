'use client';

import { Info } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AppDialog } from './AppDialog';
import { cn } from '@/lib/utils';

interface ContextHelpProps {
  label: string;
  title?: string;
  children: ReactNode;
  className?: string;
  iconOnly?: boolean;
}

/** Supplemental help only. Required labels, errors and data status stay at the call site. */
export function ContextHelp({ label, title = label, children, className, iconOnly = false }: ContextHelpProps) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" aria-label={`查看${label}`} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)}
      className={cn('inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-2 text-sm text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground', className)}>
      <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!iconOnly && <span>{label}</span>}
    </button>
    <AppDialog open={open} onClose={() => setOpen(false)} title={title} presentation="sheet"
      footer={<button type="button" onClick={() => setOpen(false)} className="min-h-12 w-full rounded-xl bg-primary px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:w-auto">關閉說明</button>}>
      <div className="space-y-3 break-words text-sm leading-7 text-foreground">{children}</div>
    </AppDialog>
  </>;
}
