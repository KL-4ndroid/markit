# Native Store Listing Metadata Baseline

Date: 2026-08-06

Status: candidate zh-TW copy complete; external URLs, review access, approvals, and final binary review pending

Gate: `STORE-COMPLIANCE` remains `pending_manual`

## 1. Purpose And Boundary

The canonical handoff file is
`docs/subscription/NATIVE_STORE_LISTING_METADATA_2026_08_06.json`. It contains
candidate public copy and status markers only. It must not contain reviewer credentials,
support email addresses, secrets, store account identifiers, customer data, or payment
details.

Run the bounded local check with:

```powershell
npm.cmd run check:native-store-metadata
```

Exit `1` is expected while external values and approvals are pending. Exit `0` means
the handoff is structurally ready for manual console entry; it does not submit an app,
approve its legal claims, activate subscriptions, or complete `STORE-COMPLIANCE`.
Exit `64` means the input cannot be trusted.

## 2. Official Constraints Used

Recheck current requirements on the actual submission date:

- [Apple app information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information/): app name and subtitle limits, categories, and privacy URL requirements.
- [Apple platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information): description, promotional text, keywords, support URL, and review notes.
- [Apple app privacy](https://developer.apple.com/help/app-store-connect/reference/app-privacy/): privacy policy and optional privacy choices URL.
- [Google Play app setup](https://support.google.com/googleplay/android-developer/answer/9859152): app name, descriptions, category, and support contact.
- [Google Play preview assets and text](https://support.google.com/googleplay/android-developer/answer/9866151): short description and public listing restrictions.
- [Google Play store listing practices](https://support.google.com/googleplay/android-developer/answer/13393723): accurate, concise copy without ranking, price-promotion, or keyword-spam claims.
- [Google Play app review](https://support.google.com/googleplay/android-developer/answer/9859455): app access, ads, audience, privacy, and permission declarations.
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469): Data safety and privacy policy obligations.

The preflight deliberately uses conservative limits: Apple name/subtitle 30
characters, promotional text 170 characters, description 4,000 characters, keywords
100 UTF-8 bytes; Google name 30 characters, short description 80 characters, and full
description 4,000 characters.

## 3. Product-Truth Rules

The candidate copy uses the canonical product name `Féria - 出攤筆記` and describes
the shared market, product, cost, sales, interaction, and operational-record workflows.
It intentionally excludes:

- prices, trial periods, the Founder 65% proposal, discounts, or renewal promises;
- Team seat counts or collaboration limits that are not yet approved catalog policy;
- photo upload, storage capacity, unlimited usage, or production media claims;
- PDF or advanced-analysis promises that require a verified paid entitlement;
- awards, rankings, testimonials, urgency, or calls to install;
- statements that native purchase, restore, account deletion, or cross-store entitlement
  is already active.

These exclusions prevent draft commercial policy and locally verified Web behavior from
being represented as native release-candidate behavior. Paid feature disclosures may be
added only after the corresponding store runtime, catalog mapping, entitlement, legal,
and final-binary gates are complete.

## 4. Human Completion Steps

1. Approve the exact brand punctuation, category, zh-TW copy, and any additional locale.
2. Publish stable HTTPS support, privacy, and account-deletion resources on the final
   public origin. Localhost, `/demo`, draft pages, and redirect-only placeholders do not qualify.
3. Configure the Apple review contact and Google Play contact email directly in their
   consoles. Do not commit those values to this handoff.
4. Create a non-expiring reviewer account with disposable data and least-privilege
   access. Supply its credentials only through the stores' protected review fields.
5. Replace the draft access notes with exact navigation for the submitted binary,
   including any subscription, restore, role, and deletion paths that are not obvious.
6. Reconcile App Privacy, Data safety, ads, target audience, permissions, subscription
   disclosures, and account deletion with the final dependency lockfile and binary.
7. Obtain product, legal/privacy, support, and release-owner approval and retain dated,
   sanitized evidence tied to the release revision.

The JSON status may move to `configured_external` or `complete` only after the matching
external action is evidenced. URLs may be recorded only after publication. Reviewer
credentials and contact email values always remain outside the repository.

## 5. Completion Meaning

The metadata preflight can exit `0` only when all eleven checks pass: public origin,
Apple support/privacy URLs, Google support/privacy URLs, account-deletion URL, review
contact, reviewer account, Google contact email, legal review, and final-binary review.

Even then, `STORE-COMPLIANCE` remains governed by the broader native launch gate,
including the approved privacy forms, subscription disclosures, assets, account deletion,
native runtime evidence, and store-console submission review. This document does not
authorize Capacitor, native adapters, store SDKs, purchases, entitlement writes, or submission.
