import {
  SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY,
  SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES,
} from '@/lib/sales/photo-evidence-model';
import type {
  SalesPhotoEvidenceEvidenceVariantKind,
  SalesPhotoEvidenceUploadedVariantInfo,
  SalesPhotoEvidenceUploadMimeType,
} from '@/lib/sales/photo-evidence-upload-contract';

export type SalesPhotoEvidenceUploadFormDataRequest = {
  ownerId: string;
  marketId: string;
  saleEventId: string;
  capturedByStaffId: string | null;
  capturedAt: string;
  saleCompletedAt: string;
  queueId: string | null;
  image: Blob;
  thumbnail: Blob;
  imageMetadata: SalesPhotoEvidenceUploadedVariantInfo;
  thumbnailMetadata: SalesPhotoEvidenceUploadedVariantInfo;
};

export type SalesPhotoEvidenceUploadFormDataParseResult =
  | {
      ok: true;
      request: SalesPhotoEvidenceUploadFormDataRequest;
    }
  | {
      ok: false;
      code: 'invalid_upload_form_data';
      message: string;
    };

export type SalesPhotoEvidenceUploadPayloadSignatureValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: 'invalid_upload_form_data';
      message: string;
    };

const ACCEPTED_UPLOAD_MIME_TYPES: readonly SalesPhotoEvidenceUploadMimeType[] = ['image/webp', 'image/jpeg'];

function invalid(message: string): SalesPhotoEvidenceUploadFormDataParseResult {
  return {
    ok: false,
    code: 'invalid_upload_form_data',
    message,
  };
}

function getSingleStringField(formData: FormData, name: string): string | null {
  const values = formData.getAll(name);
  if (values.length !== 1 || typeof values[0] !== 'string') return null;

  const value = values[0].trim();
  return value.length > 0 ? value : null;
}

function getOptionalStringField(formData: FormData, name: string): string | null {
  const values = formData.getAll(name);
  if (values.length === 0) return null;
  if (values.length !== 1 || typeof values[0] !== 'string') return null;

  const value = values[0].trim();
  return value.length > 0 ? value : null;
}

function getSingleBlobField(formData: FormData, name: string): Blob | null {
  const values = formData.getAll(name);
  if (values.length !== 1) return null;

  const value = values[0];
  return value instanceof Blob ? value : null;
}

function isAcceptedMimeType(value: string): value is SalesPhotoEvidenceUploadMimeType {
  return (ACCEPTED_UPLOAD_MIME_TYPES as readonly string[]).includes(value);
}

function hasBytePrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value);
}

/**
 * Checks the file signature instead of trusting Blob.type or client metadata.
 * This intentionally performs only the narrow JPEG/WebP validation required by
 * the upload contract; full image decoding remains a separate concern.
 */
export async function hasSalesPhotoEvidenceUploadMimeSignature(
  file: Blob,
  declaredMimeType: SalesPhotoEvidenceUploadMimeType
): Promise<boolean> {
  try {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());

    if (declaredMimeType === 'image/jpeg') {
      return bytes.length >= 3 && hasBytePrefix(bytes, [0xff, 0xd8, 0xff]);
    }

    return bytes.length >= 12
      && hasBytePrefix(bytes, [0x52, 0x49, 0x46, 0x46])
      && hasBytePrefix(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]);
  } catch {
    return false;
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function parseVariantMetadata(
  value: string,
  expectedKind: SalesPhotoEvidenceEvidenceVariantKind,
  file: Blob
): SalesPhotoEvidenceUploadedVariantInfo | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;
  const record = parsed as Record<string, unknown>;

  if (record.kind !== expectedKind) return null;
  if (!isAcceptedMimeType(String(record.mimeType))) return null;
  if (record.mimeType !== file.type) return null;
  if (!isPositiveInteger(record.fileSizeBytes) || record.fileSizeBytes !== file.size) return null;
  if (record.fileSizeBytes > SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes) return null;
  if (!isPositiveInteger(record.width) || !isPositiveInteger(record.height)) return null;

  return {
    kind: expectedKind,
    mimeType: record.mimeType,
    fileSizeBytes: record.fileSizeBytes,
    width: record.width,
    height: record.height,
  };
}

export function parseSalesPhotoEvidenceUploadFormData(
  formData: FormData
): SalesPhotoEvidenceUploadFormDataParseResult {
  const ownerId = getSingleStringField(formData, 'ownerId');
  const marketId = getSingleStringField(formData, 'marketId');
  const saleEventId = getSingleStringField(formData, 'saleEventId');
  const capturedAt = getSingleStringField(formData, 'capturedAt');
  const saleCompletedAt = getOptionalStringField(formData, 'saleCompletedAt');
  const capturedByStaffId = getOptionalStringField(formData, 'capturedByStaffId');
  const queueId = getOptionalStringField(formData, 'queueId');

  if (!ownerId || !marketId || !saleEventId || !capturedAt) {
    return invalid('Sales photo evidence upload form data is missing required text fields.');
  }

  const image = getSingleBlobField(formData, 'image');
  const thumbnail = getSingleBlobField(formData, 'thumbnail');
  if (!image || !thumbnail) {
    return invalid('Sales photo evidence upload form data must include one image and one thumbnail.');
  }

  const imageMetadataText = getSingleStringField(formData, 'imageMetadata');
  const thumbnailMetadataText = getSingleStringField(formData, 'thumbnailMetadata');
  if (!imageMetadataText || !thumbnailMetadataText) {
    return invalid('Sales photo evidence upload form data is missing metadata.');
  }

  const imageMetadata = parseVariantMetadata(imageMetadataText, 'image', image);
  const thumbnailMetadata = parseVariantMetadata(thumbnailMetadataText, 'thumbnail', thumbnail);
  if (!imageMetadata || !thumbnailMetadata) {
    return invalid('Sales photo evidence upload form data metadata is invalid.');
  }

  if (image.size + thumbnail.size > SALES_PHOTO_EVIDENCE_MAX_TOTAL_PAYLOAD_BYTES) {
    return invalid('Sales photo evidence upload payload exceeds the combined size limit.');
  }

  return {
    ok: true,
    request: {
      ownerId,
      marketId,
      saleEventId,
      capturedByStaffId,
      capturedAt,
      saleCompletedAt: saleCompletedAt ?? capturedAt,
      queueId,
      image,
      thumbnail,
      imageMetadata,
      thumbnailMetadata,
    },
  };
}

export async function validateSalesPhotoEvidenceUploadPayloadSignatures(
  request: SalesPhotoEvidenceUploadFormDataRequest
): Promise<SalesPhotoEvidenceUploadPayloadSignatureValidationResult> {
  const [imageSignatureValid, thumbnailSignatureValid] = await Promise.all([
    hasSalesPhotoEvidenceUploadMimeSignature(
      request.image,
      request.imageMetadata.mimeType as SalesPhotoEvidenceUploadMimeType
    ),
    hasSalesPhotoEvidenceUploadMimeSignature(
      request.thumbnail,
      request.thumbnailMetadata.mimeType as SalesPhotoEvidenceUploadMimeType
    ),
  ]);

  if (!imageSignatureValid || !thumbnailSignatureValid) {
    return {
      ok: false,
      code: 'invalid_upload_form_data',
      message: 'Sales photo evidence upload payload signature does not match its declared MIME type.',
    };
  }

  return { ok: true };
}

/**
 * Async server-facing parser that adds byte-signature validation while keeping
 * parseSalesPhotoEvidenceUploadFormData() available to existing synchronous
 * model callers.
 */
export async function parseAndValidateSalesPhotoEvidenceUploadFormData(
  formData: FormData
): Promise<SalesPhotoEvidenceUploadFormDataParseResult> {
  const parsed = parseSalesPhotoEvidenceUploadFormData(formData);
  if (!parsed.ok) return parsed;

  const signatureValidation = await validateSalesPhotoEvidenceUploadPayloadSignatures(parsed.request);
  if (!signatureValidation.ok) return signatureValidation;

  return parsed;
}
