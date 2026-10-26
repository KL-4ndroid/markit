import { marketProductOriginParams, type MarketProductOrigin } from './market-product-return';

export const PRODUCT_DETAIL_PATH = '/products/detail/';

export function normalizeProductDetailId(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function buildProductDetailHref(productId: string, origin: MarketProductOrigin = {}): string {
  const normalizedProductId = normalizeProductDetailId(productId);

  if (!normalizedProductId) {
    throw new TypeError('A product id is required to build a product detail URL.');
  }

  const context = marketProductOriginParams(origin).toString();
  return `${PRODUCT_DETAIL_PATH}?id=${encodeURIComponent(normalizedProductId)}${context ? `&${context}` : ''}`;
}
