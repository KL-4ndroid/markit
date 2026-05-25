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
npx tsc --noEmit --incremental false
npm audit --omit=dev
```
