import type { MarketPaymentReminder } from '@/lib/markets/market-payment-deadline';

/** Same deadline urgency gets the same presentation in lists and market details. */
export function marketPaymentReminderClasses(kind: MarketPaymentReminder['kind']): string {
  if (kind === 'overdue') return 'border-status-danger-border bg-status-danger-bg text-status-danger-text';
  if (kind === 'today' || kind === 'soon') return 'border-status-warn-border bg-status-warn-bg text-status-warn-text';
  return 'border-atelier-line bg-atelier-paper text-foreground';
}
