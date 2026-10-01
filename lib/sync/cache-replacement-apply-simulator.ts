import type {
  CacheReplacementPreview,
  CacheReplacementRecord,
  CacheReplacementScope,
} from './cache-replacement-preview';

export type CacheReplacementSimulatedOperationType =
  | 'add'
  | 'update'
  | 'keep'
  | 'skip_pending'
  | 'skip_local_only'
  | 'skip_blocked'
  | 'delete_candidate';

export type CacheReplacementSimulatedOperation<
  TLocal extends CacheReplacementRecord,
  TRemote extends CacheReplacementRecord,
> = {
  type: CacheReplacementSimulatedOperationType;
  id: string;
  local?: TLocal;
  remote?: TRemote;
  destructive: boolean;
  requiresApproval: boolean;
};

export type CacheReplacementApplySimulation<
  TLocal extends CacheReplacementRecord,
  TRemote extends CacheReplacementRecord,
> = {
  scope: CacheReplacementScope;
  canExecute: false;
  requiresExplicitExecuteApproval: true;
  operations: Array<CacheReplacementSimulatedOperation<TLocal, TRemote>>;
  counts: Record<CacheReplacementSimulatedOperationType, number>;
  destructiveOperationCount: number;
  warnings: string[];
};

function emptyCounts(): Record<CacheReplacementSimulatedOperationType, number> {
  return {
    add: 0,
    update: 0,
    keep: 0,
    skip_pending: 0,
    skip_local_only: 0,
    skip_blocked: 0,
    delete_candidate: 0,
  };
}

export function simulateCacheReplacementApply<
  TLocal extends CacheReplacementRecord,
  TRemote extends CacheReplacementRecord,
>(
  preview: CacheReplacementPreview<TLocal, TRemote>
): CacheReplacementApplySimulation<TLocal, TRemote> {
  const operations: Array<CacheReplacementSimulatedOperation<TLocal, TRemote>> = [];

  for (const remote of preview.wouldAdd) {
    operations.push({
      type: 'add',
      id: remote.id,
      remote,
      destructive: false,
      requiresApproval: true,
    });
  }

  for (const { local, remote } of preview.wouldUpdate) {
    operations.push({
      type: 'update',
      id: local.id,
      local,
      remote,
      destructive: false,
      requiresApproval: true,
    });
  }

  for (const local of preview.wouldKeep) {
    operations.push({
      type: 'keep',
      id: local.id,
      local,
      destructive: false,
      requiresApproval: false,
    });
  }

  for (const local of preview.wouldSkipPending) {
    operations.push({
      type: 'skip_pending',
      id: local.id,
      local,
      destructive: false,
      requiresApproval: false,
    });
  }

  for (const local of preview.wouldSkipLocalOnly) {
    operations.push({
      type: 'skip_local_only',
      id: local.id,
      local,
      destructive: false,
      requiresApproval: false,
    });
  }

  for (const local of preview.wouldSkipBlocked) {
    operations.push({
      type: 'skip_blocked',
      id: local.id,
      local,
      destructive: false,
      requiresApproval: false,
    });
  }

  for (const local of preview.wouldDeleteCandidates) {
    operations.push({
      type: 'delete_candidate',
      id: local.id,
      local,
      destructive: true,
      requiresApproval: true,
    });
  }

  const counts = emptyCounts();
  for (const operation of operations) {
    counts[operation.type]++;
  }

  return {
    scope: preview.scope,
    canExecute: false,
    requiresExplicitExecuteApproval: true,
    operations,
    counts,
    destructiveOperationCount: operations.filter(operation => operation.destructive).length,
    warnings: [...preview.warnings],
  };
}
