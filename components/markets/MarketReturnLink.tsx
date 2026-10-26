import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { resolveMarketDetailReturn } from '@/lib/navigation/market-detail-route';

export function MarketReturnLink({ returnTo }: { returnTo?: string | null }) {
  const target = resolveMarketDetailReturn(returnTo);
  return <Link href={target.href} replace aria-label={target.label} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-control bg-atelier-paper px-3 text-sm font-medium text-atelier-ink shadow-sm transition-colors hover:bg-atelier-blue-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
    <span>{target.label}</span>
  </Link>;
}
