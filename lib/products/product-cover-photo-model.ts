export const PRODUCT_COVER_PHOTO_POLICY = Object.freeze({
  maxSourceBytes: 25_000_000,
  maxSourcePixels: 24_000_000,
  displayMaxEdgePx: 1600,
  thumbnailMaxEdgePx: 480,
  displayMaxBytes: 600_000,
  thumbnailMaxBytes: 150_000,
  startQuality: 0.8,
  minQuality: 0.65,
});

export type ProductCoverPhotoCapability = {
  canManage: boolean;
  canDelete: boolean;
  reason: 'paid_active' | 'free_plan' | 'permission_denied' | 'unavailable';
};

export type PreparedProductCoverPhoto = {
  display: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  displayHash: string;
  thumbnailHash: string;
  previewUrl: string;
};

export function buildProductCoverPhotoObjectKey(input: {
  ownerId: string; productId: string; photoId: string; version: number; variant: 'display' | 'thumbnail'; mimeType: string;
}): string {
  const extension = input.mimeType === 'image/jpeg' ? 'jpg' : 'webp';
  return `product-cover-photos/${input.ownerId}/${input.productId}/${input.photoId}/v${input.version}/${input.variant}.${extension}`;
}

export function getProductCoverPhotoImagePath(productId: string, variant: 'display' | 'thumbnail', version?: number): string {
  const params = new URLSearchParams({ productId, variant });
  if (version) params.set('version', String(version));
  return `/api/product-cover-photo/image?${params.toString()}`;
}
