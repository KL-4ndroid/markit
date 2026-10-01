# Native Store Listing Asset Baseline

Date: 2026-08-06

Status: local inventory and preflight complete; final store assets pending manual production

Gate: `STORE-LISTING-ASSETS` remains `pending_manual`

Current structural result: three of five structural checks pass; final iOS and
Android screenshot groups remain missing.

## 1. Scope And Authority

This baseline records what can be verified locally before native projects and store
adapters are approved. It does not approve artwork, represent a store submission, or
replace screenshots captured from the final native release candidate.

Canonical local check:

```powershell
npm.cmd run check:native-store-assets
```

Exit `1` remains the expected current result with two missing screenshot checks. Exit
`0` means the required files pass the bounded structural checks below; it does not
mean that Apple, Google, product, legal, or brand review has approved their content.
Exit `64` means the command could not
reliably inspect its input.

Recheck the official requirements immediately before production because store rules
can change:

- Apple app icons: <https://developer.apple.com/design/human-interface-guidelines/app-icons>
- Apple screenshot specifications: <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>
- Google Play preview assets: <https://support.google.com/googleplay/android-developer/answer/9866151>
- Google Play metadata policy: <https://support.google.com/googleplay/android-developer/answer/13393723>

## 2. Existing Asset Audit

| Existing file | Local finding | Store evidence decision |
| --- | --- | --- |
| `logo.png`, `public/logo.png`, `public/logo-alpha.png` | Same 406 x 406 PNG source family | Source candidate only; too small for a native 1024 x 1024 master. |
| `public/icons/icon-512x512.png` | PWA icon generated from the 406 x 406 source | PWA resource only; not approved Google Play artwork. |
| `public/apple-touch-icon.png` | 180 x 180 browser touch icon | PWA/browser resource only. |
| `public/screenshots/home.png` | 540 x 720 Web/PWA screenshot | Does not meet this launch baseline for either native storefront. |
| `store-assets/source/feria-app-icon-master-candidate.png` | New 1254 x 1254 opaque reconstruction based on the legacy mark | High-resolution candidate, not brand approval or final design source. |
| Canonical iOS and Google app icons | Structurally valid outputs derived from the new candidate | Local preflight passes; brand, device, and store-console review remain manual. |
| Canonical Google Play feature graphic | Structurally valid 1024 x 500 candidate | Local preflight passes; brand and store-policy review remain manual. |
| Final native iOS/Android screenshots | Not present | Must be captured from the final native release candidate. |

Do not upscale the 406 x 406 source and label the result as approved master artwork.
Create or export a brand-approved high-resolution source, verify safe zones and
legibility on physical devices, and retain the design source outside generated PWA
artifacts.

### Candidate provenance

The 2026-08-06 candidates were created with the built-in ImageGen workflow. The
legacy mark was used as a visual reference for a fresh high-resolution opaque
reconstruction; it was not directly upscaled and relabeled. A separate wide image was
generated from that reconstruction for the feature graphic. The generated source
candidates are preserved under `store-assets/source/`.

The canonical outputs were produced deterministically with the repository's existing
`sharp` dependency:

- iOS: 1024 x 1024 opaque PNG;
- Google Play icon: 512 x 512 four-channel PNG, under 1 MiB;
- Google feature graphic: center-cropped 1024 x 500 opaque PNG.

This is candidate, not brand approval. Product/brand review may approve, reject, or
replace either source. Replacing a source requires regenerating the canonical outputs
and rerunning the same preflight; no gate state changes solely because files exist.

## 3. Canonical Delivery Paths

The preflight reads only these repository paths:

| Asset | Canonical path | Structural baseline |
| --- | --- | --- |
| iOS app icon | `store-assets/ios/app-icon-1024.png` | PNG, exactly 1024 x 1024; Xcode and manual visual review still required. |
| Google Play icon | `store-assets/google/app-icon-512.png` | 32-bit PNG with alpha, exactly 512 x 512, at most 1 MiB. |
| Google feature graphic | `store-assets/google/feature-graphic-1024x500.png` | PNG or JPEG, exactly 1024 x 500, no alpha. |
| iOS zh-TW screenshots | `store-assets/ios/screenshots/zh-TW/` | 1-10 PNG/JPEG files without alpha in an accepted 6.9-inch size. |
| Google zh-TW screenshots | `store-assets/google/screenshots/zh-TW/` | 4-8 PNG/JPEG files without alpha, 9:16 or 16:9, short side at least 1080 pixels. |

The iOS rule deliberately targets one current 6.9-inch phone set for the first launch.
Additional device classes and localizations remain a submission-time decision. The
checker does not validate visual safe zones, icon masks, text legibility, localized
copy, device frames, or whether the screenshot depicts the submitted binary.

## 4. Screenshot Scenario Matrix

Capture only real current UI from the approved native release candidate using a
disposable authenticated sandbox workspace. Do not use customer data, the public
`/demo` route, the subscription simulator, placeholder prices, or fabricated paid
state as production store evidence.

| Order | Scenario | Required truth boundary |
| ---: | --- | --- |
| 1 | Today dashboard with an active market | Current native shell and representative disposable data. |
| 2 | Market planning and lifecycle states | Only states actually shipped in the reviewed binary. |
| 3 | Live market sales and interaction recording | No real customer or payment data. |
| 4 | Product and inventory workflow | Current products and stock behavior. |
| 5 | Analytics and market recap | Capture only with a real verified entitlement if the screen is paid. |
| 6 | Team roles and collaboration | Capture only with a real Team entitlement and disposable staff identities. |
| 7 | Subscription account, restore, and billing management | Capture only after real store adapters and catalog mapping are active. |

Avoid claims about rankings, discounts, prices, awards, or features that cannot be
verified in the submitted build. Promotional overlays and device frames require a
separate manual policy and legibility review. Screenshot captions and overlays must
also match the approved copy and truth boundaries in
`NATIVE_STORE_LISTING_METADATA_2026_08_06.md`.

## 5. Completion Evidence

`STORE-LISTING-ASSETS` may move to `complete` only after all of the following are true:

1. `npm.cmd run check:native-store-assets` exits `0` at the release-candidate revision.
2. Product/brand review approves the icon and feature graphic from a high-resolution source.
3. Screenshots come from the final iOS and Android native release candidates and match shipped behavior.
4. Apple and Google current official specifications are rechecked on the submission date.
5. Privacy, subscription, pricing, role, and account-deletion claims match their independently approved gates.
6. The sanitized evidence records revision, date, locale, device class, check IDs, and approval owners without secrets or customer data.

This gate does not authorize Capacitor installation, native store adapters, purchases,
entitlement writes, store submission, or release canary.
