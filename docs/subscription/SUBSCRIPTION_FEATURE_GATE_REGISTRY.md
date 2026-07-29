# Subscription Feature-Gate Registry

Date: 2026-07-29  
Status: S3 feature-gate mapping complete; no subscription enforcement enabled  
Authority: derived from current repository inspection; it records runtime truth and does not activate a product-plan decision

## Status Vocabulary

- `active_unmetered`: available today without subscription enforcement;
- `active_role_gated`: available today through role/data rules, not plan rules;
- `gated_non_plan`: controlled by rollout, environment, permission, or feature-specific gates;
- `local_complete_production_unverified`: implemented locally without complete production evidence;
- `presentation_only`: visible but non-transactional;
- `model_only`: no runtime capability;
- `not_implemented`: no usable runtime capability;
- `authority_missing`: a UI claim exists without authoritative account state.

Risk is assessed against a future paid launch, not against current free operation.

## Registry

| Capability ID | UI source | Runtime source | Server enforcement today | Current status | Paid-launch risk | First approved action |
| --- | --- | --- | --- | --- | --- | --- |
| `subscription.account.current_plan` | `TopNavigation`, account settings | neutral preview; S4 client reader is not mounted yet | `GET /api/account-capabilities`, server resolver, guarded subscription account source | `local_complete_migration_user_confirmed` | medium: server environment, authenticated smoke, deployment evidence, and UI consumption remain | S5 consumes server-side for product-cover required mode; keep production unverified |
| `subscription.plan.preview` | `/subscription`, `PricingCard` | static presentation | none; actions disabled | `presentation_only` | medium: `enterprise` drift | S1A/S2 use Free/Pro/Team source |
| `market.create` / `market.manage` | market list/forms | local events plus sync | auth/role/sync policies, no plan | `active_unmetered` | low; intended Free core | keep unchanged |
| `sale.record.fast` / `sale.manual_total` | sales workspace and market detail | local event workflow plus sync | auth/role/sync policies, no plan | `active_unmetered` | low; intended Free core | keep unchanged |
| `cost.record.basic` | market forms/detail | local events/projections | auth/role policies, no plan | `active_unmetered` | low; intended Free core | keep unchanged |
| `interaction.record.basic` | sales/market interaction controls | local events/projections | auth/role policies, no plan | `active_unmetered` | low; intended Free core | keep unchanged |
| `product.catalog.text` | products list/forms | local events/projections | auth/role policies, no plan limit | `active_unmetered` | medium if a future active limit is advertised early | S1 model only; no enforcement |
| `analytics.single_market.basic` | analytics summary | local Dexie analytics | owner scope; no plan | `active_role_gated` | high: planned Pro feature is open | preserve current behavior until approved S6 gate |
| `analytics.rejoin.simple` | recap/actionable insights | local deterministic analytics | owner scope/data readiness; no plan | `active_role_gated` | high: planned Pro feature is open | preserve current behavior until approved S6 gate |
| `analytics.market_comparison` | analytics ranges/trends/advanced | local analytics | owner scope, market count, data readiness; no plan | `active_role_gated` | high: planned paid feature is open | S1 model only; S3 audit before enforcement |
| `analytics.product_ranking.basic` | product analytics tab | local analytics | owner scope and product-level data; no plan | `active_role_gated` | medium: Free/Pro boundary not enforced | S1 model only; S3 audit |
| `analytics.product_recommendations` | product and actionable insights | local analytics | owner scope, data completeness and market-count gates; no plan | `active_role_gated` | high: planned Pro feature is open when data qualifies | S1 model only; S3 audit |
| `analytics.trend.recent3` / `recent10` / `all` | date-range selector and trends tab | local analytics | owner scope/data readiness; no plan | `active_role_gated` | high: planned range boundary not enforced | S1 model only; S3 audit |
| `report.settlement.preview` | `/reports/settlement` | local Dexie report model | owner financial and import/export role capabilities; no plan | `active_role_gated` | high: planned paid boundary not enforced | S1 model only; S3 audit |
| `report.pdf.generate` | settlement PDF preview button | browser-generated temporary PDF preview | owner role in UI/domain; no plan or server generation | `active_role_gated` | high: model says coming soon but preview is usable | preserve current preview; S3 product decision audit |
| `report.excel.generate` | no mounted UI | pure CSV helpers only | none | `not_implemented` | low if kept coming soon | S1 model `coming_soon`; no action |
| `photo.product_cover.read` | product list/detail/card | metadata and private-image BFF routes | auth, product scope, read env gate | `local_complete_production_unverified` | medium: production evidence required | keep current gates |
| `photo.product_cover.upload` | product cover field | browser image adapter and local pending queue | auth, editor role, upload env gate, quota; shared account capability in `required` mode | `gated_open_or_plan` | medium: `open` is intentional and `required` is production-unverified | preserve `open_access`; do not enable `required` before S4 production evidence |
| `photo.product_cover.delete` | product cover field | private BFF delete | auth/editor role and delete/read env gates; no paid requirement | `gated_non_plan` | low; retained delete is intended | keep unchanged |
| `photo.sales_evidence.upload` | post-sale/pending flow | local pending payload plus BFF upload | runtime double opt-in, auth, relationship, route gates, RLS/RPC, R2 | `gated_non_plan` | high: no Team plan gate and staging result pending | S1 model only; S3/S5 later |
| `photo.sales_evidence.owner_read_delete` | owner album | metadata reader/private image/delete routes | owner scope, route gates, RLS/RPC | `gated_non_plan` | medium: retention/delete must survive downgrade | model retention only; no runtime change |
| `team.staff_collaboration` | team settings, invitations, staff mode | Supabase relationships and shared local-first flows | auth, relationship status, role capabilities, RLS/RPC; no plan | `active_role_gated` | high: planned Team feature is open | S1 model only; S3 audit |
| `team.manager_workflow` | team settings and manager surfaces | role-capability matrix | auth, active relationship, role/RLS/RPC; no plan | `active_role_gated` | high: planned Team feature is open | S1 model only; S3 audit |
| `team.owner_financial_report` | analytics/report surfaces | local owner-scoped models | owner financial role; no plan | `active_role_gated` | low: owner-only remains independent of tier | preserve role-first behavior |
| `promotion.referral.share` | none | none | none | `not_implemented` | low | P0/P1/P2 only after approval |
| `promotion.pro_pass.grant` | none | none | none | `not_implemented` | high if client-created | remain blocked |
| `founder.pro_annual_lock` | none | none | none | `model_only` | critical if implemented without server/provider | remain blocked through F0 only |
| `strategic.collaboration_readiness` | none | none | none | `model_only` | medium consent/privacy risk | Growth Reserve, not a tier |

## S3 Paid-Looking Capability Mapping

This table is the S3 implementation contract. `Plan feature` is the shared product-model key. `Current class` describes repository behavior today. `Canonical downgrade rule` is a future requirement and is not evidence that downgrade enforcement exists.

| Capability ID | Plan feature | Product tier rule | Current UI source | Current runtime source | Server enforcement today | Role requirement | Data requirement | Current class and production status | Canonical downgrade rule |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `analytics.single_market.basic` | `analytics.basic` | Pro/Team included | analytics summary and single-market recap surfaces | local Dexie projections and deterministic analytics | none; no paid route | owner only | eligible market records; completeness remains independent | `active`; role/data gated, subscription enforcement absent | keep source data; block paid analysis presentation |
| `analytics.rejoin.simple` | `analytics.basic` | Pro/Team included | recap/actionable insights | local deterministic analytics | none; no paid route | owner only | eligible market data; insufficient-data state remains independent | `active`; role/data gated, subscription enforcement absent | keep source data; block paid recommendation presentation |
| `analytics.market_comparison` | `analytics.advanced` | Free limited; Pro/Team included | `app/analytics/page.tsx`, `AdvancedAnalyticsSection` | local Dexie projections and deterministic analytics | none; no paid route | owner only | multiple completed markets; minimum-count and reliability gates remain independent | `active`; role/data gated, subscription enforcement absent | keep source data; return to Free limited presentation |
| `analytics.product_ranking.basic` | `analytics.advanced` | Free limited; Pro/Team included | analytics product tab, `TopProductsCard` | local product-level sales projections | none; no paid route | owner only | product-level sale data | `active`; role/data gated, subscription enforcement absent | keep source data; return to Free limited presentation |
| `analytics.product_recommendations` | `analytics.advanced` | Pro/Team included | `ActionableInsightsCard`, product recommendation surfaces | deterministic local analytics | none; no paid route | owner only | product completeness, sufficient market count, and confidence | `active`; available when data qualifies, subscription enforcement absent | keep source data; hide new paid recommendations |
| `analytics.trend.recent3` | `analytics.advanced` | Free preview candidate; Pro/Team included | `DateRangeFilter`, trends tab | local market range selection and analytics | none; no paid route | owner only | at least one eligible market; confidence varies by count | `active`; role/data gated, subscription enforcement absent | keep source data; use approved Free preview rule |
| `analytics.trend.recent10` | `analytics.advanced` | Pro/Team included | `DateRangeFilter`, trends tab | local market range selection and analytics | none; no paid route | owner only | eligible market history | `active`; subscription enforcement absent | keep source data; block paid range selection |
| `analytics.trend.all` | `analytics.advanced` | Pro/Team included | `DateRangeFilter`, trends tab | local market range selection and analytics | none; no paid route | owner only | eligible market history | `active`; subscription enforcement absent | keep source data; block paid range selection |
| `report.settlement.preview` | `report.settlement_preview` | Free limited; Pro/Team included | `/reports/settlement` | local Dexie report view model | role capability checks only; no report server route | owner with `canImportExport` and `canViewOwnerFinance` | eligible market and report range | `active`; owner-role gated, subscription enforcement absent | retain readable source/history; return to limited preview |
| `report.pdf.generate` | `report.pdf` | Pro/Team coming soon | `SettlementReportPdfPreviewButton` | browser-generated temporary PDF preview | none; no server generation | owner with financial/export permissions | valid settlement report view model | `active` preview conflicts with future paid boundary; not production-authoritative | block new generation; retain stored reports if storage is later added |
| `report.excel.generate` | `report.excel` | Pro/Team coming soon | no mounted Excel UI | CSV/report helpers only | none | owner financial/export role in helpers | valid report data | `not_implemented`; no subscription or production route | block new generation; retain stored exports if storage is later added |
| `photo.product_cover.upload` | `photo.product_cover` | Pro/Team included; pre-subscription `open` is explicit | `ProductCoverPhotoField` | Web image adapter plus local pending payload and upload client | auth, active product ownership, owner/manager edit role, upload env gates, quota, and shared server capability before claim and finalize in `required` mode | owner or active manager with product edit permission | active product in the owner workspace and valid image payload | `gated`; S5 aligned locally, `open_access` active, required-mode production evidence incomplete | block upload/replace; retain read and owner-authorized delete |
| `photo.sales_evidence.upload` | `photo.sales_evidence` | Team included | post-sale pending evidence flow | runtime enqueue gate, local pending payload, manual upload client | auth, owner or active staff relationship, route env gates, claim RPC/RLS, payload policy, and R2 adapter; no shared account capability | owner or active staff allowed by the sales workflow | evidence-required market, trusted sale event, pending payload, retention policy | `gated`; non-plan rollout gates, staging result and production enablement incomplete | block new upload/replace; retain owner read/delete |
| `team.staff_collaboration` | `team.staff_collaboration` | Team included | team settings, invitations, staff mode | Supabase staff relationships and shared local-first flows | auth, relationship status, role capability, RLS/RPC; no subscription gate | owner manages; staff requires active relationship | active relationship and fresh role state | `active`; role gated, subscription enforcement absent | suspend workspace access; retain relationship and activity history |
| `team.manager_workflow` | `team.manager_workflow` | Team included | manager role surfaces and permission cards | shared role-capability and event preflight models | auth, active manager relationship, role capability, RLS/RPC; no subscription gate | owner or active manager for each existing allowed action | active relationship, fresh role state, feature-specific data | `active`; role gated, subscription enforcement absent | suspend manager workspace access; retain relationship/history |
| `team.owner_financial_report` | role-only; not a plan unlock | owner only in every tier | analytics and settlement report surfaces | local owner-scoped analytics/report models | owner financial/export role checks; no plan gate | owner only | report data and data-completeness rules | `active`; correctly independent from tier | retain owner read; Team never grants staff financial access |

### S3 Mapping Rules

1. The account capability model maps single-market analysis and simple rejoin rows to `basicAnalytics`, while the remaining detailed analytics rows use `advancedAnalytics`; data-completeness gates remain separate.
2. `staffCollaboration` and `managerWorkflow` are separate Team capabilities. Team entitlement must not broaden manager permissions.
3. Product-cover returns `open_access` in pre-subscription open mode. `paid_active` is reserved for a server-confirmed Pro/Team capability in required mode.
4. Sales-evidence public/runtime environment flags are rollout controls, not Team entitlement.
5. Browser PDF preview is current behavior, while `report.pdf` remains `coming_soon` in the subscription model. S6 must decide the presentation/enforcement transition before launch.
6. No current paid-only server route accepts a plan from local storage, a query string, a public environment variable, or a client header.
7. S3 does not turn any `server_required` launch target into active server enforcement.

## Independent Gate Order Observed Today

Current features use some subset of:

```text
authentication
-> owner workspace or active staff relationship
-> role capability
-> runtime/environment gate
-> local/cloud data readiness
-> feature-specific server checks
```

The S4 read layer now exists locally, but no paid-looking feature consumes it yet. Future protected writes must resolve authoritative account capability and effective entitlement on the server before role/runtime/data checks without removing those checks.

## Client-Controlled Authorization Audit

| Source | Finding |
| --- | --- |
| localStorage/sessionStorage | used for caches, UI state, auth support, and drafts; no plan grant found |
| public environment | sales-evidence rollout flags only; no Pro/Team grant found |
| query string | product/market identifiers only; no plan grant found |
| subscription page state | static preview only; disabled action |
| client clock | analytics ranges and UI retention refresh; no plan grant found |

## Production Evidence Gaps

1. Product-cover migration/environment/R2/deployment smoke is not recorded as complete in this checkout.
2. Sales-photo staging smoke result is still pending.
3. The S4 account-capability API exists locally, but migration, server configuration, deployment, and production smoke evidence are incomplete.
4. No payment provider or webhook reconciliation exists.
5. No tested downgrade transition currently suspends Team access or blocks new paid writes.
6. No trusted offline entitlement lease has been approved for market-day Team workflows.

These gaps block paid launch but do not block S0B through S2 pure model and presentation work.
