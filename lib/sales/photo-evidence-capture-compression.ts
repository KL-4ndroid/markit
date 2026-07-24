import {
  SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY,
} from '@/lib/sales/photo-evidence-model';

export const SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES = 25_000_000;

export const SALES_PHOTO_EVIDENCE_CAPTURE_SOURCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type SalesPhotoEvidenceCaptureSourceMimeType =
  (typeof SALES_PHOTO_EVIDENCE_CAPTURE_SOURCE_MIME_TYPES)[number];

export type SalesPhotoEvidenceCapturedImageInfo = {
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
};

export type SalesPhotoEvidenceImageVariantPlan = {
  kind: 'image' | 'thumbnail';
  maxEdgePx: number;
  mimeType: 'image/webp' | 'image/jpeg';
  startQuality: number;
  minQuality: number;
  maxFileSizeBytes: number;
  stripExif: true;
};

export type SalesPhotoEvidenceCompressionPlan = {
  source: {
    mimeType: SalesPhotoEvidenceCaptureSourceMimeType;
    fileSizeBytes: number;
    width: number;
    height: number;
  };
  primary: SalesPhotoEvidenceImageVariantPlan;
  fallback: SalesPhotoEvidenceImageVariantPlan;
  thumbnail: SalesPhotoEvidenceImageVariantPlan;
};

export type SalesPhotoEvidenceCaptureRejectReason =
  | 'unsupported_mime_type'
  | 'source_file_too_large'
  | 'invalid_image_dimensions'
  | 'invalid_file_size';

export type SalesPhotoEvidenceCapturePreparationDecision =
  | {
      action: 'prepare_compression';
      reason: 'supported_image';
      plan: SalesPhotoEvidenceCompressionPlan;
    }
  | {
      action: 'reject_capture';
      reason: SalesPhotoEvidenceCaptureRejectReason;
      message: string;
    };

export type SalesPhotoEvidenceCompressionOutputInfo = {
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
};

export type SalesPhotoEvidenceCompressionOutputDecision =
  | {
      accepted: true;
      reason: 'within_policy';
    }
  | {
      accepted: false;
      reason:
        | 'output_too_large'
        | 'unsupported_output_mime_type'
        | 'invalid_output_dimensions'
        | 'invalid_output_file_size';
      message: string;
    };

function isSupportedSourceMimeType(value: string): value is SalesPhotoEvidenceCaptureSourceMimeType {
  return (SALES_PHOTO_EVIDENCE_CAPTURE_SOURCE_MIME_TYPES as readonly string[]).includes(value);
}

function isFinitePositiveInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

function makeVariant(
  kind: 'image' | 'thumbnail',
  maxEdgePx: number,
  mimeType: 'image/webp' | 'image/jpeg',
  maxFileSizeBytes: number
): SalesPhotoEvidenceImageVariantPlan {
  return {
    kind,
    maxEdgePx,
    mimeType,
    startQuality: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.startQuality,
    minQuality: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.minQuality,
    maxFileSizeBytes,
    stripExif: SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.stripExif,
  };
}

export function planSalesPhotoEvidenceCaptureCompression(
  image: SalesPhotoEvidenceCapturedImageInfo
): SalesPhotoEvidenceCapturePreparationDecision {
  if (!isSupportedSourceMimeType(image.mimeType)) {
    return {
      action: 'reject_capture',
      reason: 'unsupported_mime_type',
      message: 'Captured image type is not supported for sales photo evidence.',
    };
  }

  if (!isFinitePositiveInteger(image.fileSizeBytes)) {
    return {
      action: 'reject_capture',
      reason: 'invalid_file_size',
      message: 'Captured image file size is invalid.',
    };
  }

  if (image.fileSizeBytes > SALES_PHOTO_EVIDENCE_MAX_SOURCE_FILE_SIZE_BYTES) {
    return {
      action: 'reject_capture',
      reason: 'source_file_too_large',
      message: 'Captured image is too large to process safely on this device.',
    };
  }

  if (!isFinitePositiveInteger(image.width) || !isFinitePositiveInteger(image.height)) {
    return {
      action: 'reject_capture',
      reason: 'invalid_image_dimensions',
      message: 'Captured image dimensions are invalid.',
    };
  }

  return {
    action: 'prepare_compression',
    reason: 'supported_image',
    plan: {
      source: {
        mimeType: image.mimeType,
        fileSizeBytes: image.fileSizeBytes,
        width: image.width,
        height: image.height,
      },
      primary: makeVariant(
        'image',
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.targetMaxEdgePx,
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.preferredMimeType,
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes
      ),
      fallback: makeVariant(
        'image',
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.fallbackMaxEdgePx,
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.fallbackMimeType,
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes
      ),
      thumbnail: makeVariant(
        'thumbnail',
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.thumbnailMaxEdgePx,
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.preferredMimeType,
        SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes
      ),
    },
  };
}

export function classifySalesPhotoEvidenceCompressionOutput(
  output: SalesPhotoEvidenceCompressionOutputInfo
): SalesPhotoEvidenceCompressionOutputDecision {
  if (output.mimeType !== 'image/webp' && output.mimeType !== 'image/jpeg') {
    return {
      accepted: false,
      reason: 'unsupported_output_mime_type',
      message: 'Compressed image output type is not supported.',
    };
  }

  if (!isFinitePositiveInteger(output.fileSizeBytes)) {
    return {
      accepted: false,
      reason: 'invalid_output_file_size',
      message: 'Compressed image output size is invalid.',
    };
  }

  if (output.fileSizeBytes > SALES_PHOTO_EVIDENCE_COMPRESSION_POLICY.maxFileSizeBytes) {
    return {
      accepted: false,
      reason: 'output_too_large',
      message: 'Compressed image is still larger than the sales photo evidence limit.',
    };
  }

  if (!isFinitePositiveInteger(output.width) || !isFinitePositiveInteger(output.height)) {
    return {
      accepted: false,
      reason: 'invalid_output_dimensions',
      message: 'Compressed image dimensions are invalid.',
    };
  }

  return {
    accepted: true,
    reason: 'within_policy',
  };
}
