# Engineering Fix Summary

Last updated: 2026-05-26

## Current Status

Féria has completed the main data-safety hardening pass. The app now has stronger event typing, safer import behavior, recovery-mode tooling, tombstone-based deletion, daily-stat repair support, and more conservative sync behavior.

The project is in a substantially safer state than the original review target. The remaining work is mainly test depth, legacy fixture coverage, support documentation, and careful extraction of complex page-level mutation logic.

## What Changed

### Build and Type Safety

- TypeScript and lint validation were restored as meaningful checks.
- Build-time ignore flags were removed.
- The app was verified after Next/lint dependency updates.
- Unused PWA dependency cleanup was completed.

### Data Normalization

- A shared mapper layer now handles key row and event payload normalization.
- Supabase market/product helpers use shared mappers.
- Snapshot and full-sync import paths use shared normalization.
- Several duplicated camelCase/snake_case conversion blocks were removed.

### Event Safety

- `EventPayloadMap` now gives event-specific TypeScript payload checks.
- Runtime payload validation catches malformed events before persistence.
- Market/product create/update events are normalized before insertion.
- Projection handlers no longer need to rewrite core event rows for those flows.
- Snapshot rebuilds now run integrity validation after replay.
- Projection handlers fail when expected update/delete targets are missing.

### Import and Recovery Safety

- Backup import validates required tables, supported versions, duplicate IDs, dates, references, numeric fields, and event payloads before replacement.
- Import creates an emergency backup before replacing local data.
- Import performs replay-readiness checks before replacement.
- `/recovery` provides a dedicated repair workflow.
- Recovery mode can create rescue backups, check integrity, retry database initialization, and repair invalid `dailyStats` numeric cache fields.

### Sales and Analytics Consistency

- Normal finite-stock product sales fail on insufficient stock instead of silently clamping inventory to zero.
- Product sales update `dailyStats.productsSold`.
- Event-sourced deal deletion reverses product-sale stats.
- Existing invalid daily-stat numeric cache values are sanitized during projection updates.
- Custom interaction stats are tracked through `extraInteractions`.

### Tombstone-Based Deletion

- Deal and interaction deletion now preserve original event rows.
- `deal_deleted` and `interaction_deleted` act as tombstones.
- Main views and analytics paths filter tombstoned events.
- Integrity checks validate tombstone references, self-references, duplicate tombstones, and replay order.

### Staff and Sync Safety

- Staff invitation flows were hardened through RPC/RLS changes.
- Legacy staff invitation acceptance no longer deletes cloud personal data.
- Clear-and-pull migration verifies cloud events before clearing local IndexedDB.
- Full account deletion and leave-team cleanup run through authenticated RPCs before local cache clearing.
- Sync permission errors pause sync and preserve local data instead of deleting collaborative records.
- Staff-view sync no longer deletes other users' local records during normal pull.

### Market Detail Navigation

- Market detail loading now performs an explicit local IndexedDB lookup before showing the not-found state.
- Detail pages now prefer Supabase data when available, but fall back to the local market record so cards that are visible on the home or markets page can still open.
- Market cards now guard against missing IDs instead of navigating to `/markets/undefined`.

### Automated Tests

- Backup parsing and unsupported backup versions are covered.
- Invalid `dailyStats` numeric cache values are covered.
- Invalid tombstone references and self-tombstones are covered.
- Deal item references to missing products are covered.
- Replay-readiness checks cover out-of-order tombstones, duplicate tombstones, and deleted product sales.

## Known Remaining Work

- Add real legacy backup fixtures.
- Add a regression test or manual QA script for opening market detail pages from visible cards.
- Add full event replay tests for realistic market lifecycles.
- Add import rollback tests.
- Add recovery repair backup tests.
- Add mapper tests for Supabase nullable/view-derived rows.
- Add user-facing recovery documentation.
- Add developer support notes for interpreting recovery errors.
- Extract repeated page-level mutation orchestration into service helpers.
- Continue tracking upstream `next`/`postcss` audit advisories.

## Practical Stability Assessment

The project is stable enough for continued development and cautious production use, assuming backups are kept and the verification suite is run before deploys. The highest-risk irreversible data-loss paths have been reduced, especially around import, sync, staff operations, and deletion behavior.

It is not yet "hands-off mature" because legacy user data and real-world backup files can still expose edge cases that unit tests do not cover. The next reliability gains should come from fixture-based tests, replay tests, and support documentation rather than another large refactor.

## Recommended Verification

Before deploying data-layer changes:

```bash
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
git diff --check
```

Before dependency upgrades:

```bash
npm audit --omit=dev
npm run build
```

## Overall Completion

Estimated completion toward the current data-safety and engineering hardening plan: 88%.

The completed work covers the critical implementation fixes. The remaining 12% is mostly confidence work: legacy fixtures, broader replay tests, recovery documentation, and careful service extraction.
