import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { join } from 'node:path';

import {
  createSyncIncidentReport,
  parseSyncIncidentReport,
} from '../lib/observability/sync-incident-contract';
import {
  createSyncIncidentReporter,
  SYNC_INCIDENT_REPORT_COOLDOWN_MS,
} from '../lib/observability/sync-incident-client';
import { classifySyncFailure } from '../lib/sync/sync-error-policy';

const testRequire = createRequire(import.meta.url);
const serverOnlyPath = testRequire.resolve('server-only');
const serverOnlyMarker = new Module(serverOnlyPath);
serverOnlyMarker.filename = serverOnlyPath;
serverOnlyMarker.loaded = true;
serverOnlyMarker.exports = {};
testRequire.cache[serverOnlyPath] = serverOnlyMarker;

const {
  createSyncIncidentRouteHandlers,
  OPTIONS,
  maxDuration,
  runtime,
} = testRequire('../app/api/operational-events/sync/route') as typeof import(
  '../app/api/operational-events/sync/route'
);

type TestFn = () => void | Promise<void>;
const tests: Array<{ name: string; fn: TestFn }> = [];

function runTest(name: string, fn: TestFn): void {
  tests.push({ name, fn });
}

function reportBody(kind: 'permission_blocked' | 'unexpected_failure' = 'permission_blocked') {
  return JSON.stringify({ schemaVersion: 1, kind, pendingCount: 7 });
}

runTest('sync incident contract accepts only fixed de-identified fields', () => {
  assert.deepEqual(createSyncIncidentReport('permission_blocked', 7), {
    schemaVersion: 1,
    kind: 'permission_blocked',
    pendingCount: 7,
  });
  assert.equal(parseSyncIncidentReport({
    schemaVersion: 1,
    kind: 'permission_blocked',
    pendingCount: 7,
    userId: 'owner-secret',
  }), null);
  assert.equal(parseSyncIncidentReport({
    schemaVersion: 1,
    kind: 'unexpected_failure',
    pendingCount: -1,
  }), null);
  assert.equal(parseSyncIncidentReport({
    schemaVersion: 2,
    kind: 'unexpected_failure',
    pendingCount: 0,
  }), null);
});

runTest('sync failure classification never returns raw error content', () => {
  assert.equal(classifySyncFailure({ message: 'Failed to fetch' }), 'network');
  assert.equal(classifySyncFailure({ code: 'PGRST301', message: 'secret' }), 'permission');
  assert.equal(classifySyncFailure(new Error('private provider detail')), 'unexpected');
});

runTest('client reporter uses the portable API base and throttles attempts', async () => {
  let now = 1_000;
  const requests: Array<{ url: string; authorization: string; body: string }> = [];
  const reporter = createSyncIncidentReporter({
    now: () => now,
    apiUrl: {
      configuredBaseUrl: 'https://api.example.test/v1',
      buildTarget: 'mobile',
      runtimeProtocol: 'capacitor:',
    },
    fetchImpl: (async (input, init) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get('Authorization') ?? '',
        body: String(init?.body),
      });
      return new Response(JSON.stringify({ ok: true }), { status: 202 });
    }) as typeof fetch,
  });

  assert.equal(await reporter({
    accessToken: 'verified-token',
    kind: 'permission_blocked',
    pendingCount: 7,
  }), 'reported');
  assert.equal(await reporter({
    accessToken: 'verified-token',
    kind: 'permission_blocked',
    pendingCount: 8,
  }), 'throttled');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.example.test/v1/api/operational-events/sync');
  assert.equal(requests[0].authorization, 'Bearer verified-token');
  assert.deepEqual(JSON.parse(requests[0].body), {
    schemaVersion: 1,
    kind: 'permission_blocked',
    pendingCount: 7,
  });

  now += SYNC_INCIDENT_REPORT_COOLDOWN_MS;
  assert.equal(await reporter({
    accessToken: 'verified-token',
    kind: 'permission_blocked',
    pendingCount: 8,
  }), 'reported');
  assert.equal(requests.length, 2);
});

runTest('client reporter is non-blocking when transport is unavailable', async () => {
  const reporter = createSyncIncidentReporter({
    apiUrl: { configuredBaseUrl: 'https://api.example.test' },
    fetchImpl: (async () => { throw new Error('private network detail'); }) as typeof fetch,
  });
  assert.equal(await reporter({
    accessToken: 'verified-token',
    kind: 'unexpected_failure',
    pendingCount: 3,
  }), 'unavailable');
});

runTest('authenticated route records only the bounded server event', async () => {
  const recorded: unknown[] = [];
  const handlers = createSyncIncidentRouteHandlers({
    resolveActor: async () => ({ actorId: 'owner-secret' }),
    recordIncident: input => recorded.push(input),
  });
  const response = await handlers.POST(new Request(
    'https://app.example.test/api/operational-events/sync',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: reportBody(),
    },
  ));

  assert.equal(response.status, 202);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(recorded, [{
    level: 'warn',
    event: 'sync.permission_blocked',
    outcome: 'failure',
    code: 'permission_sync_blocked',
    route: '/api/operational-events/sync',
    metrics: { pendingCount: 7 },
  }]);
  assert.doesNotMatch(JSON.stringify(recorded), /owner-secret/);
});

runTest('route rejects unauthenticated malformed and oversized reports', async () => {
  let recordCount = 0;
  const authenticated = createSyncIncidentRouteHandlers({
    resolveActor: async () => ({ actorId: 'owner-secret' }),
    recordIncident: () => { recordCount += 1; },
  });
  const unauthenticated = createSyncIncidentRouteHandlers({
    resolveActor: async () => null,
    recordIncident: () => { recordCount += 1; },
  });

  const authResponse = await unauthenticated.POST(new Request(
    'https://app.example.test/api/operational-events/sync',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: reportBody() },
  ));
  assert.equal(authResponse.status, 401);

  const malformedResponse = await authenticated.POST(new Request(
    'https://app.example.test/api/operational-events/sync',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: 1,
        kind: 'permission_blocked',
        pendingCount: 1,
        message: 'raw secret',
      }),
    },
  ));
  assert.equal(malformedResponse.status, 400);

  const oversizedResponse = await authenticated.POST(new Request(
    'https://app.example.test/api/operational-events/sync',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '513' },
      body: reportBody(),
    },
  ));
  assert.equal(oversizedResponse.status, 413);
  assert.equal(recordCount, 0);
});

runTest('sync incident route exposes the expected cross-platform boundary', () => {
  assert.equal(runtime, 'nodejs');
  assert.equal(maxDuration, 5);
  const preflight = OPTIONS(new Request(
    'https://app.example.test/api/operational-events/sync',
    {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://app.example.test',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
      },
    },
  ));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');

  const root = join(__dirname, '..');
  const routeSource = readFileSync(join(root, 'app/api/operational-events/sync/route.ts'), 'utf8');
  const clientSource = readFileSync(join(root, 'lib/observability/sync-incident-client.ts'), 'utf8');
  const pauseSource = readFileSync(join(root, 'lib/sync/sync-permission-pause-service.ts'), 'utf8');
  assert.match(routeSource, /authenticateAppApiRequest/);
  assert.match(routeSource, /recordIncident\(operationalEventFor\(report\)\)/);
  assert.doesNotMatch(clientSource, /localStorage|sessionStorage|window\.|document\.|navigator\.|@capacitor/i);
  assert.doesNotMatch(pauseSource, /errorMessage|errorCode|userId/);
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
  if (failed > 0) throw new Error(`${failed} sync incident observability tests failed`);
}

void main();
