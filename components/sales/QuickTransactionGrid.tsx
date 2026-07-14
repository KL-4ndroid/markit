'use client';

import { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { useProducts } from '@/lib/db/hooks';
import {
  recordDealWithOptionalSalesPhotoEvidence,
  type SalesPhotoEvidenceRuntimeResultHandler,
  type SalesPhotoEvidenceTransactionContext,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import { toast } from 'sonner';
import type { Product } from '@/types/db';
import Link from 'next/link';

interface QuickTransactionGridProps {
  marketId: string;
  isExpanded?: boolean;  // ✅ 新增：是否展開
  onToggle?: () => void;  // ✅ 新增：切換展開/折疊的回調
  salesPhotoEvidenceContext?: SalesPhotoEvidenceTransactionContext;
  onSalesPhotoEvidenceResult?: SalesPhotoEvidenceRuntimeResultHandler;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'cash' | 'card' | 'mobile' | 'other';

/**
 * 快速交易網格組件
 * 一頁式購物車操作，點擊支付方式即可快速完成交易
 */
export function QuickTransactionGrid({
  marketId,
  isExpanded = true,
  onToggle,
  salesPhotoEvidenceContext,
  onSalesPhotoEvidenceResult,
}: QuickTransactionGridProps) {
  const products = useProducts({ isActive: true });
  const [showProducts, setShowProducts] = useState(true);  // ✅ 預設關閉顯示商品
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);

  // 分類樣式
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; emoji: string }> = {
      handmade: { bg: 'bg-background', emoji: '🧵' },
      food: { bg: 'bg-background', emoji: '🍪' },
      accessory: { bg: 'bg-background', emoji: '💎' },
      clothing: { bg: 'bg-background', emoji: '👕' },
      art: { bg: 'bg-background', emoji: '🎨' },
      stationery: { bg: 'bg-background', emoji: '📚' },
      other: { bg: 'bg-background', emoji: '📦' },
    };
    return styles[category] || styles.other;
  };

  // 計算總金額
  const totalAmount = useMemo(() => {
    let total = 0;
    cart.forEach((item) => {
      total += item.product.price * item.quantity;
    });
    return total;
  }, [cart]);

  // 添加商品到購物車
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const existing = newCart.get(product.id!);
      
      if (existing) {
        newCart.set(product.id!, {
          ...existing,
          quantity: existing.quantity + 1,
        });
      } else {
        newCart.set(product.id!, {
          product,
          quantity: 1,
        });
      }
      
      return newCart;
    });
  };

  // 減少商品數量
  const decreaseQuantity = (productId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const existing = newCart.get(productId);
      
      if (existing) {
        if (existing.quantity > 1) {
          newCart.set(productId, {
            ...existing,
            quantity: existing.quantity - 1,
          });
        } else {
          newCart.delete(productId);
        }
      }
      
      return newCart;
    });
  };

  // 增加商品數量
  const increaseQuantity = (productId: string) => {
    setCart((prev) => {
      const newCart = new Map(prev);
      const existing = newCart.get(productId);
      
      if (existing) {
        newCart.set(productId, {
          ...existing,
          quantity: existing.quantity + 1,
        });
      }
      
      return newCart;
    });
  };

  // 清空購物車
  const clearCart = () => {
    setCart(new Map());
  };

  // 處理支付（快速結帳）
  const handlePayment = async (paymentMethod: PaymentMethod) => {
    if (cart.size === 0) {
      toast.error('購物車是空的');
      return;
    }

    if (isProcessing) return;

    setIsProcessing(true);

    try {
      // 準備成交資料
      const items = Array.from(cart.values()).map((item) => ({
        productId: item.product.id!,
        quantity: item.quantity,
        price: item.product.price,
      }));

      // 記錄成交
      const submittedAt = new Date().toISOString();
      const result = await recordDealWithOptionalSalesPhotoEvidence({
        marketId,
        items,
        totalAmount,
        paymentMethod,
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
      await onSalesPhotoEvidenceResult?.(result);

      // 支付方式文字
      const paymentText = {
        cash: '現金',
        mobile: '電子支付',
        card: '轉帳',
        other: '其他',
      }[paymentMethod];

      // 成功提示
      toast.success(`🎉 交易完成！`, {
        description: `${paymentText} - NT$${totalAmount.toLocaleString()}`,
        duration: 2000,
      });

      // 清空購物車
      clearCart();
    } catch (error) {
      console.error('交易失敗：', error);
      toast.error('交易失敗，請稍後再試');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-primary/10 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
          <ShoppingCart className="w-5 h-5 text-primary" />
          商品銷售
        </h2>
        <div className="flex items-center gap-3">
          {isExpanded && (
            <>
              <Link
                href="/products"
                className="text-sm text-primary hover:underline font-medium"
              >
                管理商品
              </Link>
              
            </>
          )}
          {/* ✅ 折疊/展開開關 */}
          {onToggle && (
            <button
              onClick={onToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isExpanded ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isExpanded ? 'translate-x-6' : 'translate-x-1'
                }`}
              ></span>
            </button>
          )}
        </div>
      </div>

      {/* ✅ 只在展開時顯示內容 */}
      {isExpanded && (
        <>
          {/* 商品網格 */}
          {showProducts && (
            <>
              {products && products.length > 0 ? (
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {products.map((product) => {
                    const categoryStyle = getCategoryStyle(product.category);

                    return (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="bg-background hover:bg-primary/10 border-2 border-primary/15 rounded-[1.25rem] p-2 active:scale-95 transition-all"
                      >
                        <div className="text-3xl mb-1">{categoryStyle.emoji}</div>
                        <div className="text-xs font-medium mb-1 line-clamp-1 text-foreground">
                          {product.name}
                        </div>
                        <div className="text-xs text-primary font-medium">
                          ${product.price}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground mb-2">尚無商品</p>
                  <Link
                    href="/products"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    前往新增商品 →
                  </Link>
                </div>
              )}
            </>
          )}

          {/* 購物車區域 */}
          {cart.size > 0 && (
            <div className="border-t border-primary/10 pt-4 mt-4">
              {/* 購物車標題 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">購物車內容</h3>
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  清空
                </button>
              </div>

              {/* 購物車項目 */}
              <div className="space-y-2 mb-4">
                {Array.from(cart.values()).map((item) => {
                  const categoryStyle = getCategoryStyle(item.product.category);
                  
                  return (
                    <div
                      key={item.product.id}
                      className="flex items-center justify-between bg-background rounded-xl p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoryStyle.emoji}</span>
                        <div>
                          <div className="font-medium text-sm text-foreground">
                            {item.product.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${item.product.price}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decreaseQuantity(item.product.id!)}
                          className="bg-gray-300 hover:bg-gray-400 text-foreground w-7 h-7 rounded-full font-medium active:scale-95 transition-transform text-sm"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-medium text-sm text-foreground">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => increaseQuantity(item.product.id!)}
                          className="bg-primary hover:bg-primary/90 text-white w-7 h-7 rounded-full font-medium active:scale-95 transition-transform text-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 總計 */}
              <div className="bg-primary/10 rounded-xl p-3 mb-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm text-foreground">總計</span>
                  <span className="text-xl font-medium text-primary">
                    ${totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 支付方式按鈕 */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handlePayment('cash')}
                  disabled={isProcessing}
                  className="bg-soft-green hover:bg-soft-green/80 active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💵 現金
                </button>
                <button
                  onClick={() => handlePayment('mobile')}
                  disabled={isProcessing}
                  className="bg-cat-clothing hover:bg-[#D8E0E8] active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  📱 電子支付
                </button>
                <button
                  onClick={() => handlePayment('card')}
                  disabled={isProcessing}
                  className="bg-soft-yellow hover:bg-[#EFE8D7] active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🏦 轉帳
                </button>
                <button
                  onClick={() => handlePayment('other')}
                  disabled={isProcessing}
                  className="bg-cat-art hover:bg-[#E8D8E0] active:scale-95 text-foreground py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💳 其他
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
