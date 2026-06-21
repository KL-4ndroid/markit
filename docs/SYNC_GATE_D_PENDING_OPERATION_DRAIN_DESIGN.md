# BoothBook Sync Gate D Pending Operation Drain Design

Created: 2026-06-21
Status: D3c-2 design complete; D3c-2b single-operation drain RPC draft complete; D3c-2c gated runtime drain call complete

## 0. Purpose

This document designs how a queued `pending_operations` row should become a final cloud event.

This document is the design record for the D3c drain path.

D3c-2b implementation status:
- `supabase/migrations/050_drain_checklist_toggle_pending_operation.sql` adds the single-operation drain RPC draft.
- `tests/supabase-pending-operations-drain-rpc.test.ts` locks the SQL/static safety boundaries.

D3c-2c implementation status:
- `lib/markets/field-ops-write-router.ts` can call the drain RPC only after a successful checklist-toggle enqueue.
- `pendingOperationDrainAfterEnqueue` is a dedicated drain flag and remains default-off.
- Local event behavior remains primary and unchanged.

Still not approved:
- No batch drain/worker is approved by this document.
- No feature flag default change is approved by this document.
- No RLS policy change is approved by this document.
- No UI, cache replacement, revenue, inventory, market, or product behavior is approved by this document.

## 1. Recommendation

Recommended first implementation:
- Add a narrow single-operation SECURITY DEFINER drain RPC before any service-role batch worker.

Proposed RPC shape:
- `public.drain_checklist_toggle_pending_operation(p_operation_id TEXT)`

Why this is the safest first step:
- It keeps processing limited to one explicit pending operation.
- It avoids introducing a service-role background processor yet.
- It avoids direct client insert into final `events`.
- It can re-check live permission inside the database.
- It can be tested with one checklist toggle operation before broader worker behavior exists.

Not recommended first:
- Do not create a database trigger that turns every pending row into an event immediately.
- Do not create a broad service-role batch worker as the first drain implementation.
- Do not allow direct client writes to `pending_operations` or final `events` for this pilot.
- Do not enable `pendingOperationWriteRouting` by default before the drain path is proven.

## 2. Scope

Approved pilot scope for the future drain implementation:
- Operation type: `checklist_item_toggle`
- Entity type: `checklist_item`
- Final event type: `checklist_item_updated`
- Required payload:
  - `market_id`
  - `itemId`
  - `completed`

Explicitly out of scope:
- Field notes.
- Checklist create/update/delete text operations.
- Revenue, cost, profit, inventory, product, market, staff management, and cache replacement behavior.

## 3. Source Of Truth

The existing event model remains the source of truth.

Meaning:
- `pending_operations` is delivery/retry state, not business state.
- The final durable business record is still an `events` row.
- A pending row that never drains must not be treated as a completed cloud business event.
- Local UI remains event-sourced from local events.

## 4. State Machine

Allowed drain status transitions:
- `pending` -> `processing` -> `synced`
- `failed_retryable` -> `processing` -> `synced`
- `pending` or `failed_retryable` -> `processing` -> `blocked_permission`
- `pending` or `failed_retryable` -> `processing` -> `failed_retryable`
- `pending` or `failed_retryable` -> `processing` -> `failed_permanent`

Rows that must not be processed:
- `synced`
- `blocked_permission`
- `failed_permanent`
- `processing` rows owned by another active drain attempt

Recommended retry policy:
- Retry only `failed_retryable`.
- Never auto-retry `blocked_permission`.
- Never auto-retry `failed_permanent`.
- Add a max retry count before any batch worker exists.

## 5. Claim And Lock

The drain RPC should atomically claim one row before doing work.

Recommended behavior:
- Select the pending row by `operation_id`.
- Lock it with `FOR UPDATE`.
- Only claim rows with status `pending` or `failed_retryable`.
- Set status to `processing` before final event creation.
- Increment `retry_count` only when marking `failed_retryable`.
- Store `last_error_code` and `last_error_message` for every failure state.

Reason:
- Two sessions must not create the same final event from the same pending row.
- A stuck `processing` row should need an explicit future recovery policy, not silent reprocessing.

## 6. Live Permission Recheck

The drain RPC must re-check permission live before creating the final event.

Required rule:
- `role_snapshot` is evidence only, not authority.

Owner permission:
- Allow if `public.markets.owner_id = pending_operations.actor_id`.

Staff permission:
- Allow only when an active `public.staff_relationships` row exists for the same market owner:
  - `sr.staff_id = pending_operations.actor_id`
  - `sr.status = 'active'`
  - `sr.role IN ('operator', 'manager')`

Blocked permission:
- If actor is no longer owner, active operator, or active manager, mark the row `blocked_permission`.
- Do not create the final event.
- Do not auto-retry.

Viewer:
- Viewer must always fail closed for checklist toggle drain.

## 7. Payload Validation

The drain RPC must validate the pending row before creating an event.

Required checks:
- `operation_type = 'checklist_item_toggle'`
- `entity_type = 'checklist_item'`
- `payload` is an object
- `payload.market_id` equals `pending_operations.market_id::TEXT`
- `payload.itemId` is a non-empty string
- `payload.completed` is boolean
- `entity_id` equals `payload.itemId`

Permanent failure:
- Invalid operation type, entity type, malformed payload, or mismatched entity should become `failed_permanent`.
- Do not create the final event.

## 8. Idempotency

The final event must be idempotent.

Recommended event id:
- Use `pending_operations.operation_id::UUID` as the final `events.id` for the checklist toggle pilot.

Reason:
- The adapter already creates `operation_id` with `generateUUID()`.
- Retrying the same pending operation naturally targets the same final event id.
- If the event already exists, the drain can mark the pending row `synced` instead of creating a duplicate.

Required duplicate behavior:
- If an event with the derived id already exists and matches the expected checklist toggle event, mark the pending row `synced`.
- If an event with the derived id exists but does not match the pending operation, mark `failed_permanent`.
- Do not create another event with a different id for the same pending operation.
- Preserve the existing `(actor_id, idempotency_key)` unique constraint as the enqueue-side duplicate guard.

Recommended event metadata:
- `pendingOperationId`
- `idempotencyKey`
- `drainedAt`
- `source: 'pending_operations'`

## 9. Final Event Shape

For `checklist_item_toggle`, create:
- `events.id = pending_operations.operation_id::UUID`
- `events.type = 'checklist_item_updated'`
- `events.payload = pending_operations.payload`
- `events.actor_id = pending_operations.actor_id`
- `events.market_id = pending_operations.market_id`
- `events.timestamp = pending_operations.created_at`
- `events.metadata` includes the pending operation metadata listed above

Timestamp recommendation:
- Use `pending_operations.created_at` for the event timestamp so replay order reflects enqueue time.

## 10. Error Classification

Use `blocked_permission` for:
- Actor is no longer owner.
- Staff relationship is revoked, pending, missing, or not active.
- Staff role is downgraded to viewer or unknown.

Use `failed_permanent` for:
- Unsupported operation type.
- Unsupported entity type.
- Invalid or mismatched payload.
- Invalid `operation_id` UUID format.
- Existing event id collision with different event content.

Use `failed_retryable` for:
- Transient database errors.
- Lock contention that cannot claim the row.
- Temporary insert failure that is not permission or payload related.

## 11. Observability

Minimum diagnostic fields:
- `status`
- `retry_count`
- `last_error_code`
- `last_error_message`
- `updated_at`

No new user-facing UI is approved yet.

Future diagnostics can be owner-only, but that must be a separate approval.

## 12. Rollback

Rollback behavior:
- Turning `pendingOperationWriteRouting` off stops new enqueue attempts from the adapter.
- Existing pending rows can remain ignored while drain is disabled.
- Do not drop `pending_operations` while rows exist unless they are exported, drained, or explicitly abandoned.
- Do not delete failed rows automatically in the first pilot.

## 13. Future Slices

Recommended next slices:

### D3c-2b: Single Operation Drain RPC Draft

Allowed only after approval:
- Add one SECURITY DEFINER RPC for `checklist_item_toggle`.
- Add SQL/static tests for claim, permission re-check, idempotency, and statuses.
- Do not connect runtime to call it in the same commit.

Status:
- Completed as `supabase/migrations/050_drain_checklist_toggle_pending_operation.sql`.
- Runtime remains disconnected.

### D3c-2c: Runtime Drain Call Behind Flag

Allowed only after D3c-2b passes:
- Call the drain RPC after enqueue only when a dedicated test/staging flag is enabled.
- Keep local event behavior unchanged.
- Keep `pendingOperationWriteRouting` default-off unless explicitly approved.

Status:
- Completed in `lib/markets/field-ops-write-router.ts`.
- Requires both the existing enqueue route and `pendingOperationDrainAfterEnqueue`.
- Both flags remain default-off.

### D3c-2d: Controlled Test Or Staging Enablement

Allowed only after D3c-2c passes:
- Enable the two flags only in a controlled test/staging harness.
- Verify enqueue + drain against the already-applied 049/050 functions.
- Do not enable production defaults.

### D3c-3: Batch Worker

Allowed only after the single-operation drain is proven:
- Consider a service-role batch worker.
- Add owner-only diagnostics and recovery rules first.
- Add stuck `processing` recovery policy before background retries.
