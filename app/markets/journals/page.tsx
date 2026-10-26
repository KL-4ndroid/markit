'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MarketJournalWorkspace } from '@/components/markets/MarketJournalWorkspace';
import { marketJournalsEnabled } from '@/lib/markets/market-journal';
import { resolveMarketJournalsReturn } from '@/lib/navigation/market-detail-route';

export default function MarketJournalsPage() {
  return <Suspense fallback={<Link href="/markets" className="inline-flex min-h-11 items-center px-4 text-sm">返回市集</Link>}><JournalCollection /></Suspense>;
}

function JournalCollection() {
  const params = useSearchParams();
  const back = resolveMarketJournalsReturn(params.get('fromMarket'), params.get('marketReturnTo'));
  return <div className="mx-auto min-h-screen max-w-5xl px-4 pb-24 pt-6 sm:px-6">
    <Link href={back.href} replace className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{back.label}</Link>
    <h1 className="mt-3 text-2xl font-semibold">出攤心得</h1>
    <p className="mt-2 text-sm text-muted-foreground">把每一場的感受留給下次出攤的自己。</p>
    {marketJournalsEnabled() ? <MarketJournalWorkspace /> : <p className="mt-6 text-sm text-muted-foreground">出攤心得尚未開放。</p>}
  </div>;
}
