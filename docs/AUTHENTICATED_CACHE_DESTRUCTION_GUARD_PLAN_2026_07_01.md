# Authenticated Cache Destruction Guard Plan

Date: 2026-07-01

Status: implementation line.

Scope: protect every authenticated IndexedDB clear path from silently deleting local writes that have not reached Cloud. This plan consolidates login cache reset, clear-local-and-resync preflight, pending-operation pre-clear, and cloud-rebuild-first recovery guardrails.

## 1. Goal

Any code path that clears authenticated local cache must first prove that local writes are durable in Cloud or obtain an explicit discard decision from the user.

Authenticated local cache means the IndexedDB tables that contain user or team data:

- events;
- markets;
- products;
- dailyStats;
- settings sync cursors.

## 2. Entry Points

Every destructive local-clear entry point must route through a guard before calling `resetAuthenticatedCache`.

- manual sign-out;
- passive Supabase signed-out event;
- identity switch where `SIGNED_IN` changes from one user id to another;
- staff revoked or role-status reset flows;
- settings page local data clear;
- recovery clear-local-and-resync;
- future replace-cache execute;
- future cloud rebuild execute.

## 3. Shared Read-Only Report

The guard uses a local pending-write report before any mutation:

- count local `events` with `sync_status` of `pending` or `local_only`;
- count pending rows by event type;
- count pending rows by actor id;
- identify rows whose actor id does not match the current user id and is not `local`;
- count unfinished `syncQueue` rows;
- report whether the browser is online;
- report whether a sync lock is already active;
- return blocking reason codes.

This report must not write IndexedDB, write Supabase, trigger sync, clear data, or advance cursors.

## 4. Guard Policy

For manual sign-out:

- if the report is clean, clear local cache and sign out;
- if local writes exist and the app is online, attempt the existing `pushEvents` path once;
- if the second report is clean, clear local cache and sign out;
- if the app is offline, sync is locked, actor mismatch exists, or push leaves pending writes, block sign-out;
- allow force discard only with an explicit `forceDiscardLocalChanges` flag.

For passive sign-out and identity switch:

- do not silently clear local writes;
- when local writes exist, block the reset and leave local IndexedDB unchanged;
- require a later explicit user decision or same-account re-authentication to sync or discard.

For recovery and future replace-cache execute:

- reuse the local pending-write report;
- also require the pending-operations pre-clear report and cloud rebuild preview to be clean;
- do not execute local clear from a blocked or unknown report.

## 5. Non-Goals

This line does not approve:

- pending-operation drain, retry, cleanup, or automatic worker behavior;
- replace-cache execute;
- cloud rebuild execute;
- broad sync write-routing expansion;
- Supabase RLS changes;
- data repair;
- production synthetic data creation.

## 6. Completion Criteria

- `auth-context` no longer calls `resetAuthenticatedCache` directly.
- Manual sign-out routes through the guard.
- Passive sign-out and identity switch fail closed when local writes exist.
- Force discard requires an explicit option.
- Existing clear-local-and-resync planning references the shared pending-write report.
- Guardrail tests cover the direct-call boundary and the main guard decisions.
