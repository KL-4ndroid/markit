# Supabase SRA-A1 Method A Release Preparation

Date: 2026-08-31

Status: fixed-hash package prepared and locally/static verified; forward executed once
and read-only postcheck accepted 2026-09-01; corrective-forward is NOT authorized

Related task: `SEC-REMEDIATION` (`pending_approval`)

## Approved preparation boundary

The `security_owner` approved Method A preparation only: one fixed-hash transaction,
one separately gated corrective-forward transaction, one metadata-only postcheck, and
step-by-step human instructions. No Production query or write was performed while
preparing this package.

This is an operations-only artifact. It changes no shared business logic, Web/device
API, Capacitor package, native project, application runtime, or customer data path.

## Fixed artifacts

The machine-readable source of truth is
`docs/security/SRA_A1_METHOD_A_RELEASE_MANIFEST_2026_08_31.json`.

| Purpose | File | SHA-256 |
| --- | --- | --- |
| One-transaction forward change | `docs/security/release/SRA_A1_METHOD_A_TRANSACTION.sql` | `480d08b201e26db7204a661963ccdc826c1b6154252e2ef912255eb31d868e52` |
| Corrective-forward, never automatic | `docs/security/release/SRA_A1_METHOD_A_CORRECTIVE_FORWARD.sql` | `ddfccf5fe2c3fd1fa5eaa83ba919554132d911769230ec32faaa10dd880dc80d` |
| Read-only smoke/postcheck | `supabase/verification/sra_a1_method_a_postcheck_read_only.sql` | `3645ffd919b2b8ee15449af76b9aca906218bc7aae4136e83bfc4635c767caa0` |

Any byte change produces a new hash and cancels a future execution authorization.
Do not copy fragments into another file, add a numbered migration, use `db push`, or
create/backfill/repair `supabase_migrations.schema_migrations`.

## Disposable local verification

The fixed artifacts were exercised on a new local-only Supabase/PostgreSQL 17 stack
named `sra-a1-method-a-20260831` using dedicated database port `55422`. The synthetic
baseline first reproduced the four accepted Production definitions/ACLs. Because the
CLI bootstrap creates its own local migration ledger, only this already-verified
disposable database had that table removed to reproduce the accepted Production
`migration_ledger_present=false` precondition.

The fixed forward transaction passed, the fixed read-only postcheck returned `ok=true`
and `assertion_guard=1`, the corrective-forward restored the exact original definition/
body/ACL/trigger baseline, and a repeated corrective-forward rejected without a
persistent change. The stack was stopped with `--no-backup`; zero matching containers
and volumes remained. Sanitized machine evidence:
`docs/security/SRA_A1_METHOD_A_LOCAL_REHEARSAL_2026_08_31.json`.

This rehearsal did not contact Production and is not execution authorization.

## What the transaction can change

The forward transaction first requires the exact observed definition/body/ACL and
single trigger binding for all four zero-argument SECURITY DEFINER functions. It then:

1. sets `search_path=pg_catalog, public` on exactly four functions;
2. revokes EXECUTE from PUBLIC, `anon`, and `authenticated` on exactly four functions;
3. checks that bodies and trigger bindings did not change;
4. checks that only postgres and `service_role` retain the expected explicit EXECUTE
   ACL entries; and
5. commits only if every preflight and postcheck passes.

It contains no function replacement, trigger change, table/policy change, business-row
query, migration-history mutation, or application deployment.

## Human execution guide — not active yet

Do not begin these steps until a new approval records the exact manifest release ID,
forward hash, target fingerprint, operator, maintenance window with timezone, release
reviewer, and acceptance criteria. Preparation approval is not execution approval.

### Step 0 — obtain the separate execution authorization

Required record:

| Field | Current value |
| --- | --- |
| Release ID | `SRA-A1-METHOD-A-20260831-PREP-01` |
| Target fingerprint | fixed in the private/manifest comparison; raw project ref must not enter Git |
| Operator | `user_self` |
| Maintenance window | `2026-09-01T10:13:18+08:00/2026-09-01T11:43:18+08:00` (`Asia/Taipei`) |
| Release reviewer | `user_self` |
| Forward SHA-256 | `480d08b201e26db7204a661963ccdc826c1b6154252e2ef912255eb31d868e52` |
| Corrective-forward authorized | **no** |

Accepted authorization wording:

> 我以 security_owner／release_owner 核准 SRA-A1 Method A Production execution：目標指紋、release ID、operator、maintenance window 與 reviewer 已填妥；僅允許執行固定 SHA-256 forward transaction 一次及 read-only postcheck。corrective-forward 仍禁止，除非另行核准。

### Step 1 — freeze and verify the release package

1. Work from the reviewed Git commit; confirm the working copy of all three artifacts
   has no edits.
2. Recompute SHA-256 locally and compare all 64 characters with the manifest.
3. If any hash differs, stop. Do not repair the file during the window; prepare a new
   reviewed release ID instead.
4. Confirm the manifest says `execution.authorized=true` and points to the accepted,
   sanitized execution evidence. The underlying authorization record remains outside Git.

### Step 2 — identify the exact Production target without exposing its reference

1. Open the existing authenticated Supabase Dashboard session.
2. Confirm the environment label is Production.
3. Privately hash the visible project reference and compare it with the manifest's full
   `targetFingerprintSha256`. Never paste the raw reference into chat, SQL, screenshots,
   Git, or the evidence report.
4. A mismatch or uncertain environment is an immediate stop.

### Step 3 — repeat the bounded read-only preflight

1. Use a new unsaved SQL Editor query.
2. Run `supabase/verification/sra_a1_production_read_only_preflight.sql` unchanged.
3. Require `transaction_read_only=on`, database major 17,
   `migration_ledger_present=false`, exactly four functions and four trigger rows.
4. Compare definition/body/ACL and trigger metadata with the accepted 2026-08-26
   evidence. Do not read business or Auth user rows.
5. Any difference stops the release. Do not edit the forward SQL to accommodate drift.

### Step 4 — execute the fixed forward transaction once

1. Open another new unsaved SQL Editor query on the same verified target.
2. Paste the complete contents of `SRA_A1_METHOD_A_TRANSACTION.sql` without editing.
3. Reconfirm the forward SHA-256 from the local file immediately before Run.
4. Press Run once. Do not retry after an error.
5. Success requires the entire batch to reach `COMMIT`. A preflight/postcheck exception
   means the transaction is not accepted; issue no manual grants or ALTER statements.
6. Retain only sanitized timestamp, release ID, hash, operator and success/failure
   status. Do not save raw definitions, ACL dumps, credentials, or customer data.

### Step 5 — run and accept the read-only smoke/postcheck

1. In a new unsaved query, paste the complete fixed postcheck artifact.
2. Press Run once. It is transaction-read-only and queries only PostgreSQL catalogs.
3. Accept only a row with `ok=true`, `assertion_guard=1`,
   `transactionReadOnly="on"`, `migrationLedgerPresent=false`, and four all-true
   function results.
4. Reconfirm that the target fingerprint, forward hash and operator match the execution
   record. A successful SQL result from another target is not evidence.

### Step 6 — failure handling and corrective-forward boundary

- If the forward transaction raises an exception before COMMIT, stop and capture the
  sanitized error label. Do not retry or run corrective-forward.
- If the transaction reports success but the separate postcheck fails, stop and notify
  the security/release owner. Do not make ad-hoc changes.
- The corrective-forward file is a prepared option, not an automatic rollback. It may
  run only after a new approval identifies the same target/execution record, documents
  why forward correction is unsafe, and explicitly authorizes its exact hash.
- After an approved corrective-forward, rerun the original 2026-08-26 read-only
  preflight and require the exact pre-change definition, unset search_path, five-entry
  EXECUTE ACL semantics, and unchanged trigger bindings.

## Stop conditions

Stop without mutation for target ambiguity, fingerprint/hash mismatch, changed
migration-ledger state, database-major drift, missing/extra function or trigger,
definition/body/ACL drift, incomplete operator/window/reviewer record, modified SQL,
or any request to use migration repair, `db push`, `--include-all`, function-body
replacement, automatic retry, or automatic corrective-forward.

## Checklist

- [x] Method A preparation explicitly approved by `security_owner`.
- [x] Fixed forward transaction created with exact baseline and in-transaction checks.
- [x] Fixed corrective-forward created and kept separately unauthorized.
- [x] Metadata-only read-only smoke/postcheck created.
- [x] Human execution and stop instructions documented.
- [x] Artifact hashes pinned in a machine-readable manifest.
- [x] Fixed forward/postcheck/corrective-forward closed loop passed on a new disposable local stack.
- [x] Disposable stack stopped with no backup, remaining container, or volume.
- [x] Production execution authorization record completed.
- [x] Forward transaction executed once on the exact target.
- [x] Same-target read-only postcheck accepted.
- [ ] `SEC-REMEDIATION` final review completed; SRA-B/C/D remain separate.

Production execution evidence:
`SUPABASE_SRA_A1_METHOD_A_PRODUCTION_EXECUTION_2026_09_01.md`.
