import { addCalendarDays, assertDateKey, getCalendarWeekday } from './date-key';
import { assertValidOperationSchedule } from './validation';
import type { OperationSchedule } from './types';

export function calculateWeeklyOccurrences(
  schedule: OperationSchedule,
  fromDate: string,
  throughDate: string,
): string[] {
  assertValidOperationSchedule(schedule);
  assertDateKey(fromDate, 'fromDate');
  assertDateKey(throughDate, 'throughDate');
  if (throughDate < fromDate) return [];
  if (schedule.status !== 'active') return [];

  const lowerBound = fromDate > schedule.recurrence.startDate ? fromDate : schedule.recurrence.startDate;
  const configuredEnd = schedule.recurrence.endDate;
  const upperBound = configuredEnd && configuredEnd < throughDate ? configuredEnd : throughDate;
  if (upperBound < lowerBound) return [];

  const weekdays = new Set(schedule.recurrence.weekdays);
  const occurrences: string[] = [];
  for (let current = lowerBound; current <= upperBound; current = addCalendarDays(current, 1)) {
    if (weekdays.has(getCalendarWeekday(current))) occurrences.push(current);
  }
  return occurrences;
}
