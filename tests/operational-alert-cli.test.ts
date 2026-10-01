import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type InputFixture = {
  now: string;
  observationStartedAt: string;
  events: unknown[];
  healthProbes: unknown[];
};

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'boothbook-operational-alerts-'));
const cliPath = resolve('scripts/evaluate-web-operational-alerts.ts');

const baseInput: InputFixture = {
  now: '2026-08-01T12:00:00.000Z',
  observationStartedAt: '2026-07-30T12:00:00.000Z',
  events: [{
    schemaVersion: 1,
    timestamp: '2026-08-01T10:00:00.000Z',
    event: 'media.sales_photo.expiration.run',
    outcome: 'success',
  }],
  healthProbes: [{
    timestamp: '2026-08-01T11:59:00.000Z',
    healthy: true,
    releaseMatches: true,
  }],
};

function runCli(name: string, input: InputFixture) {
  const inputPath = join(temporaryDirectory, `${name}.json`);
  writeFileSync(inputPath, JSON.stringify(input), { encoding: 'utf8', mode: 0o600 });
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', cliPath, `--input=${inputPath}`],
    { encoding: 'utf8', windowsHide: true },
  );
}

try {
  const healthy = runCli('healthy', baseInput);
  assert.equal(healthy.status, 0, healthy.stderr);
  assert.equal(JSON.parse(healthy.stdout).snapshot.status, 'healthy');

  const warning = runCli('warning', {
    ...baseInput,
    healthProbes: [{
      timestamp: '2026-08-01T11:59:00.000Z',
      healthy: false,
      releaseMatches: false,
    }],
  });
  assert.equal(warning.status, 1, warning.stderr);
  assert.equal(JSON.parse(warning.stdout).snapshot.status, 'warning');

  const blocker = runCli('blocker', {
    ...baseInput,
    healthProbes: [],
  });
  assert.equal(blocker.status, 2, blocker.stderr);
  const blockerOutput = JSON.parse(blocker.stdout);
  assert.equal(blockerOutput.snapshot.status, 'release_blocker');
  assert.doesNotMatch(blocker.stdout, /private-object-key|raw-provider-message/);

  const malformed = runCli('malformed', {
    ...baseInput,
    events: [{
      schemaVersion: 1,
      timestamp: '2026-08-01T11:59:00.000Z',
      event: 'media.sales_photo.upload',
      outcome: 'failure',
      metrics: { attemptedCount: 1.5, failedCount: 1 },
      objectKey: 'private-object-key',
      message: 'raw-provider-message',
    }],
  });
  assert.equal(malformed.status, 64);
  assert.equal(malformed.stdout, '');
  assert.deepEqual(JSON.parse(malformed.stderr), { ok: false, code: 'input_invalid' });

  const shortWindow = runCli('short-window', {
    ...baseInput,
    observationStartedAt: '2026-08-01T11:00:00.000Z',
  });
  assert.equal(shortWindow.status, 64);
  assert.deepEqual(JSON.parse(shortWindow.stderr), { ok: false, code: 'evaluation_failed' });
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}

console.log('PASS bounded operational alert CLI exits and output');
