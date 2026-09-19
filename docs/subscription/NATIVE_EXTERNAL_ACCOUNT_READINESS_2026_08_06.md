# Native External Account Readiness Handoff

Date: 2026-08-06

Status: status-only handoff implemented; all external account actions remain incomplete

Related gates: `APPLE-DEVELOPER`, `GOOGLE-PLAY-DEVELOPER`, `STORE-CATALOG`,
`SANDBOX-LIFECYCLE`, and the separately approved verification/runtime gates remain open

## 1. Purpose And Safety Boundary

The canonical handoff is
`docs/subscription/NATIVE_EXTERNAL_ACCOUNT_READINESS_2026_08_06.json`. It records only
fixed check IDs and bounded statuses. It must never contain names, addresses, email
addresses, account identifiers, bundle/package values, tester identities, bank or tax
data, API keys, credentials, provider references, or screenshots.

Run:

```powershell
npm.cmd run check:native-external-readiness
```

Exit `1` is the expected current result: 22 manual actions and four runtime-dependent
actions are incomplete. Exit `0` means the status handoff is ready for the separately
approved runtime work; it does not activate billing, approve a gate, create a native
project, submit an app, or prove any console configuration. Exit `64` means the file
cannot be trusted.

The actual sensitive values belong only in Apple/Google protected consoles, approved
secret stores, and restricted accounting/legal records. Retain sanitized evidence
outside this JSON and identify it in the final release record without embedding values.

## 2. Official Preconditions

### Apple

- [Apple Developer account help](https://developer.apple.com/help/account/) covers
  program enrollment and developer-account access.
- [App Store Connect agreements](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements/)
  states that the Account Holder must accept the Paid Apps Agreement before selling
  apps or offering In-App Purchases.
- [Apple tax information](https://developer.apple.com/help/app-store-connect/manage-tax-information/provide-tax-information)
  requires the applicable tax forms and banking information for payments.
- [Create an App Store Connect app record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/)
  requires an app record before build upload and binds it to the selected Bundle ID.
- [Apple sandbox testing](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/overview-of-testing-in-sandbox/)
  uses Sandbox Apple Accounts on a development-signed app and a Developer Mode device.
- [Apple subscription management](https://developer.apple.com/documentation/appstoreconnectapi/managing-auto-renewable-subscriptions)
  models auto-renewable products inside a subscription group.

### Google

- [Google developer account types](https://support.google.com/googleplay/android-developer/answer/13634885)
  distinguishes Personal and Organization accounts and their identity requirements.
- [Required Play Console account information](https://support.google.com/googleplay/android-developer/answer/13628312)
  requires identity and payment-profile maintenance; monetization requires a merchant
  account and verified payout method.
- [Create a Google payments profile](https://support.google.com/googleplay/android-developer/answer/7161426)
  documents the merchant profile and payout setup used for app sales.
- [New personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465)
  may require at least 12 opted-in closed-test users for 14 continuous days before
  production access. This condition depends on account type and creation date.
- [Google Play Billing testing](https://developer.android.com/google/play/billing/test)
  uses license testers and Android devices for non-charge test methods and accelerated
  subscription lifecycle coverage.
- [Google Play subscriptions](https://support.google.com/googleplay/android-developer/answer/140504)
  requires subscriptions, base plans, and offers to be configured in that order.

These requirements are time-sensitive. Recheck the official consoles and documents on
the execution date instead of treating this 2026-08-06 snapshot as permanent policy.

## 3. Status Rules

| Status | Meaning |
| --- | --- |
| `pending_manual` | A human must make or verify the external decision/action. |
| `complete` | The responsible account holder verified the console state and retained dated sanitized evidence. |
| `blocked_dependency` | The action waits for an approved server/native runtime and must not be forced early. |
| `not_applicable` | Allowed only for the two Google personal-account conditional checks after account type and creation-date eligibility are verified. |

Do not mark a check complete from memory, an email promise, local code, a mock, or a
screenshot without matching the current console state. `apple.server_api_access`,
`apple.server_notifications`, `google.play_developer_api_access`, and `google.rtdn`
remain `blocked_dependency` until the corresponding verification and notification
runtime slices are separately approved.

## 4. Manual Execution Order

1. Decide and verify the correct Apple and Google account/legal entity types.
2. Complete program/developer enrollment, identity/compliance checks, and account-holder access.
3. Accept the current paid agreement and complete required merchant, tax, banking, and payout verification in each protected console.
4. Reserve/create the app identity and app record without copying identifiers into this file.
5. Determine whether the Google device and 12-tester/14-day requirements apply; use
   `complete` when fulfilled or `not_applicable` only with eligibility evidence.
6. Create sandbox/license testers and confirm physical Mac/Xcode/iPhone/Android access.
7. Approve the commercial catalog, then create Apple subscription-group products and
   Google subscriptions/base plans without activating unreviewed production billing.
8. Record stable sandbox identifiers only in the separate activation-disabled catalog
   handoff, never in this status file.
9. After separate runtime approval, configure server API access and notifications through
   protected secret/configuration channels, then execute the sandbox lifecycle matrix.

## 5. Gate Mapping

- Apple checks support `APPLE-DEVELOPER`; they do not independently close it.
- Google checks support `GOOGLE-PLAY-DEVELOPER`; conditional personal-account testing
  also affects the release-track timeline.
- Subscription-product checks feed `STORE-CATALOG`, which still requires the separate
  catalog preflight and price/Founder policy approval.
- Tester/device and later notification checks feed `SANDBOX-LIFECYCLE`.
- API and notification status does not authorize `STORE-VERIFICATION`,
  `ENTITLEMENT-WRITER`, `NATIVE-ADAPTERS`, or `NATIVE-CANARY`.

The top-level native launch JSON remains authoritative. This detailed handoff must not
automatically change any launch gate.
