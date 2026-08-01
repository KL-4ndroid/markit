# BoothBook Web Launch Readiness

Date: 2026-07-30

Overall status: `NOT_READY`

Target: production Web launch with trustworthy Free, Pro, and Team behavior, paid
billing, operational recovery, and deployment evidence. This document tracks evidence;
it does not approve a blocked subscription, database, media, or billing slice.

## Evidence rule

Local success is not production evidence. A gate is complete only when its required
artifact and environment-specific result are both recorded. Repository tests cannot
prove that a migration, secret, object store, provider account, callback, or production
deployment is configured correctly.

Allowed status values:

```text
complete
implemented_local
pending_external
pending_approval
evidence_missing
```

## Launch gate matrix

| ID | Gate | Current status | Current evidence | Required exit evidence |
| --- | --- | --- | --- | --- |
| `CI-WEB` | Every PR and `main` push runs hex, lint, complete tests, secret-free production build, and clean-diff checks | `implemented_local` | Run `30677187601` exposed Node 20/Supabase WebSocket incompatibility; workflow and deployment engine are now pinned to Node 24 LTS | First GitHub Actions run passes on the pushed Node 24 revision |
| `LOCAL-QUALITY` | Current worktree passes lint, complete tests, production build, and `git diff --check` | `complete` | 2026-07-30 local run | Repeat on release candidate revision |
| `DB-063-065` | Shared capability and Team enforcement migrations are live | `complete` | user-confirmed apply plus prior RPC/structural smoke | Preserve dated environment and smoke output in release evidence |
| `DB-066` | F3A private candidate price catalog foundation is live and denied to direct clients | `pending_external` | User-confirmed apply on 2026-08-01; anon and server-secret select/insert/update/delete probes all denied with `42501`; capability and Team read regressions passed | Record masked target/hash/timestamp; all read-only verifier rows true; authenticated denial and Security Advisor results recorded |
| `TEAM-LIVE` | Server-authoritative Free/Pro/Team mutation, downgrade, re-upgrade, and restore behavior is proven | `evidence_missing` | local simulator UI and structural tests only | Isolated owner plus active viewer/operator/manager fixture; state-transition and cross-role smoke output |
| `PROD-CONFIG` | Production Supabase, CORS, cron, R2, media gates, and server secrets are configured | `evidence_missing` | Read-only preflight implemented; local `.env.production.local` snapshot is 4/18 passing and is not Vercel evidence | Passing preflight against deployed names, dated Vercel review with no values, and production route smoke |
| `PROD-SURFACE` | Debug pages and dev subscription API are unreachable while the static fake-data demo remains public | `implemented_local` | 2026-07-30 production-mode local smoke passed even with both internal enable flags deliberately set | Run the same smoke against the release deployment and record commit-bound evidence |
| `DEPLOY-IDENTITY` | Remote smoke proves it reached the intended release revision | `implemented_local` | 2026-07-30 commit-bound production-mode smoke passed on a dirty local worktree | Commit changes, deploy that exact revision, then pass both remote smokes against its trusted SHA |
| `SECURITY-HEADERS` | Pages and APIs receive the reviewed baseline without breaking PWA/media/auth flows | `implemented_local` | 2026-07-30 production-mode API/page/PWA resource smoke and service-worker browser activation passed; unrelated-origin browser probe pending | Release deployment headers and unrelated-origin anti-frame evidence |
| `PWA-WEB` | Manifest assets, service-worker lifecycle, install presentation, responsive shell, and app shortcuts work | `implemented_local` | commit-bound local smoke passed 9 unique assets plus manifest/service worker/demo; browser activation and 390/768/1440/1920 overflow checks passed; missing screenshot and load-event race repaired | Same smoke against release SHA, real install/update evidence, owner/staff shortcut smoke, install screenshots |
| `MEDIA-PROD` | Product-cover and sales-evidence storage paths are production-ready at approved entitlement modes | `evidence_missing` | local tests and guides exist | Migration/R2/CORS/quota/cleanup evidence and authorized/unauthorized production smoke |
| `STAGING-E2E` | Owner, staff roles, Free/Pro/Team, offline recovery, PDF, and media workflows pass in a production-like deployment | `evidence_missing` | local browser and automated tests are partial evidence | Signed staging matrix for required viewports, roles, account states, and recovery cases |
| `BILLING-MERCHANT` | NewebPay recurring payment merchant, API, sandbox, refund, and reconciliation capabilities are approved | `pending_external` | provider decision is conditional | Dated merchant/API activation evidence and sanitized sandbox fixtures |
| `F3B-F3E` | Billing event ledger, projection writer, quote/obligation, and support audit slices are implemented | `pending_approval` | F3 design and F3A local foundation only | Separate reviewed migrations, adversarial tests, live verification, rollback and operations evidence per slice |
| `S9` | Provider adapter, callback, reconciliation, checkout, cancellation, refund, and entitlement mutation are implemented | `pending_approval` | S8 decision and billing contracts only | Complete billing test matrix, staging lifecycle evidence, security review, support runbooks, production canary approval |
| `PROMOTION-RUNTIME` | Launch referral attribution and Pro Pass rewards are abuse-resistant and reconciled with paid billing policy | `pending_approval` | policy/design only | Approved P1-P4 slices or an explicit decision to launch without the promotion |
| `OBSERVABILITY` | Health, callback backlog, reconciliation delay, payment failures, media cleanup, and sync incidents are observable | `evidence_missing` | health route plus local schema-v1 sales-photo API/cleanup events, safety tests, thresholds, and incident runbook; production sink and future billing signals are absent | Production dashboards/alerts, owner, thresholds, escalation and incident drill evidence |
| `LEGAL-SUPPORT` | Terms, privacy, billing/refund/cancellation, data retention, support and incident policies are approved | `evidence_missing` | exact public `/support`, `/terms`, `/privacy`, `/about` routes; fail-closed operator/contact/policy preflight; truthful no-billing boundary; 2026-07-30 commit-bound local draft smoke passed four routes and browser checks at 390/1440 without login, overflow, or console errors | Real operator/contact values, final retention table, published-mode remote public-page and real support-case smoke, incident drill, dated product/legal/accounting/privacy approvals |
| `RELEASE-CANARY` | A bounded production cohort proves the release before general availability | `pending_external` | not started | Go/no-go record, rollback owner, daily review window, zero unresolved release-blocking defects |

## Required order from current state

1. Push the Web CI gate and obtain a green GitHub Actions run.
2. Confirm the intended Supabase environment, apply `066`, and collect F3A live evidence.
3. Run the production-surface and PWA resource smokes locally and against the selected deployment.
4. Create isolated Team role fixtures and finish the live state-transition matrix.
5. Complete production configuration and media staging evidence without enabling billing.
6. Finish NewebPay merchant/API activation while implementing only separately approved
   F3B-F3E slices.
7. Implement S9 provider runtime and pass the complete billing sandbox matrix.
8. Resolve the promotion launch decision, observability, legal/support, staging E2E, and
   production canary gates.

## Go/no-go rule

General availability is `NO-GO` while any row above is `pending_external`,
`pending_approval`, or `evidence_missing`. `implemented_local` becomes `complete` only
after the matching remote or production evidence exists. No single local build, payment
smoke, migration apply, or UI walkthrough can override this matrix.
