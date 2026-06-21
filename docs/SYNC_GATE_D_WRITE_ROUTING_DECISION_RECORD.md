# BoothBook Sync Gate D Write Routing Decision Record

Created: 2026-06-21
Status: decision record draft, not approved for runtime implementation

## 0. Purpose

This document defines the decisions required before BoothBook routes any production write through `pending_operations`.

It is intentionally documentation-only:
- No runtime import is approved by this document.
- No UI behavior change is approved by this document.
- No Supabase RLS change after 048 is approved by this document.
- No cache replacement execute behavior is approved by this document.

## 1. Current State After 048

Completed:
- `public.pending_operations` exists in cloud schema.
- RLS is enabled.
- The table supports field-note and checklist operation shapes.
- Production code still does not read from or write to `pending_operations`.

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

## 10. Current Recommendation

Recommended manual approval:
- D3b and D3c-0 are complete. The next approval boundary is D3c-1: checklist toggle pilot behind flag.

Recommended decisions for D3c-1:
- Source of truth: Option A, existing event model remains source of truth.
- Pilot scope: checklist toggle only.
- Staff insert/RLS: use the D3c-0 narrow enqueue RPC; do not use direct client insert.
- Error UX: diagnostics-only for now.
- Rollback: feature flag off returns to direct event writes.

Do not approve yet:
- Direct client insert into `pending_operations`.
- Any change to 048 RLS.
- Any runtime Supabase write beyond the approved checklist-toggle RPC path.
- Any cache replacement execute behavior.
