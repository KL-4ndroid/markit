import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { runBoundPreviewDeletionTick } from '../lib/subscription/account-deletion-engine-adapters.server';
import { createPreviewDeletionExecutor } from '../lib/subscription/account-deletion-preview-executor.server';
import { terminalPutTargetHash } from '../lib/subscription/account-deletion-terminal-put.server';

function fixture() {
  const actorId = randomUUID();
  const requestId = randomUUID();
  const bucket = 'markit-account-deletion-preview';
  const endpoint = `https://${'a'.repeat(32)}.r2.cloudflarestorage.com`;
  const receipt = { affectedCount: 1, evidenceHash: 'b'.repeat(64) };
  const calls: string[] = [];
  const objectKey = `sales-evidence/7d/${actorId}/fixture/image.webp`;
  const lease = { requestId, leaseToken: randomUUID(), accountKind: 'owner', stepCode: 'access_frozen' } as const;
  let time = 1000;
  const input = {
    deployment: 'preview', databaseUrl: 'https://tzhbirwchhqabkxhqjdl.supabase.co', r2Endpoint: endpoint, bucket,
    boundTargetHash: terminalPutTargetHash({ endpoint, bucket, mode: 'preview-photos' }),
    grant: { actorId, requestId, issuedAt: 1000, expiresAt: 2000 }, now: () => time,
    ports: {
      database: {
        async context() { calls.push('context'); return { actorId, objects: [] as { key: string; deleted: boolean; absent: boolean }[], totalObjects: 0 }; },
        async execute() { calls.push('execute'); return receipt; },
        async acknowledgeObject() { calls.push('acknowledge'); },
        async completeExternal() { calls.push('complete'); return receipt; },
      },
      identity: {
        async freeze() { calls.push('freeze'); }, async deleteIdentity() { calls.push('deleteIdentity'); }, async isAbsent() { return false; },
      },
      objects: {
        async deleteObject() { calls.push('deleteObject'); }, async isAbsent() { return false; },
      },
    },
  };
  return { input, calls, lease, objectKey, expire: () => { time = input.grant.expiresAt; } };
}

test('rejects production, alternate targets, and changed fingerprints before calling a port', () => {
  const { input, calls } = fixture();
  for (const override of [{ deployment: 'production' }, { databaseUrl: 'https://fgejncfsvvsayiequubm.supabase.co' },
    { bucket: 'markit-media-production' }, { r2Endpoint: `https://${'c'.repeat(32)}.r2.cloudflarestorage.com` }, { boundTargetHash: '0'.repeat(64) }]) {
    assert.throws(() => createPreviewDeletionExecutor({ ...input, ...override }));
  }
  assert.deepEqual(calls, []);
});

test('checks the request, database actor, and expiration before freeze', async () => {
  const { input, calls, lease, expire } = fixture();
  const execute = createPreviewDeletionExecutor(input);
  assert.equal((await execute({ ...lease, requestId: randomUUID() })).outcome, 'manual_review');
  assert.deepEqual(calls, []);
  const realContext = input.ports.database.context;
  input.ports.database.context = async () => ({ ...await realContext(), actorId: randomUUID() });
  assert.equal((await execute(lease)).outcome, 'manual_review');
  assert.deepEqual(calls.splice(0), ['context']);
  input.ports.database.context = realContext;
  assert.equal((await execute(lease)).outcome, 'completed');
  assert.deepEqual(calls.splice(0), ['context', 'execute', 'context', 'freeze', 'complete']);
  expire();
  assert.equal((await execute(lease)).outcome, 'manual_review');
  assert.deepEqual(calls, []);
});

test('rejects a mixed-owner object batch before any delete and stops when a live grant expires', async () => {
  const { input, calls, lease, objectKey, expire } = fixture();
  const realContext = input.ports.database.context;
  input.ports.database.context = async () => ({ ...await realContext(), totalObjects: 2, objects: [objectKey,
    `sales-evidence/7d/${randomUUID()}/fixture/image.webp`].map(key => ({ key, deleted: false, absent: false })) });
  const execute = createPreviewDeletionExecutor(input);
  assert.equal((await execute({ ...lease, stepCode: 'r2_objects_deleted' })).outcome, 'manual_review');
  assert.deepEqual(calls.splice(0), ['context']);
  input.ports.database.context = realContext;
  input.ports.database.execute = async () => { expire(); return { affectedCount: 0, evidenceHash: 'c'.repeat(64) }; };
  assert.equal((await execute(lease)).outcome, 'manual_review');
  assert.deepEqual(calls, ['context']);
});

test('operator tick uses only the approved PostgREST endpoint and request', async t => {
  const { input } = fixture();
  const now = Date.now();
  const config = {
    ...input,
    grant: { ...input.grant, issuedAt: now - 1000, expiresAt: now + 60_000 },
    publicKey: 'test-publishable-key',
    secretKey: 'sb_secret_' + 'test'.repeat(7),
    accessKeyId: 'fixture-access',
    secretAccessKey: 'fixture-secret',
  };
  const calls: { url: string; requestId: string; redirect: RequestRedirect | undefined }[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string | URL, init: RequestInit) => {
    calls.push({ url: String(url), requestId: JSON.parse(String(init.body)).p_request_id, redirect: init.redirect });
    return new Response('{"claimed":false}', { headers: { 'Content-Type': 'application/json' } });
  });
  for (const override of [{ deployment: 'production' }, { databaseUrl: 'https://invalid.example.test' },
    { bucket: 'other-bucket' }, { boundTargetHash: '0'.repeat(64) },
    { grant: { ...config.grant, expiresAt: now - 1 } }]) {
    await assert.rejects(() => runBoundPreviewDeletionTick({ ...config, ...override }));
  }
  assert.deepEqual(calls, []);
  const result = await runBoundPreviewDeletionTick(config);
  assert.equal(result.outcome, 'lease_not_acquired');
  assert.deepEqual(calls, [{
    url: config.databaseUrl + '/rest/v1/rpc/bff_claim_account_deletion_lease',
    requestId: config.grant.requestId,
    redirect: 'error',
  }]);
  const steps: string[] = [];
  t.mock.restoreAll();
  t.mock.method(globalThis, 'fetch', async (url: string | URL, init: RequestInit) => {
    const rpc = String(url).split('/').at(-1)!;
    steps.push(rpc);
    const args = JSON.parse(String(init.body));
    const responses: Record<string, unknown> = {
      bff_claim_account_deletion_lease: { claimed: true, leaseToken: randomUUID(), snapshot: {
        requestId: config.grant.requestId, accountKind: 'owner', requestStatus: 'processing',
        identityConfirmed: true, preflightResolution: 'clean', steps: [],
      } },
      bff_account_deletion_engine: { actorId: config.grant.actorId, previewTargetHash: '0'.repeat(64),
        objects: [], totalObjects: 0 },
      bff_record_account_deletion_step: null,
      bff_release_account_deletion_lease: true,
    };
    assert.ok(Object.hasOwn(responses, rpc));
    if (rpc === 'bff_account_deletion_engine') assert.equal(args.p_action, 'context');
    if (rpc === 'bff_record_account_deletion_step') assert.equal(args.p_safe_error_code, 'preview_deletion_target_mismatch');
    return Response.json(responses[rpc]);
  });
  assert.equal((await runBoundPreviewDeletionTick(config)).stepOutcome, 'manual_review');
  assert.deepEqual(steps, ['bff_claim_account_deletion_lease', 'bff_account_deletion_engine',
    'bff_record_account_deletion_step', 'bff_release_account_deletion_lease']);
});
