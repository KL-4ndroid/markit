# BoothBook P5 Low-Risk Execution Queue

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

## 3. Current Recommendation

L1-L6 are complete. Do not continue into Gate D implementation without explicit approval.

Recommended next low-risk work:
- Add more static sync boundary tests if needed.
- Use `SYNC_GATE_D_DECISION_RECORD_DRAFT.md` for the next manual Gate D approval discussion.
- Keep cache replacement and pending operations in preview/documentation mode only.

Do not start Gate D until the user explicitly approves one narrow slice from `SYNC_GATE_D_PREFLIGHT_DECISION_PLAN.md`.
