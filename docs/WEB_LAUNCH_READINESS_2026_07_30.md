# BoothBook Web Launch Readiness

Date: 2026-08-01

Overall status: `NOT_READY`

Target: production Web launch with trustworthy Free, Pro, and Team behavior, paid
billing, operational recovery, and deployment evidence. This document tracks evidence;
it does not approve a blocked subscription, database, media, or billing slice.

## Evidence rule

Local success is not production evidence. A gate is complete only when its required
artifact and environment-specific result are both recorded. Repository tests cannot
prove that a migration, secret, object store, provider account, callback, or production
deployment is configured correctly.

External and human follow-up is consolidated in
`WEB_LAUNCH_MANUAL_ACTIONS_2026_08_01.md`.

Machine-readable gate states are mirrored in `WEB_LAUNCH_GATES_2026_08_01.json` and
validated with `npm.cmd run check:web-launch-readiness`. Both records must change in the
same reviewed commit.

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
| `CI-WEB` | Every PR and `main` push runs hex, lint, complete tests, secret-free production build, and clean-diff checks | `complete` | Push run `30699586931` passed both Node 24 jobs and every step on commit `cac6fa6f7ffcf02779b0f3e66fb00ec9f4314250` on 2026-08-01 | Preserve the gate and repeat it on the final release candidate revision |
| `LOCAL-QUALITY` | Current worktree passes lint, complete tests, production build, and `git diff --check` | `complete` | 2026-08-01 local full lint, complete manifest, production build, hex/diff checks, and changed-file credential-pattern scan passed on `cac6fa6`; the exact revision also passed CI on required Node 24 | Repeat on release candidate revision |
| `DB-063-065` | Shared capability and Team enforcement migrations are live | `complete` | user-confirmed apply plus prior RPC/structural smoke | Preserve dated environment and smoke output in release evidence |
| `DB-066` | F3A private candidate price catalog foundation is live and denied to direct clients | `pending_external` | User-confirmed apply on 2026-08-01; anon and server-secret table probes denied with `42501`; authenticated browser session passed all 12 table and 3 function probes; capability and Team read regressions passed | Record masked target/hash/timestamp; all read-only verifier rows true; Security Advisor result recorded |
| `TEAM-LIVE` | Server-authoritative Free/Pro/Team mutation, downgrade, re-upgrade, and restore behavior is proven | `complete` | 2026-08-01 isolated 57-check live run passed direct-write and Free/Pro denial, Team invitation and viewer/operator/manager transitions, downgrade suspension, no-auto-restore, explicit restore, cleanup, and zero-residual audit | Preserve the guarded smoke and repeat against the selected release environment; deployment UI evidence remains under `STAGING-E2E` |
| `PROD-CONFIG` | Production Supabase, CORS, cron, R2, media gates, and server secrets are configured | `evidence_missing` | Read-only preflight implemented; 2026-08-01 local `.env.production.local` snapshot is 4/17 passing and is not Vercel evidence | Passing preflight against deployed names, dated Vercel review with no values, and production route smoke |
| `PROD-SURFACE` | Debug pages and dev subscription API are unreachable while the static fake-data demo remains public | `complete` | 2026-08-01 stable Production alias passed the aggregate commit-bound production-surface, PWA-resource, draft legal-page, and API-boundary release smoke on `cac6fa6` | Preserve the smoke and repeat it on the final release candidate revision |
| `DEPLOY-IDENTITY` | Remote smoke proves it reached the intended release revision | `complete` | Vercel status target `Fhoqn6RYz5BJBDeTL3CEx9JiJv82` succeeded; stable alias health and all four aggregate release smokes matched `cac6fa6`, version `0.1.0`, build time `2026-08-01T12:23:18.390Z` | Preserve deployment/health identity and repeat it on the final release candidate revision |
| `SECURITY-HEADERS` | Pages and APIs receive the reviewed baseline without breaking PWA/media/auth flows | `pending_external` | 2026-08-01 aggregate commit-bound Production API, page, legal, and PWA smokes passed exact headers on `cac6fa6`; authenticated Free owner analytics/report/Team pages produced no browser warning or error | Unrelated-origin HTTPS anti-frame evidence and final release-candidate repeat |
| `PWA-WEB` | Manifest assets, service-worker lifecycle, install presentation, responsive shell, and app shortcuts work | `pending_external` | 2026-08-01 aggregate commit-bound Production smoke on `cac6fa6` passed 9 unique assets, manifest, service worker, and demo; prior browser checks remained controlled and responsive with one main landmark | Real desktop/Android-class install and launch, update activation, owner/staff shortcut smoke, install screenshots |
| `MEDIA-PROD` | Product-cover and sales-evidence storage paths are production-ready at approved entitlement modes | `evidence_missing` | local tests and guides exist | Migration/R2/CORS/quota/cleanup evidence and authorized/unauthorized production smoke |
| `STAGING-E2E` | Owner, staff roles, Free/Pro/Team, offline recovery, PDF, and media workflows pass in a production-like deployment | `evidence_missing` | 57-check live Team transition smoke passed. On `cac6fa6`, an authenticated Production Free owner passed recent-three/basic-summary access and Pro/Team/PDF denial with no browser errors; the current local Free/Pro/Team simulator matrix also passed without cloud writes. Sanitized partial evidence is in `WEB_AUTHENTICATED_RELEASE_MATRIX_2026_08_01.md`; paid deployment roles, offline recovery, inspectable PDF output, and media remain open | Signed staging matrix for required viewports, roles, account states, and recovery cases |
| `BILLING-MERCHANT` | NewebPay recurring payment merchant, API, sandbox, refund, and reconciliation capabilities are approved | `pending_external` | provider decision is conditional | Dated merchant/API activation evidence and sanitized sandbox fixtures |
| `F3B-F3E` | Billing event ledger, projection writer, quote/obligation, and support audit slices are implemented | `pending_approval` | F3 design and F3A local foundation only | Separate reviewed migrations, adversarial tests, live verification, rollback and operations evidence per slice |
| `S9` | Provider adapter, callback, reconciliation, checkout, cancellation, refund, and entitlement mutation are implemented | `pending_approval` | S8 decision and billing contracts only | Complete billing test matrix, staging lifecycle evidence, security review, support runbooks, production canary approval |
| `PROMOTION-RUNTIME` | Launch referral attribution and Pro Pass rewards are abuse-resistant and reconciled with paid billing policy | `pending_approval` | policy/design only | Approved P1-P4 slices or an explicit decision to launch without the promotion |
| `OBSERVABILITY` | Health, callback backlog, reconciliation delay, payment failures, media cleanup, and sync incidents are observable | `implemented_local` | `cac6fa6` provides the health route, bounded schema-v1 sales-photo events, pure fail-closed 36-hour threshold evaluator, safe CLI, deterministic tests, and incident runbook; exact CI and Production deployment passed, while production sink, routing, sync signals, and future billing signals remain absent | Production dashboards/alerts with equivalent policy, delivery proof, primary/backup owner, escalation, retention/access review, incident drill, and later S9 billing signals |
| `LEGAL-SUPPORT` | Terms, privacy, billing/refund/cancellation, data retention, support and incident policies are approved | `evidence_missing` | exact public routes and fail-closed configuration; 2026-08-01 aggregate commit-bound Production `draft` smoke passed four routes on `cac6fa6` without treating placeholders as publication | Real operator/contact values, final retention table, published-mode remote public-page and real support-case smoke, incident drill, dated product/legal/accounting/privacy approvals |
| `RELEASE-CANARY` | A bounded production cohort proves the release before general availability | `pending_external` | not started | Go/no-go record, rollback owner, daily review window, zero unresolved release-blocking defects |

## Required order from current state

1. Complete the remaining migration 066 verifier and Security Advisor evidence.
2. Complete the remaining install/update, unrelated-origin anti-frame, and authenticated
   owner/staff production-like browser matrix against the selected deployment.
3. Complete production configuration and media staging evidence without enabling billing.
4. Finish NewebPay merchant/API activation while implementing only separately approved
   F3B-F3E slices.
5. Implement S9 provider runtime and pass the complete billing sandbox matrix.
6. Resolve the promotion launch decision, observability, legal/support, staging E2E, and
   production canary gates.

## Go/no-go rule

General availability is `NO-GO` while any row above is not `complete`.
`implemented_local` becomes `complete` only after the matching remote or production
evidence exists. No single local build, payment smoke, migration apply, or UI walkthrough
can override this matrix or the signed go/no-go record.
