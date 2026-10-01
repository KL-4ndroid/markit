import { Suspense } from 'react';

import { MarketDetailScreen } from '@/components/markets/MarketDetailScreen';
import { MarketDetailLoadingShell } from '@/components/markets/MarketDetailLoadingShell';

export default function MarketDetailPage() {
  return (
    <Suspense fallback={<MarketDetailLoadingShell />}>
      <MarketDetailScreen />
    </Suspense>
  );
}
