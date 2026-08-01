# Subscription Capability Read Model

Date: 2026-07-29  
Status: S4 implemented locally; local server, live 063 RPC permission, and deterministic state validation passed on 2026-07-29, while authenticated deployment smoke remains incomplete  
Scope: non-billing authoritative read path only

## Authority Boundary

`GET /api/account-capabilities` is the only public account-capability read endpoint introduced by S4. It derives the owner id from the verified bearer token and does not accept a plan, tier, owner id, entitlement, feature list, or freshness flag from the client.

The separately gated local test harness is documented in
`docs/subscription/LOCAL_SUBSCRIPTION_SIMULATION.md`. Its authenticated mutation
route is available only with a server-only local flag and a loopback request. It
does not change the production S4 authority boundary or persist an entitlement.

The endpoint has no `POST`, `PUT`, `PATCH`, or `DELETE` handler. Users cannot self-upgrade or create an admin assignment.

## Shared And Platform Boundaries

- `lib/subscription/account-capability-contract.ts` defines the shared response contract.
- `lib/subscription/account-capability-server.ts` validates records and resolves safe capability snapshots without importing Next.js, Supabase, React, Dexie, browser globals, or Capacitor.
- `lib/subscription/account-capability-client.ts` uses the shared application API base, timeout, retry, and error contracts. It works with an injected bearer token and does not read browser storage or Supabase directly.
- `lib/subscription/account-capability-storage.server.ts` is server-only and is the only S4 module that can use `SUPABASE_SECRET_KEY`.
- `app/api/account-capabilities/route.ts` owns HTTP authentication, CORS, no-store responses, and safe error mapping.

## Read Statuses

| Status | Meaning | Paid capability result |
| --- | --- | --- |
| `default_free` | authorized owner has no `subscription_accounts` row | Free; paid features false |
| `explicit_free` | server row explicitly records Free | Free; paid features false |
| `admin_enabled` | trusted admin Pro/Team assignment has active or grace entitlement | shared plan capabilities, subject to role/runtime/data gates |
| `admin_inactive` | admin assignment exists but entitlement is inactive or expired | new paid writes fail closed |
| `simulation_enabled` | local, authenticated, loopback-only in-memory test state | plan-model capabilities for local validation only; never a paid or server-write claim |
| `billing_not_connected` | a billing-sourced row exists before billing reconciliation is implemented | safe Free snapshot; no paid claim |
| `promotion_not_connected` | a promotion-sourced row exists before approved reward runtime exists | safe Free snapshot; no paid claim |
| unavailable error | auth, repository, record validation, or service configuration failed | unavailable snapshot; paid features false |

Every successful snapshot receives server-issued `capabilityEvaluatedAt` and `capabilityRefreshAfter`. A client clock may reject a stale snapshot but cannot extend it or grant a capability.

## Database Boundary

Migration `063_add_subscription_accounts.sql` creates:

- `public.subscription_accounts`;
- strict plan/source/billing/entitlement shape checks;
- RLS with no direct `anon` or `authenticated` table privileges;
- `read_subscription_account_for_actor(uuid, uuid)`;
- execute permission for `service_role` only;
- no user-facing write RPC.

The read RPC accepts the actor id only from the authenticated BFF. It can authorize an owner or an active staff relationship for future server-side feature routes. The public account-capability endpoint intentionally resolves only the authenticated actor's own account so staff clients do not receive an owner's subscription or billing state.

## Admin-Managed Source

S4 permits trusted operations or support staff to maintain `free` or `admin` rows directly through protected database administration after migration approval. There is no application write route. Admin Pro/Team is an entitlement source, not proof of payment.

Rows marked `billing` or `promotion` are reserved for later migrations and reconciliation work. S4 deliberately returns `billing_not_connected` or `promotion_not_connected` without paid capabilities.

## Fail-Closed Rules

- Missing authorized row becomes Free, not Pro or Team.
- Missing server configuration or repository failure becomes unavailable, not Free-authoritative.
- Malformed or owner-mismatched rows become unavailable.
- Foreign or inactive workspace access returns forbidden from the repository contract.
- Admin inactive/expired entitlement cannot pass paid-write access evaluation.
- The API response is never accepted as authorization by a paid server write route; each later route must resolve capabilities server-side again.
- Existing role, runtime, upload, data-completeness, RLS, and RPC gates remain independent.
- Local simulation is disabled without its private flag, on non-loopback requests, and on detected Vercel deployments; it never authorizes paid server writes.

## Production Gates

Before this read model can be described as production-active:

1. review and execute migration `063` in the intended Supabase environment;
2. configure the server-only `SUPABASE_SECRET_KEY` and existing application API CORS allowlist;
3. confirm no secret or privileged RPC name appears in client bundles;
4. smoke owner missing-row, explicit Free, admin Pro, admin Team, inactive admin, and unavailable states;
5. verify a foreign or inactive staff relationship cannot use the RPC;
6. record production evidence in this document or the deployment runbook.

### Production Evidence

- 2026-07-29: the user confirmed migration `063_add_subscription_accounts.sql` was executed in the intended environment.
- 2026-07-29: local `SUPABASE_SECRET_KEY`, explicit application API CORS origins, R2 credentials, and product-cover gates passed masked presence and shape validation. No secret values were printed or written to evidence.
- 2026-07-29: after the schema refresh, the configured Supabase project accepts `read_subscription_account_for_actor(p_actor_id, p_owner_id)`. A service-key owner lookup returned the authoritative missing-row Free shape, an existing active staff relationship was authorized, and a known foreign profile pair returned no row.
- 2026-07-29: direct anonymous reads of `subscription_accounts` and anonymous execution of the read RPC both failed with PostgreSQL permission code `42501`, matching the service-role-only authority boundary.
- 2026-07-29: the live project contained no explicit `subscription_accounts` rows and no inactive staff relationship fixture. No production rows were created or changed for smoke testing.
- 2026-07-29: deterministic resolver and route smoke covers `default_free`, `explicit_free`, admin Pro and Team `admin_enabled`, expired and explicitly inactive `admin_inactive`, `billing_not_connected`, `promotion_not_connected`, malformed/unavailable, repository failure/unavailable, forbidden, and authentication-required behavior. Disconnected billing and promotion states resolve to Free capabilities.
- 2026-07-29: a private R2 `GetObject` request for a randomized nonexistent sentinel authenticated successfully and returned the expected not-found result without creating, changing, listing, or deleting an object.
- 2026-07-29: a fresh production build passed. A temporary production server returned 200 for `/api/health`, 401 for both unauthenticated capability endpoints, exact 204 CORS preflight responses for both configured origins, and 403 `cors_origin_denied` for an unlisted origin. The temporary server was stopped after verification.
- 2026-07-29: `npm run smoke:subscription:read-model` repeated the live read-only owner, anonymous privilege, active staff, foreign actor, and state-coverage checks without creating or changing subscription data. The project still had no inactive-staff fixture or explicit subscription row.
- 2026-07-29: S6A authenticated local UI smoke used the active application session without reading or exposing browser storage. Selecting one market called the capability endpoint and rendered the Pro gate without a recap or console error.
- 2026-07-29: S6B extended the same read model to every analytics range. The current Free account defaulted to the recent-three revenue/quantity preview; recent-10, all, advanced, and single-market paths rendered the Pro gate without paid analysis results, and returning to recent-three restored the preview. No console error, horizontal overflow, subscription mutation, or browser plan cache was observed.
- 2026-07-29: S6C extended the read model to the owner-only settlement report. Free is limited to a separate revenue, deal-count, market-coverage, and completeness summary; product queries and full report/PDF models are suppressed. Deterministic Free, Pro, Team, capability-unavailable, and role-denied guardrails, the full test manifest, ESLint, Web/mobile builds, client-bundle scans, and the repeated live missing-row Free smoke passed locally. Authenticated latest-build UI smoke remained pending because the existing signed-in browser origin was occupied by an unrelated local service; no session data was inspected or moved.
- 2026-07-29: S6D changed `report.pdf` to Pro/Team `included` and enabled the independent PDF runtime. The owner-only report page mounts generation only when the authoritative full-report and PDF capabilities both allow; Free still suppresses paid model/PDF construction. The generated report remains local/client-side through the platform file preview port. Deterministic plan, runtime rollback, source-boundary, five-page, true-A4, and rendered-PNG visual checks pass locally. Authenticated paid-state deployment smoke remains pending.
- 2026-07-29: LV1 added the explicitly marked `simulation_enabled` local validation source. It requires a private local flag, loopback URL, verified bearer token, and in-memory owner state with a four-hour expiry. Focused/full tests, ESLint, Web/mobile builds, mobile verification/smoke, and unauthenticated 401 plus local CORS preflight smoke passed. It does not modify subscription rows or authorize server writes; authenticated UI switching remains a manual local smoke.
- Local S4 route, repository, capability lifecycle, client parsing, CORS, fail-closed, lint, build, full-test, and client-bundle guardrails passed before this confirmation.
- S5 local verification passed focused product-cover/subscription tests, full ESLint, production build, full test manifest, client-bundle secret/RPC scan, and unauthenticated 401 smoke for both capability endpoints.
- Live inactive-staff denial and explicit Free/admin Pro/admin Team/inactive-admin state smoke remain fixture-dependent. Authenticated route smoke against the real deployment and deployment evidence also remain open. S4 must not yet be described as production-active.

## Intentionally Excluded From S4

- payment provider SDKs, prices, checkout, webhooks, refunds, cancellation, or proration;
- founder offer eligibility or 65% price assignment;
- referral attribution, Pro Pass grants, credits, or rewards;
- user self-upgrade or admin mutation endpoints;
- product-cover, sales-evidence, analytics, report, or Team runtime enforcement;
- persistent client capability cache or an approved offline Team lease.

S5 consumes this server resolver for product-cover `required` mode. The current product-cover `open` mode remains explicit and does not query or claim a paid subscription.
