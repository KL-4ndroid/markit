import { SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY } from '@/lib/sales/photo-evidence-model';
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

  return {
    ok: true,
    request: {
      ownerId,
      marketId,
      saleEventId,
      capturedByStaffId,
      capturedAt,
      queueId,
      image,
      thumbnail,
      imageMetadata,
      thumbnailMetadata,
    },
  };
}
