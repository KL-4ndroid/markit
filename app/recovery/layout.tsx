import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { TEST_TOOLS_ENABLED } from '@/lib/app/build-profile';

export default function RecoveryLayout({ children }: { children: ReactNode }) {
  if (!TEST_TOOLS_ENABLED) notFound();
  return children;
}
