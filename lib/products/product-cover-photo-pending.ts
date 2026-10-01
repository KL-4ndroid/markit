'use client';

import { db } from '@/lib/db';
import type { PreparedProductCoverPhoto } from './product-cover-photo-model';
import { uploadProductCoverPhoto } from './product-cover-photo-client';

export interface LocalPendingProductCoverPhoto {
  productId: string;
  width: number;
  height: number;
  displayHash: string;
  thumbnailHash: string;
  version: number;
  status: 'pending' | 'uploading' | 'failed';
  errorCode?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalPendingProductCoverPhotoPayload {
  productId: string;
  display: Blob;
  thumbnail: Blob;
  updatedAt: number;
}

export type ProductCoverPhotoUploadOutcome = 'uploaded' | 'queued';

export async function uploadOrQueueProductCoverPhoto(
  productId: string,
  photo: PreparedProductCoverPhoto,
): Promise<ProductCoverPhotoUploadOutcome> {
  const now = Date.now();
  const pending: LocalPendingProductCoverPhoto = {
    productId,
    width: photo.width,
    height: photo.height,
    displayHash: photo.displayHash,
    thumbnailHash: photo.thumbnailHash,
    version: now,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction('rw', db.productCoverPhotoPendingUploads, db.productCoverPhotoPendingPayloads, async () => {
    await db.productCoverPhotoPendingUploads.put(pending);
    await db.productCoverPhotoPendingPayloads.put({
      productId,
      display: photo.display,
      thumbnail: photo.thumbnail,
      updatedAt: now,
    });
  });

  try {
    await db.productCoverPhotoPendingUploads.update(productId, { status: 'uploading', updatedAt: Date.now() });
    await uploadProductCoverPhoto(productId, photo, pending.version);
    await db.transaction('rw', db.productCoverPhotoPendingUploads, db.productCoverPhotoPendingPayloads, async () => {
      await db.productCoverPhotoPendingUploads.delete(productId);
      await db.productCoverPhotoPendingPayloads.delete(productId);
    });
    return 'uploaded';
  } catch (error) {
    await db.productCoverPhotoPendingUploads.update(productId, {
      status: 'failed',
      errorCode: error instanceof Error ? error.message : 'upload_failed',
      updatedAt: Date.now(),
    });
    return 'queued';
  }
}

export async function retryPendingProductCoverPhoto(productId: string): Promise<ProductCoverPhotoUploadOutcome | null> {
  const pending = await db.productCoverPhotoPendingUploads.get(productId);
  const payload = await db.productCoverPhotoPendingPayloads.get(productId);
  if (!pending || !payload) return null;
  const previewUrl = URL.createObjectURL(payload.display);
  try {
    return await uploadOrQueueProductCoverPhoto(productId, {
      ...pending,
      display: payload.display,
      thumbnail: payload.thumbnail,
      previewUrl,
    });
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}
