import type {
  InAppPurchasePort,
  InAppPurchaseProduct,
  InAppPurchaseRequest,
  InAppPurchaseRestoreRequest,
  StorePurchaseEvidence,
} from '@/lib/platform/contracts/in-app-purchase';
import type { NativePurchaseDisclosureDecision } from './native-purchase-disclosure';

export type NativePurchaseWorkflowPhase =
  | 'idle'
  | 'loading_catalog'
  | 'ready'
  | 'purchasing'
  | 'restoring'
  | 'managing'
  | 'pending'
  | 'awaiting_server_verification'
  | 'cancelled'
  | 'failed';

export type NativePurchaseWorkflowState = Readonly<{
  phase: NativePurchaseWorkflowPhase;
  products: readonly InAppPurchaseProduct[];
  evidence: readonly StorePurchaseEvidence[];
  errorCode: string | null;
  retryable: boolean;
}>;

export const INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE: NativePurchaseWorkflowState = Object.freeze({
  phase: 'idle',
  products: [],
  evidence: [],
  errorCode: null,
  retryable: false,
});

function failed(errorCode: string, retryable: boolean): NativePurchaseWorkflowState {
  if (errorCode === 'purchase_pending') {
    return { ...INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE, phase: 'pending', errorCode };
  }
  if (errorCode === 'user_cancelled') {
    return { ...INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE, phase: 'cancelled', errorCode };
  }
  return {
    ...INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE,
    phase: 'failed',
    errorCode,
    retryable,
  };
}

export async function loadNativePurchaseProducts(input: {
  port: InAppPurchasePort;
  productIds: readonly string[];
}): Promise<NativePurchaseWorkflowState> {
  const availability = await input.port.getAvailability();
  if (!availability.available) return failed(availability.reason, false);

  const result = await input.port.listProducts(input.productIds);
  if (!result.ok) return failed(result.error.code, result.error.retryable);
  return {
    ...INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE,
    phase: 'ready',
    products: result.value,
  };
}

export async function runNativePurchase(input: {
  port: InAppPurchasePort;
  request: InAppPurchaseRequest;
  disclosure: NativePurchaseDisclosureDecision;
}): Promise<NativePurchaseWorkflowState> {
  if (!input.disclosure.ready) return failed('purchase_disclosure_required', false);
  if (
    input.disclosure.disclosure.productId !== input.request.productId
    || input.disclosure.disclosure.purchaseOptionId !== input.request.purchaseOptionId
  ) {
    return failed('purchase_disclosure_mismatch', false);
  }
  const result = await input.port.purchase(input.request);
  if (!result.ok) return failed(result.error.code, result.error.retryable);
  return {
    ...INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE,
    phase: 'awaiting_server_verification',
    evidence: [result.value],
  };
}

export async function runNativePurchaseRestore(input: {
  port: InAppPurchasePort;
  request: InAppPurchaseRestoreRequest;
}): Promise<NativePurchaseWorkflowState> {
  const result = await input.port.restore(input.request);
  if (!result.ok) return failed(result.error.code, result.error.retryable);
  if (result.value.length === 0) return failed('purchase_not_found', false);
  return {
    ...INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE,
    phase: 'awaiting_server_verification',
    evidence: result.value,
  };
}

export async function openNativeSubscriptionManagement(
  port: InAppPurchasePort,
): Promise<NativePurchaseWorkflowState> {
  const result = await port.openSubscriptionManagement();
  if (!result.ok) return failed(result.error.code, result.error.retryable);
  return { ...INITIAL_NATIVE_PURCHASE_WORKFLOW_STATE, phase: 'idle' };
}
