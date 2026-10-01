# Local Subscription Identity Simulation

Date: 2026-07-30
Status: implemented and authenticated UI-smoke verified for local validation only
Scope: Free, Pro, and Team account-capability simulation

## Purpose

Allow an authenticated owner to validate subscription presentation and access
gates without creating a paid row or changing billing data. This is a test
harness, not an entitlement source and not a billing substitute.

## Activation

The server-only environment variable must be set in a local ignored environment
file and the request URL must use a loopback host:

```text
SUBSCRIPTION_SIMULATION_ENABLED=true
```

Supported loopback hosts are `localhost`, `127.0.0.1`, and `[::1]`. The tool is
disabled when the variable is absent or false, for non-loopback URLs, and when a
Vercel deployment marker exists. No `NEXT_PUBLIC_*` variable grants access.

The local workspace uses ignored `.env.development.local` and
`.env.production.local` files so both `next dev` and local `next start` can run
the harness. Those files are not deployment configuration.

## Runtime Contract

- The owner opens `/subscription` and enables the local simulation switch.
- The UI calls authenticated `GET` and `POST`
  `/api/dev/subscription-simulation` requests.
- State is stored in server process memory, keyed by authenticated actor id.
- A state expires after four hours, is removed when disabled, and is lost when
  the server restarts.
- `GET /api/account-capabilities` checks the simulation only after bearer-token
  authentication and only for a loopback request with the private flag enabled.
- A simulated snapshot uses the existing plan model and returns the explicit
  `simulation_enabled` read status.

## Independent Gates

Simulation can exercise client/local capabilities that already consume the S4
account-capability read, including analytics, settlement report tiers, and local
PDF generation. It does not bypass:

- owner, manager, operator, viewer, or unresolved role decisions;
- runtime/environment feature flags;
- data-completeness requirements;
- RLS, RPC, ownership, active relationship, or server-write authorization;
- product-cover or sales-evidence upload routes;
- payment, checkout, founder pricing, promotion, or referral state.

Team simulation therefore does not turn a staff account into an owner and does
not authorize high-cost cloud writes. This separation is intentional: it allows
tests to prove that plan inclusion alone cannot bypass another required gate.

## Validation Matrix

| Simulated plan | Single-market and advanced analytics | Full settlement/PDF | Team model capabilities |
| --- | --- | --- | --- |
| Free | blocked or approved Free preview | Free summary; PDF blocked | false |
| Pro | included, subject to role/runtime/data | included for owner, subject to runtime/data | false |
| Team | inherits Pro | inherits Pro | true in capability model; role/server gates remain independent |

## Recorded Validation Evidence

Authenticated browser smoke passed on 2026-07-30:

- Free kept the bounded recent-three and basic-settlement previews while paid
  analytics, PDF, and Team collaboration actions remained blocked;
- Pro opened paid analytics, full settlement, and PDF presentation while Team
  collaboration remained blocked;
- Team inherited Pro presentation and exposed Team capability state, but every
  cloud-mutating Team control remained disabled by simulation mode;
- subscription, Team, and settlement surfaces had no horizontal overflow at
  390px, 768px, 1440px, and 1920px widths;
- no console error occurred, no auth/browser storage was inspected, and no
  subscription or collaboration data was mutated.

## Production Stop Conditions

- Never configure `SUBSCRIPTION_SIMULATION_ENABLED` in staging or production.
- Never persist simulation in Supabase, Dexie, browser storage, cookies, or an
  operational event.
- Never accept a plan from the account-capability query string, request header,
  local storage, or public environment.
- Never let simulation authorize a paid server write, upload claim, billing
  mutation, referral grant, or founder-price assignment.
- Remove or disable the local environment flag before collecting deployment
  evidence.
