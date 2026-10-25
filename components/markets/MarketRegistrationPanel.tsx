import { marketRegistrationPresentation } from '@/lib/markets/market-registration-presentation';
import type { Market } from '@/types/db';

const options = [
  ['registered', '等待錄取'], ['accepted', '已錄取'],
  ['paid', '已繳費'], ['ongoing', '如期舉行'], ['postponed', '已延期'], ['cancelled', '已取消'],
] as const;

export function MarketRegistrationPanel({ status, onChange, busy = false }: {
  status: Market['status']; onChange: (status: Market['status']) => void; busy?: boolean;
}) {
  const record = marketRegistrationPresentation(status);
  return <section className="mx-auto mb-4 max-w-3xl rounded-3xl border border-border bg-white p-4 sm:p-5" aria-label="報名與繳費">
    <h2 className="text-lg font-semibold">報名與繳費</h2>
    <p className="mt-3 text-base font-semibold text-foreground">{record.label}</p>
    <p className="mt-1 text-sm leading-6 text-muted-foreground">{record.note}</p>
    {record.nextStatus && <button type="button" disabled={busy} onClick={() => onChange(record.nextStatus)} className="mt-4 min-h-12 w-full rounded-2xl bg-primary px-4 font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto">{busy ? '更新中…' : record.action}</button>}
    <details className="mt-3 border-t border-border">
      <summary className="min-h-11 cursor-pointer rounded-xl py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">更正／其他狀態</summary>
      <p className="mb-2 text-sm leading-6 text-muted-foreground">只更新你選擇的狀態，營業紀錄不會因此補登。</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map(([value, label]) => <button key={value} type="button" disabled={busy || value === status} aria-pressed={value === status} onClick={() => onChange(value)} className="min-h-11 rounded-xl border border-border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:bg-background disabled:text-muted-foreground">{label}{value === status ? '（目前）' : ''}</button>)}
      </div>
    </details>
  </section>;
}
