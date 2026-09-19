export type MarketTextImportReleaseGateStatus = {
  enabled: boolean;
  environment: 'local' | 'staging' | 'production';
  reason:
    | 'local_default'
    | 'local_disabled'
    | 'staging_enabled'
    | 'staging_disabled'
    | 'production_enabled'
    | 'production_locked';
};

export type MarketTextImportReleaseGateInput = {
  nodeEnv?: string;
  publicAppEnv?: string;
  explicitSetting?: string;
  allowProductionSetting?: string;
};

export function resolveMarketTextImportReleaseGateStatus(
  input: MarketTextImportReleaseGateInput,
): MarketTextImportReleaseGateStatus {
  const publicAppEnv = input.publicAppEnv?.trim().toLowerCase();

  if (input.nodeEnv !== 'production') {
    return {
      enabled: input.explicitSetting !== '0',
      environment: 'local',
      reason: input.explicitSetting === '0' ? 'local_disabled' : 'local_default',
    };
  }

  if (publicAppEnv === 'staging' || publicAppEnv === 'preview') {
    const enabled = input.explicitSetting === '1';
    return {
      enabled,
      environment: 'staging',
      reason: enabled ? 'staging_enabled' : 'staging_disabled',
    };
  }

  const enabled = input.explicitSetting === '1' && input.allowProductionSetting === '1';
  return {
    enabled,
    environment: 'production',
    reason: enabled ? 'production_enabled' : 'production_locked',
  };
}

export function getMarketTextImportReleaseGateStatus(): MarketTextImportReleaseGateStatus {
  return resolveMarketTextImportReleaseGateStatus({
    nodeEnv: process.env.NODE_ENV,
    publicAppEnv: process.env.NEXT_PUBLIC_APP_ENV,
    explicitSetting: process.env.NEXT_PUBLIC_MARKET_TEXT_IMPORT_ENABLED,
    allowProductionSetting: process.env.NEXT_PUBLIC_MARKET_TEXT_IMPORT_ALLOW_PRODUCTION,
  });
}

export function isMarketTextImportEnabled(): boolean {
  return getMarketTextImportReleaseGateStatus().enabled;
}
