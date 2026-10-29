'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormSectionDisclosureProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
  /** Legacy presentation hint; section icons now share a neutral treatment. */
  tone?: 'green' | 'yellow' | 'blue' | 'pink';
}

export function FormSectionDisclosure({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = false,
}: FormSectionDisclosureProps) {
  return (
    <details
      className="group overflow-hidden rounded-[1.25rem] border border-primary/10 bg-atelier-paper shadow-atelier transition-colors open:border-primary/20"
      open={defaultOpen || undefined}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/45 text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
        <ChevronDown
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-primary/10 bg-white/45 px-4 py-5 sm:px-5">{children}</div>
    </details>
  );
}
