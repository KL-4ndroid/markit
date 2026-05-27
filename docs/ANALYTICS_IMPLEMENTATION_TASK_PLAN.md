# Analytics Implementation Task Plan

Last updated: 2026-05-27

This plan turns `docs/ANALYTICS_PRODUCT_PLAN.md` into small implementation steps. The goal is to make the analytics page recommendation-first while preserving existing working charts until replacements are stable.

## Current Completed Foundation

- Data completeness service: `lib/analytics/data-completeness.ts`
- Actionable insight service: `lib/analytics/actionable-insights.ts`
- Market recap service: `lib/analytics/market-recap.ts`
- Market trend service: `lib/analytics/market-trend.ts`
- First action summary card on `/analytics`
- Market recap card on `/analytics`
- Market-scope filter:
  - All
  - Recent 3 markets
  - Recent 10 markets
  - Single market

## Guiding Rule

Do not rewrite the whole analytics page in one pass.

Use this sequence instead:

1. Make recommendation-first UI the default.
2. Demote old charts into an advanced section.
3. Gate advanced sections with data completeness.
4. Replace low-value charts with market-session-based summaries.
5. Remove old analytics only after the replacement answers the same user question more clearly.

## Phase 1: Clarify Primary Vs Advanced UX

Goal:

Make the page communicate that `Key Recommendations` is the main experience and advanced metrics are optional supporting evidence.

Tasks:

- Rename user-facing `Full Analysis` to `Advanced Analysis`.
- Keep `Key Recommendations` as the default mode.
- Add short copy explaining that advanced metrics are supporting views.
- Keep existing chart rendering unchanged.

Definition of done:

- No calculation changes.
- No chart removals.
- Build, lint, and test pass.

Status:

- Completed: user-facing `Full Analysis` has been renamed to `Advanced Analysis`.
- Completed: advanced mode includes helper copy explaining that charts are supporting evidence.

## Phase 2: Data-Gated Advanced Analytics

Goal:

Prevent advanced cards from showing misleading analysis when data is too sparse or summary-only.

Tasks:

- Use `buildActionableAnalytics().dataCompleteness.capabilities` in the analytics page.
- Gate product affinity behind product-detail or full-behavior data.
- Gate interaction/time claims behind full-behavior data.
- Show clear locked-state copy instead of silently hiding everything.

Definition of done:

- Summary-only users still see useful market/cost guidance.
- Product and interaction-heavy analytics explain why they are unavailable.
- No event or DB schema changes.

Status:

- In progress: product affinity and product ranking are gated by product-level data completeness.

## Phase 3: Replace Calendar Trend With Market Trend

Goal:

Make trend analysis match how vendors operate: by market session, not by calendar day.

Tasks:

- Add a pure service for per-market revenue/profit trend.
- Add tests for all/recent/single market scopes.
- Add a simple market trend card.
- Keep the old daily revenue chart in advanced mode until the new trend card is stable.

Definition of done:

- Users can compare markets directly.
- The chart or card answers: "Are recent markets getting better or worse?"

Status:

- In progress: pure market trend service and regression tests have been added.
- Pending: connect the trend result to a user-facing market trend card.

## Phase 4: Product Recommendation Refinement

Goal:

Make product suggestions useful without requiring perfect inventory history.

Tasks:

- Improve product insights using quantity, revenue, and optional stock.
- Mark recommendations as estimated when cost or stock is incomplete.
- Avoid pricing recommendations unless cost and repeated sales are available.

Definition of done:

- Summary-only users are not shown product advice.
- Product-detail users get practical restock/promote/watch recommendations.

## Phase 5: Advanced Section Cleanup

Goal:

Reduce visual noise and remove low-value advanced sections only after replacements exist.

Tasks:

- Move health score, quadrant, product affinity, and KPI cards under Advanced Analysis.
- Add interpretation text to any KPI that remains.
- Consider removing or hiding daily revenue once market trend is stable.

Definition of done:

- Advanced analysis is clearly secondary.
- No primary screen space is dominated by abstract charts.

## Phase 6: Documentation And Regression Pass

Goal:

Keep the implementation plan, product plan, and UI behavior aligned.

Tasks:

- Update `ANALYTICS_PRODUCT_PLAN.md` after each major behavior change.
- Keep tests for data completeness, actionable insights, and market recap passing.
- Add focused tests for new pure analytics services.

Definition of done:

- The plan reflects the actual app behavior.
- All validation commands pass before push.
