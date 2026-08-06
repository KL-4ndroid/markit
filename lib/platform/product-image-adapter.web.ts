import { PRODUCT_COVER_PHOTO_POLICY, type PreparedProductCoverPhoto } from '@/lib/products/product-cover-photo-model';
import type { ProductImageAdapter } from './product-image-capability';

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close(): void }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('image_decode_failed'));
    image.src = url;
  });
  return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

async function render(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, maxEdge: number, maxBytes: number) {
  let scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  while (scale > 0.25) {
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('image_processing_unavailable');
    context.drawImage(source, 0, 0, width, height);
    for (let quality = PRODUCT_COVER_PHOTO_POLICY.startQuality; quality >= PRODUCT_COVER_PHOTO_POLICY.minQuality; quality -= 0.07) {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.size <= maxBytes) return { blob, width, height };
    }
    scale *= 0.85;
  }
  throw new Error('image_cannot_be_compressed');
}

async function prepare(file: File): Promise<PreparedProductCoverPhoto> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('unsupported_image_type');
  if (file.size < 1 || file.size > PRODUCT_COVER_PHOTO_POLICY.maxSourceBytes) throw new Error('source_image_too_large');
  const decoded = await decode(file);
  try {
    if (decoded.width * decoded.height > PRODUCT_COVER_PHOTO_POLICY.maxSourcePixels) throw new Error('source_image_dimensions_too_large');
    const display = await render(decoded.source, decoded.width, decoded.height, PRODUCT_COVER_PHOTO_POLICY.displayMaxEdgePx, PRODUCT_COVER_PHOTO_POLICY.displayMaxBytes);
    const thumbnail = await render(decoded.source, decoded.width, decoded.height, PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxEdgePx, PRODUCT_COVER_PHOTO_POLICY.thumbnailMaxBytes);
    return {
      display: display.blob,
      thumbnail: thumbnail.blob,
      width: display.width,
      height: display.height,
      displayHash: await sha256(display.blob),
      thumbnailHash: await sha256(thumbnail.blob),
      previewUrl: URL.createObjectURL(display.blob),
    };
  } finally {
    decoded.close();
  }
}

export const webProductImageAdapter: ProductImageAdapter = { prepare };
