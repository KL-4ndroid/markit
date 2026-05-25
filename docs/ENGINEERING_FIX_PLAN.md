# Engineering Fix Plan

Last updated: 2026-05-25

## Goals

- Keep production builds deployable on Vercel.
- Restore TypeScript as a useful safety net before re-enabling build-time type checks.
- Reduce public attack surface from debug and repair utilities.
- Normalize client, local Dexie, and Supabase data shapes without changing user data semantics.

## Checklist

- [x] Make Supabase client safe when public env vars are missing.
- [x] Restrict destructive public repair tools to localhost.
- [x] Clear current lint errors and hook dependency warnings.
- [x] Fix remaining `tsc --noEmit --incremental false` errors.
- [x] Add the first mapper layer for event payload and row normalization.
- [x] Adopt mappers in staff-accessible market/product query helpers.
- [x] Adopt mappers in snapshot and full-sync import paths.
- [x] Remove duplicated market update replay conversion blocks from sync.
- [x] Use shared mappers for staff market detail loading and full-sync import row shaping.
- [x] Replace remaining high-risk ad hoc camelCase/snake_case handling in sync conflicts and event payload rewriting.
- [x] Harden staff invitation RLS and RPC functions.
- [x] Remove cloud-data deletion from legacy staff invitation acceptance flow.
- [x] Make clear-and-pull migration verify cloud events before clearing local IndexedDB.
- [x] Add atomic token invitation RPC migration that also grants market membership.
- [x] Move full app-data deletion into a single authenticated RPC before local cache clearing.
- [x] Move leave-team cleanup into a single authenticated RPC before local cache clearing.
- [x] Replace destructive 403 sync handling with temporary sync pause and local-data preservation.
- [x] Stop staff-view sync from automatically deleting other users' local data.
- [x] Add backup integrity validation and emergency backup creation before `importData()` replaces local data.
- [x] Move market/product create/update event normalization before insert so projection handlers no longer mutate those events.
- [x] Prevent normal `deal_closed` handlers from silently clamping oversold stock to zero.
- [x] Update `dailyStats.productsSold` for product deals and reverse it for event-sourced deal deletion.
- [x] Route market-detail deal deletion through the event-sourced `deal_deleted` handler.
- [x] Preserve original deal/interaction events and filter deleted records through tombstone-aware queries.
- [x] Add a typed `EventPayloadMap` so literal `recordEvent()` calls are checked against their event payload shape.
- [x] Add lightweight runtime payload validation before events are written to IndexedDB.
- [x] Run integrity validation after snapshot rebuilds so inconsistent projections fail fast.
- [x] Fail projection handlers when market/product update or delete targets are missing.
- [x] Add safe database initialization/integrity APIs for recovery-mode adoption.
- [x] Deepen backup event payload validation before import replacement.
- [x] Add a reusable database recovery panel for integrity check, retry, and rescue backup flows.
- [x] Add a dedicated `/recovery` route for database repair and rescue backup workflows.
- [x] Validate cross-event references for tombstones and deal product items during integrity checks.
- [x] Add guarded dailyStats numeric repair with automatic pre-repair backup.
- [x] Normalize existing dailyStats numeric cache fields during deal projection updates.
- [x] Add initial automated tests for backup integrity and event reference validation.
- [x] Apply non-breaking transitive dependency audit fixes.
- [x] Remove unused `next-pwa` dependency and upgrade `next`/ESLint after build verification.
- [x] Track remaining upstream `next`/`postcss` audit advisory until a clean patched release is available.
- [x] Remove `ignoreBuildErrors` and `ignoreDuringBuilds` after type/lint checks are clean.

## Work Order

1. **Build safety**
   - Keep `npm run build` green.
   - Avoid schema changes during build-safety fixes.

2. **Type safety**
   - Fix obvious component prop and union typing errors.
   - Fix data model naming drift such as `updated_at` vs `updatedAt`.
   - Only remove build ignore flags after `tsc` is green.

3. **Security**
   - Narrow invitation token access to RPC-only verification.
   - Use `auth.uid()` inside invitation binding RPC instead of trusting a client-supplied staff id.
   - Keep debug tools local-only or remove them from production assets.

4. **Data normalization**
   - Create a single mapper layer for Supabase rows and Dexie models.
   - Normalize event payloads before persistence and sync.
   - Expand mapper adoption into remaining high-risk import, replay, conflict, and event payload rewrite paths.
   - Add focused tests around event creation, sync payloads, and analytics cache invalidation.

## Verification Commands

```bash
npm run build
npm run lint
npm test
npx tsc --noEmit --incremental false
npm audit --omit=dev
```
