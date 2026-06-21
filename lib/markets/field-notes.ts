import { db, generateUUID } from '@/lib/db';
import { getEventMarketId } from '@/lib/events/event-read-model';
import { writeFieldOpsEvent } from '@/lib/markets/field-ops-write-router';
import type { Event, EventType } from '@/types/db';

export const FIELD_NOTE_CREATED = 'field_note_created' as EventType;
export const FIELD_NOTE_UPDATED = 'field_note_updated' as EventType;
export const FIELD_NOTE_DELETED = 'field_note_deleted' as EventType;

export interface FieldNotePayload {
  market_id: string;
  noteId: string;
  text?: string;
}

export interface FieldNote {
  id: string;
  marketId: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  actorId?: string;
}

function assertText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Field note text is required');
  }
  return trimmed;
}

function assertFieldNoteExists(note: FieldNote | undefined): FieldNote {
  if (!note) {
    throw new Error('Field note not found');
  }
  return note;
}

function isFieldNoteEvent(event: Event<Record<string, unknown>>): boolean {
  return (
    event.type === FIELD_NOTE_CREATED ||
    event.type === FIELD_NOTE_UPDATED ||
    event.type === FIELD_NOTE_DELETED
  );
}

export async function getActiveFieldNotesForMarket(marketId: string): Promise<FieldNote[]> {
  if (!marketId) return [];

  const events = await db.events.toArray() as Array<Event<Record<string, unknown>>>;
  const notes = new Map<string, FieldNote>();

  for (const event of events.sort((a, b) => a.timestamp - b.timestamp)) {
    if (!isFieldNoteEvent(event)) continue;
    if (getEventMarketId(event) !== marketId) continue;

    const payload = event.payload ?? {};
    const noteId = typeof payload.noteId === 'string' ? payload.noteId : undefined;
    if (!noteId) continue;

    if (event.type === FIELD_NOTE_CREATED) {
      const text = typeof payload.text === 'string' ? payload.text : '';
      notes.set(noteId, {
        id: noteId,
        marketId,
        text,
        createdAt: event.timestamp,
        updatedAt: event.timestamp,
        actorId: event.actor_id,
      });
      continue;
    }

    const existing = notes.get(noteId);
    if (!existing) continue;

    if (event.type === FIELD_NOTE_UPDATED) {
      const text = typeof payload.text === 'string' ? payload.text : existing.text;
      notes.set(noteId, {
        ...existing,
        text,
        updatedAt: event.timestamp,
      });
      continue;
    }

    if (event.type === FIELD_NOTE_DELETED) {
      notes.delete(noteId);
    }
  }

  return Array.from(notes.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createFieldNote(marketId: string, text: string): Promise<string> {
  const noteId = generateUUID();
  await writeFieldOpsEvent(FIELD_NOTE_CREATED, {
    market_id: marketId,
    noteId,
    text: assertText(text),
  } as Record<string, unknown>);
  return noteId;
}

export async function updateFieldNote(
  marketId: string,
  noteId: string,
  text: string
): Promise<void> {
  const existing = (await getActiveFieldNotesForMarket(marketId)).find(note => note.id === noteId);
  assertFieldNoteExists(existing);

  await writeFieldOpsEvent(FIELD_NOTE_UPDATED, {
    market_id: marketId,
    noteId,
    text: assertText(text),
  } as Record<string, unknown>);
}

export async function deleteFieldNote(
  marketId: string,
  noteId: string
): Promise<void> {
  const existing = (await getActiveFieldNotesForMarket(marketId)).find(note => note.id === noteId);
  assertFieldNoteExists(existing);

  await writeFieldOpsEvent(FIELD_NOTE_DELETED, {
    market_id: marketId,
    noteId,
  } as Record<string, unknown>);
}
