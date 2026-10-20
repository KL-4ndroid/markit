# Supabase SRA-B Minimal Remediation Proposal

Date: 2026-09-01

Status: Production baseline confirmed; local/static implementation and disposable
PostgreSQL 17 evidence passed; Production execution not authorized

## Exact scope

Remove only these live always-true INSERT policies:

- `public.markets.authenticated_can_insert_markets`;
- `public.markets."允許 authenticated 插入市集"`;
- `public.products."允許 authenticated 插入商品"`.

Retain `public.products."Users can insert own products"` with exact
`owner_id = auth.uid()` check. Do not add a markets INSERT policy, change event RLS,
change any UPDATE/DELETE/SELECT policy, replace triggers, change function ACLs, or touch
rows or migration history.

## Compatibility basis

Repository callers create markets/products through local events and cloud event sync.
No direct application INSERT into the `markets` or `products` base table was found.
The projection triggers remain unchanged and execute their SECURITY DEFINER functions
independently of client table INSERT policies.

## Fail-closed transaction

`docs/security/drafts/SRA_B_LOCAL_REVIEW_TRANSACTION.sql`:

1. requires PostgreSQL 17 and the absent Production migration-ledger baseline;
2. asserts the exact four current INSERT policies, role sets, commands and expressions;
3. drops exactly the three always-true policies;
4. asserts markets has no direct INSERT policy and products retains exactly the owner
   policy;
5. commits only when every assertion passes.

Any name, role, expression, count, server version, or ledger drift aborts the whole
transaction before persistent change.

## Regression and corrective-forward boundary

Local evidence must prove:

- a forged authenticated direct market/product insert is denied;
- owner product insert remains allowed by the retained policy;
- `market_created` and `product_created` event projections still succeed;
- owners and staff keep their existing event-based workflows;
- no policy outside the exact three targets changes.

There is intentionally no corrective-forward that restores `WITH CHECK (true)`.
If a legitimate direct markets caller is discovered, stop and prepare a new reviewed
owner-bound policy. Never restore an always-true policy as rollback.

Accepted local evidence:
`docs/security/SUPABASE_SRA_B_DISPOSABLE_LOCAL_EVIDENCE_2026_09_01.md`.

## Production gate

Production requires a new exact-target preflight, a fixed transaction hash, local
evidence, a same-target read-only postcheck, security/release owner approval, operator,
bounded maintenance window, and explicit authorization to press Run. This document and
the user's current general SRA-B/C/D request do not authorize that Production write.
