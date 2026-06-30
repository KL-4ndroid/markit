# Import UI Classifier Integration Plan

Date: 2026-06-30

Status: design and guardrail slice only.

Scope: define how a future import UI may consume the import recovery outcome classifier without changing production import behavior now.

This document does not approve a new import UI, changes to `importData()`, automatic rollback, restore, repair, browser/profile IndexedDB mutation verification, Supabase writes, or production recovery automation.

## 1. Current Baseline

The current production codebase has these relevant pieces:

- `importData(jsonData)` exists in `lib/db/index.ts`.
- The import recovery outcome classifier exists in `lib/db/import-recovery-classifier.ts`.
- The owner-only `/recovery` page has a read-only `Import Safety Status` panel.
- Production app UI does not currently call `importData()`.
- Current tests call `importData()` directly for rollback and boundary verification.

Implication:

- The next safe step is not UI wiring.
- There is no mature import UI surface to attach classifier output to yet.
- Integration must be planned as a future contract, not silently introduced through `/recovery`.

## 2. Non-Goals

This slice must not:

- add a file picker;
- add a new import button;
- call `importData()`;
- change the `importData()` signature;
- parse error-message strings to infer outcome state;
- write IndexedDB;
- write Supabase;
- add automatic rollback, restore, or repair behavior;
- mount classifier output in UI.

## 3. Integration Problem

The classifier requires explicit phase metadata:

- `parse`;
- `integrity_precheck`;
- `replay_readiness`;
- `emergency_backup`;
- `replacement_transaction`;
- `post_import_validation`;
- `completed`.

The current `importData()` implementation throws ordinary errors. Ordinary error messages are not a stable integration boundary because they can change with translation, browser behavior, or lower-level library messages.

Therefore, a future UI must not classify outcomes by matching error strings.

## 4. Recommended Future Architecture

Recommended route when import UI is actually needed:

1. Extract import execution into a phase-aware internal service.
2. Keep the existing `importData(jsonData): Promise<void>` behavior compatible for existing callers and tests.
3. Add a new explicit result boundary for UI use, for example `runImportWithOutcome(jsonData)`.
4. The new boundary should return or throw structured data containing:
   - failed phase;
   - warning count;
   - original error;
   - classifier result.
5. UI should display only that structured classifier result.
6. UI should not create another backup, restore, or recovery system.

This is safer than wrapping current `importData()` and guessing the phase from an error message.

## 5. Rejected Options

### A. Parse Existing Error Messages

Rejected.

Reason:

- brittle across translations and browser/runtime errors;
- can misclassify `transaction_failed` versus `post_import_validation_failed`;
- encourages UI to depend on implementation strings.

### B. Reimplement Import Flow In UI

Rejected.

Reason:

- duplicates the dangerous clear/bulkAdd transaction path;
- increases risk that UI and DB import semantics drift;
- makes rollback and backup ordering harder to audit.

### C. Mount Classifier In `/recovery` Immediately

Rejected.

Reason:

- `/recovery` currently shows emergency backup status only;
- there is no active import operation context there;
- showing classifier output without a real import attempt would be misleading.

## 6. Safe Next Implementation Slice If Approved Later

If a runtime slice is approved later, the smallest safe implementation should be:

- add phase-aware import orchestration inside the DB layer, not UI;
- preserve the current `importData()` public behavior;
- add tests for each phase failure mapping;
- add source-order tests proving backup and transaction order is unchanged;
- add static tests proving no UI import button is introduced in the same slice;
- do not connect this to `/recovery` or settings UI yet.

Only after that passes should a separate UI slice display classifier results.

## 7. Decision Boundary

Stop for explicit approval before:

- adding a production import UI;
- changing `importData()` runtime behavior;
- changing thrown error semantics;
- introducing a phase-aware import runner;
- wiring classifier output into UI;
- testing against browser/profile IndexedDB;
- adding rollback, restore, or repair automation.
