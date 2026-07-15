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
    <section className="mb-4 overflow-hidden rounded-lg border border-border bg-white" aria-label="市集摘要">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${PHASE_STYLES[phase]}`} aria-hidden="true" />
          <span>{getMarketWorkspacePhaseLabel(phase)}</span>
        </div>
        {operatingTime && (
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{operatingTime}</span>
          </div>
        )}
      </div>

      <dl className={`grid divide-x divide-border ${items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {items.map((item) => (
          <div key={item.label} className="min-w-0 px-3 py-3 text-center">
            <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
            <dd
              className={`mt-1 truncate text-sm font-semibold sm:text-base ${
                item.emphasis ? 'text-primary' : 'text-foreground'
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
