# Subscription Tier Implementation Plan

Date: 2026-07-24

Last updated: 2026-08-01

Status: AI execution plan for implementing the subscription foundation in small verified slices. This document does not approve payment collection, billing provider setup, native in-app purchase setup, public marketplace workflows, production upload enablement, destructive recovery actions, or broad permission changes.

Implementation progress (2026-08-01): S0A through S5 and S6A through S6E are implemented; S7 is complete as a planning-only data and consent contract; LV1 remains a local-only Free/Pro/Team validation harness without billing authority. S6A protects single-market basic analysis and review; S6B provides a bounded recent-three Free preview; S6C separates the Free settlement summary from the Pro/Team full report; S6D enables the owner-only client-generated designed PDF for Pro/Team and keeps Free blocked. S6E migrations `064` and `065` are applied: all 22 structural/permission checks and the isolated 57-check server-authoritative Free/Pro/Team mutation, downgrade, re-upgrade, no-auto-restore, explicit-restore, cleanup, and zero-residual smoke pass. F3A migration `066_add_subscription_price_catalog_foundation.sql` is user-confirmed applied; anonymous, server-secret, and authenticated denial probes pass, while the masked apply record, all-true read-only SQL verifier, and Security Advisor evidence remain external gates. F3A remains private and non-billable. Aggregate commit-bound Production surface, API, PWA-resource, and draft legal-page smokes pass on `cac6fa6`; an authenticated Production Free owner and the current local Free/Pro/Team presentation matrix also pass, while authenticated paid analytics/PDF and the broader owner/staff deployment matrix remain pending. Product-cover `open` mode remains active and no billing, Excel generation, promotion grant, referral reward, active founder price assignment, marketplace route, partner exposure, or benchmark runtime is active.

Primary product plan:

- `docs/SUBSCRIPTION_TIER_PLAN_2026_07_24.md`
- `docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md`

Required related context:

- `docs/CROSS_PLATFORM_VIBE_CODING_GUARDRAILS.md`
- `docs/WEB_UIUX_SCORE_IMPROVEMENT_EXECUTION_PLAN_2026_07_23.md`
- `docs/ANALYTICS_PRODUCT_PLAN.md`
- `docs/SETTLEMENT_REPORT_MODEL_PLAN_2026_06_30.md`
- `docs/PRODUCT_COVER_PHOTO_EXECUTION_PLAN_2026_07_24.md`
- `docs/CSV_REPORTING_EXPORT_SPEC_2026_06_30.md`

## 1. Implementation Objective

Build the subscription foundation needed for Free, Pro, and Team, while keeping future strategic growth capabilities outside runtime plan codes. Prepare separately gated launch referral and Pro founder annual price foundations without launching billing, price assignment, referral attribution, reward grants, or marketplace behavior.

First implementation target:

```text
Every plan label, upgrade prompt, feature gate, and blocked-state message must come from one truthful subscription capability model.
```

The first release should make the app honest and ready for future billing:

- no fake current plan;
- no fake payment card, renewal date, cancellation, or successful upgrade state;
- no paid-only write path controlled only by UI state;
- no public marketplace or creator workflow;
- no expansion of storage-heavy photo features beyond approved gates.
- no referral reward issued by client state or raw sign-up alone.

## 2. Non-Negotiable Boundaries

1. Do not charge a payment method.
2. Do not integrate Stripe, StoreKit, Google Play Billing, or any billing provider without separate approval.
3. Do not add native projects, Capacitor packages, or native adapters.
4. Do not implement public partner marketplace, creator search, chat, commission settlement, or platform matching.
5. Do not modify Supabase RLS, staff views, role capabilities, or billing schema outside a slice that explicitly approves it.
6. Do not enable production uploads, evidence routes, report downloads, Excel generation, or manager exports merely because a plan says they are future paid features.
7. Do not infer paid access from browser storage, public environment variables, disabled buttons, or hardcoded UI labels.
8. Do not delete retained paid-created data on downgrade.
9. Do not expose owner-only cost, profit, supplier, staff, or recovery data through future partner-facing surfaces.
10. Do not create Web-only business logic. Shared subscription, entitlement, analytics, and reporting rules must remain usable by future iOS and Android clients.
11. Do not implement referral attribution, qualification, Pro Pass grants, contact import, subscription credits, cash rewards, or affiliate payouts without the matching approved promotion slice.
12. Do not create multi-level or downstream referral rewards.

## 3. Platform-Dependent Capabilities

Subscription implementation touches these platform capabilities:

- external billing links;
- native in-app purchase flows;
- file/PDF/Excel download;
- photo selection and upload;
- secure auth/session storage;
- network state and retry;
- app foreground/background lifecycle.
- referral link sharing and clipboard fallback.

For this foundation phase:

- Do not implement billing links or native purchase flows.
- Do not add browser-specific entitlement logic.
- Keep future external-link and purchase actions behind platform-neutral command boundaries if they are introduced later.
- Keep PDF, Excel, photo, and evidence behavior behind their existing approved feature gates and platform ports.
- Put referral sharing behind a `lib/platform` port. Do not import address books or upload a referred person's contact data in the initial design.

## 4. Recommended File Targets

Likely new or changed files:

```text
lib/subscription/subscription-plans.ts
lib/subscription/subscription-capabilities.ts
lib/subscription/subscription-presentation.ts
lib/subscription/subscription-access.ts
components/subscription/PricingCard.tsx
components/subscription/UpgradePrompt.tsx
components/subscription/FeatureLimitDialog.tsx
components/settings/AccountSyncPanel.tsx
components/TopNavigation.tsx
app/subscription/page.tsx
tests/subscription-plan-model.test.ts
tests/subscription-capability-presentation.test.ts
tests/subscription-feature-gates.test.ts
```

Possible later files, only when approved:

```text
supabase/migrations/*_subscription_accounts.sql
app/api/account-capabilities/route.ts
lib/subscription/account-capability-client.ts
lib/subscription/account-capability-server.ts
tests/subscription-account-capability-api.test.ts
lib/referrals/referral-policy.ts
lib/referrals/referral-access.ts
app/api/referrals/*
supabase/migrations/*_referral_attribution_and_rewards.sql
tests/referral-policy.test.ts
```

## 5. Data Model Direction

Use a shared domain model before database or billing work.

Candidate pure model:

```ts
export type AccountPlanCode = 'free' | 'pro' | 'team';

export type AccountPlanSource = 'free' | 'admin' | 'promotion' | 'billing';

export type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancel_at_period_end'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'unknown';

export type EntitlementStatus = 'active' | 'grace' | 'inactive' | 'unknown';

export type AccountCapabilities = {
  ownerId: string | null;
  planCode: AccountPlanCode;
  planSource: AccountPlanSource;
  billingStatus: BillingStatus;
  entitlementStatus: EntitlementStatus;
  capabilityEvaluatedAt: string | null;
  capabilityRefreshAfter: string | null;
  entitlementEndsAt: string | null;
  limits: {
    activeProductLimit: number | null;
    staffSeatLimit: number;
    productPhotoStorageBytes: number;
    salesEvidenceStorageBytes: number;
    monthlyPdfExportLimit: number | null;
    monthlyExcelExportLimit: number | null;
  };
  features: {
    productCoverPhoto: boolean;
    salesPhotoEvidence: boolean;
    basicAnalytics: boolean;
    advancedAnalytics: boolean;
    settlementReportPreview: boolean;
    settlementPdf: boolean;
    excelExport: boolean;
    staffCollaboration: boolean;
    managerWorkflow: boolean;
  };
};

export type BillingInterval = 'month' | 'year';

export type PaidPlanCode = Exclude<AccountPlanCode, 'free'>;

export type PlanPriceVersion = {
  id: string;
  planCode: PaidPlanCode;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  effectiveFrom: string;
  effectiveUntil: string | null;
};

export type PriceLockStatus = 'active' | 'grace' | 'dormant' | 'forfeited';

export type PriceLockForfeitReason =
  | 'effective_cancellation'
  | 'lapse_after_grace'
  | 'full_refund'
  | 'chargeback'
  | 'dispute'
  | 'abuse';

export type SubscriptionPriceAssignment = {
  ownerId: string;
  planCode: PaidPlanCode;
  billingInterval: BillingInterval;
  currency: string;
  amountMinor: number;
  pricePolicy: 'standard' | 'founder_locked';
  offerCode: 'pro_founder_annual_65' | null;
  listPriceVersionIdAtAcquisition: string;
  billedPriceVersionId: string;
  acquiredAt: string;
  continuousPaidSince: string;
  lockStatus: PriceLockStatus | null;
  forfeitedAt: string | null;
  forfeitedReason: PriceLockForfeitReason | null;
};

export type PlanChangeTiming = 'immediate' | 'renewal_boundary';

export type PlanChangePriceQuote = {
  ownerId: string;
  fromPlanCode: PaidPlanCode;
  toPlanCode: PaidPlanCode;
  fromPriceVersionId: string;
  toPriceVersionId: string;
  currency: string;
  quoteMode: 'exact' | 'provider_confirmation';
  unusedActualPaidValueMinor: number | null;
  providerCreditOrRefundMinor: number | null;
  providerChargeMinor: number | null;
  netDueMinor: number | null;
  effectiveAt: string | null;
  nextRenewalAt: string | null;
  timing: PlanChangeTiming;
  founderLockTransition: 'unchanged' | 'to_dormant' | 'restore_active' | 'forfeit';
  providerQuoteId: string | null;
  quoteExpiresAt: string | null;
};
```

Rules:

- Missing capability source resolves to Free or `unknown` depending on context.
- Billing state and effective entitlement remain separate; feature gates use server-resolved capabilities.
- Freshness is derived from trusted timestamps, never from a client-supplied status flag.
- Paid-only writes fail closed when entitlement or capability freshness is missing, stale, or unavailable after any approved offline lease ends.
- Before Team enforcement, define the offline entitlement lease and expiry behavior for poor-connectivity market-day workflows.
- Read access to retained user content should remain available after downgrade.
- Staff and manager actions require both owner account capability and role permission.
- Strategic growth capability and owner consent remain outside this account-plan model.
- Plan capability, public list price, billed price assignment, and promotion eligibility remain separate models.
- Price arithmetic uses integer provider-supported amounts. Do not calculate renewal charges with client-side floating-point percentages.
- `pro_founder_annual_65` records the fixed amount assigned at first annual purchase; renewal never re-applies 65% to the latest public price.
- `cancel_at_period_end` does not forfeit a lock before paid entitlement actually lapses. Approved payment retry or grace preserves the lock.
- A forfeited lock remains immutable audit history. Re-subscription creates a standard assignment at the then-current public price.
- A dormant Pro lock during continuous paid Team service is the adopted business rule. S8 must map provider mechanics without weakening the continuity promise.
- Pro-to-Team uses the current Team price version. The Pro founder percentage never transfers to Team.
- Unused Pro value is based on the actual paid amount, not the Pro list price. The provider owns the final credit, refund, charge, effective time, and renewal date.
- Pro-to-Team entitlement changes after a verified immediate upgrade transaction. Team-to-Pro defaults to the verified renewal boundary.
- A quote is read-only and provider-authoritative. If the provider exposes no exact pre-purchase proration quote, use `provider_confirmation` and leave unavailable money or date fields `null`; never estimate them as final values. A quote or provider sheet cannot grant Team or mutate a price lock until the matching transaction is reconciled.

## 6. Execution Slices

### Slice S0A: Current-State Subscription Audit

Goal:

Find all hardcoded, inconsistent, or non-authoritative subscription presentation and gates before editing runtime behavior.

Deliver:

- Search hardcoded `currentPlan`, Free / Pro / Team / enterprise labels, fake pricing, renewal, cancellation, and upgrade-success state.
- Search browser storage, public env, query-string, or disabled-button entitlement assumptions.
- Map photo, evidence, report, analytics, and staff gates to the canonical feature matrix.
- Produce a read-only audit and feature-gate registry.

Primary files:

- `docs/subscription/SUBSCRIPTION_CURRENT_STATE_AUDIT.md`
- `docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md`

Acceptance:

- Every paid-looking feature lists its current UI source, runtime source, server enforcement, production status, and risk.
- No runtime feature access changes.

### Slice S0B: Truthful Presentation Guardrails

Goal:

Add static coverage that prevents fake paid status before shared models replace the old UI.

Deliver:

- tests proving an unavailable capability source cannot display active Pro or Team;
- tests proving staff does not see owner billing controls;
- tests proving unavailable billing cannot display payment cards, renewal dates, cancellation success, or upgrade success;
- tests proving strategic Growth Reserve capabilities are not purchasable plans.

Acceptance:

- No runtime feature access changes.
- Existing role fail-closed behavior remains intact.

### Slice S1A: Pure Plan Definitions

Goal:

Create one source of truth for Free, Pro, and Team definitions and presentation metadata.

Deliver:

- `lib/subscription/subscription-plans.ts`
- pure plan definitions for Free, Pro, and Team only;
- plan display names, descriptions, audience, feature groups, and coming-soon labels;
- unit tests for feature/limit mapping.

Acceptance:

- Free has no photo upload entitlement.
- Pro has product cover photo entitlement in the model, but runtime upload still obeys existing feature gates and entitlement mode.
- Team has sales photo evidence entitlement in the model, but runtime upload still obeys existing sales evidence gates.
- Pro has no formal staff entitlement; authenticated collaboration begins at Team.
- Growth Reserve is absent from `AccountPlanCode` and purchasable plan definitions.
- No billing, Supabase, RLS, upload, or export behavior changes.

### Slice S1B: Capability And Access Resolvers

Goal:

Create pure shared capability, lifecycle, freshness, and access-decision logic without an API or database.

Deliver:

- `lib/subscription/subscription-capabilities.ts`;
- `lib/subscription/subscription-access.ts`;
- separate `billingStatus` and `entitlementStatus`;
- trusted timestamp-based freshness resolver;
- role, runtime, and data-readiness intersection;
- tests for missing, stale, unavailable, promotion-pass, downgraded, and retained-read behavior.

Acceptance:

- Domain modules do not import React, Next.js, Supabase, Dexie, `window`, `localStorage`, or platform APIs.
- A promotional Pro Pass can be represented as `planSource='promotion'` with a real `entitlementEndsAt` without implementing reward grants.
- No API, schema, RLS, billing, or referral mutation exists.

### Slice S2A: Shared Presentation Model

Goal:

Make pricing cards, upgrade prompts, and feature-limit dialogs use the same plan copy and blocked-reason model.

Deliver:

- Normalize `lib/subscription/subscription-presentation.ts`.
- Repair corrupted subscription UI copy.
- Make `PricingCard` render plan availability honestly:
  - current preview;
  - available;
  - coming soon;
  - contact or future.
- Keep action buttons disabled or non-billing while billing is unavailable.

Acceptance:

- Owner sees plan information that does not contradict actual feature access.
- Staff does not see owner billing controls.
- UI does not display fake active plan if capability source is unavailable.
- Existing navigation and role tests pass.

### Slice S2B: Replace Hardcoded Account Surfaces

Goal:

Move `TopNavigation`, `AccountSyncPanel`, and the subscription page onto the shared presentation model in a separate reversible change.

Deliver:

- replace hardcoded plan labels in `TopNavigation` and `AccountSyncPanel`;
- align `app/subscription/page.tsx` with Free / Pro / Team preview truth;
- remove `enterprise`, Solo, Studio, or other conflicting public plan names from active subscription presentation.

Acceptance:

- Free / Pro / Team naming is consistent.
- Billing-unavailable state shows preview or coming-soon copy only.
- No actual entitlement enforcement changes.
- Role-related presentation changes update the permission distribution documentation when applicable.

### Slice S3: Feature Gate Mapping Audit

Goal:

Map current paid-looking features to explicit capability names without changing behavior.

Deliver:

- Audit product cover photo gate.
- Audit sales photo evidence gate.
- Audit settlement PDF and export gates.
- Audit staff/team gates.
- Add a markdown or test fixture mapping:

```text
feature id -> plan feature -> current runtime source -> enforcement source -> production status
```

Acceptance:

- Every paid-looking feature has a named capability.
- Every capability states whether it is model-only, preview, gated, or active.
- No paid-only route trusts client-side state.
- No route is enabled in production solely by this slice.

### Slice S4: Server Capability Read Model, Non-Billing

Goal:

Introduce an authoritative account capability read path without payment provider integration.

Deliver only after approval:

- server-side capability resolver;
- optional admin-managed entitlement source;
- `GET /api/account-capabilities`;
- no write endpoint for users to self-upgrade;
- tests for missing, free, admin-enabled, stale, and unavailable states.

Acceptance:

- Browser cannot grant itself paid capabilities.
- Missing capability state fails closed for paid writes.
- Account and feature UIs can show a truthful source:
  - Free;
  - Admin enabled;
  - Billing not connected;
  - Unavailable.
- No payment collection.

### Slice S5: Product Cover Photo Subscription Alignment

Status: implemented locally on 2026-07-29; `required` mode and production activation remain unapproved.

Goal:

Align existing product cover photo behavior with the shared capability model.

Deliver only after S4 and product-photo gates are stable:

- product cover photo capability route consumes shared account capability;
- current `PRODUCT_COVER_PHOTO_ENTITLEMENT_MODE=open` remains explicit until subscription enforcement is approved;
- when enforcement is approved, `required` mode checks the shared server capability;
- free/downgrade copy uses shared plan presentation.

Acceptance:

- Open mode remains honest and documented.
- Required mode cannot be bypassed through UI.
- Downgraded owner can view/delete retained photos but cannot replace.
- Existing product photo tests still pass.

### Slice S6: Analytics And Report Tier Gates

Status: S6A single-market basic analysis/review, S6B advanced analytics tiers, S6C settlement report tiers, and S6D Pro/Team designed PDF implemented locally on 2026-07-29. User-completed local PDF UI verification is recorded; deployment evidence remains pending.

Goal:

Gate analytics value without weakening free recording usefulness.

Deliver:

- Free keeps source records and data-completeness guidance, plus the approved recent-three limited preview: revenue-only market comparison/trend and quantity-only top-product ranking.
- Free does not receive single-market recap, recent-10/all results, cost/profit recommendations, complete product financial rankings, product affinity, daily revenue detail, or advanced scorecards.
- Pro unlocks single-market basic analysis and review, simple rejoin guidance, advanced comparison, product recommendations, full report preview, and owner-only designed PDF generation.
- Team inherits Pro analytics.
- Free settlement reporting is limited to period selection, total revenue, deal count, included-market coverage, and data-completeness guidance. It does not query products or build the paid decision model.
- Pro and Team owners receive the existing full settlement preview when the authoritative capability is available.
- PDF generation is enabled only for server-confirmed Pro/Team owners with the existing financial/export role permissions. Free does not build the PDF view model or generate a file.
- Data completeness remains independent from plan. A Pro user with weak data still sees low-confidence limitations.

Acceptance:

- Plan gates do not fabricate unsupported insight claims.
- Data-completeness gates still block product/time/interaction insights when data is insufficient.
- Report owner-only permission remains unchanged.
- No manager export access is added.

S6A implementation evidence:

- only the `single` analytics range requests the authoritative account capability in this slice;
- Free, inactive, stale, unavailable, or owner-mismatched capability states do not run the selected-range Dexie analytics queries or build the single-market recap;
- Pro and Team capability fixtures allow the same shared analysis path;
- non-single analytics behavior remains unchanged until S6B defines its Free preview and paid boundaries;
- unavailable capability is presented as a retryable service state, not as a false upgrade claim;
- the hook receives the bearer token from the active auth context, uses the shared application API client and platform network port, and does not read browser storage;
- `npm run smoke:subscription:read-model` performs the repeatable live read-only RPC permission check without creating or changing subscription rows;
- focused tests, the full test manifest, full ESLint, production build, client-bundle secret/RPC scan, live read-only RPC smoke, and authenticated local Free UI smoke passed.
- the non-API mobile static build and artifact verification passed; the API-enabled mobile build correctly remains blocked until a stable HTTPS `NEXT_PUBLIC_API_BASE_URL` exists after staging deployment.

S6B implementation evidence:

- the analytics owner surface now reads the authoritative account capability for every analytics range; no plan or tier is accepted from browser storage, query strings, public environment values, or UI state;
- `lib/analytics/subscription-view.ts` is a platform-neutral policy that distinguishes `free_preview`, `basic`, `full`, and fail-closed `blocked` modes;
- Free defaults to `recent3`; summary and trend use a revenue-only three-market projection, while the product tab uses a separate quantity-only calculator that does not compute price, cost, revenue, profit, affinity, or recommendations;
- Free does not query summary events/daily stats, market metrics, daily revenue, full product ranking, or product affinity for the preview; recent-10, all, advanced-tab, and single-market selection render the matching Pro gate without running those selected-range analytics paths;
- Pro and Team deterministic capability fixtures retain the full existing analytics path. Capability unavailable/stale/offline failures block the preview and expose retry instead of being presented as Free;
- authenticated local Free UI smoke passed summary, trend, product, advanced, recent-10, all, single-market, and recent-three recovery checks with no console errors or horizontal overflow;
- focused tests, the full test manifest, full ESLint, production build, client-bundle secret/RPC scan, and live read-only subscription smoke passed;
- the mobile export generated a complete 240-file artifact and `verify:mobile` passed. On this Windows run, Turbopack exited after generation with `kill EPERM`; this toolchain exit remains a follow-up and is not recorded as a clean `build:mobile` pass. API-enabled mobile still requires the future stable HTTPS API base.

S6C implementation evidence:

- the owner-only settlement surface now intersects the existing `canImportExport` and `canViewOwnerFinance` role checks with the authenticated S4 account-capability read;
- `lib/reporting/settlement-subscription-view.ts` is a platform-neutral policy for fail-closed, Free limited, and Pro/Team full report modes, with independent PDF runtime state;
- Free reads only owner-scoped markets and daily statistics, uses `lib/reporting/settlement-free-preview.ts`, and does not query products or build the existing profit, score, recommendation, market-decision, product-ranking, or PDF view models;
- Pro and Team deterministic fixtures retain the existing complete settlement report and data-quality path. A capability outage blocks all report queries and exposes retry instead of presenting a false upgrade state;
- S6C deliberately left PDF `coming_soon` and runtime-disabled pending the separate S6D approval recorded below;
- owner-only role behavior remains unchanged and Team does not grant manager or staff access to owner financial reports;
- focused S6C policy, Free model, historical preview UI, disconnected PDF-shell, owner-brand, role-provider, and registry guardrails pass locally;
- the complete test manifest, full ESLint, production Web build, client-bundle server-only/secret scan, disabled-PDF bundle scan, and live read-only subscription smoke passed;
- mobile static export completed cleanly with 305 files (16.93 MiB); artifact verification and the nine-route generic static smoke passed without adding Capacitor or native projects;
- the latest production Web server is healthy at `http://localhost:3010`. Both available browsers reached the unauthenticated route guard with no console error or horizontal overflow;
- authenticated Free UI smoke could not be repeated on the latest build because another unrelated process owns `localhost:3000`, while the existing Féria browser session is scoped to that origin. The unrelated process was not stopped and no auth storage/token was inspected or copied. Deterministic Free UI/model tests plus the live missing-row Free RPC smoke cover this launch boundary until a signed-in session is established on port 3010.

### Slice S6D: Pro/Team PDF Enablement And A4 Visual Polish

Status: implemented and validated locally on 2026-07-29, including user-completed manual PDF UI verification; authenticated paid-state deployment smoke remains pending.

Result:

- `report.pdf` is `not_available` for Free and `included` for Pro/Team;
- the settlement page builds the PDF view model only after owner role checks, a server-authoritative full-report capability, and an independently allowed PDF capability all pass;
- `SETTLEMENT_PDF_RUNTIME_ENABLED` is true, with an explicit runtime-disabled rollback policy test;
- the PDF remains client-generated from the existing local report model and opens through the platform-neutral file preview port; no report payload is sent to a server route and no generated PDF is stored;
- all five pages now render as true portrait A4 media boxes, use stable headers/footers, readable score rows, ranked market/product tables, and structured next-action blocks;
- Free does not query products, build the paid report/PDF model, or mount the PDF action;
- Team inheritance does not grant manager or staff access to owner financial reporting;
- focused PDF/subscription tests, the complete test manifest, full ESLint, final Web production build, client-bundle secret/RPC/legacy-copy scan, and live read-only capability smoke pass;
- mobile static build and verification pass with 308 files (18.34 MiB), without adding Capacitor or native projects;
- the latest Web production server is healthy at `http://localhost:3010` and includes the approved PDF client chunk;
- the user completed manual local PDF UI verification at `http://localhost:3010` on 2026-07-29; this is local UI evidence, not paid-state deployment evidence;
- authenticated paid-state deployment smoke remains pending because the live subscription source has no explicit paid row; no production subscription data was mutated to manufacture coverage;
- Excel, custom in-app download UI, server-side PDF generation, billing, generated-PDF storage, and role expansion remain out of scope.

### Slice S6E: Team Subscription Enforcement And Retained Staff Access

Status: implemented and validated through live structural and isolated server-authoritative transition smoke. Migrations `064_enforce_team_subscription.sql` and `065_fix_team_invitation_verification_return_type.sql` were applied on 2026-07-30; release-deployment owner/staff UI and client cleanup evidence remains under the Web staging matrix.

Goal:

Make Team collaboration a database-authoritative capability without deleting staff relationships or activity history on downgrade.

Result:

- Free and Pro owners may read retained staff relationships and revoke members or delete invitation links, but cannot invite, create links, change roles, or restore suspended access;
- only a server-authoritative active/grace `admin` Team row authorizes current database writes; billing, promotion, local simulation, client state, and public environment flags cannot grant them;
- direct authenticated mutations on `staff_relationships` and `staff_invitations` are revoked and replaced by owner/staff-scoped `SECURITY DEFINER` RPCs;
- Team downgrade changes active relationships to `suspended_by_plan`, removes their `market_members`, and retains relationship/history rows;
- a later Team upgrade never auto-restores staff; the owner must explicitly restore each retained relationship;
- `current_user_market_ids`, staff relationship reads, `is_staff_of`, and `get_my_owners` intersect active relationship state with authoritative Team entitlement;
- the owner Team settings surface consumes `staffCollaboration` and `managerWorkflow`; local simulation changes presentation only and disables all cloud mutation controls;
- `tests/team-subscription-enforcement.test.ts` locks the tier, migration, direct-write, UI, simulation, and shared service boundaries;
- `docs/subscription/TEAM_SUBSCRIPTION_ENFORCEMENT.md` is the required preflight, deployment-order, and live-smoke runbook;
- current offline behavior remains fail-closed: a disconnected client cannot acquire or extend Team entitlement, and rejected cloud writes do not become valid because they were queued locally.

Live structural evidence (2026-07-30):

- migrations `064` and `065` are applied; `065` resolves the PostgreSQL `42804` return-type mismatch in read-only invitation verification;
- `npm.cmd run smoke:subscription:team-enforcement` passes all 22 checks, including anonymous direct-write denial, anonymous protected-RPC denial, Team backing for every active relationship, and invitation-token verification;
- two existing relationships are retained as `suspended_by_plan`, with no matching staff `market_members` leak;
- the live subscription source has no explicit subscription rows and resolves the current owner as default Free; there is no active-staff fixture for an authenticated Team transition test;
- no paid subscription row or authentication fixture was manufactured to complete missing coverage.

Authenticated local simulation UI evidence (2026-07-30):

- an authenticated owner switched Free, Pro, and Team through the loopback-only LV1 harness without exposing or copying browser authentication state;
- Free retained the recent-three revenue preview and basic settlement summary while blocking recent-10, single-market review, advanced analytics, PDF, Team invitation, role change, restore, and new invitation-link creation;
- Pro opened single-market review, advanced analytics, the full settlement report, and PDF preview while retaining the Team collaboration gate;
- Team inherited Pro analytics/report/PDF and removed the Team presentation gate, while every cloud-mutating Team control remained disabled because simulation is not write authorization;
- subscription, Team, and settlement surfaces had no horizontal overflow at 390px, 768px, 1440px, and 1920px widths; no console error was observed, and the only warning was the expected small-sample analytics notice.

Release revalidation (2026-08-01, application revision `cac6fa6`):

- the loopback-only Free/Pro/Team analytics, settlement/PDF, and Team presentation/write-suppression matrix passed again and the simulation was disabled after the run;
- an authenticated Production Free owner retained the recent-three and basic-settlement views while paid analytics, PDF, Team invitation, and restore remained blocked with no browser warning or error;
- retained suspended staff remained readable and revocation remained available as the intentional Free/Pro cleanup path defined by S6E;
- the sanitized partial matrix is recorded in `docs/WEB_AUTHENTICATED_RELEASE_MATRIX_2026_08_01.md`; paid Production roles, offline recovery, inspectable PDF output, and media remain open.

Isolated server-authoritative transition evidence (2026-08-01):

- `npm.cmd run smoke:subscription:team-transition` passed all 57 checks with disposable owner, staff, market, membership, invitation, and subscription fixtures;
- direct authenticated table mutations and Free/Pro protected RPC calls failed closed;
- Team invitation, link, acceptance, viewer-to-operator-to-manager changes, downgrade suspension and scope removal, Pro-to-Free retention, re-upgrade without auto-restore, and explicit restore all matched the contract;
- cleanup passed and the independent residual audit found zero fixture Auth users, profiles, markets, subscriptions, relationships, invitations, memberships, and journal residue;
- the guarded smoke does not prove billing, provider callbacks, or production UI state and does not create a durable paid customer record.

Remaining activation gate:

- retain the `064` then `065` migration order in every environment;
- repeat the isolated transition smoke on the final selected environment and complete release-deployment owner/staff UI plus client role-cache cleanup evidence;
- do not treat the disposable fixture or local simulator as billing, checkout, renewal, or commercial price-assignment evidence.

### Slice S7: Strategic Growth Capability Data Design

Status: completed as planning-only data, publication, consent, and redaction design on 2026-07-29. No runtime or schema was added.

Goal:

Reserve future platform data without building a platform.

Deliver:

- planning-only design for:
  - `brand_profile`;
  - `product_commerce_profile`;
  - `market_context`;
  - `collaboration_readiness_snapshot`;
  - `public_partner_snapshot`;
  - benchmark opt-in.
- privacy and owner-consent rules.
- redaction policy for partner-facing data.
- static tests or docs tests if the repo pattern supports them.

Acceptance:

- No creator-side UI.
- No public marketplace route.
- No partner data exposure.
- No owner financial private data appears in public snapshot examples.
- Owner opt-in is explicit in the design.

Result:

- `docs/subscription/STRATEGIC_GROWTH_DATA_RESERVE_DESIGN.md` is the canonical S7 contract for all six logical records;
- owner-private source data, owner-private derived readiness, and the detached owner-published partner snapshot are separate boundaries;
- partner publication and anonymous benchmark participation have independent, explicit, revocable state machines;
- partner-facing serialization is allowlist-based and excludes private finance, supplier, staff, market, transaction, customer, exact capacity, and internal scoring data;
- no creator/partner model, marketplace route, public API, matching, chat, fee, payout, Supabase migration, RLS, or runtime capability was added;
- `tests/subscription-strategic-growth-data-reserve.test.ts` locks the planning-only, consent, redaction, route, plan-code, registry, and manifest boundaries.

### Slice LV1: Local Subscription Identity Simulation

Status: implemented locally on 2026-07-29; authenticated Free/Pro/Team UI smoke passed on 2026-07-30; production and deployment use are prohibited.

Goal:

Validate Free, Pro, and Team capability intersections without payment, a database
subscription mutation, or a client-authoritative plan override.

Result:

- an authenticated owner-only panel on `/subscription` switches a four-hour in-memory simulation on or off and selects Free, Pro, or Team;
- the server requires the private `SUBSCRIPTION_SIMULATION_ENABLED` flag, a loopback URL, no Vercel deployment marker, and a verified bearer token;
- `GET /api/account-capabilities` returns the explicit `simulation_enabled` status and derives features from the canonical plan model;
- role, runtime, data-completeness, RLS, RPC, upload, and server-write authorization remain independent and cannot be bypassed;
- state is never stored in Supabase, Dexie, browser storage, cookies, operational events, or billing records;
- `docs/subscription/LOCAL_SUBSCRIPTION_SIMULATION.md` is the operating and stop-condition contract;
- `tests/subscription-simulation.test.ts` covers environment, loopback, deployment, authentication, expiry, plan switching, API, client, and static source boundaries.
- focused subscription tests, the complete test manifest, full ESLint, production Web build, mobile static build, mobile artifact verification, and generic mobile route smoke pass;
- the final Web build is healthy at `http://localhost:3010`; unauthenticated account-capability and simulation GET/POST requests return 401, while the approved local preflight returns 204;
- authenticated browser smoke passed for Free/Pro/Team analytics, settlement/PDF, and Team presentation/write-suppression boundaries at 390px, 768px, 1440px, and 1920px widths; no auth token or browser storage was inspected.

### Slice S8: Billing Provider Decision Plan

Status: completed as planning-only on 2026-07-30. No provider SDK, checkout,
callback route, schema, migration, or billing runtime was added.

Goal:

Prepare for billing without implementing it.

Deliver:

- compare provider options for Web and future native apps;
- define subscription lifecycle states;
- define webhook reconciliation requirements;
- define testing matrix for trial, cancellation, refund, grace period, past due, and downgrade;
- define versioned Pro and Team price catalogs and effective-date rules;
- map `pro_founder_annual_65` eligibility, exact supported storefront amounts, fixed renewal cohorts, and non-stacking behavior across Web, Apple, and Google;
- verify how each provider preserves existing prices and what happens on cancellation reversal, billing retry, grace, refund, chargeback, plan switch, and cross-platform identity changes;
- map immediate Pro-to-Team upgrade, actual-paid unused Pro value, provider credit/refund, Team charge, renewal-date behavior, and deferred Team-to-Pro downgrade;
- prove how the adopted dormant founder lock is preserved and restored across Web, Apple, and Google without applying the 65% Pro discount to Team;
- define exact-quote and provider-confirmation reconciliation contracts so UI never invents the final amount or effective date.

Acceptance:

- No provider SDK installed.
- No checkout links.
- No payment method UI.
- No subscription mutation route.
- AI notes that Apple, Google, and provider policies must be freshly verified before launch.

Result:

- `docs/subscription/BILLING_PROVIDER_DECISION.md` is the canonical provider and storefront decision;
- `docs/subscription/BILLING_LIFECYCLE_STATE_MACHINE.md` is the canonical normalized lifecycle, callback, reconciliation, Founder lock, and plan-change saga contract;
- `docs/subscription/BILLING_TEST_MATRIX.md` is the canonical sandbox, security, cross-platform, and launch-gate matrix;
- Taiwan Web launch conditionally selects NewebPay recurring payment after merchant, API, sandbox, fee, tax, invoice, refund, and reconciliation gates pass;
- ECPay is a single fallback, not a concurrently maintained provider;
- Paddle is not the Taiwan launch provider because its current official currency list omits TWD, and Stripe remains blocked until an eligible supported-country entity and account are confirmed;
- future iOS uses Apple IAP and Android uses Google Play Billing; RevenueCat remains an optional native-store aggregation adapter, and Capacitor stays paused;
- Web Founder acquisition is the first supported route. Native Founder acquisition remains blocked until storefront sandbox proves cancellation, cohort, plan-switch, and dormant-restore behavior;
- a provider exact quote is preferred. For a Taiwan provider without proration quotes, only a server-signed, immutable, single-use quote derived from provider-confirmed transaction truth may provide exact values; otherwise the flow is `support_required`;
- S9 remains not approved.

### Slice S9: Billing Implementation

Status:

Not approved by this plan.

Requires a separate user approval after S8.

Minimum future gates:

- conditionally selected Web provider completes merchant and API activation;
- native policy route has a fresh pre-implementation review and later store-sandbox evidence;
- server callback and reconciliation design is approved for implementation;
- security review complete;
- entitlement migration approved;
- price-version and immutable price-assignment schema approved;
- founder eligibility, continuity, forfeiture, and offer-cap policy approved;
- Web exact Founder amount is approved in the active merchant catalog; every future native storefront amount and existing-price behavior is separately verified;
- plan-change quote, actual-paid-value, provider-credit, immediate-upgrade, deferred-downgrade, and reconciliation contracts approved;
- support and refund policy drafted;
- the required `docs/subscription/BILLING_TEST_MATRIX.md` sandbox and staging payment tests pass.

## 7. Founder Annual Price Slices

Founder-price work is part of the billing domain but has its own approval boundaries. Product approval does not authorize a checkout, coupon, price, webhook, or charge.

### Slice F0: Founder Price Policy And Economics

Status: completed as planning-only in the canonical documents.

Deliver:

- define the finite eligible-trial cohort and the `pro_founder_annual_65` policy;
- define fixed assigned amount versus future public price versions;
- define cancellation-effective, grace, refund, chargeback, dispute, and abuse outcomes;
- define non-stacking with Pro Pass and paid-conversion credit;
- model contribution margin after store or payment fees, tax, storage, and support;
- leave enrollment cap, end date, exact storefront price, and provider-specific Team-switch mechanics as explicit pre-launch decisions while preserving the approved business rule.

Acceptance:

- docs only;
- no public promise of an unconditional lifetime price;
- no SDK, schema, RLS, checkout, price object, coupon, trial, webhook, or subscription mutation.

### Slice F1: Pure Price Catalog And Lock Model

Status: implemented locally on 2026-07-30 under the approved Web-first progression.

Possible files:

```text
lib/subscription/subscription-pricing.ts
tests/subscription-pricing.test.ts
```

Deliver pure types and resolvers for price versions, trial eligibility input, founder assignment, continuity, grace, dormancy, forfeiture, plan-change timing, actual-paid unused value inputs, and blocked reasons.

Acceptance:

- no React, Next.js, Supabase, Dexie, browser, provider SDK, checkout, or platform API imports;
- the resolver returns decisions only and cannot charge or grant entitlement;
- renewal uses the stored assigned amount, never the current list price;
- cancellation scheduling differs from effective lapse;
- Pro-to-Team resolves to immediate after confirmed payment, current Team price, actual-paid Pro value, and `to_dormant` for an active founder lock;
- Team-to-Pro resolves to the renewal boundary and `restore_active` when paid continuity remains unbroken;
- the pure model supports `provider_quote`, `server_signed_quote`, `provider_confirmation`, and `support_required`; only `server_signed_quote` may calculate exact values, using explicit provider-confirmed transaction inputs, UTC boundaries, integer minor units, approved rounding, expiry, and single-use semantics;
- client presentation never fabricates a charge, credit, refund, effective time, or renewal date, and unavailable output remains `null`;
- all server-trust inputs are explicit and no client flag can grant founder eligibility.

Result:

- `lib/subscription/subscription-pricing.ts` is the platform-neutral canonical F1 model;
- `tests/subscription-pricing.test.ts` covers candidate price versions, trusted Founder eligibility, immutable renewal amount, cancellation versus lapse, grace recovery, dormancy, restoration, forfeiture, plan-change timing, exact quote modes, integer half-up rounding, and fail-closed invalid inputs;
- every catalog price remains `candidate` with no effective date, and the Founder assignment resolver returns `billable: false`;
- Pro-to-Team remains Pro until trusted provider confirmation and moves an active / grace Founder lock to dormant only with paid continuity;
- Team-to-Pro remains Team until the verified renewal boundary and provider confirmation, restoring the stored Founder price version only when continuity is unbroken;
- `server_signed_quote` returns only `ready_for_server_signature`; F1 does not sign, persist, charge, refund, grant entitlement, or call a provider;
- no React, Next.js, Supabase, Dexie, browser, provider SDK, platform API, schema, RLS, checkout, callback, or billing route was added.

### Slice F2: Founder Offer Presentation

Status: blocked until an approved truthful billing-availability state exists. F1 completion alone does not authorize offer or checkout presentation.

Deliver owner-only presentation for eligible, ineligible, acquired, cancellation-scheduled, grace, dormant, forfeited, upgrade-quoted, upgrade-pending, upgrade-active, and downgrade-scheduled states. Before S9, the UI may only say `coming soon` or show an approved non-transactional preview.

Acceptance:

- one exact annual amount is shown; no floating price or dynamic 65% renewal claim;
- copy states that cancellation forfeiture occurs only after the paid period ends and subscription lapses;
- Team upgrade copy separates unused actual-paid Pro value from any discount and never claims the 65% Pro price applies to Team;
- a transactional flow must show every exact value from an approved `provider_quote`, `server_signed_quote`, or provider confirmation. A server-signed quote must use provider-confirmed transaction inputs and remain immutable, expiring, and single-use. If no exact mode exists, the flow is support-required; Feria client code must not invent a credit, refund, net due, effective time, or renewal date;
- no staff billing controls, fake checkout, fake renewal date, or client-authoritative eligibility.

### Slice F3: Server Price Assignment And Audit Ledger

Status: data/security design completed on 2026-07-30. The separately reviewed F3A
candidate catalog and assignment foundation was user-confirmed applied on 2026-08-01;
direct-client denial smoke passes, while the read-only SQL verifier and Security Advisor
record remain external gates. F3B-F3E, writer, callback, provider implementation,
checkout, and runtime mutation remain not approved.

Requires separately approved schema, RLS, identity, idempotency, webhook, support, and migration design. The server must own eligibility, price version, assigned amount, continuity, dormancy, forfeiture, and audit history. Operational market events and local IndexedDB are not the trusted price ledger.

Canonical design and read/reconciliation contract:

```text
docs/subscription/BILLING_DATA_SECURITY_DESIGN.md
docs/subscription/BILLING_PROVIDER_ADAPTER_CONTRACT.md
lib/subscription/billing-provider-contract.ts
tests/subscription-billing-data-security-design.test.ts
```

Result:

- keeps `subscription_accounts` as the narrow capability projection instead of mixing provider customer, transaction, amount, quote, or raw-event data into it;
- defines logical customer links, subscriptions, transactions, price versions, storefront mappings, immutable price assignments, single-use quotes, event inbox, reconciliation runs, adjustment obligations, and support actions;
- defines no-direct-client billing table access, service-role server boundaries, `SECURITY DEFINER` restrictions, compare-and-swap projection writes, fixed lock order, provider-query reconciliation, and at-least-once event handling with idempotent business effects;
- defines privacy, retention, deletion, support approval, dual-origin, refund-failure, callback-forgery, replay, out-of-order, service-key, and simulator threat controls;
- splits physical work into separately approved F3A-F3E migrations and requires denial, cross-owner, service-role, rollback, and production-readiness evidence for every slice;
- the provider-neutral TypeScript contract exposes only raw-notification verification and authoritative customer/subscription/transaction queries. It contains no checkout, charge, refund, cancel, provider SDK, secret, network client, database writer, or entitlement mutation.

#### Slice F3A: Catalog And Price-Assignment Foundation

Status: implemented locally on 2026-07-30 and user-confirmed applied on 2026-08-01.
Anonymous and server-secret table probes fail with PostgreSQL `42501`; the authenticated
smoke passed all 12 table and 3 function denial probes. F3A remains incomplete until the
masked target/hash/timestamp, all-true read-only verifier, and Security Advisor result
are recorded.

Canonical artifacts:

```text
supabase/migrations/066_add_subscription_price_catalog_foundation.sql
supabase/verification/066_subscription_price_foundation_read_only.sql
docs/subscription/F3A_PRICE_CATALOG_MIGRATION_RUNBOOK.md
tests/subscription-price-catalog-foundation.test.ts
```

Acceptance boundary:

- creates only private price versions, storefront mappings, and price assignments;
- seeds the five F1 catalog entries as `candidate`, with no active mapping or assignment;
- denies direct table and trigger-function access to public, anon, authenticated, and service-role clients;
- provides no RLS policy, public RPC, `SECURITY DEFINER`, checkout, callback, provider adapter, writer, or entitlement mutation;
- keeps `subscription_accounts` unchanged and uses `ON DELETE RESTRICT` for audit-linked rows;
- requires explicit target confirmation, manual migration application, read-only verification, denial smoke, and recorded evidence before F3A is considered live;
- does not approve F3B-F3E or S9.

### Slice F4: Provider Price Cohort And Checkout

Status: not approved by this plan.

Requires S8, S9, and F3 approvals plus verified provider configuration. Do not model this as a generic limited-duration coupon when the commercial promise is a continuing fixed renewal amount. Each provider adapter must reconcile its authoritative transaction and plan-change quote state into the shared server price assignment without allowing duplicate acquisition, duplicate credit, stale quotes, or cross-platform price conflicts.

## 8. Promotion Reward Slices

Promotion work is separate from S0-S9. Completing subscription presentation work does not authorize referral tracking or rewards.

### Slice P0: Referral Policy And Threat Model

Status: planning-only and allowed with docs approval.

Deliver:

- freeze the direct, double-sided 30-day Pro Pass policy;
- define inviter eligibility and qualified first-market activation;
- define 90-day manual redemption and candidate rolling reward ceiling;
- define attribution, duplicate-account, self-referral, idempotency, expiration, rejection, and support rules;
- define legal, tax, privacy, promotion-terms, and native-store review gates;
- define metrics without collecting a referred person's contact list.
- define the pre-billing beta sunset or pause before paid billing launches.

Acceptance:

- no runtime code, API, schema, RLS, reward grant, contact import, or billing credit;
- no second-level or downstream reward;
- raw registration never qualifies for a reward.

### Slice P1: Pure Referral Domain Model

Status: requires explicit approval after P0.

Possible files:

```text
lib/referrals/referral-policy.ts
lib/referrals/referral-access.ts
tests/referral-policy.test.ts
```

Deliver only pure types and resolvers for attribution, qualification, reward eligibility, Pro Pass redemption windows, caps, and blocked reasons.

Acceptance:

- no React, Next.js, Supabase, Dexie, browser, billing, or platform API imports;
- no reward can be granted by client input;
- Pro Pass maps to `planSource='promotion'`, Pro only, with a real entitlement end;
- Pro Pass uses the approved non-unlimited Pro photo and storage quota;
- Team capabilities are never granted by referral reward.

### Slice P2: Referral Share Presentation

Status: requires explicit approval after P1.

Deliver:

- owner-only copy-link or platform share action;
- share capability behind `lib/platform` with a Web adapter and future native adapter boundary;
- referral prompt only after a completed-market review or another approved value moment;
- honest states without claiming attribution or reward success before a server source exists.

Acceptance:

- no address-book import or platform-sent unsolicited email;
- staff and managers cannot own referral rewards;
- no referral mutation route or schema is added by this slice.

### Slice P3: Server Attribution, Qualification, And Reward Ledger

Status: not approved by this plan.

Requires separate schema, RLS, abuse, privacy, support, and migration approval. The server must own attribution, qualification, an idempotent reward ledger, limits, holds, revocation, and audit history. Referral records must not be written into market operational events or local IndexedDB as the trusted source.

### Slice P4: Promotional Pro Pass Grant

Status: not approved by this plan.

Requires S4 authoritative capabilities and P3 server ledger. The grant must be owner-scoped, one-time, manually activated, time-bounded, Pro-only, and compatible with downgrade retention rules.

### Slice P5: Paid-Conversion Credit

Status: not approved by this plan.

Requires completed billing implementation, webhook reconciliation, refund and chargeback handling, tax/accounting review, credit-ledger design, support policy, and fresh native-store policy verification. Do not infer P5 approval from P0-P4.

## 9. Test Strategy

Required focused tests:

```text
tests/subscription-plan-model.test.ts
tests/subscription-capability-presentation.test.ts
tests/subscription-feature-gates.test.ts
tests/product-cover-photo.test.ts
tests/sales-photo-evidence-runtime-readiness-checklist.test.ts
tests/settlement-report-model.test.ts
tests/analytics-data-completeness.test.ts
tests/referral-policy.test.ts
tests/subscription-pricing.test.ts
```

Add new tests only when the slice changes behavior or adds a pure model.

Important scenarios:

1. Free plan never enables photo upload capabilities.
2. Pro model includes product cover photo, but runtime still honors environment and server gates.
3. Team model includes sales photo evidence, but route gates remain independent.
4. Growth Reserve is absent from runtime plan codes and does not expose public partner features.
5. Missing capability source does not show an active paid plan.
6. Downgrade blocks new paid-only writes but keeps retained data readable.
7. Staff cannot see owner billing controls.
8. Manager cannot receive owner-only reporting/export access without a separate permission change.
9. Data completeness and plan entitlement are separate dimensions.
10. UI copy does not claim billing availability before billing exists.
11. Billing status and entitlement status can represent cancel-at-period-end without premature access loss.
12. A promotion-sourced Pro Pass cannot grant Team capabilities.
13. Raw sign-up, self-referral, duplicate qualification, and second-level referral never earn a reward.
14. Referral qualification accepts a completed market with either itemized sales or an approved manual total path.
15. Expired Pro Pass follows retained-read and blocked-new-write downgrade rules.
16. Anonymous benchmark consent is explicit opt-in and is not an entitlement boolean.
17. An eligible Pro trial converted before trusted expiry receives one fixed founder price assignment.
18. A conversion after trial expiry or without server eligibility receives no founder lock.
19. Public Pro price increases do not change an active or validly dormant founder assignment.
20. `cancel_at_period_end` preserves the lock until actual entitlement lapse; cancelling the scheduled cancellation before expiry preserves it.
21. Payment recovery within approved retry or grace preserves the lock; an unrecovered lapse forfeits it.
22. Re-subscription after forfeiture uses the then-current public price.
23. Refund, chargeback, dispute, and abuse transitions are server-authoritative, idempotent, and auditable.
24. Founder price does not stack with referral paid credit or another checkout discount without an explicit precedence policy.
25. Pro-to-Team uses the current Team price and never applies the Pro founder percentage.
26. Unused Pro value is based on the actual amount paid, including founder pricing, not the Pro list price.
27. Team access begins only after the immediate upgrade transaction is confirmed and reconciled.
28. Team-to-Pro is deferred to the renewal boundary and restores the dormant founder amount only when paid continuity remains unbroken.
29. Cancelling Team without a replacement forfeits the dormant founder lock only when paid entitlement actually lapses.
30. Client quote arithmetic, an expired quote, or an unconfirmed provider event cannot grant Team or mutate price-lock state.
31. A provider without an exact pre-purchase proration quote uses `provider_confirmation`, leaves unavailable values `null`, and never receives fabricated client amounts or dates.

## 10. Validation Commands

Use Windows-compatible commands:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit --project tsconfig.mobile.json
git diff --check
```

If repository-wide commands fail because of known unrelated failures, record the exact failure and prove that the current slice did not introduce it.

## 11. Manual Verification Matrix

Viewports:

```text
390x844
768x1024
1440x900
1920x1080
200% zoom
```

Roles:

```text
owner
staff viewer
staff operator
manager
unresolved role
role refresh in progress
```

Account states:

```text
free
admin-enabled Pro
admin-enabled Team
billing unavailable
capability fetch error
downgraded
past due
promotion Pro Pass available
promotion Pro Pass active
promotion Pro Pass expired
founder offer eligible
founder offer ineligible
founder lock active
founder cancellation scheduled
founder lock in grace
founder lock dormant during Team
founder lock forfeited
public price version changed
Pro-to-Team quote available
Pro-to-Team payment pending
Pro-to-Team confirmed
Pro-to-Team failed with Pro retained
Team-to-Pro scheduled
Team-to-Pro founder lock restored
Team cancelled without replacement
```

Runtime states:

```text
online
offline
pending sync
first sync not completed
feature route disabled
feature route enabled in local/staging only
capability lease valid offline
capability lease expired offline
```

## 12. Stop Conditions

Stop and request explicit approval before:

- adding or changing Supabase billing/entitlement tables beyond an approved slice;
- changing RLS, staff views, or role capabilities;
- enabling production upload, delete, export, PDF, Excel, or evidence routes;
- adding billing provider SDKs or checkout links;
- charging, trialing, cancelling, refunding, or modifying a subscription;
- adding native purchase code;
- exposing any public partner/brand profile;
- adding creator, group-buying host, matching, chat, commission, or marketplace UI;
- changing analytics calculation semantics instead of presentation or gating;
- deleting or hiding retained paid-created user data on downgrade;
- expanding local backup/import into a user-facing subscription feature.
- adding referral attribution, qualification, reward, Pro Pass, credit, or affiliate tables and routes;
- importing contacts, sending referral email on the owner's behalf, or collecting a referred person's contact data;
- adding cash, percentage, multi-level, organizer, creator, or ambassador rewards;
- granting a promotional entitlement from client state;
- implementing paid-conversion credit before billing and refund reconciliation are approved.
- creating provider products, prices, discounts, coupons, offer codes, or price cohorts for the founder offer;
- adding founder eligibility, price-assignment, continuity, or forfeiture tables and routes;
- trusting a client-supplied trial, price, cancellation, renewal, or lock state;
- adding plan-change quote, proration, credit/refund, upgrade, downgrade, or reconciliation routes without the approved billing slice;
- calculating final upgrade money or dates on the client;
- publicly stating provider-specific credit, refund, or renewal-date mechanics before S8 verifies them.

## 13. AI Handoff Instruction

Give the implementation AI this instruction:

```text
Execute docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md one slice at a time. Start with S0A only unless the user explicitly approves a later slice. Read docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md first. Preserve cross-platform shared logic, role fail-closed behavior, sync safety, cloud-data-first recovery direction, and existing upload/export gates. Do not implement billing, founder eligibility or price assignment, provider prices or discounts, referral attribution, reward grants, Pro Pass activation, contact import, subscription credits, multi-level rewards, or marketplace behavior. Before editing, list exact files, tests, intentionally unchanged scope, and stop-condition impact. After editing, provide focused test results, build/lint/mobile TypeScript evidence when relevant, changed files, intentionally unchanged files, permission-document status, and remaining risks. Stop at every listed stop condition.
```

## 14. Recommended First Work

Recommended first implementation batch:

1. S0A: read-only current-state subscription and feature-gate audit.
2. S0B: truthful presentation guardrails.
3. S1A: pure Free / Pro / Team definitions.
4. S1B: pure capability and access resolvers.
5. S2A and S2B as separate presentation changes.

P0 may proceed as a separate planning-only task after the canonical referral policy is accepted. P1-P5 require explicit approval and do not belong in the first subscription implementation batch.

Reason:

- Current pricing and account surfaces must stop contradicting real feature access.
- Shared plan definitions reduce future one-off paywall logic.
- Billing can be added later without rewriting UI copy, feature prompts, or capability names.
- Marketplace reserve space remains a product direction, not a distracting current workflow.
