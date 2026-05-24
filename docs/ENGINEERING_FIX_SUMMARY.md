# Engineering Fix Summary

The project is deployable again after the first safety pass: `npm run build` succeeds, public repair tools are guarded to localhost, lint has no warnings or errors, and TypeScript now passes with `npx tsc --noEmit --incremental false`.

Build-time type and lint ignores have been removed from `next.config.mjs`, so Vercel now runs real type and lint validation during build. Staff invitation access has also been tightened so token verification stays behind the RPC and invitation acceptance binds to `auth.uid()` instead of trusting a client-supplied staff id.

The non-breaking `npm audit fix` pass updated transitive dependencies in `package-lock.json`. Remaining audit findings are down to 7 vulnerabilities and require breaking upgrades, primarily `next` and the `next-pwa`/Workbox chain.

The first data normalization pass added `lib/data-mappers.ts` for event payload and row-shape conversion. Event creation and sync now share mapper helpers for `marketId`/`market_id` extraction and for market create/update payload conversion, reducing duplicated camelCase/snake_case logic in the highest-risk sync path.

The mapper layer is now also used by `lib/supabase/markets.ts` and `lib/supabase/products.ts`, so staff-accessible Supabase view rows keep their original access metadata while also exposing the local camelCase fields expected by the app.

Current status:

- Build: passing.
- Lint: passing with no warnings.
- TypeScript: passing.
- Security backlog: breaking dependency upgrades and mapper adoption for snapshot/full-sync import paths.
