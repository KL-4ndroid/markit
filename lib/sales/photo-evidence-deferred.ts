import {
  createSalesPhotoEvidenceRequirementDecision,
  type SalesPhotoEvidenceExistingRow,
  type SalesPhotoEvidencePendingDraft,
  type SalesPhotoEvidenceRequirementDecision,
} from '@/lib/sales/photo-evidence-model';

export type DeferredSalesPhotoEvidenceEvent = {
  id?: string | null;
  type?: string | null;
  sync_status?: string | null;
};

export type DeferredSalesPhotoEvidenceInput = {
  dealEvent: DeferredSalesPhotoEvidenceEvent;
  ownerId: string;
  marketId: string;
  marketRequiresEvidence: boolean;
  capturedByStaffId?: string | null;
  saleCompletedAt: string | number | Date;
  now?: string | number | Date;
  existingEvidence?: readonly SalesPhotoEvidenceExistingRow[];
};

export type DeferredSalesPhotoEvidencePlan =
  | {
      action: 'wait_for_event_sync';
      reason: 'deal_event_not_synced';
      dealEventId: string;
      syncStatus: string | null;
    }
  | {
      action: 'blocked';
      reason: 'missing_deal_event_id' | 'not_deal_closed_event' | 'invalid_requirement_input';
      errorMessage?: string;
    }
  | {
      action: 'not_required';
      reason: 'market_not_required';
      decision: Extract<SalesPhotoEvidenceRequirementDecision, { action: 'not_required' }>;
    }
  | {
      action: 'skip_existing';
      reason: 'active_evidence_exists';
      decision: Extract<SalesPhotoEvidenceRequirementDecision, { action: 'skip_existing' }>;
    }
  | {
      action: 'ready_to_create';
      reason: 'synced_deal_requires_evidence';
      draft: SalesPhotoEvidencePendingDraft;
      decision: Extract<SalesPhotoEvidenceRequirementDecision, { action: 'create_pending' }>;
    };

export function planDeferredSalesPhotoEvidenceCreation(
  input: DeferredSalesPhotoEvidenceInput
): DeferredSalesPhotoEvidencePlan {
  const dealEventId = input.dealEvent.id ?? null;

  if (!dealEventId) {
    return {
      action: 'blocked',
      reason: 'missing_deal_event_id',
    };
  }

  if (input.dealEvent.type !== 'deal_closed') {
    return {
      action: 'blocked',
      reason: 'not_deal_closed_event',
    };
  }

  const syncStatus = input.dealEvent.sync_status ?? null;
  if (syncStatus !== 'synced') {
    return {
      action: 'wait_for_event_sync',
      reason: 'deal_event_not_synced',
      dealEventId,
      syncStatus,
    };
  }

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
        action: 'not_required',
        reason: 'market_not_required',
        decision,
      };
    }

    if (decision.action === 'skip_existing') {
      return {
        action: 'skip_existing',
        reason: 'active_evidence_exists',
        decision,
      };
    }

    return {
      action: 'ready_to_create',
      reason: 'synced_deal_requires_evidence',
      draft: decision.draft,
      decision,
    };
  } catch (error) {
    return {
      action: 'blocked',
      reason: 'invalid_requirement_input',
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}
