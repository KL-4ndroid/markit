'use client';

import { Check, Clock3, Crown, Sparkles, Users, type LucideIcon } from 'lucide-react';

import {
  SUBSCRIPTION_PRESENTATION,
  type PlanPreview,
  type PlanType,
} from '@/lib/subscription/subscription-presentation';

export type { PlanType };

const PLAN_ICON: Record<PlanType, LucideIcon> = {
  free: Sparkles,
  pro: Crown,
  team: Users,
};

const PLAN_TONE: Record<PlanType, string> = {
  free: 'bg-atelier-blue-soft text-atelier-blue',
  pro: 'bg-atelier-sage-soft text-primary',
  team: 'bg-atelier-apricot-soft text-atelier-clay',
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
      <p className="mt-2 text-xs leading-5 text-muted-foreground">適合：{plan.audience}</p>

      <ul className="mt-5 space-y-3 border-t border-atelier-line pt-5">
        {plan.features.map(feature => (
          <li key={feature.code} className="flex items-start gap-2 text-sm text-foreground">
            {feature.status === 'coming_soon' ? (
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-atelier-clay" aria-hidden="true" />
            ) : (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            )}
            <span>
              {feature.label}
              {feature.status === 'coming_soon' && (
                <span className="ml-1 text-xs text-muted-foreground">（規劃中）</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={!plan.actionEnabled}
        className="mt-6 min-h-11 w-full rounded-control border border-atelier-line bg-atelier-canvas px-4 text-sm font-medium text-muted-foreground"
      >
        {plan.actionLabel || SUBSCRIPTION_PRESENTATION.actionLabel}
      </button>
    </article>
  );
}
