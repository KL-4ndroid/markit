# Pending Operation Worker Model - 2026-06-29

Scope: design/model guardrail only.

This slice adds pure model helpers for future pending-operation worker planning. It does not add a background worker, timer, batch drain, runtime mount, Supabase call, or feature-flag default change.

## Added

- `derivePendingOperationFinalEventId()`
- `classifyPendingOperationWorkerCandidate()`
- `tests/sync-pending-operation-worker-model.test.ts`

## Model Boundary

The model classifies a row as a future worker candidate only when:

- status is `failed_retryable`
- retry count is below the configured max
- operation type is `checklist_item_toggle`
- entity type is `checklist_item`
- `operationId` is a UUID and can deterministically become the final event id

The model rejects:

- `pending`
- `processing`
- `synced`
- `failed_permanent`
- `blocked_permission`
- unsupported operation/entity types
- non-UUID operation ids

## Safety Boundary

Still not approved:

- Background worker
- Automatic retry
- Batch drain
- Staff-row drain
- Production default enablement
- Runtime sync integration

The production files remain checked for accidental worker mounting.
