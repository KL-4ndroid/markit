# P5-5 Operator Interaction Implementation

Date: 2026-06-19

## Scope

P5-5 opens the first staff write surface only:

- `canRecordInteraction`

The following write surfaces remain closed in staff UI:

- `canRecordDeal`
- backfill revenue / `AddRevenueDialog`
- product transaction grid
- field notes
- manager market/product edits
- owner-only actions

## UI Wiring

`components/markets/StaffMarketDetailView.tsx` now derives capabilities from:

- `useUserRole()`
- `deriveRoleCapabilities({ isOwner, staffRole })`
- `hasCapability(..., 'canRecordInteraction')`

The staff interaction recorder is gated by `canRecordInteraction`.

Deal/revenue/transaction entry points are gated behind `canRecordDeal`, which is intentionally `false` for P5-5.

`components/markets/DailyRevenueStats.tsx` now accepts `canAddRevenue?: boolean` with default `true`, so owner behavior remains unchanged while staff P5-5 can hide the backfill revenue button.

## Write Safety

The actual write still flows through:

```text
InteractionButtons -> recordInteraction -> recordEvent('interaction_recorded')
```

`recordEvent()` is already protected by the P5-4d role freshness gate:

```text
interaction_recorded -> canRecordInteraction
```

Staff stale/offline role cache is therefore fail-closed for this write surface.

## Tests

P5-5 boundary coverage lives in:

```text
tests/p5-5-operator-interaction.test.ts
```

It verifies:

- staff view consumes role capabilities
- interaction UI is gated by `canRecordInteraction`
- deal/revenue/transaction UI writes remain closed
- `DailyRevenueStats` can hide the add-revenue button
- interaction writes still route through the P5-4d freshness gate
