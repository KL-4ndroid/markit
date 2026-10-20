import {
  createLocalPendingSalesPhotoEvidenceCreation,
  type LocalPendingSalesPhotoEvidenceCreation,
} from '@/lib/sales/photo-evidence-pending-creation';
import type { LocalPendingSalesPhotoEvidencePayload } from '@/lib/sales/photo-evidence-pending-payload-storage';
import type { SalesPhotoEvidenceRuntimeResult } from '@/lib/sales/photo-evidence-runtime-enqueue';
import type { SalesTransactionSummary } from '@/lib/sales/sale-summary';

export type SaleCompletionReturnTarget = 'closed' | 'pending_list';

type ActiveSaleCompletionState = {
  item: LocalPendingSalesPhotoEvidenceCreation;
  summary: SalesTransactionSummary;
  returnTo: SaleCompletionReturnTarget;
};

export type SaleCompletionFlowState =
  | { view: 'closed' }
  | { view: 'pending_list' }
  | (ActiveSaleCompletionState & { view: 'photo_required'; message: string | null })
  | (ActiveSaleCompletionState & { view: 'processing_photo' })
  | (ActiveSaleCompletionState & {
      view: 'previewing';
      payload: LocalPendingSalesPhotoEvidencePayload;
    })
  | (ActiveSaleCompletionState & {
      view: 'uploading';
      payload: LocalPendingSalesPhotoEvidencePayload;
    })
  | (ActiveSaleCompletionState & {
      view: 'upload_failed';
      payload: LocalPendingSalesPhotoEvidencePayload;
      message: string;
    })
  | (ActiveSaleCompletionState & { view: 'completed' });

export type SaleCompletionFlowAction =
  | { type: 'OPEN_PENDING_LIST' }
  | {
      type: 'OPEN_PHOTO_TASK';
      item: LocalPendingSalesPhotoEvidenceCreation;
      summary: SalesTransactionSummary;
      returnTo: SaleCompletionReturnTarget;
    }
  | {
      type: 'OPEN_PREVIEW_TASK';
      item: LocalPendingSalesPhotoEvidenceCreation;
      summary: SalesTransactionSummary;
      returnTo: SaleCompletionReturnTarget;
      payload: LocalPendingSalesPhotoEvidencePayload;
    }
  | { type: 'START_CAPTURE' }
  | { type: 'CAPTURE_SELECTED'; payload: LocalPendingSalesPhotoEvidencePayload }
  | { type: 'CAPTURE_CANCELLED' }
  | { type: 'CAPTURE_FAILED'; message: string }
  | { type: 'START_UPLOAD' }
  | { type: 'UPLOAD_FAILED'; message: string }
  | { type: 'UPLOAD_SUCCEEDED' }
  | { type: 'BACK' }
  | { type: 'CLOSE' }
  | { type: 'DISMISS_COMPLETED' };

export const INITIAL_SALE_COMPLETION_FLOW_STATE: SaleCompletionFlowState = { view: 'closed' };

function isActiveState(state: SaleCompletionFlowState): state is Exclude<
  SaleCompletionFlowState,
  { view: 'closed' } | { view: 'pending_list' }
> {
  return state.view !== 'closed' && state.view !== 'pending_list';
}

function returnState(target: SaleCompletionReturnTarget): SaleCompletionFlowState {
  return target === 'pending_list' ? { view: 'pending_list' } : { view: 'closed' };
}

export function reduceSaleCompletionFlow(
  state: SaleCompletionFlowState,
  action: SaleCompletionFlowAction
): SaleCompletionFlowState {
  switch (action.type) {
    case 'OPEN_PENDING_LIST':
      return { view: 'pending_list' };
    case 'OPEN_PHOTO_TASK':
      return {
        view: 'photo_required',
        item: action.item,
        summary: action.summary,
        returnTo: action.returnTo,
        message: null,
      };
    case 'OPEN_PREVIEW_TASK':
      return {
        view: 'previewing',
        item: action.item,
        summary: action.summary,
        returnTo: action.returnTo,
        payload: action.payload,
      };
    case 'START_CAPTURE':
      if (!isActiveState(state) || state.view === 'uploading' || state.view === 'completed') return state;
      return {
        view: 'processing_photo',
        item: state.item,
        summary: state.summary,
        returnTo: state.returnTo,
      };
    case 'CAPTURE_SELECTED':
      if (state.view !== 'processing_photo') return state;
      return {
        view: 'previewing',
        item: state.item,
        summary: state.summary,
        returnTo: state.returnTo,
        payload: action.payload,
      };
    case 'CAPTURE_CANCELLED':
      if (state.view !== 'processing_photo') return state;
      return {
        view: 'photo_required',
        item: state.item,
        summary: state.summary,
        returnTo: state.returnTo,
        message: null,
      };
    case 'CAPTURE_FAILED':
      if (state.view !== 'processing_photo') return state;
      return {
        view: 'photo_required',
        item: state.item,
        summary: state.summary,
        returnTo: state.returnTo,
        message: action.message,
      };
    case 'START_UPLOAD':
      if (state.view !== 'previewing' && state.view !== 'upload_failed') return state;
      return {
        view: 'uploading',
        item: state.item,
        summary: state.summary,
        returnTo: state.returnTo,
        payload: state.payload,
      };
    case 'UPLOAD_FAILED':
      if (state.view !== 'uploading') return state;
      return {
        view: 'upload_failed',
        item: state.item,
        summary: state.summary,
        returnTo: state.returnTo,
        payload: state.payload,
        message: action.message,
      };
    case 'UPLOAD_SUCCEEDED':
      if (state.view !== 'uploading') return state;
      return {
        view: 'completed',
        item: state.item,
        summary: state.summary,
        returnTo: state.returnTo,
      };
    case 'BACK':
      return isActiveState(state) && state.view !== 'uploading'
        ? returnState(state.returnTo)
        : state;
    case 'CLOSE':
      return isActiveState(state) && state.view === 'uploading'
        ? state
        : { view: 'closed' };
    case 'DISMISS_COMPLETED':
      return state.view === 'completed' ? returnState(state.returnTo) : state;
    default:
      return state;
  }
}

export function pendingCreationFromSalesPhotoEvidenceResult(
  result: SalesPhotoEvidenceRuntimeResult
): LocalPendingSalesPhotoEvidenceCreation | null {
  if (result.evidence.status !== 'created') return null;

  const draft = result.evidence.decision.draft;
  return createLocalPendingSalesPhotoEvidenceCreation({
    saleEventId: draft.sale_id,
    ownerId: draft.owner_id,
    marketId: draft.market_id,
    capturedByStaffId: draft.captured_by_staff_id,
    saleCompletedAt: draft.sale_completed_at,
    now: draft.created_at,
  });
}
