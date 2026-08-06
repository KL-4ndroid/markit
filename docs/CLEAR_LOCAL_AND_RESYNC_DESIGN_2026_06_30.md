# Clear Local And Resync Design

Date: 2026-06-30

Status: design and static guardrail phase.

Scope: define the safe future flow for clearing local IndexedDB and rebuilding it from cloud data. This document does not approve local deletion, replace-cache execute, automatic rebuild, sync routing changes, Supabase writes, or broadening recovery tools to staff roles.

## 1. Current Baseline

The project already has related pieces, but none of them should be treated as a complete production reset flow:

- `lib/supabase/migration.ts` contains an older `clearLocalDataAndPullFromCloud()` migration path.
- Owner and staff pull services currently merge or append authorized cloud data into local IndexedDB.
- Cache replacement preview and simulator are report-only.
- Pending operation diagnostics exist for owner-only inspection and single-row manual recovery.
- `/recovery` is owner-gated through repair-tool capability checks.

The safe path is to design a new preflight and preview boundary before any destructive local reset is considered.

## 2. Role Policy

Initial execution policy:

- Owner: may be eligible for future clear-local-and-resync execute after all preflight checks pass and after a separate approval.
- Manager: may be eligible for future scoped preview only; execute is not approved.
- Operator: no clear-local execute; may only continue normal sync behavior.
- Viewer: no clear-local execute and no repair actions.

Reasoning:

- Owner can represent the whole account and authorized cloud scope.
- Manager scope is market-limited and cannot safely decide whether unrelated owner cache should be removed.
- Operator and viewer should not receive destructive recovery controls.

## 3. Required Non-Mutating Preflight

Before a clear-local-and-resync action can even be previewed, a read-only preflight must verify:

- authenticated Supabase session exists;
- current local role is loaded and not in an unresolved loading/error state;
- actor has the required recovery capability;
- cloud reads for the actor's authorized scope succeed;
- pending operations report is clean;
- local unsynced data report is clean;
- local-only writes report is clean;
- cloud rebuild scope is explicit: `owner-full`, `manager-market-scope`, or `staff-view`;
- existing sync is idle or can be paused before a future execute;
- user-facing copy makes clear that this affects local IndexedDB only and does not modify cloud data.

Any unknown state must fail closed.

The local unsynced data report and local-only writes report are provided by the shared authenticated cache destruction guard line:

- `docs/AUTHENTICATED_CACHE_DESTRUCTION_GUARD_PLAN_2026_07_01.md`
- `lib/sync/local-pending-write-report.ts`
- `tests/auth-cache-destruction-guard.test.ts`

Recovery clear-local-and-resync must reuse this report instead of creating a separate pending/local-only detector.

## 4. Blocking Conditions

The preflight must block preview or execute when any of these are found:

- Supabase session is missing or expired.
- Role cannot be confirmed.
- Actor does not have owner repair-tool capability.
- Cloud read fails or returns permission errors.
- `pending_operations` has `queued`, `processing`, `failed_retryable`, or unknown status rows.
- Local events, markets, products, notes, checklist items, deals, or interactions have `pending`, `local_only`, or unknown sync state.
- Local-only field notes or checklist writes exist.
- Remote authorized scope cannot be determined.
- Cloud event set is empty without a separate empty-account proof.
- Staff/manager scoped rebuild would require deleting records outside the actor's authorized scope.
- Existing sync is currently pushing or pulling and cannot be paused.

## 5. Preview Contract

The preview must be read-only and return a report with:

- actor id and role;
- rebuild scope;
- local tables that would be cleared;
- local row counts by table;
- protected local rows that block clearing;
- pending operation counts by status and type;
- cloud source tables or views that would be read;
- cloud row counts by table or event type;
- cloud read errors;
- whether execute is blocked;
- exact reasons execute is blocked.

The preview must not:

- call `db.delete()`;
- call `db.table.clear()`;
- call `bulkDelete`;
- call replace-cache execute/apply;
- write Supabase;
- advance sync cursors;
- retry or drain pending operations.

## 6. Future Execute Shape

Future execute is not approved by this document. If approved later, it should be a separate slice with all of these requirements:

- owner-only first;
- explicit final confirmation;
- sync paused before mutation;
- preflight re-run immediately before execute;
- pending operations still clean;
- cloud preview still valid;
- local deletion and cloud rebuild run in a narrow service boundary;
- local sync cursor reset happens only after successful rebuild;
- post-rebuild validation runs before reporting success;
- failure state tells the user to rerun preview, not to manually edit data.

## 7. Existing Migration Boundary

The older `clearLocalDataAndPullFromCloud()` path must not become the production recovery implementation without redesign.

Reasons:

- It does not model pending operations.
- It does not produce a user-visible preview.
- It does not distinguish owner-full from staff/manager scoped rebuild.
- It clears several tables before replaying events.
- It does not provide a modern cloud completeness report.
- It does not define sync pause/resume behavior.

It can inform the future implementation, but should not be wired into `/recovery` as-is.

## 8. Step 2 Result

This step completes the design boundary only.

Approved now:

- documentation;
- static guardrail tests;
- future non-mutating preflight/preview planning.

Still not approved:

- clearing local IndexedDB;
- calling existing clear-and-pull migration from UI;
- replace-cache execute;
- automatic rebuild after login;
- manager/staff execute;
- pending operation discard;
- Supabase mutation.

## 9. Step 3 Dependency

The pending operations pre-clear check is now defined in:

- `docs/PENDING_OPERATIONS_PRE_CLEAR_CHECK_DESIGN_2026_06_30.md`
- `tests/pending-operations-pre-clear-check-design.test.ts`

Clear-local-and-resync preview must treat that report as a required dependency. A blocked or unknown pending-operation report blocks any future clear-local execute decision.
