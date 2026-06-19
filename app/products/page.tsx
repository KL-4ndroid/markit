'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, AlertCircle } from 'lucide-react';
import { useProducts } from '@/lib/db/hooks';
import { initializeDatabaseSafely, type DatabaseInitResult } from '@/lib/db';
import { ProductCard } from '@/components/products/ProductCard';
import { AddProductForm } from '@/components/products/AddProductForm';
import { EditProductForm } from '@/components/products/EditProductForm';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/lib/supabase/auth-context'; // ✅ 導入 useAuth
import { StaffModeNotice } from '@/components/staff/StaffModeNotice';
import { getGradientClass, getShadowClass, getPrimaryBgClass } from '@/lib/theme-config';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import type { ProductCategory } from '@/types/db';
import ProductsLoading from './loading';

type TabType = 'all' | ProductCategory;

export default function ProductsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseInitResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const { isStaff, userRole, isOwner, isLoading: isRoleLoading, roleError } = useUserRole(); // ✅ 員工權限檢查
  const { user } = useAuth(); // ✅ 獲取當前用戶
  const roleCapabilities = deriveRoleCapabilities({
    isOwner,
    staffRole: userRole.staffRole,
  });
  const canEditProductBasic =
    !isRoleLoading && hasCapability(roleCapabilities, 'canEditProductBasic');

  // 初始化資料庫（使用安全初始化）
  useEffect(() => {
    if (isRoleLoading) return;

    setDbStatus(null);
    initializeDatabaseSafely({ profile: isStaff ? 'staff_scoped' : 'owner_full' })
      .then((result) => setDbStatus(result))
      .catch((error) => {
        console.error('資料庫初始化失敗：', error);
        setDbStatus({
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
          recoverable: true,
        });
      });
  }, [isRoleLoading, isStaff]);

  // ✅ 根據身份查詢商品：員工看老闆的商品，老闆看自己的商品
  const effectiveOwnerId = isStaff ? userRole.ownerId : user?.id;
  
  const allProducts = useProducts({ 
    isActive: true,
    ownerId: effectiveOwnerId, // ✅ 員工模式下使用老闆的 ID，老闆模式下使用自己的 ID
  });

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

  // ✅ 角色守衛（RoleGuard）已由 layout 級別統一處理（C2.28B）
  //   - 這裡不需要再寫 if (isRoleLoading || roleError) return <RoleLoadingFallback />
  //   - 到這層時角色必定已載入
  //   - fail-closed 仍由 useUserRole 的 deriveRolePermissions 提供雙層保護

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
    if (dbStatus?.ok === false) return;
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
    if (isStaff && !canEditProductBasic) return;
    if (dbStatus?.ok === false) return;
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



  // 初始化中：與其他 segment 統一使用骨架屏（markets 頁同款模式）
  if (dbStatus === null) {
    return <ProductsLoading />;
  }

  // DB 不健康
  if (dbStatus.ok === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-secondary to-secondary/85 pt-12 pb-8 px-6 rounded-b-[2rem]">
          <div className="max-w-lg mx-auto">
            <h1 className="text-2xl font-medium text-white opacity-90">
              資料庫異常
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-6 -mt-4 pb-6">
          <div className="bg-white rounded-[1.5rem] p-8 shadow-lg shadow-secondary/10 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-lg font-medium text-foreground">
              本機資料庫無法正常存取
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              系統無法讀取本地資料庫，可能因瀏覽器儲存空間不足、隱私模式，或資料庫結構損壞。
            </p>
            {dbStatus.recoverable && (
              <p className="text-muted-foreground text-sm">
                建議前往「資料修復」頁面嘗試還原資料庫。
              </p>
            )}
            <button
              onClick={() => router.push('/recovery')}
              className="w-full bg-secondary text-white px-6 py-3 rounded-2xl hover:bg-secondary/85 transition-colors font-medium"
            >
              前往資料修復
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-soft-pink text-foreground px-6 py-3 rounded-2xl hover:bg-soft-pink/80 transition-colors font-medium"
            >
              重新整理頁面
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DB 健康，正常列表 UI

  return (
    <div className="min-h-screen bg-background">
      {/* Header - ✅ 員工模式使用紫色漸變 */}
      <div className={`${getGradientClass(isStaff)} pt-12 pb-8 px-6 rounded-b-[2rem]`}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-medium text-white opacity-90 flex items-center gap-2">
              <Package className="w-6 h-6" />
              {isStaff ? '商品列表' : '商品管理'}
            </h1>
            {/* 新增按鈕 - ✅ 員工模式下隱藏 */}
            {!isStaff && (
              <button
                onClick={handleOpenForm}
                className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                aria-label="新增商品"
              >
                <Plus className="w-6 h-6 text-white" />
              </button>
            )}
          </div>
          <p className="text-white/80 text-sm">
            {isStaff ? '查看所有商品' : '管理您的商品清單'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4">
        <StaffModeNotice className="mb-4" compact />

        {/* 搜尋框 - ✅ 員工模式使用紫色主題 */}
        <div className={`bg-white rounded-[1.5rem] p-4 shadow-lg ${getShadowClass(isStaff)} mb-4`}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋商品名稱或描述..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl bg-background focus:outline-none focus:ring-2 ${
                isStaff ? 'focus:ring-primary/50' : 'focus:ring-primary/50'
              } text-foreground`}
            />
          </div>
        </div>

        {/* Tabs - ✅ 員工模式使用紫色主題 */}
        {visibleTabs.length > 1 && (
          <div className={`bg-white rounded-[1.5rem] p-2 shadow-lg ${getShadowClass(isStaff)} mb-6 overflow-x-auto`}>
            <div className="flex gap-1 min-w-max">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? `${getPrimaryBgClass(isStaff)} text-white shadow-md`
                      : 'text-muted-foreground hover:bg-soft-pink'
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
                canEdit={canEditProductBasic}
              />
            ))}
          </div>
        ) : (
          /* 空狀態 - ✅ 員工模式使用紫色主題 */
          <div className={`bg-white rounded-[1.5rem] p-12 shadow-lg ${getShadowClass(isStaff)} text-center`}>
            <Package className={`w-16 h-16 mx-auto mb-4 opacity-50 ${isStaff ? 'text-primary' : 'text-primary'}`} />
            <h2 className="text-lg font-medium text-foreground mb-2">
              {searchQuery ? '找不到符合的商品' : activeTab === 'all' ? (isStaff ? '目前沒有商品' : '尚未新增任何商品') : `沒有${visibleTabs.find(t => t.id === activeTab)?.label}類商品`}
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              {searchQuery 
                ? '試試其他關鍵字或清除搜尋'
                : activeTab === 'all' 
                  ? (isStaff ? '老闆尚未新增任何商品' : '點擊右上角的 + 按鈕開始新增商品 ✨')
                  : '切換到其他分類查看更多商品'}
            </p>
            {activeTab === 'all' && !searchQuery && !isStaff && (
              <button
                onClick={handleOpenForm}
                className={`${getPrimaryBgClass(isStaff)} text-white px-6 py-3 rounded-2xl hover:opacity-90 transition-opacity inline-flex items-center gap-2`}
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
          mode={isStaff ? 'manager' : 'owner'}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
