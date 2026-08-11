'use client';

import { TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { InteractionButtons } from '@/components/sales/InteractionButtons';

interface OperatingInteractionPanelProps {
  marketId: string;
  canOpenSettings?: boolean;
  onInteractionRecorded?: () => void;
}

export function OperatingInteractionPanel({
  marketId,
  canOpenSettings = false,
  onInteractionRecorded,
}: OperatingInteractionPanelProps) {
  return (
    <section className="mb-4 lg:hidden" aria-labelledby="operating-interaction-title">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="operating-interaction-title"
            className="flex items-center gap-2 text-sm font-semibold text-atelier-ink"
          >
            <TrendingUp className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            記錄互動
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-atelier-muted">
            {canOpenSettings ? '按鈕名稱可自由設定' : '按鈕名稱由老闆設定'}
          </p>
        </div>
        {canOpenSettings && (
          <Link
            href="/settings/sales"
            className="inline-flex min-h-11 shrink-0 items-center text-xs font-semibold text-primary underline decoration-primary/35 underline-offset-4"
          >
            前往設定
          </Link>
        )}
      </div>
      <InteractionButtons
        marketId={marketId}
        onInteractionRecorded={onInteractionRecorded}
        variant="inline"
      />
    </section>
  );
}
