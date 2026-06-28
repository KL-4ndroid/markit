# BoothBook Sync Gate D Safety And Slice Plan

Created: 2026-06-21
Status: active decision plan after D3c-2n-1 service wrapper draft

## 0. Current State

D2a through D3c-2n have progressed through narrow approved slices:
- `supabase/migrations/048_add_pending_operations_schema.sql`
- `tests/supabase-pending-operations-migration.test.ts`
- `supabase/migrations/049_enqueue_checklist_toggle_pending_operation.sql`
- `supabase/migrations/050_drain_checklist_toggle_pending_operation.sql`
- `supabase/migrations/051_list_owner_pending_operation_diagnostics.sql`
- `supabase/migrations/052_recover_stale_processing_pending_operation.sql`
- Default-off checklist-toggle pending-operation routing and controlled smoke testing.
- Owner-only diagnostics and single-row stale `processing` recovery.
- D3c-2m local/staging synthetic stale recovery test plan and staging execution.
- D3c-2n retry/drain action design.
- D3c-2n-1 owner-only single-row service wrapper draft.

D3c-2m staging verification passed on 2026-06-26 Asia/Taipei. D3c-2n-1 service wrapper is implemented. D3c-2n-2 owner UI button remains blocked until explicit high-risk approval.

Still not approved:
- Enabling `pendingOperationWriteRouting` by default.
- Enabling `pendingOperationDrainAfterEnqueue` by default.
- Any new retry/drain runtime action beyond the already approved controlled checklist-toggle smoke path.
- A broad pending-operation drain worker that creates final cloud events.
- Cache replacement execute mode.
- Any owner/staff pull integration with replacement behavior.
- Any financial or inventory projection rewrite.

## 1. Safety Rules

Mandatory for every next slice:
- One sensitive layer per commit.
- Keep feature flags default off.
- Keep direct event writes available as fallback.
- Add or update audit tests before runtime imports.
- Run `npm test`, `npm run lint`, and `npm run build`.
- Review `git diff --check`, changed files, and production import boundaries before commit.

Do not combine:
- Schema/RLS and production write routing.
- UI and RLS.
- Cache replacement execute and pull integration.
- Projection changes and cache replacement.
- Financial/inventory behavior with field notes/checklist work.

Stop for manual approval if a slice needs:
- New migration after 048.
- RLS policy changes after 048.
- Production import of `pending-operation-model`.
- Production import of `cache-replacement-preview`.
- Turning `pendingOperationWriteRouting` on by default.
- Creating a pending-operation drain/worker or final-event writer.
- Local cache delete, clear, or overwrite behavior.
- Owner/staff capability definition changes.

## 2. Implemented Slice

### D2a: Pending Operations Schema Draft

Goal:
- Create the cloud schema target for a future low-risk write pilot.

Status:
- Completed.

Allowed changes:
- Migration.
- Migration tests.
- Guardrail test update.
- Decision documentation.

Not included:
- No runtime reads or writes.
- No UI changes.
- No sync path changes.
- No cache replacement execution.

## 3. Recommended Next Slices

### D2b: Local Schema Type Mirror

Risk:
- Low to medium.

Goal:
- Add a TypeScript type that mirrors the cloud row shape without writing to Supabase.

Allowed:
- Pure type definitions.
- Static tests comparing type names and SQL columns.

Not allowed:
- Supabase client calls.
- Runtime imports from field notes/checklist services.
- Production sync imports.

Approval needed:
- Confirm whether this type should live beside `pending-operation-model` or in a separate `lib/sync/pending-operation-schema.ts`.

### D3a: Write Routing Design Record

Risk:
- Low if docs/tests only.

Goal:
- Decide exactly how checklist/field-note writes would route later.

Status:
- Completed as `docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md`.

Must answer:
- Does direct `recordEvent` remain the source of truth while pending operation is only an outbox?
- Or does pending operation become the source of truth until drained?
- How are duplicate retries prevented?
- How does role downgrade block queued operations?
- What does owner/manager/operator/view see when an operation is blocked?

Recommended answer:
- Direct event write remains fallback.
- First pilot should be feature-flagged and limited to field notes/checklist only.
- Permission-blocked operations do not retry automatically.

Implemented recommendation:
- Source of truth: existing event model remains primary; `pending_operations` is delivery/retry state.
- First pilot scope: checklist toggle only.
- Staff write strategy: use a future SECURITY DEFINER enqueue RPC with live permission validation; do not loosen `markets` base-table visibility.
- Next implementation slice: D3b disabled runtime adapter shell only, with flags off and no Supabase writes.

### D3b: Disabled Runtime Adapter Shell

Risk:
- Medium.

Goal:
- Add an adapter interface for future write routing, but keep direct-event behavior active while flags are off.

Status:
- Completed as a disabled adapter shell.

Allowed only after approval:
- A pure routing function that chooses `direct` while `pendingOperationWriteRouting` is false.
- Tests proving production behavior remains direct with flags off.

Implemented boundaries:
- Field notes/checklist call `writeFieldOpsEvent`.
- With `pendingOperationWriteRouting` disabled, the executable route is direct `recordEvent`.
- Later D3c-1 added a gated RPC route for checklist toggle only.
- No UI or RLS change is included.

Not allowed:
- Supabase writes to `pending_operations`.
- UI changes.
- Role capability changes.

### D3c: Field Notes/Checklist Pilot

Risk:
- High.

Goal:
- Route one low-sensitivity operation family through pending operations.

Recommended first operation:
- Checklist toggle only.

Why:
- Payload is completed-only.
- Operator permission is already separated from checklist text editing.
- It does not touch revenue, inventory, cost, or market/product identity fields.

Required before implementation:
- Manual approval.
- Feature flag default off.
- Duplicate retry tests.
- Role downgrade tests.
- Fallback-to-direct-write plan.

### D3c-0: Enqueue RPC Draft

Risk:
- High because it adds a database function.

Status:
- Completed as a migration/RPC draft only.

Implemented boundaries:
- Added `public.enqueue_checklist_toggle_pending_operation`.
- Scope is checklist toggle only.
- Owner or active `operator`/`manager` permission is validated live from database tables.
- `role_snapshot` is diagnostic evidence only; later event creation must re-check live permission.
- Runtime/UI/sync code does not call the RPC yet.
- No 048 policy was changed.

Not included:
- No field note routing.
- No checklist text create/update/delete routing.
- No revenue, inventory, market, or product routing.
- No cache replacement execute behavior.

### D3c-1: Checklist Toggle Pilot Behind Flag

Risk:
- High because it adds a runtime RPC path, but the feature flag remains default-off.

Status:
- Completed as a dormant runtime route behind `pendingOperationWriteRouting`.

Implemented boundaries:
- Only `toggleChecklistItem()` passes the `checklist_toggle` routing hint.
- `createChecklistItem`, `updateChecklistItem`, and `deleteChecklistItem` do not pass the pilot hint.
- The adapter records the existing local event first.
- The adapter calls `public.enqueue_checklist_toggle_pending_operation` only if:
  - `pendingOperationWriteRouting` is explicitly enabled,
  - the operation hint is `checklist_toggle`,
  - the event type is `checklist_item_updated`,
  - the payload has `market_id`, `itemId`, and boolean `completed`,
  - the payload does not include checklist text.
- RPC failure or missing Supabase configuration does not block the local checklist toggle.
- No direct `.from('pending_operations')` insert/update/upsert/delete is used.

Not included:
- The flag is still default-off.
- At the D3c-1 exit, no pending-operation drain/worker was implemented.
- At the D3c-1 exit, no final cloud event writer was implemented.
- No field note, checklist text, revenue, inventory, cache replacement, market, or product route is included.

### D3c-2: Drain, Diagnostics, and Recovery Follow-Up

Risk:
- High for runtime writes, low for documentation and guardrails.

Status:
- D3c-2b single-operation checklist-toggle drain RPC draft is complete.
- D3c-2c default-off runtime drain call after successful enqueue is complete.
- D3c-2d controlled test/staging enablement is complete.
- D3c-2e one manual cloud smoke verification is complete.
- D3c-2f through D3c-2k owner-only diagnostics and single-row stale `processing` recovery are complete.
- D3c-2l manual stale recovery smoke plan and guarded script are complete.
- D3c-2m synthetic stale recovery test plan and staging execution are complete.
- D3c-2n retry/drain action design is complete.
- D3c-2n-1 service wrapper draft is complete.

Current allowed work:
- Documentation alignment.
- Static guardrail tests.
- Read-only diagnostics planning.
- Non-mutating design work.

Not allowed before explicit D3c-2n-2 approval:
- D3c-2n owner retry/drain UI button.
- Any worker or batch drain.
- Any production synthetic stale `processing` row.
- Any feature-flag default change.

### D4: Cache Replacement Execute

Risk:
- High.

Recommendation:
- Do not start until D3 is proven.

Required before implementation:
- Local backup/export path.
- Debug-only execute mode first.
- Protected record tests for `pending`, `local_only`, `blocked_permission`, and metadata-blocked records.
- Explicit decision on delete candidates: report-only, archive, or delete.

## 4. Current Recommendation

Next safest move:
- Treat D3c-2m as passed for the missing-final-event recovery path.
- Treat D3c-2n-1 service wrapper draft as complete.
- Decide whether to approve D3c-2n-2 owner UI button.
- Continue only documentation alignment, static/audit guardrail tests, read-only diagnostics design, and non-mutating preview work until D3c-2n-2 is explicitly approved.

Do not proceed directly to:
- Turning `pendingOperationWriteRouting` on by default.
- Turning `pendingOperationDrainAfterEnqueue` on by default.
- Creating any retry/drain runtime action beyond the already approved controlled checklist-toggle smoke path.
- Creating a broad pending-operation drain worker.
- D4 cache execute.

The next manual decision should choose one path:
- Approve D3c-2n-2 owner-only single-row UI button.
- Continue low-risk documentation/tests/diagnostics only.

Recommended:
- Follow `docs/SYNC_GATE_D_PENDING_OPERATION_DRAIN_DESIGN.md`.
- Do not enable the flags broadly, because controlled verification keeps production defaults off.

## 5. Plan Validation Before Further Execution

Current validated facts:
- D3c-2m staging verification passed on 2026-06-26 Asia/Taipei.
- D3c-2n-1 service wrapper exists and is isolated to `lib/sync/owner-pending-operation-diagnostics.ts`.
- The owner diagnostics panel does not call the D3c-2n-1 retry/drain wrapper.
- The D3c-2n-1 wrapper locally rejects mismatched operation ids, non-`failed_retryable` rows, non-owner actor rows, non-`checklist_item_toggle` rows, and non-`checklist_item` rows before calling the RPC.
- `npm run build` passed after D3c-2n-1.
- Full `npx tsc --noEmit` is not a reliable gate in this repo because existing unrelated test typing errors currently fail it.

Plan assumptions that must remain true:
- Direct event writes remain the normal production source of truth.
- `pendingOperationWriteRouting` and `pendingOperationDrainAfterEnqueue` remain default-off.
- D3c-2n retry/drain remains owner-only and single-row.
- Staff-created pending rows remain diagnostics-only.
- No batch worker, background retry, or page-load retry is introduced.
- No production synthetic data is created.
- No cache replacement execute mode is introduced.

Pre-execution validation required before any future D3c-2n-2 code:
- Review the exact UI eligibility predicate before implementation.
- Confirm the UI button should be shown only for rows where:
  - `status = 'failed_retryable'`;
  - `operationType = 'checklist_item_toggle'`;
  - `entityType = 'checklist_item'`;
  - `actorId = currentUser.id`;
  - current page is owner-only `/recovery`.
- Confirm the confirmation text must state that the action may create a final cloud event.
- Confirm the action reloads diagnostics after the RPC returns.
- Confirm there is no cleanup, batch selection, staff-row action, automatic retry, worker, new RPC, migration, RLS change, or feature-flag default change.

## 6. Risk Decision Points Before D3c-2n-2

Decision A: Should D3c-2n-2 owner UI button be approved?

Recommended answer:
- Approve only after reviewing this section.
- Scope must be owner-only, single-row, and limited to owner-created `failed_retryable` checklist-toggle rows.

Risk:
- The button can invoke a final-event-writing RPC through the D3c-2n-1 wrapper.
- A successful drain may create a `checklist_item_updated` event.

Risk controls:
- No button for staff-created rows.
- No button for `pending`, `processing`, `synced`, `failed_permanent`, or `blocked_permission`.
- No batch selection.
- No automatic execution.
- Explicit `window.confirm`.
- Diagnostics refresh after completion.

Decision B: Should D3c-2n-3 local/staging manual verification be prepared now?

Recommended answer:
- Prepare the manual verification plan only after D3c-2n-2 UI code passes tests.
- Do not run verification until the owner selects one disposable local/staging `failed_retryable` row.

Risk:
- The manual verification can create a final event in staging/local.

Risk controls:
- Use only local/staging.
- Use one disposable row.
- Verify no duplicate final event is created.
- Keep production verification separate.

Decision C: Should staging synthetic rows be cleaned up now?

Recommended answer:
- Defer cleanup until D3c-2n-2 and D3c-2n-3 decisions are settled.
- Keep existing staging rows as evidence unless they interfere with diagnostics.

Risk:
- Cleanup requires direct SQL delete because authenticated clients do not have DELETE permission on `pending_operations`.

Risk controls:
- Cleanup must be staging-only.
- Delete only rows with `idempotency_key like 'd3c-2m-synthetic-stale:%'`.
- Do not add application cleanup code.

Decision D: Should current completed work be committed before D3c-2n-2?

Recommended answer:
- Yes. Commit D3c-2m evidence, D3c-2n-1 service wrapper, and planning/test updates before adding UI.

Risk:
- Continuing into UI with a large uncommitted diff makes rollback and review harder.

Risk controls:
- Review changed files before commit.
- Keep `supabase/bootstrap/` untracked unless explicitly approved.
- Do not commit `.env.local`.
