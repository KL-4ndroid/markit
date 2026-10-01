import type { DealClosedPayload } from '@/types/db';

export type SalesPaymentMethod = DealClosedPayload['paymentMethod'];

export const SALES_PAYMENT_METHODS: readonly SalesPaymentMethod[] = [
  'cash',
  'mobile',
  'card',
  'other',
] as const;

export const SALES_PAYMENT_METHOD_LABELS: Record<SalesPaymentMethod, string> = {
  cash: '現金',
  mobile: '行動支付',
  card: '信用卡／轉帳',
  other: '其他',
};

export function isSalesPaymentMethod(value: unknown): value is SalesPaymentMethod {
  return typeof value === 'string' && SALES_PAYMENT_METHODS.includes(value as SalesPaymentMethod);
}

export function formatSalesPaymentMethod(value: unknown): string {
  return SALES_PAYMENT_METHOD_LABELS[isSalesPaymentMethod(value) ? value : 'other'];
}
