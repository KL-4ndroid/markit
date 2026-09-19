# F3C Entitlement Projection Writer Proposal

Date: 2026-08-06

Status: planning only; implementation, migration, provider runtime, and all writes remain
unapproved

Depends on:

- migration 063 `subscription_accounts` read model;
- selected-sandbox F3A migration 066 verification;
- selected-sandbox F3B migration 067 verification;
- `lib/subscription/native-store-verification.ts` normalized verification contract;
- approved Apple/Google server verification adapters and account-binding policy.

## 1. Objective

F3C will provide one private, server-only transaction boundary that records a trusted
store reconciliation decision and updates the narrow `subscription_accounts`
projection. It must never infer entitlement from a client purchase result, local
receipt, device identity, email address, simulator state, or unverified notification.

This proposal does not create SQL, a route, a callback, a writer, a grant, a policy, a
provider adapter, or an entitlement mutation.

## 2. Approved-input Shape

The future writer may accept only an internal value produced after provider
verification:

```text
reconciliation_key
owner_id
billing_origin
provider_environment
verified_account_binding
provider_subscription_ref
provider_product_ref
normalized_plan_code
normalized_billing_status
normalized_entitlement_status
current_period_starts_at
current_period_ends_at
provider_observed_at
provider_sequence
snapshot_hash
verified_evidence_ref
```

The input must not contain raw JWS, raw purchase tokens, callback bodies, credentials,
bank data, or customer profile data. `owner_id` comes from the trusted account-binding
resolution, not provider email or client input.

## 3. Proposed Transaction Boundary

One database transaction should:

1. acquire an owner-scoped advisory or row lock;
2. validate the verified account binding and provider environment;
3. reject cross-owner provider references;
4. insert or deduplicate the F3B reconciliation/event evidence;
5. reject stale or out-of-order snapshots without changing the current projection;
6. upsert the normalized F3B subscription snapshot under existing transition guards;
7. detect duplicate active billing origins before changing access;
8. write one reconciliation decision with before/after projection hashes;
9. update `subscription_accounts` only when the new verified state wins;
10. return a bounded decision code without provider secrets or raw evidence.

The transaction must be idempotent for the same reconciliation key and snapshot hash.
Retries may return the prior outcome, but they must not duplicate subscriptions,
transactions, price assignments, or entitlement transitions.

## 4. Projection Rules

- Only `plan_source='billing'` is writable by F3C.
- F3C must not change `admin` or `promotion` rows.
- `plan_code` is resolved from an active internal price version plus a matching active
  store mapping; a client product ID alone is insufficient.
- Billing status and entitlement status remain independent.
- `cancel_at_period_end` may retain active entitlement through the verified period end.
- Refund, revocation, expiry, chargeback, account hold, and grace transitions use the
  verified store state and explicit policy; transaction existence alone grants nothing.
- Unknown, malformed, stale, or unavailable state fails closed for new protected writes.
- Downgrade or expiry retains source business records and follows each capability's
  canonical retained-read/suspension policy.

## 5. Duplicate-origin And Account Binding

An owner may have at most one effective paid origin. Before acquisition, the future
server preflight must block a second store when another verified origin is active. If a
race or delayed notification still creates two verified origins, F3C must preserve the
latest valid access, freeze self-service plan changes, create a reconciliation case, and
avoid automatic cancellation or refund.

Restore is allowed only when the verified Apple account token or Google obfuscated
account identifier resolves to the same owner workspace. Provider evidence already
bound to another owner is a hard denial and must not be transferred automatically.

## 6. Security Shape

The corrective migration version must be selected only after re-reading the migration
history at implementation time. The migration should add the smallest private writer
surface possible:

- no table policies for `anon` or `authenticated`;
- no direct grants to `PUBLIC`, `anon`, `authenticated`, or browser clients;
- no client-callable entitlement RPC;
- a server-only execution identity distinct from general client sessions;
- fixed `search_path`, schema-qualified objects, bounded inputs, and explicit ownership
  checks for any privileged function;
- append-only reconciliation evidence and corrective-forward recovery;
- no destructive rollback after real billing evidence exists.

Secrets and full provider references must be redacted from application logs. Logs may
contain bounded decision codes, hashed correlation identifiers, environment class, and
latency.

## 7. Required Denial And Regression Matrix

Before any environment apply, deterministic tests must cover:

- anonymous denial;
- ordinary authenticated denial;
- server identity without verified evidence denial;
- cross-owner account-binding denial;
- provider reference already owned by another owner denial;
- duplicate event and duplicate snapshot idempotency;
- stale and out-of-order snapshot no-op;
- unknown product, inactive mapping, candidate price, and environment mismatch denial;
- duplicate active origin freeze behavior;
- owner, viewer, operator, and manager capability-read regression;
- staff invitation, role transition, downgrade, explicit restore, and no-auto-restore;
- account switch, stale role cache, sync restart, and Dexie projection cleanup;
- cancellation-at-period-end, grace, expiry, refund, revocation, and chargeback;
- Apple purchase restored on Android/Web and Google purchase restored on iOS/Web after
  the same server projection is read;
- simulation and fake IAP evidence cannot reach the writer.

The permission distribution Markdown must be updated in the same implementation commit
if any role, RLS, RPC, `PermissionGate`, `useUserRole`, sync, or Dexie behavior changes.

## 8. Verification And Rollout

The implementation batch must include:

1. reviewed migration and SHA-256;
2. read-only pre/post verifier;
3. structural tests proving private grants and fixed privileged-function settings;
4. isolated sandbox denial smoke before any positive writer smoke;
5. synthetic verified-store fixtures with no real charge;
6. empty-ledger or dedicated-fixture target confirmation;
7. Security Advisor review;
8. observability and replay/idempotency evidence;
9. corrective-forward and writer-disable procedure;
10. a separate human approval before applying to Production.

The account capability server must continue returning billing-disconnected Free state
until the writer, read policy, sandbox lifecycle evidence, and release decision are all
approved. Completing F3C does not by itself approve Apple/Google notification routes,
checkout, refunds, store submission, or Production billing.

## 9. Stop Conditions

Stop implementation if provider verification is not authoritative, account binding is
ambiguous, a cross-owner reference exists, the target environment is uncertain, an F3B
guard would need broad weakening, billing rows already exist without known provenance,
or legal/commercial policy is required to choose an entitlement outcome.
