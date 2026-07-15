'use client';

import { Banknote, CreditCard, MoreHorizontal, Smartphone } from 'lucide-react';

import {
  SALES_PAYMENT_METHODS,
  SALES_PAYMENT_METHOD_LABELS,
  type SalesPaymentMethod,
} from '@/lib/sales/payment-methods';

interface PaymentMethodSelectorProps {
  value: SalesPaymentMethod;
  onChange: (value: SalesPaymentMethod) => void;
  disabled?: boolean;
}

const ICONS = {
  cash: Banknote,
  mobile: Smartphone,
  card: CreditCard,
  other: MoreHorizontal,
} satisfies Record<SalesPaymentMethod, typeof Banknote>;

export function PaymentMethodSelector({
  value,
  onChange,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="支付方式">
      {SALES_PAYMENT_METHODS.map(method => {
        const Icon = ICONS[method];
        const selected = value === method;
        return (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(method)}
            disabled={disabled}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-white text-muted-foreground hover:bg-background hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{SALES_PAYMENT_METHOD_LABELS[method]}</span>
          </button>
        );
      })}
    </div>
  );
}
