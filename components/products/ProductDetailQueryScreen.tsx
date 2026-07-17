'use client';

import { useSearchParams } from 'next/navigation';

import { ProductDetailScreen } from '@/components/products/ProductDetailScreen';
import { normalizeProductDetailId } from '@/lib/navigation/product-detail-route';

export function ProductDetailQueryScreen() {
  const searchParams = useSearchParams();
  const productId = normalizeProductDetailId(searchParams.get('id'));

  return <ProductDetailScreen productId={productId} />;
}
