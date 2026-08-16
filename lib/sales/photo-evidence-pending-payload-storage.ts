import { db } from '@/lib/db';
import { SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES } from '@/lib/sales/photo-evidence-model';
import {
  classifySalesPhotoEvidenceCompressionOutput,
  type SalesPhotoEvidenceCompressionOutputInfo,
} from '@/lib/sales/photo-evidence-capture-compression';
import type { LocalPendingSalesPhotoEvidenceCreation } from '@/lib/sales/photo-evidence-pending-creation';

export const SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES =
  SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES;

export type SalesPhotoEvidencePendingPayloadVariant = SalesPhotoEvidenceCompressionOutputInfo & {
  blob: Blob;
  contentHash: string;
};

export type LocalPendingSalesPhotoEvidencePayload = {
  queueId: string;
  saleEventId: string;
  ownerId: string;
  marketId: string;
  capturedByStaffId: string | null;
  image: SalesPhotoEvidencePendingPayloadVariant;
  thumbnail: SalesPhotoEvidencePendingPayloadVariant;
  createdAt: string;
  updatedAt: string;
};

export type PutPendingSalesPhotoEvidencePayloadInput = {
  queueItem: LocalPendingSalesPhotoEvidenceCreation;
  image: SalesPhotoEvidencePendingPayloadVariant;
  thumbnail: SalesPhotoEvidencePendingPayloadVariant;
  now?: string | number | Date;
};

export type PendingSalesPhotoEvidencePayloadValidationFailureReason =
  | 'queue_scope_invalid'
  | 'invalid_image_variant'
  | 'invalid_thumbnail_variant'
  | 'blob_metadata_mismatch'
  | 'content_hash_missing'
  | 'total_payload_too_large'
  | 'invalid_timestamp';

export type PendingSalesPhotoEvidencePayloadValidationDecision =
  | {
      valid: true;
    }
  | {
      valid: false;
      reason: PendingSalesPhotoEvidencePayloadValidationFailureReason;
      message: string;
    };

function normalizeDate(value: string | number | Date, fieldName: string): string {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();

  if (!Number.isFinite(time)) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return date.toISOString();
}

function timestamp(now?: string | number | Date): string {
  return normalizeDate(now ?? new Date(), 'now');
}

function isNonEmptyString(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function variantInfo(variant: SalesPhotoEvidencePendingPayloadVariant): SalesPhotoEvidenceCompressionOutputInfo {
  return {
    mimeType: variant.mimeType,
    fileSizeBytes: variant.fileSizeBytes,
    width: variant.width,
    height: variant.height,
  };
}

function validateVariant(
  variant: SalesPhotoEvidencePendingPayloadVariant,
  kind: 'image' | 'thumbnail'
): PendingSalesPhotoEvidencePayloadValidationDecision {
  const outputDecision = classifySalesPhotoEvidenceCompressionOutput(variantInfo(variant));
  if (!outputDecision.accepted) {
    return {
      valid: false,
      reason: kind === 'image' ? 'invalid_image_variant' : 'invalid_thumbnail_variant',
      message: outputDecision.message,
    };
  }

  if (!(variant.blob instanceof Blob)) {
    return {
      valid: false,
      reason: 'blob_metadata_mismatch',
      message: `${kind} payload must include a Blob.`,
    };
  }

  if (variant.blob.size !== variant.fileSizeBytes || variant.blob.type !== variant.mimeType) {
    return {
      valid: false,
      reason: 'blob_metadata_mismatch',
      message: `${kind} blob metadata must match validated output metadata.`,
    };
  }

  if (!isNonEmptyString(variant.contentHash)) {
    return {
      valid: false,
      reason: 'content_hash_missing',
      message: `${kind} content hash is required before local payload storage.`,
    };
  }

  return { valid: true };
}

export function validatePendingSalesPhotoEvidencePayloadInput(
  input: PutPendingSalesPhotoEvidencePayloadInput
): PendingSalesPhotoEvidencePayloadValidationDecision {
  if (
    input.queueItem.queueId !== input.queueItem.saleEventId ||
    input.queueItem.queueId.length === 0 ||
    input.queueItem.ownerId.length === 0 ||
    input.queueItem.marketId.length === 0
  ) {
    return {
      valid: false,
      reason: 'queue_scope_invalid',
      message: 'Pending sales photo evidence payload scope is invalid.',
    };
  }

  const imageDecision = validateVariant(input.image, 'image');
  if (!imageDecision.valid) return imageDecision;

  const thumbnailDecision = validateVariant(input.thumbnail, 'thumbnail');
  if (!thumbnailDecision.valid) return thumbnailDecision;

  if (input.image.fileSizeBytes + input.thumbnail.fileSizeBytes > SALES_PHOTO_EVIDENCE_PENDING_PAYLOAD_MAX_TOTAL_BYTES) {
    return {
      valid: false,
      reason: 'total_payload_too_large',
      message: 'Pending sales photo evidence payload is too large for local temporary storage.',
    };
  }

  try {
    timestamp(input.now);
  } catch {
    return {
      valid: false,
      reason: 'invalid_timestamp',
      message: 'Pending sales photo evidence payload timestamp is invalid.',
    };
  }

  return { valid: true };
}

export async function putPendingSalesPhotoEvidencePayload(
  input: PutPendingSalesPhotoEvidencePayloadInput
): Promise<LocalPendingSalesPhotoEvidencePayload> {
  const decision = validatePendingSalesPhotoEvidencePayloadInput(input);
  if (!decision.valid) {
    throw new Error(decision.message);
  }

  const now = timestamp(input.now);
  const existing = await db.salesPhotoEvidencePendingPayloads.get(input.queueItem.queueId);

  const row: LocalPendingSalesPhotoEvidencePayload = {
    queueId: input.queueItem.queueId,
    saleEventId: input.queueItem.saleEventId,
    ownerId: input.queueItem.ownerId,
    marketId: input.queueItem.marketId,
    capturedByStaffId: input.queueItem.capturedByStaffId,
    image: input.image,
    thumbnail: input.thumbnail,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await db.salesPhotoEvidencePendingPayloads.put(row);

  return row;
}

export async function getPendingSalesPhotoEvidencePayload(
  queueId: string
): Promise<LocalPendingSalesPhotoEvidencePayload | null> {
  if (!isNonEmptyString(queueId)) return null;
  return (await db.salesPhotoEvidencePendingPayloads.get(queueId)) ?? null;
}

export async function deletePendingSalesPhotoEvidencePayload(queueId: string): Promise<void> {
  if (!isNonEmptyString(queueId)) return;
  await db.salesPhotoEvidencePendingPayloads.delete(queueId);
}

export async function deletePendingSalesPhotoEvidencePayloads(queueIds: readonly string[]): Promise<void> {
  const ids = Array.from(new Set(queueIds.filter(isNonEmptyString)));
  if (ids.length === 0) return;
  await db.salesPhotoEvidencePendingPayloads.bulkDelete(ids);
}
