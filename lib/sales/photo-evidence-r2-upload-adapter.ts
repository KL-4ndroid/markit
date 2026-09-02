import { SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY } from '@/lib/sales/photo-evidence-model';
import type { SalesPhotoEvidenceUploadMimeType } from '@/lib/sales/photo-evidence-upload-contract';

export type SalesPhotoEvidenceR2UploadObjectBody = Blob | ArrayBuffer | Uint8Array;

export type SalesPhotoEvidenceR2UploadObjectInput = {
  key: string;
  body: SalesPhotoEvidenceR2UploadObjectBody;
  contentType: SalesPhotoEvidenceUploadMimeType;
  contentLength: number;
};

export type SalesPhotoEvidenceR2UploadObjectSuccess = {
  ok: true;
  key: string;
  etag?: string;
};

export type SalesPhotoEvidenceR2UploadObjectFailure = {
  ok: false;
  key: string;
  code: 'invalid_upload_object' | 'r2_upload_failed';
  message: string;
};

export type SalesPhotoEvidenceR2UploadObjectResult =
  | SalesPhotoEvidenceR2UploadObjectSuccess
  | SalesPhotoEvidenceR2UploadObjectFailure;

export type SalesPhotoEvidenceR2DeleteObjectInput = {
  key: string;
};

export type SalesPhotoEvidenceR2DeleteObjectSuccess = {
  ok: true;
  key: string;
};

export type SalesPhotoEvidenceR2DeleteObjectFailure = {
  ok: false;
  key: string;
  code: 'invalid_delete_object' | 'r2_delete_failed';
  message: string;
};

export type SalesPhotoEvidenceR2DeleteObjectResult =
  | SalesPhotoEvidenceR2DeleteObjectSuccess
  | SalesPhotoEvidenceR2DeleteObjectFailure;

export type SalesPhotoEvidenceR2UploadAdapter = {
  uploadObject(input: SalesPhotoEvidenceR2UploadObjectInput): Promise<SalesPhotoEvidenceR2UploadObjectResult>;
  deleteObject(input: SalesPhotoEvidenceR2DeleteObjectInput): Promise<SalesPhotoEvidenceR2DeleteObjectResult>;
};

export type SalesPhotoEvidenceR2ServerConfig = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint?: string;
};

export type SalesPhotoEvidenceR2ConfigValidationResult =
  | {
      ok: true;
      config: SalesPhotoEvidenceR2ServerConfig;
    }
  | {
      ok: false;
      code: 'missing_r2_config';
      missing: readonly (keyof SalesPhotoEvidenceR2ServerConfig)[];
    };

const SALES_PHOTO_EVIDENCE_R2_ALLOWED_KEY_PREFIXES = [
  'sales-evidence/7d/',
  'sales-evidence-thumbs/7d/',
] as const;

const SALES_PHOTO_EVIDENCE_R2_ALLOWED_CONTENT_TYPES: readonly SalesPhotoEvidenceUploadMimeType[] = [
  'image/webp',
  'image/jpeg',
];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasAllowedEvidenceKeyPrefix(key: string): boolean {
  return SALES_PHOTO_EVIDENCE_R2_ALLOWED_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}

function hasUnsafeObjectKeySegment(key: string): boolean {
  return key.startsWith('/') || key.includes('..') || key.includes('\\') || key.includes('//');
}

function isAcceptedContentType(value: string): value is SalesPhotoEvidenceUploadMimeType {
  return (SALES_PHOTO_EVIDENCE_R2_ALLOWED_CONTENT_TYPES as readonly string[]).includes(value);
}

function isValidUploadBody(value: unknown): value is SalesPhotoEvidenceR2UploadObjectBody {
  return (
    typeof Blob !== 'undefined' && value instanceof Blob
  ) || value instanceof ArrayBuffer || value instanceof Uint8Array;
}

function isValidEvidenceObjectKey(key: string): boolean {
  return isNonEmptyString(key)
    && hasAllowedEvidenceKeyPrefix(key)
    && !hasUnsafeObjectKeySegment(key);
}

export function validateSalesPhotoEvidenceR2UploadObjectInput(
  input: SalesPhotoEvidenceR2UploadObjectInput
): SalesPhotoEvidenceR2UploadObjectFailure | null {
  if (!isValidEvidenceObjectKey(input.key)) {
    return {
      ok: false,
      key: input.key,
      code: 'invalid_upload_object',
      message: 'Sales photo evidence R2 object key is invalid.',
    };
  }

  if (!isAcceptedContentType(input.contentType)) {
    return {
      ok: false,
      key: input.key,
      code: 'invalid_upload_object',
      message: 'Sales photo evidence R2 object content type is invalid.',
    };
  }

  if (
    !Number.isInteger(input.contentLength) ||
    input.contentLength <= 0 ||
    input.contentLength > SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes
  ) {
    return {
      ok: false,
      key: input.key,
      code: 'invalid_upload_object',
      message: 'Sales photo evidence R2 object content length is invalid.',
    };
  }

  if (!isValidUploadBody(input.body)) {
    return {
      ok: false,
      key: input.key,
      code: 'invalid_upload_object',
      message: 'Sales photo evidence R2 object body is invalid.',
    };
  }

  return null;
}

export function validateSalesPhotoEvidenceR2DeleteObjectInput(
  input: SalesPhotoEvidenceR2DeleteObjectInput
): SalesPhotoEvidenceR2DeleteObjectFailure | null {
  if (isValidEvidenceObjectKey(input.key)) return null;

  return {
    ok: false,
    key: input.key,
    code: 'invalid_delete_object',
    message: 'Sales photo evidence R2 delete object key is invalid.',
  };
}

export function validateSalesPhotoEvidenceR2ServerConfig(
  config: Partial<SalesPhotoEvidenceR2ServerConfig>
): SalesPhotoEvidenceR2ConfigValidationResult {
  const requiredKeys: readonly (keyof SalesPhotoEvidenceR2ServerConfig)[] = [
    'accountId',
    'accessKeyId',
    'secretAccessKey',
    'bucketName',
  ];
  const missing = requiredKeys.filter(key => !isNonEmptyString(config[key]));

  if (missing.length > 0) {
    return {
      ok: false,
      code: 'missing_r2_config',
      missing,
    };
  }

  return {
    ok: true,
    config: {
      accountId: config.accountId as string,
      accessKeyId: config.accessKeyId as string,
      secretAccessKey: config.secretAccessKey as string,
      bucketName: config.bucketName as string,
      endpoint: isNonEmptyString(config.endpoint) ? config.endpoint : undefined,
    },
  };
}
