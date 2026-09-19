# Supabase SRA-C Staff Read Cutover Plan

Date: 2026-09-01

Status: Production inventory and caller audit complete; C1 implementation not yet
approved; C2/C3 remain blocked by evidence dependencies

## Why a direct Advisor fix is unsafe

The three live views are SECURITY DEFINER, owned by `postgres`, and currently grant
SELECT to `anon`, `authenticated`, `postgres`, and `service_role`. Their live contracts
are 11 event columns, 47 market columns and 20 product columns.

Migration 041 deliberately made base-table SELECT owner-only. Changing the views to
SECURITY INVOKER would therefore return no staff rows. Dropping or revoking the views
before application cutover would break staff pull, market/product reads and sales-photo
sale canonicalization.

## Current callers

- `lib/sync/staff-pull-service.ts`: all three views; ordered event pull.
- `lib/supabase/markets.ts`: staff/owner list, single-row and scoped market reads.
- `lib/supabase/products.ts`: staff/owner list and scoped product reads.
- `lib/sales/photo-evidence-manual-upload-client.ts`: exact staff sale-event lookup.
- `lib/supabase/staff-typed-client.ts` and related static/type tests.

The cutover remains inside `lib/supabase` repository adapters. Shared domain, Dexie,
sync models and UI must not acquire a browser-only or Supabase-specific rewrite.

## C1 — additive database functions

Create three additive, fixed-search-path SECURITY DEFINER functions with explicit return
columns matching the live contracts:

- `list_accessible_markets_v2(p_market_id uuid default null)`;
- `list_accessible_products_v2(p_product_id uuid default null, p_market_id uuid default null)`;
- `list_accessible_events_v2(p_since timestamptz default null, p_market_id uuid default null, p_type text default null, p_actor_id uuid default null, p_timestamp timestamptz default null)`.

Each function must:

1. derive identity only from `auth.uid()`;
2. require an active, non-deleted staff relationship or exact owner identity;
3. preserve the live redaction, owner branch, tombstones, ordering and nullable fields;
4. use `SET search_path = pg_catalog, public` and schema-qualified objects;
5. revoke `PUBLIC` and `anon`, grant only `authenticated`, and keep authorization inside
   the function;
6. leave all three views and application callers unchanged.

C1 requires generated exact return signatures, definition hashes, static tests and a
disposable owner/viewer/operator/manager/cross-owner dataset before Production review.

## C2 — dual-read and caller cutover

Add a repository-owned reader port with `view` and `rpc_v2` implementations. Start with
shadow comparison in non-Production only; never return shadow data to callers. Normalize
ordering and timestamps before comparison, while treating any row/field/redaction delta
as blocking.

After accepted equivalence evidence, switch one caller group at a time:

1. market/product repository reads;
2. staff pull and Dexie sanitization;
3. sales-photo exact event lookup;
4. complete owner/viewer/operator/manager, offline reconnect and cross-account tests.

The default remains `view` until a separately reviewed release-bound flag changes it.
No mutable browser storage or public environment variable may control the security path.

## C3 — view retirement

Only after C2 is accepted on the same release:

1. prove repository search has zero runtime view callers;
2. revoke SELECT from `PUBLIC`, `anon`, and `authenticated` in a fixed transaction;
3. rerun role, sync, Dexie and media canonicalization tests;
4. drop the three views only in a later transaction after the revoke release is stable.

Corrective-forward for the revoke stage restores only the exact reviewed SELECT ACLs.
Corrective-forward after drop recreates the exact hashed definitions and ACLs. It never
changes or repairs business rows.

## Approval boundary

The current request authorizes this inventory and plan, not C1 database implementation,
remote deployment, C2 runtime switching, or C3 revocation/drop. The next safe decision is
an explicit C1 local-only implementation approval.
