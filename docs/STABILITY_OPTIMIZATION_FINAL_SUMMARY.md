# Stability Optimization Final Summary

Last updated: 2026-05-26

Status: Phase 3, Phase 4, and Phase 5 are complete. Phase 6 low-risk fixture coverage is partially complete.

Overall stability estimate: 90-92%.

## 1. Purpose

This document summarizes the stabilization work completed after the market detail loading and data-safety incidents.

The main goals were:

- Prevent invalid route IDs from reaching Dexie `Table.get()`.
- Keep detail pages from confusing loading, not-found, and database-unhealthy states.
- Move high-risk IndexedDB access and sync metadata updates behind small service boundaries.
- Protect event immutability by centralizing allowed sync metadata mutations.
- Add focused regression tests around recovery, event deletion, detail loading, and sync status updates.

This was not intended to be a full rewrite. The work intentionally avoided broad changes to database schema, event payload schema, Supabase RLS/RPC, and large event-handler refactors.

## 2. Completed Phases

### Phase 3: Safe Detail Data Services

Goal: make market and product detail pages predictable, and prevent malformed route IDs from causing Dexie runtime errors.

Key commits:

| Commit | Summary |
|---|---|
| `404c336` | `fix: harden product detail routing` |
| `e444012` | `fix: stabilize market detail loading` |
| `4247414` | `fix: stabilize product detail loading` |
| `33629c1` | `refactor: add market detail read service` |
| `62c36ec` | `refactor: add product detail read service` |
| `16fc049` | `test: cover detail read services` |
| `9d13371` | `test: cover market detail fallback decisions` |
| `377d550` | `fix: include market detail fallback refactor` |

Completed:

- Added `getMarketDetail()` in `lib/markets/detail-service.ts`.
- Added `getProductDetail()` in `lib/products/detail-service.ts`.
- Added route ID normalization and loading helpers.
- Added service tests to ensure blank IDs do not reach Dexie.
- Extracted market detail fallback decisions into testable helper logic.
- Prevented Supabase fallback from running before local DB initialization completes.

### Phase 4: Safer Database Initialization Adoption

Goal: high-risk pages should not continue normal read/write flows while IndexedDB is unhealthy.

Key commits:

| Commit | Summary |
|---|---|
| `1daa2b3` | `refactor: adopt safe init in product detail` |
| `4b47033` | `refactor: adopt safe init in market detail` |
| `fbaca7e` | `fix: prevent market fallback before db init` |
| `1d9cdc5` | `refactor: adopt safe init in products list` |
| `a9a7c01` | `refactor: adopt safe init in markets list` |
| `9722757` | `fix: adjust market list filters and ordering` |

Completed:

- Adopted `initializeDatabaseSafely()` in product detail, market detail, products list, and markets list.
- Added database-unhealthy UI states with recovery entry points.
- Blocked high-risk write actions when DB initialization fails.
- Prevented false "not found" or empty-list states when the local database is unhealthy.
- Adjusted market list behavior:
  - The `all` tab excludes ended markets.
  - The `all`, `pending`, `payment`, and `upcoming` tabs sort from nearest to farthest date.

### Phase 5: Sync Service Cleanup

Goal: centralize allowed event sync metadata updates and keep event history immutable.

Key commits:

| Commit | Summary |
|---|---|
| `415dce1` | `test: add event sync status service` |
| `932d6b8` | `refactor: use sync service for event status updates` |
| `a39cc94` | `refactor: use sync service for event actor binding` |
| `f472c18` | `refactor: use sync service for blocked events` |

Completed:

- Added `lib/sync/event-sync-service.ts`.
- Added helpers:
  - `markEventSynced`
  - `markEventLocalOnly`
  - `bindEventActor`
  - `markEventBlocked`
- Removed direct `db.events.update()` calls from `hooks/useSync.ts`.
- Kept Pull-direction `db.events.add()` calls unchanged, because they create newly downloaded events rather than mutate existing event history.
- Added tests proving sync helpers do not modify immutable event fields:
  - `id`
  - `type`
  - `payload`
  - `timestamp`
  - `market_id`

### Phase 6: Fixture Coverage

Goal: add focused fixture coverage around data repair and projection helper behavior without introducing a large new test framework.

Completed low-risk fixture work:

| Commit | Summary |
|---|---|
| `3a449d0` | `test: add recovery helper fixtures` |
| `c8c9930` | `test: add dailyStats repair fixture` |
| `cfb2a6d` | `test: add productsSold merge fixtures` |

Completed:

- Added tests for `normalizeProductsSold`, `toNonNegativeNumber`, and `toNumber`.
- Fixed `normalizeProductsSold` so whitespace-only `productId` values are rejected.
- Added a minimal `repairInvalidDailyStats()` fixture.
- Added tests for `mergeProductsSold` and `subtractProductsSold`.

Remaining Phase 6 items are intentionally deferred because they touch higher-risk replay and import paths.

## 3. Main Safety Improvements

| Area | Improvement |
|---|---|
| Route ID safety | Blank and invalid IDs are normalized before reaching Dexie detail reads. |
| Detail page stability | Market and product detail pages now distinguish loading, not-found, and DB-unhealthy states. |
| Database health | High-risk pages now use `initializeDatabaseSafely()` and expose recovery-oriented UI when initialization fails. |
| Event deletion | Deal and interaction deletion behavior is centralized and covered by focused tests. |
| Sync metadata | Sync status, actor binding, and blocked-event metadata are handled through `event-sync-service`. |
| Event immutability | Tests verify sync helpers do not mutate event identity, payload, type, timestamp, or market association. |
| Daily stats repair | Recovery helpers and a minimal dailyStats repair path now have regression coverage. |
| Products sold math | `mergeProductsSold` and `subtractProductsSold` are exported and covered by fixture tests. |

## 4. Test Coverage Added Or Preserved

Current test script runs these files:

| Test file | Coverage |
|---|---|
| `tests/integrity.test.ts` | Backup integrity, unsupported versions, tombstone validation, replay readiness warnings. |
| `tests/market-detail-loading.test.ts` | Detail loading and fallback decision helpers. |
| `tests/event-deletion-service.test.ts` | Deal deletion calculations and duplicate tombstone prevention. |
| `tests/detail-service.test.ts` | Blank ID rejection for market/product detail read services. |
| `tests/detail-fallback.test.ts` | Market detail fallback decision rules. |
| `tests/event-sync-service.test.ts` | Sync metadata helpers and immutable event fields. |
| `tests/recovery-helpers.test.ts` | Recovery numeric normalization and productsSold normalization. |
| `tests/daily-stats-repair.test.ts` | Minimal dirty dailyStats repair fixture. |
| `tests/products-sold-helpers.test.ts` | productsSold merge/subtract helper behavior. |

Current test count: 43 passing tests.

## 5. Current Stability Assessment

Estimated stability: 90-92%.

Why this is a reasonable estimate:

- The highest-risk user-facing breakage, detail pages stuck in loading or false not-found, has been addressed.
- Database-unhealthy states now have explicit UI and recovery paths on the highest-risk pages.
- Sync event metadata mutation has been centralized and tested.
- The most important low-risk recovery and productsSold helpers have fixture coverage.
- The app continues to pass tests, TypeScript, lint, and production build.

Remaining risk:

- Full `rebuildSnapshots()` replay fixture coverage is still deferred.
- Import rollback and rejected-import fixture coverage can still be improved.
- Supabase RLS/RPC behavior still needs validation against a real Supabase environment.
- There may still be UI/data race conditions not covered by current Node-based tests.

## 6. Deferred Tasks

These tasks are intentionally not part of this completed stabilization pass:

| Task | Reason to defer |
|---|---|
| Full `rebuildSnapshots()` replay fixture | High mock complexity; touches many event handlers and projection tables. |
| Product sale -> deal deletion -> rebuild end-to-end fixture | Valuable, but should be built only after smaller handler fixtures exist. |
| Import rollback / rejected import fixtures | Important, but needs careful design to avoid testing implementation details. |
| Supabase RLS/RPC hardening | Requires a real Supabase environment and policy-level verification. |
| Broad `lib/db/events.ts` refactor | High-risk core event system file; avoid large changes unless backed by dedicated tests. |

## 7. Recommended Future Order

Recommended if work resumes later:

1. Add import rejection / rollback fixtures that do not require heavy DB mocks.
2. Add single-handler projection tests before attempting full replay tests.
3. Add a small replay chain fixture:
   - `market_created`
   - `product_created`
   - `deal_closed`
4. Only after the above, add a full `rebuildSnapshots()` fixture with multiple event types.
5. Validate Supabase RLS/RPC flows in a real Supabase project.

## 8. Verification Commands

Run these before each commit:

```powershell
npm.cmd test
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected result for the current baseline:

| Command | Expected result |
|---|---|
| `npm.cmd test` | 43/43 PASS |
| `npx.cmd tsc --noEmit --incremental false` | pass |
| `npm.cmd run lint` | pass |
| `npm.cmd run build` | pass |
| `git diff --check` | pass |

Known acceptable build warning:

```text
Supabase environment variables are not configured, so collaboration features are disabled.
```

This warning is expected when local Supabase environment variables are not configured.

## 9. Important Notes

### `.git_commit_msg.txt`

The working tree may show `.git_commit_msg.txt` as deleted. Do not restore, stage, remove, or commit it unless the user explicitly asks.

### `rebuildSnapshots()` Fixture Risk

`rebuildSnapshots()` is a high-risk test target because it replays many event handlers and needs careful DB mocking.

Recommended breakdown:

1. Test pure helper behavior first. Completed for recovery helpers and productsSold helpers.
2. Test one handler's projection logic at a time.
3. Test a short event chain with two or three handlers.
4. Add full replay fixture only after the smaller tests are stable.

### Supabase RLS/RPC

Supabase access rules cannot be fully validated by local Node tests. RLS/RPC hardening should be tested against a real Supabase environment before being considered complete.

## 10. Baseline

Code stability baseline before documentation-only summary updates:

```text
cfb2a6d test: add productsSold merge fixtures
```

Documentation-only commits after this point do not change application behavior.
