# Féria Recurring Hybrid Operations — Implementation Report v1.1

Date: 2026-08-14
Source specification: `docs/FERIA_RECURRING_HYBRID_OPERATIONS_IMPLEMENTATION_SPEC_v1.1.md`

## Outcome

RHO-0 through RHO-7 are implemented for the v1.1 scope. The feature preserves the existing one-time Market flow while adding an Owner-only fixed-operation workflow that materializes ordinary compatibility Markets. Shared recurrence, identity, reconciliation, validation, and lifecycle orchestration remain platform-neutral.

## Delivered slices

| Slice | Status | Evidence |
|---|---|---|
| RHO-0 impact audit | Complete | Architecture impact audit records event, sync, role, backup, and cross-platform boundaries. |
| RHO-1 pure domain | Complete | Weekly recurrence, timezone-safe date keys, deterministic UUID v5 identity, reconciliation planner, validation. |
| RHO-2 local data | Complete | Dexie v8, Venue/Schedule projections, compatible Market fields, replay, Backup v2 and legacy v1 import. |
| RHO-3 remote schema | Complete | Migrations 069 and 070, read-only verifiers, production apply runbooks. Both verifier summaries were returned as ready by the operator. |
| RHO-4 Owner UX | Complete | One `新增營業` entry, one-time/fixed chooser, progressive fixed form, fixed-arrangement management, fail-closed Owner boundary. |
| RHO-5 materialization | Complete | Owner hydration/foreground orchestration, 56-day horizon, deterministic Market/event IDs, unified Today/Upcoming, one-tap start, schedule-specific labels. |
| RHO-6 exceptions/revisions | Complete | Skip once, restore once, single override, future revision, pause/resume/archive reconciliation, activity protection, deterministic revision events. |
| RHO-7 verification | Complete | Focused tests, repository test suite, lint, Web build, mobile typecheck/build/static verification, responsive matrix. |

## User-facing complexity controls

- Existing one-time users still enter through `新增營業 → 單次營業`; no onboarding or additional required fields were added.
- Fixed operations are optional and begin with only venue, weekdays, time, and date range.
- Fees, equipment defaults, and notes stay behind `更多預設`.
- Today and Upcoming show ordinary operating language plus a low-emphasis `固定` tag; Venue, Schedule, occurrence, revision, and materialization terminology are not exposed.
- Editing a generated occurrence asks only `只修改這一次` or `從這次開始都修改`.
- A future skipped occurrence offers `恢復這一次`; it reuses the same Market identity and returns to Today/Upcoming without creating a duplicate.
- Pause, resume, and archive remain on the fixed-arrangement management page instead of the primary Today workflow.

## Safety properties

- Materialization is Owner-only and requires fresh resolved authorization at its lifecycle trigger.
- Staff never create future occurrences; they operate only already-materialized Markets according to existing Market capabilities.
- Same owner, schedule, and local date always derive the same occurrence key, Market ID, and generated create-event ID.
- Skipped, suppressed, and rule-removed occurrences remain stored and cannot be recreated as duplicates.
- Restoring is allowed only while the parent schedule is active, the date has not passed, the date still matches the current rule, and no user activity exists.
- Ongoing, completed, single-overridden, or user-active Markets are not rewritten by schedule reconciliation.
- Remote Owner/RLS enforcement is covered by migration 070 in addition to UI and local fail-closed checks.
- Shared orchestration uses `LifecyclePort`; shared domain modules do not depend on browser or Capacitor globals.

## Operator-applied database evidence

Migration 069 verification reported:

- `rls_ready`, `tables_ready`, `event_check_ready`, and `projection_trigger_ready`: true
- six Owner policies present
- duplicate occurrence count: zero
- unique occurrence index ready
- all seven Staff compatibility fields present
- schedule/Venue owner mismatch count: zero

Migration 070 verification reported:

- event guard trigger and Owner guard function ready
- three guarded Venue policies and three guarded Schedule policies
- restrictive event policy ready
- existing Market event policy preserved

## Verification record

Passed during implementation:

- all focused recurring-operation tests listed by RHO-1 through RHO-6
- `npm.cmd test`
- `npm.cmd run lint`
- `npm.cmd run build`
- `npx.cmd tsc --noEmit --project tsconfig.mobile.json`
- `npm.cmd run build:mobile`
- `npm.cmd run verify:mobile`
- `git diff --check`

Responsive browser checks:

- 390 × 844
- 768 × 1024
- 1440 × 900
- 720 × 450 CSS viewport as the 200% desktop-zoom equivalent

All checked views had no horizontal document overflow. The fixed form retained its visible 44px primary action at the 200% equivalent viewport, and browser logs contained no errors.

## Intentional v1.1 limits

- An Owner must open or foreground the app often enough to extend the rolling eight-week horizon.
- No server cron, background worker, Staff materialization authority, monthly/RRULE recurrence, natural-language parsing, new paywall, analytics expansion, Capacitor dependency, native project, or native store adapter was introduced.
- Web recurring checkout and ECPay runtime remain outside this native-first product priority.

## Operational handoff

No additional production mutation is pending for this implementation. Keep the 069 and 070 verifier outputs with the release evidence. If a future environment has not applied them, follow the two recurring-operation runbooks and stop for operator execution before enabling the runtime there.
