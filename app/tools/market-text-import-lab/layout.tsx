import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { TEST_TOOLS_ENABLED } from '@/lib/app/build-profile';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MarketTextImportLabLayout({ children }: { children: ReactNode }) {
  if (!TEST_TOOLS_ENABLED) notFound();
  return children;
}
