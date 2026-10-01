# Supabase Security Advisor SRA-A1 Local Evidence

Date: 2026-08-24

Status: review/local implementation and disposable localhost evidence complete;
non-Production, remote migration, and Production execution not approved

Authorization: the security owner approved only four no-client trigger functions,
fixed `search_path`, client EXECUTE revocation, static tests, and disposable local
evidence. No remote or Production access was authorized.

## Execution boundary

- Target: disposable localhost Supabase only; `linked_project` was null.
- Docker Desktop: 29.7.2.
- Supabase CLI: 2.115.0.
- Bootstrap: the documented phased local bootstrap through repository migration 071.
- Review SQL:
  `docs/security/drafts/SRA_A1_LOCAL_REVIEW_MIGRATION.sql`.
- Review SQL SHA-256:
  `137fd0b100cf9cafe9436622f8a6ab01242136d04e366727b70e9865db13926e`.
- Synthetic test:
  `supabase/tests/sra_a1_local.sql`.
- Synthetic test SHA-256:
  `4486c319de4706595cb5c04233e97cdd89236ebdd1d8c20c8fe81c25d7575633`.

The review SQL remains outside `supabase/migrations`. No remote-safe version number was
selected because the remote migration-history strategy is still unapproved.

## Clean local bootstrap

A direct repository-root `supabase start` stopped at the pre-existing duplicate migration
version `012`; it did not reach SRA-A1. The approved disposable run therefore reused the
repository's documented phased local bootstrap, which assigns unique local-only sequence
numbers without rewriting remote history. It applied the phased baseline through 071 on a
fresh localhost schema before SRA-A1.

No `.env.local` credential, linked project, remote database URL, customer row, or provider
setting was used.

## Exact-scope migration result

The preflight admitted exactly these four zero-argument SECURITY DEFINER trigger
functions:

- `public.update_market_read_model()`;
- `public.update_product_read_model()`;
- `public.handle_new_user()`;
- `public.auto_add_staff_to_new_market()`.

For all four functions:

- the expected owner was `postgres`;
- the preflight definition hash, body hash, original ACL, and one enabled trigger binding
  matched the phased local baseline;
- `search_path` changed from unset to exactly `pg_catalog, public`;
- EXECUTE became false for `anon` and `authenticated`, with no PUBLIC EXECUTE entry;
- body hashes, owners, SECURITY DEFINER mode, and enabled trigger counts remained
  unchanged.

The migration draft executed one transaction and completed all four `ALTER FUNCTION`
operations, four exact revokes, and its postcheck. A second application was rejected at
the expected preflight drift guard; it did not silently reapply or widen scope.

## Disposable trigger evidence

The final synthetic transaction passed and rolled back with this bounded result:

```json
{
  "ok": true,
  "targetFunctionCount": 4,
  "profileTriggerCount": 2,
  "marketProjectionCount": 1,
  "marketMembershipCount": 2,
  "productProjectionCount": 1,
  "transactionOutcome": "rolled_back"
}
```

This proves on the disposable baseline that:

- two synthetic Auth inserts still created exactly two profiles;
- one `market_created` event still created one market projection;
- the market trigger added exactly the owner and one active staff member without a
  duplicate;
- product create, update, and delete events still produced the expected final product
  projection;
- direct client EXECUTE privileges remained absent while trigger execution succeeded;
- the rollback left zero synthetic Auth users, markets, and products.

The first fixture attempt used an invalid synthetic product category and was rejected by
the existing `products_category_check`. PostgreSQL aborted that transaction and retained
zero fixture rows. The fixture was corrected to the existing legal category `other`; no
runtime or schema behavior was changed to make the test pass.

## Read-only catalog and lint evidence

The canonical read-only inventory query completed on localhost after SRA-A1 with 357
output lines and SHA-256
`8b2995aedd1c9e32064e6a6687dbc375eb73b60a3f7a26549c563b414f58b498`.
Raw local catalog output was not committed.

`supabase db lint --level error` reported only the pre-existing unrelated ambiguity in
`public.get_market_members` (`user_id` variable versus column). It reported no SRA-A1
target-function error. This existing issue is not broadened into SRA-A1.

## Outcome and next boundary

SRA-A1 review/local implementation and disposable evidence pass. This does not complete
`SEC-REMEDIATION`, create a deployable numbered migration, approve a non-Production or
Production target, or close SRA-B/C/D findings.

Historical boundary superseded 2026-08-26: the security owner approved a fresh Docker
rehearsal and bounded metadata-only Production reads on the SRA-000 target. The new
evidence is in `SUPABASE_SRA_A1_PRODUCTION_READ_ONLY_DOCKER_EVIDENCE_2026_08_26.md`.
All remote writes remain prohibited. No numbered migration is approved, and no missing
remote ledger is created or repaired. The original local draft remains unchanged.

After evidence capture, the disposable local Supabase stack was stopped with no backup.
Only the sanitized repository evidence and local-only test artifacts remain.
