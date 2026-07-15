'use client';

import {
  Loader2,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useProducts } from '@/lib/db/hooks';
import type { SalesPaymentMethod } from '@/lib/sales/payment-methods';
import {
  recordDealWithOptionalSalesPhotoEvidence,
  type SalesPhotoEvidenceRuntimeResultHandler,
  type SalesPhotoEvidenceTransactionContext,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import type { Product } from '@/types/db';
import { PaymentMethodSelector } from './PaymentMethodSelector';

interface QuickTransactionGridProps {
  marketId: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  embedded?: boolean;
  paymentMethod?: SalesPaymentMethod;
  onPaymentMethodChange?: (value: SalesPaymentMethod) => void;
  salesPhotoEvidenceContext?: SalesPhotoEvidenceTransactionContext;
  onSalesPhotoEvidenceResult?: SalesPhotoEvidenceRuntimeResultHandler;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export function QuickTransactionGrid({
  marketId,
  isExpanded = true,
  onToggle,
  embedded = false,
  paymentMethod,
  onPaymentMethodChange,
  salesPhotoEvidenceContext,
  onSalesPhotoEvidenceResult,
}: QuickTransactionGridProps) {
  const products = useProducts({ isActive: true });
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [localPaymentMethod, setLocalPaymentMethod] = useState<SalesPaymentMethod>('cash');
  const selectedPaymentMethod = paymentMethod ?? localPaymentMethod;

  const totalAmount = useMemo(() => {
    let total = 0;
    cart.forEach(item => {
      total += item.product.price * item.quantity;
    });
    return total;
  }, [cart]);

  const changePaymentMethod = (next: SalesPaymentMethod) => {
    if (onPaymentMethodChange) onPaymentMethodChange(next);
    else setLocalPaymentMethod(next);
  };

  const addToCart = (product: Product) => {
    if (!product.id) return;
    setCart(previous => {
      const next = new Map(previous);
      const existing = next.get(product.id!);
      next.set(product.id!, {
        product,
        quantity: (existing?.quantity ?? 0) + 1,
      });
      return next;
    });
  };

  const changeQuantity = (productId: string, delta: number) => {
    setCart(previous => {
      const next = new Map(previous);
      const existing = next.get(productId);
      if (!existing) return previous;

      const quantity = existing.quantity + delta;
      if (quantity <= 0) next.delete(productId);
      else next.set(productId, { ...existing, quantity });
      return next;
    });
  };

  const handleCheckout = async () => {
    if (cart.size === 0 || isProcessing) return;
    setIsProcessing(true);

    let result;
    try {
      const submittedAt = new Date().toISOString();
      result = await recordDealWithOptionalSalesPhotoEvidence({
        marketId,
        items: Array.from(cart.values()).map(item => ({
          productId: item.product.id!,
          quantity: item.quantity,
          price: item.product.price,
        })),
        totalAmount,
        paymentMethod: selectedPaymentMethod,
      }, undefined, {
        evidenceContext: salesPhotoEvidenceContext
          ? {
              ...salesPhotoEvidenceContext,
              marketId,
              saleCompletedAt: submittedAt,
              now: submittedAt,
            }
          : undefined,
      });
    } catch (error) {
      console.error('記錄商品交易失敗：', error);
      toast.error('記錄失敗，資料已保留在本機等待同步');
      setIsProcessing(false);
      return;
    }

    setCart(new Map());
    window.dispatchEvent(new CustomEvent('deal-closed', {
      detail: { marketId, amount: totalAmount, paymentMethod: selectedPaymentMethod },
    }));

    try {
      if (onSalesPhotoEvidenceResult) await onSalesPhotoEvidenceResult(result);
      else toast.success('成交完成', { description: `NT$${totalAmount.toLocaleString()}` });
    } catch (error) {
      console.error('開啟成交照片流程失敗：', error);
      toast.warning('交易已完成，請從待補照片補上紀錄');
    } finally {
      setIsProcessing(false);
    }
  };

  const content = (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">點選商品加入本次交易</p>
        <Link href="/products" className="text-sm font-medium text-primary hover:underline">
          管理商品
        </Link>
      </div>

      {products && products.length > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {products.map(product => {
            const quantity = product.id ? cart.get(product.id)?.quantity ?? 0 : 0;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                disabled={isProcessing}
                className={`relative min-h-24 rounded-lg border p-3 text-left transition-colors active:scale-[0.98] disabled:opacity-50 ${
                  quantity > 0
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-white hover:bg-background'
                }`}
              >
                {quantity > 0 && (
                  <span className="absolute right-2 top-2 min-w-6 rounded-full bg-primary px-1.5 py-0.5 text-center text-xs font-medium text-white">
                    {quantity}
                  </span>
                )}
                <Package className="mb-2 h-5 w-5 text-primary" />
                <span className="block truncate text-sm font-medium text-foreground">{product.name}</span>
                <span className="mt-1 block text-sm tabular-nums text-muted-foreground">
                  NT${product.price.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mb-5 rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <Package className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">尚未建立可銷售商品</p>
          <Link href="/products" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
            前往新增商品
          </Link>
        </div>
      )}

      {cart.size > 0 && (
        <div className="mb-5 border-t border-border pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">本次商品</h3>
            <button
              type="button"
              onClick={() => setCart(new Map())}
              disabled={isProcessing}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-secondary hover:bg-secondary/10 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              清空
            </button>
          </div>

          <div className="space-y-2">
            {Array.from(cart.values()).map(item => (
              <div key={item.product.id} className="flex items-center justify-between gap-3 rounded-lg bg-background p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.product.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    NT${(item.product.price * item.quantity).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1" aria-label={`${item.product.name} 數量`}>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.product.id!, -1)}
                    disabled={isProcessing}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-foreground hover:bg-gray-50 disabled:opacity-50"
                    aria-label={`減少 ${item.product.name} 數量`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums text-foreground">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.product.id!, 1)}
                    disabled={isProcessing}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
                    aria-label={`增加 ${item.product.name} 數量`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between rounded-lg bg-background px-4 py-3">
        <span className="text-sm font-medium text-foreground">交易總額</span>
        <span className="text-xl font-medium tabular-nums text-primary">NT${totalAmount.toLocaleString()}</span>
      </div>

      <PaymentMethodSelector
        value={selectedPaymentMethod}
        onChange={changePaymentMethod}
        disabled={isProcessing}
      />

      <button
        type="button"
        onClick={() => void handleCheckout()}
        disabled={isProcessing || cart.size === 0}
        className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShoppingCart className="h-5 w-5" />}
        {isProcessing ? '正在記錄交易' : `完成交易 NT$${totalAmount.toLocaleString()}`}
      </button>
    </div>
  );

  if (embedded) return content;

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-border bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
          <ShoppingCart className="h-5 w-5 text-primary" />
          商品銷售
        </h2>
        {onToggle && (
          <button
            type="button"
            role="switch"
            aria-checked={isExpanded}
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isExpanded ? 'bg-primary' : 'bg-gray-300'}`}
            aria-label="切換商品銷售區塊"
          >
            <span className={`h-4 w-4 rounded-full bg-white transition-transform ${isExpanded ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        )}
      </div>
      {isExpanded && <div className="p-5">{content}</div>}
    </section>
  );
}
