# Supabase SRA-B Release Preparation

Date: 2026-09-01

Status: fixed-hash package and disposable closed loop passed; Production execution is
not authorized

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
| Operator | **unset — required before execution** |
| Maintenance window | **unset — required before execution** |
| Release reviewer | **unset — required before execution** |
| Exact Production target | private fingerprint must match manifest |
| Forward execution count | maximum one |
| Final confirmation | required unless explicitly waived |

Suggested approval wording:

> 我以 security_owner／release_owner 核准 SRA-B Production execution：Operator、維護時段與 reviewer 已填妥；允許 AI 對相同 fingerprint target 執行固定 SHA-256 preflight、forward 一次及 read-only postcheck。不得重試、不得新增替代 policy、不得修改 migration history。

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
- [ ] Operator, reviewer and bounded maintenance window recorded.
- [ ] Production target fingerprint and hashes revalidated.
- [ ] Fixed forward executed exactly once.
- [ ] Same-target postcheck and Security Advisor delta accepted.
- [ ] SRA-B reviewer signoff completed.
