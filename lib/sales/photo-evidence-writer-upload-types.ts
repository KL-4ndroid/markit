import type { SalesPhotoEvidenceStatus } from '@/lib/sales/photo-evidence-model';
import type {
  SalesPhotoEvidenceUploadActorRole,
  SalesPhotoEvidenceUploadedVariantInfo,
} from '@/lib/sales/photo-evidence-upload-contract';

export type SalesPhotoEvidenceWriterUploadTransport =
  | 'form_data_server_route'
  | 'presigned_upload_url';

export type SalesPhotoEvidenceWriterUploadFailureCode =
  | 'permission_denied'
  | 'source_invalid'
  | 'metadata_claim_failed'
  | 'r2_image_upload_failed'
  | 'r2_thumbnail_upload_failed'
  | 'metadata_finalize_failed'
  | 'payload_missing'
  | 'payload_invalid'
  | 'already_uploaded'
  | 'status_not_uploadable';

export type SalesPhotoEvidenceWriterUploadFailureSeverity =
  | 'blocked'
  | 'retryable'
  | 'idempotent';

export type SalesPhotoEvidenceWriterUploadRequest = {
  queueId: string;
  saleEventId: string;
  ownerId: string;
  marketId: string;
  evidenceId: string | null;
  actorId: string;
  actorRole: SalesPhotoEvidenceUploadActorRole;
  capturedByStaffId: string | null;
  capturedAt: string;
  image: SalesPhotoEvidenceUploadedVariantInfo;
  thumbnail: SalesPhotoEvidenceUploadedVariantInfo;
  transport: SalesPhotoEvidenceWriterUploadTransport;
};

export type SalesPhotoEvidenceWriterUploadSuccess = {
  action: 'upload_completed' | 'upload_already_completed';
  evidenceId: string;
  status: 'uploaded';
  shouldDeleteLocalPayload: true;
  shouldRetryWithLocalPayload: false;
  shouldWriteCloudMetadata: false;
};

export type SalesPhotoEvidenceWriterUploadFailure = {
  action: 'upload_rejected' | 'upload_failed_retryable';
  code: SalesPhotoEvidenceWriterUploadFailureCode;
  shouldDeleteLocalPayload: false;
  shouldRetryWithLocalPayload: boolean;
  shouldWriteCloudMetadata: boolean;
};

export type SalesPhotoEvidenceWriterUploadResponse =
  | SalesPhotoEvidenceWriterUploadSuccess
  | SalesPhotoEvidenceWriterUploadFailure;

export type SalesPhotoEvidenceMetadataTransitionPlan =
  | {
      action: 'prepare_upload_transition';
      fromStatus: SalesPhotoEvidenceStatus | null;
      claimStatus: 'uploading';
      successStatus: 'uploaded';
      failureStatus: 'upload_failed';
      shouldUploadImage: true;
      shouldUploadThumbnail: true;
      shouldDeleteLocalPayloadAfterSuccess: true;
      requiresExistingEvidenceRow: boolean;
    }
  | {
      action: 'skip_upload_transition';
      reason: 'already_uploaded';
      fromStatus: 'uploaded';
      shouldUploadImage: false;
      shouldUploadThumbnail: false;
      shouldDeleteLocalPayloadAfterSuccess: true;
      requiresExistingEvidenceRow: true;
    }
  | {
      action: 'reject_upload_transition';
      reason: Extract<
        SalesPhotoEvidenceWriterUploadFailureCode,
        'payload_missing' | 'already_uploaded' | 'status_not_uploadable'
      >;
      fromStatus: SalesPhotoEvidenceStatus | null;
      shouldUploadImage: false;
      shouldUploadThumbnail: false;
      shouldDeleteLocalPayloadAfterSuccess: false;
      requiresExistingEvidenceRow: boolean;
    };

export type SalesPhotoEvidenceMetadataTransitionPlanInput = {
  currentStatus: SalesPhotoEvidenceStatus | null;
  hasLocalPayload: boolean;
};

export type SalesPhotoEvidenceWriterUploadFailureClassification = {
  code: SalesPhotoEvidenceWriterUploadFailureCode;
  severity: SalesPhotoEvidenceWriterUploadFailureSeverity;
  shouldKeepLocalPayload: boolean;
  shouldMarkEvidenceUploadFailed: boolean;
  shouldAttemptR2Upload: boolean;
};

const UPLOADABLE_STATUSES = new Set<SalesPhotoEvidenceStatus | null>([
  null,
  'pending_capture',
  'capture_skipped',
  'captured_local',
  'upload_failed',
]);

const TERMINAL_NON_UPLOADABLE_STATUSES = new Set<SalesPhotoEvidenceStatus>([
  'not_required',
  'expired',
  'waived_by_owner',
]);

export function createSalesPhotoEvidenceMetadataTransitionPlan(
  input: SalesPhotoEvidenceMetadataTransitionPlanInput
): SalesPhotoEvidenceMetadataTransitionPlan {
  if (input.currentStatus === 'uploaded') {
    return {
      action: 'skip_upload_transition',
      reason: 'already_uploaded',
      fromStatus: 'uploaded',
      shouldUploadImage: false,
      shouldUploadThumbnail: false,
      shouldDeleteLocalPayloadAfterSuccess: true,
      requiresExistingEvidenceRow: true,
    };
  }

  if (
    input.currentStatus === 'uploading' ||
    (input.currentStatus !== null && TERMINAL_NON_UPLOADABLE_STATUSES.has(input.currentStatus))
  ) {
    return {
      action: 'reject_upload_transition',
      reason: 'status_not_uploadable',
      fromStatus: input.currentStatus,
      shouldUploadImage: false,
      shouldUploadThumbnail: false,
      shouldDeleteLocalPayloadAfterSuccess: false,
      requiresExistingEvidenceRow: input.currentStatus !== null,
    };
  }

  if (!UPLOADABLE_STATUSES.has(input.currentStatus)) {
    return {
      action: 'reject_upload_transition',
      reason: 'status_not_uploadable',
      fromStatus: input.currentStatus,
      shouldUploadImage: false,
      shouldUploadThumbnail: false,
      shouldDeleteLocalPayloadAfterSuccess: false,
      requiresExistingEvidenceRow: input.currentStatus !== null,
    };
  }

  if (!input.hasLocalPayload) {
    return {
      action: 'reject_upload_transition',
      reason: 'payload_missing',
      fromStatus: input.currentStatus,
      shouldUploadImage: false,
      shouldUploadThumbnail: false,
      shouldDeleteLocalPayloadAfterSuccess: false,
      requiresExistingEvidenceRow: input.currentStatus !== null,
    };
  }

  return {
    action: 'prepare_upload_transition',
    fromStatus: input.currentStatus,
    claimStatus: 'uploading',
    successStatus: 'uploaded',
    failureStatus: 'upload_failed',
    shouldUploadImage: true,
    shouldUploadThumbnail: true,
    shouldDeleteLocalPayloadAfterSuccess: true,
    requiresExistingEvidenceRow: input.currentStatus !== null,
  };
}

export function classifySalesPhotoEvidenceWriterUploadFailure(
  code: SalesPhotoEvidenceWriterUploadFailureCode
): SalesPhotoEvidenceWriterUploadFailureClassification {
  switch (code) {
    case 'already_uploaded':
      return {
        code,
        severity: 'idempotent',
        shouldKeepLocalPayload: false,
        shouldMarkEvidenceUploadFailed: false,
        shouldAttemptR2Upload: false,
      };
    case 'permission_denied':
    case 'metadata_claim_failed':
    case 'payload_missing':
    case 'payload_invalid':
    case 'source_invalid':
    case 'status_not_uploadable':
      return {
        code,
        severity: 'blocked',
        shouldKeepLocalPayload: true,
        shouldMarkEvidenceUploadFailed: false,
        shouldAttemptR2Upload: false,
      };
    case 'r2_image_upload_failed':
    case 'r2_thumbnail_upload_failed':
    case 'metadata_finalize_failed':
      return {
        code,
        severity: 'retryable',
        shouldKeepLocalPayload: true,
        shouldMarkEvidenceUploadFailed: true,
        shouldAttemptR2Upload: code !== 'metadata_finalize_failed',
      };
  }
}
