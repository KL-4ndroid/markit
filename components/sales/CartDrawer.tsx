'use client';

import { useState, useMemo } from 'react';
import { X, Plus, Minus, ShoppingCart, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { useProducts } from '@/lib/db/hooks';
import { recordDeal } from '@/lib/db/hooks';
import { toast } from 'sonner';
import type { Product } from '@/types/db';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  onSuccess?: () => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = 'cash' | 'card' | 'mobile' | 'other';

/**
 * 購物車抽屜組件
 * 用於快速結帳
 */
export function CartDrawer({ isOpen, onClose, marketId, onSuccess }: CartDrawerProps) {
  const products = useProducts({ isActive: true });
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  // 計算總金額
  const totalAmount = useMemo(() => {
    let total = 0;
    cart.forEach((item) => {
      total += item.product.price * item.quantity;
    });
    return total;
  }, [cart]);

  // 計算總件數
  const totalItems = useMemo(() => {
    let total = 0;
    cart.forEach((item) => {
      total += item.quantity;
    });
    return total;
  }, [cart]);

  // 增加商品
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

  // 減少商品
  const removeFromCart = (productId: string) => {
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

  // 清空購物車
  const clearCart = () => {
    setCart(new Map());
  };

  // 結帳
  const handleCheckout = async () => {
    if (cart.size === 0) {
      toast.error('購物車是空的');
      return;
    }

    setIsProcessing(true);

    try {
      // 準備成交資料
      const items = Array.from(cart.values()).map((item) => ({
        productId: item.product.id!,
        quantity: item.quantity,
        price: item.product.price,
      }));

      // 記錄成交
      await recordDeal({
        marketId,
        items,
        totalAmount,
        paymentMethod,
      });

      // 成功提示
      toast.success(`🎉 辛苦了！成交一筆 NT$${totalAmount.toLocaleString()}`, {
        description: `共 ${totalItems} 件商品`,
        duration: 3000,
      });

      // 清空購物車並關閉
      clearCart();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('結帳失敗：', error);
      toast.error('結帳失敗，請稍後再試');
    } finally {
      setIsProcessing(false);
    }
  };

  // 支付方式選項
  const paymentMethods: { value: PaymentMethod; label: string; icon: any; color: string }[] = [
    { value: 'cash', label: '現金', icon: Banknote, color: 'bg-[#E8F3E8]' },
    { value: 'mobile', label: '行動支付', icon: Smartphone, color: 'bg-[#E8F0F8]' },
    { value: 'card', label: '信用卡', icon: CreditCard, color: 'bg-[#F5E6E8]' },
  ];

  // 分類樣式
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; emoji: string }> = {
      handmade: { bg: 'bg-[#F5E6E8]', emoji: '🧵' },
      food: { bg: 'bg-[#FFF8E7]', emoji: '🍰' },
      accessory: { bg: 'bg-[#E8F3E8]', emoji: '💎' },
      clothing: { bg: 'bg-[#E8F0F8]', emoji: '👕' },
      art: { bg: 'bg-[#F8E8F0]', emoji: '🎨' },
      stationery: { bg: 'bg-[#FFF0E8]', emoji: '📚' },
      other: { bg: 'bg-[#F0F0F0]', emoji: '📦' },
    };
    return styles[category] || styles.other;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      {/* 抽屜 */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
        <div className="bg-[#FAFAF8] w-full h-[90vh] sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-[2rem] overflow-hidden flex flex-col animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#E8F3E8] to-[#7B9FA6] px-6 py-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-6 h-6 text-white" />
              <h2 className="text-xl font-medium text-white">購物車</h2>
              {totalItems > 0 && (
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white">
                  {totalItems} 件
                </span>
              )}
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 內容區 */}
          <div className="flex-1 overflow-y-auto">
            {/* 商品列表 */}
            <div className="px-6 py-4">
              <h3 className="text-sm font-medium text-[#6B6B6B] mb-3">選擇商品</h3>
              <div className="grid grid-cols-2 gap-3">
                {products?.map((product) => {
                  const categoryStyle = getCategoryStyle(product.category);
                  const cartItem = cart.get(product.id!);
                  const quantity = cartItem?.quantity || 0;

                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`relative p-3 rounded-2xl border-2 transition-all text-left ${
                        quantity > 0
                          ? 'border-[#7B9FA6] shadow-md'
                          : 'border-transparent hover:border-[#7B9FA6]/30'
                      } ${categoryStyle.bg}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-2xl">{categoryStyle.emoji}</span>
                        {quantity > 0 && (
                          <span className="bg-[#7B9FA6] text-white text-xs font-medium px-2 py-1 rounded-full">
                            {quantity}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium text-[#3A3A3A] mb-1 line-clamp-1">
                        {product.name}
                      </div>
                      <div className="text-lg font-medium text-[#7B9FA6] tabular-nums">
                        ${product.price}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 購物車明細 */}
            {cart.size > 0 && (
              <div className="px-6 py-4 border-t border-[#7B9FA6]/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-[#6B6B6B]">購物車明細</h3>
                  <button
                    onClick={clearCart}
                    className="text-xs text-[#d4183d] hover:underline"
                  >
                    清空
                  </button>
                </div>
                <div className="space-y-2">
                  {Array.from(cart.values()).map((item) => (
                    <div
                      key={item.product.id}
                      className="bg-white rounded-2xl p-3 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[#3A3A3A]">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-[#6B6B6B]">
                          ${item.product.price} × {item.quantity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.product.id!)}
                          className="p-1 rounded-lg bg-[#F5E6E8] hover:bg-[#E5D6D8] transition-colors"
                        >
                          <Minus className="w-4 h-4 text-[#3A3A3A]" />
                        </button>
                        <span className="text-sm font-medium text-[#3A3A3A] w-8 text-center tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item.product)}
                          className="p-1 rounded-lg bg-[#E8F3E8] hover:bg-[#D8E3D8] transition-colors"
                        >
                          <Plus className="w-4 h-4 text-[#3A3A3A]" />
                        </button>
                        <div className="text-sm font-medium text-[#7B9FA6] ml-2 w-16 text-right tabular-nums">
                          ${(item.product.price * item.quantity).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 支付方式 */}
            {cart.size > 0 && (
              <div className="px-6 py-4 border-t border-[#7B9FA6]/10">
                <h3 className="text-sm font-medium text-[#6B6B6B] mb-3">支付方式</h3>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        onClick={() => setPaymentMethod(method.value)}
                        className={`p-3 rounded-2xl border-2 transition-all ${
                          paymentMethod === method.value
                            ? 'border-[#7B9FA6] shadow-md'
                            : 'border-transparent'
                        } ${method.color}`}
                      >
                        <Icon className="w-6 h-6 text-[#3A3A3A] mx-auto mb-1" />
                        <div className="text-xs font-medium text-[#3A3A3A] text-center">
                          {method.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 底部結帳區 */}
          <div className="px-6 py-4 border-t border-[#7B9FA6]/10 bg-white">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-[#6B6B6B]">總計</span>
              <span className="text-2xl font-medium text-[#7B9FA6] tabular-nums">
                ${totalAmount.toLocaleString()}
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={cart.size === 0 || isProcessing}
              className="w-full bg-gradient-to-r from-[#E8F3E8] to-[#7B9FA6] text-white px-6 py-4 rounded-2xl hover:shadow-lg transition-all font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? '處理中...' : `完成結帳 ${totalItems > 0 ? `(${totalItems} 件)` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
