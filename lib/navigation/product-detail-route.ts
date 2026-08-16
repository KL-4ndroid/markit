export const PRODUCT_DETAIL_PATH = '/products/detail/';

export function normalizeProductDetailId(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function buildProductDetailHref(productId: string): string {
  const normalizedProductId = normalizeProductDetailId(productId);

  if (!normalizedProductId) {
    throw new TypeError('A product id is required to build a product detail URL.');
  }

  return `${PRODUCT_DETAIL_PATH}?id=${encodeURIComponent(normalizedProductId)}`;
}
