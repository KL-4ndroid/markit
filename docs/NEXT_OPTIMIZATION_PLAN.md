# Next Optimization Plan

Last updated: 2026-05-26

## Progress

- Started Phase 1 route and loading guardrails.
- Hardened product detail routing with shared route-id normalization.
- Added missing-id protection to product card navigation.
- Started Phase 2 event deletion service extraction.
- Moved shared deal and interaction tombstone creation into `lib/markets/event-deletion-service.ts`.
- Replaced duplicated deletion logic in market detail and daily transaction log paths.
- Added focused deletion service tests for manual deals, product deals, missing event IDs, missing market IDs, and duplicate tombstones.

## Purpose

This plan captures the next round of stability work after the market detail loading hotfix. The goal is to prevent the same class of hidden bugs from reappearing in other routes, data fallbacks, recovery flows, and sync paths.

The recent incident showed a broader pattern: a visible card can come from one data source while the detail page uses another source or an unsafe route parameter. The next optimization pass should standardize these boundaries instead of fixing each page only after it breaks.

## Current Stability Assessment

The app is operational and the latest hotfix restores market detail navigation. Core data-safety work is much stronger than before, especially around backup validation, tombstones, stock checks, daily-stat repair, and import readiness.

Remaining risk is concentrated in:

- route parameter normalization,
- detail page loading boundaries,
- duplicated mutation logic,
- direct IndexedDB access from UI components,
- sync-state mutation complexity,
- legacy initialization behavior that can hide database failures,
- insufficient regression tests for UI-to-data flows.

## Highest-Risk Findings

### P0: Route ID and Detail Loading Consistency

#### Finding

`app/markets/[id]/page.tsx` was fixed by normalizing route params and preventing invalid values from reaching Dexie `Table.get()`. A similar pattern still exists in `app/products/[id]/page.tsx`, where `params.id` is used directly.

#### Risk

Invalid, delayed, or unexpected route params can cause:

- `Invalid argument to Table.get()`,
- permanent loading states,
- false not-found screens,
- broken detail pages after production bundling changes.

#### Plan

- Add a shared route-id helper for all detail pages.
- Update product detail to use the same route-id normalization as market detail.
- Add product detail fallback/loading tests.
- Ensure every detail page has three explicit states: loading, not found, found.

### P0: Visible List to Detail Page Contract

#### Finding

Market cards can render records from local IndexedDB or mapped Supabase data. Detail pages may query a different source or wait on fallback state.

#### Risk

Users can see a valid card but fail to open it.

#### Plan

- Define a "list item to detail" contract:
  - every card must have a non-empty string id,
  - card navigation must not fire with missing id,
  - detail pages must attempt the same local source before showing not-found,
  - remote fallback must be bounded and must not block local records.
- Add regression tests for:
  - local-only market detail,
  - owner market detail,
  - staff-accessible market detail,
  - missing/invalid id.

### P1: Large Page Files Hide Data Bugs

#### Finding

`app/markets/[id]/page.tsx` is the largest and riskiest file. It mixes:

- route handling,
- local and remote loading,
- status changes,
- market deletion,
- deal deletion,
- interaction loading,
- daily analytics filtering,
- modals and layout.

#### Risk

Small UI edits can accidentally change data behavior. Hidden loading bugs and duplicate mutation bugs are more likely.

#### Plan

- Extract market detail data loading into `lib/markets/market-detail-service.ts`.
- Extract market status mutations into `lib/markets/market-status-service.ts`.
- Extract deal/interaction deletion into `lib/markets/market-event-deletion-service.ts`.
- Keep the page mostly as UI orchestration.
- Add tests for the extracted services before replacing page logic.

### P1: Duplicate Deal and Interaction Deletion Logic

#### Finding

Deal deletion logic appears in both `app/markets/[id]/page.tsx` and `components/markets/DailyTransactionLog.tsx`. Both calculate cost, date, product sales, and tombstone payloads.

#### Risk

One path can reverse inventory or daily stats differently than another. This can silently corrupt analytics.

#### Plan

- Create one service function:
  - `deleteDealByEventId(eventId: string)`
  - `deleteInteractionByEventId(eventId: string)`
- Service should:
  - validate event id,
  - load the original event,
  - calculate reversal values,
  - record the tombstone event,
  - return a structured result for UI messages.
- Replace both UI call sites.
- Add tests for product deals, manual deals, missing events, and already-tombstoned events.

### P1: Direct Dexie Access From UI Components

#### Finding

Several UI files directly call `db.*.get/update/add/delete`, including market detail, daily transaction log, analytics, quick interaction, and sync-related flows.

#### Risk

UI components can accidentally bypass validation, route-id guards, tombstone rules, or service-level invariants.

#### Plan

- Introduce small service functions around high-risk reads and writes.
- Keep direct `db` access allowed in low-risk read-only analytics only after ID validation.
- Add `safeGetById(table, id)` style helpers or domain-specific helpers:
  - `getMarketByIdSafe`,
  - `getProductByIdSafe`,
  - `getEventByIdSafe`.
- Reject empty, array, null, or whitespace IDs before calling Dexie.

### P1: Database Initialization Still Has Legacy Behavior

#### Finding

`initializeDatabase()` still catches errors and may continue running. A safer `initializeDatabaseSafely()` exists, but adoption is incomplete.

#### Risk

Pages can keep operating while IndexedDB is unhealthy or partially initialized.

#### Plan

- Adopt `initializeDatabaseSafely()` in high-risk pages first:
  - market detail,
  - product detail,
  - markets page,
  - products page,
  - analytics page,
  - settings page.
- If initialization fails, route the user to recovery mode or show `DatabaseRecoveryPanel`.
- Keep legacy initializer only as a low-level compatibility wrapper.

### P1: Sync Event State Mutation Is Complex

#### Finding

`hooks/useSync.ts` updates event rows many times for sync status, actor ownership, retry behavior, local-only fallback, and RLS handling.

#### Risk

The event table is meant to be durable history, but sync metadata updates are mixed throughout a large hook. Although sync fields are operational metadata, this makes it harder to reason about immutability and recovery.

#### Plan

- Extract sync-status mutation helpers:
  - `markEventSynced`,
  - `markEventLocalOnly`,
  - `markEventSyncBlocked`,
  - `bindLocalActor`.
- Keep payload/history mutation forbidden.
- Add tests for sync-state transitions with preserved event payload.
- Consider moving sync attempts into a separate sync service.

### P2: Analytics and Recovery Need More Fixture Coverage

#### Finding

Current tests cover integrity and market detail loading logic, but not full realistic UI/data workflows.

#### Risk

Subtle analytics drift or legacy backup incompatibility may only appear in user data.

#### Plan

- Add fixtures for:
  - legacy backup with missing optional fields,
  - invalid dailyStats repaired by recovery,
  - market with multiple dates,
  - product sale followed by deal deletion,
  - staff-accessible market row.
- Add replay tests for:
  - market created -> product created -> deal closed -> deal deleted -> rebuild.
- Add import rollback tests.

## Recommended Execution Order

### Phase 1: Route and Loading Guardrails

Goal: eliminate this class of "card opens to loading/not-found" bugs.

Tasks:

1. Apply route-id normalization to product detail.
2. Add product detail loading helper/tests.
3. Add a shared card navigation guard pattern.
4. Add tests for invalid/empty route IDs.
5. Run full verification and deploy.

### Phase 2: Extract Event Deletion Services

Goal: one source of truth for deal and interaction deletion.

Tasks:

1. Create market event deletion service. Done.
2. Move duplicated cost/date/productsSold reversal logic into the service. Done.
3. Replace market detail deletion path. Done.
4. Replace daily transaction log deletion path. Done.
5. Add tests for manual deal, product deal, missing event, and duplicate tombstone. Done.

### Phase 3: Safe Detail Data Services

Goal: keep detail pages predictable and smaller.

Tasks:

1. Create market detail data service.
2. Create product detail data service.
3. Move local/Supabase fallback rules out of page components.
4. Add tests for local-only, owner, staff, and missing records.
5. Reduce page-level direct `db` usage.

### Phase 4: Safer Database Initialization Adoption

Goal: pages should not operate while IndexedDB is unhealthy.

Tasks:

1. Adopt `initializeDatabaseSafely()` in market/product detail pages.
2. Adopt it in list pages.
3. Show recovery panel or recovery link when initialization is unhealthy.
4. Add tests or manual QA steps for recovery-mode rendering.

### Phase 5: Sync Service Cleanup

Goal: make sync behavior easier to audit and less likely to mutate durable event history incorrectly.

Tasks:

1. Extract sync metadata helpers.
2. Replace repeated `db.events.update()` blocks.
3. Add tests for sync-status transitions.
4. Re-review RLS/RPC behavior after extraction.

### Phase 6: Legacy Fixture and Replay Confidence

Goal: move from "current tests pass" to "real user data is protected."

Tasks:

1. Add legacy backup fixtures.
2. Add import rollback tests.
3. Add replay lifecycle tests.
4. Add recovery repair tests.
5. Document user-facing recovery steps.

## Verification Standard

Run after each phase:

```bash
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
git diff --check
```

Run before dependency or deployment changes:

```bash
npm audit --omit=dev
npm run build
```

## Definition of Done

The next optimization project is complete when:

- market and product detail pages share safe route-id behavior,
- visible cards cannot navigate with invalid IDs,
- detail pages no longer rely on ambiguous loading/not-found states,
- deal and interaction deletion have one service implementation,
- high-risk pages use safe initialization behavior,
- direct Dexie access from UI is either removed or guarded,
- sync metadata transitions are centralized,
- legacy backup and replay fixtures are covered by tests,
- all verification commands pass.

## Suggested First Task

Product detail route-id hardening has been started as the first task because it is the closest sibling to the market detail bug:

1. Add `normalizeProductRouteId()` or reuse `normalizeMarketRouteId()` as a generic route helper.
2. Update `app/products/[id]/page.tsx`.
3. Add tests for product detail route loading.
4. Run full verification.
5. Deploy as a small isolated commit.
