'use client';

import { useState, useEffect } from 'react';
import { X, Package, DollarSign, Tag, FileText, Ban, Trash2 } from 'lucide-react';
import { updateProduct, deleteProduct } from '@/lib/db/hooks';
import type { Product, ProductCategory, ProductUpdatedPayload } from '@/types/db';

interface EditProductFormProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

/**
 * 編輯商品表單組件
 */
export function EditProductForm({ product, isOpen, onClose, onSuccess }: EditProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: product.name,
    category: product.category,
    price: product.price,
    cost: product.cost,
    stock: product.stock,
    unlimitedStock: product.unlimitedStock || false,
    description: product.description,
    isActive: product.isActive,
  });

  // 當 product 變更時更新表單
  useEffect(() => {
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      unlimitedStock: product.unlimitedStock || false,
      description: product.description,
      isActive: product.isActive,
    });
  }, [product]);

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

  const handleChange = (field: keyof Product, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || formData.price! <= 0) {
      alert('請填寫商品名稱和價格');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateProduct(product.id!, formData);
      
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('更新商品失敗：', error);
      alert('更新商品失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 處理停用/啟用商品
  const handleToggleActive = async () => {
    setIsSubmitting(true);
    try {
      await updateProduct(product.id!, { isActive: !formData.isActive });
      setFormData(prev => ({ ...prev, isActive: !prev.isActive }));
      onSuccess?.();
    } catch (error) {
      console.error('更新商品狀態失敗：', error);
      alert('更新商品狀態失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 處理刪除商品
  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteProduct(product.id!);
      setShowDeleteConfirm(false);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('刪除商品失敗：', error);
      alert('刪除商品失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" onClick={onClose} />

      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="min-h-full flex items-end sm:items-center sm:justify-center sm:p-4">
          <div className="bg-[#FAFAF8] w-full max-h-[90vh] sm:max-w-lg sm:rounded-[2rem] overflow-hidden flex flex-col animate-slide-up relative shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] px-6 py-6 flex items-center justify-between">
            <h2 className="text-xl font-medium text-white">編輯商品</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* 表單內容 */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 pb-24 overscroll-behavior-contain">
            <div className="space-y-5">
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

              {/* 停用/刪除區域 */}
              <div className="pt-4 border-t border-[#7B9FA6]/10 space-y-3">
                <p className="text-sm font-medium text-[#6B6B6B]">商品管理</p>
                
                {/* 停用/啟用按鈕 */}
                <button
                  type="button"
                  onClick={handleToggleActive}
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 rounded-2xl transition-colors font-medium flex items-center justify-center gap-2 ${
                    formData.isActive
                      ? 'bg-[#FFF8E7] text-[#D4A574] hover:bg-[#FFF0D4]'
                      : 'bg-[#E8F3E8] text-[#7B9FA6] hover:bg-[#D8E3D8]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <Ban className="w-5 h-5" />
                  {formData.isActive ? '停用商品' : '啟用商品'}
                </button>

                {/* 刪除按鈕 */}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSubmitting}
                  className="w-full px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#d4183d] hover:bg-[#E5D6D8] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-5 h-5" />
                  刪除商品
                </button>
              </div>
            </div>
          </form>

          {/* 底部按鈕 - 固定在彈窗底部 */}
          <div className="sticky bottom-0 left-0 right-0 px-6 py-4 border-t border-[#7B9FA6]/10 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] flex-shrink-0">
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
                {isSubmitting ? '更新中...' : '儲存變更'}
              </button>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <div className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-medium text-[#3A3A3A] mb-2">確認刪除商品？</h3>
              <p className="text-sm text-[#6B6B6B] mb-6">
                刪除後，此商品將被永久移除，此操作無法復原。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#F5E6E8] text-[#3A3A3A] hover:bg-[#E5D6D8] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#d4183d] text-white hover:bg-[#c41739] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '刪除中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
