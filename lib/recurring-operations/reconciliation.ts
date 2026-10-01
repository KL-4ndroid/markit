import { buildScheduleOccurrenceKey, deriveScheduledMarketId } from './occurrence-identity';
import { calculateWeeklyOccurrences } from './weekly-recurrence';
import type {
  OperationSchedule,
  ReconciliationAction,
  ReconciliationPlan,
  ScheduleMarketActivity,
  ScheduledMarketCandidate,
} from './types';

export interface PlanScheduleReconciliationInput {
  scheduleBefore?: OperationSchedule;
  scheduleAfter: OperationSchedule;
  existingMarkets: readonly ScheduledMarketCandidate[];
  activityByMarketId?: Readonly<Record<string, ScheduleMarketActivity | undefined>>;
  fromDate: string;
  throughDate: string;
  effectiveDate?: string;
}

export function hasScheduleMarketUserActivity(activity?: ScheduleMarketActivity): boolean {
  if (!activity) return false;
  return Boolean(
    activity.hasStarted
    || activity.hasEnded
    || activity.hasDeals
    || activity.hasInteractions
    || activity.hasDailyStats
    || activity.hasFieldNotes
    || activity.hasChecklistActivity
  );
}

function occurrenceDateForMarket(market: ScheduledMarketCandidate): string {
  return market.dates?.[0] ?? market.startDate;
}

function sortActions(actions: ReconciliationAction[]): ReconciliationAction[] {
  return actions.sort((left, right) => (
    left.occurrenceDate.localeCompare(right.occurrenceDate)
    || left.kind.localeCompare(right.kind)
  ));
}

export function planScheduleReconciliation(input: PlanScheduleReconciliationInput): ReconciliationPlan {
  const { scheduleAfter, existingMarkets, activityByMarketId = {}, fromDate, throughDate } = input;
  const targetOccurrenceDates = calculateWeeklyOccurrences(scheduleAfter, fromDate, throughDate);
  const targetSet = new Set(targetOccurrenceDates);
  const effectiveDate = input.effectiveDate ?? fromDate;
  const seenTargetDates = new Set<string>();
  const actions: ReconciliationAction[] = [];

  for (const market of existingMarkets) {
    const occurrenceDate = occurrenceDateForMarket(market);
    if (market.scheduleId !== scheduleAfter.id || market.sessionOrigin !== 'schedule') {
      actions.push({ kind: 'preserve', marketId: market.id, occurrenceDate, reason: 'outside_schedule' });
      continue;
    }

    if (market.owner_id && market.owner_id !== scheduleAfter.owner_id) {
      actions.push({ kind: 'blocked', marketId: market.id, occurrenceDate, reason: 'owner_scope_mismatch' });
      continue;
    }

    if (targetSet.has(occurrenceDate)) seenTargetDates.add(occurrenceDate);

    if (occurrenceDate < effectiveDate) {
      actions.push({ kind: 'preserve', marketId: market.id, occurrenceDate, reason: 'before_effective_date' });
      continue;
    }
    if (market.isScheduleOverride) {
      actions.push({ kind: 'preserve', marketId: market.id, occurrenceDate, reason: 'single_occurrence_override' });
      continue;
    }
    if (market.scheduleOccurrenceState === 'skipped') {
      actions.push({ kind: 'preserve', marketId: market.id, occurrenceDate, reason: 'explicitly_skipped' });
      continue;
    }
    if (market.status === 'ongoing' || market.status === 'completed') {
      actions.push({ kind: 'blocked', marketId: market.id, occurrenceDate, reason: 'ongoing_or_completed' });
      continue;
    }
    if (hasScheduleMarketUserActivity(activityByMarketId[market.id])) {
      actions.push({ kind: 'blocked', marketId: market.id, occurrenceDate, reason: 'user_activity_present' });
      continue;
    }

    if (scheduleAfter.status !== 'active') {
      if (market.scheduleOccurrenceState === 'suppressed') {
        actions.push({ kind: 'preserve', marketId: market.id, occurrenceDate, reason: 'already_current' });
      } else {
        actions.push({ kind: 'suppress', marketId: market.id, occurrenceDate });
      }
      continue;
    }

    if (!targetSet.has(occurrenceDate)) {
      if (market.scheduleOccurrenceState === 'rule_removed') {
        actions.push({ kind: 'preserve', marketId: market.id, occurrenceDate, reason: 'already_current' });
      } else {
        actions.push({ kind: 'mark_rule_removed', marketId: market.id, occurrenceDate });
      }
      continue;
    }

    if (market.scheduleOccurrenceState === 'suppressed' || market.scheduleOccurrenceState === 'rule_removed') {
      actions.push({ kind: 'restore', marketId: market.id, occurrenceDate, targetRevision: scheduleAfter.revision });
    } else if (market.scheduleRevision !== scheduleAfter.revision) {
      actions.push({ kind: 'update_snapshot', marketId: market.id, occurrenceDate, targetRevision: scheduleAfter.revision });
    } else {
      actions.push({ kind: 'preserve', marketId: market.id, occurrenceDate, reason: 'already_current' });
    }
  }

  if (scheduleAfter.status === 'active') {
    for (const occurrenceDate of targetOccurrenceDates) {
      if (occurrenceDate < effectiveDate || seenTargetDates.has(occurrenceDate)) continue;
      const identity = {
        ownerId: scheduleAfter.owner_id,
        scheduleId: scheduleAfter.id,
        localOccurrenceDate: occurrenceDate,
      };
      actions.push({
        kind: 'create',
        occurrenceDate,
        occurrenceKey: buildScheduleOccurrenceKey(identity),
        marketId: deriveScheduledMarketId(identity),
      });
    }
  }

  return { actions: sortActions(actions), targetOccurrenceDates };
}
