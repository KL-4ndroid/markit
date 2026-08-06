# Native Store Subscription Product Metadata

Date: 2026-08-06

Status: zh-TW candidate product copy complete; six manual reviews pending; Founder mechanism deferred

Gate: `STORE-CATALOG` remains `pending_manual`

## 1. Purpose And Separation

The canonical copy handoff is
`docs/subscription/NATIVE_STORE_PRODUCT_METADATA_2026_08_06.json`. It is distinct from:

- the app listing copy in `NATIVE_STORE_LISTING_METADATA_2026_08_06.json`;
- product/base-plan/offer identifiers in `NATIVE_STORE_CATALOG_CONFIG_2026_08_06.json`;
- localized prices and billing periods returned by Apple or Google;
- in-app purchase disclosures and the separately approved billing runtime.

Run:

```powershell
npm.cmd run check:native-store-product-metadata
```

Exit `1` is expected while brand, product-truth, store-policy, legal, final-binary,
and Founder-policy reviews remain pending. Exit `0` means the candidate copy is ready
for controlled manual console entry; it does not create a product, approve a price,
activate a base plan, enable a purchase, submit an app, or close `STORE-CATALOG`.
Exit `64` means the file cannot be trusted.

## 2. Official Field Baseline

- [Apple In-App Purchase information](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information)
  defines a 2-30 character localized display name and a description of at most 45
  characters. Localized changes require review.
- [Apple auto-renewable subscription information](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/auto-renewable-subscription-information)
  defines subscription groups, service levels, durations, display names, and
  upgrade/downgrade behavior.
- [Google Play subscription setup](https://support.google.com/googleplay/android-developer/answer/140504)
  allows a subscription name of at most 55 characters and up to four benefits of at
  most 40 characters each. Benefits must not advertise a price or trial.
- [Google Play subscription policy](https://support.google.com/googleplay/android-developer/answer/9900533)
  requires accurate recurring value and clear price, billing-frequency, renewal, and
  cancellation disclosures in the purchase experience.

These limits and policies are time-sensitive and must be rechecked on the execution date.

## 3. Product Truth

Free remains a useful account plan but is not a store subscription product. The store
products describe only capabilities marked `included` in the canonical runtime plan:

| Plan | Candidate recurring value |
| --- | --- |
| Pro | Single-market review, cross-market analysis, settlement/PDF reporting, and product-cover photos. |
| Team | All Pro capabilities plus staff collaboration, Manager workflow, and sales-photo evidence. |

The JSON carries the exact capability IDs behind every Apple product and Google
subscription. The parser rejects any capability not currently `included` for that
plan. Team copy does not imply that Team overrides owner-only financial-report or PDF
role checks.

The copy deliberately excludes:

- hard-coded prices, currencies, percentages, billing-period arithmetic, or tax claims;
- free trials, discounts, urgency, lifetime/permanent promises, or unlimited claims;
- Team seat counts, storage quotas, Excel, referrals, or future marketplace features;
- product IDs, base-plan IDs, offer IDs, offer tokens, credentials, or account data.

The actual purchase screen must use store-returned localized price and billing period
and must separately disclose renewal, cancellation, and any offer terms before the user
confirms purchase.

## 4. Founder Boundary

`pro_founder_annual_twd_launch_v1` remains
`deferred_pending_mechanism`. Its feature copy is the same as Pro because price policy
does not create additional capability. No price-lock, percentage, lifetime, or renewal
promise appears in store benefits.

`founderPolicyDecisionStatus` may move to `complete` only after product, accounting,
legal, Apple, and Google owners approve either a sandbox-proven mechanism or an explicit
native-launch deferral. Changing the Founder product to a console-entry candidate also
requires that status to be `complete`; it still does not activate the product.

## 5. Manual Review And Entry

1. Approve the canonical Pro/Team capability matrix and confirm every listed capability
   exists in the final native binary at the intended entitlement and role boundary.
2. Approve brand spelling. The Apple subscription-group name uses `Feria` without the
   diacritic because Apple restricts special/diacritic characters in that field; product
   names retain the canonical `Féria` brand.
3. Recheck Apple/Google current field limits and subscription policies.
4. Complete legal review of recurring-value claims and the separate in-app billing copy.
5. Resolve or explicitly defer Founder on native stores.
6. Validate final native purchase, restore, manage-subscription, downgrade, and
   cancellation behavior before marking final-binary review complete.
7. Enter approved copy manually in protected consoles and retain sanitized revision-bound evidence.

The product-copy preflight, catalog identifier preflight, external-account readiness,
data disclosures, assets, runtime verification, and final sandbox lifecycle are all
independent evidence. Passing one cannot substitute for another.
