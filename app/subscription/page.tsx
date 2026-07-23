'use client';

import { ArrowLeft, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { PricingCard } from '@/components/subscription/PricingCard';
import {
  PLAN_PREVIEWS,
  SUBSCRIPTION_PRESENTATION,
} from '@/lib/subscription/subscription-presentation';

export default function SubscriptionPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-atelier-canvas">
      <header className="japanese-warm-header px-5 pb-8 pt-[calc(1.25rem+env(safe-area-inset-top))] text-white">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-control transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="mt-5 text-2xl font-semibold text-white">{SUBSCRIPTION_PRESENTATION.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
            {SUBSCRIPTION_PRESENTATION.description}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-7 sm:px-6">
        <section className="flex items-start gap-3 border-y border-atelier-line bg-atelier-paper px-4 py-4 sm:rounded-card sm:border">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">目前狀態</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {SUBSCRIPTION_PRESENTATION.notice}
            </p>
          </div>
        </section>

        <section className="mt-7 grid gap-4 md:grid-cols-3" aria-label="未來方案預覽">
          {PLAN_PREVIEWS.map(plan => <PricingCard key={plan.id} plan={plan} />)}
        </section>
      </main>
    </div>
  );
}
