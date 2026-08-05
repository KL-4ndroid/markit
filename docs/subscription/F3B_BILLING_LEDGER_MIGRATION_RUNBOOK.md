# F3B Billing Ledger Migration Runbook

Date: 2026-08-05

Status: migration 067 applied and externally verified in the selected sandbox; do not
reapply to the same target; no Production evidence or billing runtime is claimed

Canonical evidence:

```text
docs/subscription/evidence/billing/f3b/2026-08-04/F3B_BILLING_LEDGER_LIVE_VERIFICATION_2026-08-04.md
```

## Scope

Migration `067_add_billing_event_transaction_ledger.sql` creates five empty private
records:

- `billing_customer_links`;
- `billing_subscriptions`;
- `billing_transactions`;
- `billing_event_inbox`;
- `billing_reconciliation_runs`.

The migration adds identity, idempotency, append-only, state-transition, cross-owner,
environment, and delete guards. It enables RLS, adds no policies, and revokes all direct
table and trigger-function access from `PUBLIC`, `anon`, `authenticated`, and
`service_role`.

Provider event sequence values remain bounded opaque strings. Ordering is based on
provider observation time until a provider adapter defines stronger semantics.

F3B does not add a callback route, provider SDK, checkout, charge, refund, cancellation,
projection writer, public RPC, `SECURITY DEFINER` function, or
`subscription_accounts` mutation. Applying migration 067 cannot collect money or grant
Pro/Team capability.

## Preconditions

For a different future target, stop before applying migration 067 unless all conditions
are true. Migration 067 is already verified in the selected sandbox and must not be
reapplied there:

1. Confirm the exact Supabase project reference and classify it as sandbox, staging, or
   production.
2. Confirm migration 066 is present in the same target.
3. Preserve the all-true migration 066 read-only verifier and Security Advisor result.
4. Confirm there is a current database backup or approved provider recovery point.
5. Confirm no F3C writer, callback route, checkout, or provider runtime is deployed.

Do not print or store database passwords, JWTs, API keys, project URLs, customer
references, or account identifiers in the evidence artifact.

## Files

```text
supabase/migrations/067_add_billing_event_transaction_ledger.sql
supabase/verification/067_billing_event_transaction_ledger_read_only.sql
scripts/smoke-subscription-billing-ledger-foundation.mjs
tests/subscription-billing-ledger-foundation.test.ts
```

## Pre-apply Review

Record the migration hash without recording environment values:

```powershell
Get-FileHash `
  supabase/migrations/067_add_billing_event_transaction_ledger.sql `
  -Algorithm SHA256
```

Review the SQL and verify all of the following before approval:

- exactly five F3B tables are created and start empty;
- every foreign key uses `ON DELETE RESTRICT`;
- all five tables enable RLS and have no policies;
- direct access is revoked from all four declared roles;
- no `GRANT`, `SECURITY DEFINER`, public RPC, seed row, or destructive statement exists;
- no `ALTER TABLE public.subscription_accounts` exists;
- no raw callback body column exists;
- the event inbox stores only a bounded ciphertext reference when separately configured.

## Manual Apply For A Different Target

Apply the exact reviewed migration through the approved Supabase migration workflow or
SQL editor. Do not paste any rollback, `DROP`, or cleanup statement into the same
execution.

Do not use this procedure to repeat the already completed selected-sandbox apply.

The expected immediate result is five empty tables. There is intentionally no positive
write path in F3B.

## Read-only Verification

Run this file in an administrative SQL session after the migration succeeds:

```text
supabase/verification/067_billing_event_transaction_ledger_read_only.sql
```

Every returned `passed` value must be `true`. The verifier checks:

- five tables and bounded required columns exist;
- all five tables remain empty;
- RLS is enabled with no policies or direct role grants;
- trigger functions remain private and are not `SECURITY DEFINER`;
- all eight mutation/delete triggers exist;
- all foreign keys use restricted deletion;
- five owner/provider idempotency constraints exist;
- `subscription_accounts` remains narrow and unchanged.

The verifier is a repeatable-read, read-only transaction and ends with `ROLLBACK`.

## Denial Smoke

After the read-only verifier passes, run the guarded denial smoke:

```powershell
npm.cmd run smoke:subscription:billing-ledger-foundation -- `
  --execute=denial-only
```

For authenticated coverage, set the two temporary subscription smoke credential
environment variables, add `--require-authenticated`, and remove the variables after the
run. Never place credentials in command history, documentation, screenshots, or Git.

The smoke requires every select, insert, update, and delete probe on all five tables to
fail with PostgreSQL `42501`. It also verifies all six trigger functions are unavailable
through PostgREST. Insert fixtures either reference impossible foreign keys or violate a
check constraint, so an unexpected privilege cannot create a valid row.

## Evidence Record

Retain only:

- date and UTC timestamp;
- environment classification and a masked project-reference suffix;
- migration filename and SHA-256;
- read-only verifier check names and all-true count;
- denial-smoke role/check counts and statuses;
- Security Advisor status with no row or secret data;
- reviewer and operator names or internal approval references.

## Stop Conditions

Stop and do not begin F3C if any condition occurs:

- the target or migration hash is uncertain;
- migration 066 is absent or its verifier is not all true;
- any F3B row exists immediately after migration 067;
- any direct table or function probe succeeds;
- any RLS policy, direct grant, `SECURITY DEFINER` function, callback route, or writer is
  present;
- any foreign key can cascade-delete billing evidence;
- Security Advisor reports an unresolved issue affecting these objects.

Do not attempt an ad hoc destructive rollback after a deployed migration. Because F3B
has no writer, the safe response is to disable subsequent billing work, preserve the
empty schema and evidence, and prepare a separately reviewed corrective migration.

Completion of this runbook proves only that the private F3B ledger foundation is live.
F3C projection writer, F3D quote/obligation, F3E support audit, S9 provider runtime,
checkout, billing callbacks, and entitlement mutation remain separately blocked.

## Selected Sandbox Verification Result

The 2026-08-04 canonical evidence records migration apply PASS, pre/post read-only
verifier all true, authenticated password grant PASS, 26/26 anonymous denial, 26/26
authenticated denial, 26/26 server-secret denial, 79 total PASS with exit code 0, five
empty ledger tables after smoke, and no F3B Security Advisor ERROR/WARN. This evidence
is sandbox-only and authorizes no callback, writer, checkout, payment, refund,
cancellation, reconciliation mutation, or entitlement mutation.
