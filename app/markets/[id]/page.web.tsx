import { redirect } from 'next/navigation';

import { buildMarketDetailHref } from '@/lib/navigation/market-detail-route';

interface LegacyMarketDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string | string[] }>;
}

export default async function LegacyMarketDetailPage({
  params,
  searchParams,
}: LegacyMarketDetailPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const task = Array.isArray(query.task) ? query.task[0] : query.task;

  redirect(buildMarketDetailHref(id, { task }));
}
