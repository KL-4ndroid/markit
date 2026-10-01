# Supabase SRA-B Release Preparation

Date: 2026-09-01

Status: Production execution accepted; attempt 1 stopped before transaction execution
with zero mutations, then separately authorized attempt 2 committed the fixed forward
exactly once and passed the same-target read-only postcheck and Advisor acceptance gate

## Package

| Purpose | Path | SHA-256 |
| --- | --- | --- |
| Fixed forward | `docs/security/drafts/SRA_B_LOCAL_REVIEW_TRANSACTION.sql` | `f079967206e6a01d87057b8bb52ab12bf2c3a6704d5369ae5dcf2cef01f6a4f7` |
| Read-only preflight | `supabase/verification/sra_b_production_read_only_preflight.sql` | `a6abb5f1d3c2a633b994a13544735fa584011c61d09f9e1e3cefca1b60fe9879` |
| Read-only postcheck | `supabase/verification/sra_b_postcheck_read_only.sql` | `51bc58746d805fc05f50be91f98584f00c0aa7f50e2fdfada0207e436bc0cbed` |

Release ID: `SRA-B-20260901-PREP-01`.

The forward transaction removes exactly three always-true INSERT policies. It neither
creates a replacement markets policy nor changes rows, views, functions, triggers,
grants, event RLS or migration history. There is deliberately no corrective-forward
that restores an unsafe `WITH CHECK (true)` policy.

## Required authorization record

| Field | Current value |
| --- | --- |
| Operator | user |
| Maintenance window | immediate, Asia/Taipei |
| Release reviewer | user |
| Exact Production target | private fingerprint must match manifest |
| Forward execution count | two attempts recorded; exactly one fixed forward committed |
| Final confirmation | explicitly waived for each separately authorized attempt |

Suggested approval wording:

> 我以 security_owner／release_owner 核准 SRA-B Production execution：Operator、維護時段與 reviewer 已填妥；允許 AI 對相同 fingerprint target 執行固定 SHA-256 preflight、forward 一次及 read-only postcheck。不得重試、不得新增替代 policy、不得修改 migration history。

The first authorization was consumed on 2026-09-01. The SQL Editor retained the prior
preflight before the fixed forward content and PostgreSQL rejected the combined buffer
at the second `BEGIN` (`42601`, line 83). The parser rejected the batch before entering
the forward transaction. A separate fresh read-only query then reconfirmed the complete
four-policy baseline with `ok=true` and guard `1`; the rerun Advisor remained at three
errors, 59 warnings and 12 info findings, including all three SRA-B warnings.

Attempt 1 sanitized evidence:
`docs/security/SUPABASE_SRA_B_PRODUCTION_EXECUTION_ATTEMPT_2026_09_01.md`.

The user then separately reauthorized attempt 2 against the same fingerprint and fixed
hashes. A new full-page blank query held only the forward; the copied-back buffer matched
the fixed SHA-256 before the Run action was used once. Supabase returned success. A
separate fixed read-only postcheck returned `ok=true`, guard `1`, zero market INSERT
policies, one exact owner product INSERT policy and zero always-true INSERT policies.
The Advisor rerun changed warnings from 59 to 56 while errors remained 3 and info
remained 12. The `RLS Policy Always True` warning type disappeared.

Accepted Production evidence:
`docs/security/SUPABASE_SRA_B_PRODUCTION_EXECUTION_SUCCESS_2026_09_02.md`.

## Execution steps

1. Record the authorization outside Git and bind it to the release ID, target
   fingerprint and all three SHA-256 values.
2. Recompute each hash from the reviewed commit. Any mismatch stops the release.
3. Privately match the Production project reference fingerprint; do not retain the raw
   reference.
4. Run the complete preflight in a new unsaved query. Require `ok=true`, guard `1`,
   read-only on, ledger absent, four policies and exact baseline matched.
5. Load the complete forward transaction from the reviewed commit and press Run once.
   A warning dialog is expected because the file contains three DROP POLICY statements.
6. Do not retry after any error. Retain only a sanitized error label and stop.
7. After success, run the fixed postcheck in a new unsaved query. Require `ok=true`,
   guard `1`, zero market INSERT policies, one product INSERT policy, zero always-true
   policies and exact owner product policy.
8. Rerun Security Advisor. SRA-B succeeds only when the three RLS warnings disappear
   without a new warning.
9. Test normal market/product event creation with the authorized owner account. Do not
   create cross-owner Production fixtures without separate approval.

## Stop and recovery

- Hash, target, version, ledger or policy drift: stop before forward execution.
- Forward error: do not retry and do not create a policy during the window.
- The 2026-09-01 attempt reached this stop condition and was not retried under its
  authorization. Attempt 2 proceeded only after a new explicit authorization.
- SRA-B is accepted after attempt 2. No further SRA-B retry or policy mutation is
  authorized.
- Postcheck failure: stop and inspect metadata read-only.
- Legitimate direct markets caller found: prepare a new owner-bound policy proposal;
  never restore `WITH CHECK (true)`.
- A broader availability incident requires a new separately reviewed corrective-forward,
  not ad-hoc Dashboard editing.

## Checklist

- [x] Production read-only SRA-B baseline captured.
- [x] Exact three-policy fixed forward prepared.
- [x] Fixed preflight and postcheck prepared.
- [x] Fixed-hash disposable closed loop passed.
- [x] Direct forged inserts denied and event projections preserved locally.
- [x] Repeat execution rejected and container removed.
- [x] Unsafe corrective-forward intentionally omitted.
- [x] Operator, reviewer and bounded maintenance window recorded.
- [x] Production target fingerprint and hashes revalidated.
- [x] One forward attempt consumed and stopped on syntax error before transaction execution.
- [x] Attempt 2 separately reauthorized against the same target and fixed hashes.
- [x] Isolated full-page forward buffer verified before execution.
- [x] Fixed forward transaction committed exactly once.
- [x] Unchanged four-policy baseline reconfirmed read-only after the failed attempt.
- [x] Security Advisor rerun retained all three SRA-B warnings; no false completion claimed.
- [x] Same-target postcheck and Security Advisor delta accepted.
- [x] SRA-B reviewer signoff completed.
