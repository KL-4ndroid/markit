# Native Store Catalog Topology

Date: 2026-08-06

Status: platform-neutral selector contract complete; store topology and identifiers pending manual approval

Gate: `STORE-CATALOG` remains `pending_manual`

Canonical non-activating sandbox handoff file:
`docs/subscription/NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json`

Canonical localized product-copy handoff:
`docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json`

Canonical local preflight:

```powershell
npm.cmd run check:native-store-catalog
npm.cmd run check:native-store-product-metadata
```

The current expected exit is `1`: all ten mappings are intentionally
`unconfigured`. Exit `0` means each mapping is explicitly `candidate` or `deferred`
and both stores have at least one candidate for sandbox query. It does not activate a
mapping, approve a price, query a store, or close `STORE-CATALOG`.

The product-metadata command also currently exits `1` with six manual review blockers.
Its Pro/Team copy is structurally valid and capability-bound, while the Founder product
remains `deferred_pending_mechanism`. Passing that command means console-entry copy is
reviewed, not that any identifier, price, product, base plan, or offer is active.

## 1. Why `productId` Alone Is Insufficient

The first catalog contract treated every internal price version as one store
`productId`. That shape cannot safely represent the current Google Play model: one
subscription product may contain multiple base plans and offers, and the Billing
Library requires the selected offer token to launch the purchase flow. Apple also
supports offer-specific purchase options in addition to the subscription product.

Official references:

- Apple subscription groups, products, and levels:
  <https://developer.apple.com/help/app-store-connect/manage-subscriptions/offer-auto-renewable-subscriptions/>
- Apple StoreKit purchase options:
  <https://developer.apple.com/documentation/storekit/product/purchaseoption>
- Apple offer duration and pricing reference:
  <https://developer.apple.com/help/app-store-connect/reference/pricing-and-availability/in-app-purchase-and-subscriptions-pricing-and-availability>
- Google Play base plans and offers:
  <https://support.google.com/googleplay/android-developer/answer/12154973>
- Google `SubscriptionOfferDetails` and required offer token:
  <https://developer.android.com/reference/com/android/billingclient/api/ProductDetails.SubscriptionOfferDetails>

The shared contract now separates four concepts:

| Field | Authority | Purpose |
| --- | --- | --- |
| `productId` | Store configuration and verified transaction | Identifies the subscription product. |
| `basePlanId` | Google Play configuration and verified subscription | Distinguishes monthly, annual, or other Google base plans; always `null` for Apple. |
| `offerId` | Store configuration and verified subscription | Distinguishes a configured discounted offer; nullable for standard options. |
| `purchaseOptionId` | Native adapter catalog response only | Opaque local handle used to start the selected purchase option. It may encapsulate a Google offer token or Apple purchase option. |
| `pricePhases` | Localized store catalog response only | Ordered trial/introductory phases followed by the recurring price and billing period shown before purchase. |

`purchaseOptionId` is not a price, product mapping, receipt, entitlement, or durable
identifier. Shared code must not parse, log, persist, sync, or send it to the
entitlement writer. The server maps only provider-verified `productId`, `basePlanId`,
and `offerId` to an immutable `mappedPriceVersionId`.

The shared validator limits final recurring periods to the approved monthly (`P1M`) and
annual (`P1Y`) products while allowing bounded introductory phases to preserve their
store-returned ISO 8601 day, week, month, or year period. Standard options require one
recurring phase. Offers require bounded introductory phases followed by exactly one
recurring phase. Shared code displays the
store-localized price and must not derive monthly equivalents, discounts, taxes, or
renewal amounts. The pre-purchase fail-closed boundary is documented in
`NATIVE_PURCHASE_DISCLOSURE_CONTRACT_2026_08_06.md`.

## 2. Candidate Standard Topology

No names below are real store identifiers. Final identifiers must be created manually,
recorded through an approved configuration channel, and verified in each sandbox.

### Apple

- one subscription group for paid Féria access;
- Team products at the higher service level;
- Pro products at the lower service level;
- separate monthly and annual subscription products where Apple requires distinct
  product durations;
- products with equal benefits, including any separately approved Founder product,
  use the same service level only after upgrade/crossgrade timing is verified.

### Google Play

- candidate Pro subscription product with monthly and annual auto-renewing base plans;
- candidate Team subscription product with monthly and annual auto-renewing base plans;
- an offer is represented by `offerId` under its base plan, while the runtime adapter
  supplies the current `purchaseOptionId` returned by Google Play;
- Pro-to-Team and Team-to-Pro replacement timing remains a sandbox test requirement.

This topology is a starting point, not an activation decision. Store-console rules,
tax-inclusive regional prices, upgrade timing, manage-subscription visibility, and
review behavior can require a different grouping.

## 3. Founder Permanent Price Decision

The product policy promises an eligible owner a Founder annual price that remains the
renewal price while paid continuity is preserved and is forfeited after cancellation.
That promise is not automatically equivalent to a normal store offer:

- Apple promotional and offer-code pricing has a configured duration and normally
  transitions to the subscription's standard price;
- Google offer pricing consists of bounded phases and then renews at the base-plan
  price;
- Google legacy price cohorts can retain a previous base-plan price until the user
  changes plan or the cohort is ended, but cohort timing and plan changes must match
  the Féria continuity policy;
- a dedicated lower-price product or base plan may preserve the amount, but it must not
  become purchasable by an ineligible user through store management or plan-change UI.

Before creating Founder store items, product, accounting, and store-review owners must
choose and sandbox-prove one option:

| Candidate | Required proof | Current disposition |
| --- | --- | --- |
| Launch-price cohort followed by a public price increase | Existing subscribers retain the launch price, new subscribers see the public price, and Pro/Team changes preserve or forfeit the cohort exactly as promised. | pending commercial/store review |
| Dedicated Founder product/base plan | Only server-eligible owners can purchase it, ineligible users cannot select it in store management, and restoration/crossgrade behavior preserves the correct amount. | pending commercial/store review |
| Finite store offer | Public copy changes from permanent renewal price to an accurate fixed-duration offer. | policy change; not approved |
| Defer Founder on native | Standard Pro/Team launch first; Founder remains unavailable on native stores. | fallback only; not approved |

Do not create a catalog that charges a user and then denies entitlement because the
store exposed an ineligible Founder item. Eligibility must be proven before purchase,
and every charged verified transaction needs a defined entitlement or refund/support
path.

## 4. Catalog Activation Sequence

1. Approve Apple group/levels and Google product/base-plan topology.
2. Resolve the Founder permanent renewal price decision above.
3. Approve public TWD price points and regional/tax handling.
4. Review localized Pro/Team subscription names and benefits in
   `NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json`; keep price, trial, unlimited,
   unapproved seat/quota, and Founder-renewal claims out of generic benefits.
5. Create sandbox products without committing credentials, account references, or bank data.
6. In `NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json`, record stable `productId`,
   `basePlanId`, and optional `offerId` mappings as `candidate`; mark an intentionally
   omitted launch item `deferred` with all identifier fields `null`.
7. Run both catalog and product-metadata preflights; resolve every required blocker.
8. Query products through reviewed native adapters and validate exact selectors and localized prices.
9. Verify purchase, renewal, cancellation, grace, refund, restore, duplicate origin, and every Pro/Team transition.
10. Approve immutable internal price versions and store mappings in the same release decision.
11. Change mappings to `active` only in a separately approved server-owned configuration after the verifier and entitlement writer are approved. The handoff JSON rejects `active`.

Current mappings and internal prices remain non-billable. This document does not
install a native SDK, create a store product, activate a price, enable checkout, write
billing data, or grant an entitlement.
