# Settlement Report Distortion Risk Plan

Date: 2026-06-30

Status: completed for model-layer risk classification; follow-up preview UI slices are tracked in the preview spec.

Scope: define which data conditions can make a weekly/monthly settlement report misleading, and how the report model should downgrade, hide, or explain affected conclusions before report preview UI or PDF generation is designed.

This document did not by itself approve report preview UI. Preview UI approval and completion are tracked in `docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md`. This document still does not approve PDF generation, Excel generation, Supabase reads, data repair, projection rebuilds, duplicate cleanup, or any destructive recovery behavior.

## 1. Product Rule

The settlement report must not pretend to be more accurate than the available data.

When data is incomplete or distorted, the report should still provide useful sections where possible, but it must:

- lower confidence;
- mark affected sections as limited or unavailable;
- explain what decision is still safe to make;
- explain what data should be fixed or added before stronger conclusions are used.

This is especially important for market brands that use simple revenue entry, do not track product-level sales, or cannot reliably estimate handmade product cost.

## 2. Existing Missing-Data Cases

The model already handles these cases:

| Case | Report behavior |
| --- | --- |
| Missing cost data | Profit score becomes unavailable when no cost coverage exists; revenue, deal count, and average order value remain useful. |
| Missing product detail | Product ranking and product action advice become limited or unavailable; market-level settlement remains useful. |
| Missing interaction data | Conversion analysis becomes limited or unavailable; financial and sales-volume analysis remains useful. |
| Missing daily stats | Market ranking confidence is lowered. |
| Unsynced market data | Overall confidence is lowered and final sharing should wait for sync. |

## 3. Additional Distortion Risks

These are not simple "missing data" problems. They are cases where numbers may exist but the conclusion can still be wrong.

| Risk | Why it can distort the report | First-version handling |
| --- | --- | --- |
| No eligible markets in period | A report with no completed market cannot support rejoin decisions. | Emit `no_markets_in_period`; mark overall and market decisions unreliable. |
| Very small sample size | One market can be useful as a closing report, but not as a trend or ranking basis. | Emit `low_sample_size`; keep report usable, but soften strategy conclusions. |
| Cancelled, postponed, or deleted markets | Including inactive markets can inflate costs or create false negative conclusions. | Exclude from settlement totals and emit `excluded_inactive_market`. |
| Ongoing or future markets | A closing report is not final before the market is completed. | Emit `ongoing_or_future_market`; keep draft data, but block final confidence. |
| Projection mismatch | Market projection totals may differ from daily stats due to stale projection, duplicate events, tombstones, or repair drift. | Emit `projection_mismatch`; require read-only projection audit before final use. |
| Duplicate daily stats | Repeated market/date daily rows can double count revenue, deals, and products. | Emit `possible_duplicate_daily_stats`; do not repair automatically. |
| Outlier or invalid values | Negative, extremely large, or internally inconsistent values can dominate scores. | Emit `outlier_values`; require source-record review. |
| Manual/simple entry dominance | Simple revenue entry is valid, but product ranking and product advice become weak. | Emit `manual_entry_dominant`; preserve revenue/AOV/market guidance. |
| Zero market cost with revenue | A free market is valid, but accidental blank booth costs can overstate profit. | Emit `zero_or_missing_market_cost`; treat profit/cost pressure as directional. |
| Estimated product cost basis | Current product cost may differ from cost at time of sale. | Emit `cost_basis_estimated`; product profit is directional unless sale-time cost is captured. |
| Partial period overlap | A weekly/monthly report can cut through a multi-day market while fixed cost is counted once. | Emit `partial_period_overlap`; advise full-market period for exact profit allocation. |

## 4. Handling Rules

The first implementation should follow these rules:

- Do not delete or mutate data to fix a report.
- Do not hide the whole report unless there are no eligible markets.
- Do not show product ranking when item-level sales are absent.
- Do not show profit as precise when cost data is missing or only estimated.
- Do not treat simple revenue entry as useless; it still supports revenue, deals, average order value, and market-level guidance.
- Do not treat current product cost as historical truth.
- Do not automatically repair duplicate projections, duplicate daily stats, tombstones, or projection mismatches.
- Do not use black-box scoring; every score component must remain explainable.

## 5. Preview Spec Dependency

Completed follow-up:

- `docs/SETTLEMENT_REPORT_PREVIEW_SPEC_2026_06_30.md`
- `tests/settlement-report-preview-spec.test.ts`

The Report Preview Spec includes visible UI states for these risk levels:

- `available`: section can show normal conclusion.
- `limited`: section can show a softened conclusion with a visible reason.
- `unavailable`: section must hide or replace the conclusion with a data-needed message.

The preview must also show:

- confidence level;
- affected sections;
- owner-facing explanation;
- next data action.

The preview spec does not start from visual layout first. It maps each distortion risk to the exact visible section behavior.

## 6. Stop Conditions

Stop for approval before:

- adding PDF generation;
- adding Excel generation;
- querying Supabase for reports;
- reading IndexedDB directly in the report model;
- repairing duplicate records;
- rebuilding projections;
- changing sync or recovery behavior.

## 7. Deferred Follow-Up Reminder

After the settlement report preview/spec original task is completed, remind the user to implement:

- `docs/ANALYTICS_SHARED_INSIGHT_CORE_PLAN_2026_06_30.md`

The purpose is to reuse the report model's insight-quality and distortion-risk logic in the analytics page without copying report-specific PDF, cover, or market rejoin content.
