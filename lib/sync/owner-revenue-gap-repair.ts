/**
 * Owner Revenue Gap Repair Service
 *
 * Conservative repair for markets where:
 * - local revenue = 0
 * - local has 0 deal_closed events
 * - cloud has revenue > 0 and deal_closed events > 0
 *
 * These are markets that have never been synced (zero-risk: no double-count possible).
 * All other gap patterns are skipped with a reason.
 */

import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase/client';
import { eventHandlers } from '@/lib/db/events';
import { normalizeEventPayloadForLocal } from '@/lib/data-mappers';
import { getDealEventCount, getDealEventRevenue } from '@/lib/events/event-read-model';
import { createCanonicalSyncedEvent } from '@/lib/sync/synced-event-factory';
import type { Event, Market } from '@/types/db';

// Re-exported result shapes for callers
export interface OwnerRevenueGapRepairOptions {
  /** Owner user ID. Required. Blank string throws. */
  ownerId: string;
  /** Optional: limit to specific market IDs. If omitted, all local owner markets are checked. */
  marketIds?: string[];
  /** If true, fetch and check but do not write to IndexedDB. */
  dryRun?: boolean;
  /**
   * Optional Supabase client override.
   * Allows tests to inject a mock without fighting the ESM module cache.
   * Defaults to the real supabase client from '@/lib/supabase/client'.
   */
  supabaseClient?: SupabaseClientLike;
}

export type OwnerRevenueGapRepairMode = 'repair' | 'hydrate_details_only';

/**
 * Loose type describing only the Supabase client surface we use.
 * Tests can pass a plain object with a `from` method without matching
 * the full postgrest-js type signature.
 */
export interface SupabaseClientLike {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (field: string, value: unknown) => {
        eq: (field2: string, value2: unknown) => {
          order: (
            field: string,
            opts: { ascending: boolean }
          ) => Promise<{
            data: CloudEvent[] | null;
            error: unknown;
          }>;
        };
        single: () => Promise<{
          data: { total_revenue: number; total_deals: number } | null;
          error: unknown;
        }>;
      };
    };
  };
}

interface CloudEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  actor_id: string;
  market_id: string;
  timestamp: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface RepairedMarket {
  marketId: string;
  cloudRevenue: number;
  cloudDeals: number;
  localRevenueBefore: number;
  localRevenueAfter: number;
  replayedEvents: number;
}

export interface SkippedMarket {
  marketId: string;
  reason:
    | 'local_market_not_found'
    | 'cloud_market_not_found'
    | 'already_in_sync'
    | 'local_revenue_exceeds_cloud'
    | 'partial_gap_not_supported'
    | 'local_deal_events_exist'
    | 'local_daily_stats_exist'
    | 'cloud_revenue_not_positive'
    | 'cloud_deals_not_positive'
    | 'cloud_deal_events_empty';
}

export interface OwnerRevenueGapRepairResult {
  repaired: RepairedMarket[];
  skipped: SkippedMarket[];
  warnings: string[];
}

function assertNonBlank(value: string, name: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} must be a non-blank string`);
  }
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export type OwnerDetailEventHydrationOptions = OwnerRevenueGapRepairOptions;

/**
 * Returns true when the market is owner-accessible:
 * owner_id matches the given userId, OR access_type is not 'staff'.
 * Legacy markets with no owner_id and no access_type are treated as owner.
 */
function isOwnerMarket(market: Market, ownerId: string): boolean {
  if (market.owner_id === ownerId) return true;
  if (!market.owner_id && !market.access_type) return true;
  if (market.access_type !== 'staff') return true;
  return false;
}

/**
 * Replay a single event into IndexedDB, using the exported eventHandlers.
 * Mirrors the logic from hooks/useSync.ts but does not rely on the private
 * `replayEvents` function.
 */
async function replayOneEvent(
  rawEvent: Record<string, unknown>
): Promise<void> {
  const existing = await db.events.get(rawEvent.id as string);
  if (existing) return;

  const localEvent = createCanonicalSyncedEvent(rawEvent);
  await db.events.add(localEvent);

  const handler = eventHandlers[rawEvent.type as keyof typeof eventHandlers];
  if (!handler) return;

  const processedPayload = normalizeEventPayloadForLocal(localEvent.payload);
  await handler(
    {
      id: localEvent.id,
      type: localEvent.type,
      payload: processedPayload,
      timestamp: localEvent.timestamp,
      actor_id: localEvent.actor_id,
      market_id: localEvent.market_id,
    } as Event,
    db
  );
}

async function persistEventWithoutReplay(
  rawEvent: Record<string, unknown>
): Promise<boolean> {
  const existing = await db.events.get(rawEvent.id as string);
  if (existing) return false;

  await db.events.add(createCanonicalSyncedEvent(rawEvent));

  return true;
}

async function resetLocalMarketStatsProjection(
  marketId: string,
  dailyStats: Array<{ id?: number }>
): Promise<void> {
  await db.transaction('rw', [db.markets, db.dailyStats], async () => {
    for (const stat of dailyStats) {
      if (stat.id !== undefined) {
        await db.dailyStats.delete(stat.id);
      }
    }

    await db.markets.update(marketId, {
      totalRevenue: 0,
      totalProfit: 0,
      totalDeals: 0,
      totalInteractions: 0,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Repair owner revenue gaps by replaying missing deal_closed events for
 * markets that have never been synced (local revenue = 0, local deal_closed count = 0,
 * cloud revenue > 0, cloud deal_closed count > 0).
 *
 * All other gap patterns are skipped with a reason.
 */
export async function repairOwnerRevenueGaps(
  options: OwnerRevenueGapRepairOptions
): Promise<OwnerRevenueGapRepairResult> {
  return runOwnerRevenueGapRepair(options, 'repair');
}

export async function hydrateOwnerMissingDetailEvents(
  options: OwnerDetailEventHydrationOptions
): Promise<OwnerRevenueGapRepairResult> {
  return runOwnerRevenueGapRepair(options, 'hydrate_details_only');
}

async function runOwnerRevenueGapRepair(
  options: OwnerRevenueGapRepairOptions,
  mode: OwnerRevenueGapRepairMode
): Promise<OwnerRevenueGapRepairResult> {
  assertNonBlank(options.ownerId, 'ownerId');

  const { ownerId, marketIds, dryRun = false, supabaseClient } = options;
  const client: SupabaseClientLike =
    supabaseClient ?? (supabase as unknown as SupabaseClientLike);

  const repaired: RepairedMarket[] = [];
  const skipped: SkippedMarket[] = [];
  const warnings: string[] = [];

  // --- 1. Resolve target market IDs ---
  if (marketIds && marketIds.length > 0) {
    for (const marketId of marketIds) {
      const market = await db.markets.get(marketId);

      if (!market) {
        skipped.push({ marketId, reason: 'local_market_not_found' });
        continue;
      }

      if (!isOwnerMarket(market, ownerId)) continue;

      await processOneMarket(
        market,
        dryRun,
        client,
        mode,
        repaired,
        skipped,
        warnings
      );
    }
  } else {
    const allMarkets = await db.markets.toArray();
    const ownerMarkets = allMarkets.filter(m => isOwnerMarket(m, ownerId));

    for (const market of ownerMarkets) {
      await processOneMarket(
        market,
        dryRun,
        client,
        mode,
        repaired,
        skipped,
        warnings
      );
    }
  }

  return { repaired, skipped, warnings };
}

/**
 * Evaluate a single market for repair eligibility and perform the repair
 * or skip it.
 */
async function processOneMarket(
  market: Market,
  dryRun: boolean,
  client: SupabaseClientLike,
  mode: OwnerRevenueGapRepairMode,
  repaired: RepairedMarket[],
  skipped: SkippedMarket[],
  warnings: string[]
): Promise<void> {
  const marketId = market.id!;
  const localRevenue = toFiniteNumber(market.totalRevenue, 0);

  // --- Local deal_closed count (IndexedDB) ---
  const localDeals = await db.events
    .where('market_id')
    .equals(marketId)
    .and(e => e.type === 'deal_closed')
    .toArray();

  // --- Local dailyStats check (止血：防止已有統計的市場被重放) ---
  const localDailyStats = await db.dailyStats
    .where('marketId')
    .equals(marketId)
    .toArray();
  const localDailyStatsRevenueSum = localDailyStats.reduce(
    (sum, s) => sum + (s.revenue || 0),
    0
  );
  const localDailyStatsDealCountSum = localDailyStats.reduce(
    (sum, s) => sum + (s.dealCount || 0),
    0
  );

  // --- Cloud market stats ---
  const marketResult = await client
    .from('markets')
    .select('total_revenue, total_deals')
    .eq('id', marketId)
    .single();

  const cloudMarket = marketResult?.data ?? null;
  const marketError = marketResult?.error;

  if (marketError || !cloudMarket) {
    skipped.push({ marketId, reason: 'cloud_market_not_found' });
    return;
  }

  const cloudRevenue = toFiniteNumber(cloudMarket.total_revenue, 0);
  const cloudDeals = toFiniteNumber(cloudMarket.total_deals, 0);

  // --- Cloud deal_closed events ---
  // Supabase .order() returns Promise<{ data, error }>
  const eventsResult = await client
    .from('events')
    .select('*')
    .eq('market_id', marketId)
    .eq('type', 'deal_closed')
    .order('timestamp', { ascending: true });

  const cloudDealEvents: CloudEvent[] = eventsResult.data ?? [];
  const cloudEventRevenue = cloudDealEvents.reduce(
    (sum, event) => sum + getDealEventRevenue(event),
    0
  );
  const cloudEventDeals = cloudDealEvents.reduce(
    (sum, event) => sum + getDealEventCount(event),
    0
  );
  const expectedRevenue = cloudRevenue > 0 ? cloudRevenue : cloudEventRevenue;
  const expectedDeals = cloudDeals > 0 ? cloudDeals : cloudEventDeals;
  const hasMissingDetailEventsOnly =
    localRevenue === expectedRevenue &&
    localDailyStatsRevenueSum === expectedRevenue &&
    localDailyStatsDealCountSum === expectedDeals &&
    localDeals.length < cloudDealEvents.length &&
    cloudDealEvents.length > 0;
  const hasInflatedLocalProjection =
    localDeals.length === 0 &&
    cloudDealEvents.length > 0 &&
    expectedRevenue > 0 &&
    (
      localRevenue > expectedRevenue ||
      localDailyStatsRevenueSum > expectedRevenue ||
      localDailyStatsDealCountSum > expectedDeals
    );

  // --- Apply decision rules ---
  if (mode === 'hydrate_details_only') {
    if (!hasMissingDetailEventsOnly) {
      skipped.push({ marketId, reason: localDailyStatsRevenueSum > 0 ? 'local_daily_stats_exist' : 'already_in_sync' });
      return;
    }

    const localEventIds = new Set(localDeals.map(e => e.id!));
    const trulyMissing = cloudDealEvents.filter(
      e => !localEventIds.has(e.id)
    );

    if (dryRun) {
      repaired.push({
        marketId,
        cloudRevenue: expectedRevenue,
        cloudDeals: expectedDeals,
        localRevenueBefore: localRevenue,
        localRevenueAfter: localRevenue,
        replayedEvents: trulyMissing.length,
      });
      return;
    }

    let persisted = 0;
    for (const event of trulyMissing) {
      const didPersist = await persistEventWithoutReplay(event as unknown as Record<string, unknown>);
      if (didPersist) persisted += 1;
    }

    repaired.push({
      marketId,
      cloudRevenue: expectedRevenue,
      cloudDeals: expectedDeals,
      localRevenueBefore: localRevenue,
      localRevenueAfter: localRevenue,
      replayedEvents: persisted,
    });
    return;
  }

  if (
    localRevenue === 0 &&
    localDeals.length === 0 &&
    localDailyStatsRevenueSum === 0 &&
    localDailyStatsDealCountSum === 0 &&
    cloudRevenue > 0 &&
    cloudDeals > 0 &&
    cloudDealEvents.length > 0
  ) {
    // === V1 ALLOWED: zero-to-cloud ===
    if (dryRun) {
      repaired.push({
        marketId,
        cloudRevenue,
        cloudDeals,
        localRevenueBefore: localRevenue,
        localRevenueAfter: localRevenue,
        replayedEvents: 0,
      });
      return;
    }

    // --- Deduplicate against existing local events ---
    const localEventIds = new Set(localDeals.map(e => e.id!));
    const trulyMissing = cloudDealEvents.filter(
      e => !localEventIds.has(e.id)
    );

    if (trulyMissing.length < cloudDealEvents.length) {
      warnings.push(
        `market ${marketId}: ${cloudDealEvents.length - trulyMissing.length} deal_closed events already exist locally, replaying ${trulyMissing.length} missing`
      );
    }

    if (trulyMissing.length === 0) {
      skipped.push({ marketId, reason: 'cloud_deal_events_empty' });
      return;
    }

    // --- Replay ---
    for (const event of trulyMissing) {
      await replayOneEvent(event as unknown as Record<string, unknown>);
    }

    // --- Read back projected result ---
    const updatedMarket = await db.markets.get(marketId);
    const localRevenueAfter = toFiniteNumber(
      updatedMarket?.totalRevenue,
      0
    );

    repaired.push({
      marketId,
      cloudRevenue,
      cloudDeals,
      localRevenueBefore: localRevenue,
      localRevenueAfter,
      replayedEvents: trulyMissing.length,
    });
  } else if (hasMissingDetailEventsOnly) {
    const localEventIds = new Set(localDeals.map(e => e.id!));
    const trulyMissing = cloudDealEvents.filter(
      e => !localEventIds.has(e.id)
    );

    if (dryRun) {
      repaired.push({
        marketId,
        cloudRevenue: expectedRevenue,
        cloudDeals: expectedDeals,
        localRevenueBefore: localRevenue,
        localRevenueAfter: localRevenue,
        replayedEvents: trulyMissing.length,
      });
      return;
    }

    let persisted = 0;
    for (const event of trulyMissing) {
      const didPersist = await persistEventWithoutReplay(event as unknown as Record<string, unknown>);
      if (didPersist) persisted += 1;
    }

    repaired.push({
      marketId,
      cloudRevenue: expectedRevenue,
      cloudDeals: expectedDeals,
      localRevenueBefore: localRevenue,
      localRevenueAfter: localRevenue,
      replayedEvents: persisted,
    });
  } else if (hasInflatedLocalProjection) {
    if (dryRun) {
      repaired.push({
        marketId,
        cloudRevenue: expectedRevenue,
        cloudDeals: expectedDeals,
        localRevenueBefore: localRevenue,
        localRevenueAfter: expectedRevenue,
        replayedEvents: cloudDealEvents.length,
      });
      return;
    }

    await resetLocalMarketStatsProjection(marketId, localDailyStats);

    for (const event of cloudDealEvents) {
      await replayOneEvent(event as unknown as Record<string, unknown>);
    }

    const updatedMarket = await db.markets.get(marketId);
    const localRevenueAfter = toFiniteNumber(
      updatedMarket?.totalRevenue,
      0
    );

    repaired.push({
      marketId,
      cloudRevenue: expectedRevenue,
      cloudDeals: expectedDeals,
      localRevenueBefore: localRevenue,
      localRevenueAfter,
      replayedEvents: cloudDealEvents.length,
    });
  } else if (localDailyStatsRevenueSum > 0 || localDailyStatsDealCountSum > 0) {
    skipped.push({ marketId, reason: 'local_daily_stats_exist' });
  } else if (cloudRevenue === localRevenue && localRevenue > 0) {
    skipped.push({ marketId, reason: 'already_in_sync' });
  } else if (localRevenue > cloudRevenue) {
    skipped.push({ marketId, reason: 'local_revenue_exceeds_cloud' });
  } else if (localRevenue > 0 && localRevenue < cloudRevenue) {
    skipped.push({ marketId, reason: 'partial_gap_not_supported' });
  } else if (localDeals.length > 0) {
    skipped.push({ marketId, reason: 'local_deal_events_exist' });
  } else if (cloudRevenue <= 0) {
    skipped.push({ marketId, reason: 'cloud_revenue_not_positive' });
  } else if (cloudDeals <= 0) {
    skipped.push({ marketId, reason: 'cloud_deals_not_positive' });
  } else {
    // cloudDealEvents.length === 0 but cloud revenue > 0 — edge case
    skipped.push({ marketId, reason: 'cloud_deal_events_empty' });
  }
}
