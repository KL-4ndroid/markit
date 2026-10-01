import { Suspense } from 'react';

import { ProductDetailQueryScreen } from '@/components/products/ProductDetailQueryScreen';
import { DetailPageSkeleton } from '@/components/ui/DetailPageSkeleton';

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<DetailPageSkeleton stats={2} sections={2} />}>
      <ProductDetailQueryScreen />
    </Suspense>
  );
}
