'use client';

import { Building2, Check, Crown, Sparkles, type LucideIcon } from 'lucide-react';

import {
  SUBSCRIPTION_PRESENTATION,
  type PlanPreview,
  type PlanType,
} from '@/lib/subscription/subscription-presentation';

export type { PlanType };

const PLAN_ICON: Record<PlanType, LucideIcon> = {
  free: Sparkles,
  pro: Crown,
  enterprise: Building2,
};

const PLAN_TONE: Record<PlanType, string> = {
  free: 'bg-atelier-blue-soft text-atelier-blue',
  pro: 'bg-atelier-sage-soft text-primary',
  enterprise: 'bg-atelier-apricot-soft text-atelier-clay',
};

interface PricingCardProps {
  plan: PlanPreview;
}

export function PricingCard({ plan }: PricingCardProps) {
  const Icon = PLAN_ICON[plan.id];

  return (
    <article className="rounded-card border border-atelier-line bg-atelier-paper p-5 shadow-atelier">
      <span className={`flex h-11 w-11 items-center justify-center rounded-control ${PLAN_TONE[plan.id]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>

      <h2 className="mt-4 text-lg font-semibold text-foreground">{plan.name}</h2>
      <p className="mt-1 text-sm font-medium text-primary">{plan.priceLabel}</p>
      <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{plan.description}</p>

      <ul className="mt-5 space-y-3 border-t border-atelier-line pt-5">
        {plan.features.map(feature => (
          <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled
        className="mt-6 min-h-11 w-full rounded-control border border-atelier-line bg-atelier-canvas px-4 text-sm font-medium text-muted-foreground"
      >
        {SUBSCRIPTION_PRESENTATION.actionLabel}
      </button>
    </article>
  );
}
