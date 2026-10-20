# Account Deletion AD3A Local Foundation Evidence

Date: 2026-08-17

Status: complete; repository implementation and disposable local Supabase execution verified on 2026-08-21

Authorization: Step 2J / AD3A approved a brand-new disposable local Supabase target,
destructive synthetic DB/RLS/race tests, and fake R2 only. It did not authorize any
remote or Production project.

## Completed automatically

- Promoted the AD1 rollback draft into numbered migration
  `supabase/migrations/071_add_account_deletion_request_foundation.sql`.
- Added private request, cleanup-step, and immutable transition-audit tables with RLS
  enabled and no direct grants to client roles or `service_role`.
- Added narrow server-only `SECURITY DEFINER` RPCs for request create/read, lease claim,
  step recording, completion, and lease release. Only `service_role` receives execute.
- The create RPC derives the actor from the authenticated server result. It does not
  accept owner ID, staff ID, email, or object keys. An actor with any owner evidence is
  conservatively classified as owner; otherwise the shorter staff path is used.
- Revoked authenticated execution of the legacy
  `delete_current_user_app_data()` RPC in the migration cutover.
- Added `lib/subscription/account-deletion-storage.server.ts` and wired the disabled-by-
  default account-deletion route to the concrete RPC repository.
- Added static/RPC-shape/synthetic-lease guardrails in
  `tests/account-deletion-ad3a-migration-repository.test.ts`.
- Added a fail-closed local prerequisite check. It refuses a non-local Supabase URL and
  performs no destructive operation.

## Verification completed

- `tests/account-deletion-ad3a-migration-repository.test.ts`: pass.
- AD1 and AD2 focused regression tests: pass.
- Repository-level TypeScript errors introduced by AD3A: fixed. The full repository
  typecheck still contains pre-existing unrelated test-fixture errors and is not used
  as AD3A completion evidence.

## Disposable local database execution — 2026-08-21

Docker Desktop 29.7.2 and Supabase CLI 2.115.0 were used. The final isolated stack
was `ad3a-local-workdir-v6`, exposed only on `127.0.0.1`. The repository's
documented phased disposable bootstrap supplied corrected 001–052 history, followed
by the exact 053–071 migration files. Migration 071 compiled and applied successfully
to PostgreSQL 17.6.

The first clean rebuild exposed three pre-existing migration/bootstrap defects before
071 was reached:

1. duplicate archive versions `012` and `20240220` prevent a direct CLI rebuild;
2. the archive orders `staff_relationships` after migration 021 and omits the documented
   disposable `sync_status` compatibility patch;
3. phase-3 bootstrap v6 declared PostgreSQL boolean `prosecdef` as text, and migration
   059 used `LOCK TABLE` without a transaction block.

The final run used the repository's intended phased disposable bootstrap. The v6 type
regression and migration 059 transaction boundary were corrected in source before the
clean rebuild. No historical migration was renamed or rewritten for a remote target.

`supabase/tests/account_deletion_ad3a_local.sql` then committed destructive synthetic
owner and staff lifecycles and proved:

- owner/staff account-kind derivation and same-actor idempotency;
- cross-actor idempotency collision denial;
- RLS enabled, no direct table grants, service-role-only RPC execution, and legacy
  authenticated deletion RPC revocation;
- a second lease claim is rejected, release/reclaim succeeds, and completion is denied
  until all required steps carry bounded evidence;
- deleting synthetic Auth users removes profiles/workspace data while durable requests
  remain able to complete with `active_actor_id = NULL`;
- two requests completed, all required steps completed, eight transition-audit rows
  remained immutable, terminal requests could not transition backwards, and zero
  synthetic profiles remained.

A separate real two-session race held the winning transaction open for two seconds.
Exactly one worker returned `claimed:true`; the competing worker returned
`claimed:false` after the row lock released.

`tests/account-deletion-ad3a-fake-r2.test.ts` deleted a three-object owner manifest,
verified every object was absent, preserved an unrelated owner's object, and proved an
entitlement-only restore could not recreate purged workspace objects. Evidence hash:
`71520332b1462971811e0143f21933d214dc3ec5a3007444bb7e72f7bf725f31`.

`supabase db lint --level error` reported no AD3A function issue. It did surface one
pre-existing unrelated ambiguity in `public.get_market_members` (`user_id` can refer to
a PL/pgSQL output variable or table column); this remains separate migration debt and
does not invalidate the executed AD3A lifecycle assertions.

No `.env.local` credentials were loaded, no remote project was linked or contacted,
and no customer data was used. AD3's approved disposable local evidence scope is now
complete; deployment, real store/device lifecycle, public-policy alignment, and
Production authorization remain AD4/AD5.
