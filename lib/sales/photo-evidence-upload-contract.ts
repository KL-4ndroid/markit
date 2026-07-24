import {
  buildSalesPhotoEvidenceObjectKey,
  SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY,
  type SalesPhotoEvidenceObjectKind,
  type SalesPhotoEvidenceStatus,
} from '@/lib/sales/photo-evidence-model';

export const SALES_PHOTO_EVIDENCE_SIGNED_READ_MAX_TTL_SECONDS = 300;

export type SalesPhotoEvidenceUploadActorRole = 'owner' | 'staff';
export type SalesPhotoEvidenceEvidenceVariantKind = Extract<SalesPhotoEvidenceObjectKind, 'image' | 'thumbnail'>;
export type SalesPhotoEvidenceUploadMimeType = 'image/webp' | 'image/jpeg';

export type SalesPhotoEvidenceUploadedVariantInfo = {
  kind: SalesPhotoEvidenceEvidenceVariantKind;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
};

export type SalesPhotoEvidenceUploadContractInput = {
  actorId: string;
  actorRole: SalesPhotoEvidenceUploadActorRole;
  ownerId: string;
  marketId: string;
  saleId: string;
  evidenceId: string;
  capturedByStaffId: string | null;
  currentStatus: SalesPhotoEvidenceStatus;
  image: SalesPhotoEvidenceUploadedVariantInfo;
  thumbnail: SalesPhotoEvidenceUploadedVariantInfo;
};

export type SalesPhotoEvidenceUploadContract = {
  actorId: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  evidenceId: string;
  imageObjectKey: string;
  thumbnailObjectKey: string;
  acceptedMimeTypes: readonly SalesPhotoEvidenceUploadMimeType[];
  maxFileSizeBytes: number;
};

export type SalesPhotoEvidenceUploadContractRejectReason =
  | 'invalid_identifier'
  | 'unauthorized_actor'
  | 'evidence_not_captured_local'
  | 'invalid_variant_kind'
  | 'unsupported_mime_type'
  | 'invalid_file_size'
  | 'invalid_dimensions';

export type SalesPhotoEvidenceUploadContractDecision =
  | {
      action: 'prepare_upload_contract';
      reason: 'upload_allowed_by_contract';
      contract: SalesPhotoEvidenceUploadContract;
    }
  | {
      action: 'reject_upload_contract';
      reason: SalesPhotoEvidenceUploadContractRejectReason;
      message: string;
    };

export type SalesPhotoEvidenceSignedReadVariantKind = SalesPhotoEvidenceEvidenceVariantKind;

export type SalesPhotoEvidenceSignedReadContractInput = {
  actorId: string;
  actorRole: SalesPhotoEvidenceUploadActorRole;
  ownerId: string;
  capturedByStaffId: string | null;
  status: SalesPhotoEvidenceStatus;
  objectKey: string | null;
  variantKind: SalesPhotoEvidenceSignedReadVariantKind;
  requestedTtlSeconds: number;
};

export type SalesPhotoEvidenceSignedReadContract = {
  actorId: string;
  objectKey: string;
  variantKind: SalesPhotoEvidenceSignedReadVariantKind;
  ttlSeconds: number;
  mustReturnShortLivedUrl: true;
  mustNotReturnPublicUrl: true;
};

export type SalesPhotoEvidenceSignedReadRejectReason =
  | 'invalid_identifier'
  | 'unauthorized_actor'
  | 'evidence_not_uploaded'
  | 'missing_object_key'
  | 'invalid_ttl';

export type SalesPhotoEvidenceSignedReadContractDecision =
  | {
      action: 'prepare_signed_read_contract';
      reason: 'signed_read_allowed_by_contract';
      contract: SalesPhotoEvidenceSignedReadContract;
    }
  | {
      action: 'reject_signed_read_contract';
      reason: SalesPhotoEvidenceSignedReadRejectReason;
      message: string;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCEPTED_UPLOAD_MIME_TYPES: readonly SalesPhotoEvidenceUploadMimeType[] = ['image/webp', 'image/jpeg'];

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function hasValidIdentifiers(values: readonly string[]): boolean {
  return values.every(isUuid);
}

function isAuthorizedEvidenceActor(
  actorId: string,
  actorRole: SalesPhotoEvidenceUploadActorRole,
  ownerId: string,
  capturedByStaffId: string | null
): boolean {
  if (actorRole === 'owner') return actorId === ownerId;
  return capturedByStaffId !== null && actorId === capturedByStaffId;
}

function isAcceptedMimeType(value: string): value is SalesPhotoEvidenceUploadMimeType {
  return (ACCEPTED_UPLOAD_MIME_TYPES as readonly string[]).includes(value);
}

function isFinitePositiveInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function validateVariant(
  variant: SalesPhotoEvidenceUploadedVariantInfo,
  expectedKind: SalesPhotoEvidenceEvidenceVariantKind
): SalesPhotoEvidenceUploadContractRejectReason | null {
  if (variant.kind !== expectedKind) return 'invalid_variant_kind';
  if (!isAcceptedMimeType(variant.mimeType)) return 'unsupported_mime_type';
  if (
    !isFinitePositiveInteger(variant.fileSizeBytes) ||
    variant.fileSizeBytes > SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes
  ) {
    return 'invalid_file_size';
  }
  if (!isFinitePositiveInteger(variant.width) || !isFinitePositiveInteger(variant.height)) {
    return 'invalid_dimensions';
  }

  return null;
}

function uploadRejectMessage(reason: SalesPhotoEvidenceUploadContractRejectReason): string {
  switch (reason) {
    case 'invalid_identifier':
      return 'Sales photo evidence upload contract received invalid identifiers.';
    case 'unauthorized_actor':
      return 'Actor is not allowed by the upload contract for this evidence row.';
    case 'evidence_not_captured_local':
      return 'Evidence must be captured locally before upload can be prepared.';
    case 'invalid_variant_kind':
      return 'Evidence upload variants must include one image and one thumbnail.';
    case 'unsupported_mime_type':
      return 'Evidence upload variant type is not supported.';
    case 'invalid_file_size':
      return 'Evidence upload variant size is invalid or too large.';
    case 'invalid_dimensions':
      return 'Evidence upload variant dimensions are invalid.';
  }
}

function rejectUpload(
  reason: SalesPhotoEvidenceUploadContractRejectReason
): SalesPhotoEvidenceUploadContractDecision {
  return {
    action: 'reject_upload_contract',
    reason,
    message: uploadRejectMessage(reason),
  };
}

export function createSalesPhotoEvidenceUploadContract(
  input: SalesPhotoEvidenceUploadContractInput
): SalesPhotoEvidenceUploadContractDecision {
  const identifiers = [
    input.actorId,
    input.ownerId,
    input.marketId,
    input.saleId,
    input.evidenceId,
    ...(input.capturedByStaffId === null ? [] : [input.capturedByStaffId]),
  ];
  if (!hasValidIdentifiers(identifiers)) return rejectUpload('invalid_identifier');

  if (!isAuthorizedEvidenceActor(input.actorId, input.actorRole, input.ownerId, input.capturedByStaffId)) {
    return rejectUpload('unauthorized_actor');
  }

  if (input.currentStatus !== 'captured_local') return rejectUpload('evidence_not_captured_local');

  const imageProblem = validateVariant(input.image, 'image');
  if (imageProblem) return rejectUpload(imageProblem);

  const thumbnailProblem = validateVariant(input.thumbnail, 'thumbnail');
  if (thumbnailProblem) return rejectUpload(thumbnailProblem);

  return {
    action: 'prepare_upload_contract',
    reason: 'upload_allowed_by_contract',
    contract: {
      actorId: input.actorId,
      ownerId: input.ownerId,
      marketId: input.marketId,
      saleId: input.saleId,
      evidenceId: input.evidenceId,
      imageObjectKey: buildSalesPhotoEvidenceObjectKey({
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        evidenceId: input.evidenceId,
        kind: 'image',
        extension: input.image.mimeType === 'image/jpeg' ? 'jpg' : 'webp',
      }),
      thumbnailObjectKey: buildSalesPhotoEvidenceObjectKey({
        ownerId: input.ownerId,
        marketId: input.marketId,
        saleId: input.saleId,
        evidenceId: input.evidenceId,
        kind: 'thumbnail',
        extension: input.thumbnail.mimeType === 'image/jpeg' ? 'jpg' : 'webp',
      }),
      acceptedMimeTypes: ACCEPTED_UPLOAD_MIME_TYPES,
      maxFileSizeBytes: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes,
    },
  };
}

function rejectSignedRead(
  reason: SalesPhotoEvidenceSignedReadRejectReason,
  message: string
): SalesPhotoEvidenceSignedReadContractDecision {
  return {
    action: 'reject_signed_read_contract',
    reason,
    message,
  };
}

export function createSalesPhotoEvidenceSignedReadContract(
  input: SalesPhotoEvidenceSignedReadContractInput
): SalesPhotoEvidenceSignedReadContractDecision {
  const identifiers = [
    input.actorId,
    input.ownerId,
    ...(input.capturedByStaffId === null ? [] : [input.capturedByStaffId]),
  ];
  if (!hasValidIdentifiers(identifiers)) {
    return rejectSignedRead('invalid_identifier', 'Sales photo evidence signed read contract received invalid identifiers.');
  }

  if (!isAuthorizedEvidenceActor(input.actorId, input.actorRole, input.ownerId, input.capturedByStaffId)) {
    return rejectSignedRead('unauthorized_actor', 'Actor is not allowed by the signed read contract for this evidence row.');
  }

  if (input.status !== 'uploaded') {
    return rejectSignedRead('evidence_not_uploaded', 'Evidence must be uploaded before signed read can be prepared.');
  }

  if (typeof input.objectKey !== 'string' || input.objectKey.length === 0) {
    return rejectSignedRead('missing_object_key', 'Uploaded evidence must have a private object key.');
  }

  if (
    !Number.isInteger(input.requestedTtlSeconds) ||
    input.requestedTtlSeconds <= 0 ||
    input.requestedTtlSeconds > SALES_PHOTO_EVIDENCE_SIGNED_READ_MAX_TTL_SECONDS
  ) {
    return rejectSignedRead('invalid_ttl', 'Signed read TTL must be positive and within the approved short-lived window.');
  }

  return {
    action: 'prepare_signed_read_contract',
    reason: 'signed_read_allowed_by_contract',
    contract: {
      actorId: input.actorId,
      objectKey: input.objectKey,
      variantKind: input.variantKind,
      ttlSeconds: input.requestedTtlSeconds,
      mustReturnShortLivedUrl: true,
      mustNotReturnPublicUrl: true,
    },
  };
}
