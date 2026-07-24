import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

export type PendingOperationDiagnosticsStateGroup =
  | 'healthy'
  | 'needs_attention'
  | 'in_progress'
  | 'unknown';

export type OwnerPendingOperationDiagnosticsRow = {
  operationId: string;
  operationType: string;
  entityType: string;
  entityId: string;
  marketId: string;
  status: string;
  retryCount: number;
  actorId: string;
  createdAt: string;
  updatedAt: string;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  safeMetadata: Record<string, string>;
  ageBucket: string;
  stateGroup: PendingOperationDiagnosticsStateGroup;
  finalEventId: string | null;
  finalEventType: string | null;
  hasFinalEvent: boolean;
  finalEventMismatch: boolean;
};

type RawDiagnosticsRow = {
  operation_id?: unknown;
  operation_type?: unknown;
  entity_type?: unknown;
  entity_id?: unknown;
  market_id?: unknown;
  status?: unknown;
  retry_count?: unknown;
  actor_id?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  last_error_code?: unknown;
  last_error_message?: unknown;
  safe_metadata?: unknown;
  age_bucket?: unknown;
  state_group?: unknown;
  final_event_id?: unknown;
  final_event_type?: unknown;
  has_final_event?: unknown;
  final_event_mismatch?: unknown;
};

export async function listOwnerPendingOperationDiagnostics(
  ownerId: string
): Promise<OwnerPendingOperationDiagnosticsRow[]> {
  if (!ownerId) {
    throw new Error('ownerId is required');
  }

  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase.rpc('list_owner_pending_operation_diagnostics', {
    p_owner_id: ownerId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to load pending operation diagnostics');
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(normalizeDiagnosticsRow);
}

export async function recoverStaleProcessingPendingOperation(operationId: string): Promise<string> {
  if (!operationId) {
    throw new Error('operationId is required');
  }

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('recover_stale_processing_pending_operation', {
    p_operation_id: operationId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to recover stale processing operation');
  }

  return typeof data === 'string' ? data : '';
}

export type RetryDrainOwnerPendingOperationInput = {
  operationId: string;
  currentUserId: string;
  diagnosticsRow: Pick<
    OwnerPendingOperationDiagnosticsRow,
    'operationId' | 'operationType' | 'entityType' | 'status' | 'actorId'
  >;
};

export async function retryDrainOwnerChecklistTogglePendingOperation({
  operationId,
  currentUserId,
  diagnosticsRow,
}: RetryDrainOwnerPendingOperationInput): Promise<string> {
  assertRetryDrainAllowed({ operationId, currentUserId, diagnosticsRow });

  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { data, error } = await supabase.rpc('drain_checklist_toggle_pending_operation', {
    p_operation_id: operationId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to retry pending operation drain');
  }

  return typeof data === 'string' ? data : '';
}

function assertRetryDrainAllowed({
  operationId,
  currentUserId,
  diagnosticsRow,
}: RetryDrainOwnerPendingOperationInput): void {
  if (!operationId) {
    throw new Error('operationId is required');
  }

  if (!currentUserId) {
    throw new Error('currentUserId is required');
  }

  if (!diagnosticsRow) {
    throw new Error('diagnosticsRow is required');
  }

  if (diagnosticsRow.operationId !== operationId) {
    throw new Error('diagnostics row does not match operationId');
  }

  if (diagnosticsRow.status !== 'failed_retryable') {
    throw new Error('Only failed_retryable pending operations can be retried');
  }

  if (diagnosticsRow.actorId !== currentUserId) {
    throw new Error('Only owner-created pending operations can be retried by this action');
  }

  if (diagnosticsRow.operationType !== 'checklist_item_toggle') {
    throw new Error('Only checklist_item_toggle pending operations can be retried');
  }

  if (diagnosticsRow.entityType !== 'checklist_item') {
    throw new Error('Only checklist_item pending operations can be retried');
  }
}

function normalizeDiagnosticsRow(row: RawDiagnosticsRow): OwnerPendingOperationDiagnosticsRow {
  return {
    operationId: readString(row.operation_id),
    operationType: readString(row.operation_type),
    entityType: readString(row.entity_type),
    entityId: readString(row.entity_id),
    marketId: readString(row.market_id),
    status: readString(row.status),
    retryCount: readNumber(row.retry_count),
    actorId: readString(row.actor_id),
    createdAt: readString(row.created_at),
    updatedAt: readString(row.updated_at),
    lastErrorCode: readNullableString(row.last_error_code),
    lastErrorMessage: readNullableString(row.last_error_message),
    safeMetadata: readSafeMetadata(row.safe_metadata),
    ageBucket: readString(row.age_bucket),
    stateGroup: readStateGroup(row.state_group),
    finalEventId: readNullableString(row.final_event_id),
    finalEventType: readNullableString(row.final_event_type),
    hasFinalEvent: row.has_final_event === true,
    finalEventMismatch: row.final_event_mismatch === true,
  };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readStateGroup(value: unknown): PendingOperationDiagnosticsStateGroup {
  if (
    value === 'healthy' ||
    value === 'needs_attention' ||
    value === 'in_progress' ||
    value === 'unknown'
  ) {
    return value;
  }

  return 'unknown';
}

function readSafeMetadata(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => typeof entryValue === 'string')
      .map(([key, entryValue]) => [key, entryValue as string])
  );
}
