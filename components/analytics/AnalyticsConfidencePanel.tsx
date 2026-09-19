import { AlertTriangle, CheckCircle2, ClipboardCheck, Database } from 'lucide-react';

import type { AnalyticsConfidencePresentation } from '@/lib/analytics/confidence-presentation';

interface AnalyticsConfidencePanelProps {
  presentation: AnalyticsConfidencePresentation;
}

const stateStyles: Record<AnalyticsConfidencePresentation['state'], string> = {
  insufficient: 'border-status-danger-border bg-status-danger-bg',
  emerging: 'border-status-warn-border bg-status-warn-bg',
  usable: 'border-primary/20 bg-soft-green',
  strong: 'border-status-good-border bg-status-good-bg',
};

export function AnalyticsConfidencePanel({ presentation }: AnalyticsConfidencePanelProps) {
  const Icon = presentation.state === 'insufficient'
    ? AlertTriangle
    : presentation.state === 'strong'
      ? CheckCircle2
      : ClipboardCheck;

  return (
    <section
      className={`rounded-card border p-4 ${stateStyles[presentation.state]}`}
      aria-labelledby="analytics-confidence-title"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">結論可信度</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 id="analytics-confidence-title" className="text-base font-semibold text-foreground">
              {presentation.label}
            </h2>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-foreground">
              {presentation.sampleLabel}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{presentation.summary}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-current/10 pt-3">
        <p className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Database className="h-4 w-4" aria-hidden="true" />
          建議先補強
        </p>
        <p className="mt-1 text-sm leading-6 text-foreground">{presentation.missingDataAction}</p>
      </div>
    </section>
  );
}
