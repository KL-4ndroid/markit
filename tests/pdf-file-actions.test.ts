import assert from 'node:assert/strict';
import { createPdfFileActions } from '../lib/reporting/pdf-file-actions';
import type { FilePort } from '../lib/platform/contracts/files';

async function main() {
  const a = {}, b = {};
  let allowed = true, builds = 0;
  const calls: string[] = [];
  const file = { filename: 'test.pdf', data: new Blob(['%PDF-fixture']) };
  const files: FilePort = {
    async previewFile() { calls.push('preview'); return { opened: false, reason: 'blocked' }; },
    async saveFile() { calls.push('save'); },
  };
  const actions = createPdfFileActions<object>();
  const base = { model: a, action: 'preview' as const, files, isCurrent: () => allowed,
    build: async () => { builds++; return file; } };
  assert.equal(await actions.run(base), 'blocked');
  assert.equal(await actions.run({ ...base, action: 'save' }), 'saved');
  assert.equal(builds, 1, 'blocked preview can save the same PDF without rendering again');
  assert.deepEqual(calls, ['preview', 'save']);
  await actions.run({ ...base, model: b, action: 'save' });
  assert.equal(builds, 2, 'a new period/model must get a fresh file');
  allowed = false;
  assert.equal(await actions.run(base), 'stale');
  assert.equal(builds, 2, 'unauthorized calls never start rendering');

  allowed = true;
  let finish!: (value: typeof file) => void;
  const delayed = new Promise<typeof file>(resolve => { finish = resolve; });
  const pending = actions.run({ ...base, build: () => delayed });
  assert.equal(await actions.run(base), 'busy', 'double-click cannot dispatch a second file');
  allowed = false; // Role revoked, period changed, or component unmounted during rendering.
  finish(file);
  assert.equal(await pending, 'stale');
  assert.deepEqual(calls, ['preview', 'save', 'save'], 'no preview/save after authorization changes');
  allowed = true;
  await assert.rejects(actions.run({ ...base, build: async () => { throw new Error('render failed'); } }), /render failed/);
  assert.equal(await actions.run({ ...base, action: 'save' }), 'saved', 'render failure releases busy state for retry');
  await assert.rejects(actions.run({ ...base, action: 'save', files: { ...files, async saveFile() { throw new Error('device failed'); } } }), /device failed/);
  assert.equal(await actions.run({ ...base, action: 'save' }), 'saved', 'device failure is retryable');
  console.log('PASS PDF preview/save fallback, model isolation, stale authorization, duplicate actions and retries');
}
void main();
