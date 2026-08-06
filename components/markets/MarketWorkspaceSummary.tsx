import type { ReactNode } from 'react';
import { Clock3 } from 'lucide-react';
import {
  getMarketWorkspacePhaseLabel,
  type MarketWorkspacePhase,
} from '@/lib/markets/market-workspace';

interface MarketWorkspaceSummaryItem {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
}

interface MarketWorkspaceSummaryProps {
  phase: MarketWorkspacePhase;
  operatingTime?: string | null;
  items: readonly MarketWorkspaceSummaryItem[];
}

const PHASE_STYLES: Record<MarketWorkspacePhase, string> = {
  'not-started': 'bg-secondary',
  operating: 'bg-primary',
  ended: 'bg-muted-foreground',
};

const PHASE_SURFACES: Record<MarketWorkspacePhase, string> = {
  'not-started': 'bg-atelier-apricot-soft/75',
  operating: 'bg-atelier-sage-soft',
  ended: 'bg-atelier-blue-soft/80',
};

export function MarketWorkspaceSummary({
  phase,
  operatingTime,
  items,
}: MarketWorkspaceSummaryProps) {
  const primaryIndex = Math.max(0, items.findIndex(item => item.emphasis));
  const primaryItem = items[primaryIndex];
  const secondaryItems = items.filter((_, index) => index !== primaryIndex);

  return (
    <section className={`mb-5 rounded-card p-5 shadow-atelier sm:p-6 ${PHASE_SURFACES[phase]}`} aria-label="市集摘要">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-atelier-ink">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PHASE_STYLES[phase]}`} aria-hidden="true" />
          <span>{getMarketWorkspacePhaseLabel(phase)}</span>
        </div>
        {operatingTime && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-atelier-muted">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{operatingTime}</span>
          </div>
        )}
      </div>

      <dl className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] sm:items-end">
        {primaryItem && (
          <div className="min-w-0">
            <dt className="text-xs font-medium text-atelier-muted">{primaryItem.label}</dt>
            <dd
              className={`mt-1 break-words text-[1.75rem] font-semibold leading-tight tabular-nums sm:text-[2rem] ${
                primaryItem.emphasis ? 'text-primary' : 'text-atelier-ink'
              }`}
              title={typeof primaryItem.value === 'string' || typeof primaryItem.value === 'number' ? String(primaryItem.value) : undefined}
            >
              {primaryItem.value}
            </dd>
          </div>
        )}

        {secondaryItems.length > 0 && (
          <div className={`grid gap-x-5 gap-y-4 ${secondaryItems.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {secondaryItems.map(item => (
              <div key={item.label} className="min-w-0">
                <dt className="text-[11px] font-medium text-atelier-muted">{item.label}</dt>
                <dd
                  className={`mt-1 break-words text-base font-semibold tabular-nums sm:text-lg ${
                    item.emphasis ? 'text-primary' : 'text-atelier-ink'
                  }`}
                  title={typeof item.value === 'string' || typeof item.value === 'number' ? String(item.value) : undefined}
                >
                  {item.value}
                </dd>
              </div>
            ))}
          </div>
        )}
      </dl>
    </section>
  );
}
