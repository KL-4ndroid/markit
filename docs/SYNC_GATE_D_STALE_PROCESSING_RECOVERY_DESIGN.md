# BoothBook Sync Gate D Stale Processing Recovery Design

Created: 2026-06-22
Status: D3c-2k owner-confirmed one-row recovery UI action added; no worker, retry, drain, cleanup, batch recovery, RLS change, or feature-flag change is approved by this document

## 0. Purpose

This document defines how BoothBook should reason about `pending_operations` rows that remain in `processing` too long.

The goal is to avoid silent data loss or duplicate final events before any recovery action exists.

This document is the safety contract for stale `processing` recovery. D3c-2i approved the narrow owner-only `052_recover_stale_processing_pending_operation.sql` RPC draft, and D3c-2k approved a one-row owner-confirmed UI action that calls that RPC.

## 1. Current Context

Completed before this design:
- `048_add_pending_operations_schema.sql` created `pending_operations`.
- `049_enqueue_checklist_toggle_pending_operation.sql` added the narrow checklist-toggle enqueue RPC.
- `050_drain_checklist_toggle_pending_operation.sql` added the narrow single-operation drain RPC.
- D3c-2e completed one manual cloud smoke verification.
- D3c-2f added owner-only read diagnostics RPC.
- D3c-2g added read-only owner diagnostics UI shell in `/recovery`.
- D3c-2h added this stale `processing` recovery design.
- D3c-2i added `052_recover_stale_processing_pending_operation.sql` as a single-row owner-only RPC draft.
- D3c-2j added a read-only stale `processing` indicator to owner diagnostics UI.
- D3c-2k added an owner-confirmed one-row recovery UI action.

Still not approved:
- Any automatic worker.
- Any retry button.
- Any reset button.
- Any cleanup/delete action.
- Any mutation from diagnostics UI.
- Any UI/runtime caller for the recovery RPC.
- Any broad service-role processor.

## 2. What Counts As Stale

Recommended first stale threshold:
- `status = 'processing'`
- `updated_at < now() - interval '15 minutes'`

Why 15 minutes:
- A normal single-operation drain should finish in seconds.
- It leaves room for temporary network or database latency.
- It is conservative enough for manual owner diagnostics without treating every brief in-flight row as broken.

The threshold must be configurable only in reviewed server-side code if implemented later. It must not come from public env, localStorage, sessionStorage, or UI input in the first recovery slice.

## 3. Why A Row Can Get Stuck

Possible causes:
- The request was interrupted after the row was marked `processing`.
- The browser, network, or server connection died before the transaction completed.
- A database statement failed in a way that prevented the error handler from marking `failed_retryable`.
- A future worker crashes while holding or after releasing the claim.
- A future manual action is interrupted mid-flight.

Important note:
- A stuck `processing` row does not prove the business action failed.
- The final `events` row might already exist.
- Recovery must inspect final event state before changing the pending row.

## 4. Recovery Decision Tree

Future recovery must process exactly one operation id at a time.

For a selected stale `processing` row:

1. Confirm the row is still `processing`.
2. Confirm the row is stale by `updated_at`.
3. Confirm the caller is the owner of the row's market.
4. Inspect final event by `operation_id::uuid` only if the operation id is a valid UUID.
5. If a matching final event exists:
   - mark the pending row `synced`;
   - clear transient errors;
   - do not create another event.
6. If a final event exists but does not match:
   - mark the pending row `failed_permanent`;
   - record `last_error_code = 'event_id_collision'` or a more specific mismatch code;
   - do not retry automatically.
7. If no final event exists:
   - mark the pending row `failed_retryable`;
   - increment `retry_count` once;
   - record `last_error_code = 'stale_processing_reset'`;
   - do not drain in the same action.

Why not drain immediately:
- Reset and drain are separate safety decisions.
- Separating them prevents a diagnostics click from becoming an unreviewed event writer.
- The existing drain path already re-checks live permission when a retry is explicitly approved later.

## 5. Required Future RPC Shape

The approved D3c-2i database draft uses a single-operation SECURITY DEFINER RPC:

```sql
public.recover_stale_processing_pending_operation(p_operation_id TEXT)
```

Required behavior:
- Authenticate with `auth.uid()`.
- Verify caller owns the market for the pending row.
- Lock exactly one row with `FOR UPDATE`.
- Process only `status = 'processing'`.
- Refuse non-stale rows.
- Never process `pending`, `failed_retryable`, `blocked_permission`, `failed_permanent`, or `synced`.
- Never create final events.
- Never call `drain_checklist_toggle_pending_operation`.
- Never call `enqueue_checklist_toggle_pending_operation`.
- Never delete rows.
- Never process more than one row.

## 6. Owner Confirmation Boundary

Any future UI action must require explicit owner confirmation.

Minimum confirmation copy should communicate:
- the operation id;
- the current status is `processing`;
- the row is stale;
- the action will not create a final event;
- the action may mark the row `synced`, `failed_permanent`, or `failed_retryable` depending on final-event inspection.

The first UI must not offer batch selection.

## 7. Staff Boundary

Staff must not recover stale processing rows.

Reason:
- Recovery changes cloud delivery state.
- Recovery can affect whether future retry/drain happens.
- Even manager/operator roles should remain limited to business workflows, not sync repair.

Allowed:
- Staff may continue to use normal field notes/checklist behavior.

Not allowed:
- Staff diagnostics inbox.
- Staff recovery action.
- Staff direct pending-operation mutation.

## 8. Retry Policy Boundary

This design does not approve retry execution.

Recommended future sequence:
1. D3c-2h design only. Completed by this document.
2. D3c-2i single-row stale processing recovery RPC draft. Completed as `052_recover_stale_processing_pending_operation.sql`.
3. D3c-2j read-only UI can display recoverable stale rows with no action. Completed in `OwnerPendingOperationDiagnosticsPanel`.
4. D3c-2k owner-confirmed one-row recovery action. Completed in `OwnerPendingOperationDiagnosticsPanel`.
5. Only after those pass, discuss explicit retry/drain action.

Retry remains a separate approval because it can eventually create final events through the drain path.

## 9. Observability

The existing owner diagnostics UI can show stale `processing` rows as `in_progress`.

Future read-only enhancement may derive:
- `is_stale_processing`
- `stale_minutes`
- `recoverable_state`

The stale indicator is display-only unless the owner explicitly confirms the one-row D3c-2k recovery action.

## 10. Prohibited Outside The Approved D3c-2k Recovery Action

D3c-2k must not:
- recover non-stale rows;
- recover non-`processing` rows;
- recover more than one row per click;
- update `pending_operations` outside the single selected stale `processing` row;
- insert into `events`;
- delete rows;
- call drain;
- call enqueue;
- add a worker;
- add a feature flag;
- change RLS;
- change cache replacement;
- change revenue, inventory, product, market, or staff permissions.

## 11. Rollback

Rollback for the D3c-2h design-only slice is:
- remove this document;
- remove its guardrail test.

Rollback for the D3c-2i RPC draft before manual execution is:
- drop `public.recover_stale_processing_pending_operation(TEXT)`;
- remove `052_recover_stale_processing_pending_operation.sql`;
- remove its guardrail test;
- leave runtime behavior unchanged.

Rollback for the D3c-2k UI action is:
- hide or remove the one-row recovery button;
- leave the RPC in place unless a separate rollback removes 052;
- leave existing pending rows unchanged.

If a future recovery action is implemented, it must define its own rollback or no-rollback statement.
