# BoothBook Sync Gate D Decision Record Draft

Created: 2026-06-21
Status: historical D2a decision draft; superseded for current execution by `SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md`

## 0. Purpose

This draft turns the Gate D preflight plan into a decision record template.

It does not approve any implementation. It exists so the next approval step can be narrow, explicit, and reversible.

Gate D later progressed through narrow approved slices. Use `SYNC_GATE_D_WRITE_ROUTING_DECISION_RECORD.md` for the current D3c-2m pass evidence and D3c-2n implementation approval boundary.

## 1. Current Decision

Decision:
- D2a is approved and implemented as a schema/test/documentation slice only.
- Later narrow checklist-toggle, diagnostics, stale recovery, and retry/drain design slices were approved separately in later decision records.
- No production write routing is approved yet.
- No cache replacement execute mode is approved yet.

Allowed now:
- Documentation.
- Static guardrail tests.
- Test-only preview fixtures.
- Offline analysis with exported owner/staff data.
- The approved `pending_operations` schema draft in `supabase/migrations/048_add_pending_operations_schema.sql`.

Not allowed without explicit approval:
- Any additional Supabase table.
- Any additional new or changed RLS policy.
- Production import of `pending-operation-model`.
- Production import of `cache-replacement-preview`.
- Production write routing through pending operations.
- Cache replacement execute mode.
- Any local cache delete, clear, or overwrite behavior.
- Any financial or inventory projection rewrite.
- Any owner/staff capability definition change.

## 2. Candidate Gate D Slices

### Candidate A: Disabled Feature Flag Shell

Summary:
- Add disabled-by-default feature flags for future pending-operation or cache-replacement pilots.

Implementation status:
- Completed as an inert shell only.
- `lib/sync/sync-gate-d-flags.ts` defines disabled defaults.
- `tests/sync-gate-d-feature-flags.test.ts` proves defaults stay off and production sync paths do not consume the flags.

Risk:
- Low to medium if flags are inert and covered by tests.

Required approval:
- Flag names.
- Default values.
- Where flags may be read.
- Confirmation that no production behavior changes while flags are off.

Implemented flag names:
- `cloudPendingOperationsStorage`
- `pendingOperationWriteRouting`
- `cacheReplacementExecute`

Implemented restrictions:
- No environment variable control.
- No localStorage or sessionStorage control.
- No Supabase or Dexie reads.
- No production sync imports.
- No schema, RLS, write routing, or cache replacement behavior.

Rollback:
- Remove flags and tests.
- No data migration or cleanup required.

### Candidate B: Cloud Pending Operations Schema Draft

Summary:
- Add a draft migration and tests for a future `pending_operations` table.

Risk:
- High, because schema and RLS are involved.

Implementation status:
- Completed as the D2a slice.
- Added `supabase/migrations/048_add_pending_operations_schema.sql`.
- Added `tests/supabase-pending-operations-migration.test.ts`.
- Updated `tests/sync-phase3-phase4-guardrails.test.ts` so `pending_operations` is allowed only in the approved migration, not production code.

Approved D2a boundaries:
- Table shape, constraints, indexes, conservative RLS, and tests only.
- No production write routing.
- No UI changes.
- No sync push/pull changes.
- No cache replacement behavior.
- No financial or inventory projection changes.

Required approval:
- Table columns.
- RLS policies.
- Role-based insert/update/delete permissions.
- Idempotency key uniqueness rule.
- Retention and cleanup rule.
- Owner visibility over staff operations.
- User-visible error policy.

Rollback:
- Down migration or explicit forward-only disable plan.
- Handling plan for queued rows if rollback happens after deployment.

D2a rollback:
- If no production writes have been enabled, drop `public.pending_operations`.
- If future slices add queued rows, do not drop the table until rows are drained, exported, or intentionally ignored by a disabled feature flag.

### Candidate C: Checklist/Field Note Write Pilot

Summary:
- Route only checklist and field-note writes through pending operations.

Risk:
- High, because production write routing changes.

Required approval:
- Exact event types included.
- Whether direct event writes remain source of truth.
- Duplicate retry prevention.
- Role downgrade/revoke handling.
- Error UX by owner, manager, operator, and viewer.

Rollback:
- Disabled feature flag.
- Direct event write path remains available.
- Existing queued operations have a safe drain or ignore policy.

### Candidate D: Cache Replacement Execute Pilot

Summary:
- Give the preview-only cache replacement helper a debug-only execute path.

Risk:
- High, because local cache replacement can delete or overwrite user-visible data.

Required approval:
- Debug-only or role-specific availability.
- Stores eligible for replacement.
- Protected record categories.
- Whether delete candidates are deleted, archived, or only reported.
- Explicit exclusion of financial and inventory projections.

Rollback:
- Disabled feature flag.
- Local backup/export before execution.
- Recovery plan for accidental cache deletion.

## 3. Recommended First Approval

Recommended first slice:
- Candidate A only: disabled feature flag shell. This shell has been implemented as inert infrastructure and does not approve B, C, or D.

Why:
- It creates a controlled switch point without changing schema, RLS, production writes, or cache behavior.
- It can be tested entirely with flags off.
- It gives later Gate D slices a safer integration boundary.

Conditions:
- No production service may import pending-operation or cache-replacement execution helpers.
- No schema or migration changes in the same commit.
- No UI behavior change in the same commit.
- Audit tests must prove defaults are off.

## 4. Manual Approval Checklist

Before starting any Gate D implementation, the owner must confirm:
- Which candidate slice is approved.
- The exact files or layers that may be touched.
- Whether feature flags are required.
- Rollback behavior.
- Test scope.
- Whether the change may be pushed immediately after validation.

## 5. Stop Conditions

Stop again if implementation pressure expands into:
- Combining schema and production write routing.
- Combining cache replacement execute and pull integration.
- Combining RLS changes and UI changes.
- Touching financial or inventory projections.
- Changing owner/staff role capabilities.
- Changing local cache delete or overwrite behavior.
