import type { Product, ProductCategory } from '@/types/db';

export type ProductListCategory = 'all' | ProductCategory;
export type ProductStockTone = 'good' | 'warn' | 'danger' | 'neutral';

export interface ProductStockState {
  label: string;
  tone: ProductStockTone;
}

interface FilterProductsInput {
  category: ProductListCategory;
  query: string;
  includeInactive: boolean;
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('zh-TW').replace(/\s+/g, ' ');
}

export function filterProductList(
  products: readonly Product[],
  input: FilterProductsInput,
): Product[] {
  const query = normalizeSearch(input.query);

  return products.filter(product => {
    if (!input.includeInactive && !product.isActive) return false;
    if (input.category !== 'all' && product.category !== input.category) return false;
    if (!query) return true;

    const searchText = normalizeSearch([product.name, product.description ?? ''].join(' '));
    return searchText.includes(query);
  });
}

export function getProductStockState(product: Product): ProductStockState {
  if (!product.isActive) return { label: '已停用', tone: 'neutral' };
  if (product.unlimitedStock) return { label: '不限庫存', tone: 'good' };

  const stock = Math.max(0, product.stock ?? 0);
  if (stock === 0) return { label: '已售完', tone: 'danger' };
  if (stock <= 5) return { label: `庫存 ${stock}`, tone: 'warn' };
  return { label: `庫存 ${stock}`, tone: 'good' };
}
