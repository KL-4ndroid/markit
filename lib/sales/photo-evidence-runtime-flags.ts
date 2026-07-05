export const SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_FLAG = 'salesPhotoEvidenceRuntimeEnqueue' as const;

const SALES_PHOTO_EVIDENCE_RUNTIME_FLAGS = Object.freeze({
  [SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_FLAG]: false,
});

export function isSalesPhotoEvidenceRuntimeEnqueueEnabled(): boolean {
  return SALES_PHOTO_EVIDENCE_RUNTIME_FLAGS[SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_FLAG];
}
