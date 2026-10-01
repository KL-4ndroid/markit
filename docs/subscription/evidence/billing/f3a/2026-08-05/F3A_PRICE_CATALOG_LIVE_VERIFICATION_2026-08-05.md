# F3A Price Catalog Live Verification Evidence

Date: 2026-08-05

Verification UTC timestamp: `2026-08-04T16:27:25Z`

Environment classification: `sandbox`

Supabase project reference: `***xhqjdl`

## Migration

Migration file:

```text
066_add_subscription_price_catalog_foundation.sql
```

Migration SHA-256:

```text
6BCFEE2582EAEE8555717589729386A3158AB98ED0506FCDEAA53E8EA591F190
```

Application record:

```text
Migration 066 was previously confirmed as applied to this sandbox target on
2026-08-01. The exact original UTC apply time was not retained in the available
human evidence.
```

This evidence does not claim that migration 066 was reapplied during the
2026-08-05 verification.

## Scope

This evidence records external verification of the F3A non-billable price catalog
foundation.

Verified records:

* `subscription_price_versions`;
* `billing_storefront_price_mappings`;
* `subscription_price_assignments`.

F3A provides only private candidate price-catalog and assignment foundations. It
does not create checkout, payment collection, provider callbacks, refunds,
cancellations, billing entitlement mutation, or a production billing runtime.

## Read-Only Verification

Verifier executed:

```text
supabase/verification/066_subscription_price_foundation_read_only.sql
```

Result:

```text
PASS
```

Every returned `passed` value was `true`.

The verification confirmed the reviewed F3A foundation remained structurally valid,
including the expected catalog records, empty storefront mappings and assignments,
private access boundaries, RLS configuration, constraints, and unchanged narrow
subscription capability projection.

No migration, rollback, cleanup, seed operation, price activation, assignment writer,
or payment operation was executed during this verification.

## Security Advisor

Result for F3A objects:

```text
PASS
```

The Security Advisor scan for the same sandbox project reported no `ERROR` or `WARN`
affecting:

* `subscription_price_versions`;
* `billing_storefront_price_mappings`;
* `subscription_price_assignments`.

The three F3A tables produced the expected informational finding:

```text
rls_enabled_no_policy
```

This is intentional because the private F3A foundation enables RLS while exposing no
direct client policies.

The project also contained pre-existing unrelated Security Advisor findings involving
staff-access views, existing functions, permissive legacy RLS policies, and Auth
configuration. Those findings were not introduced by migration 066 and were not
automatically remediated during this verification.

## Final Result

```text
Migration 066 previously applied: PASS
Migration file present in reviewed repository: PASS
Migration SHA-256 recorded: PASS
Read-only verifier: all true
Security Advisor for F3A objects: PASS
Unexpected F3A ERROR/WARN findings: 0
Migration reapplied during verification: NO
```

F3A is therefore live and externally verified in the selected sandbox environment.

## Explicit Boundary

This evidence does not authorize:

* activation of candidate prices;
* creation of storefront provider mappings;
* creation of owner price assignments;
* Founder-price acquisition or renewal;
* provider SDK or callback integration;
* checkout or payment collection;
* refunds or cancellation mutation;
* F3C-F3E implementation;
* S9 billing runtime;
* Pro or Team entitlement mutation;
* production billing launch.

The next Codex session must not reapply migration 066 unless the target environment or
reviewed migration contents change. It should reconcile stale launch-status documents
against this evidence while preserving all later billing approval gates.
