export const SYNC_GATE_D_FLAGS = Object.freeze({
  cloudPendingOperationsStorage: false,
  pendingOperationWriteRouting: false,
  pendingOperationDrainAfterEnqueue: false,
  cacheReplacementExecute: false,
} as const);

export type SyncGateDFlagName = keyof typeof SYNC_GATE_D_FLAGS;

export function isSyncGateDFlagName(flagName: string): flagName is SyncGateDFlagName {
  return Object.prototype.hasOwnProperty.call(SYNC_GATE_D_FLAGS, flagName);
}

export function isSyncGateDFlagEnabled(flagName: string): boolean {
  if (!isSyncGateDFlagName(flagName)) {
    return false;
  }

  return SYNC_GATE_D_FLAGS[flagName];
}

export function getSyncGateDFlags(): Record<SyncGateDFlagName, false> {
  return { ...SYNC_GATE_D_FLAGS };
}
