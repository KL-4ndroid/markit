# Native Store Data Disclosure Baseline

Date: 2026-08-06

Status: draft requires manual, legal, provider, and final-binary review

Machine-readable source:
`docs/subscription/NATIVE_STORE_DATA_DISCLOSURE_BASELINE_2026_08_06.json`

## Purpose

This document converts Féria's current and native-launch data flows into a draft
Apple App Privacy and Google Play Data Safety inventory. It is a conservative
submission aid, not an approved privacy label and not legal advice.

The inventory covers the intended iOS and Android subscription release. It separates
implemented data flows from media-gated flows and contract-only native purchase flows
so that a placeholder contract cannot be mistaken for released collection behavior.

## Official Interpretation Boundary

- Apple requires the developer to identify data collected by the app or third-party
  partners, its purposes, whether it is linked to the user, and whether it is used for
  tracking. Data processed only on-device is outside Apple's collection definition,
  while retained off-device app and web-view traffic can be in scope.
- Google treats off-device transmission by the app or its SDKs as collection, asks
  whether each type is collected or shared, required or optional, and used for which
  purposes, and separately asks about encryption and deletion.
- Service-provider treatment does not remove the developer's duty to inventory the
  data. The final declarations must reflect the released binary, enabled environments,
  provider contracts, logs, and every included SDK.

Current official references:

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple account deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)

Policy and console fields can change. Recheck these official sources when native
packages are selected, before sandbox submission, and again for the release candidate.

## Draft Declaration Summary

| Data surface | Runtime state | Apple draft type | Google draft type | Draft action |
| --- | --- | --- | --- | --- |
| Account email | Implemented | Contact Info / Email Address | Personal info / Email address | Declare |
| Owner, staff, role, workspace IDs | Implemented | Identifiers / User ID | Personal info / User IDs | Declare |
| Brand, market, product, interaction, and note content | Implemented | User Content / Other User Content | App activity / Other user-generated content | Declare |
| Merchant-entered costs, prices, sales, and revenue | Implemented | Financial Info / Other Financial Info | Financial info / Other financial info | Declare conservatively |
| Product covers and sales evidence | Feature gated | User Content / Photos or Videos | Photos and videos / Photos | Declare if enabled in the submitted release |
| Bounded sync incidents | Local implementation; sink pending | Diagnostics / Other Diagnostic Data | App info and performance / Other app performance data | Declare conservatively |
| Support email | External mail workflow | User Content / Customer Support | Messages / Other in-app messages | Review optional-disclosure treatment |
| Native subscription state | Contract only | Purchases / Purchase History | Financial info / Purchase history | Declare before paid native release |
| Opaque native account binding | Contract only | Identifiers / User ID | Personal info / User IDs | Declare with user identifiers |

The JSON contains purposes, processors, code evidence, requiredness drafts, and the
manual decision needed for each row. `contract_only` is never acceptable as final
evidence that a released purchase flow matches a store declaration.

## Negative Claims That Must Stay True

The current direct dependencies and runtime search found no advertising SDK,
cross-app tracking, address-book access, device geolocation, audio, health, biometric,
or app-generated device identifier collection. Market venue text is user-entered
operational content, not a device-location permission.

Féria does not receive payment-card or bank-account details in the native-first model;
Apple or Google handles the payment instrument. Féria will still receive and retain
verified purchase history, transaction references, subscription state, and an opaque
account binding, so the absence of card data is not a "no financial data" claim.

Every negative claim must be re-audited after Capacitor, store packages, permissions,
privacy manifests, or another SDK enters the dependency lockfile.

## Account Deletion Blocker

The current `/support` page describes a support-mediated deletion request. The account
switcher can delete a non-current local Dexie database, but that operation does not
delete the Supabase account or its associated cloud data and must never be presented as
store-compliant account deletion.

The native launch therefore has a separate `ACCOUNT-DELETION` gate. It remains
`pending_approval` until a reviewed slice provides all of the following:

1. A readily discoverable authenticated entry in account settings.
2. A clear initiation and confirmation flow for deleting the whole Féria account and
   associated workspace data, not merely deactivation or local-cache deletion.
3. A public Web resource that remains usable after uninstall and can initiate a request.
4. Server-owned identity verification, owner/staff and pending-write handling,
   subscription-cancellation guidance, retention exceptions, status, audit evidence,
   and corrective-forward recovery.
5. Tests for anonymous denial, cross-owner denial, staff denial, repeat submission,
   pending offline writes, active native subscription, completion, and retained legal
   exceptions.

This document does not authorize an account-deletion migration, RPC, server mutation,
support bypass, or destructive data operation. Those semantics require product, legal,
security, and data-retention approval before implementation.

## Submission Workflow

1. Freeze the release-candidate dependency lockfile, iOS privacy manifests, Android
   manifest permissions, Web views, and enabled Production feature flags.
2. Re-run the code and dependency inventory. Add every SDK and provider behavior absent
   from this baseline.
3. Confirm Supabase, Vercel, Cloudflare R2, Apple, Google, and support-provider terms,
   regions, access, IP/request logging, retention, deletion, and subprocessor behavior.
4. Publish the reviewed privacy-policy URL and public account-deletion resource. Verify
   both without credentials on the exact release host.
5. Complete the account-deletion gate and prove the user-facing and server-side lifecycle
   without using customer data.
6. Replace native purchase contract-only rows with reviewed adapter, server verification,
   notification, ledger, and sandbox evidence.
7. Enter the Apple and Google forms from the reviewed JSON, export or screenshot only
   non-secret answers, and have a second reviewer compare every answer with the binary.
8. Record the exact release SHA, form review date, reviewer roles, and store submission
   revision. Do not place credentials, full identifiers, purchase tokens, or customer
   records in evidence.

## Exit Criteria

`STORE-COMPLIANCE` and `ACCOUNT-DELETION` remain open until:

- every JSON blocking review has dated evidence;
- no row is `contract_only`, `provider_review_required`, or dependent on an unknown
  release flag;
- privacy and deletion URLs are public and stable;
- the app and public Web resource provide the required deletion paths;
- the final binary dependency/permission audit matches both submitted forms;
- product, legal/privacy, security, and support owners approve the same revision.

Completing this local baseline does not change either gate to `complete`.
