export const OPERATIONAL_ALERT_POLICY_VERSION = 1 as const;

export type OperationalAlertSeverity = 'warning' | 'release_blocker';

export type OperationalAlertSignal =
  | 'cleanup_not_confirmed'
  | 'failure_count_threshold'
  | 'failure_rate_threshold'
  | 'latest_probe_failed'
  | 'latest_probe_release_mismatch'
  | 'no_probe_within_10_minutes'
  | 'no_probe_within_5_minutes'
  | 'no_success_within_30_hours'
  | 'no_success_within_36_hours'
  | 'partial_or_failed_delete'
  | 'partial_or_failed_run'
  | 'two_consecutive_failures';

export type OperationalAlertId =
  | 'health.probe_failure'
  | 'health.probe_overdue'
  | 'health.release_identity_mismatch'
  | 'media.sales_photo.delete_cleanup_failure'
  | 'media.sales_photo.expiration_failure'
  | 'media.sales_photo.expiration_overdue'
  | 'media.sales_photo.image_read_failure_spike'
  | 'media.sales_photo.upload_compensation_failure'
  | 'media.sales_photo.upload_failure_spike'
  | 'sync.permission_blocked_spike'
  | 'sync.unexpected_failure_spike';

export type OperationalAlertEvent = Readonly<{
  schemaVersion: number;
  timestamp: string;
  event: string;
  outcome: 'success' | 'partial' | 'failure';
  metrics?: Readonly<{
    attemptedCount?: number;
    failedCount?: number;
  }>;
}>;

export type OperationalHealthProbe = Readonly<{
  timestamp: string;
  healthy: boolean;
  releaseMatches: boolean;
}>;

export type OperationalAlert = Readonly<{
  id: OperationalAlertId;
  severity: OperationalAlertSeverity;
  signal: OperationalAlertSignal;
  observedCount?: number;
  attemptedCount?: number;
  windowMinutes?: number;
}>;

export type OperationalAlertSnapshot = Readonly<{
  policyVersion: typeof OPERATIONAL_ALERT_POLICY_VERSION;
  evaluatedAt: string;
  observationStartedAt: string;
  status: 'healthy' | OperationalAlertSeverity;
  alerts: readonly OperationalAlert[];
}>;

export type OperationalAlertPolicyInput = Readonly<{
  now: string;
  observationStartedAt: string;
  events: readonly OperationalAlertEvent[];
  healthProbes: readonly OperationalHealthProbe[];
}>;

const MINUTE_MS = 60 * 1_000;
const HOUR_MS = 60 * MINUTE_MS;
const FAILURE_WINDOW_MS = 15 * MINUTE_MS;
const HEALTH_PROBE_WARNING_MS = 5 * MINUTE_MS;
const HEALTH_PROBE_BLOCKER_MS = 10 * MINUTE_MS;
const EXPIRATION_WARNING_MS = 30 * HOUR_MS;
const EXPIRATION_BLOCKER_MS = 36 * HOUR_MS;

function parseRequiredInstant(value: string, label: string): number {
  const instant = Date.parse(value);
  if (!Number.isFinite(instant)) throw new Error(`${label} must be a valid ISO timestamp`);
  return instant;
}

function parseOptionalInstant(value: string): number | null {
  const instant = Date.parse(value);
  return Number.isFinite(instant) ? instant : null;
}

function boundedCount(value: unknown): number | null {
  if (
    typeof value !== 'number'
    || !Number.isSafeInteger(value)
    || value < 0
    || value > 1_000_000_000
  ) return null;
  return value;
}

function failureUnits(event: OperationalAlertEvent): number {
  const metricCount = boundedCount(event.metrics?.failedCount);
  if (event.outcome === 'success') return metricCount ?? 0;
  return Math.max(metricCount ?? 0, 1);
}

function attemptedUnits(event: OperationalAlertEvent): number {
  return Math.max(boundedCount(event.metrics?.attemptedCount) ?? 1, failureUnits(event));
}

function createAlert(
  id: OperationalAlertId,
  severity: OperationalAlertSeverity,
  signal: OperationalAlertSignal,
  counts: Readonly<{
    observedCount?: number;
    attemptedCount?: number;
    windowMinutes?: number;
  }> = {},
): OperationalAlert {
  return Object.freeze({ id, severity, signal, ...counts });
}

function severityRank(severity: OperationalAlertSeverity): number {
  return severity === 'release_blocker' ? 0 : 1;
}

export function evaluateOperationalAlertPolicy(
  input: OperationalAlertPolicyInput,
): OperationalAlertSnapshot {
  const nowMs = parseRequiredInstant(input.now, 'now');
  const observationStartedAtMs = parseRequiredInstant(
    input.observationStartedAt,
    'observationStartedAt',
  );
  if (observationStartedAtMs > nowMs) {
    throw new Error('observationStartedAt cannot be after now');
  }
  if (nowMs - observationStartedAtMs < EXPIRATION_BLOCKER_MS) {
    throw new Error('observation window must cover at least 36 hours');
  }

  const events = input.events
    .filter(event => event.schemaVersion === 1)
    .map(event => ({ event, timestampMs: parseOptionalInstant(event.timestamp) }))
    .filter(
      (item): item is { event: OperationalAlertEvent; timestampMs: number } =>
        item.timestampMs !== null
        && item.timestampMs >= observationStartedAtMs
        && item.timestampMs <= nowMs,
    );
  const healthProbes = input.healthProbes
    .map(probe => ({ probe, timestampMs: parseOptionalInstant(probe.timestamp) }))
    .filter(
      (item): item is { probe: OperationalHealthProbe; timestampMs: number } =>
        item.timestampMs !== null
        && item.timestampMs >= observationStartedAtMs
        && item.timestampMs <= nowMs,
    )
    .sort((left, right) => left.timestampMs - right.timestampMs);

  const alerts: OperationalAlert[] = [];
  const latestProbeItem = healthProbes.at(-1);
  const latestProbe = latestProbeItem?.probe;
  const latestProbeAgeMs = nowMs - (latestProbeItem?.timestampMs ?? observationStartedAtMs);
  if (latestProbeAgeMs >= HEALTH_PROBE_BLOCKER_MS) {
    alerts.push(createAlert(
      'health.probe_overdue',
      'release_blocker',
      'no_probe_within_10_minutes',
      { windowMinutes: HEALTH_PROBE_BLOCKER_MS / MINUTE_MS },
    ));
  } else if (latestProbeAgeMs >= HEALTH_PROBE_WARNING_MS) {
    alerts.push(createAlert(
      'health.probe_overdue',
      'warning',
      'no_probe_within_5_minutes',
      { windowMinutes: HEALTH_PROBE_WARNING_MS / MINUTE_MS },
    ));
  }
  if (latestProbe?.healthy && !latestProbe.releaseMatches) {
    alerts.push(createAlert(
      'health.release_identity_mismatch',
      'release_blocker',
      'latest_probe_release_mismatch',
      { observedCount: 1 },
    ));
  }

  const latestTwoProbes = healthProbes.slice(-2);
  if (latestTwoProbes.length === 2 && latestTwoProbes.every(item => !item.probe.healthy)) {
    alerts.push(createAlert(
      'health.probe_failure',
      'release_blocker',
      'two_consecutive_failures',
      { observedCount: 2, windowMinutes: 10 },
    ));
  } else if (latestProbe && !latestProbe.healthy) {
    alerts.push(createAlert(
      'health.probe_failure',
      'warning',
      'latest_probe_failed',
      { observedCount: 1, windowMinutes: 5 },
    ));
  }

  const expirationEvents = events.filter(
    item => item.event.event === 'media.sales_photo.expiration.run',
  );
  const expirationFailures = expirationEvents.filter(
    item => item.event.outcome !== 'success',
  );
  if (expirationFailures.length > 0) {
    alerts.push(createAlert(
      'media.sales_photo.expiration_failure',
      'release_blocker',
      'partial_or_failed_run',
      { observedCount: expirationFailures.length },
    ));
  }

  const latestExpirationSuccessMs = expirationEvents
    .filter(item => item.event.outcome === 'success')
    .reduce((latest, item) => Math.max(latest, item.timestampMs), observationStartedAtMs);
  const expirationSuccessAgeMs = nowMs - latestExpirationSuccessMs;
  if (expirationSuccessAgeMs >= EXPIRATION_BLOCKER_MS) {
    alerts.push(createAlert(
      'media.sales_photo.expiration_overdue',
      'release_blocker',
      'no_success_within_36_hours',
      { windowMinutes: EXPIRATION_BLOCKER_MS / MINUTE_MS },
    ));
  } else if (expirationSuccessAgeMs >= EXPIRATION_WARNING_MS) {
    alerts.push(createAlert(
      'media.sales_photo.expiration_overdue',
      'warning',
      'no_success_within_30_hours',
      { windowMinutes: EXPIRATION_WARNING_MS / MINUTE_MS },
    ));
  }

  const recentCutoffMs = nowMs - FAILURE_WINDOW_MS;
  const recentEvents = events.filter(item => item.timestampMs >= recentCutoffMs);
  const permissionBlockedFailures = recentEvents
    .filter(item => item.event.event === 'sync.permission_blocked')
    .reduce((total, item) => total + failureUnits(item.event), 0);
  if (permissionBlockedFailures >= 3) {
    alerts.push(createAlert(
      'sync.permission_blocked_spike',
      'release_blocker',
      'failure_count_threshold',
      {
        observedCount: permissionBlockedFailures,
        windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS,
      },
    ));
  } else if (permissionBlockedFailures >= 1) {
    alerts.push(createAlert(
      'sync.permission_blocked_spike',
      'warning',
      'failure_count_threshold',
      {
        observedCount: permissionBlockedFailures,
        windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS,
      },
    ));
  }

  const unexpectedSyncFailures = recentEvents
    .filter(item => item.event.event === 'sync.unexpected_failure')
    .reduce((total, item) => total + failureUnits(item.event), 0);
  if (unexpectedSyncFailures >= 5) {
    alerts.push(createAlert(
      'sync.unexpected_failure_spike',
      'release_blocker',
      'failure_count_threshold',
      {
        observedCount: unexpectedSyncFailures,
        windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS,
      },
    ));
  } else if (unexpectedSyncFailures >= 3) {
    alerts.push(createAlert(
      'sync.unexpected_failure_spike',
      'warning',
      'failure_count_threshold',
      {
        observedCount: unexpectedSyncFailures,
        windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS,
      },
    ));
  }

  const uploadEvents = recentEvents
    .filter(item => item.event.event === 'media.sales_photo.upload')
    .map(item => item.event);
  const uploadFailures = uploadEvents.reduce((total, event) => total + failureUnits(event), 0);
  const uploadAttempts = uploadEvents.reduce((total, event) => total + attemptedUnits(event), 0);
  const uploadFailureRate = uploadAttempts === 0 ? 0 : uploadFailures / uploadAttempts;
  if (uploadFailures >= 5 || (uploadAttempts >= 10 && uploadFailureRate >= 0.1)) {
    alerts.push(createAlert(
      'media.sales_photo.upload_failure_spike',
      'release_blocker',
      uploadFailures >= 5 ? 'failure_count_threshold' : 'failure_rate_threshold',
      {
        observedCount: uploadFailures,
        attemptedCount: uploadAttempts,
        windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS,
      },
    ));
  } else if (uploadFailures >= 3) {
    alerts.push(createAlert(
      'media.sales_photo.upload_failure_spike',
      'warning',
      'failure_count_threshold',
      {
        observedCount: uploadFailures,
        attemptedCount: uploadAttempts,
        windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS,
      },
    ));
  }

  const compensationFailures = events.filter(
    item => item.event.event === 'media.sales_photo.upload_compensation'
      && item.event.outcome !== 'success',
  );
  if (compensationFailures.length > 0) {
    alerts.push(createAlert(
      'media.sales_photo.upload_compensation_failure',
      'release_blocker',
      'cleanup_not_confirmed',
      { observedCount: compensationFailures.length },
    ));
  }

  const imageReadFailures = recentEvents
    .filter(item => item.event.event === 'media.sales_photo.image_read')
    .reduce((total, item) => total + failureUnits(item.event), 0);
  if (imageReadFailures >= 5) {
    alerts.push(createAlert(
      'media.sales_photo.image_read_failure_spike',
      'release_blocker',
      'failure_count_threshold',
      { observedCount: imageReadFailures, windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS },
    ));
  } else if (imageReadFailures >= 3) {
    alerts.push(createAlert(
      'media.sales_photo.image_read_failure_spike',
      'warning',
      'failure_count_threshold',
      { observedCount: imageReadFailures, windowMinutes: FAILURE_WINDOW_MS / MINUTE_MS },
    ));
  }

  const deleteFailures = events.filter(
    item => item.event.event === 'media.sales_photo.delete'
      && item.event.outcome !== 'success',
  );
  if (deleteFailures.length > 0) {
    alerts.push(createAlert(
      'media.sales_photo.delete_cleanup_failure',
      'release_blocker',
      'partial_or_failed_delete',
      { observedCount: deleteFailures.length },
    ));
  }

  alerts.sort((left, right) =>
    severityRank(left.severity) - severityRank(right.severity)
      || left.id.localeCompare(right.id));

  const status = alerts.some(alert => alert.severity === 'release_blocker')
    ? 'release_blocker'
    : alerts.length > 0
      ? 'warning'
      : 'healthy';

  return Object.freeze({
    policyVersion: OPERATIONAL_ALERT_POLICY_VERSION,
    evaluatedAt: new Date(nowMs).toISOString(),
    observationStartedAt: new Date(observationStartedAtMs).toISOString(),
    status,
    alerts: Object.freeze(alerts),
  });
}
