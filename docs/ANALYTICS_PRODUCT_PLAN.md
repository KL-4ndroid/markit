# Analytics Product Plan

Last updated: 2026-05-26

Status: planning document only. No production code changes in this step.

## 1. Product Direction

Market Pulse should not treat analytics as a generic chart dashboard. The target user is a market vendor who needs practical answers:

- Which markets are worth joining again?
- Which products should I restock, reduce, or promote?
- Did booth and rental costs eat too much profit?
- Which customer interactions lead to sales?
- What should I do differently at the next market?

The next analytics phase should turn raw records into action-oriented recommendations.

## 2. Current Data Sources

Existing data that can support useful analytics:

| Source | Available signals |
|---|---|
| `markets` | market dates, location, status, fees, rental costs, total revenue, total profit, total interactions, total deals |
| `products` | category, price, cost, stock, active status |
| `events` | market lifecycle, product lifecycle, interactions, deals, deletion tombstones |
| `dailyStats` | revenue, cost, profit, deal count, interaction counts, productsSold |
| deal payloads | sold product, quantity, price at sale, cost at sale, payment method, manual entry flag |
| interaction payloads | interaction type, productIds, notes |

Important limitation:

- Some historical records may be incomplete or manually entered.
- Analytics must show reliability/confidence when data volume is low or when data is mostly manual entries.
- Some vendors may only record a daily total after the market closes. This is valid usage and must not be treated as failure.

## 3. Problems In The Current Analytics Experience

The current analytics page already contains many concepts:

- ROI ranking
- AOV ranking
- market health score
- quadrant analysis
- product affinity
- daily revenue
- top products
- unlock gates

The main issue is not lack of features. The issue is that the page does not clearly prioritize user decisions.

Observed product risks:

- Too many advanced metrics are shown before the user understands what to do.
- Some labels and explanatory text have encoding corruption.
- Several calculations happen directly in the page component.
- Direct `db` reads still appear in analytics flows.
- The page is long and hard to scan on mobile.
- Charts may be less useful than short recommendations for the target user.

## 4. Analytics Principles

Use these rules for future analytics work:

1. Every metric must answer a user question.
2. Every analysis card should include an interpretation.
3. Show confidence and data requirements for advanced insights.
4. Prefer a small number of action cards over many charts.
5. Use plain language before formulas.
6. Avoid shaming language. Use supportive operational suggestions.
7. Keep analytics read-only. Do not add write flows inside analytics until the data layer is stable.
8. Do not modify event history for analytics.
9. Detect data granularity before showing recommendations.
10. Do not show product, pricing, interaction, or time-based suggestions when the underlying data is not detailed enough.

## 5. Data Completeness And Adaptive Analytics

The analytics experience must adapt to how the vendor actually records data.

Some users will record every product sale in real time. Others may only add one manual total after the market ends because the booth is busy. Both workflows are valid. The app should provide the best available analysis for each workflow instead of forcing all users into the same data model.

### Data Recording Levels

| Level | Recording style | Available analysis | Do not show yet |
|---|---|---|---|
| Level 1: Summary only | User records total revenue/cost after the market | market performance, cost pressure, basic rejoin guidance | product restock, pricing suggestions, time-of-day analysis, product ranking |
| Level 2: Transaction amount | User records transactions or deal count, but no product detail | revenue trend, average order value, conversion rate if interactions exist | product restock, product pricing, product affinity |
| Level 3: Product detail | User records product, quantity, price, and cost | product ranking, restock suggestions, margin warnings, basic pricing hints | precise time-of-day analysis if timestamps are incomplete |
| Level 4: Full behavior | User records products, interactions, and real-time activity | interaction conversion, time patterns, product affinity, market recap, richer recommendations | none, but still show confidence labels |

### Capability Matrix

| Capability | Minimum level | Required signals |
|---|---|---|
| Market performance | Level 1 | revenue, cost or market fees |
| Cost pressure | Level 1 | booth cost, rental cost, revenue |
| Rejoin guidance | Level 1 | revenue, cost, market status, at least one completed market |
| Average order value | Level 2 | revenue and deal count |
| Conversion rate | Level 2 | interactions and deals |
| Product ranking | Level 3 | productId, quantity, revenue |
| Restock suggestion | Level 3 | product sales and preferably stock |
| Pricing suggestion | Level 3 | price, quantity, cost, repeated product sales |
| Interaction conversion | Level 4 | interaction events and deal events in comparable market/day context |
| Time-of-day insight | Level 4 | reliable event timestamps recorded during operation |

### UI Behavior By Level

When data is Level 1:

- Show market performance, cost pressure, and simple rejoin guidance.
- Explain that product and interaction insights need more detailed records.
- Suggest one lightweight next step, such as recording the top 3 products next time.

When data is Level 2:

- Show revenue trend, average order value, and conversion if interactions exist.
- Avoid product-level recommendations.
- Suggest using quick product buttons for best sellers.

When data is Level 3:

- Show product ranking, restock suggestions, and margin warnings.
- Avoid time-of-day claims unless timestamps are reliable.

When data is Level 4:

- Show full insights, including interaction conversion and market recap.
- Still include confidence labels when sample size is small.

### Example Copy

For summary-only users:

```text
Your current records are enough for market performance and cost analysis.
Product restock suggestions need product-level sales. Next time, try recording just your top 3 products with quick buttons.
```

For product-detail users:

```text
Product-level insights are available. Restock recommendations are based on recorded quantities and revenue. Pricing suggestions are estimates unless product cost is complete.
```

For full-behavior users:

```text
Detailed insights are available. Interaction and timing suggestions are based on real-time records from this market.
```

### Suggested Service Boundary

Future implementation should start with a read-only service:

```text
lib/analytics/data-completeness.ts
```

Suggested types:

```ts
export type AnalyticsDataLevel =
  | 'summary_only'
  | 'transaction_amount'
  | 'product_detail'
  | 'full_behavior';

export interface AnalyticsCapability {
  marketPerformance: boolean;
  costPressure: boolean;
  rejoinGuidance: boolean;
  averageOrderValue: boolean;
  conversionRate: boolean;
  productRanking: boolean;
  restockSuggestion: boolean;
  pricingSuggestion: boolean;
  interactionConversion: boolean;
  timeOfDayInsight: boolean;
}
```

This service should be pure and tested before changing the analytics page UI.

## 6. Recommended Analytics Modules

### Module A: Market Decision Score

User question:

Should I join this market again?

Core inputs:

- net profit
- hourly profit
- booth cost recovery
- conversion rate
- average order value
- total interactions
- number of data points

Suggested outputs:

- Strong rejoin
- Rejoin with adjustments
- Observe one more time
- Avoid for now

Example recommendation:

```text
This market is worth joining again. Profit per hour was above your recent average, and booth cost was recovered early. Next time, bring more of the top-selling product.
```

Minimum implementation:

- Use existing market metrics.
- Add a simple action label and one explanation sentence.
- Show confidence: low / medium / high.

### Module B: Product Restock And Pricing Suggestions

User question:

Which products should I restock, promote, or reduce?

Core inputs:

- quantity sold
- revenue
- profit
- stock remaining
- sell-through rate when stock is available
- sale frequency across markets

Suggested outputs:

- Restock
- Promote more
- Test higher price
- Reduce stock
- Retire or redesign

Example recommendation:

```text
Restock this item before the next market. It had the highest unit sales and healthy profit. If stock ran out early, consider increasing quantity by 20-30%.
```

Minimum implementation:

- Start with productsSold and deal payloads.
- Do not require perfect inventory history for the first version.
- Mark recommendations as "estimated" when stock data is incomplete.

### Module C: Interaction Conversion Insights

User question:

Which customer interactions are most likely to lead to sales?

Core inputs:

- interaction type count
- deals in same market/day
- conversion rate per market
- productIds attached to interactions when available

Suggested outputs:

- Best interaction type
- Underused interaction type
- High interaction but low conversion warning

Example recommendation:

```text
Questions are frequent but conversion is low. Try preparing a shorter product pitch or a bundled offer for visitors who ask about this product.
```

Minimum implementation:

- Avoid overclaiming direct causality.
- Use correlation language: "associated with", "appears to".
- Require enough interactions before showing advanced conclusions.

### Module D: Cost Pressure Analysis

User question:

Are market costs too high for my sales level?

Core inputs:

- boothCost
- registrationFee
- rentals
- commission
- revenue
- gross profit
- net profit

Suggested outputs:

- Healthy cost
- Watch cost
- Cost pressure
- Not enough data

Example recommendation:

```text
Costs consumed too much of this market's revenue. Consider joining only if you can lower rental costs, share a booth, or bring higher-margin products.
```

Minimum implementation:

- Start with fixed cost / revenue and net profit.
- Show exact cost breakdown.
- Avoid complex formulas in the first UI.

### Module E: Market Recap Report

User question:

What happened in this market, and what should I do next time?

Core sections:

- Result summary
- Best product
- Weak product
- Interaction pattern
- Cost warning
- Next action checklist

Example output:

```text
This market performed well. Revenue and profit were above your recent average. The strongest product was Product A. The main opportunity is conversion: interactions were high, but deal count did not increase at the same pace.

Next time:
1. Restock Product A.
2. Prepare a bundle offer.
3. Track which product visitors ask about most.
```

Minimum implementation:

- Generate deterministic text from existing metrics.
- Do not call an external AI model.
- Use local rule-based templates first.

## 7. Homepage And Navigation Improvements

The homepage should become an operational dashboard, not only a navigation entry.

Recommended sections:

- Today / this week markets
- Pending actions:
  - waiting for announcement
  - waiting for payment
  - upcoming market preparation
- Recent result summary
- Data health:
  - last backup
  - recovery check suggestion
  - low data confidence notice

Good homepage question:

```text
What should I pay attention to today?
```

## 8. Market Detail UI Direction

Market detail should support two states:

### Live Mode

For market day operations:

- Large action buttons
- Fast deal recording
- Fast interaction recording
- today's revenue
- today's deals
- stock warning
- quick undo or delete entry path

### Review Mode

For after-market review:

- total revenue
- cost and net profit
- best product
- interaction summary
- market recap report
- rejoin recommendation

Avoid hiding live actions under too many advanced panels.

## 9. Analytics Page Information Architecture

Recommended first screen:

1. Period selector
2. Data completeness and reliability notice
3. Top action card
4. Market decision cards
5. Cost pressure card
6. Product suggestions when available
7. Advanced analysis section when available

Advanced section can keep:

- quadrant grid
- product affinity
- daily revenue chart
- health score ranking

But these should be secondary, not the first thing users see.

## 10. Data Reliability Rules

Add reliability labels to analytics:

| Label | Suggested condition |
|---|---|
| Low confidence | fewer than 3 markets with revenue |
| Medium confidence | 3-7 markets with revenue |
| High confidence | 8+ markets with revenue |

Show clear copy:

```text
Insights are early. Record more markets before relying on ranking and trend suggestions.
```

Do not lock all value behind data volume. Instead:

- show simple summaries early,
- show advanced ranking later,
- explain why some insights are limited.

## 11. UIUX Direction

General UI goals:

- Mobile-first.
- More scan-friendly.
- Fewer charts above the fold.
- Larger tap targets for market-day actions.
- Clear card hierarchy.
- Avoid deeply nested cards.
- Keep dense operational tools compact.
- Remove or repair corrupted UI copy before redesigning analytics.

Analytics card pattern:

```text
Title
Primary number or label
Plain-language interpretation
Recommended next action
Confidence label
Data completeness label
```

Example:

```text
Rejoin Recommendation
Rejoin with adjustments
Profit was healthy, but booth cost pressure was high.
Next action: reduce rental cost or bring higher-margin products.
Confidence: Medium
Data: Product detail
```

## 12. Implementation Order

### Phase A: Planning And Copy Cleanup

Goal:

Make analytics understandable before changing calculations.

Tasks:

1. Replace corrupted analytics UI copy.
2. Rename sections around user questions, not formulas.
3. Document current metrics and their meaning.
4. Add empty states with next steps.
5. Add data completeness labels to planned analytics states.

Risk:

Low.

### Phase B: Analytics Summary Service

Goal:

Move page-level analytics summary calculation into a service.

Suggested file:

```text
lib/analytics/actionable-insights.ts
```

Prerequisite:

```text
lib/analytics/data-completeness.ts
```

Suggested outputs:

- data level
- available capabilities
- market recommendations
- product recommendations
- cost pressure warnings
- data reliability
- recap text

Risk:

Medium. Keep read-only and test pure functions.

### Phase C: First Actionable Cards

Goal:

Add simple recommendation cards to the analytics page.

Start with:

1. Rejoin recommendation
2. Cost pressure warning
3. Product restock suggestion only when data completeness allows it

Risk:

Medium. Avoid changing existing analytics engines at first.

### Phase D: Market Recap

Goal:

Add a deterministic recap report on market detail or analytics page.

Risk:

Medium. Requires careful text rules and data reliability labels.

### Phase E: Advanced Analytics Cleanup

Goal:

Move quadrant, affinity, and health score into a clearly labeled advanced section.

Risk:

Medium to high if UI is heavily refactored. Do this after core cards are stable.

## 13. What Not To Do Yet

Do not do these in the next UIUX phase:

- Do not rewrite `lib/analytics` engines from scratch.
- Do not add external AI model calls for analytics.
- Do not modify event payloads for analytics.
- Do not change database schema just for charts.
- Do not add a large dashboard redesign in one commit.
- Do not refactor `app/analytics/page.tsx` and change metrics at the same time.
- Do not move market-day actions into analytics.
- Do not show detailed product or interaction suggestions for summary-only users.
- Do not penalize users for using manual total entry.

## 14. Recommended Next Task

Start with a low-risk planning-to-implementation bridge:

```text
docs: audit analytics page copy and UX structure
```

Then:

```text
refactor: add analytics data completeness service
test: cover analytics data completeness rules
refactor: add actionable analytics insight service
test: cover actionable analytics insight rules
feat: add analytics action summary cards
```

Each step should be reviewed and verified independently.
