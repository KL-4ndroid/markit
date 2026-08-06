import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { getGradientClass } from '@/lib/theme-config';

interface WorkspacePageHeaderProps {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  isStaff?: boolean;
  action?: ReactNode;
  maxWidthClass?: 'max-w-3xl' | 'max-w-4xl';
}

export function WorkspacePageHeader({
  title,
  eyebrow,
  icon: Icon,
  isStaff = false,
  action,
  maxWidthClass = 'max-w-3xl',
}: WorkspacePageHeaderProps) {
  return (
    <header className={`${getGradientClass(isStaff)} rounded-b-[2rem] border-b border-white/15 px-5 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier`}>
      <div className={`mx-auto flex ${maxWidthClass} items-start justify-between gap-4`}>
        <div>
          <p className="text-sm text-white/80">{eyebrow}</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
            <Icon className="h-6 w-6" aria-hidden="true" />
            {title}
          </h1>
        </div>
        {action}
      </div>
    </header>
  );
}
