# F3B Billing Ledger Live Verification Evidence

Date: 2026-08-04

UTC timestamp: `2026-08-04T15:55:48Z`

Environment classification: `sandbox`

Supabase project reference: `***xhqjdl`

Migration:

```text
067_add_billing_event_transaction_ledger.sql
```

Migration SHA-256:

```text
29FC4B9CBBEA8728687A2F5A55E055B92EB0BC1B23408A4788415305798B42A9
```

## Scope

This evidence records the external verification of migration 067 in the selected
non-production Supabase test environment.

The verification covers only the F3B private billing ledger foundation:

* `billing_customer_links`;
* `billing_subscriptions`;
* `billing_transactions`;
* `billing_event_inbox`;
* `billing_reconciliation_runs`.

It does not approve or enable F3C-F3E, projection writers, callbacks, checkout,
provider SDKs, payment collection, refunds, entitlement mutation, or S9 billing runtime.

## Migration Application

Result: `PASS`

Migration 067 was manually applied to the masked Supabase target identified above.

No rollback, cleanup, seed-data, checkout, callback, writer, or provider-runtime
statement was applied with the migration.

## Pre-Smoke Read-Only Verification

File executed:

```text
supabase/verification/067_billing_event_transaction_ledger_read_only.sql
```

Result: `PASS`

Every returned `passed` value was `true`.

Verified conditions included:

* all five F3B tables exist;
* all required bounded columns exist;
* all five F3B tables are empty;
* RLS is enabled;
* no F3B RLS policies exist;
* no direct role grants exist;
* trigger functions remain private;
* trigger functions are not `SECURITY DEFINER`;
* all expected mutation and deletion triggers exist;
* foreign keys use restricted deletion;
* idempotency constraints exist;
* `subscription_accounts` remains narrow and unchanged.

## Security Advisor

Result for F3B objects: `PASS`

No Security Advisor `ERROR` or `WARN` affected the five migration 067 tables or
their six trigger functions.

The following `INFO` result was expected for the private ledger tables:

```text
rls_enabled_no_policy
```

This is intentional because F3B enables RLS while defining no direct client policies.

The project also contained pre-existing, unrelated Security Advisor findings involving
staff-access views, existing functions, existing RLS policies, and Auth configuration.
Those findings were not introduced by migration 067 and were not automatically remediated
during this verification.

## Guarded Denial Smoke

Command:

```powershell
npm.cmd run smoke:subscription:billing-ledger-foundation -- --execute=denial-only --require-authenticated
```

Result: `PASS`

Summary:

| Role          | Authentication                   | Table/function denial checks | Result |
| ------------- | -------------------------------- | ---------------------------: | ------ |
| anonymous     | not applicable                   |                        26/26 | PASS   |
| authenticated | password grant succeeded         |                        26/26 | PASS   |
| server secret | environment credential available |                        26/26 | PASS   |

Aggregate result:

```text
Password grant: PASS
Anonymous denial checks: 26/26 PASS
Authenticated denial checks: 26/26 PASS
Server-secret denial checks: 26/26 PASS
Total PASS rows: 79
FAIL rows: 0
SKIP rows: 0
Process exit code: 0
```

Expected denial responses included PostgreSQL `42501` and PostgREST `PGRST202`.
No access token, password, API key, complete project URL, account identifier, or
customer data was retained.

## Post-Smoke Read-Only Verification

File executed again:

```text
supabase/verification/067_billing_event_transaction_ledger_read_only.sql
```

Result: `PASS`

Every returned `passed` value remained `true`.

All five F3B tables remained empty after the denial smoke, confirming that no denied
insert, update, or delete probe left residual data.

## Final F3B Result

```text
Migration 067 applied: PASS
Pre-smoke read-only verifier: PASS
Security Advisor for F3B objects: PASS
Authenticated password grant: PASS
Anonymous denial smoke: PASS
Authenticated denial smoke: PASS
Server-secret denial smoke: PASS
Denial smoke exit code: 0
Post-smoke read-only verifier: PASS
Residual F3B rows: 0
```

F3B migration 067 is therefore live and externally verified in this selected sandbox
environment.

## Explicit Boundary

This evidence does not authorize:

* F3C projection writer;
* F3D quote or adjustment-obligation runtime;
* F3E support audit mutation;
* provider callback routes;
* NewebPay or ECPay SDK/runtime integration;
* checkout or payment collection;
* cancellation or refund mutation;
* changes to `subscription_accounts`;
* Pro or Team entitlement grants;
* S9 billing runtime;
* production deployment.

The next Codex session must treat F3B verification as complete and must not reapply
migration 067 or repeat these external checks unless the target environment, migration
contents, or security configuration changes.
