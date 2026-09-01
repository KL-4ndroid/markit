# Supabase SRA-B Production Execution Attempt Evidence

Date: 2026-09-01

Status: authorized forward attempt stopped on syntax error before transaction execution;
zero Production mutations; SRA-B remains incomplete and requires new authorization

## Authorization and immutable inputs

The user acted as `security_owner`, `release_owner`, Operator and Release reviewer,
selected an immediate Asia/Taipei maintenance window, waived the final confirmation,
and authorized a maximum of one forward attempt with no retry. The authorization was
bound to release ID `SRA-B-20260901-PREP-01` and reviewed commit `30e2412`.

The Production project reference was hashed privately and matched the manifest. The raw
reference is not retained here. The fixed forward, read-only preflight and read-only
postcheck SHA-256 values all matched the manifest before the attempt.

## Preflight

The complete fixed preflight ran read-only and returned:

- `ok=true` and `assertion_guard=1`;
- PostgreSQL major version 17 and `transactionReadOnly=on`;
- `migrationLedgerPresent=false`;
- four INSERT policies and `exactBaselineMatched=true`.

## Forward attempt and stop condition

The fixed forward file was loaded into the Supabase SQL Editor and the destructive-query
warning was confirmed once. PostgreSQL rejected the submitted buffer with error `42601`,
syntax error at the second `BEGIN` on line 83. The Editor had retained the prior preflight
content before the forward instead of presenting an isolated forward buffer.

Because parsing failed before the forward transaction was entered, none of the three
`DROP POLICY` statements ran, no transaction committed, and there were zero Production
mutations. The forward was not retried, no alternative policy was created, and migration
history was not read, created, repaired or changed.

## Read-only unchanged-state evidence

A separate fresh unsaved query reran the fixed preflight only. It again returned
`ok=true`, guard `1`, four INSERT policies and `exactBaselineMatched=true`. This proves
the original SRA-B baseline remained intact after the failed attempt.

The Security Advisor linter was rerun and remained at three errors, 59 warnings and 12
info findings. All three SRA-B `RLS Policy Always True` warnings remained visible: two
for `public.markets` and one for `public.products`.

Machine-readable sanitized evidence:
`docs/security/SRA_B_PRODUCTION_EXECUTION_ATTEMPT_EVIDENCE_2026_09_01.json`.

## Checklist

- [x] Authorization, Operator, reviewer and maintenance window recorded.
- [x] Target fingerprint and all three artifact hashes matched.
- [x] Fixed read-only preflight returned `ok=true` and guard `1`.
- [x] Exactly one forward attempt was made.
- [x] Error stopped the release and the forward was not retried.
- [x] Fresh read-only verification proved the four-policy baseline unchanged.
- [x] Advisor rerun retained all three SRA-B warnings.
- [x] Zero Production mutations and no migration-history change recorded.
- [ ] Fixed forward transaction committed.
- [ ] Fixed read-only success postcheck accepted.
- [ ] SRA-B reviewer signoff completed.
