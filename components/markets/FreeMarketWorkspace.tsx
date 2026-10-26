'use client';

import { useState } from 'react';
import type { Market, MarketStatus } from '@/types/db';
import type { MarketOperatingSession } from '@/lib/markets/market-operating-session';
import { MarketRegistrationPanel } from './MarketRegistrationPanel';
import { MarketPaymentDeadlineNotice } from './MarketPaymentDeadlineNotice';
import { MarketTodayTimeline } from './MarketTodayTimeline';
import { MarketFieldOpsSection } from './MarketFieldOpsSection';
import { MarketJournalWorkspace } from './MarketJournalWorkspace';
import { MarketOperatingSessionControl } from './MarketOperatingSessionControl';
import { marketFeeDisplayRows } from '@/lib/subscription/ui-presentation';
import { formatCurrency } from '@/lib/utils';

export function FreeMarketWorkspace({ market, returnTo, busy, onStatus, onEdit, onDelete, onSkip, onRestore, session, onStart, onClose, canManageFieldOps, initialView = 'arrangement' } : {
  market: Market; returnTo?: string | null; busy: boolean;
  onStatus: (status: MarketStatus) => void; onEdit: () => void; onDelete: () => void; onSkip: () => Promise<void>; onRestore: () => Promise<void>;
  canManageFieldOps: boolean; initialView?: 'arrangement' | 'journal';
  session: MarketOperatingSession | null; onStart: () => Promise<void> | void; onClose: () => Promise<void> | void;
}) {
  const [view, setView] = useState<'arrangement' | 'journal'>(initialView);
  return <div className="space-y-4 pt-4">
    <div className="flex gap-2" role="group" aria-label="市集資料">
      {(['arrangement','journal'] as const).map(v => <button key={v} type="button" aria-pressed={view === v} aria-controls="free-market-panel" id={`free-market-${v}`} onClick={() => setView(v)}
        className={`min-h-12 flex-1 rounded-xl px-4 font-medium ${view === v ? 'bg-primary text-white' : 'bg-atelier-paper'}`}>{v === 'arrangement' ? '安排與準備' : '出攤心得'}</button>)}
    </div>
    <section id="free-market-panel" aria-label={view === 'arrangement' ? '安排與準備' : '出攤心得'}>
      {view === 'journal' ? <MarketJournalWorkspace marketId={market.id!} returnTo={returnTo} /> : <div className="space-y-4">
        <MarketRegistrationPanel status={market.status} busy={busy} onChange={onStatus}
          readOnly={market.sessionOrigin === 'schedule'} ended={session?.workspacePhase === 'ended'}>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
            {marketFeeDisplayRows(market).map(row => <div key={row.label}><dt className="text-muted-foreground">{row.label}</dt><dd className="mt-1 font-semibold tabular-nums">{formatCurrency(row.value)}</dd></div>)}
          </dl>
          <MarketPaymentDeadlineNotice market={market} compact />
        </MarketRegistrationPanel>
        {session && <MarketOperatingSessionControl session={session} canManage isUpdating={busy} showCloseAction
          description={session.phase === 'closed' ? '今天已結束，可到出攤心得記下本場感想。' : undefined}
          onStartEarly={onStart} onCloseToday={onClose} />}
        <MarketTodayTimeline title="本場時間" market={market} onEdit={onEdit} />
        <MarketFieldOpsSection marketId={market.id!} referenceNote={market.notes} collaborationEnabled={false} canManageFieldNotes={false} canManageChecklist={canManageFieldOps} canToggleChecklistItem={canManageFieldOps} readOnlyReason={!canManageFieldOps ? '此場次的準備待辦已封存為唯讀紀錄。' : undefined} />
        {market.sessionOrigin === 'schedule' && market.scheduleOccurrenceState === 'skipped' && <button type="button" disabled={busy} onClick={() => void onRestore()} className="min-h-11 rounded-xl border px-4">恢復這一次</button>}
        {market.sessionOrigin === 'schedule' && market.scheduleOccurrenceState === 'scheduled' && market.status === 'registered' && <button type="button" disabled={busy} onClick={() => void onSkip()} className="min-h-11 rounded-xl border px-4">略過這一次</button>}
        {market.sessionOrigin !== 'schedule' && market.status !== 'cancelled' && market.status !== 'completed' && <button type="button" disabled={busy} onClick={onDelete} className="min-h-11 rounded-xl border px-4 text-danger">刪除市集紀錄</button>}
      </div>}
    </section>
  </div>;
}
