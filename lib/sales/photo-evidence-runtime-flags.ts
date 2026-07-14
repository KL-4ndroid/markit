export const SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_FLAG = 'salesPhotoEvidenceRuntimeEnqueue' as const;

export type SalesPhotoEvidenceRuntimeGateStatus = {
  enabled: boolean;
  environment: 'local' | 'staging' | 'production';
  reason: 'local_default' | 'local_disabled' | 'staging_enabled' | 'staging_disabled' | 'production_locked';
};

export type SalesPhotoEvidenceRuntimeGateInput = {
  nodeEnv?: string;
  publicAppEnv?: string;
  explicitSetting?: string;
};

export function resolveSalesPhotoEvidenceRuntimeGateStatus(
  input: SalesPhotoEvidenceRuntimeGateInput
): SalesPhotoEvidenceRuntimeGateStatus {
  const publicAppEnv = input.publicAppEnv?.trim().toLowerCase();
  const explicitSetting = input.explicitSetting;

  if (input.nodeEnv !== 'production') {
    return {
      enabled: explicitSetting !== '0',
      environment: 'local',
      reason: explicitSetting === '0' ? 'local_disabled' : 'local_default',
    };
  }

  if (publicAppEnv === 'staging' || publicAppEnv === 'preview') {
    return {
      enabled: explicitSetting === '1',
      environment: 'staging',
      reason: explicitSetting === '1' ? 'staging_enabled' : 'staging_disabled',
    };
  }

  return {
    enabled: false,
    environment: 'production',
    reason: 'production_locked',
  };
}

export function getSalesPhotoEvidenceRuntimeGateStatus(): SalesPhotoEvidenceRuntimeGateStatus {
  return resolveSalesPhotoEvidenceRuntimeGateStatus({
    nodeEnv: process.env.NODE_ENV,
    publicAppEnv: process.env.NEXT_PUBLIC_APP_ENV,
    explicitSetting: process.env.NEXT_PUBLIC_SALES_PHOTO_EVIDENCE_RUNTIME_ENQUEUE_ENABLED,
  });
}

export function isSalesPhotoEvidenceRuntimeEnqueueEnabled(): boolean {
  return getSalesPhotoEvidenceRuntimeGateStatus().enabled;
}
