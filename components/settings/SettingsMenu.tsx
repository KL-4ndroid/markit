import Link from 'next/link';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface SettingsMenuRowProps {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export function SettingsMenuRow({
  href,
  label,
  description,
  icon: Icon,
}: SettingsMenuRowProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[72px] items-center gap-3 px-4 py-3 transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-1 text-xs font-semibold text-muted-foreground">{title}</h2>
      <div className="divide-y divide-primary/10 overflow-hidden rounded-card border border-primary/10 bg-white">
        {children}
      </div>
    </section>
  );
}
