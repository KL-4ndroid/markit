# Account Deletion AD0 Read-only Repository Audit

Date: 2026-08-17

Scope: repository and migration-source inspection only

Result: `AD0_REPOSITORY_BASELINE_COMPLETE`; runtime implementation remains unapproved

## 1. Executive Finding

The repository does not currently contain a compliant server-owned authenticated
account deletion route or saga. Migration 033 exposes the legacy authenticated
`delete_current_user_app_data()` RPC, but it deletes only selected application rows
and lacks recent reauthentication, R2 absence verification, billing detachment,
retry/manual-review state, and auth deletion. Existing account-switcher UI deletes a
local multi-account IndexedDB database, while Settings calls the legacy RPC and then
clears local cache. None of these paths may be represented as App Store/Google Play
account deletion.

The current migration source also confirms that billing records cannot be handled by
deleting `profiles.id`: migrations 066 and 067 contain multiple `owner_id` foreign
keys with `ON DELETE RESTRICT`, and migration 067 prevents billing-ledger deletion.
The approved pseudonymous billing-subject detachment must therefore precede auth/profile
deletion in a separately reviewed migration and server workflow.

## 2. Observed Repository Surfaces

| Surface | Evidence | AD0 conclusion |
| --- | --- | --- |
| Auth/profile root | `001_uuid_schema.sql`: `profiles.id` references `auth.users(id) ON DELETE CASCADE` | deleting auth first would cascade before controlled cleanup and evidence detachment; keep auth deletion last |
| Ordinary owner data | migrations 001, 013, 014, 017, 028, 048, 055, 062, 063, 069 contain profile/auth owner references with cascade behavior | exact effective schema and ownership order need a live non-Production catalog query before migration approval |
| Staff attribution | migration 055 uses `captured_by_staff_id ... ON DELETE SET NULL`; other actor/owner links use cascade | a dedicated irreversible deleted-member representation is not implemented by these constraints alone |
| Price assignments | migration 066 `subscription_price_assignments.owner_id ... ON DELETE RESTRICT` | blocks direct profile deletion and requires approved billing-subject detachment |
| Billing evidence | migration 067 customer links, subscriptions, transactions, event inbox, and reconciliation rows use restricted owner links; delete-prevention triggers and revoked direct access are present | preserve server-only restrictions while replacing retained profile joins with a restricted pseudonymous subject |
| Sales-photo objects | migrations 055/060/061 and server repositories bind private R2 image/thumbnail keys and require object deletion before metadata finalize/expiry | account saga must invoke and verify object absence; a Postgres cascade cannot prove R2 deletion |
| Product-cover objects | migration 062 stores display/thumbnail keys and provides server-only functions; local pending payloads also exist | account saga needs a separate object enumeration, deletion, absence check, and retry step |
| Local pending writes | `getLocalPendingWriteReport()` covers pending/local events, sync queue, sales-photo creations/payloads, product-cover uploads/payloads, actor mismatch, offline, lock, and read failure | reuse this canonical report for deletion preflight; do not create a weaker detector |
| Local data clearing | `clearLocalAppData()` blocks an unforced clear when the report is dirty, then clears Dexie/IndexedDB and selected browser storage | reuse only after server acceptance/completion rules; this is not account deletion and currently tolerates some clearing errors |
| Account switcher deletion | `AccountSwitcher.handleDeleteAccount()` calls only local `deleteDatabase(accountToDelete.dbName)` and refuses the current account | rename/reword during implementation to avoid confusing local cache removal with legal account deletion |
| Legacy cloud deletion | migration 033 grants authenticated execution of `delete_current_user_app_data()` and Settings calls it directly | it is incomplete and bypasses the approved saga; AD2 must replace the caller and revoke execution before launch |
| Account-deletion API/UI | targeted search found no compliant account-deletion API route, recent-reauth endpoint, deletion request status, or server saga | runtime must be implemented; no current behavior can satisfy the native store gate |

## 3. Required AD1 Design Outputs

Before any migration or runtime work, AD1 must produce:

1. an effective-schema catalog generated from an explicitly approved non-Production
   database, including every inbound FK to `auth.users`/`profiles`, delete action,
   trigger, RLS policy, grant, function, materialized view, and object-key column;
2. a data-class-to-storage/processor matrix matching the approved retention table;
3. a threat model covering cross-owner deletion, staff/owner confusion, replay,
   concurrent restore, prior-binding release, partial R2 deletion, retries, evidence
   disclosure, billing-subject reidentification, and backup restore;
4. reviewed contracts for recent reauthentication, pending-write choices, request
   creation, idempotent cleanup steps, opaque status, appeal/manual review, and auth
   deletion last;
5. synthetic fixtures proving `completed` is impossible while any required cleanup,
   object-absence verification, or billing detachment is incomplete.

## 4. Evidence Boundary

This audit proves only what is present in the checked-out repository. It does not prove
the effective deployed schema, R2 inventory, provider configuration, backup behavior,
store behavior, or Production state. No database query, credential use, deployment,
migration, external mutation, destructive test, or user-data deletion was performed.

Consequently, `ACCOUNT-DELETION-RUNTIME` and native gate `ACCOUNT-DELETION` remain
`pending_approval`; this evidence does not auto-check either item.
