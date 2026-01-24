'use client';

import { useState, useMemo } from 'react';
import { ShoppingCart, Plus, Minus } from 'lucide-react';
import { useProducts } from '@/lib/db/hooks';
import { recordDeal } from '@/lib/db/hooks';
import { toast } from 'sonner';
import type { Product } from '@/types/db';
import Link from 'next/link';

interface QuickTransactionGridProps {
  marketId: string;
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
export function QuickTransactionGrid({ marketId }: QuickTransactionGridProps) {
  const products = useProducts({ isActive: true });
  const [showProducts, setShowProducts] = useState(true);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);

  // 分類樣式
  const getCategoryStyle = (category: string) => {
    const styles: Record<string, { bg: string; emoji: string }> = {
      handmade: { bg: 'bg-[#FAFAF8]', emoji: '🧵' },
      food: { bg: 'bg-[#FAFAF8]', emoji: '🍪' },
      accessory: { bg: 'bg-[#FAFAF8]', emoji: '💎' },
      clothing: { bg: 'bg-[#FAFAF8]', emoji: '👕' },
      art: { bg: 'bg-[#FAFAF8]', emoji: '🎨' },
      stationery: { bg: 'bg-[#FAFAF8]', emoji: '📚' },
      other: { bg: 'bg-[#FAFAF8]', emoji: '📦' },
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
      await recordDeal({
        marketId,
        items,
        totalAmount,
        paymentMethod,
      });

      // 支付方式文字
      const paymentText = {
        cash: '現金',
        mobile: 'LINE Pay',
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
    <div className="bg-white rounded-[1.5rem] shadow-lg shadow-[#7B9FA6]/10 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium flex items-center gap-2 text-[#3A3A3A]">
          <ShoppingCart className="w-5 h-5 text-[#7B9FA6]" />
          快速交易
        </h2>
        <div className="flex items-center gap-3">
          <Link
            href="/products"
            className="text-sm text-[#7B9FA6] hover:underline font-medium"
          >
            管理商品 →
          </Link>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-[#6B6B6B]">顯示商品</span>
            <button
              onClick={() => setShowProducts(!showProducts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showProducts ? 'bg-[#7B9FA6]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showProducts ? 'translate-x-6' : 'translate-x-1'
                }`}
              ></span>
            </button>
          </label>
        </div>
      </div>

      {/* 商品網格 */}
      {showProducts && (
        <>
          {products && products.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-4">
              {products.map((product) => {
                const categoryStyle = getCategoryStyle(product.category);

                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-[#FAFAF8] hover:bg-[#7B9FA6]/10 border-2 border-[#7B9FA6]/15 rounded-[1.25rem] p-3 active:scale-95 transition-all"
                  >
                    <div className="text-4xl mb-2">{categoryStyle.emoji}</div>
                    <div className="text-sm font-medium mb-1 line-clamp-1 text-[#3A3A3A]">
                      {product.name}
                    </div>
                    <div className="text-xs text-[#7B9FA6] font-medium">
                      ${product.price}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[#6B6B6B] mb-2">尚無商品</p>
              <Link
                href="/products"
                className="text-sm text-[#7B9FA6] hover:underline font-medium"
              >
                前往新增商品 →
              </Link>
            </div>
          )}
        </>
      )}

      {/* 購物車區域 */}
      {cart.size > 0 && (
        <div className="border-t border-[#7B9FA6]/10 pt-4 mt-4">
          {/* 購物車標題 */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-[#3A3A3A]">購物車內容</h3>
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
                  className="flex items-center justify-between bg-[#FAFAF8] rounded-xl p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{categoryStyle.emoji}</span>
                    <div>
                      <div className="font-medium text-sm text-[#3A3A3A]">
                        {item.product.name}
                      </div>
                      <div className="text-xs text-[#6B6B6B]">
                        ${item.product.price}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => decreaseQuantity(item.product.id!)}
                      className="bg-gray-300 hover:bg-gray-400 text-[#3A3A3A] w-7 h-7 rounded-full font-medium active:scale-95 transition-transform text-sm"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-medium text-sm text-[#3A3A3A]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => increaseQuantity(item.product.id!)}
                      className="bg-[#7B9FA6] hover:bg-[#7B9FA6]/90 text-white w-7 h-7 rounded-full font-medium active:scale-95 transition-transform text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 總計 */}
          <div className="bg-[#7B9FA6]/10 rounded-xl p-3 mb-3">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm text-[#3A3A3A]">總計</span>
              <span className="text-xl font-medium text-[#7B9FA6]">
                ${totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 支付方式按鈕 */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handlePayment('cash')}
              disabled={isProcessing}
              className="bg-[#E8F3E8] hover:opacity-90 text-[#3A3A3A] py-3 rounded-xl font-medium text-sm shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💵 現金
            </button>
            <button
              onClick={() => handlePayment('mobile')}
              disabled={isProcessing}
              className="bg-[#00B900] hover:bg-[#009900] text-white py-3 rounded-xl font-medium text-sm shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              💳 LINE Pay
            </button>
            <button
              onClick={() => handlePayment('card')}
              disabled={isProcessing}
              className="bg-[#7B9FA6] hover:bg-[#7B9FA6]/90 text-white py-3 rounded-xl font-medium text-sm shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🏦 轉帳
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
