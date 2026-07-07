import type { SalesPhotoEvidenceStatus } from '@/lib/sales/photo-evidence-model';
import type { SalesPhotoEvidenceUploadActorRole } from '@/lib/sales/photo-evidence-upload-contract';
import {
  createSalesPhotoEvidenceMetadataClaimPlan,
  type SalesPhotoEvidenceClaimExistingRow,
  type SalesPhotoEvidenceClaimSaleEvent,
  type SalesPhotoEvidenceMetadataClaimPlan,
} from '@/lib/sales/photo-evidence-metadata-claim';

export type SalesPhotoEvidenceMetadataClaimAdapterInput = {
  actorId: string;
  actorRole: SalesPhotoEvidenceUploadActorRole;
  ownerId: string;
  marketId: string;
  saleEventId: string;
  capturedByStaffId: string | null;
  capturedAt: string;
  hasLocalPayload: boolean;
  writeEnabled?: boolean;
};

export type SalesPhotoEvidenceMetadataClaimRepository = {
  getSaleEventForEvidenceClaim(input: {
    ownerId: string;
    marketId: string;
    saleEventId: string;
  }): Promise<SalesPhotoEvidenceClaimSaleEvent | null>;
  getActiveEvidenceForSale(input: {
    ownerId: string;
    marketId: string;
    saleEventId: string;
  }): Promise<SalesPhotoEvidenceClaimExistingRow | null>;
  isStaffRelationshipActive(input: {
    ownerId: string;
    staffId: string;
  }): Promise<boolean>;
  createEvidenceUploadingClaim(input: SalesPhotoEvidenceCreateUploadingClaimInput): Promise<SalesPhotoEvidenceMetadataClaimedRow>;
  markEvidenceUploading(input: SalesPhotoEvidenceMarkUploadingClaimInput): Promise<SalesPhotoEvidenceMetadataClaimedRow>;
};

export type SalesPhotoEvidenceCreateUploadingClaimInput = {
  ownerId: string;
  marketId: string;
  saleId: string;
  capturedByStaffId: string | null;
  status: 'uploading';
  saleCompletedAt: string;
  capturedAt: string;
};

export type SalesPhotoEvidenceMarkUploadingClaimInput = {
  evidenceId: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  status: 'uploading';
  capturedAt: string;
};

export type SalesPhotoEvidenceMetadataClaimedRow = {
  id: string;
  ownerId: string;
  marketId: string;
  saleId: string;
  capturedByStaffId: string | null;
  status: SalesPhotoEvidenceStatus;
};

export type SalesPhotoEvidenceMetadataClaimAdapterResult =
  | {
      action: 'metadata_claim_disabled';
      plan: SalesPhotoEvidenceMetadataClaimPlan;
      shouldKeepLocalPayload: true;
      shouldUploadAfterMetadataClaim: false;
    }
  | {
      action: 'metadata_claim_created' | 'metadata_claim_reused';
      plan: Extract<SalesPhotoEvidenceMetadataClaimPlan, { action: 'prepare_metadata_claim' }>;
      row: SalesPhotoEvidenceMetadataClaimedRow;
      shouldKeepLocalPayloadUntilServerSuccess: true;
      shouldUploadAfterMetadataClaim: true;
    }
  | {
      action: 'metadata_claim_skipped_uploaded';
      plan: Extract<SalesPhotoEvidenceMetadataClaimPlan, { action: 'skip_metadata_claim' }>;
      evidenceId: string;
      shouldDeleteLocalPayloadAfterSuccess: true;
      shouldUploadAfterMetadataClaim: false;
    }
  | {
      action: 'metadata_claim_rejected';
      plan: Extract<SalesPhotoEvidenceMetadataClaimPlan, { action: 'reject_metadata_claim' }>;
      shouldKeepLocalPayload: true;
      shouldUploadAfterMetadataClaim: false;
    }
  | {
      action: 'metadata_claim_failed';
      reason: 'metadata_claim_failed';
      message: string;
      error: unknown;
      shouldKeepLocalPayload: true;
      shouldUploadAfterMetadataClaim: false;
    };

export async function executeSalesPhotoEvidenceMetadataClaimAdapter(
  input: SalesPhotoEvidenceMetadataClaimAdapterInput,
  repository: SalesPhotoEvidenceMetadataClaimRepository
): Promise<SalesPhotoEvidenceMetadataClaimAdapterResult> {
  const [saleEvent, existingEvidence, staffRelationshipActive] = await Promise.all([
    repository.getSaleEventForEvidenceClaim({
      ownerId: input.ownerId,
      marketId: input.marketId,
      saleEventId: input.saleEventId,
    }),
    repository.getActiveEvidenceForSale({
      ownerId: input.ownerId,
      marketId: input.marketId,
      saleEventId: input.saleEventId,
    }),
    input.actorRole === 'staff'
      ? repository.isStaffRelationshipActive({
          ownerId: input.ownerId,
          staffId: input.actorId,
        })
      : Promise.resolve(false),
  ]);

  const plan = createSalesPhotoEvidenceMetadataClaimPlan({
    actorId: input.actorId,
    actorRole: input.actorRole,
    ownerId: input.ownerId,
    marketId: input.marketId,
    saleEventId: input.saleEventId,
    capturedByStaffId: input.capturedByStaffId,
    staffRelationshipActive,
    hasLocalPayload: input.hasLocalPayload,
    saleEvent,
    existingEvidence,
  });

  if (plan.action === 'reject_metadata_claim') {
    return {
      action: 'metadata_claim_rejected',
      plan,
      shouldKeepLocalPayload: true,
      shouldUploadAfterMetadataClaim: false,
    };
  }

  if (plan.action === 'skip_metadata_claim') {
    return {
      action: 'metadata_claim_skipped_uploaded',
      plan,
      evidenceId: plan.evidenceId,
      shouldDeleteLocalPayloadAfterSuccess: true,
      shouldUploadAfterMetadataClaim: false,
    };
  }

  if (!input.writeEnabled) {
    return {
      action: 'metadata_claim_disabled',
      plan,
      shouldKeepLocalPayload: true,
      shouldUploadAfterMetadataClaim: false,
    };
  }

  try {
    if (plan.mode === 'create_then_mark_uploading') {
      const row = await repository.createEvidenceUploadingClaim({
        ownerId: plan.ownerId,
        marketId: plan.marketId,
        saleId: plan.saleId,
        capturedByStaffId: plan.capturedByStaffId,
        status: 'uploading',
        saleCompletedAt: plan.saleCompletedAt,
        capturedAt: input.capturedAt,
      });

      return {
        action: 'metadata_claim_created',
        plan,
        row,
        shouldKeepLocalPayloadUntilServerSuccess: true,
        shouldUploadAfterMetadataClaim: true,
      };
    }

    const row = await repository.markEvidenceUploading({
      evidenceId: plan.evidenceId!,
      ownerId: plan.ownerId,
      marketId: plan.marketId,
      saleId: plan.saleId,
      status: 'uploading',
      capturedAt: input.capturedAt,
    });

    return {
      action: 'metadata_claim_reused',
      plan,
      row,
      shouldKeepLocalPayloadUntilServerSuccess: true,
      shouldUploadAfterMetadataClaim: true,
    };
  } catch (error) {
    return {
      action: 'metadata_claim_failed',
      reason: 'metadata_claim_failed',
      message: 'Sales photo evidence metadata claim write failed.',
      error,
      shouldKeepLocalPayload: true,
      shouldUploadAfterMetadataClaim: false,
    };
  }
}
