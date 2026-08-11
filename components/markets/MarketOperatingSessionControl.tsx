'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Clock3, Moon, Play, Store } from 'lucide-react';
import type { MarketOperatingSession } from '@/lib/markets/market-operating-session';

interface MarketOperatingSessionControlProps {
  session: MarketOperatingSession;
  canManage: boolean;
  isUpdating?: boolean;
  onStartEarly: () => Promise<void> | void;
  onCloseToday: () => Promise<void> | void;
}

const VISIBLE_PHASES = new Set<MarketOperatingSession['phase']>([
  'early-window',
  'early-operating',
  'operating',
  'extended',
  'closed',
]);

export function MarketOperatingSessionControl({
  session,
  canManage,
  isUpdating = false,
  onStartEarly,
  onCloseToday,
}: MarketOperatingSessionControlProps) {
  const [confirmingClose, setConfirmingClose] = useState(false);

  useEffect(() => {
    if (!session.canCloseToday) setConfirmingClose(false);
  }, [session.canCloseToday]);

  if (!VISIBLE_PHASES.has(session.phase)) return null;

  const StatusIcon = session.phase === 'closed'
    ? Moon
    : session.canRecordLiveActivity
      ? Store
      : Clock3;
  const isWarning = session.phase === 'extended' || session.phase === 'early-window';

  return (
    <section
      className={`mb-4 flex flex-col gap-3 rounded-card border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isWarning
          ? 'border-secondary/25 bg-atelier-apricot-soft/55'
          : session.phase === 'closed'
            ? 'border-border bg-muted/45'
            : 'border-primary/15 bg-atelier-sage-soft/55'
      }`}
      aria-label="今日營業狀態"
    >
      <div className="flex min-w-0 items-start gap-3">
        <StatusIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-atelier-ink">{session.label}</p>
          <p className="mt-0.5 text-xs leading-5 text-atelier-muted">{session.message}</p>
        </div>
      </div>

      {session.canStartEarly && canManage && (
        <button
          type="button"
          onClick={() => void onStartEarly()}
          disabled={isUpdating}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          提前開始營業
        </button>
      )}

      {session.canStartEarly && !canManage && (
        <div className="flex items-center gap-2 text-xs text-atelier-muted">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          請由管理者提前開始
        </div>
      )}

      {session.canCloseToday && canManage && !confirmingClose && (
        <button
          type="button"
          onClick={() => setConfirmingClose(true)}
          disabled={isUpdating}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-white px-4 text-sm font-semibold text-atelier-ink transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Moon className="h-4 w-4" aria-hidden="true" />
          今日收攤
        </button>
      )}

      {session.canCloseToday && canManage && confirmingClose && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="w-full text-xs text-atelier-muted sm:w-auto">收攤後將關閉今日現場操作。</span>
          <button
            type="button"
            onClick={() => setConfirmingClose(false)}
            disabled={isUpdating}
            className="min-h-11 rounded-md border border-border bg-white px-3 text-sm font-medium text-atelier-ink disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void onCloseToday()}
            disabled={isUpdating}
            className="min-h-11 rounded-md bg-destructive px-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
          >
            確認收攤
          </button>
        </div>
      )}
    </section>
  );
}
