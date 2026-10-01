import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { isInternalTestSurfaceAvailable } from '@/lib/deployment/internal-test-surface';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function DebugLayout({ children }: { children: ReactNode }) {
  if (!isInternalTestSurfaceAvailable()) notFound();
  return children;
}
