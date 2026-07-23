# Web UI/UX baseline

Date: 2026-07-23

## Review target

- Production build reviewed: `0.1.0 (61461a6)`
- Mobile viewport: approximately `631 x 689`
- Desktop viewport: `1440 x 900`
- Review mode: authenticated read-only walkthrough
- No destructive action, payment action, data write, or permission change was performed.

## Routes covered

- Home and Today workflow
- Market list: active, preparing, ended
- Preparing and ended market detail
- Products
- Analytics and its available tabs
- Settlement/report view
- Settings index and account, team, sales, data, and app sections
- Recovery
- Subscription
- Theme Lab

## Baseline findings

1. Sync trust was weakened because an untouched runtime could display "data synced" before the first sync check had completed.
2. Subscription screens displayed a simulated free plan, payment card, renewal date, and cancellation flow without an entitlement or billing source.
3. Date, time, and currency presentation varied between list, detail, analytics, and report surfaces.
4. Mobile navigation was usable, but the web experience still needs a later desktop information architecture pass.
5. Role refresh continuity and fail-closed permission handling are existing safety constraints and must remain intact.

## Initial score baseline

| Area | Score |
| --- | ---: |
| Information clarity and trust | 6.5 / 10 |
| Workflow continuity | 7.0 / 10 |
| Visual consistency | 7.0 / 10 |
| Mobile usability | 7.5 / 10 |
| Desktop web usability | 5.5 / 10 |
| Overall | 6.7 / 10 |

## Slice 0 and Slice 1 acceptance

- A synced label requires a non-null `lastSyncAt`.
- An idle runtime with no previous sync is shown as waiting for its first check.
- Subscription is explicitly a preview until a real entitlement and billing source exists.
- No fake current plan, payment method, renewal date, cancellation, or upgrade success is displayed.
- Date-only values are formatted without timezone shifting.
- Market list ranges preserve the compact `YYYY/M/DD~DD` contract.
- Clock values do not expose stored seconds in primary user-facing screens.
- Negative currency places the minus sign before the currency symbol.

## Platform guardrails

- Web work must remain compatible with future iOS and Android packaging.
- Browser APIs must stay behind existing platform adapters where an adapter exists.
- Do not add web-only persistence, navigation, upload, lifecycle, or permission assumptions.
- Do not alter Capacitor/native projects until that workstream resumes.
- Do not weaken role freshness checks, fail-closed gates, pending-write protection, or sync ownership boundaries.

## Later review gates

- Slice 2: workflow and empty/error/recovery states
- Slice 3: desktop web shell and information density
- Slice 4: accessibility and interaction polish
- Slice 5: performance and release verification

Each later slice must be reviewed at both the mobile and desktop viewports above, with key routes recorded before scores are updated.
