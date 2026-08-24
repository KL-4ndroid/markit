# Account Deletion AI Implementation And Evidence Plan

Date: 2026-08-17

Status: execution plan only; Step 2G policy approval does not authorize runtime writes,
destructive tests, external-account mutation, or Production deletion

## 1. What AI Can Complete Independently Now

The following work is read-only or repository-local and can be completed without
accessing protected external accounts or deleting real data:

- inventory current schemas, foreign keys, RLS policies, storage/object references,
  background jobs, identity joins, and existing deletion surfaces;
- map every approved retention class to its current table, column, object prefix,
  processor, deletion/anonymization outcome, and evidence owner;
- produce the account-deletion threat model, misuse cases, trust boundaries, and
  fail-closed acceptance criteria;
- design pseudonymous billing-subject, irreversible deleted-member attribution,
  deletion-saga, idempotency, anti-replay, and prior-binding-release contracts;
- prepare migrations, service interfaces, UI states, fixtures, and test cases as a
  reviewable implementation slice after that slice is explicitly authorized;
- run static checks and local tests that use synthetic/disposable data, then generate
  sanitized machine-readable evidence and update the checklist automatically.

## 2. Work AI Can Do After Separate Implementation Authorization

Approval should name the exact slice and environment. AI can then implement and test:

1. schema and RLS changes for deletion requests, cleanup steps, restricted billing
   subjects, and irreversible deleted-member attribution;
2. server-owned initiation, recent-reauth verification, idempotent saga, retries,
   opaque request status, audit events, and fail-closed completion rules;
3. local pending-write preflight and the sync/export/informed-discard UI;
4. account settings and public-Web initiation paths using shared contracts and
   platform ports, without importing Capacitor into shared code;
5. owner, staff, cross-owner, active-subscription, restore, replay, race, object purge,
   backup corrective-forward, and partial-failure tests using disposable fixtures;
6. non-Production evidence capture where credentials and the target environment have
   been explicitly placed in scope.

Each slice must stop if observed schema or provider behavior differs from the approved
policy. A partial cleanup must remain `failed_retryable` or `manual_review`, never
`completed`.

## 3. Human Or External Evidence That AI Cannot Self-Attest

AI can guide, automate collection, and verify supplied artifacts, but cannot replace:

- explicit authorization for migrations, destructive tests, deployment, or exact
  non-Production/Production targets;
- protected Supabase, R2, hosting, observability, Apple, and Google account access that
  has not been placed in scope;
- legal/accounting confirmation of actual processors, contracts, regions, statutory
  classification, legal holds, and public policy wording;
- real-device App Store/Google Play deletion, subscription, cancellation, restore,
  grace, refund, and account-binding evidence;
- public mailbox ownership, named responders, human incident escalation, and the
  final release go/no-go decision;
- a Production deletion or destructive backup/restore drill. These require an exact
  target, recovery plan, human approval, and observed results.

Screenshots or human statements do not by themselves prove server cleanup. Runtime
evidence must come from sanitized queries, object-absence checks, audit events, and
expected state transitions, with secrets and raw purchase tokens excluded.

## 4. Recommended Execution Order

| Phase | Scope | Primary actor | Authorization boundary | Current result |
| --- | --- | --- | --- | --- |
| AD0 | Read-only schema, FK, RLS, object, processor, and code-path inventory | AI | may proceed without writes | complete; repository-only audit attached and auto-checked |
| AD1 | Threat model, contracts, migrations, RLS, and synthetic fixtures | AI + reviewer | approved as Step 2H repository-only work | complete; tests pass and auto-checked; nothing applied/deployed |
| AD2 | Disabled-by-default route, recent reauth, leased saga, pending-write preflight, status/support contract, legacy UI cutover | AI + reviewer | approved as Step 2I local-only work | complete; tests pass and auto-checked; no repository/deployment enabled |
| AD3 | Reviewed migration/concrete repository plus disposable non-Production lifecycle and purge/restore tests | AI + human environment owner | Step 2J/AD3A approved local-only destructive scope | complete on 2026-08-21; local migration, DB/RLS/lifecycle/two-session race and fake-R2/restore-boundary evidence passed |
| AD4 | Store/device/public-policy alignment and release candidate | AI-assisted human operations | external accounts, devices, legal/support sign-off | preparation complete on 2026-08-21; 14 current blockers machine-reported; execution and release evidence pending |
| AD5 | Production rollout | human release/security owners with AI verification | exact Production go/no-go | pending; close native gate only after every required item passes |

## 5. Automatic Checklist Rule

The generated checklist is not edited by hand. Evidence is attached to the canonical
task, gate, or manual-item status source; the generator checks an item only after its
declared completion rule passes. Step 2G therefore checks the approved security policy
items and `ACCOUNT-DELETION-POLICY`, while `ACCOUNT-DELETION-RUNTIME` and the native
`ACCOUNT-DELETION` gate remain open.
