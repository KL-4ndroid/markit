# SRA-A1 Production Read-only and Docker Rehearsal Evidence

Date: 2026-08-26

Status: bounded metadata inventory and observed-baseline Docker rehearsal passed;
Production remediation and migration-history adoption remain unapproved

## Authority and target

The user explicitly acted as `security_owner` and approved a Docker-based validation
route, reuse of the SRA-000 Production target for migration/function/ACL metadata-only
reads, and a new disposable local environment. No business data reads, remote writes,
deployment, migration-history repair, or provider setting changes were authorized.

The Dashboard project reference SHA-256 matched SRA-000:
`9b9284e718b0...`. Existing login was sufficient. The local `.env.local` points to a
different test project and was not used for Production queries. The Dashboard SQL
editor ran unsaved read-only queries; no snippet was saved.

Private raw metadata and four definitions are retained outside Git at
`local-vault:sra-a1/2026-08-26`. No credentials, customer rows, raw definitions or raw
ACL dump are included in this report. The Browser skill was used only because no
applicable Supabase connector was available; the existing authenticated Dashboard
session allowed narrowly scoped reads without credential extraction.

## Executed Production queries

All three used explicit `BEGIN`, `SET TRANSACTION READ ONLY`, a 15-second statement
timeout, a 3-second lock timeout, and terminal `ROLLBACK`.

| Query | SHA-256 | Result |
| --- | --- | --- |
| `sra_a1_production_read_only_preflight.sql` | `b2d318e49d9481c43dc2c3b2fc40a477c8b72d3071564376d9fa23b38ebf1cff` | 9 rows: environment + 4 functions + 4 triggers |
| `sra_a1_function_definition_read_only.sql` | `d073fb3889807ea1aea164922c60915d8230206e8dbf39a2614ed9aa04f116f5` | exactly 4 function definitions |
| `sra_a1_trigger_binding_read_only.sql` | `78b1902d81570d2527b317b172a13b1bd3342676d461c80a8683b831dcbfc085` | exactly 4 trigger bindings |

Database version: `170006` (PostgreSQL 17.6). The executed environment row confirmed
`transaction_read_only=on` and `migration_ledger_present=false`.

The conditional ledger query `sra_a1_migration_ledger_read_only.sql` was NOT executed:
`supabase_migrations.schema_migrations` does not exist. This is absent history, not
proof of zero applied schema changes. No migration statement bodies were read.

## Difference classification

| Target | Comparison with 2026-08-24 local evidence |
| --- | --- |
| `auto_add_staff_to_new_market()` | definition/body equal; ACL differs |
| `handle_new_user()` | definition/body equal; ACL differs |
| `update_market_read_model()` | raw hash differs only because of CRLF/LF; normalized body exactly equals migration 056; ACL differs |
| `update_product_read_model()` | definition/body equal; ACL differs |

All four remain zero-argument trigger functions, owned by postgres, SECURITY DEFINER,
with unset search_path and one enabled trigger bound to the expected table/name.
The live ACLs include explicit anonymous/authenticated EXECUTE grants as well as PUBLIC
execution, unlike the earlier local baseline. Service-role access also exists.

The exact observed market definition MD5 is `02f806361aaf8574f884d1f4843d1f1f`;
body MD5 is `3132d6bc9c4707d667001d080011cb8a`. No business logic was changed to reconcile
the line-ending difference. The old local draft remains byte-for-byte unchanged at
SHA-256 `137fd0b100cf9cafe9436622f8a6ab01242136d04e366727b70e9865db13926e`.

## Disposable local rehearsal

New project: `sra-a1-20260826`, database port `55322`, API port `55321`, unlinked.
CLI 2.115.0; Docker engine 29.7.2; local PostgreSQL 17.6 matched the observed major/minor.
The existing phased bootstrap files were copied into the new ignored local workdir and
replayed through repository 071. No previous local database was reset or reused.

Only the four observed function definitions/ACLs were overlaid on the synthetic schema.
This is four-function parity, NOT a complete Production clone or whole-schema parity.
No remote table schema, policies, Auth user data, or application rows were exported.

Manual runner: `scripts/verify-sra-a1-observed-baseline-local.mjs`, requiring
`--confirm-disposable-sra-a1-20260826 --catalog-file <private-catalog-path>`.
It refuses Docker endpoint overrides and requires the exact local named pipe,
container name and dedicated database port. It is not part of npm automation.

The first fixture attempt stopped on ACL ordering: existing local service-role ACL
preceded the newly granted client ACLs. The local fixture was corrected by clearing and
reconstructing only these four ACLs inside its local transaction. The reviewed draft
was not relaxed; exact observed ACL order and definition hashes were then reproduced.

Verified outcomes (machine-readable: `SRA_A1_DOCKER_REHEARSAL_2026_08_26.json`):

- [x] Exact four observed function definitions and ACL baselines reproduced locally.
- [x] Original draft rejected the observed baseline without persistent changes.
- [x] Observed-baseline local review draft applied only four search_path settings and four revokes.
- [x] Two synthetic Auth inserts produced two profiles.
- [x] Market creation and active staff membership produced one market and two memberships.
- [x] Product create/update/delete projection passed.
- [x] Anonymous/authenticated direct EXECUTE denied; service-role access retained.
- [x] Bodies and four enabled trigger bindings unchanged by hardening.
- [x] Repeated application rejected without persistent changes.
- [x] Synthetic transaction rolled back; zero Auth users, markets and products remained.
- [x] New local stack stopped with `--no-backup`; no other local stack was stopped.
- [ ] Remote release method for absent migration history approved.
- [ ] Corrective-forward artifact and final release package reviewed.
- [ ] Production change applied and same-target postcheck accepted.

Observed-baseline draft SHA-256:
`5dddee760b0f835343b8c5997eb53cc7a9c6f7910d0ce370304602d87a58193d`.

Only sanitized reports, source/tests and private metadata artifacts remain; disposable
database state was discarded and has no retained backup.

## Release boundary

No numbered migration, missing history table, history repair, or Production hardening
was applied. `SEC-REMEDIATION` remains `pending_approval`; SRA-B/C/D are untouched.

Next review must choose an explicit one-transaction manual SQL release with an external
change record, or a separately scoped migration-history adoption plan. The absence of
the ledger must never trigger automatic bootstrap, `db push`, `--include-all`, or
marking historical versions applied. Any eventual Production execution requires its
own exact target/hash/window/operator/reviewer and corrective-forward approval.
