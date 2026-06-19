import { db, generateUUID } from '@/lib/db';
import { recordEvent } from '@/lib/db/events';
import { getEventMarketId } from '@/lib/events/event-read-model';
import type { Event, EventType } from '@/types/db';

export const CHECKLIST_ITEM_CREATED = 'checklist_item_created' as EventType;
export const CHECKLIST_ITEM_UPDATED = 'checklist_item_updated' as EventType;
export const CHECKLIST_ITEM_DELETED = 'checklist_item_deleted' as EventType;

export interface ChecklistItem {
  id: string;
  marketId: string;
  text: string;
  completed: boolean;
  createdAt: number;
  updatedAt: number;
  actorId?: string;
}

function assertText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Checklist item text is required');
  }
  return trimmed;
}

function isChecklistEvent(event: Event<Record<string, unknown>>): boolean {
  return (
    event.type === CHECKLIST_ITEM_CREATED ||
    event.type === CHECKLIST_ITEM_UPDATED ||
    event.type === CHECKLIST_ITEM_DELETED
  );
}

export async function getActiveChecklistItemsForMarket(marketId: string): Promise<ChecklistItem[]> {
  if (!marketId) return [];

  const events = await db.events.toArray() as Array<Event<Record<string, unknown>>>;
  const items = new Map<string, ChecklistItem>();

  for (const event of events.sort((a, b) => a.timestamp - b.timestamp)) {
    if (!isChecklistEvent(event)) continue;
    if (getEventMarketId(event) !== marketId) continue;

    const payload = event.payload ?? {};
    const itemId = typeof payload.itemId === 'string' ? payload.itemId : undefined;
    if (!itemId) continue;

    if (event.type === CHECKLIST_ITEM_CREATED) {
      const text = typeof payload.text === 'string' ? payload.text : '';
      items.set(itemId, {
        id: itemId,
        marketId,
        text,
        completed: payload.completed === true,
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
        actorId: event.actor_id,
      });
      continue;
    }

    const existing = items.get(itemId);
    if (!existing) continue;

    if (event.type === CHECKLIST_ITEM_UPDATED) {
      const text = typeof payload.text === 'string' ? payload.text : existing.text;
      const completed =
        typeof payload.completed === 'boolean' ? payload.completed : existing.completed;

      items.set(itemId, {
        ...existing,
        text,
        completed,
        updatedAt: event.timestamp,
      });
      continue;
    }

    if (event.type === CHECKLIST_ITEM_DELETED) {
      items.delete(itemId);
    }
  }

  return Array.from(items.values()).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return b.updatedAt - a.updatedAt;
  });
}

export async function createChecklistItem(
  marketId: string,
  text: string,
  completed = false
): Promise<string> {
  const itemId = generateUUID();
  await recordEvent(CHECKLIST_ITEM_CREATED, {
    market_id: marketId,
    itemId,
    text: assertText(text),
    completed,
  } as Record<string, unknown>);
  return itemId;
}

export async function updateChecklistItem(
  marketId: string,
  itemId: string,
  updates: { text?: string; completed?: boolean }
): Promise<void> {
  const payload: Record<string, unknown> = {
    market_id: marketId,
    itemId,
  };

  if (updates.text !== undefined) {
    payload.text = assertText(updates.text);
  }
  if (updates.completed !== undefined) {
    payload.completed = updates.completed;
  }

  await recordEvent(CHECKLIST_ITEM_UPDATED, payload);
}

export async function deleteChecklistItem(marketId: string, itemId: string): Promise<void> {
  await recordEvent(CHECKLIST_ITEM_DELETED, {
    market_id: marketId,
    itemId,
  } as Record<string, unknown>);
}
