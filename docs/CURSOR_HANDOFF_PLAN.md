# Cursor Handoff Plan

Last updated: 2026-05-26

This file is the handoff guide for continuing the 出攤本 BoothBook / markit stability work in Cursor with Claude Opus.

The goal is not to rewrite the app. The goal is to continue the current stabilization plan safely, in small verified steps, without causing data loss or breaking Vercel deployment.

## First Message To Paste Into Cursor

Use this prompt when starting a new Cursor session:

```text
You are continuing stabilization work on KL-4ndroid/markit.

Before editing code, read these files:
- docs/NEXT_OPTIMIZATION_PLAN.md
- docs/DATA_SAFETY_REVIEW_PLAN.md
- docs/ENGINEERING_FIX_PLAN.md
- docs/ENGINEERING_FIX_SUMMARY.md
- docs/CURSOR_HANDOFF_PLAN.md

Important project context:
- This is an offline-first Next.js app using Dexie / IndexedDB.
- User data safety is the highest priority.
- Do not rewrite large files.
- Do not change unrelated UI or copy.
- Do not touch unrelated working tree changes, especially `.git_commit_msg.txt` if it appears deleted.
- Keep events immutable except operational sync metadata where the existing plan explicitly allows it.
- Every change must be small, testable, and reversible.
- Prefer domain services under `lib/markets`, `lib/products`, `lib/db`, or `lib/supabase` over direct `db.*` calls inside page components.
- After each small step, run verification before committing.

Current stable baseline already pushed to GitHub:
- Route ID guardrails for market and product detail pages.
- Market detail loading regression fix.
- Product detail loading guard fix.
- Deal / interaction deletion service extraction.
- Event deletion service tests.
- Market and product detail read services:
  - `lib/markets/detail-service.ts`
  - `lib/products/detail-service.ts`
- Detail read service tests:
  - `tests/detail-service.test.ts`

Your job:
Continue the remaining tasks from `docs/NEXT_OPTIMIZATION_PLAN.md` in the safest order. Do only one small phase at a time. Before each phase, explain the intended change. After each phase, run tests, TypeScript, lint, and build. If anything fails, fix it before moving on.
```

## Mandatory Working Rules

1. Start every session with:

```powershell
git status -sb
git pull --ff-only
```

2. If `.git_commit_msg.txt` appears as deleted, leave it alone unless the user explicitly asks to restore or remove it.

3. Never use destructive git commands:

```powershell
git reset --hard
git checkout -- .
git clean -fd
```

4. Make one narrow change per commit.

5. Do not combine refactor, UI redesign, dependency upgrade, and business logic changes in the same commit.

6. For each change, run:

```powershell
npm.cmd test
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run build
git diff --check
```

7. If `npm` is blocked by PowerShell execution policy, use `npm.cmd`.

8. Build may show this warning, which is currently acceptable unless the task is Supabase deployment setup:

```text
Supabase 環境變數未設置，多人協作功能將無法使用
```

9. Commit only files related to the current task:

```powershell
git add -- <specific files>
git commit -m "<clear message>"
git push origin main
```

## Current Remaining Work

### Phase 3: Safe Detail Data Services

Status: partially complete.

Already done:
- Product detail uses `getProductDetail()`.
- Market detail uses `getMarketDetail()`.
- Blank ID service tests exist.

Remaining recommended steps:

1. Extract market detail fallback rules from `app/markets/[id]/page.tsx` into a small service/helper.
   - Keep behavior identical.
   - Start with pure functions only.
   - Good target file:
     - `lib/markets/detail-fallback.ts`

2. Add tests for the fallback decision logic.
   - Local record exists: do not block on Supabase fallback.
   - No local record, authenticated user, fallback not tried: wait for fallback.
   - Fallback tried and no market: allow not-found.
   - Invalid or blank ID: do not query Dexie.

3. Reduce direct `db.*` access from high-risk page components only.
   - Start with detail pages and transaction flows.
   - Do not mass-rewrite analytics/debug files.

Definition of done:
- Market and product detail pages have predictable loading, found, and not-found states.
- No invalid route ID can reach Dexie `Table.get()`.
- Tests cover the helper/service behavior.

### Phase 4: Safer Database Initialization Adoption

Status: not started.

Recommended order:

1. Inspect existing safe initializer:
   - `initializeDatabaseSafely()`
   - `DatabaseRecoveryPanel`
   - recovery page/components

2. Adopt safe initialization in product detail first.
   - Smallest surface.
   - On failure, show a clear recovery-oriented state.
   - Do not allow edit/delete actions while DB is unhealthy.

3. Then adopt in market detail.
   - Higher risk because it has local + Supabase fallback.
   - Preserve current behavior for normal healthy DB state.

4. Then adopt in list pages:
   - `app/markets/page.tsx`
   - `app/products/page.tsx`

Definition of done:
- High-risk pages do not continue normal write operations if IndexedDB initialization fails.
- The user can navigate to recovery or export backup when possible.
- Existing build and tests pass.

### Phase 5: Sync Service Cleanup

Status: not started.

This phase is riskier. Do not start until Phase 3 and Phase 4 are stable.

Recommended steps:

1. Inspect `hooks/useSync.ts` and current event sync metadata fields.

2. Extract small sync state helpers:
   - `markEventSynced`
   - `markEventLocalOnly`
   - `markEventSyncBlocked`
   - `bindLocalActor`

3. Add tests that verify:
   - payload is not changed,
   - event type is not changed,
   - timestamp is not changed,
   - only sync metadata fields are updated.

Definition of done:
- Sync metadata mutation is centralized.
- Event payload/history mutation remains forbidden.

### Phase 6: Fixture Coverage

Status: partially started through existing tests.

Add focused tests for:
- legacy backup with missing optional fields,
- invalid `dailyStats` repaired by recovery,
- product sale followed by deal deletion followed by rebuild,
- local-only market detail,
- staff-accessible market row,
- import rollback / rejected import.

Do not create broad end-to-end tests unless the app already has a test framework for them.

## High-Risk Areas To Avoid Changing Casually

Avoid large rewrites in:

- `lib/db/events.ts`
- `lib/db/index.ts`
- `app/markets/[id]/page.tsx`
- `hooks/useSync.ts`
- import/export/recovery code

If a change is needed in these files:
- make the smallest possible edit,
- add or update a focused test,
- run the full verification suite,
- commit separately.

## Data Safety Principles

1. Events are the durable source of truth.

2. Handlers may update projections/snapshots:
   - `markets`
   - `products`
   - `dailyStats`
   - `settings`

3. Handlers should not rewrite event payloads after creation.

4. Backup import must validate before replacing current data.

5. Recovery tools should prefer repair and export over destructive reset.

6. UI components should not bypass service-level validation for mutations.

7. Empty, whitespace, array, null, or undefined IDs must be rejected before Dexie `Table.get()`.

## Suggested Commit Sequence

Use this order unless the user reports a production bug:

1. `refactor: extract market detail fallback decisions`
2. `test: cover market detail fallback decisions`
3. `refactor: adopt safe init in product detail`
4. `refactor: adopt safe init in market detail`
5. `refactor: adopt safe init in list pages`
6. `refactor: centralize sync event status updates`
7. `test: cover sync metadata updates`
8. `test: add recovery and replay fixtures`

Each commit should pass:

```powershell
npm.cmd test
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint
npm.cmd run build
git diff --check
```

## When To Stop And Ask The User

Stop and ask before continuing if:

- Vercel build fails and the fix requires changing package versions.
- A database migration must be changed.
- A recovery/import path may delete or replace user data.
- Supabase RLS/RPC behavior is unclear.
- Tests require adding a new framework.
- A change touches more than 8 to 10 files.
- A file appears heavily modified by the user.

## Final Report Format For Cursor

After each completed phase, report:

```text
Completed:
- ...

Verification:
- npm.cmd test: pass
- npx.cmd tsc --noEmit --incremental false: pass
- npm.cmd run lint: pass
- npm.cmd run build: pass

Pushed:
- commit hash and message

Remaining:
- ...

Risk:
- ...
```

Keep the report short and factual.
