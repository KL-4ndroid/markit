# BoothBook Sync Phase 3/4 Risk Reduction Plan

Created: 2026-06-20
Status: execution guardrail plan

## 0. Purpose

This document turns Phase 3 and Phase 4 of `SYNC_ARCHITECTURE_REFACTOR_EXECUTION_PLAN.md` into a lower-risk execution path.

Phase 1 and Phase 2 are now focused on characterization tests and service extraction. The next phases are different: they can affect database schema, pending write semantics, cache replacement, and local data deletion/overwrite behavior. Those changes must not be enabled directly in the production sync path.

## 1. Current Safety Boundary

The current production sync behavior must remain unchanged until a separate approval decision is made.

Allowed now:
- Add documentation.
- Add audit/guardrail tests.
- Add local-only prototype services that are not imported by production sync paths.
- Add dry-run preview functions that do not write to IndexedDB or Supabase.
- Add tests for preview logic.

Not allowed without explicit approval:
- Create or modify Supabase schema for `pending_operations`.
- Add any `pending_operations` migration.
- Route production writes through `pending_operations`.
- Replace staff or owner production pull with replace-cache.
- Delete or overwrite local cache through a new replace-cache path.
- Change RLS policies, views, or security definer functions.
- Change financial/inventory projection behavior as part of Phase 3/4.

Current approved narrow exceptions:
- Gate D2a has been explicitly approved and completed as
  `supabase/migrations/048_add_pending_operations_schema.sql`.
- D3c-0 through D3c-2n have since progressed only through the documented checklist-toggle pilot, drain RPC draft, default-off controlled routing, owner-only diagnostics, stale `processing` recovery planning/action, manual smoke scripts, and retry/drain action design.
- D3c-2m local/staging synthetic stale recovery execution passed on 2026-06-26 Asia/Taipei.
- D3c-2n-1 owner-only single-row service wrapper draft is implemented; D3c-2n-2 owner UI button is implemented and remains limited to owner-created `failed_retryable` checklist-toggle rows; D3c-2n-3 local/staging manual verification passed on 2026-06-29 Asia/Taipei.
- These exceptions do not approve broad production write routing, a worker, cache replacement execute behavior, RLS changes beyond the approved migrations, production synthetic data creation, or feature-flag default changes.

## 2. Risk Areas

### 2.1 `pending_operations`

Primary risks:
- Schema migration is hard to roll back once deployed.
- A second pending-write model can conflict with existing `events.sync_status`.
- Retry semantics can duplicate event writes if idempotency is incomplete.
- Role downgrade/revoke can leave blocked operations in ambiguous states.

Risk reduction:
- Start with local-only modeling.
- Do not write to Supabase.
- Do not replace `events.sync_status`.
- Use low-sensitivity domains first, such as checklist and field notes.
- Require an explicit idempotency key in the model before cloud migration is considered.

### 2.2 replace-cache

Primary risks:
- Authorized-scope replacement can accidentally delete local-only events.
- Staff view pulls are partial by design; treating them like complete owner state can hide or erase data.
- Role downgrade can create confusing cache transitions.
- Financial and inventory projections can be overwritten from incomplete local event history.

Risk reduction:
- Start with preview-only functions.
- Preview must report add/update/keep/skip/delete candidates.
- Preview must never write to IndexedDB.
- Production staff and owner sync paths must continue using current merge/cache writer behavior.
- Any future execute path must preserve `pending`, `local_only`, `blocked`, and permission-failed records.

## 3. Execution Gates

### Gate A: Documentation and Guardrails

Goal:
- Make high-risk boundaries testable.

Tasks:
- Add this document.
- Add a guardrail test that fails if `pending_operations` appears in migrations or production code.
- Add a guardrail test that fails if replace-cache production hooks/services are introduced without a deliberate test update.

Allowed files:
- `docs/*`
- `tests/*`
- `package.json` only to include a guardrail test in `npm test`

No production code changes except test-only references.

Exit criteria:
- Guardrail test passes.
- `npm test`, `npm run lint`, and `npm run build` pass.

### Gate B: Local-Only Pending Operation Model

Goal:
- Validate the operation shape without cloud schema.

Allowed:
- Add a pure TypeScript model and local-only helpers.
- Add tests for status transitions.
- Use checklist/field-note event types as examples.

Not allowed:
- Supabase migration.
- Production sync import.
- Production write-path replacement.

Required model fields before any cloud discussion:
- `operationId`
- `operationType`
- `entityType`
- `entityId`
- `marketId`
- `payload`
- `idempotencyKey`
- `actorId`
- `roleSnapshot`
- `createdAt`
- `updatedAt`
- `status`
- `retryCount`
- `lastErrorCode`
- `lastErrorMessage`

Required statuses:
- `pending`
- `processing`
- `synced`
- `failed_retryable`
- `failed_permanent`
- `blocked_permission`

Exit criteria:
- Tests prove idempotency key is required.
- Tests prove permission-blocked state does not retry automatically.
- Tests prove this model is not imported by production sync.

### Gate C: Replace-Cache Preview Only

Goal:
- Understand cache replacement impact without writing data.

Allowed:
- Add pure preview helpers.
- Add tests with representative owner/staff datasets.
- Produce summary counts.

Not allowed:
- IndexedDB writes.
- Production sync path import.
- Deleting local data.

Preview output must include:
- `scope`
- `authorizedIds`
- `wouldAdd`
- `wouldUpdate`
- `wouldKeep`
- `wouldSkipPending`
- `wouldSkipLocalOnly`
- `wouldSkipBlocked`
- `wouldDeleteCandidates`
- `warnings`

Exit criteria:
- Tests prove pending/local-only/blocked records are protected.
- Tests prove staff preview is scoped to authorized view data only.
- Tests prove preview is side-effect free.

### Gate D: Manual Approval Before Any Real Write

Any of the following requires manual approval:
- Add another Supabase migration for `pending_operations` after 048.
- Change RLS policy for `pending_operations` after 048.
- Add replace-cache execute mode.
- Import replace-cache into `staff-pull-service` or `owner-pull-service`.
- Use replace-cache outside a test/debug-only path.
- Remove legacy merge/cache writer behavior.

## 4. Recommended Next Step

Gate A, Gate B, Gate C preview work, and selected narrow Gate D checklist-toggle slices have already been completed under later decision records.

The current next step is limited to:
- Documentation alignment.
- Static/audit guardrail tests.
- Read-only diagnostics or design work.
- Non-mutating preview work that is not imported by production sync.

Do not proceed into D3c-2n-4 production disposable verification until explicit high-risk approval is given for that slice and one disposable owner-created production row is selected.

## 5. Rollback Approach

Gate A rollback:
- Remove guardrail test and document.

Gate B rollback:
- Remove local-only prototype files and tests.
- No migration rollback needed because no schema changes are allowed.

Gate C rollback:
- Remove preview helpers and tests.
- No data rollback needed because preview is side-effect free.

Any Gate D work must include a dedicated rollback plan before implementation begins.
