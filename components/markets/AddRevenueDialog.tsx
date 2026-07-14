'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { useProducts } from '@/lib/db/hooks';
import {
  recordDealWithOptionalSalesPhotoEvidence,
  type SalesPhotoEvidenceRuntimeContext,
  type SalesPhotoEvidenceRuntimeResultHandler,
} from '@/lib/sales/photo-evidence-runtime-enqueue';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import type { Product } from '@/types/db';

interface AddRevenueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  marketId: string;
  selectedDate: string;
  salesPhotoEvidenceContext?: Pick<
    SalesPhotoEvidenceRuntimeContext,
    'ownerId' | 'marketRequiresEvidence' | 'capturedByStaffId'
  >;
  onSalesPhotoEvidenceResult?: SalesPhotoEvidenceRuntimeResultHandler;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
}

type InputMode = 'simple' | 'full';

/**
 * 補登收入對話框
 * 
 * 支持兩種模式：
 * 1. 簡化輸入：直接輸入收入、成本、成交次數
 * 2. 完整輸入：選擇商品、數量、價格
 */
export function AddRevenueDialog({
  isOpen,
  onClose,
  marketId,
  selectedDate,
  salesPhotoEvidenceContext,
  onSalesPhotoEvidenceResult,
}: AddRevenueDialogProps) {
  const products = useProducts({ isActive: true });
  const [mode, setMode] = useState<InputMode>('simple');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 簡化模式狀態
  const [revenue, setRevenue] = useState('');
  const [cost, setCost] = useState('');
  const [dealCount, setDealCount] = useState('1');
  const [simpleNotes, setSimpleNotes] = useState('');
  
  // 完整模式狀態
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile' | 'other'>('cash');
  const [fullNotes, setFullNotes] = useState('');

  // 處理對話框開啟/關閉
  useEffect(() => {
    if (isOpen) {
      // 隱藏導航列
      hideNavigation();
      
      // 重置狀態
      setMode('simple');
      setRevenue('');
      setCost('');
      setDealCount('1');
      setSimpleNotes('');
      setCart([]);
      setPaymentMethod('cash');
      setFullNotes('');
    } else {
      // 顯示導航列
      showNavigation();
    }
  }, [isOpen]);

  // 計算利潤（簡化模式）
  const calculatedProfit = (parseFloat(revenue) || 0) - (parseFloat(cost) || 0);

  const createSalesPhotoEvidenceRuntimeContext = (): SalesPhotoEvidenceRuntimeContext | undefined => {
    if (!salesPhotoEvidenceContext) return undefined;

    const submittedAt = new Date().toISOString();
    return {
      ...salesPhotoEvidenceContext,
      marketId,
      saleCompletedAt: submittedAt,
      now: submittedAt,
    };
  };
  
  // 提交簡化模式
  const handleSimpleSubmit = async () => {
    const revenueNum = parseFloat(revenue);
    const costNum = parseFloat(cost) || 0;
    const dealCountNum = parseInt(dealCount) || 1;
    
    if (!revenueNum || revenueNum <= 0) {
      toast.error('請輸入有效的收入金額');
      return;
    }
    
    if (dealCountNum <= 0) {
      toast.error('成交次數必須大於 0');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await recordDealWithOptionalSalesPhotoEvidence({
        marketId,
        isBackfill: true,
        isManualEntry: true,
        manualRevenue: revenueNum,
        manualCost: costNum,
        manualDealCount: dealCountNum,
        items: [], // 簡化模式不需要商品
        totalAmount: revenueNum,
        paymentMethod: 'cash', // 簡化模式預設現金
        notes: simpleNotes || `補登收入 - ${formatDate(selectedDate)}`,
      }, selectedDate, { evidenceContext: createSalesPhotoEvidenceRuntimeContext() });
      await onSalesPhotoEvidenceResult?.(result);
      
      toast.success('✅ 收入補登成功', {
        description: `已記錄到 ${formatDate(selectedDate)}`,
      });
      
      window.dispatchEvent(new CustomEvent('deal-closed', {
        detail: { marketId, date: selectedDate, amount: revenueNum },
      }));
      onClose();
    } catch (error) {
      console.error('補登收入失敗：', error);
      toast.error('補登失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 完整模式：添加商品到購物車
  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, price: product.price }]);
    }
  };

  // 完整模式：更新數量
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      ));
    }
  };

  // 完整模式：更新價格
  const updatePrice = (productId: string, price: number) => {
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, price }
        : item
    ));
  };

  // 完整模式：計算總金額
  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // 提交完整模式
  const handleFullSubmit = async () => {
    if (cart.length === 0) {
      toast.error('請至少添加一個商品');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await recordDealWithOptionalSalesPhotoEvidence({
        marketId,
        isBackfill: true,
        isManualEntry: false,
        items: cart.map(item => ({
          productId: item.product.id!,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount,
        paymentMethod,
        notes: fullNotes || `補登收入 - ${formatDate(selectedDate)}`,
      }, selectedDate, { evidenceContext: createSalesPhotoEvidenceRuntimeContext() });
      await onSalesPhotoEvidenceResult?.(result);

      toast.success('✅ 收入補登成功', {
        description: `已記錄到 ${formatDate(selectedDate)}`,
      });

      window.dispatchEvent(new CustomEvent('deal-closed', {
        detail: { marketId, date: selectedDate, amount: totalAmount },
      }));
      onClose();
    } catch (error) {
      console.error('補登收入失敗：', error);
      toast.error('補登失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // 使用 createPortal 確保彈窗不受父層影響
  return createPortal(
    <>
      {/* 背景遮罩 - 確保覆蓋全螢幕 */}
      <div 
        className="fixed inset-0 bg-black/50 z-[999] transition-opacity"
        onClick={onClose}
      />
      
      {/* 對話框容器 - 強制鎖定螢幕正中央 */}
      <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center pointer-events-none">
        <div 
          className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-primary to-secondary p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-medium text-white">補登收入</h2>
                <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(selectedDate)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* 模式切換 */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('simple')}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                  mode === 'simple'
                    ? 'bg-white text-primary shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                簡化輸入
              </button>
              <button
                onClick={() => setMode('full')}
                className={`flex-1 py-2 px-4 rounded-xl font-medium transition-all ${
                  mode === 'full'
                    ? 'bg-white text-primary shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                完整輸入
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* 簡化模式 */}
            {mode === 'simple' && (
              <div className="space-y-4">
                {/* 收入金額 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    收入金額 <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      placeholder="請輸入收入金額"
                      className="w-full border-2 border-soft-green rounded-xl px-4 py-3 pr-12 text-lg focus:border-primary focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      元
                    </span>
                  </div>
                </div>

                {/* 成本金額 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    成本金額（可選）
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="請輸入成本金額"
                      className="w-full border-2 border-soft-green rounded-xl px-4 py-3 pr-12 text-lg focus:border-primary focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      元
                    </span>
                  </div>
                  {revenue && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      → 利潤：
                      <span className={`font-medium ml-1 ${
                        calculatedProfit >= 0 ? 'text-primary' : 'text-danger'
                      }`}>
                        {formatCurrency(calculatedProfit)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 成交次數 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    成交次數 <span className="text-danger">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={dealCount}
                      onChange={(e) => setDealCount(e.target.value)}
                      min="1"
                      className="w-full border-2 border-soft-green rounded-xl px-4 py-3 pr-12 text-lg focus:border-primary focus:outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      筆
                    </span>
                  </div>
                </div>

                {/* 備註 */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    備註（可選）
                  </label>
                  <textarea
                    value={simpleNotes}
                    onChange={(e) => setSimpleNotes(e.target.value)}
                    placeholder="輸入備註..."
                    className="w-full border-2 border-soft-green rounded-xl px-4 py-3 resize-none focus:border-primary focus:outline-none"
                    rows={3}
                  />
                </div>

                {/* 提示 */}
                <div className="bg-soft-yellow border border-secondary/20 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-semibold mb-1">💡 提示：</p>
                    <p>補登收入不會扣除商品庫存，僅用於記錄遺漏的收入資料。</p>
                  </div>
                </div>
              </div>
            )}
            {/* 完整模式 */}
            {mode === 'full' && (
              <div className="space-y-6">
                {/* 商品選擇 */}
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-3">選擇商品</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products?.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="bg-neutral-alt hover:bg-soft-green rounded-xl p-3 text-left transition-colors"
                      >
                        <div className="text-sm font-medium text-foreground mb-1">
                          {product.name}
                        </div>
                        <div className="text-xs text-primary">
                          {formatCurrency(product.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 購物車 */}
                {cart.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">購物車</h3>
                    <div className="space-y-3">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="bg-white border-2 border-soft-green rounded-xl p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium text-foreground">
                              {item.product.name}
                            </div>
                            <button
                              onClick={() => updateQuantity(item.product.id!, 0)}
                              className="text-danger text-sm hover:underline"
                            >
                              移除
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            {/* 數量 */}
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">數量</label>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.product.id!, item.quantity - 1)}
                                  className="w-8 h-8 rounded-lg bg-neutral-alt hover:bg-soft-green flex items-center justify-center"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.product.id!, parseInt(e.target.value) || 0)}
                                  className="w-16 text-center border-2 border-soft-green rounded-lg px-2 py-1"
                                />
                                <button
                                  onClick={() => updateQuantity(item.product.id!, item.quantity + 1)}
                                  className="w-8 h-8 rounded-lg bg-neutral-alt hover:bg-soft-green flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                            
                            {/* 單價 */}
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">單價</label>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updatePrice(item.product.id!, parseFloat(e.target.value) || 0)}
                                className="w-full border-2 border-soft-green rounded-lg px-3 py-1"
                              />
                            </div>
                          </div>
                          
                          <div className="mt-3 pt-3 border-t border-soft-green text-right">
                            <span className="text-sm text-muted-foreground">小計：</span>
                            <span className="text-lg font-medium text-primary ml-2">
                              {formatCurrency(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 支付方式 */}
                {cart.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">支付方式</h3>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: 'cash', label: '現金' },
                        { value: 'card', label: '刷卡' },
                        { value: 'mobile', label: '行動支付' },
                        { value: 'other', label: '其他' },
                      ].map((method) => (
                        <button
                          key={method.value}
                          onClick={() => setPaymentMethod(method.value as any)}
                          className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                            paymentMethod === method.value
                              ? 'bg-primary text-white'
                              : 'bg-neutral-alt text-muted-foreground hover:bg-soft-green'
                          }`}
                        >
                          {method.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 備註 */}
                {cart.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">備註（可選）</h3>
                    <textarea
                      value={fullNotes}
                      onChange={(e) => setFullNotes(e.target.value)}
                      placeholder="輸入備註..."
                      className="w-full border-2 border-soft-green rounded-xl px-4 py-3 resize-none focus:border-primary focus:outline-none"
                      rows={3}
                    />
                  </div>
                )}

                {/* 提示 */}
                <div className="bg-soft-yellow border border-secondary/20 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-foreground">
                    <p className="font-semibold mb-1">💡 提示：</p>
                    <p>補登收入不會扣除商品庫存，僅用於記錄遺漏的收入資料。</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {((mode === 'simple' && revenue) || (mode === 'full' && cart.length > 0)) && (
            <div className="border-t border-soft-green p-6">
              {mode === 'simple' ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">收入金額</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(parseFloat(revenue) || 0)}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleSimpleSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? '處理中...' : '確認補登'}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">總金額</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  
                  <button
                    onClick={handleFullSubmit}
                    disabled={isSubmitting}
                    className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors disabled:opacity-50 font-medium"
                  >
                    {isSubmitting ? '處理中...' : '確認補登'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body // 將元件掛載到 body，確保不受父層影響
  );
}
