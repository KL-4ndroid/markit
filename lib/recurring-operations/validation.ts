import { isDateKey, isValidTimeZone } from './date-key';
import type { OperationSchedule } from './types';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export interface ScheduleValidationIssue {
  field: string;
  code: string;
}

export function validateOperationSchedule(
  schedule: Pick<OperationSchedule, 'owner_id' | 'venueId' | 'timezone' | 'recurrence' | 'startTime' | 'endTime' | 'revision'>,
): ScheduleValidationIssue[] {
  const issues: ScheduleValidationIssue[] = [];
  if (!schedule.owner_id.trim()) issues.push({ field: 'owner_id', code: 'required' });
  if (!schedule.venueId.trim()) issues.push({ field: 'venueId', code: 'required' });
  if (!isValidTimeZone(schedule.timezone)) issues.push({ field: 'timezone', code: 'invalid' });
  if (schedule.recurrence.frequency !== 'weekly') issues.push({ field: 'recurrence.frequency', code: 'unsupported' });
  if (schedule.recurrence.interval !== 1) issues.push({ field: 'recurrence.interval', code: 'unsupported' });
  const uniqueWeekdays = new Set(schedule.recurrence.weekdays);
  if (uniqueWeekdays.size < 1 || uniqueWeekdays.size !== schedule.recurrence.weekdays.length) {
    issues.push({ field: 'recurrence.weekdays', code: 'invalid' });
  }
  if ([...uniqueWeekdays].some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    issues.push({ field: 'recurrence.weekdays', code: 'invalid' });
  }
  if (!isDateKey(schedule.recurrence.startDate)) issues.push({ field: 'recurrence.startDate', code: 'invalid' });
  if (schedule.recurrence.endDate && !isDateKey(schedule.recurrence.endDate)) {
    issues.push({ field: 'recurrence.endDate', code: 'invalid' });
  }
  if (
    schedule.recurrence.endDate
    && isDateKey(schedule.recurrence.startDate)
    && isDateKey(schedule.recurrence.endDate)
    && schedule.recurrence.endDate < schedule.recurrence.startDate
  ) {
    issues.push({ field: 'recurrence.endDate', code: 'before_start' });
  }
  if (!TIME_PATTERN.test(schedule.startTime)) issues.push({ field: 'startTime', code: 'invalid' });
  if (!TIME_PATTERN.test(schedule.endTime)) issues.push({ field: 'endTime', code: 'invalid' });
  if (!Number.isInteger(schedule.revision) || schedule.revision < 1) issues.push({ field: 'revision', code: 'invalid' });
  return issues;
}

export function assertValidOperationSchedule(
  schedule: Pick<OperationSchedule, 'owner_id' | 'venueId' | 'timezone' | 'recurrence' | 'startTime' | 'endTime' | 'revision'>,
): void {
  const issues = validateOperationSchedule(schedule);
  if (issues.length > 0) {
    throw new Error(`Invalid operation schedule: ${issues.map(issue => `${issue.field}:${issue.code}`).join(', ')}`);
  }
}
