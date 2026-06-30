# Import Recovery Semantics Plan

Date: 2026-06-29

Scope: define import failure semantics and recovery UI boundaries without changing production import behavior, recovery UI, IndexedDB mutation behavior, Supabase behavior, or automatic repair behavior.

## 1. Current System Baseline

Existing behavior already covers the core import safety path:

- `importData()` parses backup JSON before any import replacement.
- `importData()` runs `checkBackupIntegrity()` before any import replacement.
- `importData()` runs `validateBackupReplayReadiness()` before any import replacement.
- `importData()` creates an emergency local backup before replacing IndexedDB tables.
- `importData()` clears and bulk-adds replacement records inside one Dexie transaction.
- `importData()` runs post-import integrity validation after the transaction.
- `/recovery` is already owner-only through repair-tool capability checks.
- `DatabaseRecoveryPanel` already supports local backup, database health check, and explicit repair actions.
- Existing repair actions are manual and local-first; broad automatic production recovery is not approved.

The next safe work must build on these existing surfaces. It must not create a second recovery system.

## 2. Failure Semantics Contract

Future UI and diagnostics should classify import outcomes into these states:

| State | Meaning | IndexedDB mutation expectation | User-facing guidance |
| --- | --- | --- | --- |
| `precheck_failed` | JSON parse, backup integrity, or replay readiness failed before emergency backup and transaction. | No replacement transaction should run. Existing IndexedDB data should remain untouched. | Show validation errors. Do not suggest rollback. |
| `backup_failed` | Emergency backup could not be created. | No replacement transaction should run. Existing IndexedDB data should remain untouched. | Cancel import. Tell the user backup creation failed and data was protected. |
| `transaction_failed` | Replacement transaction started but failed before completion. | Dexie/IndexedDB should roll back the transaction. Existing IndexedDB data should remain as it was before import. | Tell the user import failed and local data should remain unchanged. Suggest exporting/checking data if concerned. |
| `post_import_validation_failed` | Replacement transaction completed, but post-import integrity validation failed. | New data may already be present. This is the highest-risk import failure state. | Tell the user to use the emergency backup and contact support/developer before further repair. |
| `success_with_warnings` | Import completed and validation passed, but non-blocking warnings exist. | Imported data is present. | Show warnings and recommend a database health check. |
| `success` | Import completed and validation passed without warnings. | Imported data is present. | Show success and recommend normal app reload/health check if needed. |

## 3. Phase 1: Semantics Design And Static Guardrails

Status: approved low-risk slice.

Allowed work:

- Add this design document.
- Add static tests that verify the failure-state contract exists.
- Add source-order guardrails for `importData()`:
  - parse and precheck before emergency backup;
  - emergency backup before replacement transaction;
  - replacement transaction before post-import validation.
- Add static tests that confirm this phase does not approve:
  - import replacement behavior changes;
  - recovery UI changes;
  - browser/profile IndexedDB mutation verification;
  - automatic import rollback;
  - production recovery automation;
  - Supabase writes.

Not included:

- New UI.
- New runtime services.
- New import wrappers.
- New automatic restore behavior.
- Browser/profile IndexedDB tests.

## 4. Phase 2: Import Safety Status UI Shell

Status: completed as read-only UI shell.

Completed shape:

- Extend the existing `/recovery` page instead of creating a new recovery page.
- Add a small read-only `Import Safety Status` area to the existing recovery surface.
- Show whether emergency backup metadata exists.
- Show emergency backup created time, size, and whether the backup was stored locally or downloaded.
- Provide a download affordance only when the emergency backup content still exists in localStorage.
- Does not display import error classification.
- Does not call `importData()`.
- Does not restore or repair data.
- Does not write IndexedDB.
- Does not write Supabase.

Remaining hard boundaries:

- Do not add automatic restore.
- Do not call `importData()` from the status panel.
- Do not mutate IndexedDB from the status panel.
- Do not write Supabase.
- Do not duplicate `DatabaseRecoveryPanel` backup/repair controls.

## 5. Phase 3: Production Recovery Behavior

Status: high-risk candidate only; not approved by this document.

Only narrow, single-purpose repair actions should be considered. Each action must meet all requirements:

- owner-only;
- local IndexedDB only unless separately approved;
- dry-run report first;
- execute only after explicit user confirmation;
- mandatory backup before execute;
- execute must affect only rows shown in the dry-run report;
- no Supabase write;
- no sync routing change;
- no pending-operation drain;
- no cache replacement execute;
- dedicated tests and rollback/no-rollback statement.

Not recommended:

- background automatic repair;
- app-start automatic import rollback;
- sync-failure-triggered IndexedDB clearing or rebuilding;
- one-click broad repair;
- production cloud data repair.

## 6. Browser/Profile IndexedDB Verification

Status: high-risk candidate only; not approved by this document.

Do not run browser/profile mutation verification unless one of these conditions exists:

- Chrome IndexedDB behavior is suspected to differ from `fake-indexeddb`.
- The import/export UI is about to become a primary production workflow.
- A real user reports local data damage after failed import.
- `importData()` transaction semantics are about to change.

If approved later, the only acceptable setup is:

- Playwright or equivalent temporary browser profile;
- local dev server;
- disposable IndexedDB profile;
- test deletes the temporary profile after completion;
- never use the user's daily Chrome profile.

## 7. Near-Term Recommendation

Phase 1 and the first read-only Phase 2 shell are complete.

The next runtime decision is whether to introduce phase-aware import orchestration for future UI use. That decision is not approved by this document.

## 8. Pure Import Outcome Classifier

Status: completed as non-runtime work.

Result record:

- `lib/db/import-recovery-classifier.ts`
- `tests/import-recovery-classifier.test.ts`

Safety boundaries:

- The classifier accepts explicit import phases and outcome metadata.
- The classifier does not parse error-message strings.
- The classifier does not call `importData()`.
- The classifier does not read or write IndexedDB.
- The classifier does not write Supabase.
- The classifier does not mount in UI.
- The classifier never recommends automatic restore.

Still not approved:

- Connecting the classifier to import UI.
- Browser/profile IndexedDB mutation verification.
- Automatic rollback, restore, repair, or production recovery behavior.

## 9. Import UI Classifier Integration Design

Status: completed as design-only work.

Result record:

- `docs/IMPORT_UI_CLASSIFIER_INTEGRATION_PLAN_2026_06_30.md`
- `tests/import-ui-classifier-integration-plan.test.ts`

Safety boundaries:

- The design records that production app UI does not currently call `importData()`.
- The design does not approve runtime UI wiring.
- The design rejects parsing error-message strings to infer classifier state.
- The design rejects reimplementing import replacement logic in UI.
- The design recommends a separately approved phase-aware DB-layer orchestration boundary before any UI consumes classifier output.

Still not approved:

- Adding a production import UI.
- Changing `importData()` runtime behavior.
- Introducing a phase-aware import runner.
- Wiring classifier output into UI.
- Browser/profile IndexedDB mutation verification.
- Automatic rollback, restore, repair, or production recovery behavior.
