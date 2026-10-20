import { db } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import type { Market, MarketUpdatedPayload } from '@/types/db';
import { addCalendarDays, toDateKeyInTimeZone } from './date-key';
import { deriveScheduleReconcileEventId, deriveScheduledMarketCreatedEventId } from './occurrence-identity';
import { planScheduleReconciliation } from './reconciliation';
import { buildScheduledMarketPayload, SCHEDULED_MARKET_HORIZON_DAYS } from './scheduled-market-materializer';
import type { OperationSchedule, ScheduleMarketActivity } from './types';
import { calculateWeeklyOccurrences } from './weekly-recurrence';

const ACTIVITY_EVENT_TYPES = new Set([
  'market_started', 'market_ended', 'interaction_recorded', 'deal_closed',
  'field_note_created', 'field_note_updated', 'field_note_deleted',
  'checklist_item_created', 'checklist_item_updated', 'checklist_item_deleted',
]);

export interface OwnerOperationAuthorization {
  ownerId: string;
  isOwner: boolean;
  now?: Date;
}

function assertOwnerAuthorization(
  schedule: Pick<OperationSchedule, 'owner_id'>,
  authorization: OwnerOperationAuthorization,
): void {
  if (!authorization.isOwner || !authorization.ownerId || schedule.owner_id !== authorization.ownerId) {
    throw new Error('Owner authorization is required for schedule occurrence changes');
  }
}

async function activityByMarketId(markets: readonly Market[]): Promise<Record<string, ScheduleMarketActivity>> {
  const result: Record<string, ScheduleMarketActivity> = {};
  for (const market of markets) {
    if (!market.id) continue;
    const events = await db.events.where('market_id').equals(market.id).toArray();
    const hasEventActivity = events.some(event => ACTIVITY_EVENT_TYPES.has(event.type));
    const hasDailyStats = (await db.dailyStats.where('marketId').equals(market.id).count()) > 0;
    if (hasEventActivity || hasDailyStats) {
      result[market.id] = {
        hasStarted: events.some(event => event.type === 'market_started'),
        hasEnded: events.some(event => event.type === 'market_ended'),
        hasDeals: events.some(event => event.type === 'deal_closed'),
        hasInteractions: events.some(event => event.type === 'interaction_recorded'),
        hasDailyStats,
        hasFieldNotes: events.some(event => event.type.startsWith('field_note_')),
        hasChecklistActivity: events.some(event => event.type.startsWith('checklist_item_')),
      };
    }
  }
  return result;
}

function occurrenceDate(market: Market): string {
  return market.dates?.[0] ?? market.startDate;
}

async function applyGeneratedMarketUpdate(
  market: Market,
  updates: MarketUpdatedPayload['updates'],
  schedule: OperationSchedule,
  deterministic: boolean,
): Promise<void> {
  const localOccurrenceDate = occurrenceDate(market);
  const eventId = deterministic
    ? deriveScheduleReconcileEventId({
      ownerId: schedule.owner_id,
      scheduleId: schedule.id,
      localOccurrenceDate,
    }, schedule.revision)
    : undefined;
  try {
    await recordEvent('market_updated', { market_id: market.id!, updates }, eventId);
  } catch (error) {
    if (!eventId) throw error;
    const current = await db.markets.get(market.id!);
    if (current?.scheduleRevision === schedule.revision && Object.entries(updates).every(([key, value]) => (
      JSON.stringify(current[key as keyof Market]) === JSON.stringify(value)
    ))) return;
    throw error;
  }
}

async function reconcileScheduleSnapshots(
  scheduleBefore: OperationSchedule,
  scheduleAfter: OperationSchedule,
  effectiveDate: string,
  deterministicRevision: boolean,
): Promise<void> {
  const venue = await db.venues.get(scheduleAfter.venueId);
  if (!venue || venue.owner_id !== scheduleAfter.owner_id) {
    throw new Error(`Active venue not found for schedule ${scheduleAfter.id}`);
  }
  const allExisting = await db.markets.where('scheduleId').equals(scheduleAfter.id).toArray();
  const throughDate = addCalendarDays(effectiveDate, SCHEDULED_MARKET_HORIZON_DAYS - 1);
  const scopedExisting = scheduleAfter.status === 'active'
    ? allExisting.filter(market => occurrenceDate(market) <= throughDate)
    : allExisting;
  const existingMarkets = scopedExisting.filter((market): market is Market & { id: string } => Boolean(market.id));
  const activity = await activityByMarketId(existingMarkets);
  const plan = planScheduleReconciliation({
    scheduleBefore,
    scheduleAfter,
    existingMarkets,
    activityByMarketId: activity,
    fromDate: effectiveDate,
    throughDate,
    effectiveDate,
  });

  for (const action of plan.actions) {
    if (action.kind === 'preserve' || action.kind === 'blocked') continue;
    if (action.kind === 'create') {
      const payload = buildScheduledMarketPayload(scheduleAfter, venue, action.occurrenceDate);
      const eventId = deriveScheduledMarketCreatedEventId({
        ownerId: scheduleAfter.owner_id,
        scheduleId: scheduleAfter.id,
        localOccurrenceDate: action.occurrenceDate,
      });
      try {
        await recordEvent('market_created', payload, eventId);
      } catch (error) {
        const current = await db.markets.get(action.marketId);
        if (current?.scheduleOccurrenceKey === action.occurrenceKey) continue;
        throw error;
      }
      continue;
    }

    const market = await db.markets.get(action.marketId);
    if (!market) throw new Error(`Scheduled Market not found: ${action.marketId}`);
    if (action.kind === 'suppress') {
      await applyGeneratedMarketUpdate(market, { scheduleOccurrenceState: 'suppressed' }, scheduleAfter, false);
    } else if (action.kind === 'mark_rule_removed') {
      await applyGeneratedMarketUpdate(market, { scheduleOccurrenceState: 'rule_removed', scheduleRevision: scheduleAfter.revision }, scheduleAfter, deterministicRevision);
    } else if (action.kind === 'restore') {
      const { marketId: _marketId, ...snapshot } = buildScheduledMarketPayload(scheduleAfter, venue, action.occurrenceDate);
      await applyGeneratedMarketUpdate(market, snapshot, scheduleAfter, deterministicRevision);
    } else if (action.kind === 'update_snapshot') {
      const { marketId: _marketId, ...snapshot } = buildScheduledMarketPayload(scheduleAfter, venue, action.occurrenceDate);
      await applyGeneratedMarketUpdate(market, snapshot, scheduleAfter, deterministicRevision);
    }
  }
}

export async function skipScheduledOccurrence(
  marketId: string,
  authorization: OwnerOperationAuthorization,
): Promise<void> {
  const market = await db.markets.get(marketId);
  if (!market?.scheduleId || market.sessionOrigin !== 'schedule') throw new Error('Scheduled Market not found');
  const schedule = await db.operationSchedules.get(market.scheduleId);
  if (!schedule) throw new Error('Operation schedule not found');
  assertOwnerAuthorization(schedule, authorization);
  if (market.status === 'ongoing' || market.status === 'completed') throw new Error('Active or completed occurrence cannot be skipped');
  const activity = await activityByMarketId([market]);
  if (activity[marketId]) throw new Error('Occurrence with user activity cannot be skipped');
  await recordEvent('market_updated', {
    market_id: marketId,
    updates: { scheduleOccurrenceState: 'skipped', status: 'cancelled' },
  });
}

export async function restoreSkippedScheduledOccurrence(
  marketId: string,
  authorization: OwnerOperationAuthorization,
): Promise<void> {
  const market = await db.markets.get(marketId);
  if (
    !market?.scheduleId
    || market.sessionOrigin !== 'schedule'
    || market.scheduleOccurrenceState !== 'skipped'
    || market.status !== 'cancelled'
  ) throw new Error('Skipped scheduled Market not found');

  const schedule = await db.operationSchedules.get(market.scheduleId);
  if (!schedule) throw new Error('Operation schedule not found');
  assertOwnerAuthorization(schedule, authorization);
  if (schedule.status !== 'active') {
    throw new Error('Operation schedule must be active before restoring an occurrence');
  }

  const localOccurrenceDate = occurrenceDate(market);
  const today = toDateKeyInTimeZone(authorization.now ?? new Date(), schedule.timezone);
  if (localOccurrenceDate < today) throw new Error('Past occurrence cannot be restored');
  if (!calculateWeeklyOccurrences(schedule, localOccurrenceDate, localOccurrenceDate).includes(localOccurrenceDate)) {
    throw new Error('Occurrence no longer matches the active schedule');
  }

  const activity = await activityByMarketId([market]);
  if (activity[marketId]) throw new Error('Occurrence with user activity cannot be restored');

  let updates: MarketUpdatedPayload['updates'] = {
    scheduleOccurrenceState: 'scheduled',
    status: 'registered',
  };
  if (!market.isScheduleOverride) {
    const venue = await db.venues.get(schedule.venueId);
    if (!venue || venue.owner_id !== schedule.owner_id || venue.status !== 'active' || venue.isDeleted) {
      throw new Error('Active venue not found for restored occurrence');
    }
    const { marketId: _marketId, ...currentScheduleSnapshot } = buildScheduledMarketPayload(
      schedule,
      venue,
      localOccurrenceDate,
    );
    updates = { ...currentScheduleSnapshot, status: 'registered' };
  }

  await recordEvent('market_updated', { market_id: marketId, updates });
}

export async function reviseOperationScheduleFromDate(
  scheduleId: string,
  effectiveDate: string,
  updates: Partial<Pick<OperationSchedule, 'recurrence' | 'startTime' | 'endTime' | 'endsNextDay' | 'defaults' | 'venueId' | 'name'>>,
  authorization: OwnerOperationAuthorization,
): Promise<void> {
  const scheduleBefore = await db.operationSchedules.get(scheduleId);
  if (!scheduleBefore) throw new Error('Operation schedule not found');
  assertOwnerAuthorization(scheduleBefore, authorization);
  const scheduleAfter: OperationSchedule = {
    ...scheduleBefore,
    ...updates,
    revision: scheduleBefore.revision + 1,
  };
  await recordEvent('operation_schedule_updated', {
    scheduleId,
    updates: { ...updates, revision: scheduleAfter.revision },
  });
  await reconcileScheduleSnapshots(scheduleBefore, scheduleAfter, effectiveDate, true);
}

export async function changeOperationScheduleStatus(
  scheduleId: string,
  status: 'paused' | 'active' | 'archived',
  authorization: OwnerOperationAuthorization,
): Promise<void> {
  const scheduleBefore = await db.operationSchedules.get(scheduleId);
  if (!scheduleBefore) throw new Error('Operation schedule not found');
  assertOwnerAuthorization(scheduleBefore, authorization);
  if (status === 'paused') await recordEvent('operation_schedule_paused', { scheduleId });
  if (status === 'active') await recordEvent('operation_schedule_resumed', { scheduleId });
  if (status === 'archived') await recordEvent('operation_schedule_archived', { scheduleId });
  const scheduleAfter = { ...scheduleBefore, status };
  const effectiveDate = toDateKeyInTimeZone(authorization.now ?? new Date(), scheduleBefore.timezone);
  await reconcileScheduleSnapshots(scheduleBefore, scheduleAfter, effectiveDate, false);
}
