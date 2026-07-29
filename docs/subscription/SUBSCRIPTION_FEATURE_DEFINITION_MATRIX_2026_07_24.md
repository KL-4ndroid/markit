# Feria Subscription Feature Definition Matrix

Date: 2026-07-24

Last updated: 2026-07-29

Status: canonical product and AI implementation contract for subscription capability definitions. This document does not approve runtime enforcement, billing, referral attribution, reward grants, production uploads, exports, role changes, RLS changes, or marketplace behavior.

Authority order:

1. `docs/SUBSCRIPTION_TIER_PLAN_2026_07_24.md` defines product and commercial direction.
2. This file defines testable feature boundaries and blocked behavior.
3. `docs/SUBSCRIPTION_TIER_IMPLEMENTATION_PLAN_2026_07_24.md` defines execution order and stop conditions.
4. Files under `docs/subscription/execution-pack/` are derived checklists and cannot override the three canonical documents above.

## 1. Plan Codes

```ts
type AccountPlanCode = 'free' | 'pro' | 'team';
```

Growth Reserve is not a plan code. Future strategic capabilities and owner consent are modeled separately.

## 2. Feature Definition Types

```ts
type FeatureProductStatus =
  | 'included'
  | 'limited'
  | 'preview'
  | 'coming_soon'
  | 'not_available';

type FeatureRuntimeStatus =
  | 'current_unverified'
  | 'model_only'
  | 'presentation_only'
  | 'gated'
  | 'active'
  | 'disabled';

type FeatureEnforcement =
  | 'current_unverified'
  | 'none'
  | 'presentation'
  | 'client_hint'
  | 'server_required';

type DowngradeBehavior =
  | 'retain_read'
  | 'block_new_write'
  | 'suspend_access'
  | 'not_applicable';
```

`current_unverified` means S0A must inspect the current page, domain service, API route, server gate, environment gate, and production state before implementation changes.

## 3. Access Evaluation Order

Every protected action must be evaluated in this order:

```text
authenticated owner workspace
AND authoritative account capability
AND effective entitlement
AND capability freshness or valid offline lease
AND role permission
AND runtime feature gate
AND data readiness
```

Failure must return the real reason. Do not replace every denial with an upgrade prompt.

```ts
type AccessBlockReason =
  | 'authentication_required'
  | 'owner_workspace_unavailable'
  | 'plan_required'
  | 'entitlement_inactive'
  | 'stale_capability'
  | 'role_forbidden'
  | 'runtime_disabled'
  | 'data_insufficient'
  | 'offline_lease_expired'
  | 'limit_reached'
  | 'promotion_ineligible'
  | 'promotion_pending_qualification'
  | 'promotion_reward_expired'
  | 'capability_unavailable'
  | 'unknown';
```

## 4. Core Feature Matrix

`current_unverified` entries require S0A inspection. Other enforcement values describe the required launch boundary, not proof that the current production route already implements it.

| Capability ID | Free | Pro | Team | Enforcement | Downgrade behavior |
| --- | --- | --- | --- | --- | --- |
| `market.create` | included | included | included | current_unverified | not applicable |
| `market.manage` | included | included | included | current_unverified | not applicable |
| `sale.record.fast` | included | included | included | current_unverified | not applicable |
| `sale.manual_total` | included | included | included | current_unverified | not applicable |
| `cost.record.basic` | included | included | included | current_unverified | not applicable |
| `interaction.record.basic` | included | included | included | current_unverified | not applicable |
| `product.catalog.text` | included; active limit is an experiment | higher limit | higher limit | current_unverified | block new activation only |
| `analytics.single_market.basic` | not available | included | included | server_required | retain source data; block paid presentation |
| `analytics.rejoin.simple` | not available | included | included | server_required | retain source data; block paid presentation |
| `analytics.market_comparison` | preview or limited | included | included | server_required | not applicable |
| `analytics.product_ranking.basic` | limited | included | included | server_required | not applicable |
| `analytics.product_recommendations` | not available | included | included | server_required | not applicable |
| `analytics.trend.recent3` | preview candidate | included | included | server_required | not applicable |
| `analytics.trend.recent10` | not available | included | included | server_required | not applicable |
| `analytics.trend.all` | not available | included | included | server_required | not applicable |
| `report.settlement.preview` | limited | included | included | server_required | retain read |
| `report.pdf.generate` | not available | coming soon | coming soon | server_required | block new write |
| `report.excel.generate` | not available | coming soon | coming soon | server_required | block new write |
| `photo.product_cover.upload` | not available | included | included | server_required | block new write; retain read/delete |
| `photo.sales_evidence.upload` | not available | not available | included | server_required | block new write; retain owner read/delete |
| `team.staff_collaboration` | not available | not available | included | server_required | suspend access; retain relationship/history |
| `team.manager_workflow` | not available | not available | included | server_required | suspend access; retain relationship/history |
| `team.owner_financial_report` | owner only | owner only | owner only | server_required | retain read |

Pro never creates a formal staff relationship. Team does not automatically grant every role owner-sensitive financial access.

If an active-product limit is later approved, creation or activation enforcement must become `server_required`; the current experiment does not authorize a limit gate.

## 5. Pro Basic Analytics Definition

Pro and Team include the single-market basic analysis and review capability:

- single-market revenue;
- deal count;
- average order value when data exists;
- basic cost pressure;
- simple rejoin guidance with a data-insufficient state;
- basic product sales summary when product-level data exists;

Free retains the source records and data-completeness guidance, but does not receive an analytics result, product sales summary, or rejoin recommendation. A downgrade never deletes market, sale, cost, interaction, or product data.

Free also does not receive full cross-market rankings, complete long-range trends, high-confidence restock or retirement decisions, PDF, Excel, or benchmark claims.

## 6. Advanced Analytics Definition

Pro and Team may include, only when supported by data:

- recent 3, recent 10, and all-market comparisons;
- ROI and per-hour profit views;
- market decision scorecard;
- rejoin reasons and confidence;
- product ranking;
- restock, promote, watch, reduce, or retire recommendations;
- margin and cost-pressure warnings;
- deterministic recap;
- settlement report preview.

Plan entitlement never overrides data completeness. A Pro or Team owner with insufficient data receives a limitation state, not fabricated confidence.

## 7. Limit Semantics

- `15 active products` is a launch experiment, not approved production enforcement.
- Historical products and markets remain readable.
- Downgrade never deletes or automatically deactivates products.
- If the account is above an active limit, allow deactivation and block only new activation until within the limit.
- Do not advertise unlimited products, storage, exports, or seats.
- Candidate Team inclusion is three staff seats; this remains a commercial hypothesis.

## 8. Billing, Entitlement, And Freshness

```ts
type AccountPlanSource = 'free' | 'admin' | 'promotion' | 'billing';

type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancel_at_period_end'
  | 'cancelled'
  | 'refunded'
  | 'disputed'
  | 'unknown';

type EntitlementStatus = 'active' | 'grace' | 'inactive' | 'unknown';
```

- Feature gates use effective capabilities and `entitlementStatus`, not billing status directly.
- `cancel_at_period_end` can retain active entitlement through the paid period.
- Capability freshness is derived from server-issued `capabilityEvaluatedAt` and `capabilityRefreshAfter`.
- `entitlementEndsAt` is the access end, not the cache refresh deadline.
- A promotional Pro Pass uses `planSource='promotion'` and a real `entitlementEndsAt`.
- Server-side paid writes must re-evaluate access. Client presentation is never the security boundary.
- Team launch requires an explicit offline entitlement lease policy before paid collaboration is enforced in poor-connectivity market-day workflows.

## 9. Price Version And Founder Lock Matrix

Price is a commercial assignment, not a plan capability. `planCode`, `entitlementStatus`, and `priceVersionId` must remain independent.

```ts
type PricePolicy = 'standard' | 'founder_locked';

type PriceLockStatus = 'active' | 'grace' | 'dormant' | 'forfeited';

type FounderOfferCode = 'pro_founder_annual_65';

type PriceRuntimeStatus =
  | 'model_only'
  | 'presentation_only'
  | 'disabled'
  | 'candidate'
  | 'blocked_pending_commercial_approval';

type PriceEnforcement = 'server_required' | 'provider_and_server';
```

| Pricing decision | Eligible owner | Product rule | Runtime initial state | Enforcement |
| --- | --- | --- | --- | --- |
| founder offer visibility | owner in trusted eligible Pro trial | owner-only, exact annual amount | presentation_only | server_required |
| founder price acquisition | eligible owner before trusted trial end | annual Pro only, one acquisition | disabled | server_required |
| founder renewal | active or approved grace lock | use stored fixed assignment | disabled | provider_and_server |
| cancellation scheduled | active founder subscriber | keep price and entitlement until effective lapse | model_only | provider_and_server |
| founder forfeiture | effective lapse or approved adverse billing event | future purchase uses current public price | disabled | server_required |
| Pro-to-Team quote | active Pro owner | current Team price plus unused actual-paid Pro value | disabled | provider_and_server |
| Team upgrade dormancy | continuous paid subscriber | Team at current price; founder Pro lock becomes dormant | disabled | provider_and_server |
| Team-to-Pro downgrade | active Team owner | renewal-boundary change; restore dormant founder amount if continuity is unbroken | disabled | provider_and_server |
| Team cancellation without replacement | active Team owner | forfeit dormant founder lock only after paid entitlement lapses | disabled | provider_and_server |
| public price increase | new purchase cohort | create a new price version; do not mutate founder assignment | model_only | server_required |

Founder pricing rules:

- public offer name is `Pro 創始年繳鎖價`; internal code is `pro_founder_annual_65`;
- initial candidate is `NT$1,290/year`, approximately 65% of the `NT$1,990/year` launch hypothesis, subject to supported storefront price points and explicit billing approval;
- the 65% rule determines the first assigned amount only; renewals use that immutable amount and do not recalculate against a later public price;
- only a server-authoritative eligible trial can acquire the lock before its trusted `entitlementEndsAt`;
- `cancel_at_period_end` does not forfeit the lock before entitlement lapses, and reversing cancellation before lapse preserves it;
- approved retry or grace preserves the lock; unrecovered lapse after grace forfeits it;
- re-subscription after forfeiture uses the then-current public price;
- the offer is finite and cannot become an always-on discount for every future trial; candidate enrollment is the first 300 eligible owner workspaces or 90 days after billing launch, whichever occurs first, pending final approval;
- the founder price does not stack with referral paid credit, another percentage discount, or checkout promotion without a separately approved precedence policy;
- Pro-to-Team uses the current Team price version and never applies the Pro founder percentage to Team;
- unused Pro value is based on the actual paid amount, including founder pricing, and the provider owns the final credit, refund, charge, effective time, and renewal date;
- if a provider exposes no exact pre-purchase proration quote, unavailable money or date fields remain `null` and the provider-owned confirmation sheet is authoritative;
- Team access begins only after the provider confirms the immediate upgrade transaction;
- Team-to-Pro defaults to the renewal boundary and restores the dormant founder amount only when paid continuity was never broken;
- cancelling Team without a replacement forfeits the dormant founder lock when Team paid entitlement actually lapses, not when cancellation is first scheduled;
- owner-facing copy says continuous-subscription locked price, not unconditional lifetime price;
- browser storage, query strings, UI flags, referral codes, and client clocks cannot assign, restore, or extend the lock.

Internal candidate public price versions:

| Price version | Pro monthly | Pro annual | Team monthly | Team annual | Runtime initial state |
| --- | ---: | ---: | ---: | ---: | --- |
| Launch | NT$199 | NT$1,990 | NT$499 | NT$4,990 | candidate |
| V2 | NT$249 | NT$2,490 | NT$649 | NT$6,490 | blocked_pending_commercial_approval |
| V3 | NT$299 | NT$2,990 | NT$799 | NT$7,990 | blocked_pending_commercial_approval |

V2 and V3 are internal hypotheses, not scheduled price changes. Each requires explicit approval after the matching product-value, retention, support, storage, and Team-operation evidence is reviewed.

## 10. Referral Reward Matrix

Program name:

```text
品牌同行 Pro Pass
```

| Capability ID | Eligible owner | Product rule | Runtime initial state | Enforcement |
| --- | --- | --- | --- | --- |
| `promotion.referral.share` | eligible Free owner in the pre-billing beta | direct link or code only | presentation_only | presentation |
| `promotion.referral.attribute` | new referred owner | one referrer per new workspace | disabled | server_required |
| `promotion.referral.qualify` | referred owner | verified account plus first completed market plus sale or manual total | model_only | server_required |
| `promotion.pro_pass.grant` | qualified inviter and invitee | one 30-day Pro Pass each | disabled | server_required |
| `promotion.pro_pass.redeem` | reward owner | manually activate within candidate 90-day window | disabled | server_required |
| `promotion.paid_credit` | future valid paid conversion | fixed credit candidate after settled invoice hold | disabled | server_required |

Referral policy:

- no reward for registration alone;
- no self-referral;
- no staff-owned reward;
- no second-level or downstream reward;
- no cash, transfer, resale, or public leaderboard;
- Pro Pass grants Pro only, never Team;
- Pro Pass uses the approved non-unlimited Pro storage quota;
- candidate cap is six qualified rewards per owner per rolling 12 months;
- qualification and reward ledger operations must be idempotent and auditable;
- reward expiry follows normal Pro-to-Free retention behavior;
- copy-link or platform share only at launch; no address-book import or referred-contact upload.

The candidate 90-day redemption window and six-reward ceiling remain experiments until beta data and abuse review approve them.

The Pro Pass program is initially a pre-billing or controlled-beta promotion for Free owner workspaces. It pauses when paid billing launches unless the separate paid-owner reward and subscription-credit policy is approved.

## 11. Referral Lifecycle

```text
attributed
-> awaiting_qualification
-> qualified
-> reward_available
-> reward_activated
-> reward_expired
```

Terminal or exception states:

```text
ineligible
rejected
attribution_expired
reward_revoked
```

Rules:

- only server-side qualification can move to `qualified`;
- reward grant is exactly-once per eligible side;
- inviter reward and invitee reward have separate ledger entries;
- client retries cannot duplicate a reward;
- suspicious cases can remain pending review without exposing fraud signals;
- no referral or reward record belongs in operational market events or local IndexedDB as the trusted source.

## 12. Downgrade And Retention Matrix

| Data or relationship | Read after downgrade | New write | Replace | Delete / revoke |
| --- | --- | --- | --- | --- |
| Markets and sales | yes | Free rules | Free rules | existing rules |
| Products | yes | active-limit rules | yes | existing rules |
| Product photos | yes | no | no | owner may delete |
| Sales evidence | owner may read | no | no | owner may delete |
| Generated reports | retained when stored | no new paid generation | feature-specific | policy-specific |
| Staff relationships | owner may see | no new Team access | suspended | owner may revoke |
| Staff activity history | retained | no new suspended activity | not applicable | no arbitrary deletion |
| Referral reward history | owner may see | server rules | not applicable | support/admin policy only |

Team downgrade retains staff relationships and history but suspends owner-workspace access with `suspended_by_plan` or equivalent semantics. Re-upgrade requires owner confirmation before restoring staff access.

## 13. Strategic Capabilities And Consent

```ts
type StrategicCapabilityCode =
  | 'collaboration_readiness'
  | 'public_partner_snapshot'
  | 'anonymous_benchmark';
```

- These are not plan codes.
- Private collaboration readiness may later be offered as a Pro preview without making Growth Reserve a tier.
- Public partner snapshots require explicit owner publication.
- Anonymous benchmark participation requires explicit opt-in and a separate consent record.
- Consent is not an entitlement and cannot default to opt-out participation.
- Owner-private cost, profit, supplier notes, staff activity, and private market details never become public merely because a capability exists.

## 14. AI Rules

- S0A verifies current runtime truth before any `current_unverified` status is changed.
- A product-plan inclusion never enables a route by itself.
- Presentation locks are not security gates.
- Role permission, plan capability, runtime readiness, data readiness, and consent stay separate.
- Referral planning does not authorize attribution, reward grants, Pro Pass activation, billing credit, schema, RLS, contact import, or affiliate payouts.
- Founder-price planning does not authorize provider prices, discounts, offer codes, checkout, eligibility assignment, price-lock tables, webhooks, or billing mutations.
- A current public price must never overwrite a stored founder price assignment.
- A Pro founder assignment cannot discount Team. A plan-change quote must use actual-paid Pro value and the current Team price version.
- Client arithmetic cannot be the source of a final plan-change charge, credit, refund, effective time, or renewal date.
- Update this matrix and focused tests whenever a subscription, pricing, or referral feature boundary changes.
