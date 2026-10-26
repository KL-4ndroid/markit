/** Metric help reuses the same accessible, mobile-sized explanation surface. */
'use client';

import type { ReactNode } from 'react';
import { ContextHelp } from '@/components/ui/ContextHelp';

interface MetricGuideProps {
  title: string;
  content: string;
  value: string;
  icon: ReactNode;
}

export function MetricGuide({ title, content, value, icon }: MetricGuideProps) {
  return <ContextHelp label={`${title}說明`} title={title} iconOnly>
    <div className="flex items-center gap-3"><span aria-hidden="true">{icon}</span><p>{content}</p></div>
    <section><h3 className="mb-2 font-semibold">如何運用</h3><p>{value}</p></section>
  </ContextHelp>;
}
