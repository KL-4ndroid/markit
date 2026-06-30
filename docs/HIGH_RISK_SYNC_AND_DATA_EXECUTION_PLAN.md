# High-Risk Sync and Data Execution Plan

Status: planning and guardrail phase.

Scope: define safe execution boundaries for the next high-sensitivity work after C2.21/C2.20/C2.29B/C2.28B and the first Phase D guardrails. This document does not approve runtime cache replacement, pending-operation workers, automatic retries, RLS/data repair, production synthetic data, or broad event-handler refactors.

## 1. Current Baseline

Completed evidence:

- C2.21 read-only cloud consistency audit completed. It found data debt but did not approve repair.
- C2.20 staff data flow verification completed. Focused migration `053_repair_staff_accessible_view_sanitization.sql` was drafted, then reported by the user as executed and verified.
- C2.29B Staff View / RLS read-only verification passed after 053. No additional RLS/view/client repair is justified by the recorded result.
- C2.28B render guard / role fail-closed static audit passed.
- Phase D started with fixture-only and preview-only guardrails:
  - `tests/event-handler-interaction-deleted.test.ts`
  - `tests/sync-cache-replacement-preview.test.ts`

Current blocked boundary:

- D3c-2n-4 production disposable retry/drain verification remains unapproved.
- Replace-cache execute remains unapproved.
- Pending-operation worker, batch drain, and automatic retry remain unapproved.
- RLS/data repair remains unapproved unless new read-only evidence proves a concrete issue.
- Broad `lib/db/events.ts` refactor remains unapproved.

## 2. Risk Classes

### A. `importData()` rollback fixtures

Risk: medium.

Why sensitive:

- `importData()` intentionally clears and replaces local IndexedDB tables.
- Real rollback depends on Dexie/IndexedDB transaction semantics, not just in-memory mocks.
- A misleading fake rollback test could create false confidence.

Allowed first slice:

- Boundary tests that prove invalid or replay-unsafe imports stop before emergency backup, table reads, clears, bulk writes, and transactions.
- Source-level guardrails that prove all clear/bulkAdd replacement operations remain inside one `db.transaction`.

Not approved yet:

- Real browser/profile IndexedDB rollback verification.
- Changing import replacement semantics.
- Recovery UI changes.
- Any test that mutates a real user profile database.

Decision needed before next slice:

- Whether to create a dedicated browser-profile IndexedDB database for true rollback verification.
- Whether to refactor import replacement into a small injectable service for stronger unit tests.

### B. Replace-cache execute

Risk: high.

Why sensitive:

- Execute would overwrite or delete local cache based on cloud/read-model state.
- Staff scope is partial and must never trigger destructive owner-cache rebuilds.
- Existing preview helpers are intentionally report-only.

Allowed first slice:

- Preview fixtures only.
- Apply simulator that returns a report without mutating local storage.
- Static tests proving production sync paths do not import execute/apply helpers.

Not approved yet:

- Any actual execute/apply/delete path.
- Wiring preview output into owner/staff pull services.
- Staff-view destructive replacement.

Decision needed before execute:

- Exact scope: owner-only, staff-only, or isolated test mode.
- Backup/export requirement before mutation.
- Protection rules for `pending`, `local_only`, `blocked`, and outside-scope records.
- Rollback and abort behavior.

### C. Pending-operation worker / automatic retry

Risk: high.

Why sensitive:

- Worker code can write final cloud events repeatedly if idempotency is wrong.
- Automatic retry can turn transient failures into duplicate business events.
- Staff-created rows and owner-created rows have different authority constraints.

Allowed first slice:

- Design and model tests.
- Deterministic final event id derivation tests.
- Static tests proving no background worker is mounted.

Not approved yet:

- Background timers.
- Batch drain.
- Staff-row drain.
- Feature flag default enablement.
- Production automatic retry.

Decision needed before runtime:

- Retry cadence and max attempts.
- Idempotency source of truth.
- Owner/staff authority model.
- Failure classification: retryable vs permanent.
- Visibility and manual recovery UX.

### D. RLS / data repair

Risk: medium to high.

Why sensitive:

- RLS changes can break login, staff views, owner access, or live sync.
- Data repair can alter historical business records.

Allowed first slice:

- Read-only SQL verification.
- Migration draft plus static tests.
- Repair preview reports.

Not approved yet:

- Applying new RLS migrations without current failing evidence.
- Production data repair.
- Duplicate event cleanup.
- Snapshot rebuild.

Decision needed before mutation:

- Exact failing evidence.
- Backup/export path.
- SQL rollback strategy.
- Owner/staff regression checks.
- Expected affected row count.

### E. Broad event-handler refactor

Risk: high.

Why sensitive:

- `lib/db/events.ts` drives replay/projection behavior.
- Any handler change can affect revenue, stock, daily stats, staff replay, imports, and repairs.

Allowed first slice:

- Handler-level characterization tests.
- Pure helper tests that are not wired into runtime.

Not approved yet:

- Replacing handler logic.
- Cross-handler abstraction.
- Full replay behavior changes.

Decision needed before refactor:

- One handler at a time.
- Equivalence tests before and after.
- Explicit non-equivalence acceptance if behavior intentionally changes.
- Rollback commit boundary.

## 3. Recommended Execution Order

1. Add high-risk plan and `importData()` boundary tests.
2. If accepted, decide whether true IndexedDB rollback verification is worth the added complexity.
3. Continue preview-only replace-cache fixtures or apply simulator, with no mutation.
4. Expand pending-operation worker design/model tests, with no runtime worker.
5. Only revisit RLS/data repair if read-only evidence shows a current concrete issue.
6. Only revisit broad event-handler refactor after enough characterization coverage exists.

## 4. Stop Conditions

Stop and ask for explicit approval before:

- Running production disposable verification.
- Adding any background worker or automatic retry.
- Adding replace-cache execute/apply/delete code.
- Applying RLS or data repair migrations.
- Creating production synthetic data.
- Changing import replacement semantics.
- Refactoring production event handler behavior.

## 5. Current Approved Slice

Approved by current execution plan:

- Add this plan document.
- Add `importData()` rollback boundary tests that are non-mutating and do not require live IndexedDB rollback.
- Add a cache replacement apply simulator that returns a report only and cannot execute.
- Add pending-operation worker model helpers and tests without mounting a worker.
- Add isolated fake IndexedDB rollback verification for `importData()` without touching browser/profile storage.
- Add import recovery semantics design and static guardrails without changing runtime behavior.

Not included:

- Runtime behavior changes.
- Browser/profile IndexedDB rollback verification.
- Import rollback UI.
- Supabase changes.
- Production data changes.

## 6. Cache Replacement Apply Simulator Slice

Status: completed as non-mutating report-only work.

Result record:

- `docs/CACHE_REPLACEMENT_APPLY_SIMULATOR_2026_06_29.md`

Guardrails:

- `tests/sync-cache-replacement-apply-simulator.test.ts`
- `tests/sync-gate-d-model-isolation.test.ts`

Safety result:

- The simulator converts preview output into operation records.
- The simulator always returns `canExecute: false`.
- Delete candidates remain destructive report-only operations.
- Production sync paths do not import the simulator.

Still not approved:

- Any replace-cache execute/apply/delete path.
- Any owner/staff pull-service integration.
- Any IndexedDB mutation.

## 7. Pending Operation Worker Model Slice

Status: completed as pure model and static guardrail work.

Result record:

- `docs/PENDING_OPERATION_WORKER_MODEL_2026_06_29.md`

Guardrails:

- `tests/sync-pending-operation-worker-model.test.ts`
- `tests/sync-gate-d-model-isolation.test.ts`

Safety result:

- Worker candidate classification is pure and local.
- Deterministic final event id derivation is based on UUID `operationId`.
- Only `failed_retryable` checklist-toggle rows below max retry count are eligible in the model.
- Production files do not mount a pending-operation worker.

Still not approved:

- Any background worker.
- Any automatic retry.
- Any batch drain.
- Any staff-row drain.
- Any production default enablement.

## 8. Isolated IndexedDB Rollback Verification Slice

Status: completed as test-only isolated IndexedDB work.

Result record:

- `tests/import-data-indexeddb-rollback.test.ts`

Guardrails:

- The test uses `fake-indexeddb`, not a browser profile or production IndexedDB.
- The test seeds an existing local state, calls the production `importData()` function, and forces a Dexie transaction failure with an invalid `settings.id` key.
- The expected result is full restoration of the pre-import IndexedDB state.
- The test deletes the isolated fake database after verification.

Safety result:

- No production import semantics were changed.
- No recovery UI was changed.
- No real browser IndexedDB or Supabase data is touched.

Still not approved:

- Browser/profile IndexedDB mutation tests.
- Import replacement behavior changes.
- Import rollback UI.
- Any automated production recovery path.

## 9. Import Recovery Semantics Design Slice

Status: completed as design and static guardrail work.

Result record:

- `docs/IMPORT_RECOVERY_SEMANTICS_PLAN_2026_06_29.md`

Guardrails:

- `tests/import-recovery-semantics-plan.test.ts`

Safety result:

- Import failure states are documented before any UI or runtime behavior changes.
- The plan explicitly builds on existing `importData()` and `/recovery` behavior instead of creating a second recovery system.
- Static tests keep Phase 2 UI and Phase 3 production recovery behavior out of scope.

Still not approved:

- Import rollback UI.
- Browser/profile IndexedDB mutation tests.
- Automatic restore or repair.
- Any Supabase write or production recovery automation.

## 10. Current Import/Recovery Continuation Decision

Status: Phase 1 complete; continue only with a pure classifier design slice if explicitly approved.

Current decision:

- The direction remains valid only as a reinforcement of the existing `importData()` and `/recovery` safety semantics.
- Do not create a second backup, restore, import, or recovery system.
- Do not add a new recovery page.
- Do not wire new UI to `importData()`.
- Do not add automatic rollback, restore, or production recovery automation.

What is already complete:

- `importData()` safety order is documented and guarded.
- Isolated `fake-indexeddb` rollback verification exists.
- Import outcome states are documented:
  - `precheck_failed`;
  - `backup_failed`;
  - `transaction_failed`;
  - `post_import_validation_failed`;
  - `success_with_warnings`;
  - `success`.
- Existing `/recovery` remains the owner-only maintenance surface.

Recommended next low-risk slice:

- Add a pure import-outcome classifier design and tests only.
- The classifier must not call `importData()`.
- The classifier must not read or write IndexedDB.
- The classifier must not write Supabase.
- The classifier must not mount in UI.
- The classifier should define how future code maps known import phases/errors into the documented outcome states.

Deferred until a separate decision:

- `Import Safety Status` inside existing `/recovery`.
- Any emergency-backup metadata display.
- Any download affordance beyond existing backup/download behavior.
- Any production recovery behavior.
- Browser/profile IndexedDB verification.
