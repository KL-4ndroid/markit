import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluateOperationalAlertPolicy,
  type OperationalAlertEvent,
  type OperationalAlertId,
  type OperationalAlertPolicyInput,
  type OperationalHealthProbe,
} from '../lib/observability/operational-alert-policy';

const NOW = '2026-08-01T12:00:00.000Z';
const OBSERVATION_STARTED_AT = '2026-07-30T12:00:00.000Z';

function event(
  eventName: string,
  outcome: OperationalAlertEvent['outcome'],
  timestamp = '2026-08-01T11:58:00.000Z',
  metrics?: OperationalAlertEvent['metrics'],
): OperationalAlertEvent {
  return {
    schemaVersion: 1,
    timestamp,
    event: eventName,
    outcome,
    ...(metrics ? { metrics } : {}),
  };
}

function probe(
  timestamp: string,
  healthy = true,
  releaseMatches = true,
): OperationalHealthProbe {
  return { timestamp, healthy, releaseMatches };
}

function evaluate(changes: Partial<OperationalAlertPolicyInput> = {}) {
  return evaluateOperationalAlertPolicy({
    now: NOW,
    observationStartedAt: OBSERVATION_STARTED_AT,
    events: [event(
      'media.sales_photo.expiration.run',
      'success',
      '2026-08-01T10:00:00.000Z',
    )],
    healthProbes: [probe('2026-08-01T11:59:00.000Z')],
    ...changes,
  });
}

function alert(snapshot: ReturnType<typeof evaluate>, id: OperationalAlertId) {
  return snapshot.alerts.find(item => item.id === id);
}

assert.equal(evaluate().status, 'healthy');
assert.deepEqual(evaluate().alerts, []);

const failedProbe = evaluate({
  healthProbes: [probe('2026-08-01T11:59:00.000Z', false, false)],
});
assert.equal(failedProbe.status, 'warning');
assert.equal(alert(failedProbe, 'health.probe_failure')?.signal, 'latest_probe_failed');

const consecutiveFailures = evaluate({
  healthProbes: [
    probe('2026-08-01T11:54:00.000Z', false, false),
    probe('2026-08-01T11:59:00.000Z', false, false),
  ],
});
assert.equal(consecutiveFailures.status, 'release_blocker');
assert.equal(alert(consecutiveFailures, 'health.probe_failure')?.observedCount, 2);

const releaseMismatch = evaluate({
  healthProbes: [probe('2026-08-01T11:59:00.000Z', true, false)],
});
assert.equal(releaseMismatch.status, 'release_blocker');
assert.ok(alert(releaseMismatch, 'health.release_identity_mismatch'));

const overdueProbeWarning = evaluate({
  healthProbes: [probe('2026-08-01T11:55:00.000Z')],
});
assert.equal(overdueProbeWarning.status, 'warning');
assert.equal(alert(overdueProbeWarning, 'health.probe_overdue')?.windowMinutes, 5);

const missingProbeBlocker = evaluate({ healthProbes: [] });
assert.equal(missingProbeBlocker.status, 'release_blocker');
assert.equal(alert(missingProbeBlocker, 'health.probe_overdue')?.windowMinutes, 10);

const expirationWarning = evaluate({
  events: [event(
    'media.sales_photo.expiration.run',
    'success',
    '2026-07-31T06:00:00.000Z',
  )],
});
assert.equal(expirationWarning.status, 'warning');
assert.equal(alert(expirationWarning, 'media.sales_photo.expiration_overdue')?.windowMinutes, 1_800);

const expirationBlocker = evaluate({ events: [] });
assert.equal(expirationBlocker.status, 'release_blocker');
assert.equal(alert(expirationBlocker, 'media.sales_photo.expiration_overdue')?.windowMinutes, 2_160);

const expirationFailure = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.expiration.run', 'partial'),
  ],
});
assert.equal(expirationFailure.status, 'release_blocker');
assert.equal(alert(expirationFailure, 'media.sales_photo.expiration_failure')?.observedCount, 1);

const uploadWarning = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.upload', 'failure', undefined, { attemptedCount: 3, failedCount: 3 }),
  ],
});
assert.equal(uploadWarning.status, 'warning');
assert.equal(alert(uploadWarning, 'media.sales_photo.upload_failure_spike')?.observedCount, 3);

const uploadCountBlocker = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.upload', 'failure', undefined, { attemptedCount: 5, failedCount: 5 }),
  ],
});
assert.equal(uploadCountBlocker.status, 'release_blocker');
assert.equal(alert(uploadCountBlocker, 'media.sales_photo.upload_failure_spike')?.signal, 'failure_count_threshold');

const uploadRateBlocker = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.upload', 'failure', undefined, { attemptedCount: 1, failedCount: 1 }),
    event('media.sales_photo.upload', 'success', undefined, { attemptedCount: 9, failedCount: 0 }),
  ],
});
assert.equal(uploadRateBlocker.status, 'release_blocker');
assert.equal(alert(uploadRateBlocker, 'media.sales_photo.upload_failure_spike')?.signal, 'failure_rate_threshold');
assert.equal(alert(uploadRateBlocker, 'media.sales_photo.upload_failure_spike')?.attemptedCount, 10);

const compensationBlocker = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.upload_compensation', 'failure'),
  ],
});
assert.equal(compensationBlocker.status, 'release_blocker');
assert.ok(alert(compensationBlocker, 'media.sales_photo.upload_compensation_failure'));

const imageReadWarning = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.image_read', 'failure', undefined, { failedCount: 3 }),
  ],
});
assert.equal(imageReadWarning.status, 'warning');

const imageReadBlocker = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.image_read', 'failure', undefined, { failedCount: 5 }),
  ],
});
assert.equal(imageReadBlocker.status, 'release_blocker');
assert.equal(alert(imageReadBlocker, 'media.sales_photo.image_read_failure_spike')?.observedCount, 5);

const deleteBlocker = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.delete', 'partial'),
  ],
});
assert.equal(deleteBlocker.status, 'release_blocker');
assert.ok(alert(deleteBlocker, 'media.sales_photo.delete_cleanup_failure'));

const ignoredInputs = evaluate({
  events: [
    event('media.sales_photo.expiration.run', 'success', '2026-08-01T10:00:00.000Z'),
    event('media.sales_photo.upload', 'failure', '2026-08-01T11:40:00.000Z', {
      attemptedCount: 10,
      failedCount: 10,
    }),
    { ...event('media.sales_photo.delete', 'failure'), schemaVersion: 2 },
    event('media.sales_photo.delete', 'failure', 'not-a-timestamp'),
  ],
  healthProbes: [
    probe('not-a-timestamp', false, false),
    probe('2026-08-01T11:59:00.000Z'),
  ],
});
assert.equal(ignoredInputs.status, 'healthy');

assert.throws(
  () => evaluate({ now: 'not-a-timestamp' }),
  /now must be a valid ISO timestamp/,
);
assert.throws(
  () => evaluate({ observationStartedAt: '2026-08-01T13:00:00.000Z' }),
  /cannot be after now/,
);
assert.throws(
  () => evaluate({ observationStartedAt: '2026-08-01T11:00:00.000Z' }),
  /at least 36 hours/,
);

const safeOutput = JSON.stringify(uploadRateBlocker);
assert.deepEqual(
  Object.keys(uploadRateBlocker).sort(),
  ['alerts', 'evaluatedAt', 'observationStartedAt', 'policyVersion', 'status'],
);
assert.deepEqual(
  Object.keys(uploadRateBlocker.alerts[0]).sort(),
  ['attemptedCount', 'id', 'observedCount', 'severity', 'signal', 'windowMinutes'],
);
assert.doesNotMatch(safeOutput, /owner-secret|private\/object\/key|raw upstream error/);
assert.match(safeOutput, /media\.sales_photo\.upload_failure_spike/);

const root = process.cwd();
const packageJson = readFileSync(join(root, 'package.json'), 'utf8');
const manifest = readFileSync(join(root, 'scripts/test-files.txt'), 'utf8');
const runbook = readFileSync(join(root, 'docs/WEB_OPERATIONAL_OBSERVABILITY.md'), 'utf8');
assert.ok(packageJson.includes('"check:operational-alerts"'));
assert.ok(manifest.includes('tsx tests/operational-alert-policy.test.ts'));
assert.ok(manifest.includes('tsx tests/operational-alert-cli.test.ts'));
assert.ok(runbook.includes('at least 36 complete hours'));
assert.ok(runbook.includes('does not prove production log delivery or alert routing'));

console.log('PASS deterministic operational alert policy');
