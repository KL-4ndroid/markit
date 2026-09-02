# P5-6 Manager Basic Edit Implementation

Date: 2026-06-19

## Confirmed Scope

P5-6 opens existing-record basic edit for `manager`.

It does not open:

- create market
- create product
- delete market
- delete product
- market status transitions
- settings / staff management
- deal/revenue writes

## Manager Market Edit Whitelist

Manager may update:

- `dates`
- `startDate`
- `endDate`
- `earlyEntryEnabled`
- `earlyEntryTime`
- `checkInTime`
- `operatingStartTime`
- `operatingEndTime`
- `notes`

Manager may not update:

- `name`
- `location`
- market financial fields such as `boothCost`, `deposit`, rentals, and `commissionRate`
- owner-only / staff-management fields

## Manager Product Edit Whitelist

Manager may update:

- `price`
- `stock`
- `unlimitedStock`
- `description`
- `isActive`

Manager may not update:

- `name`
- `category`
- `cost`
- delete product

## Runtime Enforcement

`lib/permissions/role-freshness.ts` now enforces:

- staff owner-only events are blocked, including create/delete/status/settings events
- `market_updated` staff payloads must only contain the market whitelist fields
- `product_updated` staff payloads must only contain the product whitelist fields

UI gating is intentionally secondary. The write path is still protected through:

```text
recordEvent() -> assertFreshStaffCapability()
```

## UI Wiring

- `StaffMarketDetailView` exposes manager market edit with `canEditMarketBasic`.
- `EditMarketForm mode="manager"` hides owner-only market fields and submits only whitelisted fields.
- `ProductsPage` exposes manager product edit with `canEditProductBasic`.
- `ProductCard` stays read-only for staff unless `canEdit` is explicitly passed.
- `EditProductForm mode="manager"` hides owner-only product fields and submits only whitelisted fields.

## Tests

Boundary coverage lives in:

```text
tests/p5-6-manager-basic-edit.test.ts
```
