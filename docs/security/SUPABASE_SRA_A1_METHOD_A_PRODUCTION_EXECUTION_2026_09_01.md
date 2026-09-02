# Supabase SRA-A1 Method A Production Execution Evidence

Date: 2026-09-01

Status: fixed forward transaction executed once and same-target read-only postcheck accepted;
corrective-forward not executed; SRA-B/C/D and final `SEC-REMEDIATION` review remain open

## Authorization

The user designated themself as Operator and Release reviewer, selected an immediate
Asia/Taipei maintenance window, and explicitly authorized AI to perform Steps 1–3,
execute the fixed Production forward transaction without another confirmation, and
continue with the previously documented read-only postcheck. The bounded window was
recorded as 2026-09-01 10:13–11:43 Asia/Taipei.

Authorization was bound to release ID `SRA-A1-METHOD-A-20260831-PREP-01`, reviewed
commit `908d450290ee55879684edd7a717f6226cf03d48`, and forward SHA-256
`480d08b201e26db7204a661963ccdc826c1b6154252e2ef912255eb31d868e52`.
Corrective-forward remained explicitly unauthorized.

## Execution evidence

The authenticated Supabase Dashboard showed `market-pulse-collab`, branch `main`,
environment `Production`, Healthy status, and Northeast Asia. The project reference was
hashed privately; its SHA-256 matched the accepted SRA-000 fingerprint. The raw project
reference is not retained in this report.

The fresh unsaved read-only preflight returned nine rows:

- environment: PostgreSQL `170006`, `transaction_read_only=on`,
  `migration_ledger_present=false`, four target functions;
- four exact function definitions/body hashes/owners/SECURITY DEFINER/config/ACLs;
- four unique enabled trigger bindings matching the accepted 2026-08-26 evidence.

The complete fixed forward file was loaded from the reviewed commit, hashed again, and
executed once. Supabase SQL Editor reported `Success. No rows returned.` after the
transaction's internal preflight and postcheck reached `COMMIT`.

The separate fixed read-only postcheck SHA-256
`3645ffd919b2b8ee15449af76b9aca906218bc7aae4136e83bfc4635c767caa0`
then returned one accepted row:

- `ok=true`;
- `assertion_guard=1`;
- `transactionReadOnly=on`;
- `migrationLedgerPresent=false`;
- all four functions reported `owner_ok`, `security_definer_ok`, `search_path_ok`,
  `body_ok`, `execute_acl_ok`, `exact_acl_ok`, and `trigger_ok` as true.

No snippet was saved. No raw definitions, ACL dump, credentials, customer rows or Auth
user rows were retained. The transaction changed only four function search_path values
and four EXECUTE ACLs; it did not replace bodies, alter triggers, touch business data,
or create/backfill/repair migration history.

Machine-readable sanitized evidence:
`docs/security/SRA_A1_METHOD_A_PRODUCTION_EXECUTION_EVIDENCE_2026_09_01.json`.

## Checklist

- [x] Operator, reviewer and bounded maintenance window recorded.
- [x] Reviewed commit and all fixed artifact SHA-256 values matched.
- [x] Exact Production target fingerprint matched privately.
- [x] Fresh read-only preflight matched the accepted baseline.
- [x] Fixed forward transaction executed exactly once and committed.
- [x] Same-target fixed read-only postcheck returned `ok=true` and guard `1`.
- [x] Corrective-forward remained unexecuted and unauthorized.
- [x] Sanitized evidence retained without project ref, credentials or business rows.
- [ ] SRA-B/C/D separately remediated and reviewed.
- [ ] Parent `SEC-REMEDIATION` final approval completed.
