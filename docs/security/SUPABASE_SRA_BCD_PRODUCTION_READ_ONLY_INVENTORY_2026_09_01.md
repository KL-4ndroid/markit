# Supabase SRA-B/C/D Production Read-only Inventory

Date: 2026-09-01

Status: bounded Production inventory complete; no SRA-B/C/D Production mutation authorized

The exact SRA-000 Production target was reopened in the authenticated Supabase Dashboard.
The target fingerprint matched privately. The raw project reference, URL, credentials,
view definitions, Auth users, and business rows are not retained here.

## Current Advisor state

- Errors: 3, all three `Security Definer View` findings in SRA-C.
- Warnings: 59, down from 71 after the accepted SRA-A1 execution.
- Info: 12, unchanged and outside this SRA-B/C/D slice.
- `Leaked Password Protection Disabled` remains present for SRA-D.

The bounded query
`supabase/verification/sra_bcd_production_read_only_inventory.sql` ran with
`transaction_read_only=on`, PostgreSQL `170006`, 15/3-second timeouts and terminal
`ROLLBACK`. SHA-256:
`95c88b38a7c51cd1d7ed22a45cac14fd86ecd05624eca6289d052ce66018af09`.

## SRA-B — exact INSERT-policy baseline

Four INSERT policies exist across `markets` and `products`:

| Table | Policy | Role | Check | Treatment |
| --- | --- | --- | --- | --- |
| `markets` | `authenticated_can_insert_markets` | authenticated | `true` | remove |
| `markets` | `允許 authenticated 插入市集` | authenticated | `true` | remove |
| `products` | `允許 authenticated 插入商品` | authenticated | `true` | remove |
| `products` | `Users can insert own products` | PUBLIC | `owner_id = auth.uid()` | retain |

Repository search finds no direct application INSERT into `markets` or `products`.
Creation is event-first: authenticated clients insert authorized `market_created` or
`product_created` events, and the reviewed SECURITY DEFINER projection triggers update
the read-model tables. The minimal SRA-B treatment is therefore to drop only the three
always-true policies. It must not add a new markets INSERT policy or modify event RLS.

## SRA-C — exact staff-view baseline

| View | Columns | Definition MD5 | SECURITY INVOKER |
| --- | ---: | --- | --- |
| `staff_accessible_events` | 11 | `553ca9554c447219397376c528114609` | false |
| `staff_accessible_markets` | 47 | `d84671917538c9e85c26bd55c6ac86cd` | false |
| `staff_accessible_products` | 20 | `e8b9f67d2feac32a7f963b1b5c05ce64` | false |

All three views are owned by `postgres`; current SELECT ACLs include `anon`,
`authenticated`, `postgres`, and `service_role`. The definitions depend on the base
events/markets/products and active staff relationships. Changing these views directly to
SECURITY INVOKER would break staff reads because migration 041 intentionally keeps base
table SELECT owner-only.

SRA-C must therefore remain three separately accepted batches:

1. C1: add fixed-search-path, explicit-column staff read RPCs with internal
   `auth.uid()` and active-relationship checks; keep views unchanged.
2. C2: dual-read equivalence, then switch Web/mobile-portable repository adapters and
   validate owner/viewer/operator/manager, Dexie and sync behavior.
3. C3: only after C2 evidence, revoke view access and remove the definer views with a
   separately reviewed corrective-forward package.

## SRA-D — provider configuration

The Advisor still reports `Leaked Password Protection Disabled`. This is a provider
Auth setting, not SQL. There is no active non-Production branch for this Production
project, so a safe rollout requires a disposable/non-Production Auth environment or a
separately approved Production-only exception with sign-up, sign-in, reset, password
change, invitation and error-copy regression evidence.

## Boundary

No policy, view, grant, function, Auth setting, migration history, or application runtime
was changed during this inventory. Machine-readable sanitized evidence is retained in
`docs/security/SRA_BCD_PRODUCTION_READ_ONLY_INVENTORY_2026_09_01.json`.
