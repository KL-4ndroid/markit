# Recurring Hybrid Operations Impact Audit

- Date: 2026-08-14
- Branch: `main`
- Audited HEAD: `77a80a3 feat(analytics): complete UX-R5 reporting workspace`
- Scope: RHO-0 read-only impact audit for `FERIA_RECURRING_HYBRID_OPERATIONS_IMPLEMENTATION_SPEC_v1.1.md`
- Production behavior changed by this audit: no

## 1. Worktree boundary

The repository was aligned with `origin/main` at audit time. The following pre-existing user work is outside recurring-operations scope and must not be overwritten, staged, or included in a recurring-operations commit:

- `components/demo/FormalDemoApp.tsx`
- `lib/demo/formal-demo-data.ts`
- `tests/formal-demo.test.ts`
- `landing-page-screenshots/`
- `public/demo/`

The untracked v1.1 implementation specification is the approved source for this work.

## 2. Current architecture

### Market lifecycle

`MarketStatus` is currently:

```text
registered -> accepted -> paid -> ongoing -> completed
                         \-> postponed / cancelled
```

`market_created` always projects an initial `registered` Market. `market_started` changes the snapshot to `ongoing`; `market_ended` changes it to `completed`. `lib/markets/market-operating-session.ts` currently treats `paid` and `ongoing` as the ready states for live operation.

Recurring operations must therefore not introduce a second `planned / active / closed` status union. A schedule-origin Market needs a narrow start-eligibility rule and presentation override while keeping the existing stored lifecycle.

### Event sourcing and projections

- `types/db.ts` defines the canonical event union and payload map.
- `lib/db/events.ts` validates payloads, writes an immutable local event, and applies the snapshot handler in one Dexie transaction.
- The caller may provide a deterministic event ID to `recordEvent()`.
- `market_created` accepts `market_id` or `marketId` in its payload and otherwise generates a UUID.
- `rebuildSnapshots()` clears Market/Product/DailyStats snapshots and replays events in timestamp order.
- Current event transactions only include `events`, `markets`, `products`, and `dailyStats`.

Venue and OperationSchedule can follow the existing event-plus-projection pattern without changing `market_id`. Replay and transaction table lists must be extended additively.

### Dexie, backup, import, and recovery

- Current Dexie version: 7.
- Current primary tables include events, markets, products, dailyStats, settings, syncQueue, photo-evidence pending tables, and product-photo pending tables.
- Current backup type contains only events, markets, products, dailyStats, and settings.
- Current supported backup versions: version 1 only.
- Import replacement and post-import reads enumerate tables explicitly.
- Integrity validation keeps its own event-type allow-list.

RHO-2 must add version 8 only if version 7 remains current, add `venues` and `operationSchedules`, export backup v2, continue accepting v1 as empty Venue/Schedule collections, and extend all explicit transaction/snapshot/integrity lists. This does not authorize a new user-facing local-backup recovery path; recovery remains cloud-rebuild-first.

### Owner and Staff synchronization

- Owner push uploads unsynced events to `public.events`; an existing event ID or PostgreSQL `23505` is treated idempotently.
- Owner pull reads events incrementally, hydrates referenced Market projections, skips existing IDs, and applies local event handlers.
- Owner event access includes Market-scoped events and the owner's global events.
- Staff pull reads `staff_accessible_markets`, `staff_accessible_products`, and `staff_accessible_events`, then writes a sanitized local cache.
- Staff event preflight and projection sanitization protect partial-scope replay.
- Staff devices do not currently have an owner-global settings projection suitable for Schedule management.

The v1.1 owner-only materializer is compatible with this shape: Venue/Schedule events can remain owner-global, while Staff receive only materialized Market rows and Market-scoped events. Owner pull needs Venue/Schedule replay support, but Staff pull must not import owner-only Schedule defaults.

### Supabase and RLS

- Latest numbered migration at audit time: `068_add_daily_market_operation_sessions.sql`.
- `public.events` has an explicit event-type CHECK constraint maintained by migrations.
- Market snapshot projection is trigger-driven.
- `staff_accessible_markets` explicitly enumerates columns and preserves financial redaction.
- Migration 068 added `operation_session_date` and rebuilt the Staff Market view.

The next migration is 069 if no newer numbered migration appears. It needs additive Venue/Schedule tables, owner-only policies, Market compatibility columns, deterministic occurrence uniqueness, event constraint/projection updates, and a rebuilt Staff Market view with the new non-sensitive Market compatibility fields. Production application remains a manual stop gate.

### Permissions

- `RoleCapabilities` does not define Schedule management.
- Manager can edit a narrow allow-list of Market fields through `canEditMarketBasic`.
- Owner-only events are explicitly blocked for Staff by role-freshness enforcement.
- Unresolved or stale role behavior remains fail closed for privileged Staff writes.
- Permission source documents are `docs/staff-role-permissions.md` and `docs/staff-role-matrix.md`.

RHO-3/RHO-4 must preserve Owner-only Venue/Schedule management. New Venue/Schedule event types must be added to the Staff owner-only event set. They must not be mapped to `canEditMarketBasic`.

### Today, Upcoming, and operating UI

- `lib/home/today-view-model.ts` already unifies today's Markets and future Markets.
- It filters deleted/cancelled Markets and excludes completed Markets from Upcoming.
- `lib/markets/market-operating-session.ts` owns time-window and daily-operation resolution.
- `app/page.tsx` consumes the shared Today view model.
- Add/edit forms already put required Market fields before optional cost/equipment detail.

Recurring Markets can reuse this UI architecture by adding occurrence-state filtering and schedule-origin action copy to shared view models. Shared recurrence and eligibility logic must remain outside React components.

### Analytics and subscription

- Analytics already consumes Market/DailyStats/Event data across many Market-based modules.
- Existing totals and financial formulas depend on the current Market projection.
- `core.market_operations` is included for all plans.
- `analytics.advanced` already exists as the future comparison entitlement.

The MVP does not change analytics formulas, add a new plan capability, or add a Session/Schedule count limit. Schedule fields may be carried on Market projections for future grouping, but runtime comparison UI is deferred.

### Cross-platform boundary

Recurrence calculation, deterministic IDs, validation, reconciliation, event payloads, materialization planning, and view-model decisions can be platform-neutral. Foreground/network triggers must reuse existing lifecycle/network ports. No Capacitor package, native project, browser-only shared-domain dependency, server cron, or background worker is required for the MVP.

## 3. Affected file map

### RHO-1: new shared domain

- `lib/recurring-operations/*`
- `tests/recurring-operations-*.test.ts`

### RHO-2: local data and replay

- `types/db.ts`
- `lib/db/index.ts`
- `lib/db/events.ts`
- `lib/db/integrity.ts`
- `lib/db/hooks.ts` or a focused recurring repository
- `lib/db/exports.ts`
- import/recovery snapshot helpers that explicitly enumerate tables

### RHO-3: remote contract

- `supabase/migrations/069_*.sql` or the next free number
- `lib/data-mappers.ts`
- `lib/sync/sync-push-service.ts`
- `lib/sync/owner-pull-service.ts`
- `lib/sync/staff-pull-service.ts` only if Market columns need explicit handling
- `lib/sync/local-cache-writer.ts`
- `lib/permissions/role-freshness.ts`
- permission distribution Markdown files
- new verification SQL/runbook

### RHO-4 to RHO-6: user experience and orchestration

- `app/markets/page.tsx`
- a new owner-only recurring-operations route or dialog
- `components/markets/AddMarketForm.tsx` only at the entry boundary; existing single-Market fields stay intact
- `app/page.tsx`
- `lib/home/today-view-model.ts`
- `lib/markets/market-operating-session.ts`
- focused schedule-management components/hooks/services

### Explicitly deferred

- `lib/analytics/*`
- `components/analytics/*`
- subscription feature-code additions
- permanent onboarding/business-type storage
- Manager Schedule capability
- server cron/background workers
- native adapters/projects

## 4. Direct status assumptions requiring focused review

The following files contain direct Market status or lifecycle assumptions and must be reviewed before schedule-origin runtime wiring:

- `components/markets/MarketDetailScreen.tsx`
- `components/markets/MarketCard.tsx`
- `components/markets/DailyRevenueStats.tsx`
- `lib/markets/market-operating-session.ts`
- `lib/markets/market-list-view-model.ts`
- `lib/home/today-view-model.ts`
- `lib/db/hooks.ts`
- `app/analytics/page.tsx`
- `lib/analytics/insight-quality.ts`
- `lib/analytics/market-trend.ts`
- `lib/analytics/recent-market-revenue-preview.ts`
- `lib/export-utils.ts`

Only the minimum schedule-origin behavior may change in the MVP. Manual/legacy behavior and analytics formulas remain unchanged.

## 5. Test impact

Required new coverage:

- weekly recurrence and calendar-date boundaries
- deterministic Market and generated-event IDs
- cross-midnight identity
- reconciliation preservation rules
- Dexie v7-to-v8 additive migration
- event replay and backup v1/v2
- remote/RLS static contract
- two-device idempotency
- Today/Upcoming schedule-state filtering
- one-tap start limited to scheduled Markets
- skip/override/revision/pause/resume/history immutability
- Owner-only Schedule UI and Staff fail-closed behavior
- shared-platform import boundary

Existing high-value regression tests include Today view, Market operating session, event handlers, integrity, import rejection, role capabilities/freshness, Staff route gates, sync flow, mobile route discovery, and mobile static-output verification.

## 6. Risk register

| Priority | Risk | Mitigation / gate |
|---|---|---|
| P0 | Two offline devices generate different Market IDs for one occurrence | UUID v5 from owner/schedule/local-date plus deterministic event IDs and remote unique index |
| P0 | Schedule reconcile overwrites business history | Pure reconciliation plan; preserve ongoing/completed/override/any-activity Markets |
| P0 | Staff gains Schedule-management authority | Owner-only events, RLS, route/UI guards; no new Staff capability |
| P0 | Backup/import/replay loses new tables | Backup v2 with v1 compatibility; explicit transaction and integrity coverage |
| P1 | `Session` conflicts with `operationSessionDate` | Use Market compatibility, ScheduleOccurrence, and OperatingDayState terminology |
| P1 | Scheduled Market appears as a fake application workflow | Keep stored status compatible; hide application progress for schedule-origin Markets only |
| P1 | Staff pull imports sensitive Schedule defaults | Do not expose Venue/Schedule management rows to Staff; expose sanitized Market snapshots only |
| P1 | Timezone conversion shifts occurrence dates | Calendar-date helpers with explicit IANA timezone; no bare UTC parsing |
| P2 | Optional settings increase learning cost | Single/fixed choice at entry; required-first form; progressive disclosure |
| P2 | Feature scope expands into analytics/onboarding/cron | Keep deferred slices out of RHO-0..RHO-7 |

## 7. Divergence from v1.0

- No mandatory onboarding in the MVP.
- Schedule management is Owner-only.
- Analytics runtime dimensions are deferred.
- The execution is sliced and gated rather than one uninterrupted S0-S10 mutation.
- Deterministic Market/event identities are required, not optional implementation detail.
- Existing MarketStatus remains canonical; `planned / active / closed` is not added.
- Staff do not materialize occurrences.
- Production migration/RLS application is a manual stop gate.

## 8. RHO-0 gate result

No STOP CONDITION was found in the read-only audit. The current architecture can support the v1.1 MVP through additive types, tables, events, projection fields, sync contracts, and shared view-model changes without a Market rename, second transaction system, role expansion, financial-formula change, browser-only shared-domain dependency, or destructive migration.

RHO-1 may proceed.
