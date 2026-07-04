export const SALES_PHOTO_EVIDENCE_STATUSES = [
  'not_required',
  'pending_capture',
  'capture_skipped',
  'captured_local',
  'uploading',
  'uploaded',
  'upload_failed',
  'expired',
  'waived_by_owner',
] as const;

export type SalesPhotoEvidenceStatus = (typeof SALES_PHOTO_EVIDENCE_STATUSES)[number];

export const SALES_PHOTO_EVIDENCE_RETENTION_DAYS = 7;
export const SALES_PHOTO_EVIDENCE_RETENTION_PREFIX = `${SALES_PHOTO_EVIDENCE_RETENTION_DAYS}d` as const;
export const SALES_PHOTO_EVIDENCE_MAX_FILE_SIZE_BYTES = 1_000_000;
export const SALES_PHOTO_EVIDENCE_TARGET_MAX_EDGE_PX = 2048;
export const SALES_PHOTO_EVIDENCE_FALLBACK_MAX_EDGE_PX = 1800;
export const SALES_PHOTO_EVIDENCE_THUMBNAIL_MAX_EDGE_PX = 320;
export const SALES_PHOTO_EVIDENCE_START_QUALITY = 0.82;
export const SALES_PHOTO_EVIDENCE_MIN_QUALITY = 0.65;

export type SalesPhotoEvidenceObjectKind = 'image' | 'thumbnail';

export type SalesPhotoEvidenceObjectKeyInput = {
  ownerId: string;
  marketId: string;
  saleId: string;
  evidenceId: string;
  kind?: SalesPhotoEvidenceObjectKind;
  extension?: 'webp' | 'jpg' | 'jpeg';
};

export type SalesPhotoEvidenceCompressionPolicy = {
  targetMaxEdgePx: number;
  fallbackMaxEdgePx: number;
  thumbnailMaxEdgePx: number;
  maxFileSizeBytes: number;
  startQuality: number;
  minQuality: number;
  preferredMimeType: 'image/webp';
  fallbackMimeType: 'image/jpeg';
  stripExif: true;
};

export const SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY: SalesPhotoEvidenceCompressionPolicy = Object.freeze({
  targetMaxEdgePx: SALES_PHOTO_EVIDENCE_TARGET_MAX_EDGE_PX,
  fallbackMaxEdgePx: SALES_PHOTO_EVIDENCE_FALLBACK_MAX_EDGE_PX,
  thumbnailMaxEdgePx: SALES_PHOTO_EVIDENCE_THUMBNAIL_MAX_EDGE_PX,
  maxFileSizeBytes: SALES_PHOTO_EVIDENCE_MAX_FILE_SIZE_BYTES,
  startQuality: SALES_PHOTO_EVIDENCE_START_QUALITY,
  minQuality: SALES_PHOTO_EVIDENCE_MIN_QUALITY,
  preferredMimeType: 'image/webp',
  fallbackMimeType: 'image/jpeg',
  stripExif: true,
});

const SALES_PHOTO_EVIDENCE_TRANSITIONS: Readonly<Record<SalesPhotoEvidenceStatus, readonly SalesPhotoEvidenceStatus[]>> = {
  not_required: [],
  pending_capture: ['capture_skipped', 'captured_local', 'waived_by_owner'],
  capture_skipped: ['captured_local', 'waived_by_owner'],
  captured_local: ['uploading', 'upload_failed'],
  uploading: ['uploaded', 'upload_failed'],
  uploaded: ['expired', 'captured_local'],
  upload_failed: ['uploading', 'captured_local', 'waived_by_owner'],
  expired: [],
  waived_by_owner: [],
};

const OBJECT_KEY_SEGMENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const OBJECT_KEY_EXTENSIONS = new Set(['webp', 'jpg', 'jpeg']);

function requireObjectKeySegment(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (!OBJECT_KEY_SEGMENT_PATTERN.test(value)) {
    throw new Error(`${fieldName} contains invalid object-key characters`);
  }

  return value;
}

export function isSalesPhotoEvidenceStatus(value: string): value is SalesPhotoEvidenceStatus {
  return (SALES_PHOTO_EVIDENCE_STATUSES as readonly string[]).includes(value);
}

export function getAllowedSalesPhotoEvidenceTransitions(
  status: SalesPhotoEvidenceStatus
): readonly SalesPhotoEvidenceStatus[] {
  return SALES_PHOTO_EVIDENCE_TRANSITIONS[status];
}

export function canTransitionSalesPhotoEvidenceStatus(
  from: SalesPhotoEvidenceStatus,
  to: SalesPhotoEvidenceStatus
): boolean {
  return SALES_PHOTO_EVIDENCE_TRANSITIONS[from].includes(to);
}

export function buildSalesPhotoEvidenceObjectKey(input: SalesPhotoEvidenceObjectKeyInput): string {
  const kind = input.kind ?? 'image';
  const root = kind === 'thumbnail' ? 'sales-evidence-thumbs' : 'sales-evidence';
  const extension = input.extension ?? 'webp';

  if (!OBJECT_KEY_EXTENSIONS.has(extension)) {
    throw new Error('extension is not supported for sales photo evidence');
  }

  return [
    root,
    SALES_PHOTO_EVIDENCE_RETENTION_PREFIX,
    requireObjectKeySegment(input.ownerId, 'ownerId'),
    requireObjectKeySegment(input.marketId, 'marketId'),
    requireObjectKeySegment(input.saleId, 'saleId'),
    `${requireObjectKeySegment(input.evidenceId, 'evidenceId')}.${extension}`,
  ].join('/');
}

export function getSalesPhotoEvidenceExpiresAt(uploadedAt: string | Date): string {
  const uploadedDate = typeof uploadedAt === 'string' ? new Date(uploadedAt) : uploadedAt;
  const uploadedTime = uploadedDate.getTime();

  if (!Number.isFinite(uploadedTime)) {
    throw new Error('uploadedAt must be a valid date');
  }

  return new Date(
    uploadedTime + SALES_PHOTO_EVIDENCE_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
}
