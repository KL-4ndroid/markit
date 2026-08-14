import { db } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import { generateUUID } from '@/lib/db/uuid';
import type {
  OperationScheduleCreatedPayload,
  OperationScheduleUpdatedPayload,
  VenueCreatedPayload,
  VenueUpdatedPayload,
} from '@/types/db';
import { assertValidOperationSchedule } from './validation';
import { changeOperationScheduleStatus, type OwnerOperationAuthorization } from './schedule-operations';

export async function createVenue(
  input: Omit<VenueCreatedPayload, 'venueId'> & { venueId?: string },
): Promise<string> {
  const venueId = input.venueId ?? generateUUID();
  await recordEvent('venue_created', { ...input, venueId });
  return venueId;
}

export async function updateVenue(
  venueId: string,
  updates: VenueUpdatedPayload['updates'],
): Promise<void> {
  await recordEvent('venue_updated', { venueId, updates });
}

export async function archiveVenue(venueId: string): Promise<void> {
  await recordEvent('venue_archived', { venueId });
}

export async function createOperationSchedule(
  input: Omit<OperationScheduleCreatedPayload, 'scheduleId' | 'revision'> & {
    scheduleId?: string;
    revision?: number;
  },
): Promise<string> {
  const scheduleId = input.scheduleId ?? generateUUID();
  const revision = input.revision ?? 1;
  const payload: OperationScheduleCreatedPayload = { ...input, scheduleId, revision };
  assertValidOperationSchedule({ ...payload, owner_id: 'local' });
  await recordEvent('operation_schedule_created', payload);
  return scheduleId;
}

export async function updateOperationSchedule(
  scheduleId: string,
  updates: OperationScheduleUpdatedPayload['updates'],
): Promise<void> {
  const current = await db.operationSchedules.get(scheduleId);
  if (!current) throw new Error(`Operation schedule not found: ${scheduleId}`);

  const next = {
    ...current,
    ...updates,
    revision: current.revision + 1,
  };
  assertValidOperationSchedule(next);
  await recordEvent('operation_schedule_updated', {
    scheduleId,
    updates: { ...updates, revision: next.revision },
  });
}

export async function pauseOperationSchedule(scheduleId: string, authorization: OwnerOperationAuthorization): Promise<void> {
  await changeOperationScheduleStatus(scheduleId, 'paused', authorization);
}

export async function resumeOperationSchedule(scheduleId: string, authorization: OwnerOperationAuthorization): Promise<void> {
  await changeOperationScheduleStatus(scheduleId, 'active', authorization);
}

export async function archiveOperationSchedule(scheduleId: string, authorization: OwnerOperationAuthorization): Promise<void> {
  await changeOperationScheduleStatus(scheduleId, 'archived', authorization);
}
