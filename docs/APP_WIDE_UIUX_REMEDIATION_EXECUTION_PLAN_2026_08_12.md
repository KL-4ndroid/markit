# Féria Application-Wide UI/UX Remediation Execution Plan

Date: 2026-08-12
Status: In progress; UX-R0 through UX-R4 completed
Supersedes for new UI/UX work: the remaining Web implementation recommendations in `WEB_UIUX_SCORE_IMPROVEMENT_EXECUTION_PLAN_2026_07_23.md`
Continues release-evidence work from: `MOBILE_UIUX_FULL_FLOW_AUDIT_2026_08_10.md`

## 1. Objective

Raise the verified overall UI/UX score from approximately **7.6/10** to at least **8.7/10** without weakening permissions, sync safety, offline durability, mobile operating speed, or future iOS/Android portability.

The result must provide:

- a fast and predictable mobile operating workflow;
- a true desktop Web workspace for review, comparison, analytics, and reporting;
- one truthful capability, sync, and data-confidence presentation across all pages;
- user-facing recovery flows that do not require storage or event-schema knowledge;
- accessible overlays, controls, and navigation;
- production pages that do not expose developer-only controls.
- conservative Free-plan monetization surfaces that generate revenue without interrupting operating, editing, safety, or subscription workflows.

This plan is deliberately split into reviewable slices. An implementation AI must complete and verify one slice before starting the next.

## 2. Verified Baseline

The 2026-08-12 authenticated browser audit covered 375x812, 390x844, and 1440x900 viewports across Today, markets, add/edit market, operating market, review, field notes, checklist, products, add/edit product, analytics, settlement, settings, team, recovery, subscription, join, support, about, privacy, and terms.

### Current strengths to preserve

- No horizontal overflow was found at 375px or 390px in the reviewed authenticated routes.
- Mobile operating order is understandable and efficient: operating summary, interaction controls, payment/product-sale actions, recent records, then collapsed field work.
- Ended markets route to review instead of exposing operating actions.
- Required fields appear before optional sections in add/edit market and product forms.
- Organizer notes, handoff notes, and checklist have distinct purposes.
- The settlement report already demonstrates an effective wide Web presentation.
- Core mobile commands generally meet the 44px touch-target requirement.

### Verified gaps

| Priority | Problem | User impact | Current evidence |
| --- | --- | --- | --- |
| P0 | Product cover-photo availability is contradictory | Users cannot predict whether an existing product can receive a photo | Add product shows `加入照片`; edit product shows `商品照片目前無法使用` for the same signed-in account/runtime |
| P0 | Developer subscription controls are visible in the normal subscription route | Production users see internal simulation and database-verification concepts | `本機訂閱身分模擬` and `驗證資料庫權限` appear in `/subscription` |
| P1 | Desktop authenticated shell remains a mobile shell stretched across 1440px | Web review and comparison waste screen space and feel unfinished | Fixed bottom navigation remains; many pages use only 720-896px |
| P1 | Product detail gives the empty image state more importance than business data | Price, margin, inventory, and sales are pushed below a large placeholder | Large hand-emoji placeholder dominates the first viewport |
| P1 | Analytics presents formal grades before data confidence is sufficient | Users may over-trust weak conclusions | `資料不足` appears alongside S/C/D grades and zero-value Z scores |
| P1 | Recovery exposes implementation terminology | Owners must interpret database and event internals before choosing an action | IndexedDB, `deal_closed`, and `Pending operation diagnostics` remain reachable in the default path |
| P1 | Detail navigation and initial sync presentation remain uncertain | Users briefly lose confidence that the app is ready | Detail readiness is about 1.7-1.9 seconds; account may initially show `尚未完成同步檢查` |
| P2 | Some overlays lack complete dialog semantics | Keyboard and assistive-technology operation is unreliable | Backfill, interaction setup, and Theme Lab need explicit dialog/focus verification |
| P2 | Some controls and public-page links are below 44px | Small targets are harder to operate on touch screens | Product back control and several public/recovery actions are 20-40px high |
| P2 | Public error and release-readiness copy still exposes internal or provisional language | Invite failures are less understandable and public trust pages are not launch-ready | `/join` says Token; support/legal pages still declare missing operator/support evidence |

## 3. Non-Negotiable Boundaries

Every slice must follow `docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`.

### Shared business behavior

- Keep capability, permission, sync, analytics-confidence, formatting, and recovery-state decisions in platform-neutral modules.
- Web desktop components may present more information but must consume the same shared models as mobile.
- Do not duplicate mobile and desktop domain logic or data fetching.
- Do not introduce browser APIs into shared domain, data, sync, or permission modules.
- Camera, file selection, PDF preview, download, clipboard, and lifecycle access must continue through `lib/platform` contracts.

### Safety and authorization

- Do not expand owner, manager, or staff permissions.
- Keep role refresh fail closed for privileged commands while preserving already authorized page content where safe.
- Do not change sync cursors, event semantics, offline queues, conflict handling, upload behavior, or RLS in a UI slice.
- Do not enable destructive recovery, automatic cache replacement, or silent local-data clearing.
- Keep cloud rebuild as the primary recovery direction; local backup and raw diagnostics remain secondary support tools.

### Scope control

- Do not start Capacitor package installation, native projects, or native adapters in this plan.
- Do not change subscription billing, prices, payment status, or store entitlement writing.
- Do not change analytics calculations in a presentation slice. If current calculations are wrong, stop and open a separate calculation-correction plan.
- Do not overwrite unrelated worktree changes.

## 4. Target Scorecard

| Area | Baseline | Target | Release definition |
| --- | ---: | ---: | --- |
| Mobile operating workflow | 8.5 | 9.0 | Core actions remain one-tap, correctly gated, and usable with keyboard/safe areas |
| Markets and reviews | 8.2 | 8.8 | Mobile scanability remains; desktop supports comparison without duplicated logic |
| Products | 6.5 | 8.6 | Photo state is truthful; first viewport prioritizes selling information |
| Analytics and settlement | 7.5 | 9.0 | Desktop answers key business questions with explicit confidence and methodology |
| Settings and team | 7.6 | 8.5 | Clear grouping, stable status, no responsive regressions |
| Recovery and subscription | 6.1 | 8.5 | User language by default; production excludes developer tools |
| Desktop shell | 5.8 | 8.8 | Persistent side navigation and meaningful use of wide space |
| Accessibility and feedback | 7.0 | 8.6 | Dialog, focus, contrast, zoom, and touch-target gates pass |
| Free monetization UX | Not active | 8.5 readiness | Approved placements, provider-neutral contracts, consent, frequency, and no-ad safety zones are verified before activation |
| Overall | 7.6 | >=8.7 | All required journeys and role checks pass on a production build |

## 5. Execution Order

```text
UX-R0 Baseline contracts
  -> UX-R1 Truthful state and production boundaries
  -> UX-R2 Product workflow and first-viewport quality
  -> UX-R3 Responsive authenticated shell
  -> UX-R4 Desktop collections and settings
  -> UX-R5 Analytics and reporting workspace
  -> UX-R6 Recovery information architecture
  -> UX-R7 Accessibility and overlay completion
  -> UX-R8 Free monetization placement readiness
  -> UX-R9 Loading, performance, and release evidence
```

UX-R1 and UX-R2 fix trust defects before the broad desktop redesign. UX-R3 establishes the shared responsive shell before individual desktop pages are expanded. UX-R8 reserves and verifies deliberately limited ad surfaces after the surrounding page structure is stable. UX-R9 is evidence and tuning, not a place to defer known functional defects.

## 6. Execution Slices

### UX-R0 - Baseline Contracts And Visual Evidence

**Goal:** Freeze the current mobile strengths and create tests that fail for the intended remaining gaps.

Tasks:

- Record screenshots and structural metrics at 360x800, 375x812, 390x844, 430x932, 768x1024, 1024x768, 1440x900, and 1920x1080.
- Cover owner routes: Today, market list, active market, ended review, products, product detail, analytics, settlement, settings, account, team, data/recovery, and subscription.
- Add a staff matrix for permitted routes and absence of owner-only values/actions.
- Add presentation contracts for:
  - one navigation surface per breakpoint;
  - no horizontal overflow;
  - 44px primary touch targets;
  - product photo capability consistency;
  - developer controls absent from production presentation;
  - recovery default path free of raw storage/event terminology.
- Record console errors, layout shifts, route readiness timing, focus restoration, and 200% zoom failures.

Suggested artifacts:

- `tests/app-wide-uiux-presentation-contract.test.ts`
- `tests/app-wide-responsive-shell.test.ts`
- `docs/APP_WIDE_UIUX_BASELINE_2026_08_12.md`

Acceptance:

- Current mobile operating order is represented by a regression test.
- Tests identify the known desktop, product, subscription, and recovery gaps without changing runtime behavior.
- Baseline screenshots are taken from a production build and include the build hash.

### UX-R1 - Truthful State And Production Boundaries

**Goal:** Remove contradictions and internal controls before visual expansion.

Tasks:

1. Derive add and edit product-photo presentation from one shared capability result.
2. Distinguish loading, available, temporarily unavailable, unauthorized, and runtime-disabled states; do not treat unknown as available.
3. Ensure add/edit forms receive the same resolved capability and user-facing reason.
4. Keep the pre-subscription policy already selected by the product: authorized owner/manager access is open until future entitlement enforcement is approved; ordinary staff remain read-only.
5. Hide subscription simulation and database-verification controls from normal production UI. Development/test access must require an explicit server-side development gate and authorized account.
6. Replace `尚未完成同步檢查` in ordinary loading moments with an active, non-error state such as `正在確認同步狀態`; use the existing shared sync presentation model.
7. Verify Account, global sync indicator, analytics warnings, and any destructive-action preflight use consistent labels.
8. Replace public invite errors such as `缺少邀請 Token` with user language such as `邀請資訊不完整`, while retaining support-safe error classification outside the UI copy.
9. Keep support/privacy/terms draft warnings truthful until operator identity, support channel, and legal approval are actually configured. Do not hide the warning to make the page look launch-ready.

Primary files:

- `components/products/ProductCoverPhotoField.tsx`
- `components/products/AddProductForm.tsx`
- `components/products/EditProductForm.tsx`
- `lib/products/product-cover-photo-client.ts`
- `lib/products/product-cover-photo-model.ts`
- `components/subscription/SubscriptionSimulationPanel.tsx`
- `app/subscription/page.tsx`
- `lib/subscription/subscription-presentation.ts`
- `components/settings/AccountSyncPanel.tsx`
- `components/common/SyncStatusIndicator.tsx`
- shared sync presentation modules under `lib/sync/`
- `app/join/page.tsx` and public support/legal presentation components as applicable

Required tests:

- Extend `tests/product-cover-photo.test.ts`.
- Extend `tests/subscription-capability-presentation.test.ts` and `tests/subscription-center-ui.test.ts`.
- Extend `tests/sync-presentation-state.test.ts`.
- Add a production-build static/runtime assertion that test controls are absent.

Acceptance:

- The same account and runtime state yields the same product-photo action in add and edit forms.
- Unknown or failed capability checks fail closed with a recovery action, not a misleading upload button.
- Production `/subscription` contains no simulation or database-verification control.
- All sync surfaces use the same state label for the same input.
- Public invite errors contain no unexplained Token or implementation terminology.
- Missing support/operator/legal readiness remains an explicit release blocker until verified configuration exists.
- No entitlement, upload, permission, or sync write semantics change.

Stop if the contradiction is caused by server capability data, account entitlements, or environment variables rather than presentation wiring. Report the exact evidence before changing server or deployment configuration.

### UX-R2 - Product Workflow And First-Viewport Quality

**Goal:** Make product browsing and editing information-first while retaining one-cover-photo behavior.

Tasks:

- Replace the large no-photo detail placeholder with a compact category icon or neutral thumbnail region.
- Put name, status, price, cost/margin where authorized, inventory, sold count, and primary edit action in the first viewport.
- Make the back command at least 44x44px and provide an accessible name.
- Keep image dimensions stable with `aspect-ratio`; loading, missing, expired/unavailable, and error states must not shift the layout.
- Remove duplicate destructive actions. Keep status and deletion operations in one management area, with explicit confirmation and permission checks.
- Improve no-photo product-card density without making cards difficult to scan.
- Keep product-photo processing and file access behind existing product/platform services; do not move image logic into the page component.
- Validate add/edit forms with a software keyboard and sticky actions at 360-430px.

Primary files:

- `components/products/ProductDetailScreen.tsx`
- `components/products/ProductDetailQueryScreen.tsx`
- `components/products/ProductCard.tsx`
- `components/products/ProductCoverPhotoImage.tsx`
- `components/products/ProductCoverPhotoField.tsx`
- `components/products/ProductFormFields.tsx`
- `components/products/AddProductForm.tsx`
- `components/products/EditProductForm.tsx`

Acceptance:

- At 390x844, price and inventory/sales summary are visible without scrolling past a large placeholder.
- All product commands meet 44px touch targets.
- Product cards do not become taller solely because no cover exists.
- Delete/disable commands appear in one predictable management location.
- Staff cannot see cost, margin, edit, upload, disable, or delete commands unless existing permission contracts allow them.

### UX-R3 - Responsive Authenticated Shell

**Goal:** Replace the desktop mobile-shell presentation with one responsive app shell while preserving mobile navigation.

Tasks:

- Extract navigation data and active-route resolution into a shared, platform-neutral presentation model.
- Keep the five-item bottom navigation below 1024px.
- At 1024px and above, render a persistent left navigation rail/sidebar and remove the bottom bar.
- Add shared page-shell width modes: `focused`, `workspace`, and `report`.
- Remove desktop bottom-safe padding while retaining mobile safe-area handling.
- Keep navigation mounted through role revalidation; privileged destinations remain fail closed.
- Preserve route state, scroll state where appropriate, and current mobile market operating order.
- Public, join, demo, auth, and future native-specific routes stay outside the authenticated desktop shell where appropriate.

Primary files:

- `components/AppChrome.tsx`
- `components/BottomNavigation.tsx`
- `components/navigation/AppBottomNavigationBar.tsx`
- new shared components under `components/layout/`
- new or existing navigation model under `lib/navigation/`

Acceptance:

- Mobile retains the familiar five-item bar and safe-area clearance.
- Desktop has exactly one persistent navigation surface and no fixed bottom bar.
- Owner and staff receive only their authorized navigation destinations.
- No duplicated provider, data fetch, domain logic, or route component is introduced.
- Role refresh does not blank the page or temporarily reveal privileged commands.

### UX-R4 - Desktop Collections, Details, And Settings

**Implementation status:** Complete on 2026-08-12. Runtime contracts and browser evidence are recorded in `tests/app-wide-uiux-desktop-density.test.ts` and `docs/APP_WIDE_UIUX_BASELINE_2026_08_12.md`.

**Goal:** Use wide screens for comparison and repeated work, not merely wider margins.

Markets:

- Keep mobile cards and stage tabs.
- Add a compact desktop list/grid showing status, full date range, location, result/pending state, and one primary action.
- Preserve current lifecycle classification and ended-market gating.
- Retain the operating-market two-column workspace; rebalance widths only after the shell is stable.

Products:

- Use a desktop grid or compact table with search, category filters, image state, price, stock, sales, and one action.
- Keep mobile card order and product-photo behavior from UX-R2.

Settings:

- Use a two-column settings index or category navigation plus content.
- Keep focused widths for long forms and destructive confirmations.
- Do not put cards inside cards or create decorative dashboard panels with no workflow value.

Forms:

- Preserve required-first order and validation behavior.
- Use two columns only for independent fields with clear reading order.
- Keep cancellation, dirty-state protection, autosave behavior, and keyboard-safe actions unchanged.

Acceptance:

- At 1440x900, market and product pages show meaningfully more comparable information than at 390px.
- Desktop settings navigation reduces back-and-forth without duplicating subpage state.
- No mobile command order, lifecycle rule, permission boundary, or write path changes.
- No nested cards, clipped labels, or empty decorative columns.

### UX-R5 - Analytics Confidence And Web Reporting Workspace

**Goal:** Make Web analytics the strongest review experience while preventing overconfident conclusions.

Tasks:

1. Define a shared presentation-level confidence state: insufficient, emerging, usable, and strong. Map existing sample counts/data-quality outputs without altering calculations.
2. When confidence is insufficient, hide formal grades, Z scores, rankings, and precise claims that imply statistical reliability.
3. Use `初步觀察` plus the missing-data action when partial evidence is still useful.
4. Move Z scores, weights, formulas, and methodology into an accessible disclosure.
5. Create a desktop workspace with:
   - compact scope/filter toolbar;
   - KPI row;
   - recommendation and next action as the main column;
   - trends/comparisons and data quality as supporting columns;
   - accessible table fallback for charts.
6. Keep mobile one-column ordering and recommendation-first behavior.
7. Keep settlement report's effective wide layout; reduce the nine-action list to the three highest-priority actions and place the remainder under `查看完整建議`.
8. Low-confidence PDF/report output must visibly retain draft/low-confidence status.

Primary files:

- `components/analytics/AnalyticsDashboard.tsx`
- `components/analytics/AdvancedAnalyticsSection.tsx`
- other presentation components under `components/analytics/`
- presentation/view-model modules under `lib/analytics/`
- `app/reports/settlement/page.tsx`
- presentation/view-model modules under `lib/reporting/`

Required tests:

- Extend `tests/analytics-data-completeness.test.ts`.
- Extend analytics subscription-access tests without changing entitlements.
- Extend settlement report model/UI tests for top-three action presentation and low-confidence labeling.
- Add accessible chart/table equivalence tests.

Acceptance:

- A user can answer which market to revisit, whether recent results improved, which product performs best, and how reliable each conclusion is.
- Insufficient data never renders a formal grade or zero-value statistical placeholder as a valid conclusion.
- At 1440px, summary, recommendation, comparison, and data quality are visible without a long single-column search.
- Existing analytics calculations and owner-only report access remain unchanged.

Stop and open a separate correction plan if tests reveal a calculation defect, impossible percentage, invalid sample rule, or mismatched source data.

### UX-R6 - Recovery Information Architecture

**Goal:** Let a non-technical owner choose the safest recovery action without reading implementation details.

Default user path:

1. Current status: healthy, waiting to sync, needs attention, or unavailable.
2. What is affected: this device, cloud account data, or an unfinished local action.
3. Safest next action: retry sync, preview cloud rebuild, contact support, or do nothing.
4. Explicit consequence and whether unsynced work is protected.

Tasks:

- Replace default-path terms such as IndexedDB, event type, table, projection, canonicalization, and `deal_closed` with user language.
- Move raw pending-operation diagnostics, import safety, event/schema details, and repair internals behind an owner-only `進階診斷` disclosure.
- Require a second explicit action before loading detailed diagnostics.
- Reuse the existing local pending-write report and cloud-rebuild preview; do not create a second detector.
- Keep clear-local and permanent-delete actions separated from repair/rebuild actions and visually de-emphasized.
- Add a support-ready diagnostic copy/export action only if it uses an existing platform clipboard/share port and excludes secrets or sensitive payloads.
- Do not enable new destructive execution.

Primary files:

- `app/settings/data/page.tsx`
- `app/recovery/page.tsx`
- `components/common/DatabaseRecoveryPanel.tsx`
- `components/common/OwnerRevenueGapRepairPanel.tsx`
- `components/common/OwnerPendingOperationDiagnosticsPanel.tsx`
- `components/common/LocalProjectionRepairPanel.tsx`
- `components/settings/DataCanonicalizationPanel.tsx`

Acceptance:

- The default recovery path contains no unexplained English, storage implementation, raw event type, or schema field name.
- Pending local work remains visible and blocks unsafe clearing.
- Technical details are owner-only, collapsed by default, and fail closed.
- No migration, RLS change, cloud mutation, cache deletion, import, automatic retry, or repair expansion is introduced.

### UX-R7 - Accessibility And Overlay Completion

**Goal:** Make every reviewed workflow operable by touch, keyboard, and assistive technology.

Tasks:

- Give backfill, interaction setup, Theme Lab, product forms, market forms, and confirmation overlays a labelled dialog contract.
- Implement focus trap, initial focus, Escape close where safe, background inertness, and trigger-focus restoration.
- Confirm bottom-sheet mobile back behavior without coupling shared logic to browser history.
- Replace functional emoji with Lucide icons; hide purely decorative emoji from assistive technology.
- Raise every command target to at least 44x44px, including product back and public-page links.
- Verify `aria-expanded`, `aria-controls`, selected tab state, disabled explanations, form errors, and live success/undo announcements.
- Validate default and built-in Theme Lab palettes for 4.5:1 normal-text contrast and 3:1 large-text/UI contrast.
- Verify 200% zoom and 320px width without horizontal overflow or hidden commands.

Primary files:

- shared dialog, sheet, form, tab, and accordion primitives
- `components/settings/InteractionSetupWizard.tsx`
- `components/dev/ThemeLab.tsx`
- market/product backfill and form overlays
- public route layouts and navigation

Acceptance:

- Keyboard-only users can open, complete, cancel, and close every reviewed overlay.
- Focus never moves to the obscured page while an overlay is active.
- All primary/secondary commands meet 44px targets on touch layouts.
- No product or workflow meaning depends on emoji alone.
- Default plus every built-in theme passes the required contrast matrix.

### UX-R8 - Free Monetization Placement And Provider Readiness

**Goal:** Prepare low-interruption revenue surfaces for Free accounts without installing an advertising SDK or enabling production ads in this slice.

Detailed product and policy source: `docs/subscription/FREE_MONETIZATION_AND_AD_PRESENTATION_PLAN_2026_08_10.md`.

#### Provider decision

- **Web:** use manually placed responsive AdSense units only if the later network-ad gate is approved. Do not enable Auto ads because automatic placement cannot reliably preserve the prohibited workflow zones in this plan.
- **iOS and Android:** use a future AdMob adapter after the native Gate 2 approval. Do not load Web AdSense scripts inside the Capacitor application. Google treats ads embedded in applications differently and directs app inventory to the Mobile Ads SDK or an approved WebView integration.
- **Direct affiliate or sponsor inventory:** preferred first source on every platform because placement, relevance, privacy, frequency, and visual quality remain under product control.
- **Other affiliate networks:** may be evaluated through the same campaign and external-link contracts; no provider SDK may bypass the shared eligibility, consent, labeling, or kill-switch rules.

#### Approved first-version placement matrix

| Surface | Mobile Free | Desktop Web Free | Format | Rule |
| --- | --- | --- | --- | --- |
| Settings > `攤商資源／合作優惠` | Approved | Approved | User-initiated list of curated affiliate/sponsor offers | Primary monetization surface; useful even without paid inventory |
| Completed-market review | One placement at page end | One placement at page end or restrained secondary rail after all primary review content | Clearly labeled sponsor/native card | Never between a metric and its explanation or next action |
| Weekly/monthly Analytics | One placement after the complete summary block | One placement below data-quality context in the secondary rail | Sponsor/native card; future responsive display slot | Never inside KPI, chart, recommendation, filter, or methodology groups |
| Settlement report page | One placement at page end | One placement at page end | Sponsor/native card or future responsive display slot | Never inside PDF, print, export, preview, upgrade, or share output |
| Market list and product list | Not approved in v1 | Not approved in v1 | None | Reconsider only after the review-page experiment has UX evidence |
| Today and active-market workspace | Prohibited | Prohibited | None | Protect interaction, payment, product sale, photo, notes, and checklist speed |
| Add/edit forms and destructive dialogs | Prohibited | Prohibited | None | Protect attention, draft safety, and accidental-click boundaries |
| Login, join, account, sync, recovery, permission, subscription, and purchase | Prohibited | Prohibited | None | No ads in identity, safety, error, entitlement, or payment contexts |

#### Presentation rules

- Use one shared `SponsoredPlacement` presentation contract with visible `廣告` or `合作推廣` labeling before the sponsor name.
- Affiliate disclosure must be adjacent to the offer before the user taps it; do not disguise a paid placement as Féria analysis, recommendation, system notice, navigation, or upgrade advice.
- Prefer a static native-style sponsor card with logo/image, one short value statement, terms/expiry, and one external-link command.
- No autoplay audio/video, animation for attention, countdown, pop-up, app-open ad, interstitial, rewarded ad, collapsible overlay, sticky top/bottom banner, carousel, or timed refresh in v1.
- Do not place an ad beside back, save, delete, payment, quantity, navigation, photo, or checklist controls. Include clear separation and padding to reduce accidental taps.
- A slot may reserve stable dimensions only after eligibility and consent permit a request. When advertising is disabled, the account is ad-free, consent is unavailable, or inventory fails, render no empty card and no permanent whitespace.
- Mobile uses inline content placement instead of an anchored banner because the app already has persistent bottom navigation and time-sensitive touch controls.
- Desktop may use a restrained rail placement only when the main content remains at least as readable as the ad-free layout; otherwise use page-end placement.
- An ad click opens the platform external browser through the existing external-link capability, not an embedded WebView.

#### Free, Pro, Team, and state rules

- Free is eligible only after an authoritative Free capability, placement allowlist, consent state, active-market exclusion, frequency policy, and provider kill switch all resolve positively.
- Pro and Team never receive automatic third-party placements. They may voluntarily open the disclosed resource center if the product keeps that benefit available.
- Unknown, stale, loading, offline-uncertain, or failed entitlement/capability state must hide ads. Never risk showing an ad to a paid account.
- If any market is currently active, automatic placements remain hidden across the application for that operating session.
- Upgrading to Pro/Team removes rendered and queued placements immediately after authoritative capability refresh; it must not require an app restart.

#### Frequency and privacy defaults

- Maximum one paid placement per eligible screen.
- Maximum two rendered impressions per app session and four per account per local day.
- No refresh within the same screen view.
- Dismissing a direct campaign hides that campaign for at least seven days.
- Start with contextual or non-personalized delivery. Never use revenue, products, customers, notes, team data, market performance, photo content, or precise location for ad selection.
- Do not initialize a provider or request an ad until required consent/privacy state is resolved.
- Provide an accessible `隱私權與廣告設定` entry for review and revocation when required.
- Google ad delivery to the EEA, UK, or Switzerland requires the applicable Google-certified CMP/TCF path. Legal review still determines obligations in each launch region.

#### Architecture and implementation phases

Shared, platform-neutral modules:

```text
lib/monetization/
  types.ts
  placement-policy.ts
  eligibility.ts
  frequency-policy.ts
  presentation.ts
  telemetry.ts

lib/platform/
  advertising-capability.ts
  consent-capability.ts
  external-link-capability.ts
```

Platform adapters:

- `lib/platform/web/`: `off`, test/house, direct-affiliate, and future AdSense adapters.
- `lib/platform/capacitor/`: future AdMob adapter only after native Gate 2 approval.
- Shared UI imports only the platform contract and shared presentation model, never AdSense globals or an AdMob SDK.

Phases:

1. **UX-R8A - Contracts and invisible reservations:** implement types, eligibility, placement IDs, no-op adapter, kill switches, and test-only house creative. Production remains off and shows no blank placeholders.
2. **UX-R8B - Curated resource center:** implement reviewed affiliate cards, disclosure, expiry, external-link handling, and emergency disable without a third-party ad SDK.
3. **UX-R8C - Limited review-page sponsor experiment:** enable one direct sponsor card for a small Free-account cohort with a holdout group and UX guardrails.
4. **UX-R8D - Optional network evaluation:** only after direct inventory evidence; separately review AdSense for Web and AdMob for native, including SDK, consent, store disclosure, performance, and policy risk.

Required runtime controls:

- global remote kill switch;
- per-platform and per-placement enablement;
- provider mode: `off`, `house`, `direct_partner`, or `network`;
- production allow flag separate from local/test enablement;
- campaign start/end and emergency disable;
- test ad IDs/creatives in every development and automated environment.

Required tests:

- Free, Pro, Team, unresolved, stale, and failed capability states.
- Active/upcoming/completed market states and cross-route active-market suppression.
- Prohibited-route navigation tests proving zero provider requests and zero placement DOM.
- Consent granted, denied, unknown, revoked, and provider failure.
- Session/day/dismissal caps, campaign expiry, no-fill, and every kill switch.
- Upgrade/downgrade while open, offline/reconnect, and background/resume.
- 360-1920px layout, 200% zoom, screen reader labeling, external-link cancellation/failure, CLS, and accidental-tap spacing.

UX guardrails for the limited experiment:

- Primary review completion time must not worsen by more than 5%.
- Eligible-page abandonment must not increase by more than 3 percentage points.
- Any accidental-click signal, content confusion, layout obstruction, crash, sensitive-data disclosure, or store-policy risk triggers the global kill switch and stops rollout.
- Free-to-Pro conversion and 7/30-day retention must not materially regress.

Acceptance:

- No ad provider request occurs on any prohibited route or while a market is active.
- Pro, Team, unresolved entitlement, missing consent, and provider failure render no ad and no empty placeholder.
- Sponsored content is visibly distinguishable before interaction and is never interpreted as Féria business advice.
- No operational/account/customer/photo/free-form data enters ad selection or provider payloads.
- Direct affiliate inventory works through shared policy and platform external-link contracts.
- Web and future native providers can be replaced without changing eligibility or page business logic.
- No AdMob, AdSense, affiliate, attribution, consent, or Capacitor SDK is installed or enabled by UX-R8A.

Official policy references to re-check immediately before provider activation:

- Google AdSense Program policies: https://support.google.com/adsense/answer/48182
- Google AdSense responsive ad units: https://support.google.com/adsense/answer/9183363
- Google AdMob adaptive banners: https://developers.google.com/admob/android/banner
- Google AdMob inline adaptive banners: https://developers.google.com/admob/android/banner/inline-adaptive
- Google consent-management requirements: https://support.google.com/admob/answer/13554020
- Google Privacy & messaging guidelines: https://support.google.com/admob/answer/12226986

Stop before installing or enabling any advertising/consent SDK, requesting live ads, creating production ad units, changing privacy/store declarations, or launching a paid affiliate campaign. Those actions require a provider-specific approval and deployment checklist.

### UX-R9 - Loading, Performance, Cross-Role, And Release Evidence

**Goal:** Prove that the redesigned application is stable, fast, and permission-correct on production builds.

Tasks:

- Profile market/product detail readiness and separate route transition, auth/role readiness, integrity checks, local lookup, and remote fallback timing.
- Keep usable authorized content mounted during background refresh; reserve full shells for true first loads.
- Add section-level skeletons with stable dimensions; do not blank whole working pages for tab/filter refresh.
- Lazy-load Theme Lab, PDF renderer, advanced analytics methodology, and advanced diagnostics.
- Audit broad context rerenders and client-component boundaries.
- Run owner, manager, and staff journeys independently.
- Run online, offline, reconnect, first sync, pending writes, sync error, background/resume, and account-switch cases.
- Run physical iOS/Android evidence when the required device/native test environment becomes available; do not claim native completion from responsive browser tests.
- Verify that eligible ad reservations and provider loading do not regress route readiness, LCP, CLS, INP, offline behavior, or background/resume continuity. Keep the provider disabled while measuring the ad-free baseline.

Performance targets on a representative mid-range mobile profile:

- LCP under 2.5 seconds;
- CLS under 0.1;
- INP under 200ms for common taps and tab changes;
- no unexplained blank primary content over 300ms;
- market/product detail shows destination context within 150ms and useful actions as soon as authorization/data readiness allows;
- no console errors during release journeys.

Acceptance:

- The complete viewport matrix passes without horizontal overflow, overlap, clipped labels, or bottom-navigation obstruction.
- Owner, manager, and staff permission matrices pass independently.
- Switching away and back retains the page, refreshes role/capability state, and blocks privileged commands until freshness is restored.
- Build hash in the UI matches the artifact used for screenshots and smoke tests.
- Any unavailable physical-device evidence remains explicitly open rather than being marked complete.
- Ad-enabled test cohorts pass the same performance and permission gates as ad-free cohorts, and the remote kill switch is verified without redeployment.

## 7. Pull Request And Commit Sequence

Use one branch/PR or one clearly reviewable commit series per slice:

1. `codex/ux-r0-baseline-contracts`
2. `codex/ux-r1-truthful-state`
3. `codex/ux-r2-product-workflow`
4. `codex/ux-r3-responsive-shell`
5. `codex/ux-r4-desktop-workspaces`
6. `codex/ux-r5-analytics-confidence`
7. `codex/ux-r6-recovery-language`
8. `codex/ux-r7-accessibility-overlays`
9. `codex/ux-r8-free-monetization-readiness`
10. `codex/ux-r9-release-evidence`

Each review must state:

- objective and visible behavior change;
- exact files changed and intentionally unchanged;
- shared business logic and platform-dependent capabilities touched;
- owner/manager/staff impact;
- mobile/desktop before-and-after evidence;
- focused tests, build, lint, mobile TypeScript, and `git diff --check` results;
- known risks and remaining work.

Do not combine UX-R1 through UX-R7 into one broad redesign commit.

## 8. Required Validation

Use repository-supported Windows commands:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit --project tsconfig.mobile.json
git diff --check
```

When the full test suite contains a known unrelated failure, run the focused guardrails and record the exact unrelated failure. Never use an unrelated failure to hide a new failure.

Browser verification for every affected slice:

- 360x800, 375x812, 390x844, 430x932;
- 768x1024 and 1024x768;
- 1440x900 and 1920x1080;
- keyboard-only and 200% zoom;
- default theme plus all built-in palettes for affected shared components;
- no horizontal overflow, overlap, clipped text, layout shift, or inaccessible command;
- no destructive production-data action during routine UI smoke tests.
- Free/Pro/Team, consent, active-market suppression, no-fill, and ad kill-switch states when UX-R8 is affected.

## 9. Final Acceptance Journeys

The plan is complete only when these journeys pass on the same production build:

1. Owner opens Today and understands the active market and sync readiness immediately.
2. Owner enters an operating market and records interaction, quick payment, and product sale without searching or changing global navigation.
3. Staff performs only permitted live actions and never sees owner cost, profit, destructive, recovery, or reporting controls.
4. Owner finds preparing, active, and ended markets; an ended market exposes review but no live-operation commands.
5. Owner adds and edits a product and receives the same truthful photo capability in both flows.
6. Product detail shows price, inventory, and sales before a large media placeholder; destructive actions live in one management location.
7. Owner uses desktop Analytics to answer the four business questions in UX-R5 and sees confidence for every conclusion.
8. Owner opens settlement and sees three prioritized actions before the full recommendation list.
9. Owner sees the same sync state on Account, global status, analytics, and safety preflights.
10. Owner opens Data and Recovery and identifies the safest action without understanding storage or event terminology.
11. Production Subscription shows real account/capability presentation and no developer simulation controls.
12. Invalid or incomplete invite links explain the problem without implementation terminology and provide a clear return path.
13. Public support/privacy/terms pages expose verified operator and support information before release; otherwise the release remains blocked with truthful draft labeling.
14. Free users see at most the approved, clearly disclosed sponsor placement on eligible review/resource surfaces; operating and safety workflows remain ad-free.
15. Pro/Team users, unresolved capability states, denied/unknown consent, and active-market sessions show no automatic ads or blank ad space.
16. Every reviewed overlay works with keyboard, Escape/back behavior, focus restoration, and 200% zoom.
17. Background/resume preserves the page while role/capability refresh safely revalidates commands.

## 10. Stop Conditions

Stop and request explicit approval before:

- modifying Supabase migrations, RLS, account entitlements, role capabilities, or staff views;
- changing product-photo upload/read/delete runtime gates or deployment variables;
- changing event, inventory, revenue, cost, photo queue, sync, retry, conflict, or cache semantics;
- enabling any recovery execution that writes, deletes, replaces, imports, or automatically retries data;
- changing subscription billing, pricing, purchase, restore, entitlement writing, or store behavior;
- changing analytics calculation semantics;
- adding manager/staff access to owner-sensitive reports or data;
- installing Capacitor packages or starting native projects/adapters;
- installing AdMob, AdSense, affiliate, attribution, or consent SDKs;
- enabling live ad requests, production ad units, personalized targeting, or automatic ad placement;
- sharing account, market, product, revenue, customer, team, note, photo, or precise-location data with an advertiser;
- approving app-open, interstitial, rewarded, autoplay, sticky, overlay, or auto-refresh formats;
- proceeding when focused tests or the production build fail because of the current slice.

## 11. AI Handoff Instruction

Provide the implementation AI with this instruction:

> Execute `docs/APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md` one slice at a time, beginning with UX-R0. Before editing, inspect the current worktree and list the exact files, shared logic, platform capabilities, tests, and intentionally unchanged behavior for that slice. Preserve the verified mobile operating order, fail-closed permissions, offline/pending data, cloud-rebuild-first recovery, shared Web/iOS/Android domain contracts, and UX-R8 prohibited ad surfaces. Do not broaden the slice or perform destructive production operations. After implementation, run focused tests, lint, build, mobile TypeScript, `git diff --check`, and the affected viewport/role browser matrix. Provide before/after evidence, current score impact, and remaining risks. Stop at every stop condition and do not start the next slice until the current acceptance gates pass.

## 12. Recommended First Delivery

Start with **UX-R0 and UX-R1 only**.

Reason:

- product-photo contradiction and visible developer controls are trust defects, not cosmetic debt;
- shared capability and sync presentation contracts reduce later duplication;
- production-boundary tests prevent accidental exposure during subscription work;
- a frozen mobile baseline makes the desktop shell change safer;
- this delivery can improve correctness without changing billing, permissions, uploads, sync, or analytics calculations.
