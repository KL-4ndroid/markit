'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Cookie,
  Gem,
  Hand,
  MoreHorizontal,
  Package,
  Palette,
  Shirt,
  TrendingUp,
  AlertCircle,
  Edit,
  type LucideIcon,
} from 'lucide-react';
import { useProduct } from '@/lib/db/hooks';
import { initializeDatabaseSafely, type DatabaseInitResult } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { DetailPageSkeleton } from '@/components/ui/DetailPageSkeleton';
import { ProductCoverPhotoImage } from '@/components/products/ProductCoverPhotoImage';
import { getProductDetail } from '@/lib/products/detail-service';
import { useRoleContext } from '@/lib/role-context';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import type { Product, ProductCategory } from '@/types/db';

const EditProductForm = dynamic(() =>
  import('@/components/products/EditProductForm').then(module => module.EditProductForm)
);

interface ProductDetailScreenProps {
  productId: string;
}

export function ProductDetailScreen({ productId }: ProductDetailScreenProps) {
  const router = useRouter();
  const liveProduct = useProduct(productId);
  const [directLocalProduct, setDirectLocalProduct] = useState<Product | undefined>(undefined);
  const [localProductLookupComplete, setLocalProductLookupComplete] = useState(false);
  const product = liveProduct ?? directLocalProduct;
  const [dbStatus, setDbStatus] = useState<DatabaseInitResult | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [coverPhotoRevision, setCoverPhotoRevision] = useState(0);
  const {
    isStaff,
    isOwner,
    userRole,
    canViewSensitiveData,
    isLoading: isRoleLoading,
  } = useRoleContext();
  const roleCapabilities = deriveRoleCapabilities({
    isOwner,
    staffRole: userRole.staffRole,
  });
  const canEditProductBasic =
    !isRoleLoading && hasCapability(roleCapabilities, 'canEditProductBasic');
  const canShowSensitiveProductData = !isRoleLoading && canViewSensitiveData;
  const canEditProductActions = isOwner || canEditProductBasic;

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
  const getCategoryStyle = (category: ProductCategory): {
    bg: string;
    text: string;
    icon: LucideIcon;
  } => {
    const styles: Record<ProductCategory, { bg: string; text: string; icon: LucideIcon }> = {
      handmade: { bg: 'bg-soft-pink', text: '手作', icon: Hand },
      food: { bg: 'bg-soft-yellow', text: '食品', icon: Cookie },
      accessory: { bg: 'bg-soft-green', text: '飾品', icon: Gem },
      clothing: { bg: 'bg-cat-clothing', text: '服飾', icon: Shirt },
      art: { bg: 'bg-cat-art', text: '藝術品', icon: Palette },
      stationery: { bg: 'bg-cat-stationery', text: '文具', icon: BookOpen },
      other: { bg: 'bg-cat-other', text: '其他', icon: MoreHorizontal },
    };
    return styles[category] || styles.other;
  };

  // 處理編輯成功
  const handleEditSuccess = () => {
    toast.success('商品已更新');
    setCoverPhotoRevision(previous => previous + 1);
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

  const handleProductDeleted = () => {
    toast.success('商品已刪除');
    setShowEditForm(false);
    showNavigation();
    router.replace('/products');
  };

  // 載入中（初始化中）
  if (isRoleLoading || dbStatus === null || !localProductLookupComplete) {
    return <DetailPageSkeleton stats={2} sections={2} />;
  }

  // DB 不健康
  if (dbStatus.ok === false) {
    return (
      <div className="min-h-screen bg-background">
        <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => router.push('/products')}
              aria-label="返回商品列表"
              className="mb-4 flex min-h-11 items-center gap-2 rounded-control px-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
        <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => router.push('/products')}
              aria-label="返回商品列表"
              className="mb-4 flex min-h-11 items-center gap-2 rounded-control px-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
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
  const CategoryIcon = categoryStyle.icon;
  const profitMargin = canShowSensitiveProductData && product.cost && product.cost > 0 
    ? Math.round(((product.price - product.cost) / product.price) * 100)
    : null;
  const stockLabel = product.unlimitedStock ? '不限' : String(product.stock ?? 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="japanese-gradient-header rounded-b-[2rem] px-6 pb-8 pt-12">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push('/products')}
            aria-label="返回商品列表"
            className="mb-3 flex min-h-11 items-center gap-2 rounded-control px-2 text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>返回</span>
          </button>
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 flex-1 break-words text-2xl font-medium text-white">
              {product.name}
            </h1>
            <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs text-white backdrop-blur-sm">
              {categoryStyle.text}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto -mt-4 max-w-lg space-y-4 px-4 pb-8 sm:px-6">
        <section className="rounded-card border border-primary/10 bg-atelier-paper p-4 shadow-atelier" aria-labelledby="product-summary-heading">
          <h2 id="product-summary-heading" className="sr-only">商品摘要</h2>
          <div className="flex items-start gap-4">
            <div className={`flex aspect-square h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-card ${categoryStyle.bg}`}>
              <ProductCoverPhotoImage
                key={`${product.id}-${coverPhotoRevision}`}
                productId={product.id}
                productName={product.name}
                variant="display"
                fallback={<CategoryIcon className="h-8 w-8 text-foreground/55" aria-hidden="true" />}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className={product.isActive
                  ? 'rounded-full bg-status-good-bg px-2.5 py-1 text-status-good-text'
                  : 'rounded-full bg-muted px-2.5 py-1 text-muted-foreground'}>
                  {product.isActive ? '販售中' : '已停用'}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {categoryStyle.text}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">售價</p>
              <p className="mt-0.5 break-words text-2xl font-semibold tabular-nums text-primary">
                {formatCurrency(product.price)}
              </p>
            </div>
          </div>

          <dl className={`mt-4 grid gap-2 ${canShowSensitiveProductData ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
            {canShowSensitiveProductData && (
              <>
                <div className="rounded-control bg-soft-yellow/70 p-3">
                  <dt className="text-xs text-muted-foreground">成本</dt>
                  <dd className="mt-1 font-semibold tabular-nums text-foreground">
                    {product.cost ? formatCurrency(product.cost) : '-'}
                  </dd>
                </div>
                <div className="rounded-control bg-soft-green/70 p-3">
                  <dt className="text-xs text-muted-foreground">利潤率</dt>
                  <dd className="mt-1 flex items-center gap-1 font-semibold tabular-nums text-foreground">
                    {profitMargin === null ? '-' : `${profitMargin}%`}
                    {profitMargin !== null && profitMargin > 50 && <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />}
                  </dd>
                </div>
              </>
            )}
            <div className="rounded-control bg-background p-3">
              <dt className="text-xs text-muted-foreground">庫存</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">{stockLabel}</dd>
            </div>
            <div className="rounded-control bg-background p-3">
              <dt className="text-xs text-muted-foreground">已售出</dt>
              <dd className="mt-1 font-semibold tabular-nums text-foreground">{product.totalSold || 0}</dd>
            </div>
          </dl>

          {canEditProductActions && (
            <button
              onClick={handleOpenEditForm}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
            >
              <Edit className="h-4 w-4" aria-hidden="true" />
              編輯與管理
            </button>
          )}
        </section>

        {/* 商品描述 */}
        {product.description && (
          <div className="bg-white rounded-[1.5rem] p-6 shadow-lg shadow-primary/10">
            <h2 className="text-lg font-medium text-foreground mb-3">商品描述</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {product.description}
            </p>
          </div>
        )}

      </div>

      {/* 編輯商品表單 */}
      {product && showEditForm && (
        <EditProductForm
          product={product}
          isOpen={showEditForm}
          onClose={handleCloseEditForm}
          mode={isStaff ? 'manager' : 'owner'}
          onSuccess={handleEditSuccess}
          onDeleted={handleProductDeleted}
        />
      )}
    </div>
  );
}
