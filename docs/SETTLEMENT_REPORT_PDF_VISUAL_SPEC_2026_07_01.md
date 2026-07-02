# Settlement Report PDF Visual Specification

Date: 2026-07-01

Status: visual specification completed; PDF generation remains deferred.

Scope: define the first formal visual and content structure for the owner-only weekly/monthly settlement report PDF.

This document does not approve PDF generation, browser downloads, PDF library selection, Excel generation, CSV export UI, Supabase reads, manager access, report permission changes, scoring changes, data repair, projection rebuilds, duplicate cleanup, or sync/recovery behavior.

## 1. Product Intent

The PDF is the final report artifact for the owner.

It should help a market brand owner decide:

- whether the selected week or month performed well;
- which markets are worth joining again;
- which product decisions are supported by recorded data;
- whether profit conclusions are reliable;
- what should be recorded next time to improve future reports.

The report should feel like a polished brand operations report, not an accounting export and not a dashboard screenshot.

## 2. Source Of Truth

The PDF must be derived from the same report model used by the preview:

- `buildSettlementReportModel()`;
- `SettlementReportModel.content`;
- `SettlementReportModel.decision`;
- `SettlementReportModel.dataQuality`;
- `SettlementReportModel.marketRows`;
- `SettlementReportModel.marketDecisions`;
- `SettlementReportModel.productRows`.

The PDF must not create different numbers, recommendations, scores, limitation messages, or next actions from the preview.

The PDF layout may differ from the preview page because PDF is a fixed-page artifact and the preview page is an in-app check workspace.

## 3. Page Format

Initial format:

- A4 portrait;
- 12 mm outer page margin;
- 10 mm internal content gutters;
- tabular numbers for all financial and count values;
- maximum one primary accent color per page;
- no decorative illustration-only pages;
- no dark full-page cover unless brand customization later requires it.

The first version should prioritize stable pagination and readable tables over highly decorative layout.

## 4. Visual Language

Use a restrained Féria-aligned visual system:

- background: warm off-white;
- primary accent: quiet green;
- secondary accent: muted amber for caution;
- warning accent: muted red;
- text: dark neutral;
- borders: soft warm gray;
- cards: square or small-radius panels, not floating marketing cards.

Visual tone:

- precise;
- calm;
- premium enough for sharing;
- not playful;
- not overly corporate.

## 5. Typography

Recommended hierarchy:

- cover title: 24-28 pt;
- section title: 13-16 pt;
- key number: 20-26 pt;
- table header: 8-9 pt;
- table body: 8-10 pt;
- explanation text: 8-9 pt;
- footnote/warning text: 7.5-8 pt.

Rules:

- use Traditional Chinese labels by default;
- avoid English-facing labels except internal grade letters such as A/B/C/D;
- keep paragraphs short;
- avoid dense full-width text blocks;
- reserve large type for cover and key numbers only.

## 6. Page Sequence

### Page 1: Cover Summary

Purpose: give the owner the answer first.

Required content:

- brand name;
- report type: 週結報告 or 月結報告;
- report period;
- overall recommendation;
- overall score and grade;
- confidence level;
- total revenue;
- net profit;
- total deals;
- average order value;
- top one to three data warnings when present.

Layout:

- top: brand name and period;
- center-left: recommendation statement;
- center-right: score card;
- bottom: four key metrics in a single row or two-by-two grid;
- warnings: compact strip near bottom when present.

Behavior:

- if readiness is not ready, cover must visibly state that this report is not final;
- if confidence is low, the recommendation must be softened and paired with the data-quality reason.

### Page 2: Data Confidence And Score Explanation

Purpose: show why the report can or cannot be trusted.

Required content:

- confidence level;
- readiness reason;
- warning count;
- info count;
- score component list;
- component weight;
- component score or unavailable state;
- component reason;
- limitations affecting conclusions.

Layout:

- left column: confidence and limitations;
- right column: score breakdown bars;
- use small badges for available / limited / unavailable.

Behavior:

- warning limitations must appear before info limitations;
- unavailable score components must be visually distinct and must not look like zero-score failures.

### Page 3: Market Performance

Purpose: help decide which markets to join again.

Required content:

- market name;
- revenue;
- net profit;
- deal count;
- average order value;
- rejoin score;
- grade;
- recommendation.

Layout:

- ranked table;
- first column wider for market name;
- numeric columns right-aligned;
- recommendation displayed as short Traditional Chinese text;
- warning marker when market data has known limitations.

Behavior:

- show at most 8 markets on the first market page;
- if more markets exist, allow continuation pages in the future technical implementation;
- do not include cancelled/deleted/postponed markets in the ranking totals.

### Page 4: Product Performance

Purpose: show product-level lessons only when data supports them.

Required content when available:

- product name;
- quantity sold;
- recorded revenue;
- estimated gross profit when available;
- data limitation note when product detail is incomplete.

Layout:

- top products table;
- optional callout for "需要補資料" when product rows are missing or limited;
- do not force charts when product data is sparse.

Behavior:

- if product detail is unavailable, replace ranking with a clear data-needed panel;
- if product cost is missing, revenue ranking may remain but profit ranking must be hidden or marked directional.

### Page 5: Cost, Profit, And Next Actions

Purpose: turn the report into operating decisions.

Required content:

- product cost;
- fixed market cost;
- commission fee;
- gross profit;
- net profit;
- cost coverage ratio;
- market actions;
- product actions;
- data actions.

Layout:

- cost/profit summary at top;
- next actions grouped into three blocks:
  - 市集決策;
  - 商品決策;
  - 下次補強資料.

Behavior:

- if cost coverage is zero, profit conclusions must be labeled as unavailable;
- if cost coverage is partial, profit conclusions must be labeled as directional.

## 7. Warning And Data-Limitation Design

Warnings are first-class report content, not footnotes.

Severity mapping:

- warning: muted red border, visible near top of relevant page;
- info: muted amber border, visible in section context;
- unavailable: gray state with clear "資料不足";
- limited: amber state with clear "僅供方向參考";
- available: quiet green state.

Required limitation behavior:

- `missing_cost_data`: mark profit conclusions unavailable or directional;
- `missing_product_detail`: hide or limit product ranking;
- `missing_interaction_data`: limit conversion interpretation;
- `unsynced_data`: mark final sharing as not recommended until sync is confirmed;
- `projection_mismatch`: mark financial totals as needing read-only audit;
- `possible_duplicate_daily_stats`: mark totals and rankings as not final;
- `outlier_values`: show source-record review warning.

## 8. Chart Policy

Charts are optional in version one.

Allowed only if they clarify a decision:

- score breakdown bars;
- small revenue/profit comparison bars for top markets;
- simple product revenue bar list.

Avoid:

- decorative charts;
- pie charts for sparse data;
- complex dashboards;
- charts that duplicate table values without adding clarity.

## 9. Brand Customization

Version one should use the owner brand name.

Later versions may support:

- logo;
- brand primary color;
- cover style;
- footer contact text.

Blocked for this slice:

- image upload;
- logo storage;
- PDF template selection UI;
- custom font upload;
- manager-editable branding.

## 10. Accessibility And Readability

The PDF should remain readable when printed or viewed on a phone.

Rules:

- do not rely on color alone for warnings;
- every badge must include text;
- financial values must use consistent currency formatting;
- long market/product names should wrap cleanly;
- table rows must not become visually cramped;
- page footer should include page number and report period.

## 11. Implementation Boundary

This visual spec approves only document design direction.

It explicitly does not approve:

- installing a PDF library;
- adding PDF generation code;
- adding download buttons;
- adding file storage;
- sending report data to Supabase;
- querying Supabase for report data;
- changing owner/manager/staff permissions;
- changing settlement scoring;
- changing analytics page behavior;
- changing sync or recovery behavior.

## 12. Next Slice

The next safe slice is PDF Technical Plan.

That plan should decide:

- PDF generation strategy;
- library choice;
- client/server rendering boundary;
- Traditional Chinese font handling;
- pagination strategy;
- test strategy;
- owner-only export guardrails.

No PDF implementation should begin until that technical plan is approved.
