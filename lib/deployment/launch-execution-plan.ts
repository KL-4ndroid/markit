import {
  NATIVE_LAUNCH_GATE_IDS,
  type NativeLaunchGateDocument,
  type NativeLaunchGateId,
} from './native-launch-gate';
import {
  WEB_LAUNCH_GATE_IDS,
  type WebLaunchGateDocument,
  type WebLaunchGateId,
} from './web-launch-gate';

export const LAUNCH_EXECUTION_PLAN_SCHEMA_VERSION = 1 as const;
export const LAUNCH_EXECUTION_PLAN_SOURCE_DOCUMENT =
  'LAUNCH_EXECUTION_MASTER_PLAN_2026_08_09.md' as const;
export const LAUNCH_EXECUTION_RELEASE_ORDER = [
  'web_core',
  'ios_native_paid',
  'android_native_paid',
  'web_paid_deferred',
] as const;
export const LAUNCH_EXECUTION_TASK_OWNERS = ['agent', 'human', 'shared'] as const;
export const LAUNCH_EXECUTION_TASK_STATUSES = [
  'complete',
  'ready_agent',
  'pending_manual',
  'pending_approval',
  'blocked_dependency',
  'deferred',
] as const;

export type LaunchExecutionTaskOwner = typeof LAUNCH_EXECUTION_TASK_OWNERS[number];
export type LaunchExecutionTaskStatus = typeof LAUNCH_EXECUTION_TASK_STATUSES[number];
export type LaunchExecutionGateRef = `web:${WebLaunchGateId}` | `native:${NativeLaunchGateId}`;

export type LaunchExecutionTask = Readonly<{
  id: string;
  title: string;
  owner: LaunchExecutionTaskOwner;
  status: LaunchExecutionTaskStatus;
  dependsOn: readonly string[];
  gateRefs: readonly LaunchExecutionGateRef[];
  evidence: readonly string[];
}>;

export type LaunchExecutionPlanDocument = Readonly<{
  schemaVersion: typeof LAUNCH_EXECUTION_PLAN_SCHEMA_VERSION;
  sourceDocument: typeof LAUNCH_EXECUTION_PLAN_SOURCE_DOCUMENT;
  updatedAt: string;
  overallStatus: 'ready' | 'not_ready';
  releaseOrder: typeof LAUNCH_EXECUTION_RELEASE_ORDER;
  tasks: readonly LaunchExecutionTask[];
}>;

export type LaunchExecutionPlanReport = Readonly<{
  updatedAt: string;
  launchReady: boolean;
  totalTaskCount: number;
  counts: Readonly<Record<LaunchExecutionTaskStatus, number>>;
  humanActionIds: readonly string[];
  agentReadyIds: readonly string[];
  approvalIds: readonly string[];
  blockedIds: readonly string[];
  deferredIds: readonly string[];
}>;

export type LaunchExecutionPlanValidationCode =
  | 'document_invalid'
  | 'schema_version_unsupported'
  | 'source_document_mismatch'
  | 'updated_date_invalid'
  | 'overall_status_mismatch'
  | 'release_order_invalid'
  | 'task_count_invalid'
  | 'task_id_invalid'
  | 'task_duplicate'
  | 'task_owner_invalid'
  | 'task_status_invalid'
  | 'task_status_owner_invalid'
  | 'dependency_invalid'
  | 'dependency_cycle'
  | 'dependency_status_invalid'
  | 'gate_ref_invalid'
  | 'gate_coverage_missing'
  | 'complete_gate_reopened'
  | 'evidence_path_invalid'
  | 'unsafe_value';

export class LaunchExecutionPlanValidationError extends Error {
  constructor(readonly code: LaunchExecutionPlanValidationCode) {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key));
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isOwner(value: unknown): value is LaunchExecutionTaskOwner {
  return typeof value === 'string'
    && (LAUNCH_EXECUTION_TASK_OWNERS as readonly string[]).includes(value);
}

function isStatus(value: unknown): value is LaunchExecutionTaskStatus {
  return typeof value === 'string'
    && (LAUNCH_EXECUTION_TASK_STATUSES as readonly string[]).includes(value);
}

function isGateRef(value: unknown): value is LaunchExecutionGateRef {
  if (typeof value !== 'string') return false;
  if (value.startsWith('web:')) {
    return (WEB_LAUNCH_GATE_IDS as readonly string[]).includes(value.slice(4));
  }
  if (value.startsWith('native:')) {
    return (NATIVE_LAUNCH_GATE_IDS as readonly string[]).includes(value.slice(7));
  }
  return false;
}

function isEvidencePath(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 240
    && !value.includes('\\')
    && !value.includes('..')
    && /^(docs|scripts|tests|supabase)\/[A-Za-z0-9_./-]+$/.test(value);
}

function assertNoUnsafeValues(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized)
    || /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(serialized)
    || /https?:\/\//i.test(serialized)
    || /\b(?:sk|sbp|eyJ)[A-Za-z0-9_-]{16,}\b/.test(serialized)
    || /\b[A-Z][A-Z0-9_]{2,}\s*=\s*[^,}\s]{4,}/.test(serialized)
  ) {
    throw new LaunchExecutionPlanValidationError('unsafe_value');
  }
}

function expectedOverallStatus(
  web: WebLaunchGateDocument,
  native: NativeLaunchGateDocument,
): 'ready' | 'not_ready' {
  return web.overallStatus === 'ready' && native.overallStatus === 'ready'
    ? 'ready'
    : 'not_ready';
}

function assertAcyclic(tasks: ReadonlyMap<string, LaunchExecutionTask>): void {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new LaunchExecutionPlanValidationError('dependency_cycle');
    visiting.add(id);
    for (const dependency of tasks.get(id)?.dependsOn ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of tasks.keys()) visit(id);
}

function gateStatuses(
  web: WebLaunchGateDocument,
  native: NativeLaunchGateDocument,
): ReadonlyMap<LaunchExecutionGateRef, string> {
  return new Map<LaunchExecutionGateRef, string>([
    ...web.gates.map(gate => [`web:${gate.id}` as const, gate.status] as const),
    ...native.gates.map(gate => [`native:${gate.id}` as const, gate.status] as const),
  ]);
}

export function parseLaunchExecutionPlan(
  value: unknown,
  web: WebLaunchGateDocument,
  native: NativeLaunchGateDocument,
): LaunchExecutionPlanDocument {
  assertNoUnsafeValues(value);
  if (!isRecord(value) || !Array.isArray(value.tasks) || !Array.isArray(value.releaseOrder)) {
    throw new LaunchExecutionPlanValidationError('document_invalid');
  }
  if (!hasOnlyKeys(value, [
    'schemaVersion',
    'sourceDocument',
    'updatedAt',
    'overallStatus',
    'releaseOrder',
    'tasks',
  ])) {
    throw new LaunchExecutionPlanValidationError('document_invalid');
  }
  if (value.schemaVersion !== LAUNCH_EXECUTION_PLAN_SCHEMA_VERSION) {
    throw new LaunchExecutionPlanValidationError('schema_version_unsupported');
  }
  if (value.sourceDocument !== LAUNCH_EXECUTION_PLAN_SOURCE_DOCUMENT) {
    throw new LaunchExecutionPlanValidationError('source_document_mismatch');
  }
  if (!isDateOnly(value.updatedAt)) {
    throw new LaunchExecutionPlanValidationError('updated_date_invalid');
  }
  if (JSON.stringify(value.releaseOrder) !== JSON.stringify(LAUNCH_EXECUTION_RELEASE_ORDER)) {
    throw new LaunchExecutionPlanValidationError('release_order_invalid');
  }
  if (value.tasks.length < 20 || value.tasks.length > 64) {
    throw new LaunchExecutionPlanValidationError('task_count_invalid');
  }

  const byId = new Map<string, LaunchExecutionTask>();
  for (const candidate of value.tasks) {
    if (!isRecord(candidate) || !hasOnlyKeys(candidate, [
      'id', 'title', 'owner', 'status', 'dependsOn', 'gateRefs', 'evidence',
    ])) {
      throw new LaunchExecutionPlanValidationError('document_invalid');
    }
    if (
      typeof candidate.id !== 'string'
      || !/^[A-Z][A-Z0-9-]{2,64}$/.test(candidate.id)
      || typeof candidate.title !== 'string'
      || candidate.title.length < 3
      || candidate.title.length > 120
      || candidate.title.trim() !== candidate.title
      || /[\u0000-\u001f\u007f]/.test(candidate.title)
    ) {
      throw new LaunchExecutionPlanValidationError('task_id_invalid');
    }
    if (byId.has(candidate.id)) {
      throw new LaunchExecutionPlanValidationError('task_duplicate');
    }
    if (!isOwner(candidate.owner)) {
      throw new LaunchExecutionPlanValidationError('task_owner_invalid');
    }
    if (!isStatus(candidate.status)) {
      throw new LaunchExecutionPlanValidationError('task_status_invalid');
    }
    if (
      (candidate.status === 'pending_manual' && candidate.owner === 'agent')
      || (['ready_agent', 'pending_approval'].includes(candidate.status)
        && candidate.owner === 'human')
    ) {
      throw new LaunchExecutionPlanValidationError('task_status_owner_invalid');
    }
    if (
      !Array.isArray(candidate.dependsOn)
      || candidate.dependsOn.length > 12
      || !candidate.dependsOn.every(dependency => typeof dependency === 'string')
      || new Set(candidate.dependsOn).size !== candidate.dependsOn.length
    ) {
      throw new LaunchExecutionPlanValidationError('dependency_invalid');
    }
    if (
      !Array.isArray(candidate.gateRefs)
      || candidate.gateRefs.length > 8
      || !candidate.gateRefs.every(isGateRef)
      || new Set(candidate.gateRefs).size !== candidate.gateRefs.length
    ) {
      throw new LaunchExecutionPlanValidationError('gate_ref_invalid');
    }
    if (
      !Array.isArray(candidate.evidence)
      || candidate.evidence.length === 0
      || candidate.evidence.length > 8
      || !candidate.evidence.every(isEvidencePath)
      || new Set(candidate.evidence).size !== candidate.evidence.length
    ) {
      throw new LaunchExecutionPlanValidationError('evidence_path_invalid');
    }
    byId.set(candidate.id, Object.freeze({
      id: candidate.id,
      title: candidate.title,
      owner: candidate.owner,
      status: candidate.status,
      dependsOn: Object.freeze([...candidate.dependsOn]),
      gateRefs: Object.freeze([...candidate.gateRefs]),
      evidence: Object.freeze([...candidate.evidence]),
    }));
  }

  for (const task of byId.values()) {
    if (task.dependsOn.includes(task.id) || task.dependsOn.some(id => !byId.has(id))) {
      throw new LaunchExecutionPlanValidationError('dependency_invalid');
    }
  }
  assertAcyclic(byId);

  for (const task of byId.values()) {
    const dependencies = task.dependsOn.map(id => byId.get(id)!);
    if (task.status === 'complete' && dependencies.some(item => item.status !== 'complete')) {
      throw new LaunchExecutionPlanValidationError('dependency_status_invalid');
    }
    if (task.status === 'ready_agent' && dependencies.some(item => item.status !== 'complete')) {
      throw new LaunchExecutionPlanValidationError('dependency_status_invalid');
    }
    if (
      task.status === 'blocked_dependency'
      && (dependencies.length === 0 || dependencies.every(item => item.status === 'complete'))
    ) {
      throw new LaunchExecutionPlanValidationError('dependency_status_invalid');
    }
  }

  const statuses = gateStatuses(web, native);
  for (const [gateRef, gateStatus] of statuses) {
    const referencing = [...byId.values()].filter(task => task.gateRefs.includes(gateRef));
    if (gateStatus === 'complete') {
      if (referencing.some(task => task.status !== 'complete')) {
        throw new LaunchExecutionPlanValidationError('complete_gate_reopened');
      }
    } else if (!referencing.some(task => task.status !== 'complete')) {
      throw new LaunchExecutionPlanValidationError('gate_coverage_missing');
    }
  }

  const overallStatus = expectedOverallStatus(web, native);
  if (value.overallStatus !== overallStatus) {
    throw new LaunchExecutionPlanValidationError('overall_status_mismatch');
  }

  return Object.freeze({
    schemaVersion: LAUNCH_EXECUTION_PLAN_SCHEMA_VERSION,
    sourceDocument: LAUNCH_EXECUTION_PLAN_SOURCE_DOCUMENT,
    updatedAt: value.updatedAt,
    overallStatus,
    releaseOrder: LAUNCH_EXECUTION_RELEASE_ORDER,
    tasks: Object.freeze([...byId.values()]),
  });
}

export function evaluateLaunchExecutionPlan(
  document: LaunchExecutionPlanDocument,
): LaunchExecutionPlanReport {
  const counts: Record<LaunchExecutionTaskStatus, number> = {
    complete: 0,
    ready_agent: 0,
    pending_manual: 0,
    pending_approval: 0,
    blocked_dependency: 0,
    deferred: 0,
  };
  for (const task of document.tasks) counts[task.status] += 1;
  const idsFor = (status: LaunchExecutionTaskStatus) => Object.freeze(
    document.tasks.filter(task => task.status === status).map(task => task.id),
  );
  return Object.freeze({
    updatedAt: document.updatedAt,
    launchReady: document.overallStatus === 'ready',
    totalTaskCount: document.tasks.length,
    counts: Object.freeze(counts),
    humanActionIds: idsFor('pending_manual'),
    agentReadyIds: idsFor('ready_agent'),
    approvalIds: idsFor('pending_approval'),
    blockedIds: idsFor('blocked_dependency'),
    deferredIds: idsFor('deferred'),
  });
}
