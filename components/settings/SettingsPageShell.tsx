import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { getGradientClass } from '@/lib/theme-config';

interface SettingsPageShellProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isStaff: boolean;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function SettingsPageShell({
  title,
  description,
  icon: Icon,
  isStaff,
  children,
  backHref,
  backLabel = '返回更多',
}: SettingsPageShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className={`${getGradientClass(isStaff)} rounded-b-[2rem] border-b border-white/15 px-5 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier`}>
        <div className="mx-auto flex max-w-3xl items-start gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label={backLabel}
              title={backLabel}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-white/15 transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" aria-hidden="true" />
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-white/80">{description}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
