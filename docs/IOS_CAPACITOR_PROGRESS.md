# iOS Capacitor Execution Progress

## Current Phase

Phase 2 / Backend API boundary

## Status

IN PROGRESS - Gate 1 remains passed. Direct validation against the existing owner-only environment is approved, the complete worktree is authorized for deployment to Vercel's `main` Production Branch, and current pre-push tests/build pass. Gate 2 remains not passed pending deployed API evidence, server-only environment secrets, reviewed migrations, and real Supabase/R2 evidence.

## Decisions

- The user authorized direct implementation on 2026-07-16, with work pausing only for material product decisions, external credentials, or manual actions.
- The user confirmed on 2026-07-17 that the production Web application is deployed on Vercel and authorized reusing that Vercel deployment for the BFF/API routes.
- The production Web/API origin is confirmed as `https://markit-app-mocha.vercel.app`.
- Web keeps same-origin `/api` calls. Static mobile builds require an explicit stable HTTPS `NEXT_PUBLIC_API_BASE_URL`.
- Authenticated CORS uses an exact allowlist and supports `capacitor://localhost`; wildcard, `null`, credentialed, malformed, and unlisted origins fail closed.
- The Vercel BFF verifies the caller with Supabase `auth.getUser(token)` and derives actor identity only from the verified user. Authorization reads remain caller-scoped under RLS; photo mutations use the separate Vercel-only server-secret RPC capability.
- Shared request policy permits one retry only for idempotent GET/HEAD requests and retryable network/status failures. Photo upload POST is never automatically retried.
- API errors expose only stable allowlisted fields. Upload/read size limits, MIME magic-byte checks, canonical R2 key binding, exact CORS checks, and fail-closed route gates are enforced server-side.
- The mobile artifact contains no API route handlers. `/api/health`, upload, and image read remain remote Vercel BFF endpoints.
- Migration `057_harden_sales_photo_evidence_api_boundary.sql` is prepared but has not been applied to any Supabase environment.
- The user approved the server-only mutation path on 2026-07-17. Token verification remains on the public client, authorization reads remain caller-scoped under RLS, and a separate Vercel-only `SUPABASE_SECRET_KEY` capability calls only the three approved photo mutation RPCs from application code.
- Migration 058 is additive: it adds the upload lease and claim/finalize/failure RPC capability while deliberately retaining the old authenticated write path for staging smoke. Migration 059 is the later permission cutover that revokes direct authenticated mutations and direct `service_role` table mutation while preserving authenticated SELECT and approved RPC execution.
- The required order is 057 hardening -> 058 additive capability -> staging RPC smoke -> 059 permission cutover -> post-cutover smoke. Migration 059 must not be applied before the staging RPC path is proven.
- On 2026-07-17 the user approved validating Phase 2 directly against the existing Vercel, Supabase, and R2 environment because the application is not externally open and is currently used only by the owner. A separate staging deployment is no longer required for this execution path.
- On 2026-07-17 the user confirmed that the Vercel Git Production Branch is `main`, matching the current local branch and `origin/main` tracking configuration.
- On 2026-07-17 the user explicitly authorized committing and pushing the complete current worktree to `origin/main` after secret scanning and verification.
- The existing production URL currently serves the old deployment: requesting `/api/health` shows the existing home application because the Phase 2 changes have not yet been committed and pushed to the Git branch watched by Vercel. This is not Gate 2 API evidence.
- Phase 3 Capacitor/native bootstrap is not authorized by the current Gate status.

## Changed Files

- Phase 1 mobile/Web packaging: `next.config.mjs`, `package.json`, `tsconfig.mobile.json`, `.env.example`, mobile build/verification scripts, fixed detail routes, Web-only compatibility routes, shared navigation contracts, and platform/Web isolation files.
- Shared API boundary: `lib/api/client.ts`, `lib/api/contract.ts`, `lib/api/transport.ts`, `lib/api/server/auth.ts`, `lib/api/server/cors.ts`, `lib/api/server/response.ts`.
- Vercel BFF routes: `app/api/health/route.ts`, `app/api/sales-photo-evidence/upload/route.ts`, `app/api/sales-photo-evidence/image/route.ts`.
- Photo boundary hardening: `lib/sales/photo-evidence-model.ts`, `lib/sales/photo-evidence-upload-form-data.ts`, `lib/sales/photo-evidence-pending-payload-storage.ts`, both R2 server adapters, and both photo API clients.
- Database hardening draft: `supabase/migrations/057_harden_sales_photo_evidence_api_boundary.sql`.
- Server-only mutation capability: `lib/supabase/sales-photo-evidence-server-mutation-repository.server.ts` and the split read/mutation repository wiring.
- Additive server-only mutation capability: `supabase/migrations/058_add_sales_photo_evidence_server_mutation_rpcs.sql`.
- Locally verified permission cutover draft: `supabase/migrations/059_enforce_sales_photo_evidence_server_mutation_boundary.sql`; real PostgreSQL/Supabase staging execution remains required before cutover.
- Deployment support: `.env.example`, `DEPLOYMENT_CHECKLIST.md`, `scripts/build-mobile.mjs`, `scripts/smoke-mobile-static-output.mjs`, `scripts/smoke-vercel-api.mjs`, `package.json`.
- Server-only boundary support: `server-only@0.0.1`, `package-lock.json`, and the per-test React server condition in `scripts/run-tests.mjs`.
- Phase 2 verification: API URL/transport/error/auth/CORS/health tests, upload/read boundary tests, R2/payload tests, migration tests, mobile route/static-output tests, and `scripts/test-files.txt`.
- Server mutation verification: `tests/app-api-server-mutation-client.test.ts`, `tests/supabase-sales-photo-evidence-server-mutation-migration.test.ts`, `tests/sales-photo-evidence-client-mutation-boundary.test.ts`, and updated upload/repository tests.
- Decision records: `docs/IOS_MOBILE_PACKAGING_DECISION_RECORD_2026_07_16.md`, `docs/IOS_PHASE2_VERCEL_BFF_DECISION_RECORD_2026_07_17.md`.
- Progress record: `docs/IOS_CAPACITOR_PROGRESS.md`.
- Unrelated modified and untracked workspace files that predated these phases were preserved.

## Verification

- Gate 1 packaging evidence remains valid: the bundled mobile static build opens without a Next route runtime, excludes API/dynamic/Web-only handlers, and passed generic-server/browser/runtime smoke.
- Current post-split `npm.cmd test`: PASS. All 221 manifest files exited successfully in 229.8 seconds, including the 058/059 migration contracts, upload lease/attempt behavior, production mutation route path, revoked-staff cleanup, route/log secret canary, and server-only import boundary.
- `npm.cmd run build`: PASS in 123.2 seconds. The Web build retained `/api/health`, upload, and image handlers and generated 25 routes/pages.
- Web client bundle canary scan: PASS. `.next/static` contained zero occurrences of the fake server secret, `SUPABASE_SECRET_KEY`, `sb_secret_`, or any of the three privileged RPC names.
- `npm.cmd run build:mobile:api` with `https://markit-app-mocha.vercel.app`: PASS in 91.7 seconds. It generated 25 static pages and 304 files (17.98 MiB), embedded the confirmed production HTTPS API base in one artifact, and emitted zero server secret/RPC markers.
- `npm.cmd run verify:mobile`: PASS. `npm.cmd run smoke:mobile`: PASS for nine artifacts/routes, including bundled API 404 boundaries.
- `tsc --noEmit --project tsconfig.mobile.json`: PASS in 16.9 seconds.
- Phase 2 scoped ESLint: PASS with zero errors.
- Node syntax checks for the modified build/smoke scripts: PASS.
- `git diff --check`: PASS. Only line-ending normalization notices were printed by the accompanying status command.
- `http://127.0.0.1:3000`: HTTP 200 on 2026-07-17 after final builds and tests.
- Current pre-push `npm.cmd test`: PASS in 235.2 seconds after the direct-environment and local hydration decisions.
- Current clean-cache `npm.cmd run build`: PASS in 115.4 seconds; 25 static pages were generated and `/api/health`, photo upload, and photo image read remained dynamic server routes.
- Pre-push changed-file secret scan: PASS. The only token-shaped match is the deliberate fake Supabase canary in a server-secret leak regression test; `.env.example` contains placeholders only.
- Production probe on 2026-07-17: `/` is HTTP 200 and `/api/health` is HTTP 404, confirming that the local Phase 2 BFF has not been deployed there.
- `server-only@0.0.1` was installed to enforce the Next server import boundary; `package.json` and `package-lock.json` changed accordingly. No real secret was installed or written to disk.

## Baseline Failures

- Standalone repository-wide `tsc --noEmit` still reports pre-existing test-fixture type errors. Production Web/mobile builds, mobile TypeScript, and the runtime test manifest pass.
- `npm audit` reports five existing advisories (two low, three moderate; no high/critical). The production-only view reports the direct Next/PostCSS chain, and the offered `--force` remediation would install a breaking/inappropriate Next version, so no automatic dependency rewrite was performed in this Phase 2 slice. The added `server-only` package is not listed as vulnerable.
- The workspace already contained unrelated modified/untracked files. They remain preserved and were not reverted.
- Direct validation against the existing environment is approved, but `scripts/smoke-vercel-api.mjs` has not yet been run against a deployment containing the Phase 2 BFF.
- This workspace has no Vercel CLI/project linkage/token and no Supabase CLI/project linkage/access token. External staging cannot be created non-interactively from the current environment.
- GitHub's remote default branch still points to `master`, but Vercel's confirmed Production Branch is `main`; deployment work must target `main` and must not infer deployment behavior from the GitHub default branch.
- The public production probe currently returns 200 for `/` and 404 for `/api/health`, so the Phase 2 BFF code is not deployed there yet.
- Historical Supabase migrations contain duplicate version prefixes. Do not run the complete chain blindly; inspect remote migration history and use the reviewed 057 -> 058 -> staging smoke -> 059 -> post-cutover sequence.
- Migrations 057, 058, and 059 have not been applied from this workspace. Real Supabase/R2 tests for owner, active staff, revoked staff, and unrelated users remain outstanding.
- Until migration 059 is actually applied and verified, the deployed database retains its existing authenticated INSERT/UPDATE model. Local code and pre-split tests alone do not revoke staging or production privileges.
- Capacitor packages and native projects are not installed. This remains intentional until Gate 2 passes and Phase 3 decisions are approved.
- `public/sw.js` remains a shared Web asset; native suppression still depends on the future Phase 3 bootstrap.

## Next Authorized Slice

Push the verified complete-worktree deployment commit to `origin/main`, then observe the Vercel production deployment and verify `/api/health`. Direct validation against the existing Vercel/Supabase/R2 environment is approved and no separate staging resources are required. Before privileged API/RPC smoke, the remaining manual inputs are Vercel server-only secrets and a database backup. The subsequent sequence is migration 057 -> additive 058 -> live owner-only RPC smoke -> migration 059 cutover -> post-cutover API/mobile smoke and Gate 2 evidence. Gate 2 stays closed and this is not Phase 3.
