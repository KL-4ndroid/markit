'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  DollarSign, 
  Tag,
  TrendingUp,
  AlertCircle,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { useProduct, updateProduct, deleteProduct } from '@/lib/db/hooks';
import { initializeDatabaseSafely, type DatabaseInitResult } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { EditProductForm } from '@/components/products/EditProductForm';
import { normalizeRouteId } from '@/lib/markets/detail-loading';
import { getProductDetail } from '@/lib/products/detail-service';
import { useUserRole } from '@/hooks/useUserRole';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import type { Product, ProductCategory } from '@/types/db';

interface PageProps {
  params?: {
    id?: string | string[];
  };
}

export default function ProductDetailPage({ params }: PageProps) {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const productId = normalizeRouteId(routeParams?.id ?? params?.id) ?? ''; // UUID 字符串，不需要 parseInt
  const liveProduct = useProduct(productId);
  const [directLocalProduct, setDirectLocalProduct] = useState<Product | undefined>(undefined);
  const [localProductLookupComplete, setLocalProductLookupComplete] = useState(false);
  const product = liveProduct ?? directLocalProduct;
  const [dbStatus, setDbStatus] = useState<DatabaseInitResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const {
    isStaff,
    isOwner,
    userRole,
    canViewSensitiveData,
    isLoading: isRoleLoading,
  } = useUserRole();
  const roleCapabilities = deriveRoleCapabilities({
    isOwner,
    staffRole: userRole.staffRole,
  });
  const canEditProductBasic =
    !isRoleLoading && hasCapability(roleCapabilities, 'canEditProductBasic');
  const canShowSensitiveProductData = !isRoleLoading && canViewSensitiveData;
  const canEditProductActions = isOwner || canEditProductBasic;
  const canDeleteProductAction = isOwner;

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
  useEffect(() => {
    let cancelled = false;

    setDirectLocalProduct(undefined);
    setLocalProductLookupComplete(false);

    if (dbStatus === null) {
      return () => {
        cancelled = true;
      };
    }

    if (dbStatus.ok === false) {
      setLocalProductLookupComplete(true);
      return () => {
        cancelled = true;
      };
    }

    if (!productId) {
      setLocalProductLookupComplete(true);
      return () => {
        cancelled = true;
      };
    }

    getProductDetail(productId)
      .then((productData) => {
        if (!cancelled) {
          setDirectLocalProduct(productData);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Local product lookup failed:', error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLocalProductLookupComplete(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId, dbStatus]);

  // 分類樣式
  const getCategoryStyle = (category: ProductCategory) => {
    const styles = {
      handmade: { bg: 'bg-soft-pink', emoji: '🖐️', text: '手作' },
      food: { bg: 'bg-soft-yellow', emoji: '🍰', text: '食品' },
      accessory: { bg: 'bg-soft-green', emoji: '💎', text: '飾品' },
      clothing: { bg: 'bg-[#E8F0F8]', emoji: '👕', text: '服飾' },
      art: { bg: 'bg-[#F8E8F0]', emoji: '🎨', text: '藝術品' },
      stationery: { bg: 'bg-[#FFF0E8]', emoji: '📚', text: '文具' },
      other: { bg: 'bg-[#F0F0F0]', emoji: '📦', text: '其他' },
    };
    return styles[category] || styles.other;
  };

  // 切換啟用狀態
  const handleToggleActive = async () => {
    if (!product || dbStatus?.ok === false || !canEditProductActions) return;

    setIsUpdating(true);

    try {
      await updateProduct(productId, {
        isActive: !product.isActive,
      });

      toast.success(product.isActive ? '商品已停用' : '商品已啟用');
    } catch (error) {
      console.error('更新失敗：', error);
      toast.error('更新失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  // 刪除商品
  const handleDelete = async () => {
    if (!product || dbStatus?.ok === false || !canDeleteProductAction) return;

    setIsUpdating(true);

    try {
      await deleteProduct(productId);
      toast.success('商品已刪除');
      setShowDeleteConfirm(false);
      
      setTimeout(() => {
        router.push('/products');
      }, 1000);
    } catch (error) {
      console.error('刪除失敗：', error);
      toast.error('刪除失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  // 處理編輯成功
  const handleEditSuccess = () => {
    toast.success('商品已更新');
    showNavigation(); // 顯示導航列
  };

  // 處理打開編輯表單
  const handleOpenEditForm = () => {
    if (dbStatus?.ok === false || !canEditProductActions) return;
    setShowEditForm(true);
    hideNavigation(); // 隱藏導航列
  };

  // 處理關閉編輯表單
  const handleCloseEditForm = () => {
    setShowEditForm(false);
    showNavigation(); // 顯示導航列
  };

  // 載入中（初始化中）
  if (isRoleLoading || dbStatus === null || !localProductLookupComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入中...</p>
        </div>
      </div>
    );
  }

  // DB 不健康
  if (dbStatus.ok === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-secondary to-secondary/85 pt-12 pb-8 px-6 rounded-b-[2rem]">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => router.push('/products')}
              className="mb-4 text-white/80 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
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
              onClick={() => router.push('/products')}
              className="w-full bg-soft-pink text-foreground px-6 py-3 rounded-2xl hover:bg-soft-pink/80 transition-colors font-medium"
            >
              返回商品列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 找不到商品
  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => router.push('/products')}
              className="mb-4 text-white/80 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回</span>
            </button>
            <h1 className="text-2xl font-medium text-white opacity-90">
              找不到商品
            </h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-6 -mt-4">
          <div className="bg-white rounded-[1.5rem] p-12 shadow-lg shadow-primary/10 text-center">
            <AlertCircle className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-medium text-foreground mb-2">
              找不到此商品
            </h2>
            <p className="text-muted-foreground text-sm mb-6">
              此商品可能已被刪除或不存在
            </p>
            <button
              onClick={() => router.push('/products')}
              className="bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary/85 transition-colors"
            >
              返回商品列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  const categoryStyle = getCategoryStyle(product.category);
  const profitMargin = canShowSensitiveProductData && product.cost && product.cost > 0 
    ? Math.round(((product.price - product.cost) / product.price) * 100)
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-secondary pt-12 pb-8 px-6 rounded-b-[2rem]">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/products')}
            className="mb-4 text-white/80 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-medium text-white opacity-90 flex-1">
              {product.name}
            </h1>
            <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-white ml-3">
              {categoryStyle.text}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-6 -mt-4 pb-6 space-y-4">
        {/* 商品圖示 */}
        <div className={`${categoryStyle.bg} rounded-[1.5rem] p-12 flex items-center justify-center shadow-lg shadow-primary/10`}>
          <div className="text-8xl">{categoryStyle.emoji}</div>
        </div>

        {/* 價格資訊 */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
          <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-secondary" />
            價格資訊
          </h2>
          
          <div className={`grid ${canShowSensitiveProductData ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <div className="bg-soft-green rounded-2xl p-4">
              <div className="text-xs text-muted-foreground mb-1">售價</div>
              <div className="text-2xl font-medium text-foreground tabular-nums">
                {formatCurrency(product.price)}
              </div>
            </div>
            {canShowSensitiveProductData && (
              <div className="bg-soft-yellow rounded-2xl p-4">
                <div className="text-xs text-muted-foreground mb-1">成本</div>
                <div className="text-2xl font-medium text-foreground tabular-nums">
                  {product.cost ? formatCurrency(product.cost) : '-'}
                </div>
              </div>
            )}
          </div>

          {profitMargin !== null && (
            <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">利潤率</span>
              <span className={`text-lg font-medium flex items-center gap-1 ${profitMargin > 50 ? 'text-primary' : 'text-secondary'}`}>
                {profitMargin}%
                {profitMargin > 50 && <TrendingUp className="w-4 h-4" />}
              </span>
            </div>
          )}
        </div>

        {/* 庫存與銷售 */}
        <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
          <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            庫存與銷售
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-background rounded-2xl">
              <div className="text-xs text-muted-foreground mb-1">庫存數量</div>
              <div className="text-2xl font-medium text-foreground tabular-nums">
                {product.stock ?? '-'}
              </div>
            </div>
            <div className="text-center p-4 bg-background rounded-2xl">
              <div className="text-xs text-muted-foreground mb-1">已售出</div>
              <div className="text-2xl font-medium text-foreground tabular-nums">
                {product.totalSold || 0}
              </div>
            </div>
          </div>
        </div>

        {/* 商品描述 */}
        {product.description && (
          <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
            <h2 className="text-lg font-medium text-foreground mb-3">商品描述</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="space-y-2">
          {canEditProductActions && (
            <>
              <button
                onClick={handleToggleActive}
                disabled={isUpdating}
                className={`w-full px-6 py-3 rounded-2xl transition-colors flex items-center justify-center gap-2 font-medium ${
                  product.isActive
                    ? 'bg-soft-pink text-foreground hover:bg-soft-pink/80'
                    : 'bg-soft-green text-foreground hover:bg-soft-green/80'
                }`}
              >
                {product.isActive ? (
                  <>
                    <ToggleLeft className="w-5 h-5" />
                    停用商品
                  </>
                ) : (
                  <>
                    <ToggleRight className="w-5 h-5" />
                    啟用商品
                  </>
                )}
              </button>

              <button
                onClick={handleOpenEditForm}
                className="w-full bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary/85 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Edit className="w-5 h-5" />
                編輯商品
              </button>
            </>
          )}

          {canDeleteProductAction && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full bg-soft-pink text-danger px-6 py-3 rounded-2xl hover:bg-soft-pink/80 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Trash2 className="w-5 h-5" />
              刪除商品
            </button>
          )}
        </div>
      </div>

      {/* 編輯商品表單 */}
      {product && (
        <EditProductForm
          product={product}
          isOpen={showEditForm}
          onClose={handleCloseEditForm}
          mode={isStaff ? 'manager' : 'owner'}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* 刪除確認對話框 */}
      {canDeleteProductAction && showDeleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-[1.5rem] p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-medium text-foreground mb-2">確認刪除商品？</h3>
              <p className="text-sm text-muted-foreground mb-6">
                刪除後，此商品將被標記為停用，此操作無法復原。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-soft-pink text-foreground hover:bg-soft-pink/80 transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 rounded-2xl bg-danger text-white hover:bg-danger/85 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? '處理中...' : '確認刪除'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
