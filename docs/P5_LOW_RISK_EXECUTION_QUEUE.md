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
- In progress.

Exit criteria:
- Tests confirm `FieldNotesPanel`, `ChecklistPanel`, and `MarketFieldOpsSection` stay prop-driven.
- Tests confirm panels do not import `useUserRole`, `useAuth`, `supabase`, `lib/sync`, `pending-operation-model`, or `cache-replacement-preview`.

### L2: Field Ops UI State Coverage

Goal:
- Keep loading, empty, saving, cancel, and trim behavior stable.

Exit criteria:
- Tests cover loading and empty copy.
- Tests cover `aria-busy`.
- Tests cover create/update trimming.
- Tests cover edit reset.

### L3: Shared Market Detail Stability

Goal:
- Keep owner and staff details using shared Field Ops components without merging sensitive owner-only controls.

Exit criteria:
- Staff route continues to return before owner-only UI.
- Owner route continues to pass full field-ops permissions.
- Staff route continues to pass derived capabilities only.

### L4: Sync Preview Fixture Expansion

Goal:
- Use test-only fixtures to understand cache replacement impact without production imports.

Exit criteria:
- Owner fixture includes add/update/keep/delete candidates.
- Staff fixture proves scoped replacement cannot affect outside-scope local records.
- Protected local records remain skipped.

### L5: Medium-Risk Lint Warning Review

Goal:
- Review `hooks/useSync.ts` `effectiveInfoLevel` dependency warning without changing behavior casually.

Exit criteria:
- Document whether adding the dependency changes sync callback identity or execution timing.
- Add or update audit tests before any hook change.

## 3. Current Recommendation

Continue with L1, L2, and L3 first.

Do not start Gate D until the user explicitly approves one narrow slice from `SYNC_GATE_D_PREFLIGHT_DECISION_PLAN.md`.
