# Féria Web UI/UX Score Improvement Execution Plan

Date: 2026-07-23  
Status: execution-ready plan; no production implementation is approved by this document alone.  
Runtime reviewed: `https://markit-app-mocha.vercel.app/`, version `0.1.0 (61461a6)`.  
Primary objective: raise the signed-in owner experience from 7.2/10 to at least 8.8/10 while preserving mobile usability, role safety, offline behavior, and future Capacitor compatibility.

## 1. Target Scorecard

| Area | Current | Target | Release gate |
| --- | ---: | ---: | --- |
| Visual consistency | 8.3 | 9.0 | Shared tokens and components; no route-specific visual drift |
| Global navigation | 8.2 | 9.0 | Mobile bottom navigation and desktop side navigation both pass route tests |
| Market workflow | 7.8 | 9.0 | Owner can move from list to live work, review, and management without losing context |
| Add/edit forms | 8.1 | 9.0 | Required-first flow remains; desktop gains efficient layout without changing mobile order |
| Analytics and settlement | 7.3 | 8.8 | Comparisons are scannable, explainable, and useful on desktop |
| Loading and feedback | 6.8 | 8.7 | No unexplained blank panels; previous usable content stays mounted during refresh |
| Accessibility | 5.9 | 8.5 | WCAG 2.2 AA contrast, keyboard, focus, labels, and zoom requirements pass |
| Desktop Web experience | 4.8 | 8.8 | 1440px layout uses the available width for review and comparison |
| State and product trust | 5.5 | 9.2 | Sync, plan, role, and data-quality messages never contradict one another |

The overall score cannot be considered above 8.5 while either desktop Web or state trust remains below 8.0.

## 2. Non-Negotiable Product Boundaries

1. Mobile remains a first-class runtime. Desktop work must be responsive composition over the same data and commands, not a separate application.
2. Do not change Capacitor, native plugins, camera adapters, upload behavior, Supabase schema, RLS, role capabilities, sync routing, or destructive data behavior as part of visual work.
3. Preserve the role-refresh continuity model: protected pages remain mounted during background role verification, interactions fail closed, and account changes still block protected content.
4. Cloud data remains the trusted recovery source. IndexedDB is cache/offline temporary state, not the main recovery product.
5. Do not expose local backup/import machinery as the primary user recovery flow.
6. Do not make staff, manager, or owner-only data visible merely to fill a desktop layout.
7. Do not create separate desktop data queries when an existing shared view model can serve both layouts.
8. Do not claim a subscription entitlement, successful sync, or reliable insight unless the corresponding source-of-truth state proves it.
9. Every slice must pass mobile and desktop checks before the next slice begins.

## 3. Baseline Evidence And Known Problems

The implementation AI must reproduce these findings against the current local build before editing:

- At `1440x900`, primary pages still render as a narrow single column with a mobile bottom navigation and large unused side margins.
- The home sync indicator can say “資料已同步” while Account and Sync says “等待同步 / 尚未同步”.
- The account is labelled Free while cloud sync, team collaboration, and advanced analytics are available, but the pricing page says Free includes none of them.
- User-facing recovery screens expose English panels and internal terms such as IndexedDB, `market_id`, `eventId`, and `deal_closed`.
- Date, time, and negative currency formats vary between pages.
- The Theme Lab reports default combinations below AA contrast, including white text on the primary color.
- Interaction setup initially displays a translucent overlay over repeated underlying content.
- Product analytics and team data can briefly appear blank or incomplete before delayed content arrives.
- Advanced analytics exposes Z scores and weighting before explaining what decision the user should make.

Record baseline screenshots at `390x844`, `768x1024`, `1440x900`, and `1920x1080` for:

- `/`
- `/markets` in all three list stages
- one ongoing, one preparing, and one ended market detail
- `/products` and one product detail
- `/analytics` in all four tabs
- `/reports/settlement`
- `/settings` and each settings subpage
- `/recovery`
- `/subscription`

Use seeded or existing read-only data. Do not create, delete, invite, upload, subscribe, or run a repair during baseline capture.

## 4. Target Responsive Architecture

### 4.1 Breakpoints

| Width | Navigation | Content strategy |
| --- | --- | --- |
| `< 768px` | Existing bottom navigation | One-column mobile workflow; safe-area aware |
| `768-1023px` | Bottom navigation or compact rail after visual verification | Wider cards and selective two-column groups |
| `>= 1024px` | Persistent left side navigation | Desktop workspace with page header, primary content, and optional context rail |

### 4.2 Shared App Shell

Create one responsive authenticated shell owned by `components/AppChrome.tsx`:

- mobile: keep the existing bottom navigation behavior;
- desktop: hide bottom navigation and render a restrained left navigation rail;
- use the same `getAppNavigationItems()` and `isAppNavigationItemActive()` source for both surfaces;
- preserve staff-specific navigation and unresolved-role behavior;
- reserve stable navigation dimensions so refresh, labels, and badges do not shift layout;
- preserve `GlobalOverlayHost`, auth dialogs, PWA behavior, safe-area spacing, and role guards.

Introduce a shared page shell with explicit layout modes instead of route-specific arbitrary maximum widths:

- `focused`: forms and narrow account tasks, approximately 720-840px;
- `collection`: market/product lists, approximately 1120-1280px;
- `dashboard`: analytics/reporting, up to 1440px;
- `workspace`: detail pages with main content and optional context rail, up to 1440px.

Do not put the entire desktop page inside a decorative card. Do not duplicate mobile and desktop route components.

## 5. Execution Slices

Each slice is a separate reviewable change. The AI must stop after a slice if its acceptance gates do not pass.

### Slice 0: Baseline And Guardrail Tests

Goal: freeze current behavior and establish measurable UI contracts before redesign.

Tasks:

- Capture the route and viewport matrix listed above.
- Add static guardrails for shared navigation ownership and permitted page-shell widths.
- Add authenticated browser smoke coverage for owner and staff navigation.
- Record console errors, horizontal overflow, clipped text, focus failures, and major layout shifts.
- Document which findings reproduce locally and which exist only on the deployed version.

Suggested artifacts:

- `tests/web-responsive-shell.test.ts`
- `tests/web-uiux-presentation-contract.test.ts`
- `docs/WEB_UIUX_BASELINE_2026_07_23.md`

Acceptance:

- Baseline evidence exists at all four viewports.
- Tests fail for the intended missing desktop shell, not for unrelated business behavior.
- No production behavior changes.

### Slice 1: State Trust And Presentation Consistency

Goal: fix contradictions before visual expansion.

Tasks:

1. Create a pure sync presentation model derived from `useSyncContext()` state, `lastSyncAt`, pending count, online state, and errors.
2. Make `SyncStatusIndicator`, Account and Sync, analytics warnings, and any top navigation status use that model.
3. Never show “資料已同步” when the first sync has not completed, a refresh is in progress, pending writes exist, or an error is unresolved.
4. Identify the real subscription entitlement source. Create one capability/plan presentation model shared by Account, Pricing, feature gates, and upgrade prompts.
5. If billing or enforcement is not production-ready, label unavailable plans as preview/coming soon instead of presenting false current entitlements.
6. Centralize user-facing formatters for:
   - date ranges;
   - `HH:mm` time without seconds;
   - negative currency as `-$12,999`;
   - percentages and ratios;
   - relative sync timestamps.
7. Replace route-local display formatters incrementally, without altering stored values or calculation models.

Primary files:

- `components/common/SyncStatusIndicator.tsx`
- `components/settings/AccountSyncPanel.tsx`
- `components/subscription/PricingCard.tsx`
- `app/subscription/page.tsx`
- `lib/sync-context.tsx`
- `lib/utils.ts`
- market, analytics, and settlement presentation components

Required tests:

- `tests/sync-presentation-state.test.ts`
- `tests/subscription-capability-presentation.test.ts`
- `tests/presentation-formatters.test.ts`

Acceptance:

- The same runtime state produces the same label everywhere.
- No page contradicts pricing entitlements.
- Dates, times, and currency match the shared format contract.
- Stored data, sync cursors, role capabilities, and report calculations are unchanged.

### Slice 2: Accessibility And Overlay Quality

Goal: raise accessibility above 8.0 before adding more desktop density.

Tasks:

- Adjust default theme tokens so normal text reaches 4.5:1 and large text reaches 3:1.
- Prevent a saved theme from silently producing unreadable primary actions; warn and block saving only the failing text/background combinations, while preserving preview freedom.
- Verify hero/header white text over every built-in theme.
- Convert accordion headers and clickable generic containers into semantic buttons with `aria-expanded` and `aria-controls`.
- Fix Interaction Setup so one opaque, focused dialog is visible at a time; remove duplicated visual calls to action.
- Ensure every dialog has a labelled close button, focus trap, Escape behavior, restored trigger focus, and background inertness.
- Preserve browser zoom and verify 200% zoom without clipped controls.
- Keep all touch targets at least 44x44px.
- Replace emoji used as functional status symbols with the existing Lucide icon system; decorative emoji must be hidden from the accessibility tree.

Primary files:

- `app/globals.css`
- `components/dev/ThemeLab.tsx`
- `components/settings/InteractionSetupWizard.tsx`
- `components/settings/InteractionSettingsPanel.tsx`
- shared form accordions and dialogs

Acceptance:

- Default and built-in themes pass contrast checks for core text and commands.
- Keyboard-only users can open, operate, and close every reviewed dialog.
- No underlying page text competes visually with an active dialog.
- No horizontal overflow at 320px or 200% zoom.

### Slice 3: Responsive Authenticated App Shell

Goal: establish true desktop Web navigation without changing route behavior.

Tasks:

- Extract shared navigation rendering from `BottomNavigation.tsx`.
- Add desktop side navigation at `>=1024px` and hide bottom navigation at that breakpoint.
- Add shared responsive page-shell primitives and width modes.
- Remove global `pb-24` on desktop while retaining mobile bottom-safe spacing.
- Keep navigation mounted during role refresh and preserve fail-closed interaction blocking.
- Keep public, join, demo, and mobile runtime routes outside the authenticated desktop shell as appropriate.

Primary files:

- `components/AppChrome.tsx`
- `components/BottomNavigation.tsx`
- `lib/navigation/app-navigation.ts`
- new shared shell/navigation components under `components/layout/`

Acceptance:

- Mobile navigation is visually unchanged except approved accessibility fixes.
- Desktop has one persistent navigation surface and no bottom bar.
- Active routes, staff route visibility, and role-refresh behavior pass existing tests.
- No duplicated fetch, context provider, or route state is introduced.

### Slice 4: Desktop Collections, Details, And Forms

Goal: make markets, products, settings, and detail screens efficient on desktop.

Markets:

- Mobile keeps cards and the three stage tabs.
- Desktop uses a denser collection view with status, date range, location, key result, and one clear action.
- Provide search/filter/sort only when they operate on existing data; do not add decorative controls.
- Market detail uses a desktop workspace layout: main operational content plus a restrained summary/context rail.
- Preserve the existing `現場 / 總覽 / 管理` information architecture and all write behavior.

Products:

- Mobile keeps the current cards.
- Desktop uses a responsive grid or compact table with search and categories in one toolbar.
- Reduce the oversized empty product illustration area when no product image exists.
- Product detail may place price and inventory sections side-by-side on desktop.

Settings:

- Desktop settings index uses a structured two-column layout or category navigation plus content.
- Settings subpages retain focused widths where long form input would become harder to read.

Forms:

- Required-first order remains identical on mobile.
- Desktop may use two-column field groups where dependencies and reading order remain obvious.
- Sticky actions must not cover fields, browser chrome, or the bottom navigation.
- Draft, validation, cancellation, and dirty-navigation behavior must remain unchanged.

Primary files:

- `app/markets/page.tsx`
- `components/markets/MarketCard.tsx`
- `components/markets/MarketDetailScreen.tsx`
- `components/markets/StaffMarketDetailView.tsx`
- `app/products/page.tsx`
- `components/products/ProductCard.tsx`
- `components/products/ProductDetailScreen.tsx`
- settings page and form-shell components

Acceptance:

- A 1440px viewport presents meaningfully more comparable information than 390px.
- Mobile workflows and command order remain stable.
- Owner-only values remain absent for staff.
- No nested-card visual stacks or text overlap are introduced.

### Slice 5: Analytics And Settlement As A Web Workspace

Goal: make data review the strongest Web experience.

Tasks:

1. Keep recommendation-first analytics as the default.
2. Build a desktop dashboard composition using existing analytics services before changing calculations:
   - compact scope toolbar;
   - KPI summary row;
   - action recommendations in the main column;
   - key comparisons or data-quality context in a secondary column.
3. Turn market trend into an actual visual comparison of market sessions, with an accessible table fallback.
4. Product analysis should show ranked products and affinity evidence with sample size and confidence, not unexplained percentages alone.
5. Advanced analytics must lead with plain-language interpretation; Z scores and weights move into expandable methodology details.
6. Keep data-completeness gates. Never fill missing analysis with zero-value claims.
7. Replace blank lazy-tab intervals with stable skeletons or retained previous tab content plus an explicit loading state.
8. Settlement report should show the three most important next actions first and place the remainder behind “查看全部建議”.
9. Low-confidence reports remain viewable as drafts, but any official/share/download action must clearly carry the low-confidence status.
10. Preserve owner-only reporting and existing calculation models unless a separate calculation-correction slice is approved.

Primary files:

- `app/analytics/page.tsx`
- `components/analytics/*`
- `app/reports/settlement/page.tsx`
- `lib/analytics/*`
- `lib/reporting/*`

Acceptance:

- At 1440px, summary, recommendation, and comparison content are visible without a long single-column scroll.
- At 390px, content remains one column and readable.
- All insight claims expose data quality or confidence where relevant.
- Existing analytics and settlement model tests remain unchanged and passing.

### Slice 6: Recovery Information Architecture

Goal: make recovery understandable and safe without exposing engineering internals.

Tasks:

- Reframe the user page around: current data health, pending local work, cloud availability, preview, and safe next action.
- Use user language such as “這台裝置的暫存資料” and “重新從雲端下載”, not IndexedDB/table/event field names.
- Move `ImportSafetyStatusPanel`, pending-operation row details, canonicalization internals, and raw event diagnostics behind an owner-only advanced diagnostics gate.
- Translate any advanced diagnostics that remain reachable in production.
- Keep local backup secondary/internal.
- Reuse the existing local pending-write report; do not create another detector.
- Do not enable clear-local, replace-cache, automatic rebuild, import, repair, or destructive execution merely to complete this UI slice.
- Any future cloud rebuild execution requires a separate approval after read-only preview, pending checks, scope, abort behavior, and recovery tests are complete.

Primary files:

- `app/settings/data/page.tsx`
- `app/recovery/page.tsx`
- `components/common/ImportSafetyStatusPanel.tsx`
- `components/common/OwnerPendingOperationDiagnosticsPanel.tsx`
- `components/settings/DataCanonicalizationPanel.tsx`
- existing cloud rebuild preview and pending-write report modules

Acceptance:

- A non-technical owner can identify the safest next action without understanding storage internals.
- No English or raw field names appear in the default recovery path.
- Advanced tools remain owner-only and fail closed.
- No destructive behavior is newly enabled.

### Slice 7: Loading, Performance, And Release Verification

Goal: remove remaining friction and prove the redesign is deployable.

Tasks:

- Keep current page content mounted during background refresh where authorization permits.
- Use route skeletons only for first load; do not replace usable content with a full-page skeleton on filter or tab changes.
- Reserve stable heights for async tab content to prevent layout jumps.
- Lazy-load heavy Theme Lab, report PDF, advanced analytics, and diagnostics bundles.
- Audit client component boundaries and avoid broad context rerenders.
- Ensure version/build hash is visible and matches the deployed artifact used for acceptance.
- Run the full viewport and role matrix against the production build, not only the dev server.

Performance targets on a representative mid-range mobile profile:

- LCP under 2.5s;
- CLS under 0.1;
- INP under 200ms for common navigation and tab changes;
- no unexplained blank content lasting over 300ms;
- no console errors during the audited owner and staff flows.

## 6. Pull Request Sequence

Use this order. Do not combine all work into one redesign PR.

1. `web-ux-01-baseline-guardrails`
2. `web-ux-02-state-and-format-trust`
3. `web-ux-03-accessibility-overlays`
4. `web-ux-04-responsive-app-shell`
5. `web-ux-05-market-product-settings-desktop`
6. `web-ux-06-analytics-web-workspace`
7. `web-ux-07-settlement-presentation`
8. `web-ux-08-recovery-information-architecture`
9. `web-ux-09-loading-performance`
10. `web-ux-10-cross-role-release-audit`

Each PR must contain:

- one explicit behavior objective;
- before/after screenshots at affected viewports;
- owner and staff permission impact statement;
- files changed and intentionally unchanged;
- focused automated tests;
- lint, build, and mobile TypeScript evidence;
- remaining known risks.

## 7. Validation Commands

Use Windows-compatible commands in this repository:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit --project tsconfig.mobile.json
git diff --check
```

If repository-wide `tsc --noEmit` still fails in known unrelated tests, record the exact existing failures and do not hide new failures behind them.

Browser validation must include:

- `390x844`, `768x1024`, `1440x900`, and `1920x1080`;
- owner and staff roles;
- keyboard-only navigation;
- 200% zoom;
- light/default and every built-in theme;
- online, offline, pending sync, first-sync, refresh, and sync-error presentation states;
- role background refresh without page unmount;
- no horizontal overflow, text clipping, incoherent overlap, or blank primary panel.

## 8. Final Acceptance Journey

The release candidate passes only when all of these can be demonstrated without modifying production data:

1. Owner opens Today, understands current market and sync state immediately.
2. Owner finds preparing, ongoing, and ended markets on both mobile and desktop.
3. Owner reviews an ended market, compares daily results, photos, interactions, and costs.
4. Owner reviews products and understands price, cost, stock, and sales without excessive scrolling.
5. Owner uses Analytics to answer:
   - Which markets should I attend again?
   - Are recent markets improving?
   - Which products drive revenue and profit?
   - How reliable is this conclusion?
6. Owner opens a settlement report and sees the most important action before methodology details.
7. Owner opens Account and Sync and sees the same state as every global sync indicator.
8. Owner opens Pricing and sees entitlements matching actual feature access.
9. Owner opens Data and Recovery and understands the safe action without storage terminology.
10. Staff signs in and cannot see owner costs, profit, recovery tools, reporting, or unauthorized navigation.
11. Switching away and back keeps the page mounted, performs background role verification, and blocks privileged interaction until permissions are fresh.

## 9. Stop Conditions

Stop and request explicit approval before:

- modifying Supabase migrations, RLS, role capabilities, or staff views;
- changing sync cursors, upload queues, conflict handling, or cache ownership;
- enabling any destructive recovery execution;
- changing subscription billing or charging a payment method;
- adding manager/staff export or owner-sensitive access;
- changing analytics calculation semantics instead of presentation;
- replacing mobile workflows with desktop-only abstractions;
- starting Capacitor or native implementation work.

## 10. AI Handoff Instruction

Give the implementation AI this instruction together with this file:

> Execute `docs/WEB_UIUX_SCORE_IMPROVEMENT_EXECUTION_PLAN_2026_07_23.md` one slice at a time. Start by reproducing and documenting Slice 0; do not begin a later slice until the current slice acceptance gates pass. Preserve mobile behavior, role fail-closed safety, sync semantics, and cloud-rebuild-first recovery boundaries. Do not perform destructive actions or expand permissions. Before editing, list the exact files and tests for the current slice. After editing, provide mobile and desktop screenshots, focused test results, build/lint/mobile-TypeScript results, and remaining risks. Stop for approval at every listed stop condition.

## 11. Recommended First Implementation

Begin with Slice 0 and Slice 1 only.

Reason:

- contradictory sync and plan states damage trust more than layout limitations;
- shared formatters and presentation models reduce later desktop duplication;
- baseline screenshots prevent responsive work from regressing mobile;
- desktop shell work becomes safer after status, formatting, and test contracts are stable.

Do not start with a broad CSS redesign. The first visible release should make status and data presentation truthful and consistent; the second should establish the responsive shell.
