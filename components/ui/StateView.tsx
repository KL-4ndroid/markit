import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface StateViewProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

export function StateView({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
}: StateViewProps) {
  return (
    <div className={cn(
      'japanese-surface-card flex flex-col items-center text-center',
      compact ? 'gap-2 rounded-card px-4 py-5' : 'gap-3 rounded-card px-6 py-8',
      className,
    )}>
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <div>
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
