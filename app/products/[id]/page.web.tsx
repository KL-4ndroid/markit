import { redirect } from 'next/navigation';

import { buildProductDetailHref } from '@/lib/navigation/product-detail-route';

interface LegacyProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyProductDetailPage({
  params,
}: LegacyProductDetailPageProps) {
  const { id } = await params;

  redirect(buildProductDetailHref(id));
}
