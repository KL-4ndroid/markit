export type CloudRebuildScope = 'owner-full' | 'manager-market-scope' | 'staff-view';

export type CloudRebuildActorRole = 'owner' | 'manager' | 'operator' | 'viewer' | 'unknown';

export type CloudRebuildTableName =
  | 'markets'
  | 'products'
  | 'events'
  | 'dailyStats'
  | 'settings'
  | 'fieldNotes'
  | 'checklistItems';

export type CloudRebuildPendingPreClearDecision = 'allowed' | 'blocked' | 'unknown';

export type CloudRebuildPendingPreClearSummary = {
  decision: CloudRebuildPendingPreClearDecision;
  blockingReasonCodes: string[];
  unresolvedOperationIds: string[];
};

export type CloudRebuildLocalTableSummary = {
  table: CloudRebuildTableName;
  rowCount: number;
  protectedRowCount?: number;
};

export type CloudRebuildCloudSourceSummary = {
  source: string;
  rowCount: number;
  error?: string | null;
};

export type CloudRebuildPreviewInput = {
  actorId: string;
  actorRole: CloudRebuildActorRole;
  scope: CloudRebuildScope;
  checkedAt: string;
  localTables: CloudRebuildLocalTableSummary[];
  cloudSources: CloudRebuildCloudSourceSummary[];
  pendingPreClear: CloudRebuildPendingPreClearSummary;
  localUnsyncedRowCount: number;
  localOnlyRowCount: number;
};

export type CloudRebuildPreview = {
  actorId: string;
  actorRole: CloudRebuildActorRole;
  scope: CloudRebuildScope;
  checkedAt: string;
  wouldClearTables: CloudRebuildLocalTableSummary[];
  wouldReadCloudSources: CloudRebuildCloudSourceSummary[];
  cloudRowCount: number;
  localRowCount: number;
  protectedLocalRowCount: number;
  isBlocked: boolean;
  canProceedToExecute: false;
  blockingReasonCodes: string[];
  warnings: string[];
};

const BLOCKING_PENDING_DECISIONS = new Set<CloudRebuildPendingPreClearDecision>([
  'blocked',
  'unknown',
]);

function safeCount(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort();
}

export function buildCloudRebuildPreview(input: CloudRebuildPreviewInput): CloudRebuildPreview {
  const blockingReasonCodes: string[] = [];
  const warnings: string[] = [];

  if (!input.actorId) {
    blockingReasonCodes.push('missing_actor_id');
  }

  if (input.actorRole !== 'owner') {
    blockingReasonCodes.push('actor_not_owner');
  }

  if (input.scope !== 'owner-full') {
    blockingReasonCodes.push('non_owner_full_scope_execute_not_approved');
  }

  if (BLOCKING_PENDING_DECISIONS.has(input.pendingPreClear.decision)) {
    blockingReasonCodes.push('pending_operations_not_clear');
  }

  if (input.pendingPreClear.blockingReasonCodes.length > 0) {
    blockingReasonCodes.push(...input.pendingPreClear.blockingReasonCodes);
  }

  if (input.pendingPreClear.unresolvedOperationIds.length > 0) {
    blockingReasonCodes.push('pending_operations_unresolved');
  }

  if (input.localUnsyncedRowCount > 0) {
    blockingReasonCodes.push('local_unsynced_rows');
  }

  if (input.localOnlyRowCount > 0) {
    blockingReasonCodes.push('local_only_rows');
  }

  const cloudReadErrors = input.cloudSources.filter(source => source.error);
  if (cloudReadErrors.length > 0) {
    blockingReasonCodes.push('cloud_read_errors');
    for (const source of cloudReadErrors) {
      warnings.push(`cloud source ${source.source} has read error`);
    }
  }

  const cloudRowCount = input.cloudSources.reduce((total, source) => total + safeCount(source.rowCount), 0);
  if (cloudRowCount === 0) {
    blockingReasonCodes.push('cloud_rows_empty_without_empty_account_proof');
  }

  const localRowCount = input.localTables.reduce((total, table) => total + safeCount(table.rowCount), 0);
  const protectedLocalRowCount = input.localTables.reduce(
    (total, table) => total + safeCount(table.protectedRowCount),
    0
  );

  if (protectedLocalRowCount > 0) {
    blockingReasonCodes.push('protected_local_rows');
  }

  return {
    actorId: input.actorId,
    actorRole: input.actorRole,
    scope: input.scope,
    checkedAt: input.checkedAt,
    wouldClearTables: input.localTables.map(table => ({ ...table })),
    wouldReadCloudSources: input.cloudSources.map(source => ({ ...source })),
    cloudRowCount,
    localRowCount,
    protectedLocalRowCount,
    isBlocked: blockingReasonCodes.length > 0,
    canProceedToExecute: false,
    blockingReasonCodes: uniqueSorted(blockingReasonCodes),
    warnings,
  };
}
