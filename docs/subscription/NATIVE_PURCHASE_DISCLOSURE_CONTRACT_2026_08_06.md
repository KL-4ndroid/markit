# Native Purchase Disclosure Contract

Date: 2026-08-06

Status: platform-neutral fail-closed contract complete; purchase UI and billing runtime disabled

## 1. Scope

This contract prepares one safety boundary needed before an Apple or Google
subscription purchase can be enabled. It does not install a store SDK, add a native
adapter, expose a purchase button, create a product, start a charge, verify a
transaction, write billing data, or grant an entitlement.

The implementation is split across:

- `lib/platform/contracts/in-app-purchase.ts`: normalized store price phases;
- `lib/subscription/native-store-catalog.ts`: structural catalog and phase validation;
- `lib/subscription/native-purchase-disclosure.ts`: pure pre-purchase decision;
- `lib/subscription/native-purchase-workflow.ts`: final fail-closed adapter boundary.

## 2. Store-authoritative Pricing

Shared code accepts localized display price, ISO currency code, billing period,
billing-cycle count, and payment mode from the future reviewed native adapter. It does
not calculate monthly equivalents, percentages, taxes, discounts, or renewal prices.

The current catalog intentionally limits final recurring products to the approved
monthly (`P1M`) and annual (`P1Y`) periods. Bounded introductory phases may use a simple
ISO 8601 day, week, month, or year period. A standard option has exactly one indefinite
recurring phase. A configured offer may have bounded free-trial, pay-as-you-go, or
pay-up-front phases, followed by exactly one indefinite recurring phase. Missing,
malformed, mixed-currency, or non-final recurring phases fail catalog validation.

`purchaseOptionId` remains an adapter-local opaque handle. It is not persisted or sent
to the entitlement writer.

## 3. Required Disclosure Decision

`prepareNativePurchaseDisclosure()` returns `ready: true` only when all of the following
are true:

1. the user is authenticated and authorized as the owner;
2. the store account-binding token is ready;
3. server verification runtime is available;
4. product and billing copy have completed manual review;
5. Free access remains available and is disclosed;
6. originating-store subscription management is available;
7. stable HTTPS terms and privacy URLs are present;
8. the selected option belongs to the store product and its price phases are valid.

The resulting disclosure preserves every store-returned price phase and includes the
recurring price, automatic-renewal notice, cancellation path, Free-plan notice, and
account-bound cross-device access notice. Store evidence must still pass server
verification before access changes.

`runNativePurchase()` rejects a missing/blocked disclosure or a product/option mismatch
before calling the store adapter. This prevents a future UI from bypassing the reviewed
disclosure state.

## 4. Policy Basis

- Google Play requires the subscription cost, billing frequency, automatic-renewal
  terms, cancellation path, and available non-subscription access to be clear before
  enrollment: <https://support.google.com/googleplay/android-developer/answer/9900533>
- Google Billing represents sequential prices with `PricingPhase`, including formatted
  price, ISO currency, ISO 8601 billing period, cycle count, and recurrence mode:
  <https://developer.android.com/reference/com/android/billingclient/api/ProductDetails.PricingPhase>
- Apple auto-renewable subscriptions renew until cancellation and should expose status,
  upgrade/downgrade paths, and management access:
  <https://developer.apple.com/app-store/subscriptions/>

These policies and APIs are time-sensitive and must be rechecked when the native store
adapters and final purchase UI are reviewed.

## 5. Remaining Activation Gates

- Phase 2 Gate 2 evidence and reviewed Capacitor/store dependencies;
- Apple/Google account, product, base-plan, offer, price, and sandbox setup;
- approved public terms, privacy, billing, cancellation, refund, and Founder policy;
- server verification, notification, reconciliation, and entitlement writer approval;
- final native UI accessibility, localization, device, lifecycle, and store-review tests.

Until those gates close, Web remains unavailable for checkout and native UI must not
offer purchase. Restore and manage-subscription controls retain their existing
availability guards.
