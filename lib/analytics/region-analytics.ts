import type { Market } from "@/types/db";
import {
  isMarketRegionCode,
  marketRegionLabel,
} from "@/lib/markets/market-region";
import {
  getEventMarketId,
  getTombstoneTargetEventId,
  type EventLike,
} from "@/lib/events/event-read-model";

export interface RegionProduct {
  id: string;
  name: string;
  quantity: number;
  revenueCents: number;
  unknown: boolean;
}
export interface RegionRow {
  code: string | null;
  label: string;
  revenueCents: number;
  marketCount: number;
  recordedMarketCount: number;
  recordedDayCount: number;
  averageCents: number | null;
  detailRevenueCents: number;
  products: RegionProduct[];
  statuses: Record<string, number>;
  markets: Array<{ id: string; name: string }>;
}
export interface RegionAnalyticsInput {
  ownerId: string;
  markets: Market[];
  events: EventLike[];
  startDate: string;
  endDate: string;
  today: string;
  productNames?: Map<string, string>;
}
export function validRegionDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return (
    Number.isFinite(ms) && new Date(ms).toISOString().slice(0, 10) === value
  );
}
export function regionMoneyCents(value: unknown): number | null {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(Math.round(value * 100)) ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.0001
  )
    return null;
  return Math.round(value * 100);
}
function revenue(event: EventLike): number | null {
  const p = event.payload ?? {},
    direct =
      p.manualRevenue ?? p.manual_revenue ?? p.totalAmount ?? p.total_amount;
  if (direct !== undefined) return regionMoneyCents(direct);
  if (!Array.isArray(p.items) || p.items.length === 0) return null;
  let total = 0;
  for (const item of p.items) {
    const price = regionMoneyCents(
        item.price_at_time_of_sale ?? item.priceAtTimeOfSale ?? item.price,
      ),
      q = item.quantity;
    if (price === null || !Number.isSafeInteger(q) || q < 0) return null;
    total += price * q;
  }
  return Number.isSafeInteger(total) ? total : null;
}
export function buildRegionAnalytics(input: RegionAnalyticsInput) {
  if (
    !input.ownerId ||
    !validRegionDate(input.startDate) ||
    !validRegionDate(input.endDate) ||
    !validRegionDate(input.today) ||
    input.startDate > input.endDate
  )
    throw new Error("請選擇有效的起訖日期。");
  const end = input.endDate < input.today ? input.endDate : input.today;
  const owned = new Map(
    input.markets
      .filter(
        (m) =>
          m.id &&
          m.owner_id === input.ownerId &&
          !m.isDeleted &&
          m.access_type !== "staff",
      )
      .map((m) => [m.id!, m]),
  );
  const rows = new Map<string, RegionRow>(),
    sets = new Map<
      string,
      {
        markets: Set<string>;
        recorded: Set<string>;
        days: Set<string>;
        products: Map<string, RegionProduct>;
      }
    >();
  const get = (market: Market | undefined) => {
    const code = isMarketRegionCode(market?.regionCode)
        ? market.regionCode
        : null,
      key = code ?? "unclassified";
    if (!rows.has(key)) {
      rows.set(key, {
        code,
        label: marketRegionLabel(code),
        revenueCents: 0,
        marketCount: 0,
        recordedMarketCount: 0,
        recordedDayCount: 0,
        averageCents: null,
        detailRevenueCents: 0,
        products: [],
        statuses: {},
        markets: [],
      });
      sets.set(key, {
        markets: new Set(),
        recorded: new Set(),
        days: new Set(),
        products: new Map(),
      });
    }
    return { row: rows.get(key)!, set: sets.get(key)! };
  };
  const include = (market: Market) => {
    const { row, set } = get(market);
    if (!set.markets.has(market.id!)) {
      set.markets.add(market.id!);
      row.statuses[market.status] = (row.statuses[market.status] ?? 0) + 1;
      row.markets.push({ id: market.id!, name: market.name });
    }
  };
  for (const market of owned.values()) {
    const overlap = market.dates?.length
      ? market.dates.some(
          (d) => validRegionDate(d) && d >= input.startDate && d <= end,
        )
      : market.startDate <= end && market.endDate >= input.startDate;
    if (overlap) include(market);
  }
  const scoped = input.events.filter((e) =>
    owned.has(getEventMarketId(e) ?? ""),
  );
  const unique = new Map(scoped.filter((e) => e.id).map((e) => [e.id!, e]));
  const deleted = new Set(
    [...unique.values()]
      .filter((e) => e.type === "deal_deleted")
      .map((e) => `${getEventMarketId(e)}:${getTombstoneTargetEventId(e)}`),
  );
  let undatedCount = 0,
    invalidAmountCount = 0,
    futureCount = 0,
    pendingCount = 0,
    detailSaleCount = 0,
    saleCount = 0,
    updatedAt = 0;
  const allRevenue = new Map<string, number>();
  for (const event of unique.values()) {
    if (
      (event.type === "deal_closed" || event.type === "deal_deleted") &&
      (event as EventLike & { sync_status?: string }).sync_status !== "synced"
    )
      pendingCount++;
    if (event.type !== "deal_closed") continue;
    const marketId = getEventMarketId(event)!;
    if (deleted.has(`${marketId}:${event.id}`)) continue;
    const cents = revenue(event);
    if (cents !== null)
      allRevenue.set(marketId, (allRevenue.get(marketId) ?? 0) + cents);
    const day = event.payload?.dealDate ?? event.payload?.deal_date;
    if (!validRegionDate(day)) {
      undatedCount++;
      continue;
    }
    if (day > input.today) {
      futureCount++;
      continue;
    }
    if (day < input.startDate || day > end) continue;
    if (cents === null) {
      invalidAmountCount++;
      continue;
    }
    const market = owned.get(marketId)!;
    include(market);
    const { row, set } = get(market);
    row.revenueCents += cents;
    set.recorded.add(marketId);
    set.days.add(`${marketId}:${day}`);
    saleCount++;
    const p = event.payload ?? {},
      items = Array.isArray(p.items) ? p.items : [];
    if (p.isManualEntry === true || p.is_manual_entry === true || !items.length)
      continue;
    const details = items.map(
      (item: Record<string, unknown>, index: number) => {
        const q = item.quantity,
          price = regionMoneyCents(
            item.price_at_time_of_sale ?? item.priceAtTimeOfSale ?? item.price,
          );
        if (!Number.isSafeInteger(q) || Number(q) < 0 || price === null)
          return null;
        const id = item.productId ?? item.product_id,
          snapshot = item.product_name ?? item.productName;
        const name =
          typeof snapshot === "string" && snapshot.trim()
            ? snapshot
            : typeof id === "string"
              ? input.productNames?.get(id)
              : undefined;
        return {
          id:
            typeof id === "string" && id ? id : `unknown:${event.id}:${index}`,
          name: name ?? "未識別商品",
          unknown: typeof id !== "string" || !id || !name,
          quantity: Number(q),
          weight: price * Number(q),
        };
      },
    );
    if (details.some((d: unknown) => d === null)) continue;
    const valid = details.filter((d: unknown) => d !== null) as Array<{
      id: string;
      name: string;
      unknown: boolean;
      quantity: number;
      weight: number;
    }>;
    const sum = valid.reduce((n, d) => n + d.weight, 0);
    if (!Number.isSafeInteger(sum) || (sum === 0 && cents !== 0)) continue;
    // Allocate integer cents only to priced items, leaving free lines at zero.
    let lastPriced = -1;
    valid.forEach((d, index) => {
      if (d.weight > 0) lastPriced = index;
    });
    let allocated = 0;
    valid.forEach((d, index) => {
      const amount =
        d.weight === 0
          ? 0
          : index === lastPriced
            ? cents - allocated
            : Number((BigInt(cents) * BigInt(d.weight)) / BigInt(sum));
      allocated += amount;
      const old = set.products.get(d.id) ?? {
        id: d.id,
        name: d.name,
        unknown: d.unknown,
        quantity: 0,
        revenueCents: 0,
      };
      old.quantity += d.quantity;
      old.revenueCents += amount;
      set.products.set(d.id, old);
    });
    row.detailRevenueCents += cents;
    detailSaleCount++;
  }
  get(undefined); // Unclassified is always visible, including a zero amount.
  for (const [key, row] of rows) {
    const set = sets.get(key)!;
    row.marketCount = set.markets.size;
    row.recordedMarketCount = set.recorded.size;
    row.recordedDayCount = set.days.size;
    row.averageCents = set.days.size
      ? Math.round(row.revenueCents / set.days.size)
      : null;
    row.products = [...set.products.values()].sort(
      (a, b) => b.revenueCents - a.revenueCents || a.name.localeCompare(b.name),
    );
  }
  let projectionMismatchCount = 0;
  for (const market of owned.values()) {
    updatedAt = Math.max(updatedAt, market.updatedAt || 0);
    const total = regionMoneyCents(market.totalRevenue);
    if (total !== null && total !== (allRevenue.get(market.id!) ?? 0))
      projectionMismatchCount++;
  }
  const list = [...rows.values()].sort((a, b) =>
    a.code === null
      ? 1
      : b.code === null
        ? -1
        : b.revenueCents - a.revenueCents || a.label.localeCompare(b.label),
  );
  const totalRevenueCents = list.reduce((n, r) => n + r.revenueCents, 0),
    totalMarkets = list.reduce((n, r) => n + r.marketCount, 0),
    unclassified = list.find((r) => r.code === null)!;
  if (!Number.isSafeInteger(totalRevenueCents))
    throw new Error("金額超出安全計算範圍。");
  return {
    rows: list,
    totalRevenueCents,
    totalMarkets,
    classifiedMarketCount: totalMarkets - unclassified.marketCount,
    classifiedRevenueCents: totalRevenueCents - unclassified.revenueCents,
    undatedCount,
    invalidAmountCount,
    futureCount,
    pendingCount,
    projectionMismatchCount,
    saleCount,
    detailSaleCount,
    updatedAt,
  };
}
