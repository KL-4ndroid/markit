# Analytics Shared Insight Quality Model Design

Date: 2026-06-30

Status: design, pure model tests, settlement-report equivalence preparation, and settlement-report data-quality adoption completed.

Scope: define and test the first shared insight-quality model for BoothBook analytics/reporting reliability signals.

This document approves only settlement report data-quality adoption of the shared insight-quality model. Report preview UI approval and completion are tracked in `docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md`. This document does not approve analytics page adoption, PDF generation, Excel generation, Supabase reads, data repair, projection rebuilds, duplicate cleanup, or sync/recovery behavior.

## 1. Goal

The shared insight-quality model should answer:

- what is the overall confidence level;
- which insight sections are available, limited, or unavailable;
- which limitations affect the result;
- what next data actions should be shown;
- whether the result is final-ready.

It should be reusable by:

- settlement reports;
- report preview view models;
- future analytics page reliability labels.

It must not contain settlement-report-specific scoring, PDF copy, market rejoin wording, or analytics page UI behavior.

## 2. Input Model

The first pure model receives caller-provided, already-authorized data:

- `limitations`: shared `InsightLimitation[]`;
- `confidenceComponents`: weighted confidence components;
- optional section defaults.

It does not compute business data from markets, daily stats, products, events, Supabase, or IndexedDB in this slice.

## 3. Output Model

The model returns:

- `confidence`: `high`, `medium`, or `low`;
- `confidenceScore`: normalized 0-1 score;
- `confidenceComponents`;
- `limitations`;
- `sectionAvailability`;
- `warningCount`;
- `infoCount`;
- `nextActions`;
- `isFinalReady`.

## 4. Section Availability Rules

Default section state is `available`.

Limitations can downgrade affected sections:

- warning limitations make affected sections at least `limited`;
- info limitations make affected sections at least `limited`;
- structural unavailable limitations such as `no_markets_in_period` and `missing_product_detail` can make affected sections `unavailable`.

The model is intentionally conservative. It does not hide unrelated sections.

## 5. Confidence Rules

Confidence is computed from weighted components.

- `>= 0.75`: high;
- `>= 0.45`: medium;
- `< 0.45`: low.

The model clamps component scores to 0-1 and ignores zero-weight components.

## 6. Readiness Rules

`isFinalReady` is true only when:

- there are no warning limitations;
- overall score is not unavailable;
- data quality is not unavailable;
- confidence score is high.

This readiness flag is a display/readiness signal only. It does not approve sync, repair, PDF generation, or data mutation.

## 7. Implementation Boundary

Completed in this slice:

- `lib/analytics/insight-quality-model.ts`;
- `tests/analytics-insight-quality-model.test.ts`;
- static guardrails proving no runtime data source, UI, PDF, Excel, recovery, or sync imports.

Completed in the follow-up adoption slice:

- `buildSettlementReportModel()` uses `buildInsightQualityModel()` to derive report-level `dataQuality.confidence`;
- settlement report totals, score, recommendation, limitations, notes, and content output remain covered by existing model tests.

Not completed in this slice:

- wiring analytics page to consume this model.

## 8. Next Safe Slice

Completed safe slices: settlement-report equivalence preparation and settlement-report data-quality adoption.

Result record:

- `tests/settlement-report-insight-quality-equivalence.test.ts`
- `lib/reporting/settlement-report.ts`

Safety result:

- Tests compare current settlement report `dataQuality` output to what the shared model would produce.
- Tests verify confidence, limitation list, warning/info counts, next actions, and representative section availability.
- `buildSettlementReportModel()` now consumes `buildInsightQualityModel()` only for report-level data-quality confidence.
- Settlement report totals, scoring, recommendations, limitations, notes, content, and owner-only guard remain covered by existing tests.

Completed follow-up slice:

- owner-only report preview data contract and formal preview UI are tracked in `docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md`;
- PDF generation, Excel generation, analytics page adoption, and Supabase report reads remain deferred.

## 9. Stop Conditions

Stop for approval before:

- changing settlement report `dataQuality` output;
- changing settlement report score or recommendation;
- editing analytics page runtime;
- adding PDF/download behavior to report preview UI;
- adding Supabase report reads;
- adding PDF or Excel generation;
- adding repair or projection rebuild behavior.
