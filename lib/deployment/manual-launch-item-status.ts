export const MANUAL_LAUNCH_ITEM_STATUS_PATH =
  'docs/MANUAL_LAUNCH_ITEM_STATUS_2026_08_17.json' as const;

export type ManualLaunchItemStatus =
  | 'proposed_ai'
  | 'pending_human'
  | 'approved'
  | 'rejected'
  | 'not_applicable';

export type ManualLaunchItemStatusEntry = Readonly<{
  id: string;
  status: ManualLaunchItemStatus;
  note: string;
  approvedAt: string | null;
  approvedByRole: string | null;
  evidence: readonly string[];
}>;

export type ManualLaunchItemStatusDocument = Readonly<{
  schemaVersion: 1;
  sourceDocument: string;
  updatedAt: string;
  items: readonly ManualLaunchItemStatusEntry[];
}>;

const STATUS_VALUES = new Set<ManualLaunchItemStatus>([
  'proposed_ai',
  'pending_human',
  'approved',
  'rejected',
  'not_applicable',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value;
}

function requireNullableString(value: unknown, code: string): string | null {
  if (value === null) return null;
  return requireString(value, code);
}

function parseEntry(value: unknown): ManualLaunchItemStatusEntry {
  if (!isRecord(value)) throw new Error('manual_item_status_entry_invalid');
  const id = requireString(value.id, 'manual_item_status_id_invalid');
  if (!/^[a-z0-9][a-z0-9.-]+$/u.test(id)) throw new Error('manual_item_status_id_invalid');
  if (typeof value.status !== 'string' || !STATUS_VALUES.has(value.status as ManualLaunchItemStatus)) {
    throw new Error('manual_item_status_value_invalid');
  }
  const status = value.status as ManualLaunchItemStatus;
  const note = requireString(value.note, 'manual_item_status_note_invalid');
  const approvedAt = requireNullableString(value.approvedAt, 'manual_item_status_approved_at_invalid');
  const approvedByRole = requireNullableString(
    value.approvedByRole,
    'manual_item_status_approved_by_role_invalid',
  );
  if (!Array.isArray(value.evidence) || value.evidence.some(item => typeof item !== 'string' || item.trim() === '')) {
    throw new Error('manual_item_status_evidence_invalid');
  }
  const evidence = Object.freeze([...value.evidence] as string[]);
  const completed = status === 'approved' || status === 'not_applicable';
  if (completed && (!approvedAt || !approvedByRole || evidence.length === 0)) {
    throw new Error('manual_item_status_completion_evidence_missing');
  }
  if (!completed && (approvedAt !== null || approvedByRole !== null)) {
    throw new Error('manual_item_status_unapproved_metadata_present');
  }
  return Object.freeze({ id, status, note, approvedAt, approvedByRole, evidence });
}

export function parseManualLaunchItemStatusDocument(
  value: unknown,
): ManualLaunchItemStatusDocument {
  if (!isRecord(value)) throw new Error('manual_item_status_document_invalid');
  if (value.schemaVersion !== 1) throw new Error('manual_item_status_schema_invalid');
  const sourceDocument = requireString(value.sourceDocument, 'manual_item_status_source_invalid');
  const updatedAt = requireString(value.updatedAt, 'manual_item_status_updated_at_invalid');
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(updatedAt)) throw new Error('manual_item_status_updated_at_invalid');
  if (!Array.isArray(value.items)) throw new Error('manual_item_status_items_invalid');
  const items = value.items.map(parseEntry);
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`manual_item_status_duplicate:${item.id}`);
    ids.add(item.id);
  }
  return Object.freeze({
    schemaVersion: 1,
    sourceDocument,
    updatedAt,
    items: Object.freeze(items),
  });
}
