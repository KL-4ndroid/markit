import { recordEvent } from '@/lib/db/events';
import { isSyncGateDFlagEnabled } from '@/lib/sync/sync-gate-d-flags';
import type { EventType } from '@/types/db';

export type FieldOpsWriteRoute = 'direct_event';

export function getFieldOpsWriteRoute(): FieldOpsWriteRoute {
  if (isSyncGateDFlagEnabled('pendingOperationWriteRouting')) {
    return 'direct_event';
  }

  return 'direct_event';
}

export async function writeFieldOpsEvent(
  type: EventType,
  payload: Record<string, unknown>
): Promise<void> {
  const route = getFieldOpsWriteRoute();

  if (route === 'direct_event') {
    await recordEvent(type, payload);
  }
}
