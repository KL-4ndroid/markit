'use client';

import { useEffect, useState } from 'react';
import { getMarketPaymentReminder } from '@/lib/markets/market-payment-deadline';
import { getLifecyclePort } from '@/lib/platform/lifecycle-capability';
import type { Market } from '@/types/db';
import { marketPaymentReminderClasses } from '@/lib/presentation/market-payment-reminder';

export function MarketPaymentDeadlineNotice({ market, compact = false }: { market: Market; compact?: boolean }) {
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
    <div className={`${compact ? 'mt-3 rounded-xl border p-3' : 'mb-4 rounded-card border p-4'} text-sm ${marketPaymentReminderClasses(reminder.kind)}`}>
      <p className="font-semibold">{reminder.label}</p>
      {reminder.deadlineLabel ? <p className="mt-1 break-words">{reminder.deadlineLabel}</p> : null}
      {!compact && <p className="mt-1 text-xs leading-5">請依主辦資訊處理，繳費後更新為「已繳費」；期限不會自動更改報名狀態。</p>}
    </div>
  );
}
