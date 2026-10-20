# Subscription Current-State Audit

> S4 update (2026-07-29): the repository now contains a local authoritative read model, guarded migration, server-only repository, and `GET /api/account-capabilities`. The findings below preserve the pre-S4 audit baseline. Production migration, configuration, and smoke evidence remain incomplete, and no paid feature consumes the read model yet.

Date: 2026-07-29  
Status: S0A completed, read-only audit  
Scope: Web runtime, subscription presentation, paid-looking feature gates, role intersection, and production evidence available in this repository

This audit does not approve or implement billing, plan enforcement, schema changes, RLS changes, referral rewards, production feature activation, uploads, exports, or marketplace behavior.

## 1. Executive Summary

The product has real candidate value for Pro and Team, but it does not yet have an authoritative subscription system.

Current truth:

- `/subscription` is a disabled preview and does not claim that checkout exists.
- `components/TopNavigation.tsx` hardcodes `currentPlan = 'free'` and labels it as the current plan. This is not authoritative account state.
- the preview still uses the obsolete runtime label `enterprise` instead of the approved `team` plan code;
- unused subscription components contain stale claims about unlimited markets, unlimited products, cloud sync, and staff collaboration;
- analytics are gated by owner role, market count, and data completeness, not subscription;
- settlement report preview and browser PDF preview are gated by owner financial/export role capabilities, not subscription;
- product cover upload has server route, role, environment, quota, and optional entitlement checks, but pre-subscription mode is currently `open` and no real plan capability exists;
- sales photo evidence has environment, authentication, relationship, ownership, RLS, and route gates, but no Team plan gate;
- staff collaboration is controlled by role/RLS/RPC behavior, but no Team plan gate exists;
- no billing provider, checkout, webhook reconciliation, renewal, cancellation, price assignment, founder lock, or server-owned account plan read model exists;
- no browser storage, public environment variable, or query parameter was found granting Pro or Team.

Conclusion: S0B through S2 may proceed. Runtime feature enforcement, server capability reads, schema, RLS, and billing remain later approval boundaries.

## 2. Audit Method

The audit searched current `app`, `components`, `lib`, `tests`, `supabase`, and environment examples for:

- `currentPlan`, `planCode`, Free, Pro, Team, and enterprise labels;
- fake payment card, renewal, cancellation, checkout, and upgrade-success state;
- `localStorage`, `sessionStorage`, public environment variables, and query-string authorization;
- subscription prompts and feature-limit dialogs;
- analytics, reporting, product photo, sales evidence, staff, and manager gates;
- server routes, RLS/RPC boundaries, environment gates, and production verification records.

Detailed feature results are recorded in `docs/subscription/SUBSCRIPTION_FEATURE_GATE_REGISTRY.md`.

## 3. Findings

### A1. Hardcoded current account plan

Severity: high presentation risk

`components/TopNavigation.tsx` declares:

```ts
const currentPlan: 'free' | 'pro' | 'enterprise' = 'free';
```

The menu then presents this value under `目前方案` and exposes `升級` or `管理`. This is a false account-state source even though it currently fails toward Free.

Required S2 outcome: without an authoritative account capability, the navigation may show only neutral plan-preview availability. It must not label Free, Pro, or Team as the user's current plan.

### A2. Stale upgrade and feature-limit claims

Severity: high commercial-truth risk

`components/subscription/UpgradePrompt.tsx` and `components/subscription/FeatureLimitDialog.tsx` are not mounted in the current application, but they contain reusable defaults and claims that conflict with the canonical plan:

- immediate upgrade action despite checkout being unavailable;
- unlimited markets;
- unlimited products;
- cloud sync as a Pro-only benefit;
- staff collaboration as a Pro benefit.

Required S2 outcome: retain these components only as truthful, prop-driven presentation surfaces. No default feature claim may invent an entitlement or limit.

### A3. Plan vocabulary drift

Severity: medium

`lib/subscription/subscription-presentation.ts` and `PricingCard.tsx` use `enterprise`. The canonical runtime codes are only `free`, `pro`, and `team`. Growth Reserve is not a tier.

Required S1/S2 outcome: establish a pure plan source of truth and remove `enterprise` from subscription presentation.

### A4. Product-cover denial reasons are not subscription truth

Severity: medium

The product-cover capability route returns a combined result based on role, environment availability, and optional entitlement. The field UI currently treats most non-`unavailable` denials as `商品照片為付費版功能`.

This can mislabel a permission or runtime-disabled state as a plan restriction. In `open` mode, authorized owners/managers do not need a paid entitlement.

Required S2 outcome: presentation must distinguish unavailable, permission denied, and actual plan-required states. S2 must not change route enforcement.

### A5. No authoritative account plan or effective capability source

Severity: release blocker for paid launch

Migration `062` contains an `account_entitlements` row with one `product_cover_photo_enabled` boolean and a source marker. It is a feature-specific bridge, not a subscription lifecycle model.

Missing server-owned state includes:

- plan code and plan source;
- billing status versus entitlement status;
- trusted capability evaluation and refresh timestamps;
- entitlement end and offline lease;
- trial and grace semantics;
- price version and founder assignment;
- provider transaction reconciliation.

Required next boundary: S1 models these concepts without persistence. S4 requires separate schema/API approval.

### A6. Candidate paid value is currently controlled by non-plan gates

Severity: expected pre-subscription condition, high launch risk if left unchanged

- analytics: owner scope, market count, and data completeness;
- reports: owner financial/export role capability and local data readiness;
- product cover: environment, role, quota, and optional feature-specific entitlement;
- sales evidence: environment, market setting, role/relationship, route, RLS, and object-storage readiness;
- Team collaboration: role, relationship, RPC, and RLS.

These are valid independent gates, but none proves subscription entitlement.

### A7. Production readiness is not equivalent to model inclusion

Severity: release blocker for paid launch

Repository evidence says:

- product cover Web implementation is complete locally, while migration/environment/R2/deployment verification remains operationally gated;
- sales photo evidence staging smoke still records final result pending;
- settlement PDF is a browser preview and does not upload or store generated reports;
- report Excel generation is not implemented;
- subscription checkout and provider reconciliation do not exist.

No plan definition may automatically activate these runtime capabilities.

### A8. Client-controlled entitlement search result

Severity: pass

No current code was found that grants Free, Pro, or Team through:

- localStorage or sessionStorage;
- `NEXT_PUBLIC_*` plan/entitlement variables;
- URL or query-string plan values;
- client clock or hidden pricing-page state.

The public sales-photo runtime flags control feature rollout only. They are not subscription entitlements and must remain separate.

## 4. Current Subscription Presentation Truth

| Surface | Current behavior | Truth assessment | Required first-phase change |
| --- | --- | --- | --- |
| `/subscription` | disabled three-card preview | mostly truthful; obsolete Team name | use shared Free/Pro/Team model |
| account settings | links to plan preview | truthful | keep owner-only, neutral availability |
| top navigation menu | hardcoded current Free plan | not authoritative | remove current-plan claim |
| `PricingCard` | disabled action | truthful action; stale plan vocabulary | render shared plan presentation |
| `UpgradePrompt` | unused immediate-upgrade default | unsafe if mounted | make prop-driven and unavailable-aware |
| `FeatureLimitDialog` | unused hardcoded Pro claims | conflicts with canonical matrix | remove invented defaults and checkout claim |
| product-cover field | links denial to paid plan | denial reasons can be misclassified | map only actual `free_plan` to plan preview |

## 5. Authority Map

| Concern | Current authority | Subscription-safe? |
| --- | --- | --- |
| authentication | Supabase session/server auth | yes |
| owner/staff role | RoleContext plus Supabase relationship/RLS/RPC | yes, separate from plan |
| local data readiness | Dexie projections and analytics completeness | yes, separate from plan |
| feature rollout | client/server environment gates | yes, separate from plan |
| product-cover paid bridge | server-read feature-specific entitlement when mode is `required` | partial, not a plan model |
| current account plan | none | no |
| effective subscription capabilities | none | no |
| billing lifecycle | none | no |
| price/founder assignment | none | no |

## 6. S0B And S1 Handoff

S0B must statically prove:

1. unavailable authority cannot display active Pro or Team;
2. staff does not receive billing actions;
3. unavailable billing cannot display checkout, renewal, cancellation, payment success, or management claims;
4. Growth Reserve is absent from purchasable plan codes;
5. stale hardcoded `currentPlan` and `enterprise` cannot return.

S1A and S1B may introduce pure TypeScript definitions and resolvers only. They must not add API routes, Supabase reads/writes, storage-backed entitlement, billing SDKs, or runtime feature enforcement.

## 7. Stop Conditions

Stop and request the matching later approval before:

- changing a production feature gate;
- changing product-cover or sales-evidence route enforcement;
- adding subscription tables, RLS, RPCs, provider ids, checkout, or webhooks;
- enforcing plan limits on markets, products, analytics, reports, uploads, or staff;
- assigning trials, promotions, referral rewards, founder prices, or paid credits;
- publicly presenting provider-specific upgrade credit, refund, or renewal mechanics.
