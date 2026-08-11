# Mobile UI/UX Full-Flow Audit

Date: 2026-08-10

Target: `https://markit-app-mocha.vercel.app/`

Test account role: Owner

Viewports:

- 390 x 844
- 375 x 667

This was a read-only production UX audit. No market, product, note, checklist item, sale, photo, team member, or setting was created, edited, deleted, or submitted.

## 1. Coverage

Verified through the in-app browser:

- login presentation and authenticated landing;
- Today and upcoming-market entry points;
- market list: ongoing, preparing, ended, and cancelled entry point;
- add-market form and multi-date picker;
- edit-market form;
- upcoming and ended market detail;
- market tabs: field, overview, and management;
- organizer/venue notes;
- field handoff notes;
- checklist / field tasks;
- registration and operating status presentation;
- sale-photo policy and expired-photo history;
- daily performance, customer interaction, cost, and photo review;
- simplified and full revenue backfill forms;
- product list, add, detail, and edit flows;
- product search, category, stock, and cover-photo states;
- analytics ranges and summary/trend/product/advanced tabs;
- subscription preview;
- Settings, account/sync, team/permissions, sales/photo preferences;
- interaction-record setup wizard;
- Theme Lab;
- data/recovery and app/version pages;
- simulated page freeze/resume and scroll preservation;
- visible touch-target sizing and console warning/error review.

Not fully verified because the production account did not expose the required state:

- an actively operating market;
- committing a real sale or revenue backfill;
- camera, gallery, upload, compression, and permission prompts;
- creating, toggling, editing, and deleting a real checklist item;
- creating and deleting a field handoff note;
- staff and manager sessions;
- destructive recovery and deletion confirmations;
- true iOS/Android keyboard, safe-area, haptic, and background lifecycle behavior;
- offline write, reconnect, and conflict recovery.

## 2. Score

| Dimension | Score | Assessment |
|---|---:|---|
| Visual consistency | 8.4/10 | Strong shared styling, restrained colors, and recognizable page hierarchy |
| Primary navigation | 8.1/10 | Five-item bottom navigation is clear and predictable |
| Information architecture | 7.0/10 | Most sections are understandable, but field work and management are mixed |
| Mobile form ergonomics | 7.1/10 | Progressive market form is good; some first folds prioritize secondary or locked content |
| Workflow continuity | 6.3/10 | Detail transitions take about two seconds and replace context with broad skeleton states |
| Review and analytics | 7.3/10 | Useful summaries, but long-market review becomes difficult to scan |
| Recovery clarity | 5.2/10 | Internal technical language is exposed directly to end users |
| Accessibility baseline | 7.2/10 | Touch sizes are generally adequate; several status icon buttons lack clear accessible names |
| Overall mobile UX | **7.1/10** | Solid structure, with several high-impact workflow and responsive issues remaining |

## 3. What Already Works

### Global navigation

- Bottom navigation labels and icons are easy to recognize.
- Active states are visually distinct without relying only on color.
- Main page titles and page purposes are consistently placed.
- Return links generally communicate the destination rather than only showing an arrow.

### Today

- The no-market state clearly communicates the next event.
- `查看市集安排` is an appropriate next action.
- Upcoming markets are compact enough for quick scanning.

### Market list

- Preparing cards correctly show each market's actual status.
- Date ranges include both start and end dates.
- The three lifecycle categories and their counts are understandable.
- Cancelled markets are visually separated from the main lifecycle.

### Add and edit market

- Required fields are grouped before optional detail.
- Cost, equipment, timeline, and fixed notes use progressive disclosure.
- The multi-date picker works in the short mobile viewport.
- Sticky form actions remain reachable.
- `主辦／場地備註` and `現場交接筆記` have clearly different explanations.

### Market overview

- Revenue, profit, and deal summaries are prominent.
- Customer-interaction totals are easy to understand.
- The interaction-detail dialog groups records by date.
- Expired-photo presentation clearly says the image is unavailable and the cloud file was cleaned.
- Cost and equipment status is readable without opening another page.

### Settings

- The `更多` hierarchy is clear.
- Account, team, sales, recovery, and version settings have predictable destinations.
- Theme Lab includes contrast validation and prevents saving invalid color combinations.
- Dangerous clearing operations are placed below repair tools and include explanatory copy.

## 4. Priority Findings

### P0 - Team member card breaks on a 375 px screen

Observed:

- plan, role, access status, joined date, relationship message, and action icons compete in one compressed row;
- labels wrap one character per line;
- text and action controls become difficult to associate;
- content approaches the fixed bottom navigation before it becomes readable.

Required change:

- use a vertical mobile layout;
- keep identity on the first row;
- place plan/access badges on a dedicated second row;
- show role, joined date, and explanation as separate metadata rows;
- place actions in a full-width action row or overflow menu;
- prohibit badge columns narrower than their longest label.

Acceptance:

- no label wraps one character per line at 360-390 px;
- no content overlaps or becomes hidden behind bottom navigation;
- every action has a visible label or tooltip and an accessible name.

### P1 - Detail navigation visibly replaces context for about two seconds

Measured on the production deployment:

- market list to ended-market detail: about 1.7 seconds until the target heading became visible;
- product list to product detail: about 2.0 seconds until the target heading became visible.

During the transition, the originating DOM remains briefly and then the page shows a broad skeleton. The result feels like a partial reload instead of an in-app transition.

Required change:

- navigate immediately and preserve the destination shell;
- keep the previous content or a shared header while detail data refreshes;
- use section-level stale-while-revalidate states instead of replacing the protected subtree;
- do not block already-authorized content on a full role refresh;
- reserve dimensions so loading does not shift the page.

Acceptance:

- target page shell appears within 150 ms after tap;
- cached detail remains visible during revalidation;
- role denial still fails closed;
- route transition never displays the unrelated list DOM as the active destination;
- form drafts remain mounted during background role refresh.

### P1 - Field notes and checklist are placed inside Management

Observed:

- `現場交接筆記` and `現場待辦` are below registration status, photo policy, operating-mode explanation, and fixed notes;
- a user operating a booth must enter `管理` and scroll to find daily tools;
- the `現場` tab shows only summary and an unavailable message outside operating hours.

Required change:

- keep organizer/venue notes in `管理` as fixed market information;
- move handoff notes and checklist to `現場`;
- make checklist available before operating hours for setup work;
- show a compact read-only organizer-note reference in `現場`;
- show pending task count in the `現場` tab label or summary.

Recommended owner structure:

1. `現場`: quick sale, interaction, photos, handoff notes, checklist.
2. `回顧`: daily results, interaction analysis, photos, costs.
3. `設定`: registration status, evidence policy, fixed notes, time, costs, destructive actions.

### P1 - Recovery UI exposes engineering internals

Observed user-facing terms include:

- IndexedDB;
- `market_id`, `eventId`, `dealDate`, and `totalAmount`;
- Supabase;
- `deal_closed events`;
- `Import Safety Status`;
- `Pending operation diagnostics`;
- English status and button labels.

This makes a safety-sensitive page difficult to understand and may encourage the wrong repair operation.

Required change:

- default to a user-facing health result and one recommended recovery action;
- move diagnostic identifiers and internal tools behind an owner-only `進階診斷` disclosure;
- localize all visible text;
- replace data-layer names with symptoms users can recognize;
- provide `建議操作`, `不會影響`, and `可能影響` before every repair.

Suggested top-level states:

- `資料正常，不需要處理`;
- `部分統計需要重新整理`;
- `這台裝置的資料與雲端不一致`;
- `尚有資料等待同步，暫時不能清除`.

### P1 - Locked product photo consumes the first form viewport

Observed:

- add/edit product begins with a large empty photo frame;
- for a user without photo entitlement, the first mobile viewport is mostly an unavailable feature;
- required name, category, and price fields start below the fold;
- list cards without photos also reserve a large image area, reducing scan density.

Required change:

- place required product fields first;
- represent the locked photo feature as one compact row after basic fields;
- show the large crop/upload area only when upload is available or an existing photo exists;
- use a compact no-photo product card variant;
- keep actual photographed products image-led.

Acceptance:

- product name and price are visible in the first 667 px viewport;
- a no-photo card does not allocate the same media height as a photographed card;
- the upgrade action is separate from the create-product primary action.

### P1 - Long market reviews require excessive vertical search

Observed:

- the 30-day market renders 30 daily rows;
- only two days contain revenue, but all zero days have equal prominence;
- every eligible day exposes a plus icon for backfill;
- finding meaningful days requires extended scrolling.

Required change:

- add `有紀錄`, `全部日期`, and `待補資料` filters;
- default ended long markets to `有紀錄` when most days are empty;
- add date jump or month/week grouping;
- collapse consecutive empty dates into an expandable summary;
- keep backfill available from a date picker rather than repeating 30 equal actions.

### P1 - Registration progress uses unnamed icon buttons

The accessible DOM exposes several buttons without names while the visible labels are separate siblings. Screen-reader and voice-control users cannot reliably identify which registration milestone will be changed.

Required change:

- make each visual step one named control;
- use names such as `標記為已錄取` or `目前狀態：已繳費`;
- expose current, completed, and unavailable states programmatically;
- keep destructive `延期` and `取消` actions separate from normal progress.

## 5. Secondary Findings

### P2 - Market card action wording is ambiguous

Every preparing-market card uses `完成設定`. It is unclear whether this opens detail, edits the market, or marks setup complete.

Recommendation:

- card tap opens detail;
- use `查看準備` when there are incomplete setup tasks;
- use `查看市集` when no completion model exists;
- reserve `完成設定` for an action that actually changes a completion state.

### P2 - Revenue backfill primary action appears only after input

The simplified form initially contains no cancel or submit action in its accessible DOM other than the close icon. The submit footer is conditionally mounted only after revenue is entered.

Recommendation:

- always render `取消` and disabled `確認補登` actions;
- explain the disabled requirement inline;
- preserve the action position between simplified and full modes;
- do not make the footer appear and resize the dialog after typing.

### P2 - Interaction setup repeats the same start action

The settings card uses `開始設定`, then opens an introduction dialog with another `開始設定` button.

Recommendation:

- enter the product-type question directly;
- keep the explanation as supporting copy on the first question;
- retain Back and Close behavior without an extra confirmation step.

### P2 - Product list is visually sparse without photos

No-photo placeholders dominate the list. Two products require substantial scrolling even though each has only category, stock, name, and price.

Recommendation:

- compact fallback card with a 72-96 px thumbnail;
- full-width image card only for products that have cover photos;
- keep category, status, name, price, and edit action in a stable grid.

### P2 - Expired-photo history can become repetitive

Each expired item repeats an empty-photo panel and cleanup explanation. Seven expired records already create a long low-value list.

Recommendation:

- group by date;
- use compact rows for expired items;
- expand only when the user needs upload/expiry timestamps;
- keep amount and payment method visible when available.

### P2 - Subscription lock messaging is repeated but not actionable yet

Analytics, team, and product-photo surfaces repeatedly show a plan requirement while checkout remains unavailable.

Recommendation before subscriptions launch:

- use one consistent preview component;
- offer `通知我` or `查看方案` only when that follow-up is real;
- avoid repeatedly interrupting a page that cannot currently be unlocked.

### P2 - Theme Lab needs a simpler mobile mode

The contrast checks are strong, but the mobile dialog contains many individual color controls, presets, saved themes, import/export tools, and a desktop keyboard shortcut.

Recommendation:

- default to `靈感配色` and three high-level controls;
- place the full token editor under `進階調整`;
- hide desktop keyboard-shortcut copy on mobile;
- keep contrast failures adjacent to the affected token.

### P3 - Date display should use one formatting rule

Examples include `2026/7/02~31`, `2026/9/19~20`, and `2026/10/03~04`. The range requirement is met, but zero padding is inconsistent.

Recommendation:

- choose either `2026/07/02-07/31` or the compact `2026/7/2-31`;
- include the second month when the range crosses months;
- use the same formatter in list, detail, picker summary, report, and photo timestamps.

## 6. Background And Resume Result

A simulated page freeze and resume on an ended-market detail preserved:

- the route;
- the selected overview tab;
- the data content;
- the scroll position at approximately 483 px.

No full skeleton or console error appeared in that simulation. This is positive, but it is not equivalent to a real iOS/Android app switch. A real-device test remains required because mobile OS backgrounding can pause, freeze, or terminate the WebView differently.

The larger observed continuity problem is currently route/detail loading, not the simulated freeze/resume path.

## 7. Recommended Implementation Slices

### Slice UX-M1 - Responsive blockers

- rebuild team member card mobile layout;
- fix unnamed registration controls;
- add viewport regression tests at 360, 375, 390, and 430 px;
- verify bottom-navigation clearance and long Traditional Chinese labels.

### Slice UX-M2 - Transition continuity

- trace the 1.7-2.0 second detail readiness delay;
- preserve authorized content during role revalidation;
- replace page-wide skeletons with destination-shell and section-level loading;
- add route-transition timing instrumentation and tests.

### Slice UX-M3 - Field-work information architecture

- move handoff notes and checklist into `現場`;
- retain fixed organizer/venue notes under `設定`/`管理`;
- expose checklist before operating hours;
- add pending-task count and fixed-note shortcut.

### Slice UX-M4 - Product density and forms

- move required fields above the cover-photo section;
- implement compact locked-photo presentation;
- implement compact no-photo cards;
- validate software-keyboard and sticky-footer behavior.

### Slice UX-M5 - Review scanability

- add recorded/empty/pending filters to daily performance;
- collapse empty date ranges;
- compact expired-photo history;
- keep backfill actions discoverable without repeating 30 equal buttons.

### Slice UX-M6 - Recovery language and safety

- design user-facing health states;
- move technical diagnostics into an advanced disclosure;
- localize English panels;
- retain fail-closed pending-write and cloud-rebuild safeguards.

### Slice UX-M7 - Secondary friction

- rename market-card actions;
- keep revenue-backfill actions mounted but disabled;
- remove the duplicated interaction-setup introduction;
- simplify Theme Lab's default mobile mode;
- normalize date formatting.

## 8. Release Acceptance

Before calling the mobile UX ready:

- no responsive overlap at 360-430 px;
- no primary route/detail transition blanks the full working context;
- active-market actions are reachable within one tap from the market detail;
- checklist and handoff notes are usable before and during operating hours;
- required add-product and add-market fields remain reachable above a mobile keyboard;
- user-facing recovery screens contain no unexplained storage or database terms;
- owner, manager, and staff smoke tests pass independently;
- camera/gallery, offline/reconnect, background/resume, and safe-area tests pass on real iOS and Android devices;
- no workflow requires destructive production data to verify during routine smoke testing.

## 9. Implementation Progress - 2026-08-10

The progress below is an engineering estimate against Slices UX-M1 through UX-M7, not product analytics.

| Slice | Progress | Current state |
| --- | ---: | --- |
| UX-M1 Responsive blockers | 85% | Team cards, registration labels, touch targets, and key mobile layouts improved; the active-market flow passed a manual 360-430 px browser matrix, while automated visual coverage remains. |
| UX-M2 Transition continuity | 85% | Detail prefetch, immediate destination-shell feedback, actor-bound display snapshots, transition timing measurement, and role-refresh continuity are in place. Actual data readiness and broader route coverage remain. |
| UX-M3 Field-work information architecture | 95% | Field notes and checklist live under `現場`; fixed notes remain under `管理`; completed markets show a read-only archive; operating markets expose a direct shortcut with the pending-task count. Real-device keyboard validation remains. |
| UX-M4 Product density and forms | 85% | Required fields precede cover photos, compact product cards and cover-photo states are implemented; software-keyboard checks remain. |
| UX-M5 Review scanability | 95% | `回顧` naming, daily filters, zero-record review state, photo empty state, backfill entry, and grouped expired-photo history are complete. |
| UX-M6 Recovery language and safety | 95% | Recovery states and import-safety status use user-facing Traditional Chinese; technical diagnostics remain inside an advanced disclosure and all fail-closed safeguards remain intact. |
| UX-M7 Secondary friction | 95% | Market actions, disabled revenue submission, setup-wizard duplication, review terminology, live-market interaction recovery, mobile Theme Lab disclosure, and shared date presentation are complete. |

Estimated overall completion: **approximately 91%**. The remaining work is release validation that requires dedicated visual-regression infrastructure, separate role accounts, or physical iOS/Android devices rather than additional approved Web UI implementation.

This implementation also fixes the multi-day lifecycle defect found during browser audit: finishing today's operating window no longer marks the whole market as ended when future market dates remain. The verified `2026/8/10~12` market now appears under `待準備`, opens `管理`, and identifies the current-day state as `今日已收攤`. Truly ended markets open `回顧`, use a single zero-record recovery state, and archive field notes/checklists as read-only.

## 10. Remaining Work Checklist

### P0 - Operating-market workflow

- [x] Move the transaction workspace ahead of the large interaction panel on mobile so the payment entry point is visible in the first viewport.
- [x] Add an operating-phase compact summary variant that keeps status, revenue, deals, and pending photos in one shorter band.
- [x] Reduce the three interaction buttons from `min-h-24` cards to compact one-tap controls on mobile.
- [x] Add a bounded undo action after recording an interaction; do not add a confirmation dialog to every tap.
- [x] Make the `待補照片 0` state non-interactive or replace it with a compact `照片已齊` status.
- [x] Verify and repair the intended sticky behavior of the `現場 / 回顧 / 管理` workspace navigation during deep scrolling.
- [ ] Add automated 360, 375, 390, and 430 px visual regression coverage for the active-market first viewport and transaction controls. Manual browser verification is complete at all four widths.

### P1 - Workflow continuity and scanability

- [x] Instrument the market-detail transition and identify the remaining readiness delay. The local production browser baseline measured approximately 1.55-1.81 seconds.
- [x] Replace page-wide loading with a persistent destination shell and section-level loading states.
- [x] Preserve authorized content and scroll position during role revalidation while capabilities and sync remain fail closed.
- [x] Add pending checklist count and a direct `現場工作` shortcut near the operating summary.
- [x] Collapse the tall `今日尚無交易記錄` panel into a compact row while no records exist.
- [ ] Validate field-note and checklist inputs with the software keyboard and fixed bottom navigation on iOS and Android.
- [x] Convert expired-photo history to compact grouped rows with optional detail expansion.
- [x] Finish user-facing recovery states and localize the remaining technical English copy.

### P2 - Consistency and release verification

- [x] Simplify Theme Lab on mobile and move token-level editing under `進階調整`.
- [x] Normalize date formatting across market list, detail, reports, pickers, and photo timestamps. Native date inputs retain the `YYYY-MM-DD` data contract while surrounding display labels use the shared presentation formatter.
- [ ] Complete owner, manager, and staff smoke tests independently. Owner flow is covered by the browser audit; manager and staff still require dedicated authenticated test accounts.
- [ ] Run real-device camera/gallery, offline/reconnect, background/resume, safe-area, and keyboard tests on iOS and Android.

The Web implementation track for the approved UX-M1 through UX-M7 changes is complete. The unchecked items above are release-evidence tasks and must remain open until their required browser infrastructure, role accounts, or physical devices are available.

### Version A operating workbench - 2026-08-11

The approved Version A interaction model replaces the long mobile operating page with a dedicated action dock while preserving the existing domain services:

- the global app navigation is hidden only while the live operating workspace is active;
- three configured interaction actions sit directly below the operating summary and retain bounded undo;
- owners see a compact reminder and direct link to `/settings/sales`; staff see the configured labels without an unauthorized settings link;
- quick payment and product sales open focused bottom sheets with persistent completion actions;
- the fixed operating dock contains only quick payment and product sales;
- pending-photo access moves to the operating summary when work is pending, while zero pending photos render as the passive `照片已齊` state;
- a completed sale closes the transaction sheet before the existing photo state machine continues;
- owner and staff use the same mobile workbench, while the existing desktop two-column workflow remains available;
- field notes and checklist sit below recent records in a collapsed in-place `現場工作` section instead of replacing the operating view;
- page padding and safe-area insets prevent the dock from covering recent records or device system UI.

This is a presentation-layer change. Event writes, offline durability, photo queueing, upload behavior, and permission decisions remain in their existing shared services.

Implementation verification:

- local production build passed and the active owner workflow was inspected with a temporary browser-only test clock; no interaction, transaction, photo, note, or checklist write was submitted;
- 360 x 800, 390 x 844, and 430 x 932 passed without horizontal overflow or overlap with the hidden global navigation;
- the refined two-action dock measured 67 px total height with two 48 px actions at 360, 390, and 430 px;
- quick payment and product-sale sheets kept their 56 px completion actions visible and exposed no horizontal overflow;
- the interaction controls render between the operating summary and recent records, with the owner settings link resolving to `/settings/sales`;
- the in-place field-work section defaults to collapsed and exposes the reference note, handoff notes, and checklist when expanded;
- 1280 x 900 preserved the existing desktop transaction, interaction, field-note, and checklist workspace;
- the tested workflow produced no browser console warnings or errors.

## 11. Operating-Market Browser Audit - 2026-08-11

Tested the active `2026/8/10~12` market at 360, 375, 390, and 430 px without submitting a transaction. Temporary interaction and checklist records used to verify undo, delete, and pending-count behavior were removed after the test.

Observed strengths:

- operating status, time, revenue, deals, and pending-photo count are understandable;
- quick payment and product sale modes have clear labels and touch targets;
- selected products expose quantity controls and a clear total;
- payment-method selection persists across reloads;
- the pending-photo dialog has a clear empty state;
- field-note and checklist controls remain readable without horizontal overflow.

Baseline friction addressed by this implementation:

- the transaction workspace begins only after the header, workspace tabs, summary, and three large interaction buttons;
- at 360 and 390 px, the user sees only the transaction heading near the bottom of the first viewport, not the amount controls;
- field notes and checklist require several screens of scrolling and have no pending-work shortcut near the top;
- the workspace navigation did not remain visible during deep scrolling despite its intended sticky styling;
- interaction recording is immediate and provides success feedback, but has no undo path for accidental taps;
- opening `待補照片` with a count of zero leads to a valid but avoidable empty dialog;
- the empty recent-record panel consumes substantial vertical space during a live shift.

Recommended mobile order during `營業中`:

1. compact market header and workspace tabs;
2. compact operating summary;
3. transaction workspace;
4. compact interaction controls;
5. recent transactions;
6. organizer note, handoff notes, and checklist with a top-level pending-work shortcut.

Desktop can retain the existing two-column transaction and interaction composition. The ordering change should be responsive presentation only; transaction, interaction, photo, and field-operation contracts remain shared and platform-neutral.

Implemented and browser-verified:

- mobile DOM order now puts the transaction workspace before interaction controls while desktop keeps the two-column composition;
- the operating summary and empty recent-record state use compact mobile variants;
- a `收款與互動 / 現場工作` segmented control exposes organizer notes, handoff notes, and checklist without a long scroll;
- the `現場工作` shortcut displays the current pending checklist count when it is non-zero;
- interaction recording offers both a five-second toast action and a persistent latest-interaction undo action;
- owners can remove an interaction from recent records through the existing confirmation and tombstone flow;
- zero pending photos renders as the non-interactive `照片已齊` status;
- horizontal clipping no longer breaks sticky workspace navigation during deep scrolling.

## 12. Market-Detail Transition Continuity - 2026-08-11

Baseline browser measurement from the active market list to usable transaction controls was approximately 1.55-1.81 seconds. The wait is dominated by protected-route readiness, database safety initialization, integrity validation, and local-detail lookup rather than by the route URL update alone.

Implemented behavior:

- clicking a market synchronously replaces the list with a destination-shaped detail shell before navigation starts;
- the shell carries only the market name, formatted date range, and location already authorized on the list;
- the in-memory snapshot is bound to the authenticated actor, expires after 15 seconds, and is never written to browser storage;
- the App Router detail segment and page-level Suspense boundary use the same stable loading shell;
- the detail screen retains the shell through database initialization and remote fallback instead of returning a blank frame or generic page skeleton;
- the transition timer records the most recent completed duration for future diagnostics;
- database integrity checks, role freshness gates, sync info level, and remote fallback authorization remain unchanged.

The implementation improves perceived continuity but does not claim that the underlying data readiness time has been removed. Reducing the actual duration would require separately reviewing database integrity-check frequency and caching semantics, which is intentionally outside this UX-only slice.
