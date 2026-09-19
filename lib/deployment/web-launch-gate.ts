export const WEB_LAUNCH_GATE_SCHEMA_VERSION = 1 as const;
export const WEB_LAUNCH_GATE_SOURCE_DOCUMENT = 'WEB_LAUNCH_READINESS_2026_07_30.md' as const;

export const WEB_LAUNCH_GATE_IDS = [
  'CI-WEB',
  'LOCAL-QUALITY',
  'DB-063-065',
  'DB-066',
  'TEAM-LIVE',
  'PROD-CONFIG',
  'PROD-SURFACE',
  'DEPLOY-IDENTITY',
  'SECURITY-HEADERS',
  'PWA-WEB',
  'MEDIA-PROD',
  'STAGING-E2E',
  'BILLING-MERCHANT',
  'F3B-F3E',
  'S9',
  'PROMOTION-RUNTIME',
  'OBSERVABILITY',
  'LEGAL-SUPPORT',
  'RELEASE-CANARY',
] as const;

export const WEB_LAUNCH_GATE_STATUSES = [
  'complete',
  'implemented_local',
  'pending_external',
  'pending_approval',
  'evidence_missing',
] as const;

export type WebLaunchGateId = typeof WEB_LAUNCH_GATE_IDS[number];
export type WebLaunchGateStatus = typeof WEB_LAUNCH_GATE_STATUSES[number];
export type WebLaunchOverallStatus = 'ready' | 'not_ready';

export type WebLaunchGate = Readonly<{
  id: WebLaunchGateId;
  status: WebLaunchGateStatus;
}>;

export type WebLaunchGateDocument = Readonly<{
  schemaVersion: typeof WEB_LAUNCH_GATE_SCHEMA_VERSION;
  sourceDocument: typeof WEB_LAUNCH_GATE_SOURCE_DOCUMENT;
  updatedAt: string;
  overallStatus: WebLaunchOverallStatus;
  gates: readonly WebLaunchGate[];
}>;

export type WebLaunchReadinessReport = Readonly<{
  schemaVersion: typeof WEB_LAUNCH_GATE_SCHEMA_VERSION;
  sourceDocument: typeof WEB_LAUNCH_GATE_SOURCE_DOCUMENT;
  updatedAt: string;
  overallStatus: WebLaunchOverallStatus;
  ready: boolean;
  totalCount: number;
  completeCount: number;
  blockerCount: number;
  counts: Readonly<Record<WebLaunchGateStatus, number>>;
  blockers: readonly WebLaunchGate[];
}>;

export type WebLaunchGateValidationCode =
  | 'document_invalid'
  | 'duplicate_gate'
  | 'gate_count_invalid'
  | 'gate_id_invalid'
  | 'gate_status_invalid'
  | 'overall_status_mismatch'
  | 'schema_version_unsupported'
  | 'source_document_mismatch'
  | 'updated_date_invalid';

export class WebLaunchGateValidationError extends Error {
  constructor(readonly code: WebLaunchGateValidationCode) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every(key => allowedKeys.includes(key));
}

function isGateId(value: unknown): value is WebLaunchGateId {
  return typeof value === 'string'
    && (WEB_LAUNCH_GATE_IDS as readonly string[]).includes(value);
}

function isGateStatus(value: unknown): value is WebLaunchGateStatus {
  return typeof value === 'string'
    && (WEB_LAUNCH_GATE_STATUSES as readonly string[]).includes(value);
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function expectedOverallStatus(gates: readonly WebLaunchGate[]): WebLaunchOverallStatus {
  return gates.every(gate => gate.status === 'complete') ? 'ready' : 'not_ready';
}

export function parseWebLaunchGateDocument(value: unknown): WebLaunchGateDocument {
  if (!isRecord(value) || !Array.isArray(value.gates)) {
    throw new WebLaunchGateValidationError('document_invalid');
  }
  if (!hasOnlyKeys(
    value,
    ['schemaVersion', 'sourceDocument', 'updatedAt', 'overallStatus', 'gates'],
  )) {
    throw new WebLaunchGateValidationError('document_invalid');
  }
  if (value.schemaVersion !== WEB_LAUNCH_GATE_SCHEMA_VERSION) {
    throw new WebLaunchGateValidationError('schema_version_unsupported');
  }
  if (value.sourceDocument !== WEB_LAUNCH_GATE_SOURCE_DOCUMENT) {
    throw new WebLaunchGateValidationError('source_document_mismatch');
  }
  if (!isValidDateOnly(value.updatedAt)) {
    throw new WebLaunchGateValidationError('updated_date_invalid');
  }
  if (value.gates.length !== WEB_LAUNCH_GATE_IDS.length) {
    throw new WebLaunchGateValidationError('gate_count_invalid');
  }

  const byId = new Map<WebLaunchGateId, WebLaunchGate>();
  for (const candidate of value.gates) {
    if (!isRecord(candidate) || !hasOnlyKeys(candidate, ['id', 'status'])) {
      throw new WebLaunchGateValidationError('document_invalid');
    }
    if (!isGateId(candidate.id)) {
      throw new WebLaunchGateValidationError('gate_id_invalid');
    }
    if (!isGateStatus(candidate.status)) {
      throw new WebLaunchGateValidationError('gate_status_invalid');
    }
    if (byId.has(candidate.id)) {
      throw new WebLaunchGateValidationError('duplicate_gate');
    }
    byId.set(candidate.id, Object.freeze({ id: candidate.id, status: candidate.status }));
  }

  const gates = WEB_LAUNCH_GATE_IDS.map(id => {
    const gate = byId.get(id);
    if (!gate) throw new WebLaunchGateValidationError('gate_id_invalid');
    return gate;
  });
  const expectedStatus = expectedOverallStatus(gates);
  if (value.overallStatus !== expectedStatus) {
    throw new WebLaunchGateValidationError('overall_status_mismatch');
  }

  return Object.freeze({
    schemaVersion: WEB_LAUNCH_GATE_SCHEMA_VERSION,
    sourceDocument: WEB_LAUNCH_GATE_SOURCE_DOCUMENT,
    updatedAt: value.updatedAt,
    overallStatus: expectedStatus,
    gates: Object.freeze(gates),
  });
}

export function evaluateWebLaunchReadiness(
  document: WebLaunchGateDocument,
): WebLaunchReadinessReport {
  const counts: Record<WebLaunchGateStatus, number> = {
    complete: 0,
    implemented_local: 0,
    pending_external: 0,
    pending_approval: 0,
    evidence_missing: 0,
  };
  for (const gate of document.gates) counts[gate.status] += 1;

  const blockers = document.gates.filter(gate => gate.status !== 'complete');
  const ready = blockers.length === 0;
  return Object.freeze({
    schemaVersion: WEB_LAUNCH_GATE_SCHEMA_VERSION,
    sourceDocument: WEB_LAUNCH_GATE_SOURCE_DOCUMENT,
    updatedAt: document.updatedAt,
    overallStatus: ready ? 'ready' : 'not_ready',
    ready,
    totalCount: document.gates.length,
    completeCount: counts.complete,
    blockerCount: blockers.length,
    counts: Object.freeze(counts),
    blockers: Object.freeze(blockers),
  });
}
