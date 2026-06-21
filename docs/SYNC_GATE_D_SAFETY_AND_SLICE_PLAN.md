# BoothBook Sync Gate D Safety And Slice Plan

Created: 2026-06-21
Status: active decision plan after D2a

## 0. Current State

D2a is implemented:
- `supabase/migrations/048_add_pending_operations_schema.sql`
- `tests/supabase-pending-operations-migration.test.ts`
- Guardrails allow `pending_operations` only in the approved migration, not production runtime.

Still not approved:
- Production write routing through `pending_operations`.
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
- `writeFieldOpsEvent` currently has only one executable route: direct `recordEvent`.
- The adapter reads the disabled `pendingOperationWriteRouting` flag but does not enqueue or write `pending_operations`.
- No Supabase client, RPC, migration, UI, or RLS change is included.

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
- D3c-0 RPC draft, but only after manual approval.

Do not proceed directly to:
- D3c write pilot.
- D4 cache execute.

The next manual decision should confirm whether D3c-0 is approved with these limits:
- SECURITY DEFINER enqueue RPC draft only,
- checklist toggle scope only,
- live permission validation,
- no runtime connection in the same commit,
- no UI behavior change.
