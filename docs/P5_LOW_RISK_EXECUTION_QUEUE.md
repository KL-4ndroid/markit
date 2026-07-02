# Féria P5 Low-Risk Execution Queue

Created: 2026-06-20
Status: active low-risk queue

## 0. Purpose

This document defines what can continue without entering the high-risk Gate D boundary.

The goal is to keep improving P5 staff-role, field-notes, checklist, and shared market-detail UI while avoiding schema, RLS, production sync routing, and destructive cache behavior.

## 1. Risk Bands

### Low Risk: Can Continue

Allowed:
- UI state improvements for existing components.
- Static regression tests.
- Accessibility attributes.
- Empty/loading/error copy improvements.
- Read-only UI validation for viewer/operator roles.
- Component-level refactors that preserve props and service calls.
- Test-only fixtures for sync preview helpers.
- Documentation and execution plans.

Requirements:
- No Supabase migration.
- No RLS or database policy change.
- No production import of pending-operation or cache-replacement helpers.
- No role capability changes.
- No local cache deletion or overwrite behavior.
- No financial or inventory projection change.

### Medium Risk: Analyze Before Touching

Requires a short safety analysis before implementation:
- `hooks/useSync.ts` behavior or dependency changes.
- `lib/sync/*` production services.
- Staff/owner route switching.
- Event replay or projection helpers.
- Capability derivation.
- Owner/staff data visibility.

Allowed only if the change is narrow, covered by targeted tests, and does not alter production data flow.

### High Risk: Stop For Manual Approval

Requires explicit approval:
- New Supabase table.
- New or changed RLS policy.
- `pending_operations` migration.
- Production write routing through pending operations.
- Cache replacement execute mode.
- Owner/staff pull integration with replacement behavior.
- Local cache delete/clear/overwrite behavior.
- Financial/inventory projection rewrite.

## 2. Recommended Order

### L1: P5 Field Ops UI Guardrails

Goal:
- Prevent UI panels from importing sensitive sync, auth, role, or Supabase layers.

Status:
- Completed.

Exit criteria:
- Tests confirm `FieldNotesPanel`, `ChecklistPanel`, and `MarketFieldOpsSection` stay prop-driven.
- Tests confirm panels do not import `useUserRole`, `useAuth`, `supabase`, `lib/sync`, `pending-operation-model`, or `cache-replacement-preview`.

### L2: Field Ops UI State Coverage

Goal:
- Keep loading, empty, saving, cancel, and trim behavior stable.

Status:
- Completed.

Exit criteria:
- Tests cover loading and empty copy.
- Tests cover `aria-busy`.
- Tests cover create/update trimming.
- Tests cover edit reset.

### L3: Shared Market Detail Stability

Goal:
- Keep owner and staff details using shared Field Ops components without merging sensitive owner-only controls.

Status:
- Completed.

Exit criteria:
- Staff route continues to return before owner-only UI.
- Owner route continues to pass full field-ops permissions.
- Staff route continues to pass derived capabilities only.

### L4: Sync Preview Fixture Expansion

Goal:
- Use test-only fixtures to understand cache replacement impact without production imports.

Status:
- Completed.

Exit criteria:
- Owner fixture includes add/update/keep/delete candidates.
- Staff fixture proves scoped replacement cannot affect outside-scope local records.
- Protected local records remain skipped.

### L5: Medium-Risk Lint Warning Review

Goal:
- Review `hooks/useSync.ts` `effectiveInfoLevel` dependency warning without changing behavior casually.

Status:
- Completed.

Safety analysis:
- `sync` already passes `effectiveInfoLevel` into `pullAllEvents`.
- Adding `effectiveInfoLevel` to the callback dependency list changes callback identity when the info level changes, so later calls through `syncFnRef` use the current visibility level.
- This does not add a new sync trigger. Initial sync and interval setup still depend on the existing effects and `syncIdentity`.
- `effectiveStaffMode` is not used inside the callback and was removed from that dependency list to satisfy `react-hooks/exhaustive-deps`.
- Existing staff/owner route switching remains controlled by `syncIdentity` and `pullAllEvents(infoLevel)`.

Exit criteria:
- Document whether adding the dependency changes sync callback identity or execution timing.
- Add or update audit tests before any hook change.

### L6: Field Ops Write Boundary Guardrails

Goal:
- Keep field notes and checklist writes behind service contracts so future `pending_operations` routing can replace internals without rewriting UI.

Status:
- Completed.

Safety analysis:
- This is test-only plus documentation.
- It does not change field-note or checklist runtime writes.
- It does not import Gate D flags, pending operation models, cache replacement helpers, Supabase, or sync services into field ops write services.
- It explicitly keeps panels calling service functions instead of direct event writers.

Exit criteria:
- Tests confirm field ops services remain direct-event services for now.
- Tests confirm services do not consume Gate D infrastructure.
- Tests confirm panels call service functions rather than `recordEvent`.

### L7: Field Ops Read Boundary Guardrails

Goal:
- Keep field notes and checklist reads as local event read models so future write routing changes do not leak into display logic.

Status:
- Completed.

Safety analysis:
- This is test-only plus documentation.
- It does not change read or write runtime behavior.
- It does not add cloud reads, sync imports, Gate D flags, pending-operation imports, or cache replacement behavior.
- It keeps field ops display derived from local market-scoped events.

Exit criteria:
- Tests confirm read models rebuild from `db.events`.
- Tests confirm read models filter by market scope through `getEventMarketId`.
- Tests confirm create/update/delete events are applied in timestamp order.
- Tests confirm malformed or unrelated events are skipped.

### L8: Field Ops Payload Contract Guardrails

Goal:
- Keep note/checklist event payload requirements stable across service writes, `recordEvent` validation, and backup integrity checks.

Status:
- Completed.

Safety analysis:
- This is test-only plus documentation.
- It does not change event payloads or validators.
- It does not add `pending_operations`, write routing, Gate D flag consumption, or cache replacement behavior.
- It preserves checklist toggle as a completed-only payload so operator toggle remains separate from checklist text management.

Exit criteria:
- Tests confirm `recordEvent` validates note/checklist required fields.
- Tests confirm integrity validation rejects malformed note/checklist payloads.
- Tests confirm services emit stable market-scoped payload fields.
- Tests confirm checklist toggle stays completed-only.

### L9: Gate D Model Isolation Guardrails

Goal:
- Keep pending operation and cache replacement helpers isolated as local-only / preview-only models until Gate D is explicitly approved.

Status:
- Completed.

Safety analysis:
- This is test-only plus documentation.
- It does not change pending operation or cache replacement behavior.
- It does not connect helpers to production sync, Supabase, Dexie, environment flags, or local cache writes.
- It keeps cache delete candidates report-only.

Exit criteria:
- Tests confirm pending operation model is side-effect free.
- Tests confirm cache replacement helper remains preview-only.
- Tests confirm production sync does not import Gate D models or flags.
- Tests confirm delete candidates are not executable behavior.

### L10: Field Ops Route Boundary Guardrails

Goal:
- Keep owner and staff market detail routes composing field notes and checklist only through `MarketFieldOpsSection`.

Status:
- Completed.

Safety analysis:
- This is test-only plus documentation.
- It does not change owner/staff route behavior.
- It does not change component props, permissions, data reads, or writes.
- It prevents route-level drift where owner/staff details directly import note/checklist panels or services.

Exit criteria:
- Tests confirm owner and staff details import `MarketFieldOpsSection`.
- Tests confirm route/detail files do not import note/checklist panels or services directly.
- Tests confirm owner and staff pass explicit permission props at the shared section boundary.
- Tests confirm detail routes do not import Gate D models.

## 3. Current Recommendation

L1-L10 are complete. Do not continue into new Gate D implementation without explicit approval.

Gate D has since progressed through a narrow pending-operation checklist-toggle pilot, owner-only diagnostics, stale `processing` recovery planning, D3c-2m staging verification, D3c-2n retry/drain action design, D3c-2n-1 service wrapper draft, D3c-2n-2 owner-only single-row UI button, and D3c-2n-3 local/staging manual verification.

Recommended next low-risk work:
- Add more static sync boundary tests if needed.
- Treat the D3c-2m prerequisite as satisfied for the missing-final-event recovery path.
- Treat D3c-2n-1 service wrapper draft as complete.
- Treat D3c-2n-2 owner UI button as complete.
- Treat D3c-2n-3 local/staging manual verification as complete.
- Keep D3c-2n-4 production disposable verification blocked until explicit high-risk approval and one disposable owner-created row are provided.
- Continue only design, documentation, diagnostics, static tests, or other non-mutating guardrails.
- Keep cache replacement and pending operations in preview/documentation mode unless a previously approved narrow slice is already implemented and covered.

Do not start D3c-2n-4 production verification, worker, automatic retry, broad cache replacement execute, RLS changes, production synthetic data creation, staff-row drain, or feature-flag default changes until a new explicit high-risk decision supersedes this boundary.
