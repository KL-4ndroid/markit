import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
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
