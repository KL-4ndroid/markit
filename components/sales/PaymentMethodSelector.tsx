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
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-atelier-ink">支付方式</legend>
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
            className={`flex min-h-12 items-center justify-center gap-2 rounded-control px-2 py-2 text-xs font-medium transition-[transform,box-shadow,background-color] duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
              selected
                ? 'bg-primary text-white shadow-atelier-key'
                : 'bg-atelier-canvas text-atelier-muted shadow-sm hover:bg-atelier-sage-soft hover:text-atelier-ink active:translate-y-0.5'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{SALES_PAYMENT_METHOD_LABELS[method]}</span>
          </button>
        );
      })}
      </div>
    </fieldset>
  );
}
