# Data Safety Review Plan

Last updated: 2026-05-26

## Purpose

This document tracks the data-safety review for Féria. The project is an offline-first app built around IndexedDB, Dexie, event records, projection tables, backup import/export, and optional Supabase sync. The main safety goal is to prevent irreversible user-data loss or silent data drift.

## Current Verdict

The highest-risk data-layer issues from the first review have mostly been addressed. Events are closer to immutable history, backup import is guarded by validation, recovery mode exists, deal deletion is tombstone-based, and daily statistics now have repair and validation paths.

The project is significantly safer than the original reviewed state, but it should still be treated as a data-sensitive application. Remaining work should focus on verification, migration confidence, production monitoring, and reducing the last few places where large UI files still perform complex data orchestration.

## Completed Safety Work

- Added typed event payload coverage through `EventPayloadMap`.
- Added runtime event payload validation before IndexedDB persistence.
- Moved market/product create and update normalization before event insertion.
- Removed projection-handler rewrites for core market/product event rows.
- Added backup validation before `importData()` replaces local tables.
- Added emergency backup creation before destructive import replacement.
- Added post-import integrity validation.
- Added pure replay-readiness checks for event ordering, duplicate tombstones, and deleted product sale references.
- Added snapshot rebuild integrity validation.
- Added cross-event reference checks for `deal_deleted` and `interaction_deleted`.
- Changed deal deletion to tombstone events instead of deleting original history.
- Added tombstone-aware query filtering for user-facing deal and interaction views.
- Added finite-stock checks for normal product sales.
- Added `dailyStats.productsSold` update and reverse handling.
- Added recovery-mode APIs and a `/recovery` route.
- Added guarded `dailyStats` numeric repair with pre-repair backup.
- Added automated integrity tests for backup validation, tombstones, replay readiness, and invalid stats.
- Hardened staff sync/invitation flows to avoid destructive local-data clearing on permission errors.

## Remaining Risks

### P0: Must Stay Protected

- Import, restore, and repair flows must continue to create backups before mutating data.
- Event replay must remain deterministic; projection handlers should not mutate event history.
- Recovery tools must stay explicit and user-initiated.
- Staff/team cloud operations must not clear local IndexedDB until authenticated remote operations succeed.

### P1: Needs Ongoing Verification

- Existing user devices may contain legacy data shapes that were created before the current validators.
- Large page components still contain some data orchestration logic, which makes future regressions easier.
- Supabase sync paths should continue to be checked whenever row mappers or RLS policies change.
- Backup compatibility should be tested against older exported files, not only freshly generated backups.
- Analytics cache repair currently fixes known numeric/stat shape issues, but deeper semantic inconsistencies may still need manual review.

### P2: Future Hardening

- Add fixture-based import tests for real legacy backups.
- Add event replay snapshot tests with realistic market/product/deal timelines.
- Add a lightweight production diagnostic checklist for support cases.
- Add a user-facing explanation for common recovery errors such as invalid `dailyStats` fields.
- Consider moving more mutation orchestration out of page components and into narrow service functions.

## Recommended Operating Rules

1. Events are the durable history; projections are rebuildable caches.
2. Destructive operations must run only after validation and backup creation.
3. Sync permission errors should pause or report sync, not delete local data.
4. Any repair action should be reversible through a downloaded backup.
5. Every new event type should define a typed payload, runtime validator, replay behavior, integrity checks, and tombstone behavior when applicable.

## Verification Checklist

Run this after data-layer changes:

```bash
npm test
npx tsc --noEmit --incremental false
npm run lint
npm run build
git diff --check
```

Run this after dependency or deployment-related changes:

```bash
npm audit --omit=dev
npm run build
```

## Next Best Work

1. Build fixture backups that represent old app versions and verify import/recovery behavior.
2. Add higher-level replay tests for full market lifecycles.
3. Review large page-level mutation flows and extract repeated logic into small service helpers.
4. Add recovery documentation for non-developer users and support/debug steps for developers.
5. Continue monitoring upstream `next`/`postcss` advisories until a clean stable patch path is available.
