# Supabase SRA-A1 Remote Migration-History Strategy

Date: 2026-08-26

Status: security-owner approved Docker rehearsal plus exact Production metadata-only reads; all remote writes and deployment prohibited

Related task: `SEC-REMEDIATION` (`pending_approval`)

## Decision and supersession

The security owner approved replacing the cloud-staging requirement with a new
disposable Docker Supabase environment plus a bounded read-only check of the exact
SRA-000 Production target. A separate cloud non-Production project is not required.
This supersedes the earlier targetless/cloud-staging-only version of this document.

Keep the remote-history-first, forward-only, disposable release workspace principle:
actual target metadata is authoritative, but this does not grant mutation authority.
Platform impact: operations SQL and tests only; no shared business logic, Web/device
API, Capacitor dependency, or application runtime is changed.

## Exact authorization

- Match the SHA-256 of the Dashboard project reference to the SRA-000 fingerprint
  `9b9284e718b0...` before any database query.
- Read only migration history metadata, the four SRA-A1 function definitions/owners/
  configuration/EXECUTE ACLs, and their trigger bindings. PostgreSQL version is
  compatibility metadata. Do not read application or Auth user rows.
- All queries use `BEGIN; SET TRANSACTION READ ONLY;`, bounded timeouts, and
  terminal `ROLLBACK;`.
- Do not export migration statement bodies, database dumps, credentials, or customer
  data. Raw function/ACL evidence stays in private local storage outside Git.
- New disposable Docker bootstrap and synthetic tests are allowed. Do not reset,
  delete, or reuse unrelated local databases.
- No remote `db push` (including dry-run), `migration fetch`, `migration repair`,
  provider changes, grants, function replacement, or deployment is authorized.

## Current findings and publication stop

The repository has two files using version `012` and three files using version
`20240220`. The matched Production preflight reports that
`supabase_migrations.schema_migrations` is absent (not an empty known ledger).
Therefore neither `072` nor any other version is approved for remote deployment.
Do not create the ledger, stamp old migrations applied, infer applied versions from
filenames, or run the repository migration chain against Production.

Three target function definitions match the earlier local evidence byte-for-byte.
The market function has different raw hashes but the same migration-056 body after
CRLF/LF normalization. All four live ACL baselines include explicit client grants,
unlike the earlier local ACLs. Trigger names, enabled state and bindings match.

Keep the original local draft immutable as historical evidence. A separate
observed-baseline local review draft may pin the actual hashes and ACLs for Docker
rehearsal; it must not replace function bodies, add a numbered migration, or relax
preflight matching.

## Docker rehearsal sequence

1. Create a uniquely named local project with dedicated ports and no linked project.
2. Replay the documented phased local bootstrap through 071. This is supporting
   fixture schema, not proof that Production has all those migrations.
3. Install only the four reviewed function definitions/ACL baselines captured by the
   approved reads, on localhost. Verify exact hashes and trigger metadata.
4. Prove the old draft rejects the observed baseline before any hardening persists.
5. Apply the observed-baseline review draft on localhost only. Run synthetic Auth,
   market, active staff membership, product create/update/delete tests and role ACL
   checks; rollback synthetic rows.
6. Prove repeat application rejects drift. Re-read all four local definitions/ACLs;
   retain body identity, enabled trigger count, and denial evidence.
7. Stop only the newly created stack with no backup and retain sanitized evidence.

This is four-function parity on a synthetic schema, NOT a complete Production clone,
whole-schema equivalence proof, cloud provider regression, or release approval.
Any unexplained semantic difference is a stop condition; never normalize arbitrary
function-body changes to make a preflight pass.

## Later release decision

Because the ledger is absent, the previously proposed automatic CLI publication path
cannot be used. On 2026-08-31 the security owner selected Method A preparation:

- prepare one exact, hashed, transaction-bound SQL change using the existing manual
  change process and an external release record, without backfilling migration history.

The preparation package is documented in
`SUPABASE_SRA_A1_METHOD_A_RELEASE_PREPARATION_2026_08_31.md`. Production execution and
corrective-forward remain separate, unapproved decisions. A migration-history adoption
plan is not selected and remains outside this scope.

Update 2026-09-01: the fixed Method A forward transaction received separate execution
authorization, ran once on the fingerprint-matched Production target, and passed the
same-target fixed read-only postcheck. Corrective-forward remained unexecuted. Evidence:
`SUPABASE_SRA_A1_METHOD_A_PRODUCTION_EXECUTION_2026_09_01.md`. SRA-B/C/D and the parent
security remediation review remain outside this completed SRA-A1 execution slice.

Do not use `--include-all`. `migration repair` is not part of the normal SRA-A1 route.
If a future dry run proposes more than one migration, stop. Stop if the filename or
SHA-256 differs from the reviewed artifact. Production mutation or an uncertain
environment identity remains an immediate stop in this authorization.

The future authorization must record the exact target fingerprint, operator,
maintenance window/timezone, security/release reviewer, Migration SHA-256, baseline
hashes, execution method, smoke plan, and a separately reviewed corrective-forward
artifact. Missing information is not implied approval.

Automatic rollback is prohibited. A corrective-forward design must restore the exact
same-target pre-change configuration/ACL if separately approved, never application
data or function bodies. No such remote restore is authorized in this slice.

## Checklist rule

`SEC-REMEDIATION` remains `pending_approval`. Record this slice's evidence separately;
only actually verified local/read-only subtasks may be checked. SRA-B/C/D, missing
remote history, Production application and final security signoff remain open.
