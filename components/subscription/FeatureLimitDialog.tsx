'use client';

import { Info, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

import type { CapabilityAccessBlockReason } from '@/lib/subscription/subscription-access';
import { getSubscriptionBlockedPresentation } from '@/lib/subscription/subscription-presentation';
import type { AccountPlanCode } from '@/lib/subscription/subscription-plans';

interface FeatureLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reason: CapabilityAccessBlockReason;
  requiredPlan?: AccountPlanCode;
}

export function FeatureLimitDialog({
  isOpen,
  onClose,
  reason,
  requiredPlan,
}: FeatureLimitDialogProps) {
  const router = useRouter();
  const presentation = getSubscriptionBlockedPresentation(reason, requiredPlan);

  if (!isOpen) return null;

  const openPlanPreview = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/45"
        onClick={onClose}
        aria-label="關閉功能說明"
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="feature-limit-title"
          className="pointer-events-auto w-full max-w-md rounded-card border border-atelier-line bg-atelier-paper p-6 shadow-atelier"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-atelier-blue-soft text-atelier-blue">
              <Info className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="feature-limit-title" className="text-base font-semibold text-foreground">
                {presentation.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {presentation.description}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-atelier-canvas"
              aria-label="關閉"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-control border border-atelier-line px-4 text-sm font-medium text-foreground"
            >
              關閉
            </button>
            {presentation.showPlanPreviewLink && presentation.actionLabel && (
              <button
                type="button"
                onClick={openPlanPreview}
                className="min-h-11 rounded-control bg-primary px-4 text-sm font-medium text-white"
              >
                {presentation.actionLabel}
              </button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
