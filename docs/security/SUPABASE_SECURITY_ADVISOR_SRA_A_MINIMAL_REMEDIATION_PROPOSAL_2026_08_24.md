# Supabase Security Advisor SRA-A Minimal Remediation Proposal

Date: 2026-08-24

Status: proposal accepted; review/local implementation and disposable evidence complete;
numbered migration, non-Production execution, and Production execution are not approved

Related task: `SEC-REMEDIATION` (`pending_approval`)

## 1. Decision requested

Approve a later, separately reviewed **SRA-A1 implementation slice** that changes only
the configured search path and client EXECUTE privileges of four live, no-client
SECURITY DEFINER trigger functions. This document does not create a migration, choose a
remote migration version, contact Supabase, change a provider setting, or authorize any
deployment.

The proposed implementation must remain one transactional, metadata-only hardening
batch. It must not change a function body, owner, signature, language, volatility,
return type, trigger binding, application caller, table policy, view, row, or provider
configuration.

## 2. Evidence basis

The 2026-08-24 Production SRA-000 inventory completed all eight canonical sections with
441 catalog rows. It confirmed nine functions without a configured search path and
SECURITY DEFINER EXECUTE exposure to anonymous and authenticated roles. Sanitized
evidence is retained in
`docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_EVIDENCE_2026_08_24.md`; exact live
definitions and ACLs remain only in the restricted evidence vault.

Repository analysis confirms that the four functions below are trigger entry points and
have no application RPC caller. Their current migration definitions are SECURITY
DEFINER without a fixed search path:

| Function | Trigger path | Latest repository definition | Proposed SRA-A1 treatment |
| --- | --- | --- | --- |
| `public.update_market_read_model()` | `events` insert projection | `056_wire_sales_photo_evidence_market_projection.sql` | fixed search path; remove client EXECUTE |
| `public.update_product_read_model()` | `events` insert projection | `014_products_ownership.sql` | fixed search path; remove client EXECUTE |
| `public.handle_new_user()` | `auth.users` insert | `018_auto_create_profile.sql` | fixed search path; remove client EXECUTE |
| `public.auto_add_staff_to_new_market()` | `markets` insert | `021_auto_add_staff_to_markets.sql` | fixed search path; remove client EXECUTE |

The live inventory, not repository history, is authoritative. A function is admitted to
SRA-A1 only if a same-target preflight proves the exact zero-argument signature,
SECURITY DEFINER mode, expected owner, expected trigger binding, current definition
hash, current `proconfig`, and current ACL. Any mismatch blocks the whole batch.

## 3. Explicit exclusions

SRA-A1 does not include:

- `staff_accessible_markets`, `staff_accessible_products`, or
  `staff_accessible_events`; those remain SRA-C1 through SRA-C3;
- always-true `markets` or `products` INSERT policies; those remain SRA-B;
- `verify_invitation_token(text)`, any legitimate application RPC, legacy RPC, or
  server-only media/subscription function;
- the other live missing/mutable-search-path candidates until each has an exact caller,
  dependency, owner, body, trigger, and ACL classification;
- leaked-password protection or any Auth/provider setting; that remains SRA-D;
- billing/account-deletion service tables and the 12 informational findings;
- function recreation, data repair, table writes, trigger replacement, view changes,
  RLS changes, application adapter changes, or Advisor bulk-fix actions.

This exclusion is fail-closed: uncertainty does not widen SRA-A1.

## 4. Proposed SQL shape — implementation guidance only

The later implementation should prefer `ALTER FUNCTION` over `CREATE OR REPLACE
FUNCTION`, because the intended change is configuration and privilege metadata only.
For each admitted exact signature, the reviewed migration should:

1. start one transaction and set bounded `lock_timeout` and `statement_timeout`;
2. assert the expected function identity, owner, SECURITY DEFINER state, definition
   hash, trigger binding, existing search-path setting, and ACL from the fresh preflight;
3. set `search_path` to `pg_catalog, public`;
4. revoke direct EXECUTE from `PUBLIC`, `anon`, and `authenticated`;
5. assert that no client role retains EXECUTE and all expected triggers remain enabled
   and bound to the same function OIDs;
6. commit only if every assertion passes.

All referenced objects in future function-body revisions must be schema-qualified. SRA-A1
does not itself rewrite the bodies. The order `pg_catalog, public` reduces name-shadowing
risk while retaining compatibility with the currently unqualified references; the
non-Production trigger matrix must prove that assumption before Production is considered.

No numbered migration may be authored until the remote migration-history strategy is
approved and the next version is proven collision-free. In particular, this proposal
does not assume that `072` is available remotely.

## 5. Why trigger execution should survive the ACL change

The four functions are reached through database triggers, not client RPC calls. Removing
client EXECUTE is therefore the intended least-privilege state. This is still an
assumption that must be proven on the disposable/local stack and a separately authorized
non-Production target: direct RPC calls by `anon` and `authenticated` must fail, while
the same database operations must continue to fire their triggers successfully.

If any real client, scheduled job, webhook, extension, or external integration is found
to invoke one of these functions directly, SRA-A1 stops. The proposal must be revised;
the migration must not preserve a broad grant merely to make an unexplained caller pass.

## 6. Required implementation and test evidence

### 6.1 Static guardrails

- a new migration changes only the four admitted exact function signatures;
- it contains no table/view/policy/trigger replacement, DML, provider setting, secret,
  project reference, or customer identifier;
- it uses bounded timeouts, exact preconditions, `ALTER FUNCTION ... SET search_path`,
  and exact revokes;
- it neither grants EXECUTE nor uses `CASCADE` or dynamic SQL;
- repository search still finds no application RPC caller for the four functions.

### 6.2 Disposable/local database

- migration applies once and is idempotently rejected or proven already-correct on an
  unexpected second application;
- `anon` and ordinary `authenticated` cannot directly execute any target function;
- an inserted `market_created` event still produces the expected market projection;
- product create/update/delete events still produce the expected product projection;
- a synthetic new auth user still creates exactly one profile;
- a new owner market still adds only active staff relationships and creates no duplicate
  membership;
- owner, viewer, operator, manager, unrelated authenticated, and cross-owner boundaries
  remain unchanged;
- pre/post catalog evidence proves identical owners, bodies, signatures, trigger OIDs,
  enabled states, and dependencies, with only `proconfig` and ACL changing as approved.

### 6.3 Repository and release regression

- focused migration/static tests, event projection tests, profile bootstrap tests, staff
  relationship tests, role/RLS tests, complete `npm.cmd test`, and Production Web build;
- canonical SRA inventory query rerun on the non-Production target;
- Advisor delta reports only the expected warnings removed and no new error/warning;
- test/build leave tracked files unchanged.

## 7. Corrective-forward and rollback boundary

Before execution, retain a sanitized hash of each exact prior definition, owner,
`proconfig`, ACL, and trigger binding. Raw definitions remain restricted and never enter
Git.

If a non-Production trigger regression occurs, stop traffic to the test fixture and apply
a separately reviewed corrective-forward migration restoring only the recorded prior
`proconfig` and required ACL. Do not modify or delete application data, drop triggers,
restore broad grants speculatively, or use a destructive database rollback.

Production must not use an automatic rollback. A Production proposal must define an
exact corrective-forward artifact before approval. Any evidence of missing projection,
failed profile creation, missing staff membership, elevated access, or cross-owner access
is an immediate stop condition.

## 8. Approval and execution gates

The following are separate decisions:

1. **Proposal acceptance — complete 2026-08-24:** security owner accepted this SRA-A1
   scope.
2. **Review/local implementation — complete 2026-08-24:** exact local-only SQL draft,
   static tests, and disposable evidence passed. No remote target was contacted.
3. **Non-Production authorization:** approve one exact target, migration hash, operator,
   maintenance window, evidence reviewer, and corrective-forward artifact.
4. **Production authorization:** only after non-Production evidence, a fresh Production
   read-only preflight, remote migration-history approval, release-bound smoke plan, and
   security/release-owner go/no-go.

Evidence: `docs/security/SUPABASE_SECURITY_ADVISOR_SRA_A1_LOCAL_EVIDENCE_2026_08_24.md`.

`SEC-REMEDIATION` remains `pending_approval`. It may become complete only after all
approved SRA batches, including separately scoped SRA-B/C/D work as applicable, have
accepted execution evidence. Completing this proposal does not automatically check the
parent remediation task.

## 9. Proposed next approval wording

`核准 SRA-A1 implementation：僅建立四個 no-client trigger functions 的固定 search_path／EXECUTE revoke migration、靜態測試與 disposable local evidence；不接觸 remote 或 Production。`
