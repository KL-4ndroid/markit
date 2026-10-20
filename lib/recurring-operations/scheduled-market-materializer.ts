import { db } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import type { Market, MarketCreatedPayload } from '@/types/db';
import { addCalendarDays, toDateKeyInTimeZone } from './date-key';
import {
  buildScheduleOccurrenceKey,
  deriveScheduledMarketCreatedEventId,
  deriveScheduledMarketId,
} from './occurrence-identity';
import type { OperationSchedule, Venue } from './types';
import { calculateWeeklyOccurrences } from './weekly-recurrence';

export const SCHEDULED_MARKET_HORIZON_DAYS = 56;

export interface EnsureScheduledMarketsOptions {
  ownerId: string;
  isOwner: boolean;
  now?: Date;
}

export interface ScheduledMarketMaterializationResult {
  createdMarketIds: string[];
  existingMarketIds: string[];
  conflicts: Array<{ scheduleId: string; occurrenceDate: string; reason: string }>;
}

export function buildScheduledMarketPayload(
  schedule: OperationSchedule,
  venue: Venue,
  occurrenceDate: string,
): MarketCreatedPayload & { marketId: string } {
  if (venue.owner_id !== schedule.owner_id) {
    throw new Error(`Venue owner mismatch for schedule ${schedule.id}`);
  }

  const identity = {
    ownerId: schedule.owner_id,
    scheduleId: schedule.id,
    localOccurrenceDate: occurrenceDate,
  };
  const defaults = schedule.defaults;

  return {
    marketId: deriveScheduledMarketId(identity),
    name: venue.name,
    location: venue.address ?? venue.locationNote ?? venue.name,
    dates: [occurrenceDate],
    startDate: occurrenceDate,
    endDate: occurrenceDate,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    operatingStartTime: schedule.startTime,
    operatingEndTime: schedule.endTime,
    registrationFee: defaults.registrationFee ?? 0,
    boothCost: defaults.boothCost ?? 0,
    deposit: defaults.deposit,
    tableRental: defaults.tableRental,
    chairRental: defaults.chairRental,
    umbrellaRental: defaults.umbrellaRental,
    tableclothRental: defaults.tableclothRental,
    commissionRate: defaults.commissionRate,
    tableFree: defaults.tableFree,
    chairFree: defaults.chairFree,
    umbrellaFree: defaults.umbrellaFree,
    tableclothFree: defaults.tableclothFree,
    notes: defaults.notes,
    venueId: venue.id,
    scheduleId: schedule.id,
    sessionOrigin: 'schedule',
    scheduleOccurrenceKey: buildScheduleOccurrenceKey(identity),
    scheduleRevision: schedule.revision,
    scheduleOccurrenceState: 'scheduled',
    isScheduleOverride: false,
  };
}

function isMatchingMaterializedMarket(
  market: Market | undefined,
  occurrenceKey: string,
): boolean {
  return Boolean(
    market
    && market.sessionOrigin === 'schedule'
    && market.scheduleOccurrenceKey === occurrenceKey
  );
}

/**
 * Owner-only, platform-neutral orchestrator that keeps the next eight weeks of
 * compatibility Markets available locally. Deterministic IDs make retries and
 * separate devices converge on the same event and Market identities.
 */
export async function ensureScheduledMarkets(
  options: EnsureScheduledMarketsOptions,
): Promise<ScheduledMarketMaterializationResult> {
  if (!options.isOwner || !options.ownerId.trim()) {
    throw new Error('Owner authorization is required to materialize scheduled markets');
  }
  if (!db.isOpen()) await db.open();

  const schedules = (await db.operationSchedules.where('owner_id').equals(options.ownerId).toArray())
    .filter(schedule => schedule.status === 'active');
  const venues = await db.venues.where('owner_id').equals(options.ownerId).toArray();
  const venueById = new Map(venues.map(venue => [venue.id, venue]));
  const result: ScheduledMarketMaterializationResult = {
    createdMarketIds: [],
    existingMarketIds: [],
    conflicts: [],
  };

  for (const schedule of schedules) {
    const venue = venueById.get(schedule.venueId);
    if (!venue || venue.status !== 'active' || venue.isDeleted) {
      result.conflicts.push({
        scheduleId: schedule.id,
        occurrenceDate: schedule.recurrence.startDate,
        reason: 'active venue not found in owner scope',
      });
      continue;
    }

    const fromDate = toDateKeyInTimeZone(options.now ?? new Date(), schedule.timezone);
    const throughDate = addCalendarDays(fromDate, SCHEDULED_MARKET_HORIZON_DAYS - 1);
    const occurrenceDates = calculateWeeklyOccurrences(schedule, fromDate, throughDate);

    for (const occurrenceDate of occurrenceDates) {
      const payload = buildScheduledMarketPayload(schedule, venue, occurrenceDate);
      const marketId = payload.marketId;
      const occurrenceKey = payload.scheduleOccurrenceKey!;
      const existing = await db.markets.get(marketId);

      if (existing) {
        if (isMatchingMaterializedMarket(existing, occurrenceKey)) {
          result.existingMarketIds.push(marketId);
        } else {
          result.conflicts.push({ scheduleId: schedule.id, occurrenceDate, reason: 'deterministic market id collision' });
        }
        continue;
      }

      const eventId = deriveScheduledMarketCreatedEventId({
        ownerId: schedule.owner_id,
        scheduleId: schedule.id,
        localOccurrenceDate: occurrenceDate,
      });

      try {
        await recordEvent('market_created', payload, eventId);
        result.createdMarketIds.push(marketId);
      } catch (error) {
        // A concurrent retry may win after our initial lookup. Only accept it
        // when the resulting deterministic snapshot matches this occurrence.
        const concurrent = await db.markets.get(marketId);
        if (isMatchingMaterializedMarket(concurrent, occurrenceKey)) {
          result.existingMarketIds.push(marketId);
          continue;
        }
        throw error;
      }
    }
  }

  return result;
}
