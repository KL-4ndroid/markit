import type { SalesPhotoEvidenceStatus } from '@/lib/sales/photo-evidence-model';
import type { SalesPhotoEvidenceUploadActorRole } from '@/lib/sales/photo-evidence-upload-contract';
import {
  createSalesPhotoEvidenceMetadataTransitionPlan,
  type SalesPhotoEvidenceMetadataTransitionPlan,
  type SalesPhotoEvidenceWriterUploadFailureCode,
} from '@/lib/sales/photo-evidence-writer-upload-types';

export type SalesPhotoEvidenceClaimSaleEvent = {
  id: string;
  type: string;
  ownerId: string;
  marketId: string;
  completedAt: string;
};

export type SalesPhotoEvidenceClaimExistingRow = {
  id: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  capturedByStaffId: string | null;
  status: SalesPhotoEvidenceStatus;
  deletedAt: string | null;
};

export type SalesPhotoEvidenceMetadataClaimInput = {
  actorId: string;
  actorRole: SalesPhotoEvidenceUploadActorRole;
  ownerId: string;
  marketId: string;
  saleEventId: string;
  capturedByStaffId: string | null;
  staffRelationshipActive: boolean;
  hasLocalPayload: boolean;
  saleEvent: SalesPhotoEvidenceClaimSaleEvent | null;
  existingEvidence: SalesPhotoEvidenceClaimExistingRow | null;
};

export type SalesPhotoEvidenceMetadataClaimPlan =
  | {
      action: 'prepare_metadata_claim';
      mode: 'create_then_mark_uploading' | 'reuse_then_mark_uploading';
      evidenceId: string | null;
      ownerId: string;
      marketId: string;
      saleId: string;
      capturedByStaffId: string | null;
      saleCompletedAt: string;
      transition: Extract<SalesPhotoEvidenceMetadataTransitionPlan, { action: 'prepare_upload_transition' }>;
      shouldKeepLocalPayloadUntilServerSuccess: true;
      shouldUploadAfterMetadataClaim: true;
    }
  | {
      action: 'skip_metadata_claim';
      reason: 'already_uploaded';
      evidenceId: string;
      transition: Extract<SalesPhotoEvidenceMetadataTransitionPlan, { action: 'skip_upload_transition' }>;
      shouldDeleteLocalPayloadAfterSuccess: true;
      shouldUploadAfterMetadataClaim: false;
    }
  | {
      action: 'reject_metadata_claim';
      reason: Extract<
        SalesPhotoEvidenceWriterUploadFailureCode,
        'permission_denied' | 'source_invalid' | 'payload_missing' | 'status_not_uploadable'
      >;
      message: string;
      shouldKeepLocalPayload: true;
      shouldUploadAfterMetadataClaim: false;
      shouldWriteCloudMetadata: false;
    };

function rejectMetadataClaim(
  reason: Extract<
    SalesPhotoEvidenceWriterUploadFailureCode,
    'permission_denied' | 'source_invalid' | 'payload_missing' | 'status_not_uploadable'
  >,
  message: string
): SalesPhotoEvidenceMetadataClaimPlan {
  return {
    action: 'reject_metadata_claim',
    reason,
    message,
    shouldKeepLocalPayload: true,
    shouldUploadAfterMetadataClaim: false,
    shouldWriteCloudMetadata: false,
  };
}

function isAuthorizedClaimActor(input: SalesPhotoEvidenceMetadataClaimInput): boolean {
  if (input.actorRole === 'owner') {
    return input.actorId === input.ownerId;
  }

  return (
    input.staffRelationshipActive &&
    input.capturedByStaffId !== null &&
    input.actorId === input.capturedByStaffId
  );
}

function isSaleEventValid(input: SalesPhotoEvidenceMetadataClaimInput): boolean {
  const saleEvent = input.saleEvent;
  if (!saleEvent) return false;

  return (
    saleEvent.id === input.saleEventId &&
    saleEvent.type === 'deal_closed' &&
    saleEvent.ownerId === input.ownerId &&
    saleEvent.marketId === input.marketId
  );
}

function isExistingEvidenceValid(input: SalesPhotoEvidenceMetadataClaimInput): boolean {
  const row = input.existingEvidence;
  if (!row) return true;

  if (row.deletedAt !== null) return false;

  if (
    row.ownerId !== input.ownerId ||
    row.marketId !== input.marketId ||
    row.saleId !== input.saleEventId
  ) {
    return false;
  }

  if (input.actorRole === 'staff') {
    return row.capturedByStaffId === input.actorId;
  }

  return true;
}

export function createSalesPhotoEvidenceMetadataClaimPlan(
  input: SalesPhotoEvidenceMetadataClaimInput
): SalesPhotoEvidenceMetadataClaimPlan {
  if (!isAuthorizedClaimActor(input)) {
    return rejectMetadataClaim('permission_denied', 'Actor is not allowed to claim this sales photo evidence row.');
  }

  if (!isSaleEventValid(input) || !isExistingEvidenceValid(input)) {
    return rejectMetadataClaim('source_invalid', 'Sale event or evidence row does not match the requested owner and market scope.');
  }

  const currentStatus = input.existingEvidence?.status ?? null;
  const transition = createSalesPhotoEvidenceMetadataTransitionPlan({
    currentStatus,
    hasLocalPayload: input.hasLocalPayload,
  });

  if (transition.action === 'skip_upload_transition') {
    return {
      action: 'skip_metadata_claim',
      reason: 'already_uploaded',
      evidenceId: input.existingEvidence!.id,
      transition,
      shouldDeleteLocalPayloadAfterSuccess: true,
      shouldUploadAfterMetadataClaim: false,
    };
  }

  if (transition.action === 'reject_upload_transition') {
    return rejectMetadataClaim(
      transition.reason === 'payload_missing' ? 'payload_missing' : 'status_not_uploadable',
      transition.reason === 'payload_missing'
        ? 'Local sales photo evidence payload is missing.'
        : 'Sales photo evidence row is not uploadable from its current status.'
    );
  }

  return {
    action: 'prepare_metadata_claim',
    mode: input.existingEvidence ? 'reuse_then_mark_uploading' : 'create_then_mark_uploading',
    evidenceId: input.existingEvidence?.id ?? null,
    ownerId: input.ownerId,
    marketId: input.marketId,
    saleId: input.saleEventId,
    capturedByStaffId: input.capturedByStaffId,
    saleCompletedAt: input.saleEvent!.completedAt,
    transition,
    shouldKeepLocalPayloadUntilServerSuccess: true,
    shouldUploadAfterMetadataClaim: true,
  };
}
