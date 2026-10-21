'use client';

import { Search, X } from 'lucide-react';

interface MarketSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function MarketSearchField({ value, onChange }: MarketSearchFieldProps) {
  return (
    <div className="relative mt-4">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <input type="search" aria-label="搜尋市集名稱或地點" placeholder="搜尋市集名稱或地點" value={value} onChange={event => onChange(event.target.value)} className="min-h-12 w-full rounded-control border border-primary/20 bg-atelier-paper py-3 pl-10 pr-12 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none" />
      {value && <button type="button" aria-label="清除搜尋" onClick={() => onChange('')} className="absolute right-0 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-control text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"><X className="h-4 w-4" aria-hidden="true" /></button>}
    </div>
  );
}
