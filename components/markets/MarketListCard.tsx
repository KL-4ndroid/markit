import { CalendarDays, Clock, MapPin, StickyNote } from 'lucide-react';
import { useState } from 'react';

import { AppDialog } from '@/components/ui/AppDialog';
import { IconButton } from '@/components/ui/IconButton';
import {
  getMarketListProgressLabel,
  type MarketEquipmentSummaryItem,
  type MarketListViewItem,
} from '@/lib/markets/market-list-view-model';
import { formatClockTime, formatClockTimeRange, formatCurrency } from '@/lib/presentation/formatters';

function statusClasses(item: MarketListViewItem): string {
  if (item.stage === 'active') return 'bg-status-good-bg text-status-good-text ring-status-good-border';
  if (item.stage === 'cancelled') return 'bg-status-danger-bg text-status-danger-text ring-status-danger-border';
  if (item.stage !== 'preparing') return 'bg-muted text-muted-foreground ring-primary/10';
  if (item.market.sessionOrigin === 'schedule') return 'bg-atelier-blue-soft text-atelier-blue ring-primary/15';
  if (item.market.status === 'accepted') return 'bg-status-warn-bg text-status-warn-text ring-status-warn-border';
  if (item.market.status === 'paid' || item.market.status === 'ongoing') return 'bg-status-good-bg text-status-good-text ring-status-good-border';
  if (item.market.status === 'postponed') return 'bg-status-danger-bg text-status-danger-text ring-status-danger-border';
  return 'bg-atelier-blue-soft text-atelier-blue ring-primary/15';
}

function equipmentStatusLabel(equipment: MarketEquipmentSummaryItem): string {
  if (equipment.status === 'provided') return '免費';
  if (equipment.status === 'rental' && equipment.amount !== null) return formatCurrency(equipment.amount);
  return '自備';
}

interface MarketListCardProps {
  item: MarketListViewItem;
  isStaff: boolean;
  contextLabel?: string;
  isOpening?: boolean;
  onOpen: () => void;
}

export function MarketListCard({ item, isStaff, contextLabel, isOpening = false, onOpen }: MarketListCardProps) {
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const preparation = item.preparationSummary;
  const completion = item.completionSummary;
  const hasNotes = Boolean(item.market.notes?.trim());
  const operatingTime = preparation
    ? formatClockTimeRange(preparation.operatingStartTime, preparation.operatingEndTime)
    : '';
  const timeParts = preparation?.timeStatus === 'provided'
    ? [
        preparation.checkInTime ? `報到 ${formatClockTime(preparation.checkInTime)}` : '',
        operatingTime ? `營業 ${operatingTime}` : '',
      ].filter(Boolean)
    : [];
  const financeParts = preparation
    ? [
        preparation.estimatedExpense > 0 ? `預估支出 ${formatCurrency(preparation.estimatedExpense)}` : '',
        preparation.deposit > 0 ? `保證金 ${formatCurrency(preparation.deposit)}` : '',
      ].filter(Boolean)
    : [];
  const hasVisibleCompletion = Boolean(
    completion && (completion.totalDeals !== null || (!isStaff && completion.totalRevenue !== null)),
  );

  return (
    <>
      <article className="group relative rounded-card border border-primary/10 bg-atelier-paper p-4 shadow-atelier transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-atelier-lift sm:p-5 xl:px-5 xl:py-3">
        <button
          type="button"
          aria-label={`開啟「${item.market.name}」詳情`}
          aria-busy={isOpening}
          disabled={isOpening}
          onClick={onOpen}
          className="absolute inset-0 z-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait"
        />

        <div className="pointer-events-none relative z-10">
          <div className="xl:grid xl:grid-cols-[minmax(14rem,1.35fr)_minmax(10rem,.85fr)_minmax(10rem,1fr)_minmax(7rem,.65fr)] xl:items-center xl:gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-[13px] font-semibold ring-1 ${statusClasses(item)}`}>
                    {item.statusLabel}
                  </span>
                  {contextLabel ? (
                    <span className="inline-flex rounded-full bg-atelier-blue-soft px-2.5 py-1 text-xs font-medium text-atelier-blue">
                      {contextLabel}
                    </span>
                  ) : null}
                  {item.market.sessionOrigin === 'schedule' ? (
                    <span className="inline-flex rounded-full bg-atelier-paper px-2.5 py-1 text-xs font-medium text-atelier-muted ring-1 ring-primary/10">
                      固定
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-2 break-words text-base font-semibold text-foreground sm:text-lg">
                  {item.market.name}
                </h2>
              </div>

              <div className="pointer-events-auto flex shrink-0 items-center gap-2">
                {isOpening ? (
                  <span className="text-xs font-medium text-primary">開啟中…</span>
                ) : null}
                {hasNotes ? (
                  <IconButton
                    label="查看主辦／場地備註"
                    tooltip="查看主辦／場地備註"
                    icon={<StickyNote className="h-5 w-5" aria-hidden="true" />}
                    onClick={() => setIsNotesOpen(true)}
                    className="-mr-2 -mt-2 bg-soft-yellow/70 text-secondary hover:bg-soft-yellow"
                  />
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 xl:contents">
              <p className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{item.dateRangeLabel}</span>
              </p>
              <p className="flex min-w-0 items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{item.market.location || '尚未設定地點'}</span>
              </p>
            </div>

            <p className="mt-3 hidden text-sm font-medium text-foreground xl:block">
              {getMarketListProgressLabel(item)}
            </p>
          </div>

          {preparation ? (
            <div className="mt-4 space-y-2.5 border-t border-primary/10 pt-3 text-sm">
              {preparation.timeStatus === 'preset' ? (
                <div className="flex items-start gap-2 rounded-control bg-status-warn-bg px-3 py-2 text-status-warn-text">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">預設時段，請確認</p>
                    <p className="mt-0.5 text-foreground">報到 12:00 · 營業 13:00–19:00</p>
                  </div>
                </div>
              ) : preparation.timeStatus === 'missing' ? (
                <div className="flex items-center gap-2 rounded-control bg-status-warn-bg px-3 py-2 font-medium text-status-warn-text">
                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                  尚未設定報到與營業時間
                </div>
              ) : timeParts.length > 0 ? (
                <p className="flex items-center gap-2 text-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  {timeParts.join(' · ')}
                </p>
              ) : null}

              {!isStaff && financeParts.length > 0 ? (
                <p className="text-foreground">{financeParts.join(' · ')}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                {preparation.equipment.map(equipment => (
                  <span
                    key={equipment.id}
                    className="rounded-full border border-primary/10 bg-atelier-blue-soft/55 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {equipment.label} {equipmentStatusLabel(equipment)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {completion && hasVisibleCompletion ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-primary/10 pt-3 text-sm">
              {!isStaff && completion.totalRevenue !== null ? (
                <span className="rounded-full border border-primary/10 bg-atelier-blue-soft/55 px-3 py-1.5 font-medium text-foreground">
                  營收 {formatCurrency(completion.totalRevenue)}
                </span>
              ) : null}
              {!isStaff && completion.estimatedNetProfit !== null ? (
                <span className={`rounded-full border px-3 py-1.5 font-medium ${completion.estimatedNetProfit >= 0
                  ? 'border-status-good-border bg-status-good-bg text-status-good-text'
                  : 'border-status-danger-border bg-status-danger-bg text-status-danger-text'}`}>
                  估計淨利 {formatCurrency(completion.estimatedNetProfit)}
                </span>
              ) : null}
              {completion.totalDeals !== null ? (
                <span className="rounded-full border border-primary/10 bg-muted/55 px-3 py-1.5 font-medium text-foreground">
                  成交 {completion.totalDeals} 筆
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      <AppDialog
        open={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
        title="主辦／場地備註"
        description={item.market.name}
        size="sm"
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
          {item.market.notes?.trim()}
        </p>
      </AppDialog>
    </>
  );
}
