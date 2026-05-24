# Engineering Fix Summary

The project is deployable again after the first safety pass: `npm run build` succeeds, public repair tools are guarded to localhost, lint no longer has blocking errors, and TypeScript now passes with `npx tsc --noEmit --incremental false`.

Build-time type and lint ignores have been removed from `next.config.mjs`, so Vercel now runs real type and lint validation during build. Remaining work is mostly deeper data-shape cleanup and security hardening. The largest theme is drift between app models and Supabase-shaped rows, especially camelCase vs snake_case fields.

Current status:

- Build: passing.
- Lint: passing with warnings.
- TypeScript: passing.
- Security backlog: staff invitation RLS/RPC hardening and dependency audit review.
