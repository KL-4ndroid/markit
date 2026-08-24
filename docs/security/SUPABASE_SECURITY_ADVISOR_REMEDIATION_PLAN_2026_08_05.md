# Supabase Security Advisor Remediation Plan

Date: 2026-08-05
Status: SRA-000 live inventory captured; SRA-A minimal proposal complete; no remediation migration is approved or applied
Scope: pre-existing non-billing findings only

Sanitized live evidence:
`docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_EVIDENCE_2026_08_24.md`

SRA-A minimal proposal:
`docs/security/SUPABASE_SECURITY_ADVISOR_SRA_A_MINIMAL_REMEDIATION_PROPOSAL_2026_08_24.md`

## 1. Safety boundary

This plan records a reviewable corrective workstream. It does not authorize a
Production migration, RLS or grant change, callback, billing writer, checkout,
entitlement mutation, or broad automatic Advisor fix.

The repository contains the migrations and callers needed for static analysis,
but it does not contain a raw export of the current Advisor result set. The IDs
below are stable plan IDs, not fabricated Supabase finding IDs. Before a
corrective migration is written, a human must save a read-only Advisor export
and the masked target, then map every live finding to one of these plan IDs.
Object existence, current definitions, ownership, `proconfig`, ACLs, policies,
dependencies, and trigger bindings must also be captured from the same target.

## 2. Required read-only inventory

`SRA-000` is a prerequisite for every corrective batch:

1. Export Advisor findings without suppressing pre-existing results.
2. Query `pg_class`, `pg_views`, `pg_proc`, `pg_namespace`, `pg_policy`,
   `information_schema.routine_privileges`, `pg_trigger`, and `pg_depend`.
3. Record object signatures, owners, `security_definer`, `proconfig`, EXECUTE
   grantees, policy commands/roles/expressions, and dependent views/triggers.
4. Record only masked environment identity; do not store a project ref, key,
   token, account, or customer data.
5. Diff the live catalog against the migration-derived candidate inventory in
   this document. An unexplained difference blocks migration authoring.

## 3. Finding register

| Plan ID | Advisor severity | Affected object | Creating/latest migration | Classification |
| --- | --- | --- | --- | --- |
| `SRA-001` | ERROR | `public.staff_accessible_markets` | latest repository definition: `056_wire_sales_photo_evidence_market_projection.sql`; hardening lineage: 039, 040, 042, 053 | Intentional redacted staff boundary, but SECURITY DEFINER view is an unsafe mechanism that must be replaced without breaking staff reads |
| `SRA-002` | ERROR | `public.staff_accessible_products` | latest repository definition: `039_staff_view_hardening.sql`; base SELECT tightened by 041 | Same as SRA-001 |
| `SRA-003` | ERROR | `public.staff_accessible_events` | latest repository definition: `053_repair_staff_accessible_view_sanitization.sql`; base SELECT tightened by 041 | Same as SRA-001; event payload redaction and tombstones are compatibility requirements |
| `SRA-004` | WARN | SECURITY DEFINER functions with no fixed `search_path`, including repository-confirmed `update_market_read_model()`, `update_product_read_model()`, `handle_new_user()`, and `auto_add_staff_to_new_market()` | 056, 014, 018, 021 | Real hardening defect; exact live set must come from SRA-000 |
| `SRA-005` | WARN | functions using mutable `SET search_path = public`, including legacy team RPCs in 003 and account-data RPCs in 033 | 003, 033 | Real hardening defect; function bodies and signatures must be recreated with `pg_catalog, public` and qualified references |
| `SRA-006` | WARN | `markets` policy `允許 authenticated 插入市集` | 005 | Real vulnerability if still live: any authenticated actor can satisfy `WITH CHECK (true)` |
| `SRA-007` | WARN | `products` policy `允許 authenticated 插入商品` | 005; a separate owner check was added by 014 | Real vulnerability if still live: permissive policies combine with OR, so the 014 owner policy does not neutralize it |
| `SRA-008` | WARN | SECURITY DEFINER EXECUTE ACLs available to `PUBLIC`, `anon`, or overly broad `authenticated` | lineage includes 003, 004, 006, 018, 021, 028-033, 035, 043, 046 and later replacements | Mixed: unintended defaults must be revoked; authenticated RPCs need per-function authorization; trigger functions need no client EXECUTE |
| `SRA-009` | WARN | `verify_invitation_token(text)` executable by `anon` and `authenticated` | latest definition/grants: 065; prior control consolidation: 064 | Intentional public invitation lookup, but output minimization, expiry, enumeration and rate-limit behavior require adversarial review |
| `SRA-010` | WARN | Auth leaked-password protection disabled | provider dashboard configuration, not a SQL migration | Real account-security gap; requires separately approved environment configuration and auth regression |

Migration 064 already gives its current Team RPCs a fixed
`SET search_path = pg_catalog, public`, revokes `PUBLIC`/`anon` where appropriate,
and grants authenticated or service-only access intentionally. Those functions
are regression controls, not presumed open findings. SRA-000 must verify that the
live ACLs match 064/065 before any change.

### 3.1 Migration-derived function candidate inventory

This table is a static candidate list for SRA-000, not a claim that every object
still exists on the target.

| Candidate group | Migration source | Repository caller/current intent |
| --- | --- | --- |
| `update_market_read_model()`, `update_product_read_model()` | 056, 014 | event triggers; no client EXECUTE required |
| `handle_new_user()`, `auto_add_staff_to_new_market()`, `update_staff_relationships_timestamp()`, `log_role_change()` | 018, 021, 20240220 staff migrations | database/auth triggers; no client EXECUTE required |
| `get_user_role(uuid)`, `is_staff(uuid)`, `get_owner_id_by_staff(uuid)`, `was_permission_valid_at(uuid,timestamptz)`, `cleanup_old_audit_logs()` | `20240220_add_staff_roles.sql` | no current application RPC caller found; verify dependencies/scheduled jobs before revoke or removal |
| `get_my_staff()` | `20240220_staff_system_simple.sql`; ACL adjusted by 064 | current caller in `lib/supabase/staff.ts`; authenticated owner authorization must remain internal |
| `cleanup_expired_invitations()` | 028; ACL adjusted by 064 | 064 makes it service-only, while `lib/supabase/staff-invitations.ts` still contains a client call; resolve this compatibility mismatch before changing ACL/body |
| `join_market_by_code(text)`, `generate_invite_code(uuid)`, `remove_team_member(uuid,uuid)`, `get_market_members(uuid)` | 003 | authenticated grants but no current repository caller found; external compatibility review required |
| `check_user_market_permission(uuid,text)`, `user_market_ids(uuid)`, `current_user_owned_market_ids()` | 004, 006, 035 | database/RLS helper candidates; inspect `pg_depend`; `current_user_market_ids()` is excluded because 064 replaces it with a fixed path |
| `delete_current_user_app_data()`, `leave_current_staff_team(uuid)` | 033 | current authenticated Settings callers; keep self-identity checks and exact destructive scope |
| `enqueue_checklist_toggle_pending_operation(...)`, `drain_checklist_toggle_pending_operation(text)`, `recover_stale_processing_pending_operation(text)` | 049, 050, 052 | current field-operation and owner-diagnostics callers; preserve actor/owner checks |
| `is_sale_photo_evidence_sale_event(uuid,uuid,uuid)` | 055 | helper with authenticated grant and mutable `public` path; inspect server mutation dependencies |

The 058/060/061 media functions use an empty search path with qualified object
references and service-only grants. The 062 functions and 064/065 Team functions
use fixed paths and explicit grants. They remain regression controls unless the
live inventory proves drift.

## 4. Application and database callers

### 4.1 Staff-access view callers

| Object | Application callers | Required behavior |
| --- | --- | --- |
| `staff_accessible_markets` | `lib/sync/staff-pull-service.ts`, `lib/supabase/markets.ts` | authorized staff/owner rows only; owner-only finance remains redacted from staff; equipment and sales-photo-required operational fields remain compatible |
| `staff_accessible_products` | `lib/sync/staff-pull-service.ts`, `lib/supabase/products.ts` | authorized rows only; `cost` remains owner-only; current typed client shape remains stable during cutover |
| `staff_accessible_events` | `lib/sync/staff-pull-service.ts`, `lib/sales/photo-evidence-manual-upload-client.ts` | authorized market events, required tombstones, and recursively sanitized payloads; no global/cross-owner event leak |

The shared contracts and tests in `lib/supabase/staff-typed-client.ts`,
`tests/staff-typed-client.test-d.ts`, `tests/sync-flow-audit.test.ts`, the 039/053/056
migration tests, and C2.20/C2.29B read-only verification SQL are also consumers.

### 4.2 Function callers

- `delete_current_user_app_data()` and `leave_current_staff_team(uuid)` are called
  by `app/settings/data/page.tsx` and `app/settings/team/page.tsx`.
- Team RPCs are called by `lib/supabase/staff.ts` and
  `lib/supabase/staff-invitations.ts`.
- `verify_invitation_token(text)` is used before authentication by the invitation
  flow; `accept_invitation_and_bind(text, uuid)` is authenticated.
- Pending-operation RPCs are called by `lib/markets/field-ops-write-router.ts` and
  `lib/sync/owner-pending-operation-diagnostics.ts`.
- Product-cover and sales-photo SECURITY DEFINER RPCs are server-only callers
  under `app/api/product-cover-photo/**` and the corresponding `.server.ts`
  repositories. Their service-only ACLs must not be broadened.
- `update_market_read_model()` and `update_product_read_model()` are trigger
  callers from the event pipeline; `handle_new_user()` is an auth trigger;
  `auto_add_staff_to_new_market()` is a market trigger. They have no legitimate
  client RPC caller.
- Static repository search finds no current caller for the legacy 003 RPCs
  `join_market_by_code`, `generate_invite_code`, `remove_team_member`, and
  `get_market_members`. They cannot be dropped until SRA-000 and release-log/API
  compatibility review confirm there is no external client.

## 5. Current role and client behavior

| Actor | Current data/RPC behavior that remediation must preserve |
| --- | --- |
| `anon` | no owner/staff rows, no base-table writes, and no Team mutation; only the bounded invitation-token verification contract may be public |
| generic `authenticated` | no data from another owner and no forged owner insert; RPC EXECUTE alone never grants authority without an internal identity/relationship check |
| `owner` | direct owner-only base-table reads, complete finance/cost visibility, owner-only market/product creation and deletion, and Team administration |
| `viewer` | authorized redacted reads only; no create/edit/delete |
| `operator` | viewer reads plus the existing capability-gated field operations and own same-day record rules; no owner finance or master-data administration |
| `manager` | operator visibility plus existing basic-data, field-note and checklist capabilities; no owner-only finance, deletion, role ownership or unrestricted writes |

`PermissionGate`, `useUserRole`, and IndexedDB owner filtering are UX and
fail-closed controls, not substitutes for RLS/RPC authorization. Supabase remains
the remote security boundary. The detailed distribution remains canonical in
`docs/staff-role-permissions.md`, `docs/staff-role-matrix.md`,
`docs/ROLE_ACCESS_MODEL.md`, and `docs/role-permission-distribution.md`.

## 6. Minimal corrective design

### 6.1 SRA-001 through SRA-003: replace definer views safely

Do not apply `security_invoker = true` directly. Migration 041 intentionally made
base-table SELECT owner-only, so an invoker view would return no staff rows and
break sync.

Use at least three separately approved batches:

1. Add three narrow, fixed-search-path SECURITY DEFINER set-returning functions
   with explicit columns and internal `auth.uid()`/active-relationship checks.
   Revoke all from `PUBLIC` and `anon`; grant only `authenticated`. Preserve the
   exact redaction, tombstone, ordering and relationship semantics. Add adapters
   behind the existing Supabase repository boundary; do not put platform access
   into shared domain logic.
2. After dual-read equivalence and all role tests pass, switch callers to the
   narrow functions, revoke view access, then drop the definer views in a later
   corrective-forward migration. Never drop/recreate all three in one unverified
   Production step.

Rollback before view revocation is an application adapter switch back. After
revocation, use corrective-forward to restore the reviewed prior grants/views;
do not use destructive rollback against user data.

### 6.2 SRA-004 and SRA-005: fix function search paths

Recreate each live function with the same signature, owner, volatility,
language, return type, body, trigger binding and ACL, while adding
`SET search_path = pg_catalog, public` and schema-qualifying referenced objects.
Batch by dependency: auth/profile trigger, event projections, staff membership,
account deletion, then legacy RPCs. Re-run `pg_get_functiondef` and ACL inventory
after each batch. Corrective-forward restores the previous reviewed body if a
regression is found; data written by a trigger is never rolled back wholesale.

### 6.3 SRA-006 and SRA-007: narrow INSERT policies

The smallest candidate migration must drop the exact always-true policy names.
For `products`, retain or recreate an authenticated owner check
`owner_id = auth.uid()`. For `markets`, static code indicates creation is
event/trigger-driven; if live inventory confirms no direct client insert is part
of the contract, no direct authenticated INSERT policy is needed. Otherwise use
an owner-id check, never `WITH CHECK (true)`. Verify event projection triggers
still create read-model rows before release.

Policy rollback is not restoration of an always-true policy. Corrective-forward
may add a narrower reviewed policy after the legitimate failing caller is
identified.

### 6.4 SRA-008 and SRA-009: least-privilege EXECUTE

Revoke default `PUBLIC` EXECUTE from every SECURITY DEFINER function. Trigger
functions receive no client EXECUTE. Server-only media/subscription functions
remain service-only. Authenticated Team/account RPCs retain only the role needed
by their callers and must authorize `auth.uid()` internally. Remove unused legacy
RPC grants only after external compatibility review.

Keep anonymous `verify_invitation_token(text)` only if adversarial tests confirm
constant-shape invalid responses, expiry/revocation enforcement, no secret or
excess owner disclosure, and acceptable rate limiting. Otherwise replace it with
a rate-limited server route before revoking anon EXECUTE.

### 6.5 SRA-010: leaked-password protection

Enable first in a non-Production environment through the provider's Auth
configuration, then test sign-up, password sign-in, reset, change-password,
invitation acceptance, existing sessions, offline recovery and user-facing error
copy. Production enablement is a separate human-approved action. Rollback is the
configuration toggle only; no schema change is involved.

## 7. Mandatory adversarial and regression matrix

Every SQL batch must run pre/post read-only catalog verification plus:

- anonymous denial: all views/base tables/mutations denied except the reviewed
  invitation-token lookup;
- authenticated denial: unrelated authenticated actor gets zero foreign rows
  and cannot invoke owner/staff administrative effects;
- cross-owner denial: owner A, owner B and each owner's staff cannot read or
  mutate the other workspace;
- viewer: redacted authorized reads work; all writes fail;
- operator: authorized reads and existing field-operation writes work; owner
  finance/master-data writes fail;
- manager: approved basic edits/notes/checklists work; owner-only and foreign
  actions fail;
- owner: complete own reads and approved owner operations work; foreign owner
  actions fail.

The regression suite must cover staff invitation creation, anonymous token
verification, acceptance, decline, revoke, restore, viewer/operator/manager role
transition, Team downgrade suspension, entitlement restore, role-cache
invalidation, `useUserRole` freshness, `PermissionGate`, staff pull, owner pull,
event replay, tombstones, pending writes, Dexie redaction/replacement cleanup,
offline reconnect, and cross-account cache isolation. A failure that indicates
cross-owner or elevated access stops the work and requires human review.

## 8. Execution batches and release gates

1. `SRA-000`: save masked read-only inventory and exact Advisor mapping.
2. `SRA-A`: minimal proposal complete; the first implementation proposal is limited to
   four live, no-client SECURITY DEFINER trigger functions and remains unapproved.
3. `SRA-B`: remove always-true INSERT policies with event-projection regression.
4. `SRA-C1`: add narrow staff read functions and dual-read equivalence tests.
5. `SRA-C2`: switch application callers; verify sync/Dexie and every staff role.
6. `SRA-C3`: revoke/drop definer views only after C2 evidence is accepted.
7. `SRA-D`: enable leaked-password protection in non-Production, then request
   separate Production approval.

Each batch requires its own migration proposal, rollback/corrective-forward
section, focused tests, sandbox evidence, Security Advisor rerun, reviewer signoff
and Production approval. No batch in this plan is currently approved to execute.
