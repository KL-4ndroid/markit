'use client';

import {
  BookOpen,
  Cookie,
  Gem,
  Hand,
  MoreHorizontal,
  Package,
  Palette,
  Shirt,
  type LucideIcon,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { ProductCoverPhotoImage } from '@/components/products/ProductCoverPhotoImage';
import { buildProductDetailHref } from '@/lib/navigation/product-detail-route';
import { getProductStockState, type ProductStockTone } from '@/lib/products/product-list-view-model';
import { formatCurrency } from '@/lib/utils';
import type { Product, ProductCategory } from '@/types/db';

interface ProductCardProps {
  product: Product;
  onOpen?: (product: Product) => void;
  canEdit?: boolean;
  coverPhotoVersion?: number | null;
}

const CATEGORY_PRESENTATION: Record<ProductCategory, {
  label: string;
  icon: LucideIcon;
  background: string;
}> = {
  handmade: { label: '手作', icon: Hand, background: 'bg-soft-pink' },
  food: { label: '食品', icon: Cookie, background: 'bg-soft-yellow' },
  accessory: { label: '飾品', icon: Gem, background: 'bg-soft-green' },
  clothing: { label: '服飾', icon: Shirt, background: 'bg-cat-clothing' },
  art: { label: '藝術', icon: Palette, background: 'bg-cat-art' },
  stationery: { label: '文具', icon: BookOpen, background: 'bg-cat-stationery' },
  other: { label: '其他', icon: MoreHorizontal, background: 'bg-cat-other' },
};

const STOCK_TONE_CLASSES: Record<ProductStockTone, string> = {
  good: 'bg-status-good-bg text-status-good-text',
  warn: 'bg-status-warn-bg text-status-warn-text',
  danger: 'bg-status-danger-bg text-status-danger-text',
  neutral: 'bg-muted text-muted-foreground',
};

export function ProductCard({ product, onOpen, canEdit = false, coverPhotoVersion }: ProductCardProps) {
  const router = useRouter();
  const category = CATEGORY_PRESENTATION[product.category] ?? {
    label: '其他',
    icon: Package,
    background: 'bg-cat-other',
  };
  const CategoryIcon = category.icon;
  const stockState = getProductStockState(product);

  const handleOpen = () => {
    if (onOpen) {
      onOpen(product);
      return;
    }
    if (product.id) router.push(buildProductDetailHref(product.id));
  };

  return (
    <article className="flex min-h-48 flex-col overflow-hidden rounded-card border border-primary/10 bg-atelier-paper shadow-atelier transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-atelier-lift">
      <div className={`aspect-[4/3] flex items-center justify-center overflow-hidden ${category.background}`}>
        {coverPhotoVersion ? (
          <ProductCoverPhotoImage
            productId={product.id}
            productName={product.name}
            variant="thumbnail"
            fallback={<CategoryIcon className="h-8 w-8 text-foreground/60" aria-hidden="true" />}
          />
        ) : (
          <CategoryIcon className="h-8 w-8 text-foreground/60" aria-hidden="true" />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs text-muted-foreground">{category.label}</span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STOCK_TONE_CLASSES[stockState.tone]}`}>
          {stockState.label}
        </span>
      </div>

      <div className="mt-2 min-w-0 flex-1">
        <h2 className="mt-1 break-words text-base font-semibold text-foreground">{product.name}</h2>
        <p className="mt-2 text-xl font-semibold tabular-nums text-primary">{formatCurrency(product.price)}</p>
      </div>

      <Button variant="secondary" className="mt-4 w-full" onClick={handleOpen}>
        {canEdit ? '查看與編輯' : '查看商品'}
      </Button>
      </div>
    </article>
  );
}
