# Engineering Fix Plan

Last updated: 2026-05-26

## Goals

- Keep the app deployable on Vercel.
- Preserve local user data during repair, sync, import, and account lifecycle operations.
- Keep events immutable enough to support replay, audit, backup, and future sync conflict handling.
- Normalize data between UI models, IndexedDB records, and Supabase rows.
- Convert hidden data corruption risks into explicit validation errors, repair actions, or tests.

## Completed Checklist

- [x] Make Supabase client safe when public env vars are missing.
- [x] Restrict destructive public repair tools to localhost.
- [x] Clear lint errors and hook dependency warnings.
- [x] Fix TypeScript validation errors.
- [x] Remove build-time type and lint ignore flags.
- [x] Add mapper layer for event payload and Supabase row normalization.
- [x] Adopt mappers in staff-accessible market/product query helpers.
- [x] Adopt mappers in snapshot and full-sync import paths.
- [x] Remove duplicated market replay conversion blocks from sync paths.
- [x] Harden staff invitation RLS/RPC behavior.
- [x] Remove destructive cloud-data deletion from legacy staff invitation acceptance.
- [x] Verify cloud events before clear-and-pull migration clears local IndexedDB.
- [x] Move full account data deletion into authenticated RPC flow before local cache clearing.
- [x] Move leave-team cleanup into authenticated RPC flow before local cache clearing.
- [x] Replace destructive 403 sync handling with temporary sync pause and local preservation.
- [x] Stop staff-view sync from deleting other users' local records during normal pull.
- [x] Add backup integrity validation before import replacement.
- [x] Create emergency backup before import replacement.
- [x] Normalize market/product create/update event payloads before persistence.
- [x] Prevent normal product-sale oversell by failing insufficient-stock transactions.
- [x] Update and reverse `dailyStats.productsSold`.
- [x] Route deal deletion through event-sourced tombstones.
- [x] Preserve original deal/interaction events and filter through tombstone-aware queries.
- [x] Add typed `EventPayloadMap`.
- [x] Add runtime payload validation before events are written.
- [x] Run integrity validation after snapshot rebuilds.
- [x] Fail projection handlers when update/delete targets are missing.
- [x] Add safe database initialization and integrity APIs for recovery mode.
- [x] Add deeper backup event payload validation.
- [x] Add reusable database recovery panel.
- [x] Add dedicated `/recovery` route.
- [x] Validate tombstone and deal product cross-event references.
- [x] Add guarded `dailyStats` numeric repair with pre-repair backup.
- [x] Normalize existing `dailyStats` numeric cache fields during deal projection updates.
- [x] Add automated tests for backup integrity and event reference validation.
- [x] Expand integrity tests for backup parsing, tombstone references, and replay warnings.
- [x] Add import-time replay-readiness checks.
- [x] Apply non-breaking transitive dependency audit fixes.
- [x] Remove unused `next-pwa` dependency.
- [x] Upgrade Next/lint tooling after verification.
- [x] Track remaining upstream `next`/`postcss` audit advisory.
- [x] Fix market detail loading so locally visible market cards can open even when Supabase role or fallback state is delayed.

## Remaining Checklist

- [ ] Add fixture backups from older app versions.
- [ ] Add a regression test or manual QA script for opening market detail pages from visible cards.
- [ ] Add full event replay tests for realistic market lifecycles.
- [ ] Add tests for import failure rollback behavior.
- [ ] Add tests for recovery repair backup creation.
- [ ] Add tests for Supabase row mapper edge cases.
- [ ] Extract high-risk page-level mutation flows into focused service helpers.
- [ ] Add user-facing recovery guidance for common integrity errors.
- [ ] Add developer support notes for reading recovery backup and integrity output.
- [ ] Review Supabase migrations/RLS after the next dependency and schema update.
- [ ] Re-run audit when a clean stable `next`/`postcss` patch path is available.

## Safe Work Order

### Phase 1: Documentation and Support Safety

1. Recreate the data-safety plan, engineering plan, and summary.
2. Add recovery guidance for users and developers.
3. Keep changes documentation-only unless verification exposes a bug.

### Phase 2: Test Coverage

1. Add legacy backup fixtures.
2. Test market-card to market-detail navigation with local-only, owner, and staff-accessible markets.
3. Test import validation and rollback behavior.
4. Test recovery numeric repair output.
5. Test realistic event replay from market creation through product sale, deletion, and rebuild.

### Phase 3: Service Extraction

1. Identify duplicated deal deletion and interaction deletion flows.
2. Extract small service functions for recording tombstone events.
3. Keep UI behavior unchanged.
4. Verify with TypeScript, tests, lint, and build.

### Phase 4: Sync and RLS Recheck

1. Review staff invitation and membership RPC migrations.
2. Review row mapper use in sync conflict handling.
3. Add mapper tests for nullable, legacy, and view-derived rows.
4. Confirm sync permission errors continue to preserve local data.

### Phase 5: Dependency and Deployment Hygiene

1. Check `npm audit --omit=dev`.
2. Upgrade only when there is a clean compatible patch path.
3. Run the full verification suite before deploying.

## Verification Commands

```bash
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
git diff --check
```

For dependency/security review:

```bash
npm audit --omit=dev
```

## Definition of 100% for This Plan

This plan is complete when:

- Existing data-safety fixes are documented.
- Recovery behavior is understandable to users and developers.
- Legacy backup fixtures cover known old shapes.
- Event replay tests cover the core market lifecycle.
- Import, repair, rebuild, and tombstone behavior are tested.
- High-risk duplicate mutation logic is extracted or clearly contained.
- Verification commands pass.
- Remaining dependency advisories are either patched or explicitly tracked with a reason.
