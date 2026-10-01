# Free Monetization And Ad Presentation Plan

Date: 2026-08-10

Status: Product decision and execution plan. No advertising SDK is approved by this document.

## 1. Decision Summary

BoothBook should treat advertising as supplementary Free-plan revenue, not as the main business model. The primary economic path remains converting users who need deeper analytics, reports, product photos, and collaboration into Pro or Team.

The recommended Free monetization order is:

1. Curated affiliate offers and direct sponsors relevant to market vendors.
2. A user-initiated "Market Vendor Resources" area in Settings.
3. At most one clearly labeled sponsor card on eligible review surfaces.
4. A contextual, non-personalized ad network only if direct partnerships cannot supply enough inventory.

The first release must not include app-open ads, interstitial ads, rewarded ads, autoplay media, sticky bottom banners, or automatically refreshing placements.

Free users retain an uninterrupted core workflow. Pro and Team are third-party-ad-free.

## 2. Product Principles

### 2.1 Protect the operational workflow

Ads must never appear while the user is trying to operate a market, record a sale, capture or manage a photo, edit products, sync data, recover an account, or resolve an error. These actions are time-sensitive and may involve irreversible decisions.

Ads may appear only after the user's primary task is complete or when the user explicitly enters a resource-discovery surface.

### 2.2 Make relevance more important than impression volume

Preferred partner categories are directly useful to market vendors:

- payment and card-reader services;
- packaging, labels, and printing;
- booth fixtures, tables, tents, lighting, and displays;
- logistics, storage, and inventory supplies;
- business insurance, bookkeeping, and vendor tools;
- market-organizer services that have been manually reviewed.

No partner may receive a user's sales, product, customer, market-performance, location-history, or team data.

### 2.3 Never disguise advertising

Every paid placement must show `廣告` or `合作推薦` before the sponsor name. An affiliate link must include this adjacent disclosure:

> 透過此連結購買，我們可能獲得分潤，價格不受影響。

The visual treatment may match the product design system, but it must remain distinguishable from BoothBook data, recommendations, upgrade prompts, and system notices.

### 2.4 Do not make Free deliberately unpleasant

Free should demonstrate the app's value and build trust. Advertising must not be used as friction to force an upgrade. The Pro promise is more insight and capability plus an ad-free experience, not relief from an intentionally obstructive Free experience.

## 3. Approved Placement Matrix

| Surface | Free | Pro / Team | Rule |
|---|---|---|---|
| Login, onboarding, password recovery, account deletion | No ad | No ad | Sensitive account flow |
| Today and active-market workspace | No ad | No ad | Core operational flow |
| Sale entry, quick sale, totals, cost entry | No ad | No ad | No interruption around writes |
| Camera, photo picker, upload, delete, retry | No ad | No ad | No ad next to consent or destructive actions |
| Sync, conflict, offline, permission, and recovery UI | No ad | No ad | Safety and recovery remain unambiguous |
| Market and product create/edit forms | No ad | No ad | Preserve concentration and draft safety |
| Market list and product list | No ad in v1 | No ad | Reconsider only with measured evidence |
| Completed-market detail | One sponsor card at the end | No third-party ad | Only after all business data and actions |
| Weekly/monthly review and analytics | One sponsor card after the summary | No third-party ad | Never between a metric and its explanation |
| Settlement/report preview | One sponsor card at page end | No third-party ad | Keep separate from export and upgrade controls |
| Settings > Market Vendor Resources | Curated offers | Optional partner offers, hidden by default | User-initiated discovery surface |
| Subscription and upgrade screens | No ad | No ad | Never place sponsor content near purchase decisions |

Responsive behavior:

- Web desktop may use a reserved right-side placement only on review pages, provided it does not reduce report readability.
- Web narrow layouts and mobile place the sponsor card after the relevant summary content.
- A placement must have stable dimensions so loading or failure cannot shift metrics or controls.
- Missing inventory collapses the reserved area completely; it must not show an empty ad frame.

## 4. Frequency And Interaction Policy

Initial limits are deliberately conservative:

- maximum one paid placement per screen;
- maximum two rendered impressions per app session;
- maximum four rendered impressions per account per local day;
- maximum one completed-market placement for the same market;
- no timed refresh, carousel rotation, or motion used to regain attention;
- a dismissal hides the same campaign for at least seven days on that account;
- no placement while a market is active, even when another otherwise eligible page is opened;
- tapping a sponsor opens the system external browser, not an embedded WebView;
- the ad is never the primary button and never intercepts navigation.

An impression is counted only after at least 50% of the placement is visible for one continuous second. A fetched but unseen placement is not an impression.

## 5. Monetization Model

### 5.1 Recommended first model: direct affiliate and sponsor inventory

Create manually reviewed campaigns with a fixed destination, start/end time, disclosure, applicable platforms, and placement allowlist. This gives BoothBook control over relevance, visual quality, privacy, and frequency while the audience is still developing.

Supported commercial arrangements may include:

- affiliate commission after a qualified purchase or signup;
- fixed monthly sponsorship for the resource center;
- fixed fee for a limited campaign on review pages;
- member discount with a disclosed referral fee.

Do not promise ranking or app recommendations in exchange for payment. Sponsored offers and editorial recommendations must be stored and presented as different content types.

### 5.2 Resource center

Add `設定 > 出攤資源` as the primary monetized destination. It should support category filters, partner name, concise value proposition, discount or offer terms, expiry, eligibility restrictions, and the affiliate disclosure.

This area is useful even when no paid campaign exists: approved unpaid resources can remain available, while paid items are labeled and ranked according to an explicit policy.

### 5.3 Contextual sponsor cards

Sponsor selection may use only coarse first-party context such as placement ID, platform, language, and campaign availability. It must not use the user's sales amount, products, market history, precise location, customer data, or inferred business performance.

Examples:

- a completed-market review may show a general packaging offer;
- a monthly report may show a bookkeeping-tool sponsor;
- all Free users in the same locale receive the same eligible campaign rotation.

### 5.4 Network advertising fallback

Do not add a network SDK during the direct-partner pilot. If the pilot cannot maintain inventory or revenue, evaluate one provider separately for Web and one for native surfaces.

The first eligible formats are native ads or inline adaptive banners on review pages. Start with contextual or non-personalized delivery. App-open, interstitial, and rewarded formats remain outside the approved scope.

Provider approval requires a privacy/security review of every SDK dependency, collected data category, consent behavior, deletion behavior, app-store declaration, network domain, and remote kill switch.

## 6. Free, Pro, And Team Contract

Add advertising as an independently resolved product capability rather than scattering `plan === 'free'` checks through UI components.

Candidate shared capabilities:

| Capability | Free | Pro | Team |
|---|---|---|---|
| `monetization.partner_resource_access` | Included | Included | Included |
| `monetization.sponsored_placements` | Eligible | Disabled | Disabled |
| `monetization.third_party_ads` | Disabled in v1; remotely eligible later | Disabled | Disabled |

Rules:

- a stale, unavailable, or ambiguous plan resolution must fail closed and hide paid placements;
- entitlement resolution is server-authoritative;
- an ad provider cannot grant, revoke, or infer subscription entitlement;
- upgrading to Pro or Team hides third-party placements immediately after authoritative entitlement refresh;
- downgrading to Free does not show an ad until both the Free entitlement and current placement policy are confirmed;
- BoothBook's own critical service announcements are not ads and follow a separate message policy.

## 7. Cross-Platform Architecture

This feature must follow `docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`.

Suggested boundaries:

```text
lib/monetization/
  types.ts                 campaign, placement, disclosure, consent types
  eligibility.ts           plan, role, active-market, and frequency rules
  frequency-policy.ts      deterministic caps and dismissal rules
  selection.ts             contextual campaign selection
  telemetry.ts             privacy-safe event contract

lib/platform/
  advertising-capability.ts
  external-link-capability.ts
  consent-capability.ts

lib/platform/web/
  advertising-adapter.ts
  external-link-adapter.ts
  consent-adapter.ts

lib/platform/capacitor/     future only, after native Gate 2 approval
```

The shared UI asks the capability layer whether a placement is eligible and renders a shared presentation model. It must not import a browser ad script or future native SDK directly.

Required runtime controls:

- global advertising kill switch;
- per-platform kill switch;
- per-placement enablement;
- per-campaign start/end and emergency disable;
- provider mode: `off`, `house`, `direct_partner`, or future `network`;
- production allow flag separate from local/preview enablement.

No client should assume same-origin APIs. Partner redirects and campaign reads use the configurable HTTPS API base URL. Cached frequency state is a UX optimization; server-side policy remains authoritative where abuse or billing reporting matters.

## 8. Data, Privacy, And Compliance Baseline

Collect only first-party operational events needed to measure and control placements:

- placement eligible;
- placement rendered;
- qualified impression;
- click;
- dismiss;
- destination-open failure;
- campaign unavailable or blocked.

Do not send account ID, user ID, market ID, product ID, revenue, customer data, or free-form notes to a partner. Internal analytics should use a rotating pseudonymous identifier and aggregate reporting with restricted retention.

Before any provider or campaign goes live:

1. Update the privacy policy and app-store data disclosures.
2. Document data controller/processor responsibilities and retention.
3. Verify whether the selected SDK performs cross-app or cross-site tracking.
4. Implement consent and revocation where required by region and platform.
5. Confirm the SDK's Apple privacy manifest and Google Play Data safety declarations.
6. Verify that ad targeting does not use sensitive data.
7. Confirm every paid relationship is clearly disclosed and every claim is truthful.

Apple requires ads to match the app's age rating, makes developers responsible for ad SDK behavior, and requires permission when data is used to track users across other companies' apps or websites. Google Play prohibits unexpected disruptive ads and requires accurate disclosure of third-party SDK data handling. EEA, UK, and Switzerland personalized-ad delivery may also require a Google-certified consent management platform. See the official references in section 13.

Preferred launch posture: direct campaigns with no third-party tracking SDK and no behavioral targeting. This reduces consent and review complexity, but it does not remove the obligation to disclose affiliate relationships and BoothBook's own analytics accurately.

## 9. Measurement And Guardrails

Primary business metrics:

- affiliate revenue per Free monthly active account;
- sponsor fill rate and qualified click rate;
- partner conversion rate where aggregate reporting is available;
- Free-to-Pro conversion and trial starts;
- net revenue after partner, provider, and support costs.

UX guardrail metrics:

- completion time for market review and monthly review;
- sponsor dismissal rate;
- accidental click and immediate-return rate;
- review-page abandonment;
- Free 7-day and 30-day retention;
- ad-related support contacts and privacy complaints;
- app performance, layout shift, and crash rate.

Initial stop conditions for an experiment:

- primary review-task completion time worsens by more than 5%;
- eligible-page abandonment increases by more than 3 percentage points;
- accidental-click signals exceed 10% of sponsor clicks;
- any campaign causes data disclosure, layout obstruction, crash, or store-policy risk;
- complaints show users cannot distinguish ads from BoothBook recommendations.

The exact commercial success threshold should be approved only after baseline MAU, retention, and Pro conversion data are available.

## 10. Delivery Phases

### M0 - Contract and safe simulator

Scope:

- approve this placement matrix and naming;
- add shared monetization types, eligibility policy, and tests;
- add runtime kill switches with production disabled;
- implement a local `house` sponsor simulator with no external SDK;
- add privacy-safe telemetry contracts;
- add screen-reader labels and stable loading dimensions.

Exit criteria:

- prohibited surfaces cannot render placements in unit and navigation tests;
- Pro and Team always resolve to no third-party placement;
- unresolved entitlement, offline policy uncertainty, and active-market state hide placements;
- Web and future native adapters can use the same presentation model.

### M1 - Curated resource center pilot

Scope:

- build `設定 > 出攤資源`;
- onboard a small manually reviewed partner set;
- add redirect and disclosure handling;
- implement dismissal, expiry, and campaign emergency disable;
- publish privacy and affiliate disclosure updates.

Exit criteria:

- no partner receives BoothBook business data;
- external links work through the platform capability;
- expired or disabled campaigns disappear without redeployment;
- disclosure is visible before the user taps the offer;
- accessibility and mobile/Web responsive checks pass.

### M2 - Limited review-page sponsor pilot

Scope:

- enable one sponsor card on completed-market and weekly/monthly review surfaces;
- enforce session, daily, market, and dismissal caps;
- run a limited percentage rollout with holdout users;
- compare business and UX guardrails.

Exit criteria:

- no prohibited surface renders an ad during full workflow smoke tests;
- all UX guardrail metrics remain within approved thresholds;
- upgrading removes placements without app restart;
- the global kill switch removes inventory without redeployment.

### M3 - Optional network evaluation

Enter only if M1 and M2 cannot produce sustainable inventory or revenue.

Scope:

- compare native and Web providers separately;
- complete SDK, privacy, consent, performance, and store-policy review;
- test contextual/non-personalized native or inline adaptive formats only;
- retain direct inventory as the preferred source.

Exit criteria:

- legal and store-data declarations are approved;
- consent denial does not block core app use;
- SDK failure does not shift layout or interrupt navigation;
- revenue improvement justifies added privacy, binary-size, performance, and maintenance cost.

## 11. Required Test Matrix

At minimum, automate these cases:

- Free / Pro / Team / unresolved entitlement;
- owner / manager / staff where relevant;
- active / upcoming / completed market;
- online / offline / reconnect / app background and resume;
- consent granted / denied / unknown / revoked;
- campaign active / expired / disabled / missing creative;
- impression cap reached / dismissal cap active / new local day;
- narrow mobile / wide Web / reduced motion / screen reader;
- subscription upgrade or downgrade while the app is open;
- external destination success, cancellation, and failure;
- global and per-platform kill switches;
- direct partner mode and future network-provider failure.

## 12. Decisions Required Before Implementation

The following decisions are intentionally not inferred by code:

1. Final Chinese navigation name: `出攤資源` is recommended.
2. Whether Pro and Team may voluntarily browse disclosed partner offers; recommended: yes, with no automatic placements.
3. Eligible partner categories and prohibited categories.
4. Partner review owner, campaign approval process, and emergency contact.
5. Attribution window and aggregate conversion-reporting method.
6. Revenue-share or fixed-sponsorship commercial terms.
7. Data retention periods for internal ad telemetry.
8. Geographic launch scope and resulting consent requirements.
9. M1 and M2 experiment size, duration, and commercial success threshold.
10. Whether network advertising should remain permanently disabled after direct-partner results are known.

## 13. Official Policy References

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple User Privacy and Data Use: https://developer.apple.com/app-store/user-privacy-and-data-use/
- Apple privacy manifests: https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk
- Google Play disruptive ads policy: https://support.google.com/googleplay/android-developer/answer/9857753
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Data safety guidance: https://support.google.com/googleplay/android-developer/answer/10787469
- Google AdMob ad formats: https://support.google.com/admob/answer/6128738
- Google rewarded-ad policy: https://support.google.com/admob/answer/7313578
- Google consent requirements for EEA, UK, and Switzerland: https://support.google.com/admob/answer/13554020
- Taiwan Fair Trade Commission Internet Advertising Guidelines: https://law.ftc.gov.tw/law/LawContent.aspx?id=GL000222

## 14. Explicit Non-Goals

This plan does not authorize:

- installing AdMob, AdSense, affiliate, attribution, or consent SDKs;
- installing Capacitor packages or creating iOS/Android projects;
- behavioral or personalized ad targeting;
- sharing BoothBook operational data with advertisers;
- app-open, interstitial, rewarded, autoplay, sticky, or refreshing ads;
- ad-based unlocking of core records, exports, photos, or recovery actions;
- changing current subscription prices or entitlement enforcement;
- enabling production advertising before M0 and M1 gates pass.
