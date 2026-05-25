# Engineering Fix Summary

The project is deployable again after the first safety pass: `npm run build` succeeds, public repair tools are guarded to localhost, lint has no warnings or errors, and TypeScript now passes with `npx tsc --noEmit --incremental false`.

Build-time type and lint ignores have been removed from `next.config.mjs`, so Vercel now runs real type and lint validation during build. Staff invitation access has also been tightened so token verification stays behind the RPC and invitation acceptance binds to `auth.uid()` instead of trusting a client-supplied staff id.

The non-breaking `npm audit fix` pass updated transitive dependencies in `package-lock.json`. The unused `next-pwa` dependency was removed, and `next` plus the lint toolchain were upgraded after verifying the production build. Remaining production audit findings are down to 2 moderate advisories in Next's bundled PostCSS dependency; `npm audit fix --force` currently recommends an invalid downgrade path, so this is tracked as an upstream patch item.

The first data normalization pass added `lib/data-mappers.ts` for event payload and row-shape conversion. Event creation and sync now share mapper helpers for `marketId`/`market_id` extraction and for market create/update payload conversion, reducing duplicated camelCase/snake_case logic in the highest-risk sync path.

The mapper layer is now also used by `lib/supabase/markets.ts` and `lib/supabase/products.ts`, so staff-accessible Supabase view rows keep their original access metadata while also exposing the local camelCase fields expected by the app.

Snapshot loading and full-sync import paths now normalize market/product rows before writing to IndexedDB, and legacy cloud replay normalizes event payloads before sending them through event handlers.

The remaining duplicated `market_updated` replay conversion blocks in `hooks/useSync.ts` have been removed; replay paths now rely on the shared mapper only.

Current status:

- Build: passing.
- Lint: passing with no warnings.
- TypeScript: passing.
- Production audit: 2 moderate upstream `next`/`postcss` findings remain.
- Security backlog: mapper adoption for remaining migration/debug utilities and monitoring the upstream Next/PostCSS advisory.
