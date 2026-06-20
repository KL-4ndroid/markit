import type { StaffCapability } from '@/lib/permissions/role-capabilities';
import type { StaffRole } from '@/types/staff';

export const PENDING_OPERATION_STATUSES = [
  'pending',
  'processing',
  'synced',
  'failed_retryable',
  'failed_permanent',
  'blocked_permission',
] as const;

export type PendingOperationStatus = (typeof PENDING_OPERATION_STATUSES)[number];

export type PendingOperationType =
  | 'field_note_create'
  | 'field_note_update'
  | 'field_note_delete'
  | 'checklist_item_create'
  | 'checklist_item_update'
  | 'checklist_item_delete'
  | 'checklist_item_toggle';

export type PendingOperationEntityType = 'field_note' | 'checklist_item';

export type PendingOperationRoleSnapshot = {
  isOwner: boolean;
  staffRole: StaffRole | null;
  capabilities: StaffCapability[];
};

export type LocalPendingOperation<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  operationId: string;
  operationType: PendingOperationType;
  entityType: PendingOperationEntityType;
  entityId: string;
  marketId: string;
  payload: TPayload;
  idempotencyKey: string;
  actorId: string;
  roleSnapshot: PendingOperationRoleSnapshot;
  createdAt: string;
  updatedAt: string;
  status: PendingOperationStatus;
  retryCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

export type CreateLocalPendingOperationInput<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> = {
  operationId: string;
  operationType: PendingOperationType;
  entityType: PendingOperationEntityType;
  entityId: string;
  marketId: string;
  payload: TPayload;
  idempotencyKey: string;
  actorId: string;
  roleSnapshot: PendingOperationRoleSnapshot;
  now?: string;
};

export type PendingOperationFailureInput = {
  code: string;
  message: string;
  now?: string;
};

function requireNonBlank(value: string, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} is required`);
  }

  return value;
}

function requirePayload(value: Record<string, unknown>): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('payload must be an object');
  }

  return value;
}

function requireRoleSnapshot(value: PendingOperationRoleSnapshot): PendingOperationRoleSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('roleSnapshot is required');
  }

  if (!Array.isArray(value.capabilities)) {
    throw new Error('roleSnapshot.capabilities must be an array');
  }

  return {
    isOwner: value.isOwner === true,
    staffRole: value.staffRole ?? null,
    capabilities: [...value.capabilities],
  };
}

function timestamp(now?: string): string {
  return now ?? new Date().toISOString();
}

export function createLocalPendingOperation<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
>(
  input: CreateLocalPendingOperationInput<TPayload>
): LocalPendingOperation<TPayload> {
  const now = timestamp(input.now);

  return {
    operationId: requireNonBlank(input.operationId, 'operationId'),
    operationType: input.operationType,
    entityType: input.entityType,
    entityId: requireNonBlank(input.entityId, 'entityId'),
    marketId: requireNonBlank(input.marketId, 'marketId'),
    payload: requirePayload(input.payload) as TPayload,
    idempotencyKey: requireNonBlank(input.idempotencyKey, 'idempotencyKey'),
    actorId: requireNonBlank(input.actorId, 'actorId'),
    roleSnapshot: requireRoleSnapshot(input.roleSnapshot),
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    retryCount: 0,
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

export function markPendingOperationProcessing<TPayload extends Record<string, unknown>>(
  operation: LocalPendingOperation<TPayload>,
  now?: string
): LocalPendingOperation<TPayload> {
  return {
    ...operation,
    status: 'processing',
    updatedAt: timestamp(now),
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

export function markPendingOperationSynced<TPayload extends Record<string, unknown>>(
  operation: LocalPendingOperation<TPayload>,
  now?: string
): LocalPendingOperation<TPayload> {
  return {
    ...operation,
    status: 'synced',
    updatedAt: timestamp(now),
    lastErrorCode: null,
    lastErrorMessage: null,
  };
}

export function markPendingOperationRetryableFailure<TPayload extends Record<string, unknown>>(
  operation: LocalPendingOperation<TPayload>,
  failure: PendingOperationFailureInput
): LocalPendingOperation<TPayload> {
  return {
    ...operation,
    status: 'failed_retryable',
    updatedAt: timestamp(failure.now),
    retryCount: operation.retryCount + 1,
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
  };
}

export function markPendingOperationPermanentFailure<TPayload extends Record<string, unknown>>(
  operation: LocalPendingOperation<TPayload>,
  failure: PendingOperationFailureInput
): LocalPendingOperation<TPayload> {
  return {
    ...operation,
    status: 'failed_permanent',
    updatedAt: timestamp(failure.now),
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
  };
}

export function markPendingOperationPermissionBlocked<TPayload extends Record<string, unknown>>(
  operation: LocalPendingOperation<TPayload>,
  failure: PendingOperationFailureInput
): LocalPendingOperation<TPayload> {
  return {
    ...operation,
    status: 'blocked_permission',
    updatedAt: timestamp(failure.now),
    lastErrorCode: failure.code,
    lastErrorMessage: failure.message,
  };
}

export function shouldRetryPendingOperation(
  operation: LocalPendingOperation
): boolean {
  return operation.status === 'failed_retryable';
}
