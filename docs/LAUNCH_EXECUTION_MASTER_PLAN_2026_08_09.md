# Féria Launch Execution Master Plan

Date: 2026-08-09

Status: active; Web and Native launch remain not ready

Machine task matrix: `docs/LAUNCH_EXECUTION_TASKS_2026_08_09.json`

Current Capacitor iOS／Android engineering roadmap:
`docs/CAPACITOR_IOS_ANDROID_EXECUTION_PLAN_2026_08_16.md`

Generated manual queue status:
`docs/MANUAL_LAUNCH_OPERATIONS_CHECKLIST_2026_08_09.md`

Canonical readiness sources remain:

- `docs/WEB_LAUNCH_GATES_2026_08_01.json`;
- `docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json`.

This plan coordinates existing evidence. It does not replace either gate document,
reactivate a deferred provider, approve a migration, or treat a local preflight as
external evidence.

## 1. Release Order

1. **Web core:** Free access and account-bound entitlements acquired from a native
   store. Paid Web checkout is not required.
2. **iOS paid:** Apple subscription acquisition, verification, entitlement, restore,
   lifecycle, compliance, and bounded canary.
3. **Android paid:** Google Play acquisition with the same account-bound entitlement
   model and equivalent lifecycle evidence.
4. **Web paid deferred:** ECPay, F3C-F3E, S9, and promotion runtime resume only after a
   separate commercial and implementation decision.

The iOS and Android implementation work may run in parallel after their shared
dependencies close. A store purchase never grants access until server verification and
the server-owned entitlement projection succeed.

## 2. Work Ownership

| Owner | Meaning |
| --- | --- |
| `agent` | Repository work that Codex may implement after listed approvals and dependencies are complete. |
| `human` | Console, legal, financial, device, Production, secret, or policy action that Codex must not perform autonomously. |
| `shared` | Human supplies external state or approval; Codex implements, checks, and records sanitized repository evidence. |

Task statuses are intentionally separate from gate statuses. `pending_manual` means the
next action belongs to a human. `pending_approval` means implementation is designed but
not authorized. `blocked_dependency` means the owner is known but a predecessor is not
complete. `deferred` is outside the current release path. `complete` requires existing
repository evidence.

## 3. Human Action Queue

Step-by-step prerequisites, evidence boundaries, completion criteria, and a sanitized
report-back template for this queue are consolidated in
`docs/MANUAL_LAUNCH_OPERATIONS_GUIDE_2026_08_09.md`. The guide coordinates the
canonical runbooks below; it is not completion evidence and does not change any gate.

### Immediate And Independent

1. Execute both controlled R2 compensation cases in
   `IOS_PHASE2_GATE2_COMPENSATION_RUNBOOK.md`, restore the safe deployment, and retain
   secret-free evidence. This is the only remaining Capacitor Gate 2 evidence gap.
2. Complete Apple and Google account enrollment, agreements, identity, tax/payment,
   app record, tester, and physical-device prerequisites. Update only bounded statuses
   in `NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json`.
3. Approve Pro and Team price points, Apple group levels, Google product/base plans,
   trial/offer policy, grace/account-hold rules, and the Founder renewal-price
   mechanism. Do not activate a product while the runtime gates remain closed.
4. Approve account-deletion retention, staff-history anonymization, active-store
   subscription behavior, support SLA, and billing-ledger treatment.
5. Approve public operator, support, privacy, terms, retention, cancellation, and
   refund content.
6. Execute the read-only Supabase Advisor export and SRA-000 inventory using
   `docs/security/SUPABASE_SECURITY_ADVISOR_INVENTORY_RUNBOOK_2026_08_09.md`.
7. Complete protected Production configuration, final PWA install/update checks, and
   production observability provider ownership.

No credential, customer data, full project reference, bank/tax value, tester identity,
or raw provider record belongs in this repository.

### Human Actions That Wait For A Native Binary

- final Apple/Google privacy and policy console answers;
- reviewer credentials and protected review-contact fields;
- final iOS/Android screenshots and device presentation checks;
- complete sandbox purchase, renewal, cancellation, grace, refund, restore, upgrade,
  downgrade, duplicate-origin, and account-switch lifecycle;
- TestFlight/Play closed test, canary ownership, rollback, and go/no-go.

The native lifecycle cases already exist in
`docs/subscription/BILLING_TEST_MATRIX.md`; do not create a second scenario matrix.

## 4. Agent Execution Queue

The following currently unblocked repository work is completed by this batch:

- canonical task matrix and consistency checker;
- SRA-000 read-only inventory SQL and execution runbook.

The next agent-owned implementation is deliberately dependency-bound:

1. Security remediation proposals require the SRA-000 live inventory and a separate
   migration review.
2. Capacitor projects and native adapters require completed Gate 2 evidence and slice
   review.
3. Store verification runtime requires approved catalog identities and protected
   credentials/configuration channels.
4. Entitlement writer requires approved verification runtime and a separately reviewed
   server mutation slice.
5. Account deletion runtime requires the seven policy decisions in the existing
   proposal and explicit destructive-work approval.
6. F3C-F3E, S9, ECPay, and promotion runtime remain deferred or pending separate
   approval and are not part of native-first paid acquisition.

Codex may update status-only handoffs, run focused preflights, implement reviewed code,
and preserve sanitized evidence when each dependency is supplied. Codex must stop
before Production mutation, secret acquisition, real charge/refund, store submission,
or legal/accounting policy selection.

## 5. Phase Exit Criteria

### Phase A: External Foundations

- Capacitor Gate 2 evidence accepted;
- Apple and Google manual account checks complete or validly not applicable;
- commercial catalog and Founder decision approved;
- SRA-000 inventory captured and reviewed;
- legal/account-deletion decisions signed off.

### Phase B: Approved Runtime

- bounded security corrective migrations pass sandbox denial and role regressions;
- Capacitor and store adapters remain isolated under `lib/platform`;
- Apple/Google evidence is verified server-side;
- idempotent ledger and entitlement projection pass duplicate, stale, cross-owner, and
  out-of-order tests;
- account deletion completes or escalates without false cancellation or silent data
  retention claims.

### Phase C: Release Candidates

- final binaries pass catalog, disclosure, restore/manage, accessibility, role, sync,
  recovery, PDF, and media scenarios;
- store listing copy, privacy declarations, icons, screenshots, and review notes match
  the submitted binaries;
- Web Production configuration, PWA lifecycle, E2E, media, observability, legal, and
  security evidence are bound to one exact release revision.

### Phase D: Canary And General Availability

- Apple, Google, and Web canaries have named primary/backup owners, alert thresholds,
  support escalation, rollback, and daily review windows;
- every canonical Web and Native gate is `complete`;
- final complete repository test/build/mobile manifest passes on the release revision;
- a dated go/no-go record approves general availability.

## 6. Local Consistency Check

Run:

```powershell
npm.cmd run check:launch-execution-plan
```

Exit `0` means the task graph is structurally valid, acyclic, secret-free, references
every current incomplete Web/Native gate, and does not reopen a complete gate. It does
not mean the product is launch-ready. Exit `64` means the plan or gate relationship is
invalid and must be corrected before relying on this queue.

Existing gate checkers retain their current semantics. In particular, exit `1` from
`check:web-launch-readiness` or `check:native-launch-readiness` is the expected valid
result while launch blockers remain.
