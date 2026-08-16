export const NATIVE_LAUNCH_GATE_SCHEMA_VERSION = 1 as const;
export const NATIVE_LAUNCH_GATE_SOURCE_DOCUMENT =
  'subscription/NATIVE_SUBSCRIPTION_EXECUTION_PLAN_2026_08_06.md' as const;

export const NATIVE_LAUNCH_GATE_IDS = [
  'NATIVE-DIRECTION',
  'ACCOUNT-ENTITLEMENT-CORE',
  'IAP-PLATFORM-PORT',
  'CAPACITOR-GATE2',
  'APPLE-DEVELOPER',
  'GOOGLE-PLAY-DEVELOPER',
  'STORE-CATALOG',
  'STORE-VERIFICATION',
  'ENTITLEMENT-WRITER',
  'NATIVE-ADAPTERS',
  'SANDBOX-LIFECYCLE',
  'CROSS-PLATFORM-ACCESS',
  'STORE-LISTING-ASSETS',
  'STORE-COMPLIANCE',
  'ACCOUNT-DELETION',
  'NATIVE-CANARY',
] as const;

export const NATIVE_LAUNCH_GATE_STATUSES = [
  'complete',
  'pending_external',
  'pending_manual',
  'pending_approval',
  'blocked_dependency',
] as const;

export type NativeLaunchGateId = typeof NATIVE_LAUNCH_GATE_IDS[number];
export type NativeLaunchGateStatus = typeof NATIVE_LAUNCH_GATE_STATUSES[number];
export type NativeLaunchOverallStatus = 'ready' | 'not_ready';

export type NativeLaunchGate = Readonly<{
  id: NativeLaunchGateId;
  status: NativeLaunchGateStatus;
}>;

export type NativeLaunchGateDocument = Readonly<{
  schemaVersion: typeof NATIVE_LAUNCH_GATE_SCHEMA_VERSION;
  sourceDocument: typeof NATIVE_LAUNCH_GATE_SOURCE_DOCUMENT;
  updatedAt: string;
  overallStatus: NativeLaunchOverallStatus;
  gates: readonly NativeLaunchGate[];
}>;

export type NativeLaunchReadinessReport = Readonly<{
  schemaVersion: typeof NATIVE_LAUNCH_GATE_SCHEMA_VERSION;
  sourceDocument: typeof NATIVE_LAUNCH_GATE_SOURCE_DOCUMENT;
  updatedAt: string;
  overallStatus: NativeLaunchOverallStatus;
  ready: boolean;
  totalCount: number;
  completeCount: number;
  blockerCount: number;
  counts: Readonly<Record<NativeLaunchGateStatus, number>>;
  blockers: readonly NativeLaunchGate[];
}>;

export type NativeLaunchGateValidationCode =
  | 'document_invalid'
  | 'duplicate_gate'
  | 'gate_count_invalid'
  | 'gate_id_invalid'
  | 'gate_status_invalid'
  | 'overall_status_mismatch'
  | 'schema_version_unsupported'
  | 'source_document_mismatch'
  | 'updated_date_invalid';

export class NativeLaunchGateValidationError extends Error {
  constructor(readonly code: NativeLaunchGateValidationCode) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every(key => allowedKeys.includes(key));
}

function isGateId(value: unknown): value is NativeLaunchGateId {
  return typeof value === 'string'
    && (NATIVE_LAUNCH_GATE_IDS as readonly string[]).includes(value);
}

function isGateStatus(value: unknown): value is NativeLaunchGateStatus {
  return typeof value === 'string'
    && (NATIVE_LAUNCH_GATE_STATUSES as readonly string[]).includes(value);
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function expectedOverallStatus(gates: readonly NativeLaunchGate[]): NativeLaunchOverallStatus {
  return gates.every(gate => gate.status === 'complete') ? 'ready' : 'not_ready';
}

export function parseNativeLaunchGateDocument(value: unknown): NativeLaunchGateDocument {
  if (!isRecord(value) || !Array.isArray(value.gates)) {
    throw new NativeLaunchGateValidationError('document_invalid');
  }
  if (!hasOnlyKeys(
    value,
    ['schemaVersion', 'sourceDocument', 'updatedAt', 'overallStatus', 'gates'],
  )) {
    throw new NativeLaunchGateValidationError('document_invalid');
  }
  if (value.schemaVersion !== NATIVE_LAUNCH_GATE_SCHEMA_VERSION) {
    throw new NativeLaunchGateValidationError('schema_version_unsupported');
  }
  if (value.sourceDocument !== NATIVE_LAUNCH_GATE_SOURCE_DOCUMENT) {
    throw new NativeLaunchGateValidationError('source_document_mismatch');
  }
  if (!isValidDateOnly(value.updatedAt)) {
    throw new NativeLaunchGateValidationError('updated_date_invalid');
  }
  if (value.gates.length !== NATIVE_LAUNCH_GATE_IDS.length) {
    throw new NativeLaunchGateValidationError('gate_count_invalid');
  }

  const byId = new Map<NativeLaunchGateId, NativeLaunchGate>();
  for (const candidate of value.gates) {
    if (!isRecord(candidate) || !hasOnlyKeys(candidate, ['id', 'status'])) {
      throw new NativeLaunchGateValidationError('document_invalid');
    }
    if (!isGateId(candidate.id)) {
      throw new NativeLaunchGateValidationError('gate_id_invalid');
    }
    if (!isGateStatus(candidate.status)) {
      throw new NativeLaunchGateValidationError('gate_status_invalid');
    }
    if (byId.has(candidate.id)) {
      throw new NativeLaunchGateValidationError('duplicate_gate');
    }
    byId.set(candidate.id, Object.freeze({ id: candidate.id, status: candidate.status }));
  }

  const gates = NATIVE_LAUNCH_GATE_IDS.map(id => {
    const gate = byId.get(id);
    if (!gate) throw new NativeLaunchGateValidationError('gate_id_invalid');
    return gate;
  });
  const overallStatus = expectedOverallStatus(gates);
  if (value.overallStatus !== overallStatus) {
    throw new NativeLaunchGateValidationError('overall_status_mismatch');
  }

  return Object.freeze({
    schemaVersion: NATIVE_LAUNCH_GATE_SCHEMA_VERSION,
    sourceDocument: NATIVE_LAUNCH_GATE_SOURCE_DOCUMENT,
    updatedAt: value.updatedAt,
    overallStatus,
    gates: Object.freeze(gates),
  });
}

export function evaluateNativeLaunchReadiness(
  document: NativeLaunchGateDocument,
): NativeLaunchReadinessReport {
  const counts: Record<NativeLaunchGateStatus, number> = {
    complete: 0,
    pending_external: 0,
    pending_manual: 0,
    pending_approval: 0,
    blocked_dependency: 0,
  };
  for (const gate of document.gates) counts[gate.status] += 1;

  const blockers = document.gates.filter(gate => gate.status !== 'complete');
  const ready = blockers.length === 0;
  return Object.freeze({
    schemaVersion: NATIVE_LAUNCH_GATE_SCHEMA_VERSION,
    sourceDocument: NATIVE_LAUNCH_GATE_SOURCE_DOCUMENT,
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
