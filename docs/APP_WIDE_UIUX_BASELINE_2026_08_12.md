# Féria Application-Wide UI/UX Baseline

Date: 2026-08-12
Plan: `docs/APP_WIDE_UIUX_REMEDIATION_EXECUTION_PLAN_2026_08_12.md`
Baseline build shown in the audited application: `0.1.0 (370ae2a)`

## Scope And Evidence Handling

This baseline records the authenticated owner audit used by UX-R0. It covers Today, market list, add/edit market, active market, ended review, field notes, checklist, products, add/edit product, product detail, Analytics, settlement, Settings, Account and Sync, Team, Sales and Photos, Data and Recovery, App and Version, Subscription, Join, Support, About, Privacy, and Terms.

Authenticated screenshots were inspected during the browser audit but are not committed because they contain account, team, market, and business data. The reproducible evidence in this repository is the route/viewport matrix, structural metrics, UI contracts, and production-build browser acceptance described below.

## Viewport Matrix

| Viewport | UX-R0 status | Purpose |
| --- | --- | --- |
| 360x800 | Browser verified for UX-R2 product dialogs; active-market manual evidence exists | Minimum supported operating layout |
| 375x812 | Browser verified | Narrow team cards and active-market controls |
| 390x844 | Browser verified across primary and secondary routes | Primary mobile reference |
| 430x932 | Contract covered; active-market manual evidence exists | Wide mobile reference |
| 768x1024 | Required in release matrix | Tablet portrait transition |
| 1024x768 | Browser verified for UX-R3 | Desktop-shell breakpoint |
| 1440x900 | Browser verified across core Web routes | Primary desktop reference |
| 1920x1080 | Required in release matrix | Wide reporting reference |

The 768x1024 and 1920x1080 entries remain release-evidence work. UX-R0 did not claim they were manually completed in its original slice.

## Verified Strengths To Preserve

- No horizontal overflow was found on the reviewed authenticated routes at 375px or 390px.
- Primary mobile commands are generally at least 44px high.
- The active-market scan order is summary, interactions, quick payment/product sale, recent records, then collapsed field work.
- Ended markets expose review instead of active operating commands.
- Add/edit market and product forms retain required-first ordering.
- Organizer notes, handoff notes, and checklist remain separate concepts.
- The settlement report is the current reference for a useful wide Web layout.

## Baseline Measurements

| Surface | Mobile evidence | Desktop evidence | Baseline issue |
| --- | --- | --- | --- |
| Active market | No horizontal overflow; 44-48px main controls | Existing two-column workspace | Preserve in UX-R2 through UX-R9 |
| Team | No overflow at 375px with long email | Focused page width | Previous responsive blocker is closed |
| Product detail | UX-R2 mobile acceptance passed | Narrow/mobile composition retained until UX-R4 | Compact stable media and selling summary now lead the page |
| Analytics | Four 44px tabs fit at 390px; recommendation-first order retained | Report-width KPI and decision workspace | UX-R5 confidence-safe composition completed |
| Settlement | One-column mobile report | Effective wide report composition | Low-confidence draft and top-three actions completed in UX-R5 |
| Settings | Clear grouped mobile index | Main content approximately 720px | UX-R3/R4 desktop navigation remains open |
| Recovery | No horizontal overflow | Focused page width | Raw storage/event terminology remains for UX-R6 |
| Subscription | Touch targets are usable | Same narrow presentation | Internal simulation controls require UX-R1 server gating |

## UX-R1 Reproduction Evidence

### Product cover photo

On the same signed-in account and runtime, Add Product showed `加入照片`. Opening Edit Product produced this observed timeline:

1. about 250ms: `商品照片目前無法使用`;
2. after the capability request completed: `加入照片`;
3. the available state then remained stable.

The defect is a loading-state presentation error, not evidence that server capability data, entitlement, or deployment variables differ between add and edit. UX-R1 may therefore fix the client presentation without changing server access policy.

### Subscription developer controls

The normal `/subscription` route rendered `本機訂閱身分模擬` and `驗證資料庫權限` on a local production build. The development APIs already fail closed on deployed production, but the page did not use the existing server-side internal-test-surface gate.

### Sync presentation

Account and Sync initially rendered `尚未完成同步檢查` before later resolving to `資料已同步`. The shared waiting state should communicate an active check, not an incomplete or failed outcome.

### Public invite error

Opening `/join` without a complete invitation displayed the implementation term `Token`. The user-facing error should describe an incomplete invitation link while internal code retains token-based classification.

## Baseline Scores

| Area | Score |
| --- | ---: |
| Today | 8.4 |
| Markets, forms, and review | 8.2 |
| Active-market workflow | 8.5 |
| Products | 6.5 |
| Analytics and settlement | 7.5 |
| Settings and team | 7.6 |
| Recovery and subscription | 6.1 |
| Desktop shell | 5.8 |
| Accessibility and feedback | 7.0 |
| Overall | 7.6 |

## UX-R0 Contract Coverage

- `tests/app-wide-uiux-presentation-contract.test.ts` preserves the viewport matrix, mobile operating contract, and UX-R1 truthful-state boundaries.
- Existing `tests/operating-market-workbench.test.ts` remains the primary active-market ordering and no-fixed-dock guardrail.
- Existing role, sync, product-photo, subscription, public-surface, and mobile build tests remain authoritative for permissions and platform boundaries.

## UX-R2 Acceptance Evidence

The product workflow was verified against a local production build at 390x844:

- price, cost, margin, inventory, sold count, and the primary `編輯與管理` action all ended above 485px;
- the back command measured 44px high and the page had no horizontal overflow;
- product cards measured the same 178px height with a permanent 64x64 thumbnail region, so missing-photo presentation does not create a taller card;
- status and deletion commands were absent from the detail surface and appeared only in the permission-gated management dialog;
- disabling an active product opened an explicit confirmation before any write;
- all measured product and dialog commands were at least 44px high.

At a reduced 360x500 browser viewport, used as a software-keyboard height approximation, both Add Product and Edit Product kept their footer actions inside the visible viewport while the name or description field held focus. Physical iOS and Android keyboard evidence remains part of UX-R9.

`tests/app-wide-uiux-product-workflow.test.ts` preserves the UX-R2 hierarchy, stable media geometry, consolidated management, touch-target, permission, and dialog-layout contracts. Product photo preparation and reads remain behind the existing product/platform services; this slice adds no browser-only business logic or Capacitor dependency.

## UX-R3 Acceptance Evidence

The authenticated shell was verified against a local production build:

- at 390x844, exactly one primary navigation was visible: the existing five-item fixed bottom bar; the desktop sidebar was hidden and main content retained 96px of bottom clearance including safe-area handling;
- at 1024x768, exactly one primary navigation was visible: a 240px sticky left sidebar; the fixed bottom bar was hidden and main bottom padding resolved to 0px;
- at 1440x900, Products, Analytics, and Settings route changes retained the sidebar, selected the correct active destination, and produced no horizontal overflow;
- the standalone About route rendered one `main` landmark with no authenticated sidebar or bottom bar;
- owner navigation exposes Analytics only while authorization is fresh; unresolved and background-refresh states use the staff-safe destination set while `RoleGuard` keeps the existing page mounted and inert.

`tests/app-wide-uiux-responsive-shell.test.ts` preserves the breakpoint, single-navigation, safe-area, shared navigation-model, fail-closed refresh, public-route, and `focused` / `workspace` / `report` width-mode contracts. The responsive shell duplicates no provider, data query, route component, or business logic.

## UX-R4 Implementation Evidence

- Markets retain their mobile stage tabs and cards, while `lg` viewports use a compact row with status, full date range, location, result state, and one action.
- Products retain the UX-R2 mobile card order, while `lg` viewports expose image, price, stock, sold count, and one action without revealing owner-only cost or margin data.
- Settings use the same role-aware destination groups for the mobile sequence and desktop category index; no duplicate route state or providers were introduced.
- Product and market forms only gain desktop width and independent-field columns. Validation, dirty state, cancellation, permissions, and write paths are unchanged.
- `tests/app-wide-uiux-desktop-density.test.ts` preserves these desktop-density and mobile-continuity boundaries.
- Production-build browser verification passed at 390x844, 1024x768, and 1440x900 for Markets, Products, and Settings with no horizontal overflow or console errors.
- At 390px, market/product cards and the five-item bottom navigation remain visible, sold-count columns and the Settings category index remain hidden, and the product form stays single-column.
- At 1024px, the authenticated sidebar is present while collection cards remain below the compact-table breakpoint, preventing narrow workspace overflow.
- At 1440px, market and product comparison headers render as grids, Settings exposes its shared category index, the product form uses independent inventory/description columns, and the market form panel expands to 896px.

## UX-R5 Implementation Evidence

- `lib/analytics/confidence-presentation.ts` maps existing effective-market count, data-completeness output, and pending-sync state into `insufficient`, `emerging`, `usable`, and `strong` presentation states. No metric, score, ranking, subscription, or entitlement calculation changed.
- Insufficient confidence hides formal comparisons, product rankings, advanced grades, and precise summary claims. Useful partial evidence is labeled `初步觀察` and paired with one concrete missing-data action.
- Analytics now uses the shared report-width shell, a compact scope toolbar, KPI row, recommendation-first main column, and confidence/comparison supporting column on desktop. Mobile retains the existing one-column reading order.
- Daily revenue keeps its visual chart and exposes an accessible date/revenue table driven by the same `chartData` array.
- Formula, weighting, Z-score, smoothing, and source-data limitations are placed in an accessible disclosure instead of competing with primary decisions.
- Settlement reports with low confidence are visibly labeled `低可信度初稿`; Web and PDF output hide formal overall grades, scores, score-component rows, and market ratings until the existing report quality model permits them.
- Settlement summary shows the first three next actions and places remaining actions under `查看完整建議`. Owner-only access and paid PDF capability gates are unchanged.
- Focused tests cover confidence mapping, chart/table equivalence, analytics information architecture, settlement preview, and low-confidence PDF output.
- Local production-browser verification passed at 390x844, 1024x768, and 1440x900 with no horizontal overflow. The 390px view retained the five-item bottom navigation and recommendation-first order; 1024px and 1440px used the sidebar, four-column KPI row, and aligned recommendation/confidence columns.
- The rendered Trends tab exposed the same 30-day `chartData` as a semantic table with date row headers and revenue cells. The rendered low-confidence settlement report hid formal scores and exposed only three actions before `查看完整建議`.

## Remaining Work

- UX-R6 recovery information architecture.
- UX-R7 accessibility and overlay completion.
- UX-R8 Free monetization placement readiness.
- UX-R9 loading, performance, cross-role, and physical-device evidence.

Owner browser evidence is available. Manager/staff authenticated matrices, physical iOS/Android camera/gallery, safe-area, background/resume, and software-keyboard evidence remain open until the required accounts and device environments are available.
