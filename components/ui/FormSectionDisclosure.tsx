'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormSectionDisclosureProps {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function FormSectionDisclosure({
  title,
  description,
  icon: Icon,
  children,
  defaultOpen = false,
}: FormSectionDisclosureProps) {
  return (
    <details className="group border-b border-primary/10 py-1" open={defaultOpen || undefined}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-background text-primary">
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
      <div className="pb-5 pl-0 sm:pl-12">{children}</div>
    </details>
  );
}
