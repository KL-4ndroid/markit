import assert from "node:assert/strict";
import {
  buildRegionAnalytics,
  type RegionAnalyticsInput,
} from "../lib/analytics/region-analytics";
import {
  prepareRegionBackfill,
  invalidateRegionBackfillScope,
  regionBackfillEpoch,
} from "../lib/markets/market-region-backfill";
import { resolveAnalyticsSubscriptionView } from "../lib/analytics/subscription-view";
import type { Market } from "../types/db";
const market = (id: string, extras: Partial<Market> = {}): Market => ({
  id,
  owner_id: "owner",
  name: id,
  location: "新竹，不能推斷縣市",
  startDate: "2026-09-30",
  endDate: "2026-10-25",
  dates: ["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-25"],
  status: "completed",
  createdAt: 1,
  updatedAt: 1,
  ...extras,
});
const deal = (
  id: string,
  marketId: string,
  day: string,
  amount: number,
  items: unknown[] = [],
) => ({
  id,
  market_id: marketId,
  type: "deal_closed",
  sync_status: "synced",
  payload: { dealDate: day, totalAmount: amount, items },
});
const input: RegionAnalyticsInput = {
  ownerId: "owner",
  markets: [
    market("a", { regionCode: "tw-tainan-city" }),
    market("b"),
    market("cancel", { status: "cancelled" }),
    market("future", {
      startDate: "2026-10-25",
      endDate: "2026-10-25",
      dates: ["2026-10-25"],
    }),
    market("outside", { owner_id: "other" }),
    market("staff", { access_type: "staff" }),
    market("gone", { isDeleted: true }),
  ],
  events: [
    deal("old", "a", "2026-09-30", 700),
    deal("one", "a", "2026-10-01", 100, [
      { productId: "p", product_name: "商品甲", quantity: 2, price: 50 },
    ]),
    deal("two", "a", "2026-10-02", 200),
    deal("zero", "b", "2026-10-01", 0),
    deal("same-day", "b", "2026-10-02", 50),
    deal("canceled-sale", "cancel", "2026-10-02", 20),
    deal("retracted", "a", "2026-10-01", 999),
    {
      id: "delete",
      market_id: "a",
      type: "deal_deleted",
      sync_status: "synced",
      payload: { eventId: "retracted" },
    },
    {
      id: "delete2",
      market_id: "a",
      type: "deal_deleted",
      sync_status: "synced",
      payload: { event_id: "retracted" },
    },
    deal("unknown-region", "b", "2026-10-02", 10),
    deal("not-yet", "future", "2026-10-25", 123),
    deal("scope", "outside", "2026-10-01", 9000),
    deal("staff-sale", "staff", "2026-10-01", 9000),
    deal("deleted-market", "gone", "2026-10-01", 9000),
  ],
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  today: "2026-10-24",
};
const model = buildRegionAnalytics(input),
  tainan = model.rows.find((r) => r.code === "tw-tainan-city")!,
  unknown = model.rows.find((r) => r.code === null)!;
assert.equal(model.totalRevenueCents, 38000);
assert.equal(tainan.revenueCents, 30000);
assert.equal(tainan.recordedMarketCount, 1);
assert.equal(tainan.recordedDayCount, 2);
assert.equal(tainan.averageCents, 15000);
assert.equal(unknown.revenueCents, 8000);
assert.equal(unknown.marketCount, 2);
assert.equal(unknown.recordedDayCount, 3);
assert.equal(unknown.statuses.cancelled, 1);
assert.equal(model.futureCount, 1);
assert.equal(tainan.products[0].quantity, 2);
assert.equal(tainan.products[0].revenueCents, 10000);
assert.equal(tainan.detailRevenueCents, 10000);
assert.equal(model.classifiedMarketCount, 1);
const reclassified = buildRegionAnalytics({
  ...input,
  markets: input.markets.map((m) =>
    m.id === "b" ? { ...m, regionCode: "tw-tainan-city", updatedAt: 3 } : m,
  ),
});
assert.equal(reclassified.totalRevenueCents, model.totalRevenueCents);
assert.equal(
  reclassified.rows.find((r) => r.code === "tw-tainan-city")!.recordedDayCount,
  4,
);
assert.equal(
  reclassified.rows.find((r) => r.code === null)!.revenueCents,
  2000,
);
assert.equal(reclassified.updatedAt, 3);
assert.equal(
  input.markets[1].regionCode,
  undefined,
  "classification report never writes inferred addresses",
);
assert.equal(
  buildRegionAnalytics({
    ...input,
    startDate: "2026-10-02",
    endDate: "2026-10-02",
  }).rows.find((r) => r.code === "tw-tainan-city")!.averageCents,
  20000,
);
assert.throws(() =>
  buildRegionAnalytics({ ...input, startDate: "2026-02-30" }),
);
assert.throws(() =>
  buildRegionAnalytics({
    ...input,
    startDate: "2026-10-20",
    endDate: "2026-10-01",
  }),
);
const discount = buildRegionAnalytics({
  ...input,
  markets: [market("a")],
  events: [
    deal("discount", "a", "2026-10-01", 0.29, [
      { productId: "p", quantity: 1, price: 0.2 },
      { quantity: 1, price: 0.2 },
    ]),
  ],
});
assert.equal(
  discount.rows[0].products.reduce((n, p) => n + p.revenueCents, 0),
  29,
);
assert.ok(discount.rows[0].products.some((p) => p.unknown));
const freeLine = buildRegionAnalytics({
  ...input,
  markets: [market("a")],
  events: [
    deal("free-line", "a", "2026-10-01", 0.03, [
      { productId: "p1", quantity: 1, price: 1 },
      { productId: "p2", quantity: 1, price: 1 },
      { productId: "gift", quantity: 1, price: 0 },
    ]),
  ],
});
assert.equal(
  freeLine.rows[0].products.find((p) => p.id === "gift")!.revenueCents,
  0,
);
assert.equal(
  freeLine.rows[0].products.reduce((sum, p) => sum + p.revenueCents, 0),
  3,
);
const poor = buildRegionAnalytics({
  ...input,
  events: [
    { ...deal("missing", "a", "", 10), sync_status: "pending" },
    deal("invalid", "a", "2026-10-01", Number.NaN),
  ],
});
assert.equal(poor.undatedCount, 1);
assert.equal(poor.invalidAmountCount, 1);
assert.equal(poor.pendingCount, 1);
assert.equal(poor.totalRevenueCents, 0);
assert.equal(
  poor.rows.find((r) => r.code === "tw-tainan-city")!.averageCents,
  null,
);
const empty = buildRegionAnalytics({
  ...input,
  markets: [market("a", { totalRevenue: 500 })],
  events: [],
});
assert.equal(empty.projectionMismatchCount, 1);
assert.ok(empty.rows.some((r) => r.code === null));
const choices = [
  {
    id: "a",
    name: "A",
    location: "原地點",
    startDate: "2026-10-01",
    endDate: "2026-10-01",
    updatedAt: "2026-10-24T00:00:00Z",
  },
];
assert.deepEqual(prepareRegionBackfill(choices, { a: "tw-tainan-city" }), [
  {
    id: "a",
    regionCode: "tw-tainan-city",
    expectedUpdatedAt: "2026-10-24T00:00:00Z",
  },
]);
assert.throws(() => prepareRegionBackfill(choices, { a: "新竹" }));
assert.throws(() => prepareRegionBackfill(choices, { b: "tw-tainan-city" }));
assert.throws(() => prepareRegionBackfill(choices, {}));
const epoch = regionBackfillEpoch();
invalidateRegionBackfillScope();
assert.equal(regionBackfillEpoch(), epoch + 1);
const blocked = {
    allowed: false as const,
    reason: "plan_required" as const,
    requiredPlan: "pro" as const,
  },
  allowed = { allowed: true as const };
for (const range of ["all", "recent3", "recent10", "single"] as const) {
  assert.equal(
    resolveAnalyticsSubscriptionView({
      range,
      tab: "regions",
      basicAccess: allowed as never,
      advancedAccess: blocked as never,
    }).mode,
    "blocked",
  );
  assert.equal(
    resolveAnalyticsSubscriptionView({
      range,
      tab: "regions",
      basicAccess: allowed as never,
      advancedAccess: allowed as never,
    }).mode,
    "full",
  );
}
console.log(
  "Region period, scope, cancellation, tombstone, coverage, product allocation, reclassification and gate checks passed",
);
