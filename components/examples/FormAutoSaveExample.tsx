/**
 * 表單自動暫存使用範例
 * 
 * 展示如何在表單中使用自動暫存功能
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormAutoSave, useFormAutoLoad } from '@/lib/form-autosave';
import { toast } from 'sonner';

// 範例：新增產品表單
export function AddProductFormExample() {
  const formId = 'add-product-form';
  
  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    cost: '',
    description: '',
  });

  // ✅ 載入暫存的表單資料
  const { savedData, hasSavedData, clearSaved } = useFormAutoLoad(formId);
  const restorePromptShownRef = useRef(false);

  // ✅ 自動保存表單（防抖 1 秒）
  useFormAutoSave(formId, formData, {
    enabled: true,
    debounceMs: 1000,
  });

  // 初始化時檢查是否有暫存資料
  useEffect(() => {
    if (restorePromptShownRef.current) return;

    if (hasSavedData && savedData) {
      restorePromptShownRef.current = true;
      // 詢問使用者是否要恢復
      const shouldRestore = window.confirm(
        '偵測到未完成的表單，是否要恢復？'
      );

      if (shouldRestore) {
        setFormData(savedData.data as typeof formData);
        toast.success('表單資料已恢復');
      } else {
        clearSaved();
      }
    }
  }, [clearSaved, hasSavedData, savedData]);

  // 監聽表單恢復事件（登入成功後）
  useEffect(() => {
    const handleFormRestored = (event: CustomEvent) => {
      toast.success(`已恢復 ${event.detail.count} 個表單的資料`);
    };

    window.addEventListener('form:restored', handleFormRestored as EventListener);
    
    return () => {
      window.removeEventListener('form:restored', handleFormRestored as EventListener);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 提交表單
    console.log('提交表單:', formData);
    
    // ✅ 提交成功後清除暫存
    clearSaved();
    
    // 重置表單
    setFormData({
      name: '',
      price: '',
      cost: '',
      description: '',
    });
    
    toast.success('產品已新增');
  };

  return (
    <div className="p-6">
      {/* 暫存提示 */}
      {hasSavedData && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-blue-800 mb-2">
            💾 偵測到未完成的表單
          </p>
          <button
            onClick={() => {
              if (savedData) {
                setFormData(savedData.data as typeof formData);
                toast.success('表單資料已恢復');
              }
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            點擊恢復
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 產品名稱 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            產品名稱
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-primary focus:outline-none"
            placeholder="請輸入產品名稱"
          />
        </div>

        {/* 售價 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            售價
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-primary focus:outline-none"
            placeholder="0"
          />
        </div>

        {/* 成本 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            成本
          </label>
          <input
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-primary focus:outline-none"
            placeholder="0"
          />
        </div>

        {/* 描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-primary focus:outline-none"
            placeholder="請輸入產品描述"
            rows={4}
          />
        </div>

        {/* 提交按鈕 */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-primary text-white py-3 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
          >
            新增產品
          </button>
          
          <button
            type="button"
            onClick={() => {
              setFormData({
                name: '',
                price: '',
                cost: '',
                description: '',
              });
              clearSaved();
            }}
            className="px-6 bg-gray-200 text-gray-700 py-3 rounded-2xl hover:bg-gray-300 transition-colors font-medium"
          >
            清除
          </button>
        </div>
      </form>

      {/* 說明 */}
      <div className="mt-6 bg-soft-yellow rounded-2xl p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>自動暫存：</strong>您的表單資料會自動保存。
          即使 Session 過期或意外關閉頁面，資料也不會丟失。
        </p>
      </div>
    </div>
  );
}

// 範例：快速交易表單
export function QuickDealFormExample() {
  const formId = 'quick-deal-form';
  
  const [formData, setFormData] = useState({
    productId: '',
    quantity: '',
    totalAmount: '',
    paymentMethod: 'cash',
  });

  const { savedData, hasSavedData, clearSaved } = useFormAutoLoad(formId);
  const hasRestoredSavedDataRef = useRef(false);

  useFormAutoSave(formId, formData, {
    enabled: true,
    debounceMs: 500, // 更短的防抖時間
  });

  useEffect(() => {
    if (hasRestoredSavedDataRef.current) return;

    if (hasSavedData && savedData) {
      hasRestoredSavedDataRef.current = true;
      setFormData(savedData.data as typeof formData);
      toast.info('已恢復未完成的交易');
    }
  }, [hasSavedData, savedData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交交易:', formData);
    clearSaved();
    setFormData({
      productId: '',
      quantity: '',
      totalAmount: '',
      paymentMethod: 'cash',
    });
    toast.success('交易已記錄');
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            產品
          </label>
          <select
            value={formData.productId}
            onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-primary focus:outline-none"
          >
            <option value="">請選擇產品</option>
            <option value="1">產品 A</option>
            <option value="2">產品 B</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            數量
          </label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-primary focus:outline-none"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            金額
          </label>
          <input
            type="number"
            value={formData.totalAmount}
            onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
            className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-primary focus:outline-none"
            placeholder="0"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-primary text-white py-4 rounded-2xl hover:bg-primary/85 transition-colors font-medium"
        >
          記錄交易
        </button>
      </form>
    </div>
  );
}
