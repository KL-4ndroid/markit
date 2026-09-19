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
export const SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES = 1_500_000;
export const SALES_PHOTO_EVIDENCE_TARGET_MAX_EDGE_PX = 2048;
export const SALES_PHOTO_EVIDENCE_FALLBACK_MAX_EDGE_PX = 1800;
export const SALES_PHOTO_EVIDENCE_THUMBNAIL_MAX_EDGE_PX = 320;
export const SALES_PHOTO_EVIDENCE_START_QUALITY = 0.82;
export const SALES_PHOTO_EVIDENCE_MIN_QUALITY = 0.65;

export type SalesPhotoEvidenceObjectKind = 'image' | 'thumbnail';

export type SalesPhotoEvidenceRequirementInput = {
  ownerId: string;
  marketId: string;
  saleEventId: string;
  saleCompletedAt: string | number | Date;
  marketRequiresEvidence: boolean;
  capturedByStaffId?: string | null;
  now?: string | number | Date;
  existingEvidence?: readonly SalesPhotoEvidenceExistingRow[];
};

export type SalesPhotoEvidenceExistingRow = {
  id?: string;
  sale_id?: string;
  saleId?: string;
  deleted_at?: string | null;
  deletedAt?: string | null;
  status?: SalesPhotoEvidenceStatus;
};

export type SalesPhotoEvidencePendingDraft = {
  owner_id: string;
  market_id: string;
  sale_id: string;
  captured_by_staff_id: string | null;
  status: 'pending_capture';
  sale_completed_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: null;
};

export type SalesPhotoEvidenceRequirementDecision =
  | {
      action: 'not_required';
      reason: 'market_not_required';
    }
  | {
      action: 'skip_existing';
      reason: 'active_evidence_exists';
      existingEvidence: SalesPhotoEvidenceExistingRow;
    }
  | {
      action: 'create_pending';
      reason: 'market_requires_evidence';
      draft: SalesPhotoEvidencePendingDraft;
    };

export type SalesPhotoEvidenceObjectKeyInput = {
  ownerId: string;
  marketId: string;
  saleId: string;
  evidenceId: string;
  kind?: SalesPhotoEvidenceObjectKind;
  extension?: 'webp' | 'jpg' | 'jpeg';
};

export type SalesPhotoEvidenceObjectKeyBindingInput = {
  key: string | null;
  ownerId: string;
  marketId: string;
  saleId: string;
  evidenceId: string;
  kind: SalesPhotoEvidenceObjectKind;
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireObjectKeySegment(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (!OBJECT_KEY_SEGMENT_PATTERN.test(value)) {
    throw new Error(`${fieldName} contains invalid object-key characters`);
  }

  return value;
}

function requireUuid(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  if (!UUID_PATTERN.test(value)) {
    throw new Error(`${fieldName} must be a UUID`);
  }

  return value;
}

function normalizeEvidenceDate(value: string | number | Date, fieldName: string): string {
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();

  if (!Number.isFinite(time)) {
    throw new Error(`${fieldName} must be a valid date`);
  }

  return date.toISOString();
}

function getEvidenceSaleId(row: SalesPhotoEvidenceExistingRow): string | undefined {
  return row.sale_id ?? row.saleId;
}

function isEvidenceRowActive(row: SalesPhotoEvidenceExistingRow): boolean {
  return (row.deleted_at ?? row.deletedAt ?? null) === null;
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

export function findActiveSalesPhotoEvidenceForSale(
  existingEvidence: readonly SalesPhotoEvidenceExistingRow[] | undefined,
  saleEventId: string
): SalesPhotoEvidenceExistingRow | null {
  if (!existingEvidence || existingEvidence.length === 0) return null;

  return existingEvidence.find(row => getEvidenceSaleId(row) === saleEventId && isEvidenceRowActive(row)) ?? null;
}

export function createSalesPhotoEvidenceRequirementDecision(
  input: SalesPhotoEvidenceRequirementInput
): SalesPhotoEvidenceRequirementDecision {
  if (!input.marketRequiresEvidence) {
    return {
      action: 'not_required',
      reason: 'market_not_required',
    };
  }

  const ownerId = requireUuid(input.ownerId, 'ownerId');
  const marketId = requireUuid(input.marketId, 'marketId');
  const saleEventId = requireUuid(input.saleEventId, 'saleEventId');
  const capturedByStaffId =
    input.capturedByStaffId == null ? null : requireUuid(input.capturedByStaffId, 'capturedByStaffId');
  const saleCompletedAt = normalizeEvidenceDate(input.saleCompletedAt, 'saleCompletedAt');
  const now = normalizeEvidenceDate(input.now ?? new Date(), 'now');

  const existingEvidence = findActiveSalesPhotoEvidenceForSale(input.existingEvidence, saleEventId);
  if (existingEvidence) {
    return {
      action: 'skip_existing',
      reason: 'active_evidence_exists',
      existingEvidence,
    };
  }

  return {
    action: 'create_pending',
    reason: 'market_requires_evidence',
    draft: {
      owner_id: ownerId,
      market_id: marketId,
      sale_id: saleEventId,
      captured_by_staff_id: capturedByStaffId,
      status: 'pending_capture',
      sale_completed_at: saleCompletedAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  };
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

/**
 * Verifies that an R2 key is the exact canonical key for one evidence variant.
 * Prefix-only checks are insufficient because they can allow a row to point at
 * another owner's or sale's object inside the same private bucket.
 */
export function isSalesPhotoEvidenceObjectKeyBoundToIdentity(
  input: SalesPhotoEvidenceObjectKeyBindingInput
): boolean {
  if (typeof input.key !== 'string') return false;

  const extensionSeparator = input.key.lastIndexOf('.');
  if (extensionSeparator <= 0 || extensionSeparator === input.key.length - 1) return false;

  const extension = input.key.slice(extensionSeparator + 1);
  if (!OBJECT_KEY_EXTENSIONS.has(extension)) return false;

  try {
    return input.key === buildSalesPhotoEvidenceObjectKey({
      ownerId: input.ownerId,
      marketId: input.marketId,
      saleId: input.saleId,
      evidenceId: input.evidenceId,
      kind: input.kind,
      extension: extension as 'webp' | 'jpg' | 'jpeg',
    });
  } catch {
    return false;
  }
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
