# Web Production Configuration Check

Date: 2026-08-01

Status: local read-only preflight implemented; production evidence not yet collected

## Scope

The checker validates the paid Web launch configuration contract and never prints
environment values. It does not connect to Supabase, R2, Vercel, or a billing provider,
does not prove that credentials work, and does not enable any route or feature.

It checks:

- Supabase HTTPS origin, browser anon key, and dedicated bounded `sb_secret_` key;
- exact CORS origins and production release metadata resolved from the same environment,
  package version, Vercel/Git SHA, and build-time fallback order as `next.config.mjs`;
- bounded public support email, reviewed operator identity and business address, public
  policy effective date, and server-only legal approval date;
- disabled internal debug routes, subscription simulation, test-page, and fault-injection controls;
- account-deletion route/repository/Production gates remain `0` and its HMAC secret remains absent until AD3/AD5 approval;
- paired sales-evidence client/server production gates and bounded cron authorization;
- private R2 configuration structure;
- product-cover read/upload/delete gates, quota, and paid entitlement mode;
- populated secret-like values never use a `NEXT_PUBLIC_` name.

## Run against a local environment file

```powershell
npm.cmd run check:production-config -- --env-file=.env.production.local
```

The command exits `0` only when every contract passes, `1` when configuration is not
ready, and `2` when the checker itself cannot run. JSON output is available for a
deployment evidence job:

```powershell
npm.cmd run check:production-config -- --env-file=.env.production.local --json
```

Do not attach the source environment file to evidence. Record only the checker output,
deployment name, commit SHA, operator, and timestamp.

Release metadata does not require three manually maintained Vercel values. Explicit
`NEXT_PUBLIC_APP_*` values win when supplied; otherwise the build uses `package.json`,
`VERCEL_GIT_COMMIT_SHA` or local Git, and the build timestamp. The checker validates the
resolved result without printing it.

## Paid-launch boundary

The safe repository example intentionally keeps production gates disabled and
`PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open`. A paid production launch must use a
separately managed environment with `PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=required`
and can enable media gates only after migration, R2, authorization, quota, cleanup, and
staging smoke evidence pass.

Account deletion remains closed during AD2. Production must keep
`ACCOUNT_DELETION_ROUTE_ENABLED=0`, `ACCOUNT_DELETION_AD2_REPOSITORY_READY=0`, and
`ACCOUNT_DELETION_ROUTE_ALLOW_PRODUCTION=0`, with no `ACCOUNT_DELETION_HMAC_SECRET`.
AD3/AD5 may revise this rule only after the concrete repository, destructive
non-Production evidence, recovery plan, and exact Production approval exist.

Passing this check is necessary but not sufficient. `LEGAL_POLICY_APPROVED_DATE` is a
deployment assertion, not a substitute for the signed review required by
`WEB_LEGAL_SUPPORT_LAUNCH_REVIEW.md`. Follow with:

1. Vercel environment-name review without exposing values;
2. production build tied to the same commit SHA;
3. `/api/health`, CORS, invalid-token, authorized and denied route smokes;
4. Supabase migration/RPC verification;
5. R2 upload/read/delete/expiration evidence;
6. unauthenticated support/terms/privacy smoke plus a real support-case drill;
7. immediate clearing of any temporary test or fault-injection configuration.

The result updates `PROD-CONFIG` from `evidence_missing` only after those remote checks
are recorded. It does not approve F3C-F3E, S9, billing, referral rewards, or a production
canary.

## Latest local snapshot

The 2026-08-01 read-only check of `.env.production.local` produced `4 passed / 17
failed`. No values were emitted or recorded. Failed check IDs:

```text
supabase_public_url
supabase_anon_key
supabase_server_secret
cors_allowlist
production_app_environment
public_support_contact
public_operator_identity
legal_policy_publication
development_surfaces_disabled
fault_injection_cleared
sales_client_runtime_gate
sales_server_route_gates
expiration_cron
r2_private_storage
product_cover_runtime_gates
product_cover_paid_entitlement
product_cover_quota
```

This snapshot proves only that the local production file is not a paid-launch
configuration. It is not evidence about current Vercel settings and must be rerun after
the approved production variables are configured.
