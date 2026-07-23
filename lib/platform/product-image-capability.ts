import type { PreparedProductCoverPhoto } from '@/lib/products/product-cover-photo-model';

export interface ProductImageAdapter {
  prepare(file: File): Promise<PreparedProductCoverPhoto>;
}

let adapterPromise: Promise<ProductImageAdapter> | null = null;

export function getProductImageAdapter(): Promise<ProductImageAdapter> {
  adapterPromise ??= import('./product-image-adapter.web').then(module => module.webProductImageAdapter);
  return adapterPromise;
}
