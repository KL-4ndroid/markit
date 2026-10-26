import { CheckCircle2, CloudOff, Loader2, AlertCircle } from 'lucide-react';
import { getInitialSyncPresentation, type InitialSyncPresentationInput } from '@/lib/sync/initial-sync-presentation';

export function InitialSyncContent({ input, error }: { input: InitialSyncPresentationInput; error?: string | null }) {
  const view = getInitialSyncPresentation(input);
  const Icon = view.succeeded ? CheckCircle2 : view.offline ? CloudOff : view.failed ? AlertCircle : Loader2;
  return <div className="space-y-4 text-sm leading-6">
    <div role="status" aria-live="polite" aria-atomic="true" className="flex items-start gap-3">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${view.failed ? 'text-danger' : 'text-primary'} ${!view.failed && !view.offline && !view.succeeded ? 'animate-spin' : ''}`} aria-hidden="true" />
      <p>{view.description}</p>
    </div>
    {view.progress && <div>
      <div role="progressbar" aria-label="目前同步步驟" aria-valuemin={0} aria-valuemax={view.progress.total} aria-valuenow={view.progress.current}
        className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{width:`${view.progress.percentage}%`}} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">目前步驟：{view.progress.current} / {view.progress.total}</p>
    </div>}
    {error && view.failed && <p role="alert" className="rounded-xl bg-status-danger-bg p-3 text-danger">{error}</p>}
    {view.hint && <p className="text-xs text-muted-foreground">{view.hint}</p>}
  </div>;
}
