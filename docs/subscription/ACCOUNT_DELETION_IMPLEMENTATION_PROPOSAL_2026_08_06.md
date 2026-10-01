# Account Deletion Implementation Proposal

Date: 2026-08-06

Status: AD0–AD3 disposable evidence complete; Steps 2A–2G policy approvals, Step 2H/AD1 design, Step 2I/AD2 disabled local foundation, and Step 2J/AD3A numbered migration/concrete repository plus localhost DB/RLS/lifecycle/two-session-race/fake-R2 evidence are complete as of 2026-08-21; deployment, real store/device evidence, public release alignment, and Production remain incomplete

Gate: `ACCOUNT-DELETION-POLICY` is complete; the native `ACCOUNT-DELETION` gate remains `pending_approval` until runtime implementation and release evidence pass

## 1. Objective

Provide a store-compliant way for an authenticated Féria user to initiate deletion
from account settings and from a public Web resource, then complete deletion of the
account and associated data through an auditable, idempotent server workflow.

This proposal covers both account identities:

- an owner deletes their own Féria account and owner workspace;
- a staff user deletes their own Féria account without deleting the owner's workspace.

It does not approve a migration, RPC, route, worker, R2 deletion, auth-user deletion,
subscription cancellation, or Production change.

Official policy references to recheck before implementation and submission:

- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)

## 2. Current State And Why It Is Insufficient

The current `/support` page explains a support-mediated deletion request. Account
settings expose sign-out and sync status, but no dedicated account-deletion action.
`AccountSwitcher` can remove a non-current local Dexie database; that operation does
not delete the authenticated Supabase account or Cloud data and must not be relabeled
as account deletion.

Deleting `auth.users` first is unsafe and incomplete:

- `profiles.id` cascades from `auth.users`, but `events.actor_id`, invitation actor
  columns, and some audit references do not currently define deletion-safe behavior;
- owner workspace tables include cascades, but object storage does not participate in
  PostgreSQL cascades;
- product covers and sales evidence require explicit R2 object deletion and physical
  absence verification;
- F3A `subscription_price_assignments` and F3B customer, subscription, transaction,
  and reconciliation tables use `owner_id ... ON DELETE RESTRICT`;
- F3B rows are append-oriented or immutable and cannot be silently removed to make an
  auth deletion succeed;
- a staff profile may be referenced as the actor of events that belong to an owner's
  durable business history;
- the browser can contain pending event, sync queue, sales-photo, or product-cover
  payloads that the server cannot discover by reading Supabase.

The correct design is a deletion saga with explicit data-class decisions, not a broad
database cascade or one client-side call to `auth.admin.deleteUser()`.

## 3. Role Semantics

| Actor | May initiate | May delete | Must never delete |
| --- | --- | --- | --- |
| owner | their own authenticated account | their own owner workspace after confirmation | another owner, a staff auth account, retained legal records outside approved policy |
| manager | their own staff account | their own identity and relationship data | owner workspace, other staff, owner subscription or billing records |
| operator | their own staff account | their own identity and relationship data | owner workspace, other staff, owner subscription or billing records |
| viewer | their own staff account | their own identity and relationship data | owner workspace, other staff, owner subscription or billing records |
| anonymous | public instructions only | nothing | every account and workspace |

An owner removing a staff member remains a relationship revoke, not deletion of that
person's Féria account. A staff deletion removes or irreversibly anonymizes the staff
identity while preserving the owner's non-personal operational history under the
approved retention policy.

## 4. Decisions Required Before Runtime Approval

Product, legal/privacy, security, support, and accounting must approve:

1. Whether deletion executes immediately after reauthentication or after a bounded
   cancellation window, and how a user can withdraw a pending request.
2. The exact data-retention table, legal bases, maximum periods, and deletion or
   irreversible anonymization result for events, audit records, support cases, security
   incidents, price assignments, and billing ledgers.
3. How staff-authored owner events retain operational meaning after the staff identity
   is deleted, without retaining email or a reversible account reference.
4. How billing identity is decoupled from `profiles.id` before paid rows exist. Current
   F3A/F3B `ON DELETE RESTRICT` references cannot remain the only identity design for a
   deletable paid account.
5. What deleting a Féria account does to an active Apple or Google subscription.
   Account deletion must not falsely claim that it cancelled a storefront subscription;
   the user must receive originating-store management guidance.
6. Which owner workspace data belongs to staff or third parties and must be retained,
   exported, anonymized, or deleted.
7. Support SLA, identity escalation, appeal path, evidence retention, and behavior when
   automatic cleanup cannot finish.

These are launch decisions. Placeholder text or a test-only simulator cannot answer
them.

### Step 2A product decision recorded on 2026-08-17

The `product_owner` approved immediate deletion after recent reauthentication and
explicit pending-write resolution, with no mandatory waiting period. The UI must
offer sync, an available safe export path, or explicit informed discard for each
discoverable local pending write and must never discard silently. Active Apple or
Google billing does not block Féria deletion; the user is told that account deletion
does not cancel storefront billing and receives the relevant store-management path.

An optional delete-at-subscription-expiry path may coexist only if immediate deletion
remains available. Cleanup failure remains `failed_retryable` or `manual_review`,
never false `completed`. This is product policy only: `legal_privacy_owner` approval,
the retention table, destructive runtime review, and Production evidence remain
pending.

### Step 2B product/engineering retention decision recorded on 2026-08-17

The `product_owner` approved immediate access disable and a 30-day primary-system
ceiling for identity, profile, workspace operational data, staff relationships, and
invitations, using irreversible anonymization only where non-identifying owner facts
must remain. Product-cover objects must be absent within 30 days; sales-photo objects
use the earlier of their existing seven-day lifecycle or deletion cleanup. The
controlled-device cache clears after completion, while the service must not promise
remote deletion from inaccessible devices.

Encrypted restricted backups have a 90-day product ceiling and require
corrective-forward deletion after disaster restore. A legal hold must be limited to
necessary data classes and duration. Ordinary user workspace data is not treated as
Féria accounting books by default. This does not approve legal bases, regulated
record periods, processor propagation, or destructive runtime.

### Step 2C regulated-record direction recorded on 2026-08-17

The `product_owner`, `accounting_owner`, and `support_owner` approved the engineering
classification of audit/security logs at 180 days, minimized support cases at two
years, and detached price/subscription/store transaction/refund evidence at five
years. Only records legally classified as Féria accounting books use ten years and
only legally classified vouchers use five years; unresolved matters and legal holds
must be scoped. Raw receipts and purchase tokens are excluded from general logs, and
expiry requires automatic deletion or irreversible anonymization.

Before deleting `profiles.id`, necessary billing evidence must be minimized and moved
to a restricted pseudonymous billing subject. Email and `profiles.id` cannot remain
retained join keys, and ordinary workspace data cannot be retained as accounting
evidence. `legal_privacy_owner` and `security_owner` approval of exact classifications,
keys, access controls, incident exceptions, erasure boundaries, and reidentification
prevention remains mandatory before migration or runtime approval.

### Step 2D staff and third-party boundary recorded on 2026-08-17

The `product_owner` approved staff self-deletion as removal of the staff identity,
login, roles, invitations, and workspace relationships without deletion of the owner
workspace or another account. Owner operational facts may retain an irreversible
“deleted member” attribution, but no email, name, `profiles.id`, or reversible mapping.
An owner removing staff remains relationship revocation, not account deletion.

Owner workspace deletion removes or irreversibly anonymizes workspace-controlled
staff/third-party data and shared objects under the approved object-retention policy.
Staff-created content remains only where it is an owner operational fact and its
attribution is irreversibly anonymized. Step 2F approved the legal/privacy ownership,
third-party-rights, shared-object, appeal, and evidence policy. Step 2G approved the
security requirements for fields, algorithm, linkage resistance, and evidence
integrity; their implementation and test evidence remain required.

### Step 2E active-store and support direction recorded on 2026-08-17

The `product_owner` and `support_owner` approved immediate Féria deletion even while
Apple/Google billing remains active, with an explicit warning that account deletion
does not cancel storefront charging and with the originating-store management path.
After deletion, service remains unavailable until a new account completes verified
purchase restore; deleted workspace data never returns. An uninterrupted store
subscription may retain its store-owned launch price and bind to one new owner only
after prior-binding release, single-owner, and anti-replay verification.

Cleanup failures remain `failed_retryable` or `manual_review`. Users receive a safe
request ID, state, next-action timing, and appeal route. Support never requests a
password, raw receipt, or purchase token and sends completion only after every
required cleanup succeeds. Step 2F approved the legal/privacy disclosure, data
boundary, appeal, and evidence policy. Step 2G approved the security requirements for
restore ownership, anti-replay/races, evidence protection, and fraud/error recovery;
their implementation and test evidence remain required.

### Step 2F legal/privacy review recorded on 2026-08-17

The designated `legal_privacy_owner` approved the legal/privacy portions of
`ACCOUNT_DELETION_LEGAL_SECURITY_REVIEW_PACKET_2026_08_17.md`, including immediate
timing, retention bases/table, backup and hold boundaries, processor propagation
requirements, billing-subject minimization/erasure boundary, staff/third-party
controller boundaries, active-billing/restore disclosure, appeal, and evidence
requirements. The approval is subject to exact schema/processor evidence, future
law/store-policy recheck, and the packet's pre-runtime conditions.

### Step 2G security review recorded on 2026-08-17

The designated `security_owner` approved the policy-level controls for pseudonymous
keys/access/encryption, anonymization linkage resistance, audit/hold/purge controls,
restore anti-replay/races, request-evidence protection, and fraud/error recovery.
The dated cross-role policy approval is therefore complete.

This approval accepts the required security outcomes; it does not prove their current
implementation. Exact schema inventory, threat modeling, synthetic fixtures, runtime
tests, and purge/restore evidence remain mandatory. No migration, destructive test,
external-account mutation, Production deletion, or public legal publication is
authorized.

### Step 2H / AD1 repository design recorded on 2026-08-17

The user approved AD1 repository-local work. AI completed the shared fail-closed
completion contract, 15-threat model, review-only request/RLS SQL draft, and
synthetic/static guardrails. The SQL draft is outside `supabase/migrations`, contains
`ROLLBACK`, grants no client mutation access, and was not applied. AD0 also identified
the legacy authenticated `delete_current_user_app_data()` path; AD2 must replace its
Settings caller and revoke execution before a compliant deletion UI can launch.

AD1 evidence does not authorize the AD2 server saga, deployment, external credentials,
destructive testing, or any non-Production/Production data mutation.

### Step 2I / AD2 local foundation recorded on 2026-08-17

The user approved AD2 within a local/synthetic-only boundary. AI implemented the
disabled-by-default request/status route contract, recent-reauth and purpose-separated
HMAC checks, leased saga orchestration, canonical pending-write preflight mapping,
safe status/support responses, Production-off config guard, and removal of the legacy
Settings RPC caller. The route has no concrete repository and therefore cannot accept
a real deletion request even if accidentally reached.

AD3 remains separately gated for a reviewed numbered migration, concrete repository,
named non-Production target, protected secret, deployment, legacy database RPC revoke,
and destructive disposable lifecycle/R2/restore evidence.

## 5. Proposed Server-owned State Machine

Use a private request table with no direct `anon` or `authenticated` write grant. The
exact migration number is assigned only after approval.

```text
requested
  -> identity_confirmed
  -> processing
  -> completed

requested | identity_confirmed
  -> cancelled

processing
  -> failed_retryable
  -> processing

processing | failed_retryable
  -> manual_review
  -> processing | completed
```

Required properties:

- one active request per authenticated account;
- opaque request ID and idempotency key;
- actor ID, account kind (`owner` or `staff`), bounded status/code, timestamps, and
  policy revision;
- no email, raw store receipt, purchase token, object key, support message, or user
  content in general logs;
- immutable status transition history or a separate private audit stream;
- leases and retry counts so two workers cannot execute the same step concurrently;
- every step records only bounded counts and hashes needed for completion evidence;
- `completed` is terminal and cannot be reversed by recreating an auth user.

Do not expose the cleanup worker as a client RPC. Client routes only initiate, read
status, confirm, or cancel within the approved window.

## 6. Client Preflight And Pending Writes

The account-settings flow must reuse `getLocalPendingWriteReport()` semantics before
submission. It should show bounded counts for events, sync queue items, sales-photo
pending data, and product-cover pending data.

```text
clean
  -> continue to identity confirmation

only syncable pending events and online
  -> offer explicit sync, recheck, then continue

offline, failed sync, blocked permission, or binary pending payload
  -> block the first confirmation and offer:
     - return and resolve;
     - explicitly discard local-only data and continue.
```

Explicit discard is a separate destructive confirmation. It must not reuse the generic
sign-out dialog text, silently clear IndexedDB, or claim data reached the Cloud. The
server request can proceed only after the client records the user's choice, but server
authorization must never trust a client-provided "clean" flag as a security boundary.

Do not clear Dexie or sign out before the server has accepted the request. After final
completion, revoke sessions and clear only the current authenticated account scope.
Failure or manual review leaves a visible status and recovery path.

## 7. Deletion Plan By Account Kind

### 7.1 Staff account

1. Reauthenticate the current user and resolve every active/pending relationship.
2. Deny any request that names an owner or another staff account; request scope always
   comes from the authenticated actor.
3. Revoke/delete the actor's staff relationships and pending invitations according to
   the approved retention policy.
4. Remove the actor's `market_members` rows and invalidate role access before identity
   cleanup.
5. Replace staff identity references in owner-retained events/audits with an approved
   irreversible tombstone or nullable actor reference. Do not rewrite business payload,
   amount, market, event type, or timestamp.
6. Delete staff-owned settings/profile data and the auth user only after all blocking
   references are resolved.
7. Revoke sessions and prove the old identity can no longer read owner data.

Manager, operator, and viewer have identical deletion authority over their own account.
Their workspace capabilities do not grant owner deletion authority.

### 7.2 Owner account and workspace

1. Freeze new owner and staff writes for the deleting workspace while preserving read
   access needed to show status and support recovery.
2. Revoke invitations and staff workspace access. Do not delete staff auth accounts.
3. Build a private, bounded R2 cleanup manifest from product-cover and sales-evidence
   metadata without emitting object keys.
4. Delete R2 objects, verify physical absence, then mark each cleanup step complete.
5. Delete or anonymize media metadata, pending operations, events/archive, snapshots,
   projections, settings, relationships, invitations, and profile data according to the
   approved class order.
6. Reconcile subscription state and retained billing/price records through the approved
   identity-detachment design. Never delete immutable billing evidence merely to bypass
   an `ON DELETE RESTRICT` constraint.
7. Delete the auth user only after database references and external objects reach the
   approved terminal state.
8. Revoke sessions, clear the current local account scope, and leave a non-sensitive
   completion receipt accessible through the public support process.

## 8. Minimum Corrective Migrations

The implementation review should split schema work instead of one broad migration:

### AD1: Request foundation

- private deletion request and transition-audit tables;
- no client grants or public mutation RPC;
- strict status checks, one-active-request uniqueness, leases, and bounded fields;
- read-only owner/staff status function only if direct table reads remain denied.

### AD2: Deletion-safe identity references

- define nullable/tombstoned staff actor behavior for `events`, invitations, audit logs,
  and every profile/auth foreign key discovered by a schema verifier;
- preserve event payload immutability and owner workspace history;
- include cross-owner and staff-role regression tests;
- do not change general staff visibility or write permissions.

### AD3: Billing identity detachment

- introduce a private billing subject independent of `profiles`/`auth.users`, or another
  reviewed irreversible pseudonymization model;
- migrate empty or sandbox-only F3A/F3B references through a separate reviewed change;
- retain immutable provider and transaction evidence without retaining an unnecessary
  active account link;
- update F3C and native entitlement writer designs before either writer is approved.

### AD4: Cleanup orchestration

- server-only request/confirm/status routes and a leased cleanup worker;
- explicit R2 deletion and absence verification;
- idempotent database class cleanup with retry/manual-review states;
- auth deletion last;
- bounded observability and support handoff.

No migration should be applied to Production in the same review that first approves
its design.

## 9. API And UI Boundary

Candidate routes, subject to review:

```text
POST /api/account-deletion/request
GET  /api/account-deletion/status
POST /api/account-deletion/confirm
POST /api/account-deletion/cancel
```

All mutation routes require authenticated server resolution, exact bounded JSON, CORS
and CSRF review, recent identity confirmation, request idempotency, and rate limits.
No route accepts `ownerId`, `staffId`, email, role, or object keys as deletion authority.

Required UI surfaces:

- a clearly named danger action under `/settings/account`;
- a dedicated confirmation flow that distinguishes account/workspace deletion from
  local data clearing and sign-out;
- active-store subscription guidance and management link without claiming automatic
  cancellation;
- pending-write resolution/discard step;
- deletion status, cancellation where allowed, retry/support recovery, and completion;
- a public `/account-deletion` resource usable without installing or signing in to the
  app, with a direct request path after authentication or through the approved support
  channel.

## 10. Adversarial And Regression Matrix

Required automated and external evidence includes:

- anonymous request/status/confirm/cancel denial;
- authenticated cross-owner and cross-staff denial;
- viewer/operator/manager can delete only their own account, never owner workspace;
- owner can delete only their own workspace and cannot delete staff auth accounts;
- stale session, stale role, changed identity, replayed confirmation, duplicate click,
  and out-of-order worker execution fail closed;
- local pending events, pending sync queue, blocked permission, offline mode, sales-photo
  payload, and product-cover payload each show the correct stop/discard behavior;
- staff-authored owner events retain approved non-identifying business history;
- invitation, role transition, downgrade, restore, sync, PermissionGate, `useUserRole`,
  and Dexie behavior do not grant broader access during deletion;
- R2 image and thumbnail partial failures retry without false completion;
- database failure after R2 deletion resumes corrective-forward without recreating
  objects or duplicating the request;
- active Apple/Google subscription guidance is accurate and entitlement writes freeze;
- retained billing evidence is inaccessible to the deleted account and contains only
  approved pseudonymous/legal fields;
- completed account cannot authenticate, restore a purchase, or regain the former
  workspace by recreating the same email;
- public deletion resource, privacy policy, support path, and store-console URL work on
  the exact release candidate;
- logs and committed evidence contain no secret, email, full identifier, receipt,
  purchase token, object key, or customer content.

## 11. Rollback And Corrective-forward

- Before any request row exists, an unused foundation can be removed by a reviewed
  rollback migration.
- Once a request exists, disable new requests if necessary but preserve status/audit
  rows and complete or correct-forward every accepted request.
- Never roll back by restoring deleted R2 objects from hidden copies or recreating an
  auth account without the user.
- A partial deletion is not `completed`. It remains `failed_retryable` or
  `manual_review` with an assigned support owner.
- Corrective-forward must be idempotent per request, data class, and object-manifest
  entry.
- Store form answers and public policy must be corrected if observed behavior differs
  from the approved declaration.

## 12. Approval Boundary And Definition Of Done

Separate approval is required for AD1, AD2, AD3, and AD4. Approval of this proposal
does not combine those slices or authorize Production execution.

The `ACCOUNT-DELETION` gate can become `complete` only after:

- all policy decisions in section 4 have dated approvals;
- every migration is reviewed, applied to the selected non-Production target, and
  passes structural, RLS, anonymous, authenticated, cross-owner, and role smokes;
- owner and staff lifecycle tests pass with disposable accounts and R2 objects;
- native and public Web deletion paths pass on the same release candidate;
- the final Apple/Google forms, privacy policy, retention table, support runbook, and
  application behavior agree;
- rollback/corrective-forward ownership and incident escalation are assigned;
- no unresolved deletion request or release-blocking defect remains.

Until then, Native launch remains `not_ready`.
