# Settlement Report Preview Spec

Date: 2026-06-30

Status: Slice C formal owner-only preview UI completed; 2026-07-01 update repositions preview as an in-app report check workspace. Owner-only browser PDF preview is tracked in the separate PDF technical plan.

Scope: define the owner-only settlement report preview/check experience and the pure preview view model that displays the output of `buildSettlementReportModel()` before any PDF generation is implemented.

This document approves the owner-only preview UI with local read-only IndexedDB access. It does not approve custom download UI, Excel generation, browser file APIs, Supabase reads, manager access, analytics page logic replacement, data repair, projection rebuilds, duplicate cleanup, or sync/recovery behavior.

## 1. Product Goal

The preview should help the owner answer:

- Is this weekly/monthly report ready to share or archive?
- Which conclusions are reliable?
- Which conclusions are limited or unavailable because data is missing or distorted?
- What should be fixed or recorded next time to make future reports more accurate?

The preview is not an analytics dashboard and is not the final report design. It is an in-app check workspace for reviewing readiness, warnings, conclusions, and source data before a future designed PDF is generated.

The analytics page remains interactive and exploratory. The settlement report preview is fixed-period, owner-only, and designed for closing a week or month.

## 2. Permission And Data Source Policy

Initial preview access is owner-only.

Owner:

- may preview weekly and monthly settlement report content;
- may see cost, booth fee, commission, gross profit, net profit, and product cost estimates;
- may see data-quality and distortion-risk warnings.

Manager, operator, viewer, and fail-closed roles:

- no preview access in the initial implementation.

The preview UI may read local IndexedDB through the approved owner-only route, then build `SettlementReportModel` and `SettlementReportPreviewModel` locally.

The pure preview view model must consume an already-built `SettlementReportModel` or a caller-provided authorized view model.

It must not:

- query Supabase directly;
- call sync services;
- run data repair;
- rebuild projections;
- generate PDF, Excel, CSV, or downloads;
- import report preview code into analytics page runtime.

## 3. Preview Page Information Architecture

The future preview should show these sections in this order.

### 3.1 Report Header

Purpose: identify report type and readiness.

Required content:

- report kind: weekly or monthly;
- report period label;
- generated-at date;
- owner/brand display name when available;
- confidence badge: high, medium, or low;
- status badge:
  - ready;
  - limited;
  - not ready.

Behavior:

- `ready`: no warning-severity limitations and confidence is high or medium.
- `limited`: at least one info limitation or confidence is medium.
- `not ready`: any warning limitation that affects overall score, market rejoin, profit, or data quality.

### 3.2 Executive Summary

Purpose: show the main decision without requiring the owner to read the whole report.

Required content:

- total revenue;
- net profit;
- total deals;
- average order value;
- overall score;
- grade;
- recommendation:
  - strong rejoin;
  - rejoin;
  - observe;
  - caution;
  - avoid;
- short explanation of why.

Behavior:

- If profit analysis is unavailable, net profit must be labeled as estimated or hidden depending on the limitation.
- If confidence is low, the recommendation must be visually softened and paired with a data-quality reason.
- If no eligible markets exist, do not show a recommendation as a decision; show a data-needed state.

### 3.3 Data Quality And Reliability

Purpose: make limitations visible before the owner trusts the report.

Required content:

- confidence level;
- limitation count by severity;
- affected sections;
- owner-facing explanation;
- next data action.

Behavior:

- Warning limitations must be visible near the top, not hidden at the bottom.
- Info limitations may be grouped but must remain accessible.
- Each limitation must map to a visible section behavior from Section 4.

### 3.4 Score Explanation

Purpose: keep scoring explainable and avoid black-box AI behavior.

Required content:

- each score component;
- weight;
- score or unavailable state;
- available/limited/unavailable status;
- reason.

Behavior:

- Components with `score: null` must not contribute to the weighted score display.
- Limited components must show why the score is directional.
- The preview must not invent AI-style conclusions that are not in the model.

### 3.5 Market Performance

Purpose: help the owner decide which markets are worth joining again.

Required content:

- market name;
- revenue;
- net profit;
- deal count;
- average order value;
- rejoin score;
- grade;
- recommendation;
- market-level limitations.

Behavior:

- Excluded inactive markets should appear only in a separate "excluded from totals" note, not in rankings.
- Ongoing or future markets may appear in draft mode, but must be clearly marked not final.
- Market rows affected by projection mismatch, duplicate daily stats, or outliers must show a warning marker.

### 3.6 Product Performance

Purpose: show product-level lessons only when item-level data supports them.

Required content when available:

- product name;
- quantity;
- revenue;
- estimated cost when available;
- estimated gross profit when available.

Behavior:

- If product detail is unavailable, replace product ranking with a data-needed message.
- If product cost is missing, show product revenue ranking but hide or soften profit ranking.
- If cost basis is estimated from current product cost, mark product profit as directional.
- If manual/simple entry dominates the period, product recommendations should be hidden or marked limited.

### 3.7 Cost And Profit

Purpose: explain whether the market was profitable and what cost pressure existed.

Required content:

- product cost;
- fixed market cost;
- commission fee;
- gross profit;
- net profit;
- cost coverage status.

Behavior:

- If cost coverage is zero, do not show profit score as a reliable conclusion.
- If market cost is zero while revenue exists, show a "possible missing market cost" warning.
- If partial-period overlap exists, explain that fixed costs are counted once and may not match exact weekly/monthly allocation.

### 3.8 Next Actions

Purpose: turn the report into useful action.

Required content:

- which markets can be prioritized;
- which markets need observation;
- which product data should be recorded next time;
- which cost fields should be filled;
- which source records should be reviewed before final sharing.

Behavior:

- Actions must come from limitations and model content.
- Do not suggest repair, projection rebuild, duplicate cleanup, or sync mutation from the preview.
- Data-quality actions should be framed as future recording or read-only review unless a separate repair workflow is approved.

## 4. Limitation To Visible Behavior Mapping

| Limitation code | Preview behavior |
| --- | --- |
| `missing_daily_stats` | Show report as limited; market ranking must warn that some markets have no daily revenue/deal records. |
| `missing_cost_data` | Profit score unavailable when cost coverage is zero; otherwise profit is directional. |
| `missing_product_detail` | Product ranking/action section becomes unavailable or limited. |
| `missing_interaction_data` | Conversion section becomes unavailable or limited; financial summaries remain visible. |
| `unsynced_data` | Show sync warning; final sharing should wait until sync is confirmed. |
| `no_markets_in_period` | Replace summary recommendation with empty/data-needed state. |
| `low_sample_size` | Keep single-market summary but soften trends, rankings, and strategy conclusions. |
| `excluded_inactive_market` | Show excluded-market note outside ranking and totals. |
| `ongoing_or_future_market` | Mark preview as draft/not final. |
| `projection_mismatch` | Show top-level warning and affected market markers; require read-only audit before final use. |
| `possible_duplicate_daily_stats` | Show top-level warning; totals, rankings, and product advice are not final. |
| `outlier_values` | Show top-level warning and affected source-record markers. |
| `manual_entry_dominant` | Preserve revenue/deals/AOV; hide or limit product recommendations. |
| `zero_or_missing_market_cost` | Mark net profit and cost pressure as directional. |
| `cost_basis_estimated` | Mark product profit as directional. |
| `partial_period_overlap` | Explain fixed-cost allocation may not be exact for the selected week/month. |

## 5. Visual Direction

The in-app UI should feel like a practical Féria workflow, not a full PDF mockup and not a generic chart dashboard.

Recommended visual principles:

- compact operational layout;
- clear hierarchy;
- visible period controls;
- restrained accent color aligned with the app;
- data-quality badges;
- concise tables;
- readable warnings;
- mobile and desktop readability.

Avoid:

- decorative landing-page style;
- black-box AI labels;
- hiding warnings behind small icons only;
- dashboard-like overload;
- full report-cover styling inside the app;
- showing disabled PDF/download buttons as if they are already approved.

## 6. Future PDF Relationship

The preview and the designed PDF should share the same report model, numbers, conclusions, warnings, and next actions.

The preview does not need to share the same layout as the PDF. The preview is for checking; the PDF is the polished final artifact.

However, this spec does not choose:

- PDF library;
- PDF rendering method;
- page size;
- typography implementation;
- download behavior;
- background generation.

Those decisions require a later PDF technical plan.

## 7. Implementation Slices

### Slice A: This Spec

Status: current slice.

Deliverables:

- this document;
- static guardrail test.

No runtime code.

### Slice B: Pure Preview View Model

Status: completed.

Result record:

- `lib/reporting/settlement-report-preview.ts`
- `tests/settlement-report-preview-model.test.ts`

Create a pure helper that maps `SettlementReportModel` to a preview-specific view model.

Allowed:

- section readiness;
- warning placement;
- visible copy keys;
- no React;
- no browser APIs.

Safety result:

- The helper consumes an already-built `SettlementReportModel`;
- the helper keeps an owner-only capability guard;
- the helper exposes readiness, reliability, section status, top warnings, and next actions;
- the helper does not render UI, read IndexedDB, query Supabase, generate files, or trigger downloads.

Not allowed:

- actual page UI;
- PDF generation;
- data reads;
- repair actions.

### Slice C: Formal Owner-Only Preview UI

Status: completed.

Result record:

- `app/reports/settlement/page.tsx`
- `tests/settlement-report-preview-ui.test.ts`

Add the page only after Slice B is stable.

Required:

- owner-only gate;
- app-like report check summary;
- visible readiness and confidence state;
- KPI summary;
- data-reliability panel;
- explainable score breakdown;
- market, product, cost/profit, and next-action sections;
- no download action;
- no PDF generation;
- local IndexedDB read-only access only;
- no Supabase reads;
- no write, sync, repair, or projection rebuild action.

### Slice E: Preview Repositioning

Status: approved and tracked in `docs/SETTLEMENT_REPORT_PRESENTATION_PLAN_2026_07_01.md`.

Goal:

- keep the preview page as the owner-only in-app checkpoint;
- stop treating it as the final PDF visual design;
- align page layout with Féria's practical app workflow.

Allowed:

- heading and copy changes;
- layout simplification;
- clearer readiness and warning hierarchy;
- updated guardrail tests.

Not allowed:

- PDF generation;
- download buttons;
- PDF library selection;
- permission changes;
- scoring changes;
- data writes or sync behavior.

### Slice D: PDF Technical Plan

Future, after preview content is stable.

Decide PDF generation strategy separately.

## 8. Stop Conditions

Stop for approval before:

- adding PDF generation;
- adding PDF/download buttons;
- adding Excel generation;
- adding Supabase reads;
- changing settlement scoring;
- changing role permissions;
- adding manager report access;
- editing analytics page runtime;
- running data repair;
- rebuilding projections;
- cleaning duplicate records.
