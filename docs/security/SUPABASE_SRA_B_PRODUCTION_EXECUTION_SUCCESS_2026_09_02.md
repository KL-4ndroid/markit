# Supabase SRA-B Production Execution Success Evidence

Date completed: 2026-09-02

Status: accepted; attempt 2 committed the fixed forward exactly once, the fixed
same-target read-only postcheck passed, and the Security Advisor delta was accepted

## Authorization and immutable inputs

The user acted as `security_owner`, `release_owner`, Operator and Release reviewer,
kept the immediate Asia/Taipei maintenance window, and explicitly authorized attempt 2
without a final confirmation. The authorization required a new full-page SQL Editor
blank query, an isolated forward buffer, one execution only, the fixed read-only
postcheck and one Advisor rerun. It prohibited any further retry, alternative policy or
migration-history change.

The authorization remained bound to release ID `SRA-B-20260901-PREP-01`, reviewed
commit `8338c49260f86369b8ef331246efe05b1d2d2add`, the same privately matched target
fingerprint and these immutable artifacts:

| Purpose | SHA-256 |
| --- | --- |
| Fixed forward | `f079967206e6a01d87057b8bb52ab12bf2c3a6704d5369ae5dcf2cef01f6a4f7` |
| Read-only preflight | `a6abb5f1d3c2a633b994a13544735fa584011c61d09f9e1e3cefca1b60fe9879` |
| Read-only postcheck | `51bc58746d805fc05f50be91f98584f00c0aa7f50e2fdfada0207e436bc0cbed` |

The raw Production project reference was not retained.

## Attempt 2 forward

A brand-new full-page SQL Editor query was confirmed blank before loading the forward.
The complete editor buffer was copied back before execution, normalized only from CRLF
to LF for verification, and matched the fixed forward byte-for-byte and by SHA-256. It
contained exactly one `BEGIN`, one `COMMIT`, the SRA-B marker once, and no retained
preflight marker.

The full-page Run action and its expected destructive-query confirmation were each used
once. Supabase returned `Success. No rows returned`. The forward therefore committed
exactly the reviewed three `DROP POLICY` statements:

- two always-true authenticated INSERT policies on `public.markets`;
- one always-true authenticated INSERT policy on `public.products`.

No replacement policy was added. No business row, view, function, trigger, grant,
event RLS rule or migration-history record was changed. The existing exact owner
product INSERT policy was retained.

## Fixed same-target read-only postcheck

The postcheck ran in another new full-page SQL Editor query. Its copied editor buffer
matched the fixed postcheck and SHA-256, with one read-only transaction, one rollback
and no commit. The single returned row was:

- `ok=true` and `assertion_guard=1`;
- `transactionReadOnly=on`;
- `migrationLedgerPresent=false`;
- `marketInsertPolicyCount=0`;
- `productInsertPolicyCount=1`;
- `alwaysTrueInsertPolicyCount=0`;
- `ownerProductPolicyExact=true`.

The verification read catalog metadata only and did not read business data.

## Security Advisor acceptance

The Security Advisor linter was rerun once after the postcheck:

| Severity | Before | After |
| --- | ---: | ---: |
| Errors | 3 | 3 |
| Warnings | 59 | 56 |
| Info | 12 | 12 |
| SRA-B `RLS Policy Always True` warnings | 3 | 0 |

The warning filter no longer offered the `RLS Policy Always True` finding type. The
three remaining errors are the separately gated SRA-C SECURITY DEFINER views; they are
not part of this execution authorization.

Machine-readable sanitized evidence:
`docs/security/SRA_B_PRODUCTION_EXECUTION_SUCCESS_EVIDENCE_2026_09_02.json`.

## Checklist

- [x] Attempt 2 authorization, Operator, reviewer and maintenance window recorded.
- [x] Same target fingerprint and all three fixed artifact hashes matched.
- [x] Isolated full-page forward buffer matched the fixed SHA-256.
- [x] Fixed forward transaction committed exactly once.
- [x] No alternative policy or migration-history change was made.
- [x] Fixed same-target read-only postcheck returned `ok=true` and guard `1`.
- [x] Exact retained owner product policy was verified.
- [x] Advisor warnings changed from 59 to 56 and all three SRA-B warnings cleared.
- [x] SRA-B reviewer signoff completed from the authorized acceptance criteria.
