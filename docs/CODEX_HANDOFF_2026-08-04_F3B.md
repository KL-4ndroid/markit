# Codex Handoff — F3B External Verification Complete

Date: 2026-08-04

## Current Repository Baseline

Relevant commits before the external verification:

```text
097f2be feat(subscription): add private billing ledger foundation
1696691 docs(pwa): record desktop and Android baseline
```

## Human-Completed External Work

Migration 067 was applied and externally verified in the selected sandbox Supabase
environment.

Canonical evidence:

```text
docs/subscription/evidence/billing/f3b/2026-08-04/F3B_BILLING_LEDGER_LIVE_VERIFICATION_2026-08-04.md
```

Completed results:

```text
Migration 067 application: PASS
Read-only verifier before smoke: all true
Security Advisor for F3B objects: PASS
Authenticated password grant: PASS
Anonymous denial checks: 26/26 PASS
Authenticated denial checks: 26/26 PASS
Server-secret denial checks: 26/26 PASS
Denial smoke exit code: 0
Read-only verifier after smoke: all true
All five F3B tables after smoke: empty
```

The first authenticated attempts failed because the test account belonged to the
production Supabase project while `.env.local` targeted the sandbox project. A sandbox
Auth test user was then created, and the complete authenticated smoke passed.

## Instructions For The Next Codex Session

Do not:

* reapply migration 067;
* create F3B RLS policies;
* grant direct access to F3B tables or trigger functions;
* rerun destructive cleanup or rollback;
* treat the expected `rls_enabled_no_policy` INFO result as a defect;
* begin F3C, F3D, F3E, checkout, callback, provider runtime, or entitlement mutation
  without separate approval.

First repository task:

1. Read the canonical F3B evidence file.
2. Reconcile stale status statements that still say migration 067 is not applied.
3. Update the appropriate canonical documents and machine-readable launch gate records
   in one reviewed commit.
4. Preserve the boundary that F3C-F3E and S9 remain unapproved.
5. Record the pre-existing Security Advisor findings as a separate security-remediation
   workstream.
6. Because those findings involve staff-access views, RPCs, RLS policies, and staff-role
   behavior, update the project permission-distribution Markdown whenever that
   remediation changes viewer, operator, manager, owner, PermissionGate, useUserRole,
   sync, Dexie, RPC, or data-visibility behavior.

Documents likely requiring status reconciliation:

```text
docs/subscription/F3B_BILLING_LEDGER_MIGRATION_RUNBOOK.md
docs/subscription/BILLING_DATA_SECURITY_DESIGN.md
docs/subscription/BILLING_TEST_MATRIX.md
docs/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md
docs/WEB_LAUNCH_READINESS_2026_07_30.md
docs/WEB_LAUNCH_MANUAL_ACTIONS_2026_08_01.md
WEB_LAUNCH_GATES_2026_08_01.json
```

Important launch-state interpretation:

* F3B external verification is complete for the selected sandbox environment.
* The combined `F3B-F3E` launch gate must not be marked complete because F3C-F3E remain
  unapproved and unimplemented.
* General Web launch remains `NO-GO`.
* PWA real-install, production configuration, media, paid staging, legal/support,
  provider activation, S9, observability, and production canary evidence remain open.
