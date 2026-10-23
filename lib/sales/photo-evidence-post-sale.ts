import type { DealClosedPayload } from '@/types/db';
import { readSalesPhotoEvidenceRequirementSnapshot } from '@/lib/sales/photo-evidence-requirement-snapshot';
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
  const completedAt = new Date(input.saleCompletedAt);
  const snapshot = readSalesPhotoEvidenceRequirementSnapshot({
    version: 1,
    required: input.marketRequiresEvidence,
    ownerId: input.ownerId,
    marketId: input.marketId,
    capturedByStaffId: input.capturedByStaffId ?? null,
    saleCompletedAt: Number.isFinite(completedAt.getTime()) ? completedAt.toISOString() : '',
  });
  const dealMarketId = 'marketId' in input.deal ? input.deal.marketId : input.deal.market_id;
  // Commit the requirement with the sale, before the separate local queue write.
  // An invalid photo context must still not discard a successfully recorded sale.
  const validSnapshot = snapshot?.marketId === dealMarketId ? snapshot : null;
  const dealEventId = await input.recordDeal({
    ...input.deal,
    photoEvidenceRequirement: validSnapshot ?? undefined,
  }, input.dealDate);

  try {
    if (!validSnapshot) throw new Error('Invalid sale photo requirement context');
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
