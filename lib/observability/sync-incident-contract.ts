export const SYNC_INCIDENT_REPORT_SCHEMA_VERSION = 1 as const;
export const SYNC_INCIDENT_MAX_PENDING_COUNT = 1_000_000_000;

export type SyncIncidentKind =
  | 'permission_blocked'
  | 'unexpected_failure';

export type SyncIncidentReport = Readonly<{
  schemaVersion: typeof SYNC_INCIDENT_REPORT_SCHEMA_VERSION;
  kind: SyncIncidentKind;
  pendingCount: number;
}>;

const SYNC_INCIDENT_KINDS = new Set<SyncIncidentKind>([
  'permission_blocked',
  'unexpected_failure',
]);
const REPORT_KEYS = ['kind', 'pendingCount', 'schemaVersion'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactReportKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === REPORT_KEYS.length
    && REPORT_KEYS.every((key, index) => key === keys[index]);
}

export function parseSyncIncidentReport(value: unknown): SyncIncidentReport | null {
  if (!isRecord(value) || !hasExactReportKeys(value)) return null;
  if (value.schemaVersion !== SYNC_INCIDENT_REPORT_SCHEMA_VERSION) return null;
  if (typeof value.kind !== 'string' || !SYNC_INCIDENT_KINDS.has(value.kind as SyncIncidentKind)) {
    return null;
  }
  if (
    typeof value.pendingCount !== 'number'
    || !Number.isSafeInteger(value.pendingCount)
    || value.pendingCount < 0
    || value.pendingCount > SYNC_INCIDENT_MAX_PENDING_COUNT
  ) {
    return null;
  }

  return Object.freeze({
    schemaVersion: SYNC_INCIDENT_REPORT_SCHEMA_VERSION,
    kind: value.kind as SyncIncidentKind,
    pendingCount: value.pendingCount,
  });
}

export function createSyncIncidentReport(
  kind: SyncIncidentKind,
  pendingCount: number,
): SyncIncidentReport | null {
  return parseSyncIncidentReport({
    schemaVersion: SYNC_INCIDENT_REPORT_SCHEMA_VERSION,
    kind,
    pendingCount,
  });
}
