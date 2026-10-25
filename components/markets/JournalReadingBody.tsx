'use client';

import { useId, useState } from 'react';
import { journalExcerpt } from '@/lib/markets/journal-reading';

export function JournalReadingBody({ body, query = '' }: { body: string; query?: string }) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const excerpt = journalExcerpt(body, query);
  return <div>
    <p id={contentId} className="whitespace-pre-wrap break-words text-base leading-7 text-foreground">{expanded ? body : excerpt.text}</p>
    {excerpt.truncated && <button type="button" aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)} className="mt-1 min-h-11 rounded-xl px-1 text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      {expanded ? '收起全文' : '展開全文'}
    </button>}
  </div>;
}
