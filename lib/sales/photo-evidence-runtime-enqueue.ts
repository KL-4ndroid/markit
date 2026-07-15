import { recordDeal } from '@/lib/db/hooks';
import { isSalesPhotoEvidenceRuntimeEnqueueEnabled } from '@/lib/sales/photo-evidence-runtime-flags';
import {
  enqueuePendingSalesPhotoEvidenceCreation,
} from '@/lib/sales/photo-evidence-pending-creation-storage';
import {
  recordDealWithPhotoEvidenceRequirement,
  type CreatePendingSalesPhotoEvidence,
  type RecordDealForPhotoEvidence,
  type RecordDealWithPhotoEvidenceResult,
} from '@/lib/sales/photo-evidence-post-sale';
import type { DealClosedPayload } from '@/types/db';
import {
  buildSalesTransactionSummary,
  type SalesTransactionSummary,
} from '@/lib/sales/sale-summary';

export type SalesPhotoEvidenceRuntimeDealInput =
  DealClosedPayload | ({ marketId: string } & Omit<DealClosedPayload, 'market_id'>);

export type SalesPhotoEvidenceRuntimeContext = {
  ownerId?: string | null;
  marketId?: string | null;
  marketRequiresEvidence?: boolean | null;
  capturedByStaffId?: string | null;
  saleCompletedAt?: string | number | Date | null;
  now?: string | number | Date;
};

export type SalesPhotoEvidenceTransactionContext = Pick<
  SalesPhotoEvidenceRuntimeContext,
  'ownerId' | 'marketRequiresEvidence' | 'capturedByStaffId'
>;

export type SalesPhotoEvidenceRuntimeEnqueueOptions = {
  evidenceContext?: SalesPhotoEvidenceRuntimeContext;
  deps?: Partial<SalesPhotoEvidenceRuntimeDeps>;
};

export type SalesPhotoEvidenceRuntimeResult = {
  dealEventId: string;
  transaction: SalesTransactionSummary;
  evidence:
    | { status: 'runtime_disabled' }
    | { status: 'context_missing'; missingFields: string[] }
    | RecordDealWithPhotoEvidenceResult['evidence'];
};

export type SalesPhotoEvidenceRuntimeResultHandler = (
  result: SalesPhotoEvidenceRuntimeResult
) => void | Promise<void>;

export type SalesPhotoEvidenceRuntimeDeps = {
  recordDeal: RecordDealForPhotoEvidence;
  isRuntimeEnqueueEnabled: () => boolean;
  createPendingEvidence: CreatePendingSalesPhotoEvidence;
  onEvidenceError?: (error: unknown) => void;
};

const DEFAULT_DEPS: SalesPhotoEvidenceRuntimeDeps = {
  recordDeal,
  isRuntimeEnqueueEnabled: isSalesPhotoEvidenceRuntimeEnqueueEnabled,
  createPendingEvidence: async draft => {
    await enqueuePendingSalesPhotoEvidenceCreation({
      saleEventId: draft.sale_id,
      ownerId: draft.owner_id,
      marketId: draft.market_id,
      capturedByStaffId: draft.captured_by_staff_id,
      saleCompletedAt: draft.sale_completed_at,
      now: draft.created_at,
    });
  },
};

function getMissingContextFields(context: SalesPhotoEvidenceRuntimeContext | undefined): string[] {
  const missingFields: string[] = [];

  if (!context?.ownerId) missingFields.push('ownerId');
  if (!context?.marketId) missingFields.push('marketId');
  if (typeof context?.marketRequiresEvidence !== 'boolean') missingFields.push('marketRequiresEvidence');
  if (!context?.saleCompletedAt) missingFields.push('saleCompletedAt');

  return missingFields;
}

function resolveDeps(overrides: Partial<SalesPhotoEvidenceRuntimeDeps> | undefined): SalesPhotoEvidenceRuntimeDeps {
  return {
    ...DEFAULT_DEPS,
    ...overrides,
  };
}

export async function recordDealWithOptionalSalesPhotoEvidence(
  deal: SalesPhotoEvidenceRuntimeDealInput,
  dealDate?: string,
  options: SalesPhotoEvidenceRuntimeEnqueueOptions = {}
): Promise<SalesPhotoEvidenceRuntimeResult> {
  const deps = resolveDeps(options.deps);

  if (!deps.isRuntimeEnqueueEnabled()) {
    const dealEventId = await deps.recordDeal(deal, dealDate);
    return {
      dealEventId,
      transaction: buildSalesTransactionSummary(deal, dealEventId, options.evidenceContext?.saleCompletedAt),
      evidence: { status: 'runtime_disabled' },
    };
  }

  const context = options.evidenceContext;
  const missingFields = getMissingContextFields(context);

  if (missingFields.length > 0) {
    const dealEventId = await deps.recordDeal(deal, dealDate);
    return {
      dealEventId,
      transaction: buildSalesTransactionSummary(deal, dealEventId, context?.saleCompletedAt),
      evidence: {
        status: 'context_missing',
        missingFields,
      },
    };
  }

  const result = await recordDealWithPhotoEvidenceRequirement({
    deal,
    dealDate,
    ownerId: context!.ownerId!,
    marketId: context!.marketId!,
    marketRequiresEvidence: context!.marketRequiresEvidence!,
    capturedByStaffId: context!.capturedByStaffId,
    saleCompletedAt: context!.saleCompletedAt!,
    now: context!.now,
    recordDeal: deps.recordDeal,
    createPendingEvidence: deps.createPendingEvidence,
    onEvidenceError: deps.onEvidenceError,
  });

  return {
    ...result,
    transaction: buildSalesTransactionSummary(deal, result.dealEventId, context!.saleCompletedAt),
  };
}
