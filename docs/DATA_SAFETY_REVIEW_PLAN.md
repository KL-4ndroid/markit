# Data Safety Review Plan

Last updated: 2026-05-25

## Verdict

The external review is mostly valid. Some details are outdated because recent hardening work already fixed them, but the main concern remains correct: this app uses an event-sourcing-like data model, yet event immutability, payload typing, import safety, inventory consistency, and rebuild safety are not strict enough.

The highest-value next work should stay in the data layer before UI polish.

## Already Addressed

- `product_deleted` now uses a string UUID payload in `lib/db/events.ts`.
- Staff invitation acceptance no longer deletes cloud personal data.
- Clear-and-pull migration verifies cloud events before clearing local IndexedDB.
- Settings destructive cloud cleanup now runs through authenticated RPCs before local cache clearing.
- Sync permission errors now pause sync and preserve local data.
- Staff-view sync no longer deletes other users' local records during normal pull.

## Still Necessary

### P0: Prevent Irreversible Data Corruption

- Harden `importData()` with full backup validation before clearing current data.
- Create an emergency local export before any restore replaces current data.
- Stop event handlers from updating or deleting `events` records.
- Normalize event payloads before insertion in `recordEvent()`.
- Make `market_deleted` and related handlers accept one canonical payload shape.
- Add stock-underflow checks to normal `deal_closed` transactions.

### P1: Prevent Silent Analytics Drift

- Update `dailyStats.productsSold` when `deal_closed` records product sales.
- Make `deal_deleted` reverse `productsSold` consistently if product sale tracking is added.
- Make custom interaction buttons either map into explicit stats or remain event-only with clear analytics handling.
- Add integrity checks after snapshot rebuilds and imports.

### P2: Strengthen Type and Recovery Boundaries

- Add an `EventPayloadMap` so `recordEvent()` payloads are type-checked by event type.
- Add runtime `validateEventPayload()` for imported/synced events.
- Add `checkDatabaseIntegrity()` for orphan events, missing markets/products, negative stock, and daily-stat mismatches.
- Change `initializeDatabase()` to surface a recoverable failure state instead of silently continuing.
- Add targeted tests for import/restore, event replay, stock checks, and daily stats.

## Implementation Plan

### Phase 1: Safe Import and Integrity Foundation

1. Add `lib/db/integrity.ts`.
2. Implement checks for duplicate IDs, orphan event market IDs, orphan daily stats, invalid dates, negative stock, and missing required fields.
3. Replace the current thin `importData()` validation with:
   - JSON parse and schema shape validation.
   - supported backup version check.
   - duplicate ID checks.
   - required field checks.
   - emergency `exportData()` before replacement.
   - post-import integrity check.
4. Keep the first pass conservative: do not attempt complex dry-run replay until event handlers are immutable.

### Phase 2: Event Immutability

1. Add `lib/db/event-payloads.ts` for event payload normalization and validation.
2. Move market/product ID generation and payload normalization into `recordEvent()` before `db.events.add()`.
3. Remove `db.events.update()` calls from projection handlers.
4. Replace event-deleting handlers with tombstone/reversal events or explicit projection-only updates.
5. Verify `rebuildSnapshots()` can replay without mutating `events`.

### Phase 3: Canonical Payload Types

1. Add `EventPayloadMap` in `types/db.ts` or `lib/db/event-payloads.ts`.
2. Change `recordEvent<T = ...>` to `recordEvent<T extends EventType>(type: T, payload: EventPayloadMap[T], eventId?: string)`.
3. Standardize internal payloads on camelCase.
4. Convert to Supabase snake_case only at the sync boundary.
5. Update hooks and sync code to stop passing mixed `marketId` / `market_id` shapes.

### Phase 4: Sales and Stats Consistency

1. Add normal-sale stock checks before applying product updates.
2. Keep `isBackfill` behavior separate: backfill can avoid stock deduction, but should be explicit.
3. Update `dailyStats.productsSold` by merging product quantities and revenue.
4. Add reverse logic for deleted/voided deals.
5. Add integrity checks for daily totals versus deal events.

### Phase 5: Recovery Mode

1. Change `initializeDatabase()` to return a result object or throw a typed recoverable error.
2. Add a simple DB recovery UI state:
   - export readable data,
   - reload,
   - clear local DB,
   - import backup,
   - show error details.
3. Ensure app pages do not allow new write operations while DB init is unhealthy.

## Suggested Order

1. `importData()` safety and emergency backup.
2. Event immutability for `market_created`, `market_updated`, and `product_created`.
3. Canonical payload map and `recordEvent()` typing.
4. Stock-underflow checks and `productsSold`.
5. `rebuildSnapshots()` integrity checks.
6. `initializeDatabase()` recovery mode.
