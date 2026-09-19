# Cloud Rebuild Preview Design

Date: 2026-06-30

Status: pure model and static guardrail phase.

Scope: define and model the non-mutating preview for a future clear-local-and-resync flow. This document does not approve reading live Supabase data, reading IndexedDB, clearing local tables, replacing cache, advancing sync cursors, pending-operation drain/retry, or wiring a destructive UI button.

## 1. Purpose

The cloud rebuild preview is the report shown before any future local reset decision. It answers:

- which local tables would be cleared;
- how many local rows exist in each table;
- which protected local rows block reset;
- which cloud sources would be read;
- how many cloud rows were found;
- whether pending operations block reset;
- whether the rebuild scope is owner-full, manager-market-scope, or staff-view;
- why execute is blocked.

## 2. Current Slice

This slice adds only:

- `lib/sync/cloud-rebuild-preview.ts`
- `tests/cloud-rebuild-preview.test.ts`

The model is pure and input-driven. It does not import Supabase, Dexie, `db`, React, hooks, or recovery UI components.

## 3. Blocking Rules

Preview is blocked when:

- actor id is missing;
- actor role is not owner;
- scope is not `owner-full`;
- pending operations pre-clear decision is `blocked` or `unknown`;
- pending operations report has unresolved operation ids;
- pending operations report has blocking reason codes;
- local unsynced rows exist;
- local-only rows exist;
- protected local rows exist;
- cloud read errors exist;
- cloud row count is zero without a separate empty-account proof.

Manager and staff scopes remain preview-planning concepts only. They cannot proceed to execute.

## 4. Output Contract

The preview returns:

- actor id and role;
- checked-at timestamp;
- rebuild scope;
- local tables that would be cleared;
- cloud sources that would be read;
- total local row count;
- total cloud row count;
- protected local row count;
- blocking reason codes;
- warnings;
- `canProceedToExecute: false`.

`canProceedToExecute` is always false in this slice.

## 5. Prohibited

This slice must not:

- call `db.delete()`;
- call `db.table.clear()`;
- call `bulkDelete`;
- call replace-cache execute or apply;
- call Supabase;
- read IndexedDB;
- write IndexedDB;
- advance sync cursors;
- call `drain_checklist_toggle_pending_operation`;
- call `recover_stale_processing_pending_operation`;
- mount in `/recovery`;
- add a destructive button.

## 6. Next Boundary

The next low-risk slice may add a read-only data collector design or test fixture. Stop for explicit approval before connecting this preview to live Supabase, Dexie, recovery UI, or any local clear/replace-cache execute path.
