# Cloud Rebuild First Recovery Plan

Date: 2026-06-30

Status: planning and guardrail phase.

Scope: reframe BoothBook recovery around cloud-trusted rebuild of local cache, while keeping previous import/backup safety work as secondary infrastructure.

This document does not approve deleting local data, replacing local cache, running replace-cache execute, adding automatic cloud rebuild, changing sync routing, exposing production import UI, or broadening data export permissions.

## 1. Product Direction

The new recovery direction is:

- Cloud data is the primary trusted source.
- Local IndexedDB is fast cache and offline temporary state.
- Local backup is not a primary user-facing product feature.
- Local backup may remain as an internal safety mechanism before high-risk operations until cloud rebuild is proven safe.
- If local data is corrupted, the preferred user-facing direction is to clear local data and resync from cloud.
- CSV / Excel export is a reporting feature, not a backup or recovery feature.

## 2. Reclassification Of Existing Work

| Existing work | New role |
| --- | --- |
| Import recovery classifier | Developer/emergency import safety, not primary recovery route |
| Phase-aware import runner | Structured emergency import foundation, not production import UI |
| Import Safety Status panel | Advanced/secondary safety information |
| Emergency local backup | Internal guardrail for high-risk mutation only |
| Pending operations diagnostics | Required pre-clear safety check |
| Retry/drain tooling | Owner-only manual recovery, not automatic rebuild |
| Cache replacement preview/simulator | Basis for cloud rebuild preview |
| Replace-cache execute | Still blocked until preview and pending checks are safe |
| Recovery page | Should move toward local rebuild and sync recovery |

## 3. Updated Execution Plan

### Step 1: Plan Update

Status: in progress.

Goal:

- Update docs and guardrails to make cloud rebuild first the recovery direction.
- Keep previous import/backup work as secondary infrastructure.

No runtime code changes.

### Step 2: Clear Local And Resync Design

Goal:

- Define the safe flow for clearing local IndexedDB and resyncing from cloud.

Required checks:

- current user role;
- cloud session availability;
- pending operations status;
- local-only data status;
- cloud read availability;
- owner/staff/manager scope.

Not approved:

- deleting IndexedDB;
- clearing local data;
- starting rebuild automatically.

### Step 3: Pending Operations Pre-Clear Check

Goal:

- Define and later implement a read-only pre-clear report.

The report must block local clear if any of these exist:

- unsynced local events;
- pending operations in `queued`, `processing`, or retryable failure states;
- local-only checklist, field note, deal, or interaction writes;
- unknown operation types.

### Step 4: Cloud Rebuild Preview

Goal:

- Build a non-mutating preview that answers:
  - what local tables would be cleared;
  - what cloud records would be pulled;
  - whether scope is owner-full or staff/manager-scoped;
  - whether rebuild is blocked by pending data.

Not approved:

- deleting local tables;
- applying replace-cache;
- changing sync pull behavior.

### Step 5: CSV Reporting Export Specification

Goal:

- Design reporting exports separately from backup/recovery.

Recommended permissions:

- Owner: full reporting exports.
- Manager: authorized market scope reporting exports.
- Operator: no broad export by default; optional own activity export only after approval.
- Viewer: no export.

Initial low-risk format:

- CSV first.
- Excel multi-sheet export later.

### Step 6: Low-Risk CSV Export

Goal:

- Implement narrowly scoped CSV export after the reporting specification is approved.

Not approved in this plan:

- exporting sensitive owner-only fields to manager/staff;
- Excel generation;
- background export jobs.

### Step 7: Replace-Cache Execute Decision

Goal:

- Discuss destructive local cache replacement only after:
  - pending pre-clear checks exist;
  - cloud rebuild preview is stable;
  - role scope rules are explicit;
  - rollback/abort behavior is documented.

## 4. Immediate Stop Conditions

Stop for explicit approval before:

- clearing local IndexedDB;
- executing replace-cache;
- changing pull sync to replace local cache;
- adding automatic rebuild after login;
- broadening `/recovery` tools to staff roles;
- exposing import UI;
- adding CSV/Excel exports that include cost, profit, booth fee, supplier, or owner-only fields.

## 5. Current Recommendation

Continue with documentation, static guardrails, and read-only previews until the cloud rebuild preview and pending operations pre-clear checks are clearly safe.
