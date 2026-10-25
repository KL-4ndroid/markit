'use client';

import Link from 'next/link';
import { MarketJournalWorkspace } from '@/components/markets/MarketJournalWorkspace';
import { marketJournalsEnabled } from '@/lib/markets/market-journal';

export default function MarketJournalsPage() {
  return <main className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
    <Link href="/markets" className="inline-flex min-h-11 items-center text-sm text-primary">返回市集</Link>
    <h1 className="mt-3 text-2xl font-semibold">出攤心得</h1>
    <p className="mt-2 text-sm text-muted-foreground">把每一場的感受留給下次出攤的自己。</p>
    {marketJournalsEnabled() ? <MarketJournalWorkspace /> : <p className="mt-6 text-sm text-muted-foreground">出攤心得尚未開放。</p>}
  </main>;
}
