# Account Deletion AD2 Local Foundation Evidence

Date: 2026-08-17

Result: `AD2_LOCAL_FOUNDATION_COMPLETE`

Boundary: local code and synthetic/static tests only; no migration application,
database repository, deployment, credentials, destructive test, or data mutation

## Implemented

- platform-neutral request/status contracts reject unknown targeting fields such as
  owner ID, staff ID, email, object key, and purchase token;
- POST requires policy revision, explicit pending-write resolution, bounded idempotency
  key, active-store billing acknowledgement, verified actor, and recent sign-in within
  five minutes;
- server HMAC derivation purpose-separates retained subject and idempotency hashes and
  refuses secrets shorter than 32 bytes;
- pending-write preflight reuses the canonical report, exposes bounded counts only,
  blocks report failure/actor mismatch, and never silently selects discard;
- leased saga foundation processes account-kind steps in the AD1 order, records only
  bounded result evidence, refuses invalid leases/request states, and delegates final
  completion to an atomic repository operation that must recheck lease and steps;
- `/api/account-deletion` GET/POST handlers are CORS-aware, bounded, authenticated,
  safe-status-only, and disabled unless both route and repository-ready flags are set;
- the default concrete repository intentionally returns unavailable because AD1 SQL
  has not been applied;
- the Settings legacy `delete_current_user_app_data()` caller was removed and replaced
  with a disabled, explicit “account deletion not enabled” state;
- paid Production configuration now fails unless all account-deletion flags are `0`
  and the account-deletion HMAC secret is absent.

## Synthetic Evidence

`tests/account-deletion-ad2-foundation.test.ts` proves:

- forbidden target/identity fields are rejected;
- recent, stale, missing, and invalid reauthentication outcomes fail closed;
- HMAC outputs are purpose-separated and secret length is enforced;
- clean, syncable, export/discard, actor-mismatch, and report-failure preflight paths;
- disabled route performs no authentication/repository work;
- Production route requires a separate production-allow flag;
- accepted responses do not expose actor, owner, email, object, or purchase-token data;
- saga starts from the first required step and cannot execute a further step after all
  completion evidence exists;
- the legacy Settings RPC call is absent and the replacement UI remains disabled.

Additional passing guardrails cover server authentication metadata, cache-destruction
safety, Settings information architecture, Production configuration, mobile TypeScript,
canonical launch/checklist consistency, and whitespace/error checks.

`npm.cmd run build` also completed successfully. Next.js compiled the new dynamic
`/api/account-deletion` route, completed TypeScript and page generation, and did not
enable the route or connect a repository.

## Remaining AD3 Boundary

AD3 must receive an exact disposable non-Production target and destructive-test
approval before it may:

1. promote/review the SQL draft into an actual numbered migration;
2. apply it to the named target and run catalog/RLS/grant verification;
3. implement the concrete server repository and atomic completion function;
4. deploy/enable the route with a protected HMAC secret;
5. replace/revoke the legacy RPC at the database boundary;
6. execute disposable owner/staff, R2 absence, retry, race, and restore tests.

Until then the runtime route cannot accept a real request and the native
`ACCOUNT-DELETION` gate remains `pending_approval`.
