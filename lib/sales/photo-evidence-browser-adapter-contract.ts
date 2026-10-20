import type {
  SalesPhotoEvidenceCapturePreparationDecision,
  SalesPhotoEvidenceCompressionOutputInfo,
  SalesPhotoEvidenceCompressionPlan,
} from '@/lib/sales/photo-evidence-capture-compression';

export const SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT_VERSION = 'slice-6b-browser-adapter-spec-only';

export type SalesPhotoEvidenceBrowserCapabilitySnapshot = {
  secureContext: boolean;
  mediaCaptureAvailable: boolean;
  imageProcessingAvailable: boolean;
};

export type SalesPhotoEvidenceBrowserReadinessBlockReason =
  | 'insecure_context'
  | 'media_capture_unavailable'
  | 'image_processing_unavailable';

export type SalesPhotoEvidenceBrowserAdapterReadinessDecision =
  | {
      ready: true;
      reason: 'browser_adapter_supported';
    }
  | {
      ready: false;
      reason: SalesPhotoEvidenceBrowserReadinessBlockReason;
      message: string;
    };

export type SalesPhotoEvidenceBrowserCaptureFailureReason =
  | 'adapter_unavailable'
  | 'permission_denied'
  | 'camera_not_found'
  | 'capture_cancelled'
  | 'source_decode_failed'
  | 'compression_failed'
  | 'thumbnail_generation_failed'
  | 'output_policy_rejected'
  | 'unexpected_adapter_error';

export type SalesPhotoEvidenceBrowserCaptureFailureSeverity = 'user_actionable' | 'retryable' | 'blocked';

export type SalesPhotoEvidenceBrowserCaptureFailureClassification = {
  reason: SalesPhotoEvidenceBrowserCaptureFailureReason;
  severity: SalesPhotoEvidenceBrowserCaptureFailureSeverity;
  shouldKeepEvidencePending: true;
  shouldWriteCloudMetadata: false;
  shouldUploadObject: false;
};

export type SalesPhotoEvidenceBrowserAdapterPlanInput = {
  captureDecision: SalesPhotoEvidenceCapturePreparationDecision;
  compressionPlan?: SalesPhotoEvidenceCompressionPlan;
};

export type SalesPhotoEvidenceBrowserAdapterPlanDecision =
  | {
      action: 'prepare_browser_adapter';
      reason: 'compression_plan_ready';
      plan: SalesPhotoEvidenceCompressionPlan;
    }
  | {
      action: 'reject_browser_adapter';
      reason: 'capture_precheck_failed' | 'missing_compression_plan';
      message: string;
    };

export type SalesPhotoEvidenceBrowserAdapterResult =
  | {
      action: 'capture_ready_for_local_store';
      image: SalesPhotoEvidenceCompressionOutputInfo;
      thumbnail: SalesPhotoEvidenceCompressionOutputInfo;
    }
  | {
      action: 'capture_failed';
      failure: SalesPhotoEvidenceBrowserCaptureFailureClassification;
    };

export type SalesPhotoEvidenceBrowserAdapterContract = {
  version: typeof SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT_VERSION;
  requiresSecureContext: true;
  requiresMediaCapture: true;
  requiresImageProcessing: true;
  outputMustBePolicyChecked: true;
  failureMustKeepEvidencePending: true;
  mustNotWriteCloudMetadata: true;
  mustNotUploadObject: true;
};

export const SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT: SalesPhotoEvidenceBrowserAdapterContract = Object.freeze({
  version: SALES_PHOTO_EVIDENCE_BROWSER_ADAPTER_CONTRACT_VERSION,
  requiresSecureContext: true,
  requiresMediaCapture: true,
  requiresImageProcessing: true,
  outputMustBePolicyChecked: true,
  failureMustKeepEvidencePending: true,
  mustNotWriteCloudMetadata: true,
  mustNotUploadObject: true,
});

export function classifySalesPhotoEvidenceBrowserAdapterReadiness(
  snapshot: SalesPhotoEvidenceBrowserCapabilitySnapshot
): SalesPhotoEvidenceBrowserAdapterReadinessDecision {
  if (!snapshot.secureContext) {
    return {
      ready: false,
      reason: 'insecure_context',
      message: 'Photo evidence capture requires a secure browser context.',
    };
  }

  if (!snapshot.mediaCaptureAvailable) {
    return {
      ready: false,
      reason: 'media_capture_unavailable',
      message: 'Photo evidence capture is not available on this browser or device.',
    };
  }

  if (!snapshot.imageProcessingAvailable) {
    return {
      ready: false,
      reason: 'image_processing_unavailable',
      message: 'Photo evidence compression is not available on this browser or device.',
    };
  }

  return {
    ready: true,
    reason: 'browser_adapter_supported',
  };
}

export function classifySalesPhotoEvidenceBrowserCaptureFailure(
  reason: SalesPhotoEvidenceBrowserCaptureFailureReason
): SalesPhotoEvidenceBrowserCaptureFailureClassification {
  const severity: SalesPhotoEvidenceBrowserCaptureFailureSeverity =
    reason === 'permission_denied' || reason === 'camera_not_found' || reason === 'capture_cancelled'
      ? 'user_actionable'
      : reason === 'adapter_unavailable' || reason === 'source_decode_failed'
        ? 'blocked'
        : 'retryable';

  return {
    reason,
    severity,
    shouldKeepEvidencePending: true,
    shouldWriteCloudMetadata: false,
    shouldUploadObject: false,
  };
}

export function createSalesPhotoEvidenceBrowserAdapterPlan(
  input: SalesPhotoEvidenceBrowserAdapterPlanInput
): SalesPhotoEvidenceBrowserAdapterPlanDecision {
  if (input.captureDecision.action !== 'prepare_compression') {
    return {
      action: 'reject_browser_adapter',
      reason: 'capture_precheck_failed',
      message: input.captureDecision.message,
    };
  }

  const plan = input.compressionPlan ?? input.captureDecision.plan;
  if (!plan) {
    return {
      action: 'reject_browser_adapter',
      reason: 'missing_compression_plan',
      message: 'Photo evidence browser adapter requires a prepared compression plan.',
    };
  }

  return {
    action: 'prepare_browser_adapter',
    reason: 'compression_plan_ready',
    plan,
  };
}
