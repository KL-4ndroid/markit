# Feria Subscription Tier Plan

Date: 2026-07-24

Last updated: 2026-07-29

Status: product planning document after subscription and platform-strategy discussion. This document defines the intended subscription direction, data-asset strategy, and future platform reserve space. Owner-only client-generated PDF reporting is approved for Pro/Team as of 2026-07-29. This document does not approve billing launch, payment collection, App Store / Play Store subscription setup, Supabase schema changes, RLS changes, Excel generation, upload enablement, or marketplace implementation by itself.

## 0. 繁中摘要

Feria 的短中期方向不是先做媒合平台，而是先陪小品牌在市集中站穩腳步。產品要先幫品牌主記錄營運、理解市集表現、改善商品準備、產生可信報表，讓每個品牌逐步累積可被信任的營運資料。

長期方向是「能孕育小品牌商務網路的平台」。但平台化必須從真實、乾淨、經品牌主同意的資料長出來，而不是一開始就做公開 marketplace、創作者端、聊天媒合、抽成金流或合作排名。

第一階段的正式訂閱只分成三個方案：

- Free: 讓小品牌開始記錄市集、商品、成交、成本與互動資料。
- Pro: 讓品牌主看懂哪些市集值得再參加、哪些商品該補貨或推廣，並取得更專業的報表與商品照片能力。
- Team: 讓有員工或 manager 的品牌安全分工，並承載銷售照片證據、團隊流程與更高容量。

Growth Reserve 只保留為未來策略能力，不是第四個 runtime 方案。推廣初期採「品牌同行 Pro Pass」：被推薦品牌完成第一場真實市集後，推薦人與被推薦人各獲得一次可自行啟用的 30 天 Pro Pass。獎勵不發現金、不做多層推薦，也不因單純註冊就發放。

Pro 付費上線時預留「Pro 創始年繳鎖價」：只有在 server 確認的合格 Pro 試用期內完成年繳的 owner 可取得。首次實際成交金額固定為當時 Pro 年繳公開價的 65% 對應價格；只要付費關係不中斷，未來續訂不因新公開價調漲而改變。取消在期末實際生效並造成訂閱中斷後，鎖價資格失效，重新訂閱依當時公開價。這是有條件的連續訂閱保留價，不對外宣稱為「終身價」。

免費版必須實用，不應阻擋市場日的基本記錄。付費版應收在決策價值、專業輸出、團隊協作和照片等成本型能力。所有付費權限都必須來自 server-side source of truth，不能靠 UI 標籤、browser storage 或 public env 判斷。

## 1. Product North Star

Feria helps small market brands stand on their own feet first.

Long term, Feria can become a platform that grows a small-brand commerce network. That platform should emerge from trusted operational data, not from a premature marketplace.

Working product statement:

```text
Feria helps small brands stabilize market operations, accumulate trusted business data, and later unlock better collaboration and growth opportunities.
```

The subscription model must support this sequence:

1. Help a small brand start recording useful market operations.
2. Help the brand understand what to do next.
3. Help the brand work with a small team.
4. Help the brand turn operational proof into collaboration readiness.
5. Only after enough trusted opt-in data exists, grow toward benchmark and partner matching.

## 2. Strategic Position

Feria should not compete as a generic POS, accounting tool, CRM, or creator marketplace.

The immediate product category is:

```text
market-brand operating system
```

The future platform category is:

```text
small-brand commerce network
```

This distinction matters:

- A generic POS records transactions.
- A generic analytics dashboard shows charts.
- A generic marketplace lists supply and demand.
- Feria should help a small brand know which markets to join, what products to prepare, how reliable its data is, and when it is ready for outside collaboration.

## 3. Core Product Principles

1. The free plan must be useful enough for a real small brand to keep using.
2. Paid plans should charge for decision value, team efficiency, professional outputs, and cost-heavy capabilities.
3. Basic recording must not be blocked during a busy market day.
4. Photo and attachment uploads are paid or controlled capabilities because they create storage, bandwidth, moderation, and support costs.
5. Analytics must be confidence-aware. Missing data should limit claims, not produce fake certainty.
6. Data collection must remain lightweight. The product should ask for the minimum extra structure needed to improve recommendations.
7. Platform reserve space must not make the current owner workflow heavier.
8. Future platform participation must be opt-in and explain what data can be shared or aggregated.
9. Billing, entitlements, and feature gates must be based on authoritative server-side state, not UI labels or browser storage.
10. Web, iOS, and Android must share the same business rules, entitlement decisions, analytics models, and API contracts.

## 4. Current Product Baseline

Existing useful data foundations:

- `markets`: market dates, location, status, fees, rentals, commission, total revenue, total profit, interactions, deals.
- `products`: category, price, cost, stock, active status, total sold, description.
- `events`: market lifecycle, product lifecycle, interactions, deals, deletion tombstones, notes, checklist actions.
- `dailyStats`: revenue, cost, profit, deal count, interaction counts, and product sales aggregation.
- Deal payloads: sold product, quantity, sale-time price, sale-time cost, payment method, manual-entry and backfill markers.
- Analytics services: data completeness, actionable insight cards, product recommendations, market recap direction.
- Settlement reporting: owner-only report model, confidence, limitations, market decisions, product rows, and future PDF direction.
- Product cover photos: implementation exists behind feature and entitlement gates, with pre-subscription open mode documented separately.
- Sales photo evidence: cost-heavy photo evidence flow exists and should remain a paid/team capability when subscriptions launch.

Current limitations for future platform value:

- Brand profile is minimal. Current `brand_name` is not enough for collaboration readiness.
- Product records do not yet capture shipping fit, shelf life, capacity, lead time, wholesale price, collaboration margin, or creator-friendly story.
- Market context does not yet capture market type, organizer, indoor/outdoor state, booth position, foot traffic, weather, or audience.
- Collaboration outcomes are not modeled.
- Opt-in, anonymization, and public partner snapshot rules are not modeled.

## 5. Tier Strategy Summary

Recommended tiers:

| Tier | Role | Product promise |
| --- | --- | --- |
| Free | Start | Record markets and sales without friction. |
| Pro | Stabilize | Understand what to do next and prepare better. |
| Team | Operate together | Add staff workflows, evidence, and stronger reporting. |

The first paid commercial release should focus only on Free, Pro, and Team. Growth Reserve remains a strategic capability reserve and must not become a purchasable plan or runtime plan code until its commercial model is decided.

## 6. Free Plan

### Purpose

The free plan should help a small brand start using Feria in real market conditions. It should feel practical, not like a demo.

### Included

- Owner account.
- Create and manage markets.
- Market status tracking.
- Market fees, rentals, commission, and notes.
- Product catalog with text fields, price, cost, stock, category, active status, and description.
- Fast sale recording.
- Manual total entry after market close.
- Basic interaction recording.
- Basic cloud sync for text and event data.
- Basic CSV export for owner data when reporting export is approved.
- Data completeness guidance that teaches the owner what to record next.
- Limited weekly/monthly settlement summary with total revenue, deal count, included-market coverage, and record-completeness guidance.

### Excluded

- Product cover photo upload.
- Sales photo evidence upload.
- File attachments.
- Designed PDF reports.
- Excel exports.
- Single-market basic analytics and review, including simple rejoin guidance.
- Advanced cross-market comparison.
- Advanced product ranking and restock recommendations.
- Team/staff collaboration.
- Manager permissions.
- Collaboration readiness profile.
- Public partner snapshot.
- Benchmark participation.

### Recommended Limits

Exact production limits remain an open pricing decision. Recommended initial limit posture:

- Keep basic recording generous enough that early brands can finish real workflows.
- Limit cost-heavy or operationally complex surfaces first.
- Use server-side safety ceilings for storage and API abuse before advertising public limits.
- Avoid "unlimited" language.

Candidate free limits:

| Capability | Candidate free limit |
| --- | --- |
| Active products | 15 as a pricing experiment; beta may remain unenforced until usage distribution is known |
| Historical products | retained and readable; never deleted because of the active limit |
| Historical markets | Keep accessible; analytics presentation starts in Pro |
| Staff accounts | 0 |
| Photo storage | 0 upload entitlement |
| PDF/Excel exports | unavailable |
| Analytics | no result presentation; data-completeness guidance remains available |

## 7. Pro Plan

### Purpose

Pro is for the owner who wants to make better decisions, not just record activity.

### Product Promise

```text
Know which markets and products deserve more effort.
```

### Included

Everything in Free, plus:

- Higher product and market limits.
- Single-market basic analytics and review:
  - revenue;
  - deal count;
  - average order value when available;
  - basic cost pressure;
  - simple rejoin guidance.
- Basic product sales summary when product-level data exists.
- Product cover photo upload and management.
- Advanced market comparison.
- Market decision scorecard.
- Rejoin recommendation with confidence and reasons.
- Product ranking.
- Restock, promote, watch, reduce, or retire suggestions when data supports them.
- Cost pressure and margin warnings.
- Recent 3 / recent 10 / all-market trend comparison.
- Deterministic market recap.
- Weekly and monthly settlement report preview.
- Owner-only designed PDF report generated from the same local settlement report truth.
- Excel export when separately approved.
- Brand data completeness guidance.
- Early "collaboration readiness" private preview, if implemented, visible only to the owner.

### Launch Price Hypothesis

Candidate public price for validation, not approved billing:

```text
NT$199 per month
NT$1,990 per year
```

Pro is owner-only. It does not include a formal staff account or create a staff relationship. A future read-only share artifact can be considered separately without granting workspace access.

This price and the active-product limit must be validated through interviews, beta behavior, and conversion data before production enforcement.

### Pro Founder Annual Locked Price

Approved product direction, not approved billing implementation:

```text
Public name: Pro 創始年繳鎖價
Internal offer code: pro_founder_annual_65
Initial candidate amount: NT$1,290 per year
Continuity promise: keep the assigned renewal amount while paid continuity remains unbroken
```

`NT$1,290` is the practical candidate price point closest to 65% of the current `NT$1,990` annual hypothesis. The final storefront amount must use a supported integer price point and be explicitly approved before billing. The checkout must show one exact amount; it must never calculate or display a floating-point amount such as `NT$1,293.50`.

At `NT$1,290/year`, gross revenue is `NT$107.50/month` before tax, store or payment fees, storage, and support. It is about 35% below the candidate public annual price and about 46% below twelve monthly payments at `NT$199`. This is intentionally aggressive and should be limited to a controlled launch cohort rather than treated as the normal annual price.

Eligibility and assignment rules:

1. The owner must be in a real server-authoritative Pro trial with `founderOfferEligible=true`.
2. Annual Pro purchase must complete before the trusted trial `entitlementEndsAt`.
3. The server assigns and records the exact billed price version and fixed renewal amount at purchase time.
4. The assigned amount is not recalculated when Pro public prices rise.
5. An owner can acquire the founder lock once; client state, query strings, referral codes, localStorage, or UI copy cannot grant it.
6. The founder offer is a finite launch cohort, not the default annual discount for every future trial. A candidate experiment is the first 300 eligible owner workspaces or 90 days after billing launch, whichever occurs first; the final enrollment end date, owner cap, or both must be approved before launch.

Continuity rules:

- `cancel_at_period_end` keeps both Pro access and the locked amount through the paid period. Revoking the cancellation before expiry preserves the lock.
- The lock is forfeited only when cancellation becomes effective and paid entitlement lapses, or after an approved full-refund, chargeback, dispute, or abuse decision.
- A configured payment-retry or grace period preserves the lock. An unrecovered lapse after grace forfeits it.
- Re-subscription after forfeiture uses the then-current public price, not the historical list price.
- Adopted Team rule: upgrading to Team places the Pro founder lock in a dormant state while a continuous paid Feria subscription remains active. Team is billed at its current Team price; returning to annual Pro restores the locked Pro amount. This business rule is approved, while S8 must still verify each provider's exact refund, credit, renewal-date, and restoration mechanics before public billing launch.

### Public Price Growth Strategy

Pro and Team public prices may rise as product value, support load, storage cost, and commercial evidence mature. Price growth must use explicit price versions:

- `planCode` describes product capability; `priceVersionId` describes a commercial price. They are never the same field.
- A new public price version applies to new purchases from its effective date.
- Founder-locked subscribers remain on their assigned fixed amount while their lock is active or validly dormant.
- Standard existing subscribers are not silently migrated by a UI or configuration change. Any migration of an existing price cohort requires a separate commercial decision, notice plan, provider-policy review, and support plan.
- Pro and Team prices are versioned independently. This founder offer discounts annual Pro only and grants no Team price lock.
- Public price review should be evidence-based, not calendar-only: review willingness to pay, retention, support cost, storage cost, report usage, and conversion before each increase.

Internal candidate price ladder, not a public promise or billing approval:

| Price version | Pro monthly / annual | Team monthly / annual | Candidate activation evidence |
| --- | ---: | ---: | --- |
| Launch | NT$199 / NT$1,990 | NT$499 / NT$4,990 | first paid validation release |
| V2 | NT$249 / NT$2,490 | NT$649 / NT$6,490 | advanced analytics, reports, and product-photo workflows are stable with measured support and storage cost |
| V3 | NT$299 / NT$2,990 | NT$799 / NT$7,990 | Team collaboration, sales evidence, audit behavior, and retention are commercially proven |

Each annual candidate remains equivalent to approximately ten monthly payments. Feria reviews pricing at evidence checkpoints; it does not automatically increase prices on a calendar date. A price version becomes active only after an explicit commercial approval.

### Pro-To-Team Upgrade Policy

Adopted product behavior:

1. Team entitlement begins immediately after the billing provider confirms the upgrade payment or replacement transaction.
2. The owner keeps the unused value of the current Pro period. Credit or refund is calculated from the amount actually paid for Pro, including any founder price, not from the current Pro list price.
3. Team uses the current Team `priceVersionId`. The Pro founder 65% rule does not discount Team.
4. A founder Pro lock changes to `dormant` while continuous paid Team service remains active.
5. A scheduled Team-to-Pro downgrade takes effect at the next verified renewal boundary. If paid continuity was never broken, annual Pro resumes at the dormant founder amount.
6. Cancelling all paid service and allowing Team entitlement to lapse forfeits the dormant founder lock. A later Pro purchase uses the then-current public Pro price.
7. Monthly-to-annual changes may take effect immediately with provider-confirmed credit. Annual-to-monthly changes should default to the next renewal boundary to avoid unnecessary refunds and balance complexity.
8. The Feria UI or provider-owned confirmation sheet must show every exact charge, credit or refund, effective time, and next renewal date that the provider exposes. If a provider does not expose an exact pre-purchase proration quote, its confirmation sheet and final transaction are authoritative; Feria must not estimate a final payable amount from client time or a local formula.

Provider implementations may differ in whether they refund unused Pro value, charge only a prorated difference, move the renewal date, or preserve it. Those mechanics may differ, but the shared product guarantees remain: immediate Team access after confirmed payment, no loss of unused actual-paid Pro value, no 65% Team discount, and no loss of the dormant founder Pro lock while paid continuity remains unbroken.

## 8. Team Plan

### Purpose

Team is for brands that operate booths with staff, managers, or repeated delegation.

### Product Promise

```text
Operate together without losing control of owner-sensitive data.
```

### Included

Everything in Pro, plus:

- Staff and manager workflows.
- Role-based market and product access.
- A candidate three staff seats for the first commercial offer.
- Sales photo evidence capture and upload.
- Owner review album for sales evidence.
- Staff activity visibility where permission-safe.
- Stronger audit and blocked-state UX.
- Team-level market-day operating workflow.
- Higher product photo and evidence quotas.
- Settlement report workflows for owner; manager report/export remains a separate permission decision.

### Launch Price Hypothesis

Candidate public price for validation, not approved billing:

```text
NT$499 per month
NT$4,990 per year
Candidate inclusion: 3 staff seats.
```

The first commercial release should not add separate seat, storage, PDF, evidence, or analytics add-ons. Add-ons can be evaluated only after real support, storage, and usage data exist.

## 9. Strategic Growth Reserve

### Purpose

Growth Reserve is the future path toward small-brand commerce network value. It is not an `AccountPlanCode`, purchasable tier, or current entitlement source.

It must not be built as a public marketplace now.

### Future Product Promise

```text
Turn trusted market performance into better collaboration opportunities.
```

### Possible Future Capabilities

- Brand collaboration profile.
- Product collaboration fit profile.
- Collaboration readiness score.
- Creator / group-buying product kit.
- Public partner snapshot, explicitly enabled by the owner.
- Invite-only collaboration links.
- Private application workflow from creators or group-buying hosts.
- Collaboration outcome tracking.
- Anonymous benchmark participation.
- Marketplace discovery only after enough opt-in supply and demand exist.

### Not Approved Now

- Creator-side app.
- Public marketplace.
- In-app matching feed.
- Chat or negotiation tooling.
- Platform escrow or order payments.
- Automated commission settlement.
- Public ranking of brands.
- Anonymous benchmark release without privacy and consent design.

## 10. Capability Matrix

The canonical, testable capability definitions are in:

```text
docs/subscription/SUBSCRIPTION_FEATURE_DEFINITION_MATRIX_2026_07_24.md
```

Summary:

| Capability | Free | Pro | Team |
| --- | --- | --- | --- |
| Market creation, sale recording, and manual totals | Yes | Yes | Yes |
| Basic single-market analytics and review | No | Yes | Yes |
| Advanced comparison and product recommendations | Limited or no | Yes | Yes |
| Product cover photo upload | No | Yes | Yes |
| Sales photo evidence upload | No | No | Yes |
| Formal staff collaboration | No | No | Yes |
| Designed PDF generation | No | Yes | Yes |
| Excel generation | No | Yes when separately implemented | Yes when separately implemented |

Strategic capabilities such as collaboration readiness, public partner snapshots, and anonymous benchmarks are not subscription tiers. Publication and benchmark participation require separate owner consent in addition to any future capability access.

## 11. Entitlement Model

Subscription logic should resolve to server-authoritative account capabilities.

Recommended account capability shape:

```ts
type AccountPlanCode = 'free' | 'pro' | 'team';

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

type AccountCapabilities = {
  ownerId: string;
  planCode: AccountPlanCode;
  planSource: 'free' | 'admin' | 'promotion' | 'billing';
  billingStatus: BillingStatus;
  entitlementStatus: EntitlementStatus;
  capabilityEvaluatedAt: string;
  capabilityRefreshAfter: string;
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
```

Future strategic access and owner consent must remain separate:

```ts
type StrategicCapabilityCode =
  | 'collaboration_readiness'
  | 'public_partner_snapshot'
  | 'anonymous_benchmark';

type GrowthConsentState = {
  partnerSnapshotPublished: boolean;
  anonymousBenchmarkOptIn: boolean;
};
```

Rules:

- Billing lifecycle and effective entitlement are separate. Feature gates use server-resolved capabilities and `entitlementStatus`, not billing status directly.
- Capability freshness is derived from trusted server timestamps. A client-supplied `fresh` flag cannot grant access.
- Missing or stale capability state must fail closed for paid-only writes after any explicitly approved offline entitlement lease ends.
- Before Team launch, define an offline entitlement lease so a temporary network loss does not unexpectedly break an already-authorized market-day workflow.
- Existing user data must remain readable after downgrade unless there is a separate legal or safety requirement.
- Downgrade blocks new paid-only creation or replacement, but does not silently delete retained user content.
- Delete/export/privacy controls must remain available where appropriate even after downgrade.
- Staff and managers inherit capabilities from the owner account, but still require role permission.
- UI labels must come from the same capability source used by feature gates.

## 12. Launch Referral Reward Program

### Recommended Mechanism

Use a direct, double-sided, milestone-based product reward:

```text
品牌同行 Pro Pass
```

The first version is a pre-billing or controlled-beta acquisition program. It should pause when paid billing launches unless the paid-owner reward and credit rules have been separately approved.

It should work as follows:

1. An eligible owner shares a referral link or code with another market brand.
2. The referred owner creates a new verified account through that attribution.
3. The referred brand completes one real market and records at least one sale or a manual revenue total.
4. After server-side qualification, both owners receive one 30-day Pro Pass.
5. Each pass can be manually activated within 90 days so the reward can align with an upcoming market.
6. A candidate safety ceiling is six qualified rewards per owner in a rolling 12-month period; this remains a launch experiment.

The Pro Pass grants Pro capabilities only and uses the normal non-unlimited Pro storage quota. It never grants Team staff access, manager permissions, or sales evidence upload. When the pass ends, normal downgrade and retention rules apply: retained paid-created content remains readable and deletable, while new paid-only writes are blocked.

### Why This Fits Market Brands

- Market brands rely heavily on trusted peer recommendations.
- A manually activated pass respects irregular market schedules better than an immediately expiring coupon.
- Requiring a completed market rewards real adoption and useful data, not empty sign-ups.
- Product access demonstrates Feria's decision value without cash payout, tax handling, or high fraud exposure.
- A double-sided reward lets the inviter offer useful value to another brand instead of only benefiting personally.

### Attribution And Qualification Rules

- Only a new owner account can be referred.
- An owner or workspace cannot refer itself.
- One referred workspace can have only one referrer.
- The inviter must be an owner with at least one completed market.
- Staff and managers cannot own or redeem referral rewards for an owner workspace.
- Qualification and reward grants must be server-authoritative, idempotent, and auditable.
- No reward is issued for registration alone.
- Suspicious duplicate-account, device, payment, or workspace patterns can be held for review.
- Unused passes have no cash value, cannot be transferred, and cannot be resold.

### Promotion UX

- Ask for a referral after a completed market review or another demonstrated value moment, never during active market-day recording.
- Initial sharing should use copy-link or the platform share sheet. Do not import address books or upload a friend's contact list.
- Put Web share behavior behind a shared `lib/platform` port with a Web adapter now and future native adapters later.
- Show referral states clearly: attributed, awaiting qualification, qualified, reward available, activated, expired, or rejected.

### Future Paid-Conversion Credit

After billing and refund reconciliation are stable, Feria may separately test a fixed subscription credit, such as NT$199 to both parties after the referred brand's first valid paid invoice clears the configured hold period. This is not approved for the first launch and must not be implemented with the Pro Pass foundation automatically.

The founder annual price cannot stack with a percentage discount, paid-conversion credit, or another checkout promotion unless a later policy explicitly selects the precedence and accounting treatment. A standard trial or qualified Pro Pass may be marked as founder-offer eligible only by the server; holding a referral reward alone does not create price eligibility.

### Not Approved For Initial Launch

- Cash commission or bank transfer.
- Percentage revenue share.
- Rewards for second-level or downstream referrals.
- Public referral leaderboards.
- Unlimited referral rewards.
- Rewarding raw registrations or unverified data entry.
- A permanently open founder offer for every future trial or automatic stacking with other promotions.
- Organizer, influencer, affiliate, or ambassador payouts; these require a separate partner program.

The Pro Pass remains the primary peer-referral incentive. The Pro founder annual locked price is a separate, finite paid-conversion cohort. It is conditional on uninterrupted paid continuity and must be described as a locked renewal amount, not an unconditional lifetime promise.

Before public launch, legal, tax, promotion-terms, privacy, fraud, and native-store policy reviews are required. The program must stay direct and one-level; it must not create a downstream commission structure.

## 13. Photo And Storage Policy

Photo features should be paid or controlled:

- Product cover photos are durable brand assets and belong in Pro and above.
- Sales photo evidence is operational evidence with higher upload volume and review complexity; it belongs in Team or a later add-on.
- Free users may view existing photos where permission allows, but cannot upload new photos after subscription enforcement begins.
- No photo plan should advertise unlimited storage until real usage, quota, and cost data exist.
- Local pending blobs remain temporary offline work, not backup content.
- R2 keys, signed URLs, blobs, and Base64 data must never enter product events or public payloads.

## 14. Data Asset Strategy

### 14.1 Stage 1: Owner Operating Brain

Data collected now should support:

- market decision score;
- rejoin recommendation;
- product restock and promotion suggestions;
- cost pressure analysis;
- market recap;
- weekly and monthly settlement reporting;
- confidence and limitation labels.

This stage is already aligned with current analytics and reporting plans.

### 14.2 Stage 2: Brand Collaboration Readiness

Future data additions should be lightweight and optional:

```text
brand_profile
product_commerce_profile
market_context
collaboration_readiness_snapshot
```

Candidate `brand_profile` fields:

- brand display name;
- brand category or positioning;
- short story;
- target audience;
- preferred collaboration types;
- shipping regions;
- social links;
- opt-in flags for partner visibility and anonymous benchmark participation.

Candidate `product_commerce_profile` fields:

- product story;
- hero product flag;
- shelf life or made-to-order status;
- monthly capacity;
- lead time;
- shipping fit;
- wholesale or collaboration price;
- suggested retail price;
- acceptable commission range;
- sample availability;
- collaboration notes.

Candidate `market_context` fields:

- market type;
- organizer;
- indoor or outdoor;
- booth position;
- estimated foot traffic;
- audience fit;
- weather;
- notable nearby events;
- owner qualitative rating.

These fields should be added only when they directly improve owner decisions or collaboration readiness. Do not turn product creation into a long brand intake form.

### 14.3 Stage 3: Small-Brand Commerce Network

Only after opt-in data volume is sufficient:

- anonymous category benchmarks;
- market-type performance comparisons;
- creator/group-buying collaboration discovery;
- invite-only brand collaboration pages;
- marketplace-style discovery.

## 15. Platform Reserve Space

Reserve these concepts in naming and architecture, but do not implement user-facing platform workflows yet:

- collaboration readiness;
- partner snapshot;
- creator or group-buying host;
- collaboration terms;
- collaboration outcome;
- anonymous benchmark cohort.

Implementation guidance:

- Use neutral names that do not lock the product into only influencers or only group buying.
- Keep partner-facing data separate from owner-private financial data.
- Require explicit owner publication or opt-in.
- Do not expose owner cost, profit, supplier notes, staff activity, or private market details in public snapshots.

## 16. Reporting And Export Position

Settlement reports are the primary professional output.

CSV and Excel are supporting formats, not backup or recovery features.

Policy:

- Owner-only financial reporting remains the default.
- Manager report/export access requires a separate permission decision and redaction tests.
- Client-generated designed PDF reports are a Pro/Team value driver and remain owner-only.
- Excel can become a Pro/Team value driver after separate dependency and security approval.
- Public partner snapshots must be separate from owner financial reports.

## 17. Downgrade And Retention Policy

Downgrade should preserve trust:

- Do not delete markets, products, events, reports, photos, or evidence solely because of downgrade.
- Block new paid-only creation or replacement after downgrade.
- Keep existing paid-created content readable where permission allows.
- Keep deletion and privacy controls available.
- Show clear plan state and blocked reason before the user starts a paid-only action.
- Never rely on client-side disabled buttons as the security boundary.
- Team downgrade keeps staff relationships and history but suspends owner-workspace access with `suspended_by_plan` or equivalent semantics.
- A later Team upgrade must require owner confirmation before suspended staff access resumes.
- If active products exceed a downgraded limit, do not delete or automatically deactivate them; block only new activations until the account is within the limit.

## 18. Billing And Store Policy Boundary

Billing implementation is not approved by this plan.

Before billing launch:

- choose provider strategy for Web, iOS, and Android;
- verify current Apple App Store, Google Play, and payment-provider policies;
- decide whether Web billing and native in-app purchase can share the same entitlement source;
- design webhook and reconciliation behavior;
- test past-due, cancellation, refund, trial, and grace-period states;
- avoid showing fake payment cards, renewal dates, cancellation states, or upgrade success.

Candidate lifecycle semantics, pending provider and policy approval:

| Billing or grant state | Effective entitlement behavior |
| --- | --- |
| Trial active | paid capability through real `entitlementEndsAt` |
| Trial expired | return to Free; retain paid-created content |
| Past due | configurable grace; notify without fabricating a payment state |
| Grace expired | block new paid-only writes; retain readable content |
| Cancel at period end | keep current entitlement until the verified period end |
| Refunded or disputed | server reconciliation decides the effective end; client state cannot revoke or restore access |
| Promotion Pro Pass expired | return to Free and apply normal downgrade retention |
| Founder annual acquired | assign one fixed renewal amount and immutable acquisition price version |
| Founder cancellation scheduled | keep access and lock through the verified paid period; reversal before lapse preserves both |
| Founder payment recovered in grace | continue the same fixed renewal amount |
| Founder paid entitlement lapsed | forfeit the lock; future purchase uses the then-current public price |
| Public price version increased | apply to new purchases; do not overwrite an active or validly dormant founder assignment |
| Pro upgraded to Team | activate Team after confirmed payment; preserve actual-paid unused Pro value; move founder Pro lock to dormant |
| Team scheduled to Pro | keep Team through the paid period; restore dormant annual Pro amount at the next renewal boundary when continuity is unbroken |
| Team cancelled without replacement | keep Team through the paid period; forfeit dormant founder lock when paid entitlement actually lapses |

Do not hardcode a seven-day grace period until provider behavior, support policy, and offline entitlement rules are approved.

## 19. Product Metrics

Free plan success:

- owners create at least one completed market;
- owners record revenue after market close;
- owners return for the next market;
- owners record at least one product or manual total;
- owners see a useful data-completeness next step.

Pro conversion signals:

- owner reviews rejoin recommendations;
- owner compares multiple markets;
- owner uses product recommendations;
- owner wants report export;
- owner wants product photos.

Team conversion signals:

- owner invites staff or manager;
- staff records sales;
- owner needs evidence or review;
- owner needs stronger role safety and operational visibility.

Growth Reserve readiness signals:

- owner has enough product-level sales history;
- owner has stable hero products;
- owner has enough margin for collaboration;
- owner wants to share a brand/product profile externally;
- owner explicitly opts into partner visibility or anonymous benchmarks.

Referral program success:

- referral link to verified-owner attribution rate;
- referred brand first-market completion rate;
- time from attribution to qualification;
- Pro Pass activation and advanced-feature use;
- referred brand 30-day and 90-day retention;
- paid conversion after the pass, when billing exists;
- reward cost, photo-storage cost, rejection rate, and suspected abuse rate.

Founder annual price success:

- eligible-trial to annual-Pro conversion rate;
- founder conversion time before trial expiry;
- first and second annual renewal rate;
- voluntary cancellation, payment-recovery, refund, and chargeback rate;
- contribution margin after store or payment fees, taxes, storage, and support;
- founder-to-Team upgrade rate and return-to-Pro behavior;
- upgrade quote-to-confirmation rate and failed or abandoned upgrade reasons;
- actual Pro credit/refund, Team collected amount, and provider reconciliation variance;
- conversion and retention by public price version without mixing founder cohorts.

## 20. Open Decisions

These require later discussion:

1. Exact Free active-product limit after beta usage data.
2. Exact storage quota for product cover photos.
3. Team staff-seat count after support and role-usage data.
4. PDF and Excel export limits.
5. Billing provider and native-store compliance route.
6. Pro Pass redemption window and rolling reward ceiling after beta abuse data.
7. Whether to test fixed paid-conversion credit after billing is stable.
8. Past-due grace and offline entitlement lease duration.
9. Whether Growth Reserve becomes an add-on, invitation-only feature, or platform-side revenue model.
10. Marketplace commission or partner referral fee structure.
11. Anonymous benchmark consent and aggregation thresholds.
12. Founder-offer enrollment end date, eligible-owner cap, or both.
13. Exact supported storefront amount corresponding to the 65% launch policy.
14. Whether qualified Pro Pass trials join the founder cohort at billing launch; recommended default is server-marked eligibility without discount stacking.
15. Provider-specific mapping for immediate Team upgrade, actual-paid Pro credit/refund, renewal date, and dormant-lock restoration.
16. Exact evidence thresholds that activate V2 or V3 public price versions.

## 21. AI Guidance

When implementing from this plan:

- Start with shared entitlement and presentation truth before billing.
- Keep all feature decisions server-authoritative.
- Do not charge money or show billing-success flows until billing is explicitly approved.
- Do not implement public marketplace or creator workflows.
- Do not expand photo upload, evidence upload, export, staff permissions, RLS, or schema without the matching execution-plan slice.
- Do not implement referral attribution, reward grants, Pro Pass activation, subscription credits, contact import, or affiliate payouts without the matching approved promotion slice.
- Do not implement founder eligibility, price assignment, price-lock state, checkout, renewal, or forfeiture without the matching approved founder-price and billing slices.
- Never derive a locked renewal amount from the current public price at renewal time; use the server-owned immutable price assignment.
- Never apply the Pro founder percentage to Team. Preserve unused Pro value from the actual paid amount and use the current Team price assignment.
- Treat Pro-to-Team as an immediate confirmed upgrade and Team-to-Pro as a renewal-boundary downgrade; provider events remain authoritative for exact money and dates.
- Keep all platform-dependent capabilities behind `lib/platform` ports.
- Preserve cloud data as the trusted recovery source and local IndexedDB as cache/offline temporary state.
- Keep subscription copy honest: preview means preview, coming soon means coming soon, active means proven by source-of-truth state.
