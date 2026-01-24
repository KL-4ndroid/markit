'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { useProducts } from '@/lib/db/hooks';
import { initializeDatabase } from '@/lib/db';
import { ProductCard } from '@/components/products/ProductCard';
import { AddProductForm } from '@/components/products/AddProductForm';
import { EditProductForm } from '@/components/products/EditProductForm';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import type { ProductCategory } from '@/types/db';

type TabType = 'all' | ProductCategory;

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  // 初始化資料庫
  useEffect(() => {
    initializeDatabase()
      .then(() => setIsInitialized(true))
      .catch((error) => {
        console.error('資料庫初始化失敗：', error);
        toast.error('資料庫初始化失敗');
      });
  }, []);

  // 查詢所有商品
  const allProducts = useProducts({ isActive: true });

  // 根據 Tab 和搜尋關鍵字篩選商品
  const getFilteredProducts = () => {
    if (!allProducts) return [];

    let filtered = allProducts;

    // 分類篩選
    if (activeTab !== 'all') {
      filtered = filtered.filter(p => p.category === activeTab);
    }

    // 搜尋篩選
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // 計算每個分類的商品數量
  const getCategoryCount = (category: ProductCategory) => {
    if (!allProducts) return 0;
    return allProducts.filter(p => p.category === category).length;
  };

  // 過濾出有商品的分類
  const getVisibleTabs = () => {
    const allTab = { id: 'all' as const, label: '全部', emoji: '📦' };
    const categoryTabs = [
      { id: 'handmade' as const, label: '手作', emoji: '🖐️' },
      { id: 'food' as const, label: '食品', emoji: '🍰' },
      { id: 'accessory' as const, label: '飾品', emoji: '💎' },
      { id: 'clothing' as const, label: '服飾', emoji: '👕' },
      { id: 'art' as const, label: '藝術', emoji: '🎨' },
      { id: 'stationery' as const, label: '文具', emoji: '📚' },
      { id: 'other' as const, label: '其他', emoji: '📦' },
    ];

    // 只顯示有商品的分類
    const visibleCategoryTabs = categoryTabs.filter(tab => getCategoryCount(tab.id) > 0);

    return [allTab, ...visibleCategoryTabs];
  };

  const visibleTabs = getVisibleTabs();

  // 處理新增成功
  const handleAddSuccess = () => {
    toast.success('商品建立成功！', {
      description: '已成功新增商品',
    });
    showNavigation(); // 顯示導航列
  };

  // 處理打開表單
  const handleOpenForm = () => {
    setIsFormOpen(true);
    hideNavigation(); // 隱藏導航列
  };

  // 處理關閉表單
  const handleCloseForm = () => {
    setIsFormOpen(false);
    showNavigation(); // 顯示導航列
  };

  // 處理編輯商品
  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setIsEditFormOpen(true);
    hideNavigation(); // 隱藏導航列
  };

  // 處理關閉編輯表單
  const handleCloseEditForm = () => {
    setIsEditFormOpen(false);
    setEditingProduct(null);
    showNavigation(); // 顯示導航列
  };

  // 處理編輯成功
  const handleEditSuccess = () => {
    toast.success('商品已更新！', {
      description: '商品資訊已成功更新',
    });
    showNavigation(); // 顯示導航列
  };



  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#7B9FA6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6B6B6B]">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#7B9FA6] to-[#D4A574] pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90">
              商品管理
            </h1>
            {/* 新增按鈕 */}
            <button
              onClick={handleOpenForm}
              className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
              aria-label="新增商品"
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </div>
          <p className="text-white/80 text-sm">
            管理您的商品清單 📦
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        {/* 搜尋框 */}
        <div className="bg-white rounded-[1.5rem] p-4 shadow-lg shadow-[#7B9FA6]/10 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋商品名稱或描述..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#FAFAF8] focus:outline-none focus:ring-2 focus:ring-[#7B9FA6]/50 text-[#3A3A3A]"
            />
          </div>
        </div>

        {/* Tabs - 只顯示有商品的分類 */}
        {visibleTabs.length > 1 && (
          <div className="bg-white rounded-[1.5rem] p-2 shadow-lg shadow-[#7B9FA6]/10 mb-6 overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#7B9FA6] text-white shadow-md'
                      : 'text-[#6B6B6B] hover:bg-[#F5E6E8]'
                  }`}
                >
                  <span className="mr-1">{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 商品列表 */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 pb-6">
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product}
                onEdit={handleEditProduct}
              />
            ))}
          </div>
        ) : (
          /* 空狀態 */
          <div className="bg-white rounded-[1.5rem] p-12 shadow-lg shadow-[#7B9FA6]/10 text-center">
            <Package className="w-16 h-16 text-[#7B9FA6] mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-[#3A3A3A] mb-2">
              {searchQuery ? '找不到符合的商品' : activeTab === 'all' ? '尚未新增任何商品' : `沒有${visibleTabs.find(t => t.id === activeTab)?.label}類商品`}
            </h2>
            <p className="text-[#6B6B6B] text-sm mb-6">
              {searchQuery 
                ? '試試其他關鍵字或清除搜尋'
                : activeTab === 'all' 
                  ? '點擊右上角的 + 按鈕開始新增商品 ✨'
                  : '切換到其他分類查看更多商品'}
            </p>
            {activeTab === 'all' && !searchQuery && (
              <button
                onClick={handleOpenForm}
                className="bg-[#7B9FA6] text-white px-6 py-3 rounded-2xl hover:bg-[#6A8E95] transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                新增商品
              </button>
            )}
          </div>
        )}
      </div>

      {/* 新增商品表單 */}
      <AddProductForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSuccess={handleAddSuccess}
      />

      {/* 編輯商品表單 */}
      {editingProduct && (
        <EditProductForm
          isOpen={isEditFormOpen}
          onClose={handleCloseEditForm}
          product={editingProduct}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
