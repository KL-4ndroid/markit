# Analytics Shared Insight Core Plan

Date: 2026-06-30

Status: deferred implementation plan.

Trigger: remind the user to implement this after the current settlement report original task is completed. The current original task means finishing the settlement report preview/spec work that depends on the report model and distortion-risk model.

Scope: define which logic should be extracted from `lib/reporting/settlement-report.ts` into a shared analytics insight core, so the existing analytics page can reuse the same data-quality, confidence, and limitation rules without copying report-specific PDF or settlement language.

This document does not approve runtime analytics page changes, report preview UI, PDF generation, Excel generation, Supabase reads, IndexedDB reads, data repair, projection rebuilds, duplicate cleanup, or broad analytics UI rewrite.

## 1. Why This Exists

The settlement report model now contains useful exception handling that the analytics page also needs:

- missing cost data;
- missing product detail;
- missing interaction data;
- missing daily stats;
- unsynced data;
- no eligible markets;
- low sample size;
- inactive market exclusion;
- ongoing or future market warnings;
- projection mismatch;
- possible duplicate daily stats;
- outlier values;
- manual/simple entry dominance;
- zero or missing market cost;
- estimated product cost basis;
- partial period overlap.

If the analytics page reimplements these checks separately, the project will create two versions of "is this insight reliable?" and those versions will drift.

The goal is to share the reliability layer, not to force the analytics page to become a settlement report.

## 2. What Should Be Extracted

Move these concepts into a shared pure module later, likely under `lib/analytics/insight-quality.ts`:

- signal status: `available`, `limited`, `unavailable`;
- confidence: `high`, `medium`, `low`;
- limitation severity: `info`, `warning`;
- limitation code taxonomy;
- affected section taxonomy;
- pure numeric guards such as finite number, ratio, clamp, and outlier detection;
- daily-stat duplicate detection;
- projection mismatch detection;
- inactive market detection;
- ongoing/future market detection;
- manual/simple entry dominance detection;
- zero-cost-with-revenue detection;
- partial-period overlap detection;
- product cost basis warnings;
- helper to convert limitations into owner-facing next actions.

The shared module should stay pure and input-driven. It should not import React, Supabase, Dexie, `db`, browser APIs, file generation, recovery tools, or sync services.

## 3. What Should Stay In Settlement Report

Keep these in `lib/reporting/settlement-report.ts`:

- weekly/monthly settlement report period model;
- owner-only settlement report permission guard;
- report-specific money summary shape;
- report-specific activity summary shape;
- market rejoin recommendation;
- report grade and report recommendation text;
- PDF-oriented content model such as cover, highlights, market actions, product actions, and data actions;
- fixed settlement score weights unless a later analytics scoring plan explicitly adopts them.

The analytics page should not import report cover text, PDF content sections, or settlement-specific recommendation copy.

## 4. What Should Be Shared With Analytics

The analytics page should eventually consume shared insight-quality output so each analytics section can decide:

- show normal result;
- show limited result with explanation;
- hide the conclusion and show what data is needed;
- avoid showing product ranking when product detail is missing;
- avoid showing profit/margin conclusions when cost coverage is weak;
- avoid trusting projection totals when projection mismatch or duplicate daily stats are detected;
- preserve useful revenue, deal count, and average order value analysis when the user uses simple revenue entry.

Expected analytics consumers:

- KPI summary reliability labels;
- market comparison cards;
- product ranking cards;
- conversion/interaction cards;
- recommendation cards;
- future report preview warnings.

## 5. Recommended Implementation Slices

### Slice A: Static Design And Boundary Test

Status: this document.

Create the plan and a static test that locks:

- deferred status;
- extraction target;
- no runtime behavior changes;
- no analytics page rewrite;
- no PDF/report UI work;
- no Supabase or IndexedDB reads.

### Slice B: Pure Type Extraction

After the current settlement report original task is complete, extract shared type aliases only:

- `InsightSignalStatus`;
- `InsightConfidence`;
- `InsightLimitationSeverity`;
- `InsightLimitationCode`;
- `InsightAffectedSection`;
- `InsightLimitation`.

Settlement report types can alias or map these shared types.

Risk: low.

Stop condition: any type rename that forces broad app changes.

### Slice C: Pure Helper Extraction

Move safe pure helpers out of settlement report:

- finite number helpers;
- ratio/clamp helpers;
- inactive market detection;
- ongoing/future market detection;
- duplicate daily-stat key detection;
- outlier detection;
- projection mismatch detection;
- partial-period detection.

Risk: low to medium.

Stop condition: helper extraction starts changing model output.

### Slice D: Shared Insight Quality Model

Create a shared input/output model that can return:

- limitation list;
- confidence components;
- section availability;
- next data actions.

Settlement report should consume this shared result, then add report-specific scoring and content.

Risk: medium.

Stop condition: analytics page runtime starts depending on it before settlement report output equivalence tests pass.

### Slice E: Analytics Page Adoption

Only after the shared model is stable:

- apply it to one analytics section first;
- start with product ranking or profit/margin reliability labels;
- keep old analytics calculations visible until replacement behavior is verified;
- do not rewrite the whole page in one pass.

Risk: medium.

Stop condition: any direct DB, sync, repair, or permission behavior changes are required.

## 6. Equivalence Rules

Before `settlement-report.ts` consumes the shared core, tests must prove:

- existing settlement report totals do not change;
- existing score results do not change unless explicitly approved;
- existing limitation codes remain present;
- existing owner-only guard remains in settlement report;
- no PDF, Excel, CSV, UI, Supabase, IndexedDB, recovery, or sync import is introduced.

## 7. Reminder Rule

After the settlement report preview/spec original task is completed, remind the user:

"Analytics Shared Insight Core Plan is ready. Do you want to start extracting the shared insight-quality core before upgrading the analytics page?"

Do not implement this plan before that reminder unless the user explicitly changes priority.

## 8. Stop Conditions

Stop for approval before:

- editing `app/analytics/page.tsx`;
- editing analytics UI components;
- replacing analytics calculations;
- changing settlement report scores;
- changing role permissions;
- adding report preview UI;
- adding PDF generation;
- adding Excel generation;
- adding Supabase or IndexedDB reads;
- repairing data or rebuilding projections.
