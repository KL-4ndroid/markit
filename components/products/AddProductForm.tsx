'use client';

import { useState } from 'react';
import { X, Package, DollarSign, Tag, FileText } from 'lucide-react';
import { createProduct } from '@/lib/db/hooks';
import type { ProductCreatedPayload, ProductCategory } from '@/types/db';

interface AddProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 新增商品表單組件
 */
export function AddProductForm({ isOpen, onClose, onSuccess }: AddProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductCreatedPayload>({
    name: '',
    category: 'handmade',
    price: 0,
    cost: 0,
    stock: 0,
    unlimitedStock: true, // ✅ 預設勾選「不限庫存」
    description: '',
  });

  // 分類選項
  const categories: { value: ProductCategory; label: string; emoji: string; color: string }[] = [
    { value: 'handmade', label: '手作', emoji: '🖐️', color: 'bg-[#F5E6E8]' },
    { value: 'food', label: '食品', emoji: '🍰', color: 'bg-[#FFF8E7]' },
    { value: 'accessory', label: '飾品', emoji: '💎', color: 'bg-[#E8F3E8]' },
    { value: 'clothing', label: '服飾', emoji: '👕', color: 'bg-[#E8F0F8]' },
    { value: 'art', label: '藝術品', emoji: '🎨', color: 'bg-[#F8E8F0]' },
    { value: 'stationery', label: '文具', emoji: '📚', color: 'bg-[#FFF0E8]' },
    { value: 'other', label: '其他', emoji: '📦', color: 'bg-[#F0F0F0]' },
  ];

  const handleChange = (field: keyof ProductCreatedPayload, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.price <= 0) {
      alert('請填寫商品名稱和價格');
      return;
    }
    
    // 如果不是不限庫存，且庫存為 0，提醒使用者
    if (!formData.unlimitedStock && (!formData.stock || formData.stock === 0)) {
      const confirm = window.confirm('庫存數量為 0，確定要建立嗎？');
      if (!confirm) return;
    }

    setIsSubmitting(true);

    try {
      await createProduct(formData);
      
      setFormData({
        name: '',
        category: 'handmade',
        price: 0,
        cost: 0,
        stock: 0,
        unlimitedStock: true, // ✅ 重置時也預設勾選「不限庫存」
        description: '',
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('建立商品失敗：', error);
      alert('建立商品失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex justify-center p-4">
        <div className="bg-[#FAFAF8] w-full h-[90dvh] sm:max-w-lg rounded-[2rem] overflow-hidden flex flex-col animate-slide-up relative">          {/* Header */}
          <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] px-6 py-6 flex items-center justify-between">
            <h2 className="text-xl font-medium text-white">新增商品</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 表單內容 */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 pb-24">
            <div className="space-y-5 overflow-y-auto">
              {/* 商品名稱 */}
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  商品名稱 <span className="text-[#d4183d]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="例如：手工陶杯"
                  className="w-full px-4 py-3 rounded-2xl border border-[#7B9FA6]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B9FA6]/50 text-[#3A3A3A]"
                  required
                />
              </div>

              {/* 分類選擇 */}
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  <Tag className="w-4 h-4 inline mr-1 text-[#7B9FA6]" />
                  分類 <span className="text-[#d4183d]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => handleChange('category', cat.value)}
                      className={`p-3 rounded-2xl border-2 transition-all ${
                        formData.category === cat.value
                          ? 'border-[#7B9FA6] shadow-md'
                          : 'border-transparent'
                      } ${cat.color}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className="text-sm font-medium text-[#3A3A3A]">{cat.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 價格與成本 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1 text-[#7B9FA6]" />
                    售價 <span className="text-[#d4183d]">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 rounded-2xl border border-[#7B9FA6]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B9FA6]/50 text-[#3A3A3A]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1 text-[#D4A574]" />
                    成本
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => handleChange('cost', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 rounded-2xl border border-[#7B9FA6]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B9FA6]/50 text-[#3A3A3A]"
                  />
                </div>
              </div>

              {/* 庫存 */}
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  <Package className="w-4 h-4 inline mr-1 text-[#7B9FA6]" />
                  庫存數量
                </label>
                
                {/* 不限庫存 Checkbox */}
                <div className="mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.unlimitedStock}
                      onChange={(e) => {
                        const unlimited = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          unlimitedStock: unlimited,
                          stock: unlimited ? 0 : prev.stock,
                        }));
                      }}
                      className="w-4 h-4 rounded border-[#7B9FA6]/30 text-[#7B9FA6] focus:ring-[#7B9FA6]/50"
                    />
                    <span className="text-sm text-[#6B6B6B]">
                      不限庫存（販售服務或接單訂製）
                    </span>
                  </label>
                </div>
                
                {/* 庫存輸入框 */}
                {!formData.unlimitedStock && (
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => handleChange('stock', Number(e.target.value))}
                    placeholder="0"
                    min="0"
                    className="w-full px-4 py-3 rounded-2xl border border-[#7B9FA6]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B9FA6]/50 text-[#3A3A3A]"
                  />
                )}
                
                {formData.unlimitedStock && (
                  <div className="px-4 py-3 rounded-2xl border border-[#7B9FA6]/20 bg-[#F0F0F0] text-[#6B6B6B] text-center">
                    ∞ 不限庫存
                  </div>
                )}
              </div>

              {/* 描述 */}
              <div>
                <label className="block text-sm font-medium text-[#3A3A3A] mb-2">
                  <FileText className="w-4 h-4 inline mr-1 text-[#7B9FA6]" />
                  商品描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="商品的詳細說明..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-[#7B9FA6]/20 bg-white focus:outline-none focus:ring-2 focus:ring-[#7B9FA6]/50 text-[#3A3A3A] resize-none"
                />
              </div>
            </div>
          </form>

          {/* 底部按鈕 - 固定在彈窗底部 */}
          <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-[#7B9FA6]/10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors font-medium"
              >
                取消
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 rounded-2xl bg-[#7B9FA6] text-white hover:bg-[#6A8E95] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '建立中...' : '建立商品'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
