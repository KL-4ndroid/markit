import { Package } from 'lucide-react';

import type { BasicProductRankingResult } from '@/lib/analytics/basic-product-ranking';

interface BasicProductRankingCardProps {
  ranking: BasicProductRankingResult;
}

export function BasicProductRankingCard({ ranking }: BasicProductRankingCardProps) {
  return (
    <section className="rounded-card border border-primary/10 bg-white" aria-labelledby="basic-product-ranking-title">
      <div className="flex items-start justify-between gap-3 border-b border-primary/10 px-4 py-4">
        <div>
          <p className="text-xs font-medium text-primary">最近 3 場</p>
          <h2 id="basic-product-ranking-title" className="mt-1 text-base font-semibold text-foreground">銷量第一</h2>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-soft-green px-3 py-1 text-xs font-medium text-foreground">
          <Package className="h-3.5 w-3.5" aria-hidden="true" />
          Free 預覽
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 px-4 py-5">
        <p className="min-w-0 truncate text-base font-semibold text-foreground" title={ranking.productName}>
          {ranking.productName}
        </p>
        <p className="shrink-0 text-sm text-muted-foreground">
          <span className="text-lg font-semibold tabular-nums text-primary">{ranking.quantity}</span> 件
        </p>
      </div>
    </section>
  );
}
