# iOS Phase 2 Vercel BFF Decision Record

Date: 2026-07-17
Status: Approved server-only RPC capability and split migrations are implemented and locally verified; external staging is not established, so Gate 2 remains **not passed**.

## Decision

- Continue using the existing Vercel Next.js deployment as the Web host and BFF.
- Web keeps same-origin `/api` calls. The static iOS bundle calls the same BFF through an explicit, stable HTTPS `NEXT_PUBLIC_API_BASE_URL`.
- Do not create a separate Vite shell or backend project for Phase 2.
- Do not embed a commit/hash-specific Vercel Preview URL in a released iOS binary. A persistent Git branch URL is acceptable because it remains stable across commits; mobile staging and production each require a stable origin or custom domain.
- Keep Cloudflare R2 credentials server-only. The browser and iOS bundle receive only Supabase public configuration and the public BFF origin.

This matches Vercel's supported Next.js Function model. Route handlers explicitly select the Node.js runtime and bounded duration. Vercel Functions currently impose a 4.5 MB request/response payload limit; the photo contract stays below it with a 2 MB multipart request guard, 1.5 MB combined binary cap, and 1 MB per object cap. See [Vercel Function limits](https://vercel.com/docs/functions/limitations) and [function duration configuration](https://vercel.com/docs/functions/configuring-functions/duration).

## Endpoint Matrix

The production origin was confirmed by the user on 2026-07-17. A stable staging origin is still pending the first persistent Vercel branch deployment and is intentionally not guessed. A public read-only probe on the same date returned 200 for the production home page and 404 for `/api/health`, so the confirmed production origin does not yet constitute Phase 2 deployment evidence.

| Consumer | API origin | Configuration |
|---|---|---|
| Vercel Web Preview | same origin | Leave `NEXT_PUBLIC_API_BASE_URL` unset |
| Vercel Web Production | same origin | Leave `NEXT_PUBLIC_API_BASE_URL` unset |
| iOS staging build | `https://<stable-staging-origin>` | Build-time `NEXT_PUBLIC_API_BASE_URL` |
| iOS production build | `https://markit-app-mocha.vercel.app` | Build-time `NEXT_PUBLIC_API_BASE_URL` |

Vercel documents that a Git branch URL always points to that branch's latest deployment and remains stable across new commits; branch-specific Preview variables can override the shared Preview environment. See [generated branch URLs](https://vercel.com/docs/deployments/generated-urls) and [branch-specific environment variables](https://vercel.com/docs/environment-variables/manage-across-environments).

The API surface is:

- `GET /api/health`
- `POST /api/sales-photo-evidence/upload`
- `GET /api/sales-photo-evidence/image?evidenceId=...&variant=image|thumbnail`

The mobile static artifact contains none of these route handlers.

## Shared Client Contract

- URL construction rejects relative, credentialed, query-bearing, fragment-bearing, or non-HTTP(S) bases.
- Mobile and non-Web origins additionally require HTTPS.
- Default request timeout is 15 seconds; photo upload uses 25 seconds, leaving a bounded margin below the 30-second route duration.
- GET/HEAD may retry once only for network/timeout, 408, 429, 500, 502, 503, or 504.
- Mutating methods, including photo POST, are never automatically retried.
- Error responses use stable `{ ok: false, code, message, retryable }` fields. Only explicit local-recovery booleans may be added; stack, cause, environment, secret, and arbitrary details are discarded.
- Photo clients map codes to local user-facing messages and do not display server or R2 exception text.

## Authentication and Authorization

- The client sends the current Supabase access token as `Authorization: Bearer ...`.
- The BFF calls Supabase `auth.getUser(token)` and derives `actorId` only from the verified user. Supabase documents this as an authentic server-side user check: [JavaScript `getUser`](https://supabase.com/docs/reference/javascript/auth-getuser).
- The request's owner/staff fields are not treated as identity:
  - owner upload attribution becomes `null` staff attribution;
  - staff upload attribution is replaced with the verified actor ID;
  - live owner/staff relationship, sale, market, and existing evidence scope are rechecked through a user-scoped Supabase client and RLS.
- Private image bytes remain owner-only by product policy.
- The image route validates that the stored R2 key exactly matches the row's owner, market, sale, evidence ID, variant, and allowed extension before privileged R2 access.

## CORS Contract

- `APP_API_CORS_ALLOWED_ORIGINS` is an exact comma-separated allowlist.
- Required production entries are `https://markit-app-mocha.vercel.app` and `capacitor://localhost`. Preview must use the exact stable staging origin after its first persistent branch deployment; it must not be guessed in advance.
- Wildcard, `null`, credentials, paths, queries, fragments, and unsupported schemes fail closed.
- Same-origin Web requests remain allowed.
- Upload/image preflight allows only the declared method plus `OPTIONS`, and only `Authorization`, `Content-Type`, and `X-Request-Id` request headers.
- A disallowed origin is rejected before authentication, body parsing, Supabase, or R2 work. Next.js likewise recommends explicit credential validation, timeouts, and preflight handling for BFF routes: [Next.js Backend for Frontend guide](https://nextjs.org/docs/app/guides/backend-for-frontend).

## Upload and Read Safety

- Multipart `Content-Length` above 2,000,000 bytes returns 413 before authentication/body parsing.
- Image plus thumbnail may not exceed 1,500,000 bytes; each object may not exceed 1,000,000 bytes.
- JPEG and WebP magic bytes must match the declared MIME type.
- R2 adapter exception text is sanitized.
- Read responses accept only JPEG/WebP, non-empty bytes, and at most 1 MB; `X-Content-Type-Options: nosniff` is returned.
- R2 object keys are deterministic. A failed retry overwrites the same canonical keys instead of creating random duplicates.

## Database Hardening

`supabase/migrations/057_harden_sales_photo_evidence_api_boundary.sql` is prepared but has not been applied from this workspace. It:

- fixes the INSERT policy grouping so sale-event validation encloses both owner and staff branches;
- adds identity-bound image and thumbnail key checks;
- adds the 1 MB metadata ceiling;
- uses `NOT VALID` for historical-row-safe rollout while enforcing new writes.

### Approved mutation-boundary decision

The user approved the server-only mutation path on 2026-07-17. The implementation uses three distinct capabilities:

1. The public Supabase client verifies the Bearer token with `auth.getUser(token)`.
2. A request-scoped public-key client performs authorization reads under the verified user's RLS context.
3. A separate Vercel-only `SUPABASE_SECRET_KEY` client can call only three photo mutation RPCs from application code. The module is guarded by Next's `server-only` marker, is never used for token verification, and never receives the user's Authorization header.

The database rollout is deliberately split so the new BFF path can be proven before the old path is removed:

- `supabase/migrations/058_add_sales_photo_evidence_server_mutation_rpcs.sql` adds bounded upload-attempt lease metadata and the claim, finalize, and failure-cleanup RPCs. It grants RPC execution only to `service_role`, rechecks live actor and sale authorization inside the transaction, derives staff attribution from the verified actor, and intentionally leaves the existing authenticated write path available for staging comparison and smoke.
- `supabase/migrations/059_enforce_sales_photo_evidence_server_mutation_boundary.sql` is the prepared cutover step. After the staging RPC path passes, it revokes authenticated INSERT/UPDATE/DELETE, preserves authenticated SELECT, and removes direct `service_role` table mutation while retaining execution of only the approved RPCs. It is locally reviewed and remains unapplied; real staging PostgreSQL/catalog/ACL verification is still required before cutover.

Post-split local verification passed on 2026-07-17: all 221 manifest tests, Web and mobile production builds, mobile artifact verification, nine-route static smoke, server-only import allowlisting, route/log canaries, and Web/mobile bundle secret scans. These results prove the local contracts only; they do not replace real Supabase execution, concurrency, catalog owner, ACL, R2, or Vercel staging evidence.

The named secret still maps to an elevated Supabase server role at the project level. It must remain Vercel-only, use a separate key per environment, avoid session/header sharing, be redacted from logs, and be rotated independently. Production cutover is prohibited until the same code and migrations pass staging. See Supabase's [server secret and RLS-bypass guidance](https://supabase.com/docs/guides/getting-started/api-keys).

## Vercel Environment Matrix

| Variable | Preview/staging | Production | Mobile bundle |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Web unset | Web unset | Stable environment-specific HTTPS origin |
| `APP_API_CORS_ALLOWED_ORIGINS` | pending stable staging origin + `capacitor://localhost` | `https://markit-app-mocha.vercel.app,capacitor://localhost` | not included |
| `NEXT_PUBLIC_APP_ENV` | `staging` | `production` | matching channel |
| `*_ROUTE_ENABLED` | `1` during smoke | staged `0` to `1` | not included |
| `*_ALLOW_PRODUCTION` | `0` | `0` until approved smoke, then `1` | not included |
| Supabase public URL/key | staging recommended | production | matching public values |
| `SUPABASE_SECRET_KEY` | dedicated staging named secret | dedicated production named secret | never included |
| R2 account/key/secret/bucket | staging recommended | production | never included |

`APP_BUILD_TARGET` and `NEXT_PUBLIC_APP_BUILD_TARGET` must not be manually configured in the Vercel Web project. Web uses `npm run build`; `npm run build:mobile:api` is reserved for an API-enabled mobile artifact and fails unless a valid HTTPS base is supplied.

## Rollout and Rollback

1. Confirm the existing Vercel project's Git Production Branch, team scope, and Deployment Protection settings. The production origin is already confirmed; create a persistent `staging` branch deployment and record its exact stable branch URL.
2. Prefer a separate staging Supabase project, R2 bucket/token, and named `SUPABASE_SECRET_KEY`.
3. Inspect remote migration history, apply migration 057 in staging, run the read-only anomaly audit, and validate its historical constraints. Do not push the repository's complete historical migration chain blindly.
4. Apply additive migration 058. This must add the RPC capability without revoking the existing authenticated write path.
5. Configure branch-specific Preview variables, deploy the server-secret RPC client with route gates controlled, and verify missing/invalid secret fail-closed behavior.
6. Run the staging RPC smoke while the legacy authenticated path still exists: health, CORS, invalid token, owner upload/read, active staff upload, revoked staff denial, retry, duplicate/lease behavior, and failure cleanup.
7. Only after that evidence passes, apply migration 059 as the permission cutover. Applying 059 before the RPC path is proven can intentionally strand or break uploads.
8. Repeat the BFF smoke after 059 and verify that direct authenticated INSERT/UPDATE/DELETE and direct `service_role` table mutation are denied while the approved RPC path still works.
9. Deploy Production with all production allow flags off, verify fail-closed behavior, then enable server production flags for a controlled smoke.
10. Enable public client runtime flags only after server smoke passes and rebuild the mobile artifact against the confirmed production origin. Roll back by disabling server production allow flags first; public client flags require a rebuild because they are embedded at build time.

## Gate 2 Status

Gate 2 remains **not passed**. Local code and automated boundaries can be completed without iOS or macOS, but the Gate requires external evidence:

- a stable staging origin (production is confirmed as `https://markit-app-mocha.vercel.app`);
- manual confirmation of the Vercel Git Production Branch, team scope, and Deployment Protection settings;
- persistent staging deployment plus branch-specific Vercel environment configuration and secrets;
- migrations 057 and additive 058 applied to staging, followed by successful RPC smoke, then migration 059 cutover and post-cutover smoke;
- recorded local automated verification for the 058/059 split (completed on 2026-07-17);
- real Supabase/R2 owner, active staff, revoked staff, and unrelated-user smoke;
- staging verification that direct authenticated and direct `service_role` table mutations are denied after 059 while approved BFF RPC mutations still work;
- a mobile staging artifact calling the deployed HTTPS BFF for upload and image read.

Until all evidence above is recorded, Gate 2 stays closed and Phase 3 is not authorized.
