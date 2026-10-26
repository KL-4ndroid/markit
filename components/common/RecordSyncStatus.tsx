'use client';

import { AlertCircle, CheckCircle2, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { AppDialog } from '@/components/ui/AppDialog';
import { getSyncPresentation, type SyncPresentationInput } from '@/lib/sync/sync-presentation';

interface RecordSyncStatusProps extends SyncPresentationInput {
  tone?: 'inverse' | 'default';
  requestLocked?: boolean;
  onSync: () => void;
}

/** Event-sync state only; drafts and photo delivery have separate contracts. */
export function RecordSyncStatus({ tone = 'inverse', requestLocked = false, onSync, ...state }: RecordSyncStatusProps) {
  const [open, setOpen] = useState(false);
  const presentation = getSyncPresentation(state);
  const Icon = presentation.kind === 'syncing' ? RefreshCw
    : presentation.kind === 'offline' ? CloudOff
    : presentation.kind === 'error' ? AlertCircle
    : presentation.kind === 'synced' ? CheckCircle2 : Cloud;
  const buttonClasses = tone === 'inverse'
    ? 'bg-white/10 text-white hover:bg-white/15 focus-visible:ring-white/60'
    : `${presentation.tone} border border-atelier-line hover:opacity-80 focus-visible:ring-primary/30`;
  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={presentation.accessibleLabel}
      aria-haspopup="dialog" aria-expanded={open}
      className={`inline-flex min-h-11 min-w-11 shrink-0 items-center gap-1.5 rounded-control px-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 ${buttonClasses}`}>
      <Icon className={`h-4 w-4 shrink-0 ${presentation.kind === 'syncing' ? 'animate-spin' : ''}`} aria-hidden="true" />
      <span>{presentation.label}</span>
      {state.pendingCount > 0 && presentation.kind !== 'pending' && <span className="rounded-md bg-current/10 px-1 text-[11px]">{state.pendingCount > 9 ? '9+' : state.pendingCount} 筆</span>}
    </button>
    <AppDialog open={open} onClose={() => setOpen(false)} title="紀錄同步狀態" presentation="sheet"
      footer={<>
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-control border border-primary/20 px-4 text-sm text-foreground">關閉</button>
        <button type="button" onClick={onSync} disabled={!presentation.canSync || requestLocked}
          className="min-h-11 rounded-control bg-primary px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50">{presentation.actionLabel}</button>
      </>}>
      <div className="space-y-4 text-sm leading-6">
        <div role="status" aria-live="polite" aria-atomic="true" className="space-y-2">
          <p className="font-medium">{presentation.label}</p>
          <p>{presentation.detail}</p>
        </div>
        {state.error && presentation.kind === 'error' && <p role="alert" className="rounded-xl bg-status-danger-bg p-3 text-danger">{state.error}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-muted-foreground">
          <dt>上次完成同步</dt><dd>{presentation.lastSyncLabel}</dd>
          <dt>待同步紀錄</dt><dd>{state.pendingCount} 筆</dd>
        </dl>
        <p className="border-t border-primary/10 pt-3 text-xs text-muted-foreground">此處顯示市集、商品與成交等紀錄的同步狀態。心得、現金草稿與照片是否送達，請查看各功能中的狀態。</p>
      </div>
    </AppDialog>
  </>;
}
