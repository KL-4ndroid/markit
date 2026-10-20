# Féria Sync Gate D Preflight Decision Plan

Created: 2026-06-20
Status: historical pre-implementation decision plan; superseded for current execution by later Gate D decision records

## 0. Purpose

Gate D is the first point where the sync refactor can change production write behavior, cloud schema, or local cache replacement behavior.

This document must be reviewed before any Gate D implementation begins. It intentionally does not approve implementation by itself.

## 1. Current State

Already completed:
- Gate A: Phase 3/4 risk guardrails.
- Gate B: local-only pending operation model.
- Gate C: replace-cache preview-only helper.
- Gate D2a: `pending_operations` schema draft, migration tests, and guardrail allowlist.
- Later Gate D checklist-toggle slices through D3c-2n are recorded in `docs/SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md`.
- D3c-2m local/staging synthetic stale recovery execution passed on 2026-06-26 Asia/Taipei.

Still not implemented:
- No broad production write path uses the `pending_operations` table by default.
- No production write path uses the pending operation model.
- No owner/staff pull uses cache replacement execute behavior.
- No local cache delete/overwrite behavior has changed.

## 2. Decisions Required Before Gate D

### Decision A: Cloud Pending Operation Storage

Question:
- Should Féria add a cloud `pending_operations` table?

Recommended default:
- D2a was the first approval. Later narrow checklist-toggle Gate D slices were approved separately. Keep using event writes as the normal production source of truth until low-risk domains prove the model and a new explicit approval changes that boundary.

Approval must specify:
- Table columns.
- RLS policies.
- Insert/update/delete permissions by role.
- Idempotency key uniqueness rule.
- Retention and cleanup rule.
- Whether owner can inspect staff pending operations.
- Whether blocked operations are user-visible.

Rollback requirement:
- A down migration or explicit forward-only disable plan.
- A plan for existing queued rows if rollback happens after deployment.

### Decision B: Production Write Routing

Question:
- Should checklist/field-note writes route through pending operations?

Recommended default:
- If approved later, start only with checklist and field notes.

Approval must specify:
- Which event types are included first.
- Whether the original event write remains the source of truth.
- How duplicate retries are prevented.
- How role downgrade/revoke changes queued operations.
- How errors are shown to owner, manager, operator, and viewer.

Rollback requirement:
- A feature flag or hard-disable switch.
- Existing direct event write path must remain available until the new path is proven.

### Decision C: Cache Replacement Execute Mode

Question:
- Should the replace-cache preview helper gain an execute mode?

Recommended default:
- Not yet. Keep preview-only until owner/staff datasets are tested with real exported snapshots.

Approval must specify:
- Whether execute is allowed for owner, staff, or debug-only.
- Which stores can be replaced.
- Which records are protected from replacement.
- Whether delete candidates are actually deleted, archived, or only reported.
- Whether financial and inventory projections are excluded.

Rollback requirement:
- Replacement must be disabled by feature flag.
- A local backup/export path must exist before destructive execution.
- A recovery path must be documented for accidental local cache deletion.

## 3. Minimum Safety Rules For Any Gate D Implementation

Mandatory:
- Keep direct event sync behavior available as fallback.
- Add feature flags with default off.
- Add audit tests before production imports.
- Add tests for role downgrade, revoked access, offline retry, duplicate retry, and stale local cache.
- Keep owner and staff paths separately tested.
- Keep repair tools owner-only.
- Protect `pending`, `local_only`, `blocked_permission`, and metadata-blocked records.
- Do not rewrite financial/inventory projection behavior in the same commit.

Not allowed in the same commit:
- Schema migration plus production write routing.
- Cache replacement execute plus owner/staff pull integration.
- RLS changes plus UI changes.
- Projection behavior changes plus cache replacement.

## 4. Recommended Gate D Sequence

### D0: Decision Record

Create a short decision record confirming exactly which Gate D slice is approved.

Exit criteria:
- The approved slice is narrow.
- Rollback plan is included.
- No code has been changed yet.

### D1: Feature Flag Shell

Add disabled-by-default feature flags and tests.

Exit criteria:
- Production behavior is identical while flags are off.
- Tests prove flags default to off.

### D2: Cloud Schema Draft

If `pending_operations` is approved, add migration and RLS tests only.

Exit criteria:
- Migration test passes.
- No production write path imports the pending operation service.

Status:
- Completed as D2a in `supabase/migrations/048_add_pending_operations_schema.sql`.
- This does not approve production write routing.

### D3: Low-Risk Write Pilot

If write routing is approved, pilot checklist/field-note operations only.

Exit criteria:
- Idempotent retry test passes.
- Permission-blocked operations do not auto-retry.
- Existing direct write path remains available.

### D4: Cache Replacement Execute Pilot

If replacement execute is approved, add debug-only execution first.

Exit criteria:
- Execute is unavailable to normal owner/staff pull.
- Protected local records are preserved.
- Delete candidates are not deleted unless a later explicit approval allows it.

## 5. Stop Conditions

Stop and ask for manual confirmation if any implementation requires:
- New Supabase table.
- New or changed RLS policy.
- Production import of `pending-operation-model`.
- Production import of `cache-replacement-preview`.
- Any local cache delete/clear/overwrite behavior.
- Any change to financial/inventory projections.
- Any change to owner/staff role capability definitions.

## 6. Current Recommendation

Do not start any new Gate D production write routing yet.

Recommended next low-risk work:
- Treat D3c-2m as passed for the missing-final-event recovery path.
- Treat D3c-2n-1 owner-only single-row service wrapper as complete.
- Keep D3c-2n-2 owner UI button blocked until explicit high-risk approval.
- Continue only documentation, static/audit tests, diagnostics design, and non-mutating preview work unless a new explicit high-risk decision supersedes this boundary.
- Keep cache replacement preview-only.
