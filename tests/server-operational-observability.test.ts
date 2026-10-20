import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

const testRequire = createRequire(import.meta.url);
const serverOnlyPath = testRequire.resolve('server-only');
const serverOnlyMarker = new Module(serverOnlyPath);
serverOnlyMarker.filename = serverOnlyPath;
serverOnlyMarker.loaded = true;
serverOnlyMarker.exports = {};
testRequire.cache[serverOnlyPath] = serverOnlyMarker;

const {
  createServerOperationalEventRecord,
  getSafeOperationalErrorName,
  recordServerOperationalEvent,
} = testRequire('../lib/observability/server-operational-event') as typeof import(
  '../lib/observability/server-operational-event'
);
const {
  createSalesPhotoEvidenceExpirationRouteHandlers,
} = testRequire('../app/api/cron/sales-photo-evidence-expiration/route') as typeof import(
  '../app/api/cron/sales-photo-evidence-expiration/route'
);

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];
const projectRoot = join(__dirname, '..');

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8');
}

function captureConsole(
  method: 'info' | 'warn' | 'error',
  action: () => void | Promise<void>
): Promise<string[]> {
  const captured: string[] = [];
  const original = console[method];
  console[method] = (value?: unknown) => {
    captured.push(String(value));
  };
  return Promise.resolve(action()).then(
    () => captured,
    error => { throw error; }
  ).finally(() => {
    console[method] = original;
  });
}

console.log('\n=== Server operational observability ===');

runTest('event records keep a bounded allowlist and release identity', () => {
  const record = createServerOperationalEventRecord({
    level: 'error',
    event: 'media.sales_photo.upload',
    outcome: 'partial',
    code: 'metadata_finalize_failed',
    route: '/api/sales-photo-evidence/upload',
    durationMs: 12.4,
    errorName: 'TypeError',
    metrics: {
      attemptedCount: 1,
      completedCount: 0,
      failedCount: 1,
      imageBytes: 120_000,
      pendingCount: 7,
    },
    actorId: 'owner-secret',
    objectKey: 'private/object/key',
    message: 'raw upstream error',
  } as Parameters<typeof createServerOperationalEventRecord>[0], {
    now: new Date('2026-07-30T12:00:00.000Z'),
    releaseCommitSha: 'ABCDEF1234567',
  });

  assert.deepEqual(record, {
    schemaVersion: 1,
    timestamp: '2026-07-30T12:00:00.000Z',
    level: 'error',
    event: 'media.sales_photo.upload',
    outcome: 'partial',
    code: 'metadata_finalize_failed',
    route: '/api/sales-photo-evidence/upload',
    durationMs: 12,
    errorName: 'TypeError',
    metrics: {
      attemptedCount: 1,
      completedCount: 0,
      failedCount: 1,
      imageBytes: 120_000,
      pendingCount: 7,
    },
    releaseCommitSha: 'abcdef1234567',
  });
  const serialized = JSON.stringify(record);
  assert.doesNotMatch(serialized, /owner-secret|private\/object\/key|raw upstream error/);
});

runTest('invalid tokens routes metrics and error names fail closed', () => {
  const record = createServerOperationalEventRecord({
    level: 'warn',
    event: 'bad event?token=secret',
    outcome: 'failure',
    code: 'bad code with spaces',
    route: '/api/media?token=secret',
    durationMs: Number.POSITIVE_INFINITY,
    errorName: 'Error<script>',
    metrics: {
      failedCount: -1,
      completedCount: Number.NaN,
    },
  }, {
    now: new Date('2026-07-30T12:00:00.000Z'),
    releaseCommitSha: 'not-a-sha',
  });

  assert.deepEqual(record, {
    schemaVersion: 1,
    timestamp: '2026-07-30T12:00:00.000Z',
    level: 'warn',
    event: 'observability.invalid_event',
    outcome: 'failure',
    code: 'invalid_code',
    route: '/api/unknown',
  });
  assert.equal(getSafeOperationalErrorName(new Error('secret message')), 'Error');
  assert.equal(getSafeOperationalErrorName('secret message'), 'UnknownError');
});

runTest('recording emits one JSON record and never changes route behavior', async () => {
  const captured = await captureConsole('info', () => {
    recordServerOperationalEvent({
      level: 'info',
      event: 'media.sales_photo.delete',
      outcome: 'success',
      code: 'delete_completed',
      route: '/api/sales-photo-evidence/delete',
    });
  });
  assert.equal(captured.length, 1);
  assert.equal(JSON.parse(captured[0]).event, 'media.sales_photo.delete');

  const originalInfo = console.info;
  console.info = () => { throw new Error('log sink unavailable'); };
  try {
    assert.doesNotThrow(() => recordServerOperationalEvent({
      level: 'info',
      event: 'media.sales_photo.delete',
      outcome: 'success',
      code: 'delete_completed',
      route: '/api/sales-photo-evidence/delete',
    }));
  } finally {
    console.info = originalInfo;
  }
});

runTest('expiration route records a redacted dependency failure after cron authorization', async () => {
  const handlers = createSalesPhotoEvidenceExpirationRouteHandlers({
    isEnabled: () => true,
    isAuthorized: () => true,
    createRepository: async () => null,
    createR2DeleteAdapter: async () => null,
  });
  const captured = await captureConsole('error', async () => {
    const response = await handlers.GET(new Request('https://app.example.test/api/cron/expiration', {
      headers: { Authorization: 'Bearer should-never-be-logged' },
    }));
    assert.equal(response.status, 503);
  });

  assert.equal(captured.length, 1);
  const event = JSON.parse(captured[0]);
  assert.equal(event.event, 'media.sales_photo.expiration.run');
  assert.equal(event.code, 'expiration_dependencies_unavailable');
  assert.doesNotMatch(captured[0], /should-never-be-logged/);
});

runTest('sales photo media routes use the shared event contract without direct console calls', () => {
  const routePaths = [
    'app/api/cron/sales-photo-evidence-expiration/route.ts',
    'app/api/sales-photo-evidence/upload/route.ts',
    'app/api/sales-photo-evidence/image/route.ts',
    'app/api/sales-photo-evidence/delete/route.ts',
  ];
  const combined = routePaths.map(readProjectFile).join('\n');

  for (const path of routePaths) {
    const source = readProjectFile(path);
    assert.match(source, /recordServerOperationalEvent/);
    assert.doesNotMatch(source, /console\.(?:info|warn|error|log)/);
  }
  assert.match(combined, /media\.sales_photo\.expiration\.run/);
  assert.match(combined, /media\.sales_photo\.upload/);
  assert.match(combined, /media\.sales_photo\.image_read/);
  assert.match(combined, /media\.sales_photo\.delete/);
});

async function main(): Promise<void> {
  let failed = 0;
  for (const test of tests) {
    try {
      await test.fn();
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${test.name}`);
      console.error(error);
    }
  }
  if (failed > 0) throw new Error(`${failed} server operational observability tests failed`);
}

void main();
