'use client';

import dynamic from 'next/dynamic';
import {
  AlertCircle,
  BookOpen,
  Cookie,
  Gem,
  Hand,
  MoreHorizontal,
  Package,
  Palette,
  Plus,
  Search,
  Shirt,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { ProductCard } from '@/components/products/ProductCard';
import { fetchProductCoverPhotoMetadata } from '@/lib/products/product-cover-photo-client';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { StateView } from '@/components/ui/StateView';
import { Tabs, type TabItem } from '@/components/ui/Tabs';
import { initializeDatabaseSafely, type DatabaseInitResult } from '@/lib/db';
import { useProducts } from '@/lib/db/hooks';
import { hideNavigation, showNavigation } from '@/lib/navigation-store';
import { deriveRoleCapabilities, hasCapability } from '@/lib/permissions/role-capabilities';
import { buildProductDetailHref } from '@/lib/navigation/product-detail-route';
import {
  filterProductList,
  type ProductListCategory,
} from '@/lib/products/product-list-view-model';
import { useRoleContext } from '@/lib/role-context';
import { useAuth } from '@/lib/supabase/auth-context';
import { getGradientClass } from '@/lib/theme-config';
import type { Product, ProductCategory } from '@/types/db';
import ProductsLoading from './loading';

const AddProductForm = dynamic(
  () => import('@/components/products/AddProductForm').then(module => module.AddProductForm),
  { ssr: false },
);

interface ProductCategoryPresentation {
  id: ProductCategory;
  label: string;
  icon: LucideIcon;
}

interface ProductListReturnState {
  category: ProductListCategory;
  query: string;
  showInactive: boolean;
  scrollY: number;
}

const CATEGORY_OPTIONS: readonly ProductCategoryPresentation[] = [
  { id: 'handmade', label: '手作', icon: Hand },
  { id: 'food', label: '食品', icon: Cookie },
  { id: 'accessory', label: '飾品', icon: Gem },
  { id: 'clothing', label: '服飾', icon: Shirt },
  { id: 'art', label: '藝術', icon: Palette },
  { id: 'stationery', label: '文具', icon: BookOpen },
  { id: 'other', label: '其他', icon: MoreHorizontal },
];
const PRODUCT_LIST_RETURN_STATE_KEY = 'product-list:return-state:v1';
const ROLE_NOT_READY_OWNER_ID = '__role_not_ready__';

function isProductListCategory(value: unknown): value is ProductListCategory {
  return value === 'all' || CATEGORY_OPTIONS.some(option => option.id === value);
}

function readReturnState(): ProductListReturnState | null {
  try {
    const raw = sessionStorage.getItem(PRODUCT_LIST_RETURN_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProductListReturnState>;
    if (!isProductListCategory(parsed.category)) return null;
    return {
      category: parsed.category,
      query: typeof parsed.query === 'string' ? parsed.query : '',
      showInactive: parsed.showInactive === true,
      scrollY: Number.isFinite(parsed.scrollY) ? Math.max(0, Number(parsed.scrollY)) : 0,
    };
  } catch {
    return null;
  }
}

function writeReturnState(state: ProductListReturnState): void {
  try {
    sessionStorage.setItem(PRODUCT_LIST_RETURN_STATE_KEY, JSON.stringify(state));
  } catch {
    // Session storage is optional; the list still works when it is unavailable.
  }
}

export default function ProductsPage() {
  const router = useRouter();
  const { userRole, roleRefreshState } = useRoleContext();
  const { user } = useAuth();
  const isRoleReady = roleRefreshState.stage === 'ready';
  const isStaffMode = isRoleReady ? userRole.isStaff : true;
  const effectiveOwnerId = isRoleReady ? (isStaffMode ? userRole.ownerId : user?.id) : undefined;
  const scopedOwnerId = effectiveOwnerId ?? ROLE_NOT_READY_OWNER_ID;
  const canLoadScopedData = isRoleReady && Boolean(effectiveOwnerId);
  const roleCapabilities = deriveRoleCapabilities({
    isOwner: isRoleReady && roleRefreshState.permissions.isOwner,
    staffRole: userRole.staffRole,
  });
  const canEditProductBasic = isRoleReady && hasCapability(roleCapabilities, 'canEditProductBasic');

  const [activeCategory, setActiveCategory] = useState<ProductListCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DatabaseInitResult | null>(null);
  const returnStateRef = useRef<ProductListReturnState>({
    category: 'all',
    query: '',
    showInactive: false,
    scrollY: 0,
  });
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    if (!isRoleReady || !effectiveOwnerId) {
      setDbStatus(null);
      return;
    }

    setDbStatus(null);
    initializeDatabaseSafely({ profile: isStaffMode ? 'staff_scoped' : 'owner_full' })
      .then(result => setDbStatus(result))
      .catch(error => {
        console.error('資料庫初始化失敗：', error);
        setDbStatus({
          ok: false,
          error: error instanceof Error ? error : new Error(String(error)),
          recoverable: true,
        });
      });
  }, [effectiveOwnerId, isRoleReady, isStaffMode]);

  useEffect(() => {
    const state = readReturnState();
    if (!state) return;
    setActiveCategory(state.category);
    setSearchQuery(state.query);
    setShowInactive(!isStaffMode && state.showInactive);
    const timerId = window.setTimeout(() => window.scrollTo({ top: state.scrollY }), 80);
    return () => window.clearTimeout(timerId);
  }, [isStaffMode]);

  useEffect(() => () => {
    writeReturnState({ ...returnStateRef.current, scrollY: window.scrollY });
  }, []);

  const allProducts = useProducts({
    isActive: isStaffMode ? true : undefined,
    ownerId: scopedOwnerId,
  });
  const [coverPhotoVersions, setCoverPhotoVersions] = useState<Record<string, number>>({});
  const productIdKey = useMemo(() => allProducts
    .map(product => product.id)
    .filter((id): id is string => Boolean(id))
    .sort()
    .join(','), [allProducts]);

  useEffect(() => {
    let active = true;
    const productIds = productIdKey ? productIdKey.split(',') : [];
    if (productIds.length === 0) {
      setCoverPhotoVersions({});
      return;
    }
    const batches = Array.from({ length: Math.ceil(productIds.length / 100) }, (_, index) => (
      productIds.slice(index * 100, (index + 1) * 100)
    ));
    void Promise.all(batches.map(fetchProductCoverPhotoMetadata)).then(results => {
      if (active) setCoverPhotoVersions(Object.assign({}, ...results));
    });
    return () => { active = false; };
  }, [productIdKey]);
  const categorySource = useMemo(
    () => allProducts.filter(product => showInactive || product.isActive),
    [allProducts, showInactive],
  );
  const categoryCounts = useMemo(() => {
    const counts = new Map<ProductCategory, number>();
    for (const product of categorySource) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }
    return counts;
  }, [categorySource]);
  const tabs = useMemo<readonly TabItem<ProductListCategory>[]>(() => {
    const categoryTabs = CATEGORY_OPTIONS
      .filter(option => (categoryCounts.get(option.id) ?? 0) > 0)
      .map(option => {
        const CategoryIcon = option.icon;
        return {
          id: option.id,
          label: option.label,
          count: categoryCounts.get(option.id) ?? 0,
          icon: <CategoryIcon className="h-4 w-4" aria-hidden="true" />,
        };
      });

    return [{ id: 'all', label: '全部', count: categorySource.length }, ...categoryTabs];
  }, [categoryCounts, categorySource.length]);

  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeCategory)) setActiveCategory('all');
  }, [activeCategory, tabs]);

  const filteredProducts = useMemo(() => filterProductList(allProducts, {
    category: activeCategory,
    query: deferredSearchQuery,
    includeInactive: !isStaffMode && showInactive,
  }), [activeCategory, allProducts, deferredSearchQuery, isStaffMode, showInactive]);

  returnStateRef.current = {
    category: activeCategory,
    query: searchQuery,
    showInactive,
    scrollY: typeof window === 'undefined' ? 0 : window.scrollY,
  };

  const openProduct = (product: Product) => {
    if (!product.id) return;
    writeReturnState({ ...returnStateRef.current, scrollY: window.scrollY });
    router.push(buildProductDetailHref(product.id));
  };

  const handleOpenForm = () => {
    if (!canLoadScopedData || dbStatus?.ok === false) return;
    setIsFormOpen(true);
    hideNavigation();
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    showNavigation();
  };

  const handleAddSuccess = () => {
    toast.success('商品建立成功');
    setActiveCategory('all');
    setSearchQuery('');
    showNavigation();
  };

  if (!canLoadScopedData || dbStatus === null) return <ProductsLoading />;

  if (dbStatus.ok === false) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
        <StateView
          icon={<AlertCircle className="h-5 w-5" aria-hidden="true" />}
          title="本機資料庫無法正常存取"
          description="可能是儲存空間不足、隱私模式或資料庫結構異常。你的雲端資料不會因此被刪除。"
          className="w-full"
          action={(
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => router.push('/recovery')}>前往資料修復</Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>重新整理</Button>
            </div>
          )}
        />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className={`${getGradientClass(isStaffMode)} rounded-b-[2rem] border-b border-white/15 px-5 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))] text-white shadow-atelier`}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">{isStaffMode ? '銷售商品' : '商品管理'}</p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              <Package className="h-6 w-6" aria-hidden="true" />
              商品
            </h1>
          </div>
          {!isStaffMode && (
            <IconButton
              label="新增商品"
              tone="inverse"
              icon={<Plus className="h-5 w-5" aria-hidden="true" />}
              onClick={handleOpenForm}
            />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-8 sm:px-6">
        <div className="sticky top-0 z-20 -mx-4 bg-background/95 px-4 pb-3 pt-4 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <div className="relative">
            <label htmlFor="product-search" className="sr-only">搜尋商品</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="product-search"
              type="search"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              placeholder="搜尋商品名稱或描述"
              className="min-h-11 w-full rounded-control border border-primary/15 bg-atelier-paper pl-10 pr-12 text-sm text-foreground shadow-sm shadow-primary/5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="清除搜尋"
                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-control text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {tabs.length > 1 && (
            <Tabs
              items={tabs}
              value={activeCategory}
              onChange={setActiveCategory}
              ariaLabel="商品分類"
              className="mt-3"
            />
          )}

          {!isStaffMode && (
            <label className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={event => setShowInactive(event.target.checked)}
                className="h-4 w-4 rounded border-primary/30 text-primary focus:ring-primary"
              />
              顯示停用商品
            </label>
          )}
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid gap-3 py-4 sm:grid-cols-2">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id ?? `${product.name}-${product.createdAt}`}
                product={product}
                canEdit={canEditProductBasic}
                coverPhotoVersion={product.id ? coverPhotoVersions[product.id] : null}
                onOpen={openProduct}
              />
            ))}
          </div>
        ) : (
          <StateView
            className="mt-4"
            icon={<Package className="h-5 w-5" aria-hidden="true" />}
            title={searchQuery ? '找不到符合的商品' : '這個分類目前沒有商品'}
            description={searchQuery ? '可清除搜尋或改用其他關鍵字。' : isStaffMode ? '目前沒有可銷售的商品。' : '新增商品後會顯示在這裡。'}
            action={searchQuery
              ? <Button variant="secondary" onClick={() => setSearchQuery('')}>清除搜尋</Button>
              : !isStaffMode
                ? <Button onClick={handleOpenForm} leadingIcon={<Plus className="h-4 w-4" />}>新增商品</Button>
                : undefined}
          />
        )}
      </main>

      {isFormOpen && (
        <AddProductForm isOpen onClose={handleCloseForm} onSuccess={handleAddSuccess} />
      )}
    </div>
  );
}
