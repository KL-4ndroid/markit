import { recordEvent } from '@/lib/db/events';
import { generateUUID } from '@/lib/db';
import { isSyncGateDFlagEnabled } from '@/lib/sync/sync-gate-d-flags';
import type { EventType } from '@/types/db';

export type FieldOpsWriteOperation = 'checklist_toggle';
export type FieldOpsWriteRoute = 'direct_event' | 'checklist_toggle_pending_operation_rpc';

export interface FieldOpsWriteOptions {
  operation?: FieldOpsWriteOperation;
}

interface ChecklistTogglePayload {
  marketId: string;
  itemId: string;
  completed: boolean;
}

function getStringPayloadValue(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function getChecklistTogglePayload(
  type: EventType,
  payload: Record<string, unknown>,
  options?: FieldOpsWriteOptions
): ChecklistTogglePayload | null {
  if (options?.operation !== 'checklist_toggle') return null;
  if (type !== 'checklist_item_updated') return null;
  if ('text' in payload) return null;

  const marketId = getStringPayloadValue(payload, 'market_id');
  const itemId = getStringPayloadValue(payload, 'itemId');
  const { completed } = payload;

  if (!marketId || !itemId || typeof completed !== 'boolean') {
    return null;
  }

  return { marketId, itemId, completed };
}

export function getFieldOpsWriteRoute(
  type: EventType,
  payload: Record<string, unknown>,
  options?: FieldOpsWriteOptions
): FieldOpsWriteRoute {
  if (
    isSyncGateDFlagEnabled('pendingOperationWriteRouting') &&
    getChecklistTogglePayload(type, payload, options)
  ) {
    return 'checklist_toggle_pending_operation_rpc';
  }

  return 'direct_event';
}

async function enqueueChecklistTogglePendingOperation(
  payload: ChecklistTogglePayload
): Promise<string | null> {
  const { isSupabaseConfigured, supabase } = await import('@/lib/supabase/client');

  if (!isSupabaseConfigured()) return null;

  const operationId = generateUUID();
  const idempotencyKey = `checklist-toggle:${operationId}`;
  const { data, error } = await supabase.rpc('enqueue_checklist_toggle_pending_operation', {
    p_operation_id: operationId,
    p_market_id: payload.marketId,
    p_item_id: payload.itemId,
    p_completed: payload.completed,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    throw error;
  }

  return typeof data === 'string' && data.trim().length > 0 ? data : operationId;
}

async function drainChecklistTogglePendingOperation(operationId: string): Promise<void> {
  const { isSupabaseConfigured, supabase } = await import('@/lib/supabase/client');

  if (!isSupabaseConfigured()) return;

  const { error } = await supabase.rpc('drain_checklist_toggle_pending_operation', {
    p_operation_id: operationId,
  });

  if (error) {
    throw error;
  }
}

export async function writeFieldOpsEvent(
  type: EventType,
  payload: Record<string, unknown>,
  options?: FieldOpsWriteOptions
): Promise<void> {
  const route = getFieldOpsWriteRoute(type, payload, options);

  await recordEvent(type, payload);

  if (route === 'checklist_toggle_pending_operation_rpc') {
    const checklistTogglePayload = getChecklistTogglePayload(type, payload, options);
    if (!checklistTogglePayload) return;

    try {
      const operationId = await enqueueChecklistTogglePendingOperation(checklistTogglePayload);
      if (operationId && isSyncGateDFlagEnabled('pendingOperationDrainAfterEnqueue')) {
        await drainChecklistTogglePendingOperation(operationId);
      }
    } catch (error) {
      console.warn('[field-ops] checklist toggle pending operation route failed', error);
    }
  }
}
