# Settlement Report Model Plan

Date: 2026-06-30

Status: approved for pure data-model implementation only.

Scope: define and test an owner-only weekly/monthly settlement report data model. This plan does not approve PDF generation, Excel generation, download UI, manager export/report permissions, Supabase reads, IndexedDB writes, or any recovery/sync behavior.

## 1. Product Direction

Settlement reports are the primary reporting experience.

CSV and Excel are supporting download formats, not the main product surface.

The report should answer the questions most market brand owners are likely to care about:

- how much revenue the period produced;
- how many deals happened;
- what the average order value was;
- which markets performed best;
- which products sold best;
- how fixed market fees and commission affected net profit;
- whether the report is based on complete enough data.

The first user-facing artifact should eventually be a designed PDF, because a polished report is more useful for sharing, archiving, and handing to partners than a raw spreadsheet.

Excel remains a future detailed-download format for owners who want deeper operational analysis.

## 2. Permission Policy

Initial settlement reports are owner-only.

Owner:

- may build weekly and monthly settlement reports;
- may include cost, booth fee, commission, gross profit, and net profit;
- may later download designed PDF and Excel outputs after separate implementation approval.

Manager:

- no settlement report access in the initial implementation;
- previous manager export/report candidate is cancelled for now;
- any future manager-scoped report requires a new permission decision and redaction tests.

Operator and viewer:

- no settlement report access.

## 3. Relationship To Analytics

The analytics page and settlement reports should not compete.

Analytics page:

- interactive;
- exploratory;
- useful for trends, filtering, and operational decisions.

Settlement report:

- fixed period;
- document-like;
- designed for weekly/monthly closing;
- suitable for PDF export and sharing;
- contains a stable summary, rankings, and data-quality notes.

## 4. Initial Model Shape

The first model should include:

- report period: `weekly` or `monthly`, `startDate`, `endDate`, display label;
- summary KPIs: revenue, product cost, gross profit, fixed market cost, commission, net profit, deals, interactions, average order value;
- market performance rows: per-market revenue, deals, interactions, gross profit, fixed cost, commission, net profit, average order value;
- product performance rows: product quantity and revenue, with owner-only estimated cost/profit when product cost is available;
- data-quality notes: missing daily stats, missing product names, unsynced local rows.

## 5. Data Completeness Rules

Incomplete data must not make the whole report meaningless.

Instead, each report section has its own availability state:

- `available`: enough data for direct analysis;
- `limited`: some useful signal exists, but conclusions must be softened;
- `unavailable`: do not show a conclusion for this section.

Required first-version exception handling:

- Missing cost data must lower profit confidence and disable profit score when no cost coverage exists.
- Missing product detail must disable product ranking and product restock/action advice when no item-level sales exist.
- Missing interaction data must disable conversion analysis when no interaction records exist.
- Unsynced market data must lower overall confidence and show a sync warning.
- Missing daily stats must lower market ranking confidence.

Examples:

- A handmade brand that uses simple revenue entry without cost still gets revenue, deal count, average order value, and market-level guidance.
- The same brand does not get a confident net-profit or margin conclusion until costs are recorded.
- A brand with too many products to itemize still gets market-level performance and settlement totals.
- The same brand does not get product ranking or restock recommendations until item-level sales are recorded.

The report must be explicit about these limitations so the owner knows which conclusions are reliable.

## 5.1 Distortion Risk Rules

The report must also handle cases where data exists but conclusions can still become misleading.

The first-version distortion model is defined in:

- `docs/SETTLEMENT_REPORT_DISTORTION_RISK_PLAN_2026_06_30.md`

Additional required limitation codes:

- no eligible markets in the report period;
- low sample size;
- cancelled, postponed, or deleted markets excluded from totals;
- ongoing or future markets included in a draft report;
- market projection totals differing from daily stats;
- possible duplicate daily stats for the same market/date;
- negative, extreme, or internally inconsistent values;
- simple revenue/manual entry dominance;
- zero market cost with revenue;
- product profit based on current product cost rather than sale-time cost;
- partial period overlap for multi-day markets.

These risks must be presented as confidence and section-availability limitations. They do not approve data repair, projection rebuilds, duplicate cleanup, or report preview UI.

## 6. Data Source Policy

Initial implementation is a pure function that receives already authorized local view-model data.

It must not:

- read from IndexedDB;
- query Supabase;
- call sync services;
- generate PDF, Excel, CSV, or browser downloads;
- import React;
- infer manager-safe output.

Daily stats are the preferred period source because weekly/monthly reports need date filtering.

Market projection values remain useful for fixed costs, commission rate, market labels, and sync-status warnings.

## 7. First Implementation Slice

Approved now:

- pure TypeScript data model;
- owner-only capability guard;
- weekly/monthly period handling;
- deterministic totals and ranking;
- tests for permission, totals, date filtering, and purity.

The first implementation must also include:

- explainable scoring components;
- owner-facing decision content model;
- confidence and data-limitation outputs;
- tests for simple revenue entry without cost;
- tests for item-level sales without product cost;
- tests proving product analysis is disabled when product detail is missing.
- tests proving distortion risks are surfaced before report preview UI is designed.

Still not approved:

- PDF library choice;
- PDF visual template;
- Excel library choice;
- report download UI;
- manager access;
- cloud-first report queries;
- background generation jobs.
