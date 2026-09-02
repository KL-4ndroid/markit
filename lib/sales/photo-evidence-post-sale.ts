import type { DealClosedPayload } from '@/types/db';
import {
  createSalesPhotoEvidenceRequirementDecision,
  type SalesPhotoEvidenceExistingRow,
  type SalesPhotoEvidencePendingDraft,
  type SalesPhotoEvidenceRequirementDecision,
} from '@/lib/sales/photo-evidence-model';

export type RecordDealForPhotoEvidence = (
  data: DealClosedPayload | ({ marketId: string } & Omit<DealClosedPayload, 'market_id'>),
  dealDate?: string
) => Promise<string>;

export type CreatePendingSalesPhotoEvidence = (
  draft: SalesPhotoEvidencePendingDraft
) => Promise<void>;

export type RecordDealWithPhotoEvidenceInput = {
  deal: DealClosedPayload | ({ marketId: string } & Omit<DealClosedPayload, 'market_id'>);
  dealDate?: string;
  ownerId: string;
  marketId: string;
  marketRequiresEvidence: boolean;
  capturedByStaffId?: string | null;
  saleCompletedAt: string | number | Date;
  now?: string | number | Date;
  existingEvidence?: readonly SalesPhotoEvidenceExistingRow[];
  recordDeal: RecordDealForPhotoEvidence;
  createPendingEvidence?: CreatePendingSalesPhotoEvidence;
  onEvidenceError?: (error: unknown) => void;
};

export type RecordDealWithPhotoEvidenceResult = {
  dealEventId: string;
  evidence:
    | {
        status: 'not_required';
        decision: Extract<SalesPhotoEvidenceRequirementDecision, { action: 'not_required' }>;
      }
    | {
        status: 'skipped_existing';
        decision: Extract<SalesPhotoEvidenceRequirementDecision, { action: 'skip_existing' }>;
      }
    | {
        status: 'draft_ready';
        decision: Extract<SalesPhotoEvidenceRequirementDecision, { action: 'create_pending' }>;
      }
    | {
        status: 'created';
        decision: Extract<SalesPhotoEvidenceRequirementDecision, { action: 'create_pending' }>;
      }
    | {
        status: 'failed';
        error: unknown;
      };
};

export async function recordDealWithPhotoEvidenceRequirement(
  input: RecordDealWithPhotoEvidenceInput
): Promise<RecordDealWithPhotoEvidenceResult> {
  const dealEventId = await input.recordDeal(input.deal, input.dealDate);

  try {
    const decision = createSalesPhotoEvidenceRequirementDecision({
      ownerId: input.ownerId,
      marketId: input.marketId,
      saleEventId: dealEventId,
      saleCompletedAt: input.saleCompletedAt,
      marketRequiresEvidence: input.marketRequiresEvidence,
      capturedByStaffId: input.capturedByStaffId,
      now: input.now,
      existingEvidence: input.existingEvidence,
    });

    if (decision.action === 'not_required') {
      return {
        dealEventId,
        evidence: {
          status: 'not_required',
          decision,
        },
      };
    }

    if (decision.action === 'skip_existing') {
      return {
        dealEventId,
        evidence: {
          status: 'skipped_existing',
          decision,
        },
      };
    }

    if (!input.createPendingEvidence) {
      return {
        dealEventId,
        evidence: {
          status: 'draft_ready',
          decision,
        },
      };
    }

    await input.createPendingEvidence(decision.draft);

    return {
      dealEventId,
      evidence: {
        status: 'created',
        decision,
      },
    };
  } catch (error) {
    input.onEvidenceError?.(error);
    return {
      dealEventId,
      evidence: {
        status: 'failed',
        error,
      },
    };
  }
}
