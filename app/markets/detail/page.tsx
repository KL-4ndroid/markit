import { Suspense } from 'react';

import { MarketDetailScreen } from '@/components/markets/MarketDetailScreen';
import { DetailPageSkeleton } from '@/components/ui/DetailPageSkeleton';

export default function MarketDetailPage() {
  return (
    <Suspense fallback={<DetailPageSkeleton />}>
      <MarketDetailScreen />
    </Suspense>
  );
}
