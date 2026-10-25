'use client';

import { useEffect, useState } from 'react';
import { getMarketPaymentReminder } from '@/lib/markets/market-payment-deadline';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';
import type { Market } from '@/types/db';

export function MarketPaymentDeadlineNotice({ market }: { market: Market }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setInterval(update, 60_000);
    const unsubscribe = getLifecyclePort().subscribe(state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); unsubscribe(); };
  }, []);
  const reminder = getMarketPaymentReminder(market, now);
  if (!reminder) return null;
  return (
    <div className={`mb-4 rounded-card border p-4 text-sm ${reminder.kind === 'overdue'
      ? 'border-status-danger-border bg-status-danger-bg text-status-danger-text'
      : 'border-primary/10 bg-atelier-paper text-foreground'}`}>
      <p className="font-semibold">{reminder.label}</p>
      {reminder.deadlineLabel ? <p className="mt-1 break-words">{reminder.deadlineLabel}</p> : null}
      <p className="mt-1 text-xs leading-5">請依主辦資訊處理，繳費後更新為「已繳費」；期限不會自動更改報名狀態。</p>
    </div>
  );
}
