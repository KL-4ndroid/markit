# Engineering Fix Summary

The project is deployable again after the first safety pass: `npm run build` succeeds, public repair tools are guarded to localhost, lint has no warnings or errors, and TypeScript now passes with `npx tsc --noEmit --incremental false`.

Build-time type and lint ignores have been removed from `next.config.mjs`, so Vercel now runs real type and lint validation during build. Staff invitation access has also been tightened so token verification stays behind the RPC and invitation acceptance binds to `auth.uid()` instead of trusting a client-supplied staff id.

The non-breaking `npm audit fix` pass updated transitive dependencies in `package-lock.json`. The unused `next-pwa` dependency was removed, and `next` plus the lint toolchain were upgraded after verifying the production build. Remaining production audit findings are down to 2 moderate advisories in Next's bundled PostCSS dependency; `npm audit fix --force` currently recommends an invalid downgrade path, so this is tracked as an upstream patch item.

The first data normalization pass added `lib/data-mappers.ts` for event payload and row-shape conversion. Event creation and sync now share mapper helpers for `marketId`/`market_id` extraction and for market create/update payload conversion, reducing duplicated camelCase/snake_case logic in the highest-risk sync path.

The mapper layer is now also used by `lib/supabase/markets.ts` and `lib/supabase/products.ts`, so staff-accessible Supabase view rows keep their original access metadata while also exposing the local camelCase fields expected by the app.

Snapshot loading and full-sync import paths now normalize market/product rows before writing to IndexedDB, and legacy cloud replay normalizes event payloads before sending them through event handlers.

The remaining duplicated `market_updated` replay conversion blocks in `hooks/useSync.ts` have been removed; replay paths now rely on the shared mapper only.

Staff market detail loading and full-sync market/product imports now consume the shared row mappers instead of rebuilding local row shapes inline. The mapper layer also normalizes numeric fields and single-date market rows more consistently.

Sync conflict resolution and event payload rewriting now normalize remote rows and event updates through the shared mapper layer. Semver-safe dependency updates were applied; the only remaining audit findings are still the upstream Next/PostCSS moderate advisories with no clean stable upgrade path available.

The first irreversible-operation hardening pass removes cloud-data deletion from the legacy staff invitation acceptance dialog, verifies cloud events before clear-and-pull migration wipes local IndexedDB data, fixes the `product_deleted` UUID type, and adds a Supabase migration so token invitation acceptance grants market membership atomically.

The next irreversible-operation pass moves full app-data deletion and staff leave-team cleanup into authenticated `SECURITY DEFINER` RPCs. The settings page now clears local IndexedDB/cache only after those cloud mutations succeed, reducing partial-delete and local-data-loss failure modes.

Sync permission-error handling now preserves local data. A 403/RLS failure records a bounded diagnostic entry, pauses sync temporarily, and lets the app retry later instead of deleting local collaborative records immediately.

Staff-view synchronization no longer clears other users' local records before every pull. It now preserves local data and logs isolation findings, keeping destructive cleanup reserved for explicit account lifecycle flows.

Backup import now has a first safety layer: imported JSON is parsed, version-checked, validated for required arrays, duplicate IDs, invalid dates, missing required fields, orphan references, and negative stock before any replacement happens. `importData()` also creates an emergency backup of the current local data before replacing tables and reruns integrity checks after import.

Event creation is now cleaner for market/product create/update flows: `recordEvent()` prepares generated `marketId`/`productId` values before insertion, and the corresponding projection handlers no longer rewrite those event rows after they are stored.

Normal product-sale transactions now fail if finite stock is insufficient instead of silently clamping inventory to zero. Backfill transactions still avoid stock deduction.

Product-based deals now update `dailyStats.productsSold`, merging quantity and revenue per product. Event-sourced deal deletion carries the same product-sale entries so daily product stats can be reversed consistently.

Market-detail deal deletion now records a `deal_deleted` event instead of directly deleting the original `deal_closed` event and hand-editing projections. Deletion cost calculations also prefer the original sale-time cost snapshot.

Deal and interaction deletion handlers now preserve the original event rows. Tombstone-aware query helpers exclude records referenced by `deal_deleted` and `interaction_deleted` for the main market detail, daily log, daily revenue, and product analytics views.

`recordEvent()` now has event-specific TypeScript overloads backed by `EventPayloadMap`, so normal literal calls such as `product_deleted`, `deal_closed`, and `market_status_changed` are checked against their expected payload shape. Dynamic cloud replay still keeps a guarded generic overload so sync recovery can continue to process persisted remote events.

Events are also validated at runtime before being persisted. The first guard checks required IDs, sale item quantities/prices, update objects, and core market/product fields so malformed payloads fail before they can become immutable history.

Snapshot rebuilds now run the shared integrity validator after event replay. If the rebuilt projections are inconsistent, the rebuild fails immediately instead of leaving corrupted cache tables in place.

Current status:

- Build: passing.
- Lint: passing with no warnings.
- TypeScript: passing.
- Production audit: 2 moderate upstream `next`/`postcss` findings remain.
- Security backlog: monitoring the upstream Next/PostCSS advisory.
