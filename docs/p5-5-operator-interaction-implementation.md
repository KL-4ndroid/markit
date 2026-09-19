# P5-5 Operator Interaction Implementation

Date: 2026-06-19

## Scope

P5-5 opens staff on-site write surfaces:

- `canRecordInteraction`
- `canRecordDeal`

The following write surfaces were outside the original P5-5 change and are governed by later gates/docs:

- field notes
- manager market/product edits
- owner-only actions

## UI Wiring

`components/markets/StaffMarketDetailView.tsx` now derives capabilities from:

- `useUserRole()`
- `deriveRoleCapabilities({ isOwner, staffRole })`
- `hasCapability(..., 'canRecordInteraction')`
- `hasCapability(..., 'canRecordDeal')`

The staff interaction recorder is gated by `canRecordInteraction`.

Deal/revenue/transaction entry points are gated behind `canRecordDeal`.

`components/markets/DailyRevenueStats.tsx` now accepts `canAddRevenue?: boolean` with default `true`, so owner behavior remains unchanged while staff P5-5 can hide the backfill revenue button.

## Write Safety

The actual write still flows through:

```text
InteractionButtons -> recordInteraction -> recordEvent('interaction_recorded')
QuickInteractionButtons / QuickTransactionGrid / AddRevenueDialog -> recordDeal -> recordEvent('deal_closed')
```

`recordEvent()` is already protected by the P5-4d role freshness gate:

```text
interaction_recorded -> canRecordInteraction
deal_closed -> canRecordDeal
```

Staff stale role cache is therefore fail-closed for these write surfaces.

Current transaction-log delete scope:

- operator: delete own same-day deal/interaction records
- manager: delete same-day deal/interaction records, including records created by other staff
- owner: full owner delete behavior

Deal record editing is still not opened for staff.

## Tests

P5-5 boundary coverage lives in:

```text
tests/p5-5-operator-interaction.test.ts
```

It verifies:

- staff view consumes role capabilities
- interaction UI is gated by `canRecordInteraction`
- deal/revenue/transaction UI writes are gated by `canRecordDeal`
- `DailyRevenueStats` can show the add-revenue button through `canRecordDeal`
- interaction writes still route through the P5-4d freshness gate
