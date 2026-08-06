export const SYNC_GATE_D_FLAGS = Object.freeze({
  cloudPendingOperationsStorage: false,
  pendingOperationWriteRouting: false,
  pendingOperationDrainAfterEnqueue: false,
  cacheReplacementExecute: false,
} as const);

export type SyncGateDFlagName = keyof typeof SYNC_GATE_D_FLAGS;
export type SyncGateDFlagSnapshot = Record<SyncGateDFlagName, boolean>;

const CONTROLLED_TEST_REASON = 'D3c-2d controlled runtime verification';
const CONTROLLED_TEST_FLAG_NAMES = new Set<SyncGateDFlagName>([
  'pendingOperationWriteRouting',
  'pendingOperationDrainAfterEnqueue',
]);

let controlledTestOverrides: Partial<SyncGateDFlagSnapshot> = {};

export function isSyncGateDFlagName(flagName: string): flagName is SyncGateDFlagName {
  return Object.prototype.hasOwnProperty.call(SYNC_GATE_D_FLAGS, flagName);
}

export function isSyncGateDFlagEnabled(flagName: string): boolean {
  if (!isSyncGateDFlagName(flagName)) {
    return false;
  }

  const override = controlledTestOverrides[flagName];
  if (typeof override === 'boolean') {
    return override;
  }

  return SYNC_GATE_D_FLAGS[flagName];
}

export function getSyncGateDFlags(): SyncGateDFlagSnapshot {
  return {
    cloudPendingOperationsStorage: isSyncGateDFlagEnabled('cloudPendingOperationsStorage'),
    pendingOperationWriteRouting: isSyncGateDFlagEnabled('pendingOperationWriteRouting'),
    pendingOperationDrainAfterEnqueue: isSyncGateDFlagEnabled('pendingOperationDrainAfterEnqueue'),
    cacheReplacementExecute: isSyncGateDFlagEnabled('cacheReplacementExecute'),
  };
}

export function resetSyncGateDControlledTestFlags(): void {
  controlledTestOverrides = {};
}

export function setSyncGateDControlledTestFlags(
  overrides: Partial<SyncGateDFlagSnapshot>,
  reason: string
): () => void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Gate D controlled test flags cannot be enabled in production builds.');
  }

  if (reason !== CONTROLLED_TEST_REASON) {
    throw new Error('Gate D controlled test flags require the approved D3c-2d reason.');
  }

  for (const flagName of Object.keys(overrides)) {
    if (!isSyncGateDFlagName(flagName)) {
      throw new Error(`Unknown Gate D flag: ${flagName}`);
    }

    if (!CONTROLLED_TEST_FLAG_NAMES.has(flagName)) {
      throw new Error(`Gate D flag cannot be changed by the controlled test harness: ${flagName}`);
    }
  }

  controlledTestOverrides = {
    pendingOperationWriteRouting: overrides.pendingOperationWriteRouting === true,
    pendingOperationDrainAfterEnqueue: overrides.pendingOperationDrainAfterEnqueue === true,
  };

  return () => {
    resetSyncGateDControlledTestFlags();
  };
}
