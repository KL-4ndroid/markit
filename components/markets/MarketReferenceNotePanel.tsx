import { MapPin } from 'lucide-react';

interface MarketReferenceNotePanelProps {
  note?: string | null;
}

export function MarketReferenceNotePanel({ note }: MarketReferenceNotePanelProps) {
  const normalizedNote = note?.trim() ?? '';

  return (
    <section className="rounded-xl border border-primary/10 bg-white p-4 shadow-sm shadow-primary/10">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soft-yellow text-secondary">
          <MapPin className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-medium text-foreground">主辦／場地備註</h2>
            <span className="rounded-full bg-soft-yellow px-2 py-0.5 text-[11px] font-semibold text-secondary">
              固定資訊
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            整場市集共用的主辦規定、進場方式、停車資訊與場地限制。
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-background px-3 py-3">
        {normalizedNote ? (
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{normalizedNote}</p>
        ) : (
          <p className="text-sm text-muted-foreground">尚未填寫主辦／場地備註。</p>
        )}
      </div>
    </section>
  );
}
