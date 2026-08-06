# Native Subscription Execution Plan

Date: 2026-08-06

Status: approved direction; implementation is staged and billing remains disabled

Canonical machine state:
`docs/subscription/NATIVE_SUBSCRIPTION_LAUNCH_GATES_2026_08_06.json`

Canonical local check:
`npm.cmd run check:native-launch-readiness`

## 1. Product Decision

The first paid acquisition routes are Apple App Store subscriptions on iOS and
Google Play subscriptions on Android. Web remains available to Free users and
to users whose paid account entitlement was verified from a native store. Web
checkout is deferred; ECPay is the selected later Web recurring provider.

Subscription access binds to the authenticated Féria owner account, never to a
device. The originating store remains responsible for purchase management,
renewal, cancellation, refund, and chargeback. Féria's server-owned entitlement
projection determines application capabilities on every surface.

## 2. Non-negotiable Invariants

1. Login is required before purchase or restore begins.
2. Apple uses an account binding token derived for the authenticated owner;
   Google uses an obfuscated account identifier. Raw owner UUIDs are not exposed
   to the storefront when a one-way binding can be used.
3. A client purchase result, local receipt, IndexedDB row, device identifier, or
   simulator flag never grants Pro or Team by itself.
4. Store evidence is verified by the server before billing ledger or entitlement
   projection changes.
5. One owner workspace may have at most one active paid transaction origin.
6. A valid Apple entitlement is usable after login on Android and Web, and a
   valid Google entitlement is usable after login on iOS and Web.
7. Users manage billing in the originating store. Cross-store upgrade or
   cancellation is never represented as an in-place mutation.
8. Restore may recover a purchase only for the same trusted Féria account
   binding. Arbitrary purchase transfer is a support-reviewed migration.
9. Unknown or stale paid state fails closed for protected writes and presents a
   retry/support recovery state; it is not silently downgraded to Free.
10. Secrets, full receipts, purchase tokens, and provider identifiers are not
    stored in client logs or general application logs.

## 3. Release Tracks

| Track | Acquisition | Access | Current state |
| --- | --- | --- | --- |
| iOS | Apple In-App Purchase | iOS, Android, Web after server verification | priority; not ready |
| Android | Google Play Billing | Android, iOS, Web after server verification | priority; not ready |
| Web | ECPay recurring payment | Web, iOS, Android after server verification | deferred |

The Web launch matrix remains a separate release artifact. An incomplete ECPay
merchant gate does not block native acquisition, but it does block paid Web
checkout. Native launch cannot reuse Web readiness evidence as store evidence.

## 4. Implementation Slices

### Local Pre-runtime Readiness Update

Completed locally on 2026-08-06 without enabling billing or paid authority:

- read-only account subscription center with plan, source, billing, entitlement,
  expiry, and originating-store presentation;
- platform-neutral purchase and restore workflow in which store success always waits
  for server verification and never grants access;
- unconfigured Apple/Google sandbox catalog template with fail-closed mapping and
  active internal-price validation;
- offer-aware product/base-plan selector contract with adapter-local purchase options
  and server-verified immutable price-version mapping;
- client read-contract preparation for future billing and promotion states while the
  server continues returning disconnected Free snapshots;
- capability implementation consistency audit;
- F3C entitlement projection writer proposal as planning only;
- native Apple/Google data-disclosure baseline with code evidence, negative claims,
  provider review fields, and a separate account-deletion blocker;
- native store listing asset inventory, fail-closed structural preflight, and scenario
  matrix without fabricating final native screenshots or upscaling the PWA logo.

Restore and manage-subscription controls remain disabled until a native adapter,
authenticated account-binding token, and approved verification runtime are available.
No Apple/Google SDK, Capacitor project, server verification route, notification route,
writer, or entitlement mutation was added.

### N0: Decision And Gates

- synchronize provider, subscription, Capacitor, and launch documents;
- establish a separate machine-readable Native launch matrix;
- record manual dependencies without secrets.

### N1: Store-neutral Entitlement Core

Status: complete locally on 2026-08-06; no writer or provider runtime

- define native store, purchase state, account binding, restore, active-origin,
  and cross-platform access contracts in shared TypeScript;
- keep billing status, entitlement status, and price-lock status independent;
- add pure validation and fail-closed decision tests.

No database mutation or provider SDK is allowed in N1.

### N2: Platform IAP Port

Status: complete locally on 2026-08-06 with unavailable Web and deterministic fake adapters

- define a `lib/platform` purchase capability with catalog, purchase, restore,
  billing-management, and availability operations;
- represent one product with multiple purchasable options; keep Google offer tokens and
  Apple purchase options behind an opaque, non-persistent `purchaseOptionId`;
- add deterministic unavailable and fake adapters for shared orchestration tests;
- prohibit Apple, Google, browser, React, Dexie, and entitlement mutation imports
  from the contract.

### N3: Verification Contracts

Status: contract complete locally on 2026-08-06; store adapters, routes, notifications, and writers remain pending approval

- normalize Apple transaction/JWS and Google purchase-token verification inputs;
- require provider-observed product, base-plan, and offer identity to resolve the exact
  immutable internal price version;
- define bounded server request/response and safe error contracts;
- add official-sandbox fixture placeholders and corrupted-fixture tests;
- do not add live verification endpoints before secrets, app identifiers, and a
  separate server-runtime review are available.

### N4: Entitlement Reconciliation Writer

Requires separate approval. Implement server-only idempotent reconciliation from
verified store state into the F3 ledger and account projection. This includes
cross-owner denial, duplicate/out-of-order handling, stale-state rejection,
audit evidence, and corrective-forward procedures.

### N5: Capacitor And Native Store Adapters

Requires Phase 2 Gate 2 completion. Install reviewed Capacitor/store packages,
create native projects, isolate native imports under `lib/platform/capacitor`,
and implement Apple and Google adapters. No Production signing or purchase is
part of the baseline.

### N6: Store Configuration And Sandbox

Human-operated Apple/Google accounts provide bundle/package identifiers,
agreements, tax/bank profiles, subscription products, prices, testers, and
server-notification configuration. Execute purchase, renewal, cancellation,
grace, restore, refund, duplicate-origin, account-switch, and cross-platform
access tests.

The candidate product/base-plan structure, Founder price-lock compatibility issue,
activation sequence, and exact trust boundary are recorded in
`docs/subscription/NATIVE_STORE_CATALOG_TOPOLOGY_2026_08_06.md`. `STORE-CATALOG`
remains manual; no product, base plan, offer, price, or mapping is active.
The non-activating handoff file is
`docs/subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json`; run
`npm.cmd run check:native-store-catalog` after recording candidate/deferred decisions.
Exit `1` is expected until all ten rows are explicitly resolved.

### N7: Compliance And Release Candidate

Complete App Privacy, Data Safety, terms, privacy, subscription disclosures,
support, restore/manage-subscription UI, store metadata, screenshots, review
notes, observability, incident drill, and a bounded canary.

The local disclosure audit is recorded in
`docs/subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.md`. It is a
draft input, not a completed store form. `STORE-COMPLIANCE` remains manual and
`ACCOUNT-DELETION` remains pending separate implementation approval because local
Dexie deletion and support copy do not delete an authenticated cloud account.
The planning-only implementation boundary is recorded in
`docs/subscription/ACCOUNT_DELETION_IMPLEMENTATION_PROPOSAL_2026_08_06.md`; its AD1-AD4
slices require separate review and do not authorize destructive migration or runtime.

The candidate zh-TW listing copy, official field limits, reviewer-access boundary,
and eleven external completion checks are recorded in
`docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.md`. The non-secret
handoff is `docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.json`; run
`npm.cmd run check:native-store-metadata` after publishing approved URLs and recording
status-only evidence. Exit `1` is expected while URLs, review access, legal approval,
and final-binary review remain pending. Exit `0` is preflight only and does not close
`STORE-COMPLIANCE` or submit either store listing.

The store listing inventory, canonical delivery paths, screenshot truth boundaries,
and manual completion evidence are recorded in
`docs/subscription/NATIVE_STORE_LISTING_ASSET_BASELINE_2026_08_06.md`. Run
`npm.cmd run check:native-store-assets` for structural preflight. The current expected
exit is `1`, and `STORE-LISTING-ASSETS` remains manual until approved high-resolution
artwork and final native release-candidate screenshots exist.

### N8: Deferred Web Billing

Only after a separate decision, complete ECPay merchant activation, sandbox,
adapter, callback, reconciliation, checkout, cancellation, refund, legal,
accounting, and Web canary gates. Native entitlement behavior must remain
unchanged.

## 5. Duplicate-origin Policy

Before starting a purchase, the server checks the current verified entitlement.
If another paid origin is active, purchase is blocked and the UI directs the
owner to manage the existing subscription in its originating store. If two
origins are later observed because of race, offline purchase, family/account
change, or delayed notification, the server must:

1. preserve access from the latest verified paid state;
2. freeze self-service plan changes and additional checkout;
3. avoid automatically cancelling or refunding either store;
4. create an auditable support reconciliation case;
5. resolve financial responsibility using original-store evidence.

## 6. Human Handoff Inputs

The implementation can consume the following values after the owner provides
them through approved secret/configuration channels:

- Apple Developer team/account type, bundle ID, App Store Connect app ID,
  subscription group and product IDs, sandbox testers, agreements/tax/bank
  readiness, and notification environment;
- Google Play account type, package name, app entry, base-plan/product IDs,
  license testers, payments profile readiness, service account/RTDN readiness,
  and notification environment;
- approved public price points, localized names/descriptions, trial/offer policy,
  grace/account-hold policy, refund/support policy, and Founder eligibility;
- physical iPhone, Android device, and macOS/Xcode access for real builds and
  sandbox evidence.

No credentials, tokens, bank data, legal identity, or full provider references
belong in this repository.

## 7. Stop Conditions

Stop before any action that requires a secret, Production migration, real charge,
refund/cancellation mutation, entitlement write, store submission, Production
notification endpoint, legal/accounting policy decision, or destructive change.

## 8. Definition Of Native Launch Ready

Native launch is ready only when every gate in the Native launch JSON is
`complete`, store sandbox evidence is preserved without secrets, the final
release revision passes the complete repository test/build/mobile manifest, and
Apple/Google canaries have an approved rollback and support owner.

Run `npm.cmd run check:native-launch-readiness` after every gate update. Exit `1`
is expected while any gate remains incomplete; exit `64` indicates a malformed or
inconsistent machine document and must be fixed before relying on the report.
