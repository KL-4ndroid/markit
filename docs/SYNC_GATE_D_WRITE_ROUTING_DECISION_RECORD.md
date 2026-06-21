# BoothBook Sync Gate D Write Routing Decision Record

Created: 2026-06-21
Status: active Gate D decision record after D3c-2d

## 0. Purpose

This document defines the decisions required before BoothBook routes any production write through `pending_operations`.

Current approvals:
- D3b approved a disabled runtime adapter shell.
- D3c-0 approved a narrow checklist-toggle enqueue RPC.
- D3c-1 approved a dormant checklist-toggle RPC route behind a default-off flag.
- D3c-2b approved a single-operation checklist-toggle drain RPC draft.
- D3c-2c approved a gated runtime drain call after successful enqueue.
- D3c-2d approved controlled test/staging enablement for the two checklist-toggle flags.
- D3c-2e prepared a manual cloud smoke script and checklist; execution still requires disposable test data.

Still not approved:
- No UI behavior change is approved by this document.
- No Supabase RLS change after 048 is approved by this document.
- No cache replacement execute behavior is approved by this document.
- No broad worker, production flag default, or production-wide final-event writer is approved by this document.

## 1. Current State After 048

Completed:
- `public.pending_operations` exists in cloud schema.
- RLS is enabled.
- The table supports field-note and checklist operation shapes.
- `public.enqueue_checklist_toggle_pending_operation` exists as the only approved enqueue RPC.
- Production code can call the RPC only from the field-ops adapter when `pendingOperationWriteRouting` is explicitly enabled.
- The flag remains default-off, so default production behavior is still direct local event writes.

Important safety finding:
- The current staff insert policy may fail closed because it checks `public.markets`, while staff direct base-table SELECT is intentionally locked down after migration 041.
- This is safe for current production because no runtime uses `pending_operations`.
- Before a staff write pilot, do not assume client-side insert into `pending_operations` works for staff.

## 2. Decision 1: Source Of Truth

Question:
- When write routing starts, is `pending_operations` the source of truth, or is it an outbox around the existing event write model?

### Option A: Existing event model remains source of truth, `pending_operations` is an outbox

Recommendation:
- Choose Option A for the first runtime pilot.

Meaning:
- UI continues to read from local events/read models.
- Field notes/checklist still display from event-sourced data.
- `pending_operations` tracks delivery, retry, and blocked states.
- A failed pending operation must not be treated as durable business data.

Pros:
- Lowest behavior risk.
- Existing direct event path remains the fallback.
- Easier rollback: disable pending routing and keep existing event writes.
- Does not require rewriting field-note/checklist read models.

Cons:
- Dual-state exists temporarily: local event plus pending delivery status.
- Requires careful idempotency to prevent duplicate cloud event creation.

### Option B: `pending_operations` becomes source of truth until drained

Recommendation:
- Do not use for the first pilot.

Pros:
- Cleaner queue semantics in theory.

Cons:
- Requires UI/read models to understand pending rows.
- Blocked rows become user-visible business state.
- Rollback is harder.
- Higher risk of confusing owner/staff visibility.

### Option C: Dual-write direct event and pending operation as equal sources

Recommendation:
- Avoid.

Pros:
- Appears simple at first.

Cons:
- Highest duplicate/conflict risk.
- Two durable sources can disagree.
- Hard to repair safely.

Decision needed:
- Approve Option A before any D3b/D3c runtime work.

## 3. Decision 2: First Runtime Pilot Scope

Question:
- Which operation should be routed first?

### Option A: Checklist toggle only

Recommendation:
- Choose Option A.

Included operation:
- `checklist_item_toggle`

Why:
- Payload is completed-only.
- Operator permission is already separate from checklist text editing.
- No revenue, inventory, cost, product, or market identity changes.
- Rollback is easy: direct checklist toggle path already exists.

### Option B: All checklist operations

Recommendation:
- Not first.

Pros:
- One feature family moves together.

Cons:
- Includes text create/update/delete, which has more permission and conflict surface.

### Option C: All field notes and checklist operations

Recommendation:
- Defer.

Pros:
- Covers the originally intended low-sensitivity domains.

Cons:
- Too broad for the first runtime write-routing pilot.

Decision needed:
- Approve checklist toggle only as the first pilot, or choose a broader scope with explicit acceptance of higher risk.

## 4. Decision 3: Staff Insert And RLS Strategy

Question:
- How should staff create pending operations safely, given that direct base-table access is intentionally restricted?

### Option A: SECURITY DEFINER enqueue RPC with live permission validation

Recommendation:
- Choose Option A for the first runtime pilot.

Meaning:
- Client calls a narrow RPC, not direct table insert.
- RPC validates:
  - `auth.uid()` is actor.
  - Market belongs to an owner relationship that is active for the staff member.
  - Required capability is still valid at execution time.
  - Operation type is in the approved pilot scope.
- RPC inserts into `pending_operations` only after live validation.

Pros:
- Avoids loosening base-table SELECT.
- Avoids trusting client-provided `role_snapshot`.
- Works with staff base-table lockdown.
- Keeps future RLS changes narrow.

Cons:
- Requires a new migration and function review.
- Requires RPC tests before runtime usage.

### Option B: Change pending_operations RLS to use staff accessible views

Recommendation:
- Possible, but not first choice.

Pros:
- Keeps client insert model.

Cons:
- View security mode must be audited carefully.
- RLS can become hard to reason about.
- A view definition change could accidentally affect write eligibility.

### Option C: Loosen staff direct SELECT on `markets`

Recommendation:
- Do not choose.

Pros:
- Makes the current policy easier to satisfy.

Cons:
- Reopens a boundary intentionally tightened by 041.
- Higher data visibility risk.

Decision needed:
- Approve a narrow SECURITY DEFINER enqueue RPC before any staff runtime pilot.

## 5. Decision 4: Permission Recheck Policy

Question:
- What happens if a queued operation was valid when created but the staff role is later downgraded or revoked?

Recommendation:
- Re-check live permission before creating the final event.
- Treat stale/invalid permission as `blocked_permission`.
- Do not auto-retry `blocked_permission`.
- Owner may inspect blocked operations in a future owner-only diagnostics UI, but no UI is approved yet.

Required rule:
- `role_snapshot` is evidence, not authority.

Decision needed:
- Confirm blocked operations should not auto-retry after downgrade/revoke.

## 6. Decision 5: Idempotency And Duplicate Prevention

Question:
- How should retries avoid duplicate event writes?

Recommendation:
- Keep `(actor_id, idempotency_key)` unique.
- The future worker/RPC must derive the cloud event id or metadata idempotency from the pending operation.
- A retry that finds an already-created event must mark the operation `synced`, not create another event.

Decision needed:
- Confirm event creation must be idempotent before any write pilot.

## 7. Decision 6: Error UX

Question:
- What should users see when pending delivery fails?

Recommendation:
- First pilot should keep UI minimal:
  - Direct local event path remains visible immediately.
  - If pending delivery fails retryably, show no blocking modal.
  - If blocked by permission, future diagnostics can show owner/manager an action item.
  - Viewer sees content only, no operation controls.

Not approved yet:
- New owner dashboard.
- New staff pending-operation inbox.
- Toast spam for background retries.

Decision needed:
- Confirm first pilot may keep error UX minimal and diagnostics-only.

## 8. Decision 7: Rollback

Question:
- How do we turn off the pilot?

Recommendation:
- Feature flag default remains off.
- Runtime adapter must route to direct event writes when disabled.
- Existing queued rows are ignored by runtime when disabled.
- Do not drop `pending_operations` while rows exist unless they are exported, drained, or explicitly abandoned.

Decision needed:
- Confirm hard-disable flag behavior before D3b.

## 9. Recommended Next Implementation Slices

### D3b: Disabled Runtime Adapter Shell

Risk:
- Medium.

Allowed if approved:
- Add a pure adapter boundary.
- With flags off, route remains direct event write.
- Tests prove field-note/checklist services still do not write `pending_operations`.

Not allowed:
- Supabase insert.
- RPC creation.
- UI changes.
- Event projection changes.

### D3c-0: Enqueue RPC Draft

Risk:
- High because it requires migration/RLS/function work.

Allowed only after explicit approval:
- Add a SECURITY DEFINER RPC for the approved pilot operation.
- Add SQL tests/static tests for live permission checks.
- Do not connect UI/runtime in the same commit.

Status:
- Completed as a migration/RPC draft only.

Implemented boundaries:
- Added `public.enqueue_checklist_toggle_pending_operation`.
- The RPC only accepts checklist toggle payloads.
- The RPC validates owner or active `operator`/`manager` role live from database tables.
- The RPC records `role_snapshot` for diagnostics, but future event creation must still re-check live permissions.
- No runtime adapter, UI, or sync path calls the RPC yet.
- No 048 policy was changed.

### D3c-1: Checklist Toggle Pilot Behind Flag

Risk:
- High.

Allowed only after D3b and D3c-0 pass:
- Route checklist toggle through the adapter when the flag is explicitly enabled.
- Keep direct event fallback.
- Add duplicate retry and role downgrade tests.

Status:
- Completed as a dormant runtime route with `pendingOperationWriteRouting` still default-off.

Implemented boundaries:
- Only `toggleChecklistItem()` passes the `checklist_toggle` routing hint.
- The adapter requires the checklist toggle hint, `checklist_item_updated`, completed-only payload, and no checklist text before choosing the RPC route.
- The adapter records the local event first, preserving the existing read model and fallback behavior.
- The adapter calls only `supabase.rpc('enqueue_checklist_toggle_pending_operation', ...)`.
- RPC failure or missing Supabase configuration is non-blocking for the local toggle.
- No direct client insert into `pending_operations` is used.
- No UI, RLS, cache replacement, field note, checklist text, revenue, inventory, market, or product behavior is changed.

### D3c-2: Pending Operation Drain Design

Risk:
- Low as completed because it is documentation and guardrail tests only.
- High for future implementation because it creates final cloud events from pending rows.

Status:
- Completed as `docs/SYNC_GATE_D_PENDING_OPERATION_DRAIN_DESIGN.md`.

Implemented boundaries:
- Design recommends a single-operation SECURITY DEFINER drain RPC before any broad service-role batch worker.
- First drain scope remains `checklist_item_toggle` only.
- Final event type is `checklist_item_updated`.
- The drain must re-check live owner/operator/manager permission.
- `role_snapshot` remains evidence only, not authority.
- The final event id should be derived from `pending_operations.operation_id::UUID`.
- Existing event model remains the source of truth.
- No migration, runtime drain, worker, UI, RLS, flag default, cache replacement, revenue, inventory, market, or product behavior was changed.

### D3c-2b: Single Operation Drain RPC Draft

Risk:
- High because the RPC can create final cloud events from pending rows if explicitly called.

Status:
- Completed as a migration/RPC draft only.

Implemented boundaries:
- Added `public.drain_checklist_toggle_pending_operation`.
- The RPC only accepts `p_operation_id`.
- The caller must be authenticated and must match `pending_operations.actor_id`.
- The RPC locks exactly one pending row with `FOR UPDATE`.
- The RPC only processes `pending` or `failed_retryable` rows.
- The RPC only drains `checklist_item_toggle` into `checklist_item_updated`.
- The RPC re-checks live owner or active `operator`/`manager` permission.
- The final event id is derived from `pending_operations.operation_id::UUID`.
- Existing matching events mark the pending row `synced`; mismatches become `failed_permanent`.
- Unexpected drain failures become `failed_retryable` and increment `retry_count`.
- No runtime caller, UI, RLS, flag default, cache replacement, field note, checklist text, revenue, inventory, market, or product behavior was changed.

### D3c-2c: Runtime Drain Call Behind Dedicated Flag

Risk:
- High if enabled broadly because it can create cloud final events from pending rows.

Status:
- Completed as a dormant runtime call only.

Implemented boundaries:
- The adapter still writes the local event first.
- The adapter enqueues checklist toggle pending operations only when `pendingOperationWriteRouting` is explicitly enabled.
- The adapter calls `public.drain_checklist_toggle_pending_operation` only after enqueue succeeds and returns an operation id.
- The drain call also requires `pendingOperationDrainAfterEnqueue`, a separate default-off flag.
- Drain failures are non-blocking for the already-written local event and are logged through the existing adapter catch path.
- No UI, RLS, migration, cache replacement, field note, checklist text, revenue, inventory, market, or product behavior was changed.

### D3c-2d: Controlled Test Or Staging Enablement

Risk:
- High if the same mechanism were exposed through public env, UI, localStorage, or production defaults.

Status:
- Completed as a controlled test-only flag override surface.

Implemented boundaries:
- Added `setSyncGateDControlledTestFlags()` and `resetSyncGateDControlledTestFlags()`.
- The controlled override can only affect `pendingOperationWriteRouting` and `pendingOperationDrainAfterEnqueue`.
- The controlled override requires the exact reason `D3c-2d controlled runtime verification`.
- The controlled override rejects `cloudPendingOperationsStorage`, `cacheReplacementExecute`, and unknown flags.
- The controlled override throws in production builds.
- The flag module still does not read `NEXT_PUBLIC`, `localStorage`, or `sessionStorage`.
- Production defaults remain false.
- Production app surfaces do not import the controlled override API.
- No UI, RLS, migration, cache replacement, field note, checklist text, revenue, inventory, market, or product behavior was changed.

### D3c-2e: Manual Cloud Smoke Verification

Risk:
- High when executed because it intentionally creates one pending operation and one final checklist update event.

Status:
- Manual smoke plan and guarded script are ready.
- Cloud execution has not been performed by this commit.

Implemented boundaries:
- Added `scripts/gate-d-checklist-toggle-smoke.mjs`.
- Added `docs/SYNC_GATE_D_D3C_2E_MANUAL_SMOKE_TEST.md`.
- The script is not wired to `npm test` or any `package.json` script.
- The script requires explicit target and confirmation environment variables.
- `production-disposable` requires an extra confirmation.
- The script signs in as a normal user with the anon key and refuses service-role-looking keys.
- The script calls only `enqueue_checklist_toggle_pending_operation` and `drain_checklist_toggle_pending_operation`.
- The script does not call direct table insert, update, upsert, or delete methods.
- No UI, RLS, migration, cache replacement, field note, checklist text, revenue, inventory, market, or product behavior was changed.

## 10. Current Recommendation

Recommended manual approval:
- D3b, D3c-0, D3c-1, D3c-2 design, D3c-2b, D3c-2c, D3c-2d, and D3c-2e planning are complete. The next approval boundary is D3c-2e execution.

Recommended decisions for D3c-2e:
- Source of truth: Option A, existing event model remains source of truth.
- Pilot scope: checklist toggle only.
- Runtime gate: enable both `pendingOperationWriteRouting` and `pendingOperationDrainAfterEnqueue` only for an explicit smoke test session.
- Error UX: diagnostics-only for now.
- Rollback: feature flag off returns to direct event writes.

Recommended next path:
- Pick one non-production or disposable checklist item for manual smoke verification.
- Run one owner test and one staff operator/manager test if accounts are available.
- Confirm one pending row reaches `synced` and one matching `checklist_item_updated` cloud event is created.
- Keep both flags default-off until controlled testing proves enqueue and drain together.

Do not approve yet:
- Direct client insert into `pending_operations`.
- Any change to 048 RLS.
- Turning `pendingOperationWriteRouting` on by default.
- Turning `pendingOperationDrainAfterEnqueue` on by default.
- A broad connected runtime drain worker or production-wide final-event writer.
- A broad service-role batch worker.
- Any cache replacement execute behavior.
