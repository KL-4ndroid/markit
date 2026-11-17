import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';

interface MarketSaleReceiptProps {
  amount: number;
  paymentLabel: string;
  totalRevenue: number;
  onReview: () => void;
}

export function MarketSaleReceipt({ amount, paymentLabel, totalRevenue, onReview }: MarketSaleReceiptProps) {
  return (
    <section aria-label="成交回饋" className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-atelier-paper p-4">
      <div role="status" aria-atomic="true">
        <p className="font-semibold">已記錄 {formatCurrency(amount)} · {paymentLabel}</p>
        <p className="mt-1 text-sm text-muted-foreground">本場累計收入 {formatCurrency(totalRevenue)}</p>
      </div>
      <Button variant="secondary" onClick={onReview}>查看回顧</Button>
    </section>
  );
}
