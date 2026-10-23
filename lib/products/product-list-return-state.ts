import { getSessionStatePort } from '@/lib/platform/session-state-capability';
import type { ProductListCategory } from './product-list-view-model';

export interface ProductListReturnState {
  category: ProductListCategory;
  query: string;
  showInactive: boolean;
  scrollY: number;
}
const CATEGORIES = new Set(['all', 'handmade', 'food', 'accessory', 'clothing', 'art', 'stationery', 'other']);
export function productListStateKey(actorId: string, ownerId: string, staff: boolean): string {
  return `product-list:return-state:v2:${actorId}:${ownerId}:${staff ? 'staff' : 'owner'}`;
}
export function readProductListState(key: string): ProductListReturnState | null {
  try {
    const raw = getSessionStatePort().read(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProductListReturnState> | null;
    if (!parsed || !CATEGORIES.has(parsed.category ?? '')) return null;
    return {
      category: parsed.category as ProductListCategory,
      query: typeof parsed.query === 'string' ? parsed.query : '',
      showInactive: parsed.showInactive === true,
      scrollY: typeof parsed.scrollY === 'number' && Number.isFinite(parsed.scrollY) ? Math.max(0, parsed.scrollY) : 0,
    };
  } catch { return null; }
}
export function writeProductListState(key: string, state: ProductListReturnState): void {
  try { getSessionStatePort().write(key, JSON.stringify(state)); } catch { /* Optional view state. */ }
}
