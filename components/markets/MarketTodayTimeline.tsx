'use client';

import { useState } from 'react';
import { ChevronDown, ClipboardCheck, Clock3, DoorOpen, Moon, Store } from 'lucide-react';
import type { Market } from '@/types/db';
import { formatClockTime, formatClockTimeRange } from '@/lib/presentation/formatters';
import { calculateMarketDurationLabel } from '@/lib/markets/market-form';
import { ContextHelp } from '@/components/ui/ContextHelp';

type TimelineMarket = Pick<Market, 'earlyEntryEnabled' | 'earlyEntryTime' | 'checkInTime' | 'operatingStartTime' | 'operatingEndTime'>;

interface MarketTodayTimelineProps {
  market: TimelineMarket;
  countdown?: string;
  defaultExpanded?: boolean;
  title?: string;
  onEdit?: () => void;
}

/** Planned times only; operating eligibility remains in the shared session model. */
export function MarketTodayTimeline({ market, countdown = '--', defaultExpanded = true, title = '今日時間軸', onEdit }: MarketTodayTimelineProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rows = [
    ...(market.earlyEntryEnabled && market.earlyEntryTime ? [{ label: '提前進場', time: market.earlyEntryTime, icon: DoorOpen }] : []),
    ...(market.checkInTime ? [{ label: '報到', time: market.checkInTime, icon: ClipboardCheck }] : []),
    ...(market.operatingStartTime ? [{ label: '開始營業', time: market.operatingStartTime, icon: Store }] : []),
    ...(market.operatingEndTime ? [{ label: '結束營業', time: market.operatingEndTime, icon: Moon }] : []),
  ];
  const operatingTime = formatClockTimeRange(market.operatingStartTime, market.operatingEndTime);

  return (
    <section className="mx-auto mb-4 max-w-3xl rounded-card bg-atelier-paper p-4 shadow-atelier" aria-label={title}>
      <div className="flex items-start gap-2">
        <h2 className="min-w-0 flex-1 text-base font-semibold text-atelier-ink">
          <button
            type="button"
            onClick={() => setExpanded(current => !current)}
            className="flex min-h-11 w-full items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={expanded}
            aria-controls="owner-market-timeline-panel"
          >
            <Clock3 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 flex-1">{title}</span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-atelier-muted transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
        </h2>
        <ContextHelp label="營業時段規則" iconOnly>
          <p>系統會在正式營業時間自動開啟現場工具；原定結束後保留 60 分鐘延長記錄，之後自動收起。</p>
          <p>關閉今日現場操作不會提前結束整場多日市集；整場狀態仍依市集日期與管理設定保留。</p>
        </ContextHelp>
      </div>
      {!expanded && operatingTime && <p className="ml-7 text-sm tabular-nums text-atelier-muted">{operatingTime}</p>}
      {countdown !== '--' && countdown !== '已開始' && (
        <p className="mt-2 rounded-control bg-atelier-sage-soft px-3 py-2 text-sm font-semibold text-primary">{countdown}</p>
      )}
      <div id="owner-market-timeline-panel" hidden={!expanded} className="mt-3 space-y-3">
        {rows.length > 0 ? (
          <ol className="space-y-2">
            {rows.map(({ label, time, icon: Icon }) => (
              <li key={label} className="flex min-h-14 items-center gap-3 rounded-control bg-atelier-canvas px-3 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm text-atelier-ink">{label}</span>
                <span className="shrink-0 text-base font-semibold tabular-nums text-primary">{formatClockTime(time)}</span>
              </li>
            ))}
          </ol>
        ) : <p className="text-sm text-atelier-muted">尚未設定時間資訊</p>}
        {market.operatingStartTime && market.operatingEndTime && (
          <dl className="grid grid-cols-2 gap-3 rounded-control bg-atelier-blue-soft/55 p-3 text-sm">
            <div><dt className="text-xs text-atelier-muted">營業時長</dt><dd className="mt-1 font-semibold">{calculateMarketDurationLabel(market.operatingStartTime, market.operatingEndTime)}</dd></div>
            <div><dt className="text-xs text-atelier-muted">含報到總時長</dt><dd className="mt-1 font-semibold">{calculateMarketDurationLabel(market.checkInTime, market.operatingEndTime)}</dd></div>
          </dl>
        )}
        {onEdit && <button type="button" onClick={onEdit} className="min-h-11 rounded-control px-3 text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{rows.length ? '修改時間' : '設定時間'}</button>}
      </div>
    </section>
  );
}
