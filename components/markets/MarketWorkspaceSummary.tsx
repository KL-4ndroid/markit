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

export function MarketWorkspaceSummary({
  phase,
  operatingTime,
  items,
}: MarketWorkspaceSummaryProps) {
  return (
    <section className="mb-4 overflow-hidden rounded-card border border-atelier-line bg-atelier-paper" aria-label="市集摘要">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-atelier-line px-4 py-2.5">
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

      <dl className={`grid divide-x divide-atelier-line ${items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {items.map((item) => (
          <div key={item.label} className="min-w-0 px-3 py-4 text-center">
            <dt className="truncate text-[11px] font-medium text-atelier-muted">{item.label}</dt>
            <dd
              className={`mt-1.5 truncate text-base font-semibold tabular-nums sm:text-lg ${
                item.emphasis ? 'text-primary' : 'text-atelier-ink'
              }`}
              title={typeof item.value === 'string' || typeof item.value === 'number' ? String(item.value) : undefined}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
