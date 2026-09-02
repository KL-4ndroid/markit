import type { ScheduleOccurrenceState } from './types';

export interface ScheduleOccurrenceVisibilityInput {
  sessionOrigin?: 'manual' | 'schedule' | 'legacy';
  scheduleOccurrenceState?: ScheduleOccurrenceState;
}

/**
 * Normal operational surfaces only show active schedule occurrences.
 * Hidden states remain stored for audit, sync, restore, and deduplication.
 */
export function isScheduleOccurrenceVisible(
  market: ScheduleOccurrenceVisibilityInput,
): boolean {
  return market.sessionOrigin !== 'schedule'
    || market.scheduleOccurrenceState === undefined
    || market.scheduleOccurrenceState === 'scheduled';
}
