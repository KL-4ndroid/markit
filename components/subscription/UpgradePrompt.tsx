'use client';

import { Info, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { CapabilityAccessBlockReason } from '@/lib/subscription/subscription-access';
import { getSubscriptionBlockedPresentation } from '@/lib/subscription/subscription-presentation';
import type { AccountPlanCode } from '@/lib/subscription/subscription-plans';

interface UpgradePromptProps {
  reason: CapabilityAccessBlockReason;
  requiredPlan?: AccountPlanCode;
  showClose?: boolean;
}

export function UpgradePrompt({
  reason,
  requiredPlan,
  showClose = true,
}: UpgradePromptProps) {
  const [isVisible, setIsVisible] = useState(true);
  const router = useRouter();
  const presentation = getSubscriptionBlockedPresentation(reason, requiredPlan);

  if (!isVisible) return null;

  return (
    <div className="border-y border-atelier-line bg-atelier-paper px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-start gap-3">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{presentation.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{presentation.description}</p>
          {presentation.showPlanPreviewLink && presentation.actionLabel && (
            <button
              type="button"
              onClick={() => router.push('/subscription')}
              className="mt-2 text-sm font-medium text-primary underline underline-offset-4"
            >
              {presentation.actionLabel}
            </button>
          )}
        </div>
        {showClose && (
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-atelier-canvas"
            aria-label="關閉"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
