import { v5 as uuidV5 } from 'uuid';
import { assertDateKey } from './date-key';

export const FERIA_RECURRING_OPERATIONS_NAMESPACE = 'fdcd24b4-50f8-4f38-a50c-5662647e3ae7';

export interface ScheduleOccurrenceIdentityInput {
  ownerId: string;
  scheduleId: string;
  localOccurrenceDate: string;
}

export function buildScheduleOccurrenceKey(input: ScheduleOccurrenceIdentityInput): string {
  if (!input.ownerId.trim()) throw new Error('ownerId is required');
  if (!input.scheduleId.trim()) throw new Error('scheduleId is required');
  assertDateKey(input.localOccurrenceDate, 'localOccurrenceDate');
  return `${input.ownerId}:${input.scheduleId}:${input.localOccurrenceDate}`;
}

export function deriveScheduledMarketId(input: ScheduleOccurrenceIdentityInput): string {
  return uuidV5(
    `scheduled-market:${buildScheduleOccurrenceKey(input)}`,
    FERIA_RECURRING_OPERATIONS_NAMESPACE,
  );
}

export function deriveScheduledMarketCreatedEventId(input: ScheduleOccurrenceIdentityInput): string {
  return uuidV5(
    `market-created:${buildScheduleOccurrenceKey(input)}`,
    FERIA_RECURRING_OPERATIONS_NAMESPACE,
  );
}

export function deriveScheduleReconcileEventId(
  input: ScheduleOccurrenceIdentityInput,
  revision: number,
): string {
  if (!Number.isInteger(revision) || revision < 1) throw new Error('revision must be a positive integer');
  return uuidV5(
    `schedule-reconcile:${buildScheduleOccurrenceKey(input)}:r${revision}`,
    FERIA_RECURRING_OPERATIONS_NAMESPACE,
  );
}
